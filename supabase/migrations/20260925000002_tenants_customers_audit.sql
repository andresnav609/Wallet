-- Tenants, customers and the audit log.
-- Every table carries tenant_id and is protected by RLS (policies live in
-- the grants migration). Nothing here is client-specific: differences
-- between clients are rows in `tenants`, never code.

create table tenants (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  -- ISO 4217 code of the tenant's money accounts (USD for Panamá).
  currency    char(3) not null check (currency ~ '^[A-Z]{3}$'),
  -- Which funds a payment consumes first. Per-tenant configuration.
  spend_order text not null default 'bonus_first'
                check (spend_order in ('bonus_first', 'paid_first')),
  created_at  timestamptz not null default now()
);

create table customers (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants (id),
  phone        text not null,
  display_name text,
  created_at   timestamptz not null default now(),
  unique (tenant_id, phone),
  -- Lets other tables reference (tenant_id, customer_id) as a pair, so a row
  -- can never point at a customer of a different tenant.
  unique (tenant_id, id)
);

-- Append-only record of sensitive actions (reversals, adjustments, config
-- changes, support lookups). Never updated or deleted.
create table audit_log (
  id          bigint generated always as identity primary key,
  tenant_id   uuid not null references tenants (id),
  actor_type  text not null,
  actor_id    text not null,
  action      text not null,
  entity_type text,
  entity_id   text,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index audit_log_tenant_created_idx on audit_log (tenant_id, created_at desc);

create trigger audit_log_immutable
  before update or delete on audit_log
  for each row execute function app.forbid_mutation();
