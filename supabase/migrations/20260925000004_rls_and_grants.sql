-- Row-level security and role grants.
--
-- Every table is isolated by tenant through app.current_tenant(). FORCE makes
-- the policy apply to the table owner too (superusers still bypass, which is
-- why migrations and seeding run as the owner and nothing else does).
--
-- Grants encode the money-writing boundary:
--   wallet_app     reads everything, writes customers/audit only
--   wallet_ledger  the only role that can insert accounts, transactions, entries
--   nobody         can update or delete ledger rows, or write ledger_balances

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table tenants enable row level security;
alter table tenants force row level security;
create policy tenant_isolation on tenants
  for all
  using (id = app.current_tenant())
  with check (id = app.current_tenant());

alter table customers enable row level security;
alter table customers force row level security;
create policy tenant_isolation on customers
  for all
  using (tenant_id = app.current_tenant())
  with check (tenant_id = app.current_tenant());

alter table audit_log enable row level security;
alter table audit_log force row level security;
create policy tenant_isolation on audit_log
  for all
  using (tenant_id = app.current_tenant())
  with check (tenant_id = app.current_tenant());

alter table ledger_accounts enable row level security;
alter table ledger_accounts force row level security;
create policy tenant_isolation on ledger_accounts
  for all
  using (tenant_id = app.current_tenant())
  with check (tenant_id = app.current_tenant());

alter table ledger_transactions enable row level security;
alter table ledger_transactions force row level security;
create policy tenant_isolation on ledger_transactions
  for all
  using (tenant_id = app.current_tenant())
  with check (tenant_id = app.current_tenant());

alter table ledger_entries enable row level security;
alter table ledger_entries force row level security;
create policy tenant_isolation on ledger_entries
  for all
  using (tenant_id = app.current_tenant())
  with check (tenant_id = app.current_tenant());

alter table ledger_balances enable row level security;
alter table ledger_balances force row level security;
create policy tenant_isolation on ledger_balances
  for all
  using (tenant_id = app.current_tenant())
  with check (tenant_id = app.current_tenant());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to wallet_app, wallet_ledger;

grant select on
  tenants, customers, audit_log,
  ledger_accounts, ledger_transactions, ledger_entries, ledger_balances
to wallet_app, wallet_ledger;

-- App role: customer records and audit trail only. No ledger writes.
grant insert on customers, audit_log to wallet_app;
grant update (display_name) on customers to wallet_app;

-- Ledger role: the single writer of money movements.
grant insert on ledger_accounts, ledger_transactions, ledger_entries, audit_log to wallet_ledger;

-- Deliberately absent: any UPDATE/DELETE on ledger_* for either role, and any
-- INSERT/UPDATE on ledger_balances (maintained by security-definer triggers).

grant execute on function app.current_tenant() to wallet_app, wallet_ledger;
grant execute on function app.ledger_verify_balances(uuid) to wallet_app, wallet_ledger;
