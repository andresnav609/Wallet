-- The ledger. Treat this like accounting software.
--
--   ledger_accounts     one row per (owner, kind); customers have paid_funds,
--                       bonus_funds and points; tenants have counterpart accounts
--   ledger_transactions one row per money operation; immutable; idempotent
--   ledger_entries      the double-entry lines; immutable; per-unit sum is zero
--   ledger_balances     a derived cache, maintained only by trigger, verifiable
--                       by recomputing sum(entries); CHECK keeps customers >= 0
--
-- Units and currency:
--   unit = 'money'  -> amount is in minor units (cents) of `currency` (ISO 4217)
--   unit = 'points' -> amount is whole points, currency is NULL
--   Entries of one transaction sum to zero per unit, and all money entries of
--   one transaction share one currency.
--
-- Sign convention:
--   Customer accounts are positive = owed to the customer.
--   Tenant counterpart accounts accumulate the other side and are allowed to
--   go negative. Total customer money balances = the client's liability.
--
-- Custom SQLSTATEs raised here (mapped to typed errors in packages/ledger):
--   LG001 entries do not sum to zero      LG004 immutable row touched
--   LG002 mixed currencies                LG005 entry unit/currency != account
--   LG003 reversal is not exact           23514 (check) balance would go negative

create type ledger_transaction_type as enum (
  'top_up',
  'cash_top_up',
  'bonus_credit',
  'payment',
  'reward_redemption',
  'void',
  'refund',
  'manual_adjustment',
  'gift_card_purchase',
  'gift_card_claim'
);

create table ledger_accounts (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants (id),
  owner_type   text not null check (owner_type in ('tenant', 'customer')),
  customer_id  uuid,
  -- customer: paid_funds | bonus_funds | points
  -- tenant:   topups_received | cash_received | bonus_issued | sales_redeemed
  --           refunds_paid | adjustments | gift_cards_outstanding
  --           points_issued | points_redeemed | points_adjustments
  code         text not null,
  unit         text not null check (unit in ('money', 'points')),
  currency     char(3) check (currency ~ '^[A-Z]{3}$'),
  created_at   timestamptz not null default now(),
  check ((unit = 'money') = (currency is not null)),
  check ((owner_type = 'customer') = (customer_id is not null)),
  foreign key (tenant_id, customer_id) references customers (tenant_id, id),
  unique nulls not distinct (tenant_id, owner_type, customer_id, code),
  unique (tenant_id, id)
);

create table ledger_transactions (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references tenants (id),
  type                    ledger_transaction_type not null,
  -- Same key twice = one transaction. Callers derive it from the source
  -- event (webhook id, cashier request id), never randomly per attempt.
  idempotency_key         text not null,
  -- Hash of the request parameters, so a reused key with a *different*
  -- request is rejected instead of silently returning the wrong transaction.
  request_hash            text not null,
  reverses_transaction_id uuid references ledger_transactions (id),
  reason                  text,
  actor_type              text not null,
  actor_id                text not null,
  metadata                jsonb not null default '{}'::jsonb,
  occurred_at             timestamptz not null default now(),
  created_at              timestamptz not null default now(),
  unique (tenant_id, idempotency_key),
  -- one reversal per original, ever
  unique (reverses_transaction_id),
  check ((type in ('void', 'refund')) = (reverses_transaction_id is not null)),
  foreign key (tenant_id, reverses_transaction_id) references ledger_transactions (tenant_id, id),
  unique (tenant_id, id)
);

create table ledger_entries (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants (id),
  transaction_id uuid not null,
  account_id     uuid not null,
  -- unit/currency are copied from the account by trigger and re-checked, so
  -- the balancing rules can be enforced without joins.
  unit           text not null check (unit in ('money', 'points')),
  currency       char(3),
  amount         bigint not null check (amount <> 0),
  created_at     timestamptz not null default now(),
  check ((unit = 'money') = (currency is not null)),
  foreign key (tenant_id, transaction_id) references ledger_transactions (tenant_id, id),
  foreign key (tenant_id, account_id) references ledger_accounts (tenant_id, id)
);

create index ledger_entries_transaction_idx on ledger_entries (transaction_id);
create index ledger_entries_account_idx on ledger_entries (account_id, created_at);
create index ledger_transactions_tenant_created_idx on ledger_transactions (tenant_id, created_at desc);

create table ledger_balances (
  account_id     uuid primary key references ledger_accounts (id),
  tenant_id      uuid not null references tenants (id),
  balance        bigint not null default 0,
  allow_negative boolean not null,
  updated_at     timestamptz not null default now(),
  -- The "never negative" rule, enforced at the row that every concurrent
  -- charge must lock. Customers: false. Tenant counterparts: true.
  check (allow_negative or balance >= 0)
);

-- ---------------------------------------------------------------------------
-- Immutability
-- ---------------------------------------------------------------------------

create trigger ledger_transactions_immutable
  before update or delete on ledger_transactions
  for each row execute function app.forbid_mutation();

create trigger ledger_entries_immutable
  before update or delete on ledger_entries
  for each row execute function app.forbid_mutation();

