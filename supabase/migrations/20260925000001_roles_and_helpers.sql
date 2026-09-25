-- Roles, helper schema and the tenant-context function.
--
-- Two application roles, both bound by row-level security:
--   wallet_app    — what the apps use; can never write money movements
--   wallet_ledger — the only role allowed to insert ledger rows; only
--                   packages/ledger receives this credential
-- They are created NOLOGIN here so this file is safe to re-run anywhere.
-- `pnpm db:setup` (packages/db) grants LOGIN and sets passwords from env.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'wallet_app') then
    create role wallet_app nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'wallet_ledger') then
    create role wallet_ledger nologin;
  end if;
end
$$;

create schema if not exists app;
grant usage on schema app to wallet_app, wallet_ledger;

-- The current tenant for this transaction. Our db layer sets it with
--   select set_config('app.tenant_id', <uuid>, true)   -- transaction-local
-- Every RLS policy compares against this. Unset => NULL => no rows visible.
-- Plain PostgreSQL; no dependency on any auth provider's JWT claims.
create or replace function app.current_tenant()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.tenant_id', true), '')::uuid
$$;

-- Raised by triggers that protect immutable tables.
create or replace function app.forbid_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'immutable table: % rows can not be updated or deleted', tg_table_name
    using errcode = 'LG004';
end
$$;