create trigger ledger_accounts_immutable
  before update or delete on ledger_accounts
  for each row execute function app.forbid_mutation();

-- ---------------------------------------------------------------------------
-- Balance cache (security definer: the roles have no UPDATE on balances)
-- ---------------------------------------------------------------------------

create or replace function app.ledger_account_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into ledger_balances (account_id, tenant_id, balance, allow_negative)
  values (new.id, new.tenant_id, 0, new.owner_type = 'tenant');
  return null;
end
$$;

create trigger ledger_accounts_create_balance
  after insert on ledger_accounts
  for each row execute function app.ledger_account_after_insert();

create or replace function app.ledger_entry_before_insert()
returns trigger
language plpgsql
as $$
declare
  v_unit     text;
  v_currency char(3);
begin
  -- Runs as the inserting role, under RLS: an account of another tenant is
  -- simply not found.
  select unit, currency into v_unit, v_currency
  from ledger_accounts
  where id = new.account_id and tenant_id = new.tenant_id;

  if not found then
    raise exception 'ledger: account % not found for tenant %', new.account_id, new.tenant_id
      using errcode = 'foreign_key_violation';
  end if;

  if new.unit is null then
    new.unit := v_unit;
  elsif new.unit <> v_unit then
    raise exception 'ledger: entry unit % does not match account unit %', new.unit, v_unit
      using errcode = 'LG005';
  end if;

  if new.currency is null and new.unit = 'money' then
    new.currency := v_currency;
  elsif new.currency is distinct from v_currency then
    raise exception 'ledger: entry currency % does not match account currency %', new.currency, v_currency
      using errcode = 'LG005';
  end if;

  return new;
end
$$;

create trigger ledger_entries_before_insert
  before insert on ledger_entries
  for each row execute function app.ledger_entry_before_insert();

create or replace function app.ledger_entry_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Row lock here serialises concurrent movements on one account; the
  -- CHECK on ledger_balances rejects the one that would go negative.
  update ledger_balances
  set balance = balance + new.amount,
      updated_at = now()
  where account_id = new.account_id;

  if not found then
    raise exception 'ledger: balance row missing for account %', new.account_id;
  end if;

  return null;
end
$$;

create trigger ledger_entries_apply_balance
  after insert on ledger_entries
  for each row execute function app.ledger_entry_after_insert();

-- ---------------------------------------------------------------------------
-- Transaction-level invariants, checked at commit (deferred constraint trigger)
-- ---------------------------------------------------------------------------

create or replace function app.ledger_check_transaction()
returns trigger
language plpgsql
as $$
declare
  v_tx         uuid := new.transaction_id;
  v_count      int;
  v_bad_unit   text;
  v_currencies int;
  v_reverses   uuid;
begin
  select count(*) into v_count from ledger_entries where transaction_id = v_tx;
  if v_count < 2 then
    raise exception 'ledger: transaction % must have at least two entries', v_tx
      using errcode = 'LG001';
  end if;

  select unit into v_bad_unit
  from ledger_entries
  where transaction_id = v_tx
  group by unit
  having sum(amount) <> 0
  limit 1;
  if v_bad_unit is not null then
    raise exception 'ledger: entries of transaction % do not sum to zero for unit %', v_tx, v_bad_unit
      using errcode = 'LG001';
  end if;

  select count(distinct currency) into v_currencies
  from ledger_entries
  where transaction_id = v_tx and unit = 'money';
  if v_currencies > 1 then
    raise exception 'ledger: transaction % mixes currencies', v_tx
      using errcode = 'LG002';
  end if;

  -- A void/refund must be the exact mirror of what it reverses.
  select reverses_transaction_id into v_reverses
  from ledger_transactions
  where id = v_tx;
  if v_reverses is not null then
    if exists (
         select account_id, -amount from ledger_entries where transaction_id = v_reverses
         except all
         select account_id, amount from ledger_entries where transaction_id = v_tx
       )
       or exists (
         select account_id, amount from ledger_entries where transaction_id = v_tx
         except all
         select account_id, -amount from ledger_entries where transaction_id = v_reverses
       )
    then
      raise exception 'ledger: transaction % does not exactly reverse %', v_tx, v_reverses
        using errcode = 'LG003';
    end if;
  end if;

  return null;
end
$$;

create constraint trigger ledger_entries_balanced
  after insert on ledger_entries
  deferrable initially deferred
  for each row execute function app.ledger_check_transaction();

-- ---------------------------------------------------------------------------
-- Verification: recompute every balance from entries and report drift.
-- Used by the daily reconciliation and by tests.
-- ---------------------------------------------------------------------------

create or replace function app.ledger_verify_balances(p_tenant_id uuid)
returns table (account_id uuid, cached bigint, computed bigint)
language sql
stable
as $$
  select b.account_id, b.balance, coalesce(sum(e.amount), 0)::bigint
  from ledger_balances b
  left join ledger_entries e on e.account_id = b.account_id
  where b.tenant_id = p_tenant_id
  group by b.account_id, b.balance
  having b.balance <> coalesce(sum(e.amount), 0)
$$;
