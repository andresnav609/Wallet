// The only code allowed to write money movements.
//
// Every public write follows the same shape:
//   1. one tenant-scoped database transaction (RLS on, wallet_ledger role)
//   2. idempotency lookup on (tenant_id, idempotency_key) — replay if seen
//   3. lock the customer accounts involved, in a fixed order, and pre-check
//      that no balance would go negative (gives a clean error before the
//      database CHECK would refuse the write anyway)
//   4. insert one ledger_transactions row and its ledger_entries
//   5. the database enforces the invariants at commit (see migrations)
import { createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { withTenant } from '@wallet/db';
import {
  AlreadyReversedError,
  IdempotencyConflictError,
  InsufficientFundsError,
  InvalidInputError,
  NotReversibleError,
  SQLSTATE,
  TransactionNotFoundError,
  constraintOf,
  sqlStateOf,
  translateDatabaseError,
} from './errors';
import {
  CUSTOMER_ACCOUNT_CODES,
  TENANT_MONEY_ACCOUNT_CODES,
  TENANT_POINTS_ACCOUNT_CODES,
  type Account,
  type AccountCode,
  type Actor,
  type AdjustmentInput,
  type BalanceDrift,
  type ChargeInput,
  type ChargeResult,
  type CustomerAccountCode,
  type CustomerBalances,
  type Entry,
  type LedgerTransaction,
  type RedeemPointsInput,
  type ReversalInput,
  type SpendOrder,
  type TenantAccountCode,
  type TopUpInput,
  type TopUpResult,
  type TransactionType,
  type Unit,
  type WriteResult,
} from './types';

export interface LedgerOptions {
  /** A pool connected as the `wallet_ledger` role. */
  pool: Pool;
}

export interface Ledger {
  topUp(input: TopUpInput): Promise<TopUpResult>;
  cashTopUp(input: TopUpInput): Promise<TopUpResult>;
  charge(input: ChargeInput): Promise<ChargeResult>;
  redeemPoints(input: RedeemPointsInput): Promise<WriteResult>;
  void(input: ReversalInput): Promise<WriteResult>;
  refund(input: ReversalInput): Promise<WriteResult>;
  adjust(input: AdjustmentInput): Promise<WriteResult>;
  getBalances(tenantId: string, customerId: string): Promise<CustomerBalances>;
  getTransaction(tenantId: string, transactionId: string): Promise<LedgerTransaction | null>;
  listCustomerTransactions(
    tenantId: string,
    customerId: string,
    options?: { limit?: number },
  ): Promise<LedgerTransaction[]>;
  /** Recomputes every balance from entries; an empty list means no drift. */
  verifyBalances(tenantId: string): Promise<BalanceDrift[]>;
  ensureTenantAccounts(tenantId: string): Promise<Account[]>;
  ensureCustomerAccounts(tenantId: string, customerId: string): Promise<Account[]>;
}

export function createLedger(options: LedgerOptions): Ledger {
  return new LedgerImpl(options.pool);
}

// ---------------------------------------------------------------------------

interface TenantConfig {
  id: string;
  currency: string;
  spendOrder: SpendOrder;
}

interface AccountRow {
  id: string;
  tenant_id: string;
  owner_type: 'tenant' | 'customer';
  customer_id: string | null;
  code: AccountCode;
  unit: Unit;
  currency: string | null;
}

interface TransactionRow {
  id: string;
  tenant_id: string;
  type: TransactionType;
  idempotency_key: string;
  reverses_transaction_id: string | null;
  reason: string | null;
  actor_type: Actor['type'];
  actor_id: string;
  metadata: Record<string, unknown>;
  occurred_at: Date;
  created_at: Date;
  entries: Entry[];
}

interface PendingEntry {
  account: AccountRow;
  amount: number;
}

interface NewTransaction {
  tenantId: string;
  type: TransactionType;
  idempotencyKey: string;
  requestHash: string;
  actor: Actor;
  reason?: string | null;
  reversesTransactionId?: string | null;
  metadata?: Record<string, unknown> | undefined;
  occurredAt?: Date | undefined;
}

const IDEMPOTENCY_CONSTRAINT = 'ledger_transactions_tenant_id_idempotency_key_key';
const REVERSAL_CONSTRAINT = 'ledger_transactions_reverses_transaction_id_key';

const TRANSACTION_SELECT = `
  select t.id, t.tenant_id, t.type, t.idempotency_key, t.reverses_transaction_id, t.reason,
         t.actor_type, t.actor_id, t.metadata, t.occurred_at, t.created_at,
         coalesce(
           json_agg(
             json_build_object(
               'accountId', e.account_id, 'accountCode', a.code, 'ownerType', a.owner_type,
               'customerId', a.customer_id, 'unit', e.unit, 'currency', e.currency, 'amount', e.amount
             ) order by e.created_at, e.id
           ) filter (where e.id is not null),
           '[]'
         ) as entries
  from ledger_transactions t
  left join ledger_entries e on e.transaction_id = t.id
  left join ledger_accounts a on a.id = e.account_id
`;

class LedgerImpl implements Ledger {
  constructor(private readonly pool: Pool) {}

  // -- writes ---------------------------------------------------------------

  topUp(input: TopUpInput): Promise<TopUpResult> {
    return this.creditFunds(input, 'top_up', 'topups_received');
  }

  cashTopUp(input: TopUpInput): Promise<TopUpResult> {
    return this.creditFunds(input, 'cash_top_up', 'cash_received');
  }

  private async creditFunds(
    input: TopUpInput,
    type: 'top_up' | 'cash_top_up',
    counterpart: 'topups_received' | 'cash_received',
  ): Promise<TopUpResult> {
    assertPositiveInteger('amountMinor', input.amountMinor);
    const bonusMinor = input.bonusMinor ?? 0;
    assertNonNegativeInteger('bonusMinor', bonusMinor);
    const bonusKey = `${input.idempotencyKey}:bonus`;
    const hash = requestHash({
      type,
      customerId: input.customerId,
      amountMinor: input.amountMinor,
      bonusMinor,
      currency: input.currency ?? null,
    });

    return this.idempotent(
      input,
      hash,
      async (client) => {
        const tenant = await this.loadTenant(client, input.tenantId);
        assertCurrency(input.currency, tenant.currency);
        const customer = await this.customerAccounts(client, tenant, input.customerId);
        const tenantAccounts = await this.tenantAccounts(client, tenant);

        const transactionId = await this.insertTransaction(client, {
          tenantId: input.tenantId,
          type,
          idempotencyKey: input.idempotencyKey,
          requestHash: hash,
          actor: input.actor,
          metadata: input.metadata,
          occurredAt: input.occurredAt,
        });
        await this.applyEntries(client, transactionId, [
          { account: customer.paid_funds, amount: input.amountMinor },
          { account: tenantAccounts[counterpart], amount: -input.amountMinor },
        ]);

        let bonusTransaction: LedgerTransaction | null = null;
        if (bonusMinor > 0) {
          const bonusId = await this.insertTransaction(client, {
            tenantId: input.tenantId,
            type: 'bonus_credit',
            idempotencyKey: bonusKey,
            requestHash: hash,
            actor: input.actor,
            metadata: { ...input.metadata, topUpTransactionId: transactionId },
            occurredAt: input.occurredAt,
          });
          await this.applyEntries(client, bonusId, [
            { account: customer.bonus_funds, amount: bonusMinor },
            { account: tenantAccounts.bonus_issued, amount: -bonusMinor },
          ]);
          bonusTransaction = await this.requireTransaction(client, input.tenantId, bonusId);
        }

        return {
          transaction: await this.requireTransaction(client, input.tenantId, transactionId),
          bonusTransaction,
        };
      },
      async (client, transactionId) => ({
        transaction: await this.requireTransaction(client, input.tenantId, transactionId),
        bonusTransaction: await this.findTransactionByKey(client, input.tenantId, bonusKey),
      }),
    );
  }

  async charge(input: ChargeInput): Promise<ChargeResult> {
    assertPositiveInteger('amountMinor', input.amountMinor);
    const pointsEarned = input.pointsEarned ?? 0;
    assertNonNegativeInteger('pointsEarned', pointsEarned);
    const hash = requestHash({
      type: 'payment',
      customerId: input.customerId,
      amountMinor: input.amountMinor,
      pointsEarned,
      currency: input.currency ?? null,
    });

    return this.idempotent(
      input,
      hash,
      async (client) => {
        const tenant = await this.loadTenant(client, input.tenantId);
        assertCurrency(input.currency, tenant.currency);
        const customer = await this.customerAccounts(client, tenant, input.customerId);
        const tenantAccounts = await this.tenantAccounts(client, tenant);

        // Lock before reading, so the allocation is computed on balances no
        // concurrent charge can change under us.
        const fundAccounts = [customer.paid_funds, customer.bonus_funds];
        await this.lockAccounts(client, fundAccounts);
        const balances = await this.readBalances(client, fundAccounts);
        const available =
          balances.get(customer.paid_funds.id)! + balances.get(customer.bonus_funds.id)!;
        if (available < input.amountMinor) {
          throw new InsufficientFundsError('money', available, input.amountMinor);
        }

        const order =
          tenant.spendOrder === 'bonus_first'
            ? [customer.bonus_funds, customer.paid_funds]
            : [customer.paid_funds, customer.bonus_funds];
        const entries: PendingEntry[] = [];
        const allocation = { bonusMinor: 0, paidMinor: 0 };
        let remaining = input.amountMinor;
        for (const account of order) {
          const take = Math.min(remaining, balances.get(account.id)!);
          if (take > 0) {
            entries.push({ account, amount: -take });
            if (account.code === 'bonus_funds') allocation.bonusMinor = take;
            else allocation.paidMinor = take;
            remaining -= take;
          }
        }
        entries.push({ account: tenantAccounts.sales_redeemed, amount: input.amountMinor });
        if (pointsEarned > 0) {
          entries.push({ account: customer.points, amount: pointsEarned });
          entries.push({ account: tenantAccounts.points_issued, amount: -pointsEarned });
        }

        const transactionId = await this.insertTransaction(client, {
          tenantId: input.tenantId,
          type: 'payment',
          idempotencyKey: input.idempotencyKey,
          requestHash: hash,
          actor: input.actor,
          metadata: input.metadata,
          occurredAt: input.occurredAt,
        });
        await this.applyEntries(client, transactionId, entries);
        return {
          transaction: await this.requireTransaction(client, input.tenantId, transactionId),
          allocation,
        };
      },
      async (client, transactionId) => {
        const transaction = await this.requireTransaction(client, input.tenantId, transactionId);
        return { transaction, allocation: allocationOf(transaction) };
      },
    );
  }

  async redeemPoints(input: RedeemPointsInput): Promise<WriteResult> {
    assertPositiveInteger('points', input.points);
    const hash = requestHash({
      type: 'reward_redemption',
      customerId: input.customerId,
      points: input.points,
    });

    return this.idempotent(
      input,
      hash,
      async (client) => {
        const tenant = await this.loadTenant(client, input.tenantId);
        const customer = await this.customerAccounts(client, tenant, input.customerId);
        const tenantAccounts = await this.tenantAccounts(client, tenant);
        const transactionId = await this.insertTransaction(client, {
          tenantId: input.tenantId,
          type: 'reward_redemption',
          idempotencyKey: input.idempotencyKey,
          requestHash: hash,
          actor: input.actor,
          metadata: input.metadata,
          occurredAt: input.occurredAt,
        });
        await this.applyEntries(client, transactionId, [
          { account: customer.points, amount: -input.points },
          { account: tenantAccounts.points_redeemed, amount: input.points },
        ]);
        return {
          transaction: await this.requireTransaction(client, input.tenantId, transactionId),
        };
      },
      async (client, transactionId) => ({
        transaction: await this.requireTransaction(client, input.tenantId, transactionId),
      }),
    );
  }

  void(input: ReversalInput): Promise<WriteResult> {
    return this.reverse(input, 'void');
  }

  refund(input: ReversalInput): Promise<WriteResult> {
    return this.reverse(input, 'refund');
  }

  private async reverse(input: ReversalInput, type: 'void' | 'refund'): Promise<WriteResult> {
    if (!input.reason || input.reason.trim() === '') {
      throw new InvalidInputError('a reason is required to reverse a transaction');
    }
    const hash = requestHash({ type, transactionId: input.transactionId });

    return this.idempotent(
      input,
      hash,
      async (client) => {
        const original = await this.findTransaction(client, input.tenantId, input.transactionId);
        if (original === null) throw new TransactionNotFoundError(input.transactionId);
        if (original.type === 'void' || original.type === 'refund') {
          throw new NotReversibleError(original.id, 'reversals can not be reversed');
        }
        const already = await client.query(
          'select 1 from ledger_transactions where reverses_transaction_id = $1',
          [original.id],
        );
        if (already.rowCount) throw new AlreadyReversedError(original.id);

        const accounts = await this.accountsById(
          client,
          input.tenantId,
          original.entries.map((e) => e.accountId),
        );
        const entries: PendingEntry[] = original.entries.map((e) => ({
          account: accounts.get(e.accountId)!,
          amount: -e.amount,
        }));

        const transactionId = await this.insertTransaction(client, {
          tenantId: input.tenantId,
          type,
          idempotencyKey: input.idempotencyKey,
          requestHash: hash,
          actor: input.actor,
          reason: input.reason,
          reversesTransactionId: original.id,
          metadata: input.metadata,
          occurredAt: input.occurredAt,
        });
        await this.applyEntries(client, transactionId, entries);
        await this.audit(client, input.tenantId, input.actor, `ledger.${type}`, original.id, {
          reason: input.reason,
          reversalTransactionId: transactionId,
        });
        return {
          transaction: await this.requireTransaction(client, input.tenantId, transactionId),
        };
      },
      async (client, transactionId) => ({
        transaction: await this.requireTransaction(client, input.tenantId, transactionId),
      }),
    );
  }

  async adjust(input: AdjustmentInput): Promise<WriteResult> {
    if (!Number.isInteger(input.amount) || input.amount === 0) {
      throw new InvalidInputError('amount must be a non-zero integer');
    }
    if (!CUSTOMER_ACCOUNT_CODES.includes(input.account)) {
      throw new InvalidInputError(`unknown customer account "${input.account}"`);
    }
    if (!input.reason || input.reason.trim() === '') {
      throw new InvalidInputError('a reason is required for a manual adjustment');
    }
    const hash = requestHash({
      type: 'manual_adjustment',
      customerId: input.customerId,
      account: input.account,
      amount: input.amount,
    });

    return this.idempotent(
      input,
      hash,
      async (client) => {
        const tenant = await this.loadTenant(client, input.tenantId);
        const customer = await this.customerAccounts(client, tenant, input.customerId);
        const tenantAccounts = await this.tenantAccounts(client, tenant);
        const counterpart =
          input.account === 'points'
            ? tenantAccounts.points_adjustments
            : tenantAccounts.adjustments;

        const transactionId = await this.insertTransaction(client, {
          tenantId: input.tenantId,
          type: 'manual_adjustment',
          idempotencyKey: input.idempotencyKey,
          requestHash: hash,
          actor: input.actor,
          reason: input.reason,
          metadata: input.metadata,
          occurredAt: input.occurredAt,
        });
        await this.applyEntries(client, transactionId, [
          { account: customer[input.account], amount: input.amount },
          { account: counterpart, amount: -input.amount },
        ]);
        await this.audit(client, input.tenantId, input.actor, 'ledger.adjust', transactionId, {
          reason: input.reason,
          customerId: input.customerId,
          account: input.account,
          amount: input.amount,
        });
        return {
          transaction: await this.requireTransaction(client, input.tenantId, transactionId),
        };
      },
      async (client, transactionId) => ({
        transaction: await this.requireTransaction(client, input.tenantId, transactionId),
      }),
    );
  }

  // -- reads ----------------------------------------------------------------

  getBalances(tenantId: string, customerId: string): Promise<CustomerBalances> {
    return withTenant(this.pool, tenantId, async (client) => {
      const tenant = await this.loadTenant(client, tenantId);
      const { rows } = await client.query<{ code: CustomerAccountCode; balance: number }>(
        `select a.code, b.balance
         from ledger_accounts a
         join ledger_balances b on b.account_id = a.id
         where a.tenant_id = $1 and a.customer_id = $2`,
        [tenantId, customerId],
      );
      const by = new Map(rows.map((r) => [r.code, r.balance]));
      const paidMinor = by.get('paid_funds') ?? 0;
      const bonusMinor = by.get('bonus_funds') ?? 0;
      return {
        customerId,
        currency: tenant.currency,
        paidMinor,
        bonusMinor,
        totalMinor: paidMinor + bonusMinor,
        points: by.get('points') ?? 0,
      };
    });
  }

  getTransaction(tenantId: string, transactionId: string): Promise<LedgerTransaction | null> {
    return withTenant(this.pool, tenantId, (client) =>
      this.findTransaction(client, tenantId, transactionId),
    );
  }

  listCustomerTransactions(
    tenantId: string,
    customerId: string,
    options: { limit?: number } = {},
  ): Promise<LedgerTransaction[]> {
    const limit = options.limit ?? 50;
    return withTenant(this.pool, tenantId, async (client) => {
      const { rows } = await client.query<TransactionRow>(
        `${TRANSACTION_SELECT}
         where t.tenant_id = $1
           and exists (
             select 1 from ledger_entries x
             join ledger_accounts xa on xa.id = x.account_id
             where x.transaction_id = t.id and xa.customer_id = $2
           )
         group by t.id
         order by t.occurred_at desc, t.created_at desc
         limit $3`,
        [tenantId, customerId, limit],
      );
      return rows.map(toTransaction);
    });
  }

  verifyBalances(tenantId: string): Promise<BalanceDrift[]> {
    return withTenant(this.pool, tenantId, async (client) => {
      const { rows } = await client.query<{ account_id: string; cached: number; computed: number }>(
        'select account_id, cached, computed from app.ledger_verify_balances($1)',
        [tenantId],
      );
      return rows.map((r) => ({ accountId: r.account_id, cached: r.cached, computed: r.computed }));
    });
  }

  ensureTenantAccounts(tenantId: string): Promise<Account[]> {
    return withTenant(this.pool, tenantId, async (client) => {
      const tenant = await this.loadTenant(client, tenantId);
      return Object.values(await this.tenantAccounts(client, tenant)).map(toAccount);
    });
  }

  ensureCustomerAccounts(tenantId: string, customerId: string): Promise<Account[]> {
    return withTenant(this.pool, tenantId, async (client) => {
      const tenant = await this.loadTenant(client, tenantId);
      return Object.values(await this.customerAccounts(client, tenant, customerId)).map(toAccount);
    });
  }

  // -- internals ------------------------------------------------------------

  /**
   * Runs `build` once per idempotency key. A second call with the same key
   * returns `replay` of the stored transaction; the same key with a different
   * request is refused. Handles the race where two identical requests build
   * at the same time: the loser sees the unique violation and replays.
   */
  private async idempotent<T>(
    input: { tenantId: string; idempotencyKey: string },
    hash: string,
    build: (client: PoolClient) => Promise<T>,
    replay: (client: PoolClient, transactionId: string) => Promise<T>,
  ): Promise<T & { replayed: boolean }> {
    const lookup = async (client: PoolClient): Promise<string | null> => {
      const { rows } = await client.query<{ id: string; request_hash: string }>(
        `select id, request_hash from ledger_transactions
         where tenant_id = $1 and idempotency_key = $2`,
        [input.tenantId, input.idempotencyKey],
      );
      const row = rows[0];
      if (row === undefined) return null;
      if (row.request_hash !== hash) throw new IdempotencyConflictError(input.idempotencyKey);
      return row.id;
    };

    try {
      return await withTenant(this.pool, input.tenantId, async (client) => {
        const existing = await lookup(client);
        if (existing !== null) return { ...(await replay(client, existing)), replayed: true };
        return { ...(await build(client)), replayed: false };
      });
    } catch (error) {
      if (sqlStateOf(error) === SQLSTATE.UNIQUE_VIOLATION) {
        const constraint = constraintOf(error);
        if (constraint === IDEMPOTENCY_CONSTRAINT) {
          return withTenant(this.pool, input.tenantId, async (client) => {
            const existing = await lookup(client);
            if (existing === null) throw error;
            return { ...(await replay(client, existing)), replayed: true };
          });
        }
        if (constraint === REVERSAL_CONSTRAINT) {
          throw new AlreadyReversedError(reversedIdFrom(error));
        }
      }
      throw translateDatabaseError(error);
    }
  }

  private async loadTenant(client: PoolClient, tenantId: string): Promise<TenantConfig> {
    const { rows } = await client.query<{ id: string; currency: string; spend_order: SpendOrder }>(
      'select id, currency, spend_order from tenants where id = $1',
      [tenantId],
    );
    const row = rows[0];
    if (row === undefined) throw new InvalidInputError(`unknown tenant ${tenantId}`);
    return { id: row.id, currency: row.currency, spendOrder: row.spend_order };
  }

  private async customerAccounts(
    client: PoolClient,
    tenant: TenantConfig,
    customerId: string,
  ): Promise<Record<CustomerAccountCode, AccountRow>> {
    const { rows } = await client.query<AccountRow>(
      `select id, tenant_id, owner_type, customer_id, code, unit, currency
       from ledger_accounts where tenant_id = $1 and customer_id = $2`,
      [tenant.id, customerId],
    );
    if (rows.length < CUSTOMER_ACCOUNT_CODES.length) {
      await client.query(
        `insert into ledger_accounts (tenant_id, owner_type, customer_id, code, unit, currency)
         values ($1, 'customer', $2, 'paid_funds', 'money', $3),
                ($1, 'customer', $2, 'bonus_funds', 'money', $3),
                ($1, 'customer', $2, 'points', 'points', null)
         on conflict (tenant_id, owner_type, customer_id, code) do nothing`,
        [tenant.id, customerId, tenant.currency],
      );
      return this.customerAccounts(client, tenant, customerId);
    }
    return Object.fromEntries(rows.map((r) => [r.code, r])) as Record<
      CustomerAccountCode,
      AccountRow
    >;
  }

  private async tenantAccounts(
    client: PoolClient,
    tenant: TenantConfig,
  ): Promise<Record<TenantAccountCode, AccountRow>> {
    const expected = TENANT_MONEY_ACCOUNT_CODES.length + TENANT_POINTS_ACCOUNT_CODES.length;
    const { rows } = await client.query<AccountRow>(
      `select id, tenant_id, owner_type, customer_id, code, unit, currency
       from ledger_accounts where tenant_id = $1 and owner_type = 'tenant'`,
      [tenant.id],
    );
    if (rows.length < expected) {
      await client.query(
        `insert into ledger_accounts (tenant_id, owner_type, code, unit, currency)
         select $1::uuid, 'tenant', code, 'money', $2::char(3) from unnest($3::text[]) as m(code)
         union all
         select $1::uuid, 'tenant', code, 'points', null::char(3) from unnest($4::text[]) as p(code)
         on conflict (tenant_id, owner_type, customer_id, code) do nothing`,
        [tenant.id, tenant.currency, TENANT_MONEY_ACCOUNT_CODES, TENANT_POINTS_ACCOUNT_CODES],
      );
      return this.tenantAccounts(client, tenant);
    }
    return Object.fromEntries(rows.map((r) => [r.code, r])) as Record<
      TenantAccountCode,
      AccountRow
    >;
  }

  private async accountsById(
    client: PoolClient,
    tenantId: string,
    ids: string[],
  ): Promise<Map<string, AccountRow>> {
    const { rows } = await client.query<AccountRow>(
      `select id, tenant_id, owner_type, customer_id, code, unit, currency
       from ledger_accounts where tenant_id = $1 and id = any($2::uuid[])`,
      [tenantId, ids],
    );
    return new Map(rows.map((r) => [r.id, r]));
  }

  /**
   * Transaction-scoped advisory locks, taken in account-id order so two
   * writers touching the same accounts can never deadlock. Released at
   * COMMIT/ROLLBACK. Uses no table privilege, which keeps wallet_ledger
   * without UPDATE on ledger_balances.
   */
  private async lockAccounts(client: PoolClient, accounts: AccountRow[]): Promise<void> {
    const ids = [...new Set(accounts.map((a) => a.id))].sort();
    if (ids.length === 0) return;
    await client.query(
      `select pg_advisory_xact_lock(hashtextextended(id, 0))
       from unnest($1::text[]) with ordinality as l(id, n) order by n`,
      [ids],
    );
  }

  private async readBalances(
    client: PoolClient,
    accounts: AccountRow[],
  ): Promise<Map<string, number>> {
    const { rows } = await client.query<{ account_id: string; balance: number }>(
      'select account_id, balance from ledger_balances where account_id = any($1::uuid[])',
      [accounts.map((a) => a.id)],
    );
    return new Map(rows.map((r) => [r.account_id, r.balance]));
  }

  private async insertTransaction(client: PoolClient, tx: NewTransaction): Promise<string> {
    const { rows } = await client.query<{ id: string }>(
      `insert into ledger_transactions
         (tenant_id, type, idempotency_key, request_hash, reverses_transaction_id, reason,
          actor_type, actor_id, metadata, occurred_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, coalesce($10, now()))
       returning id`,
      [
        tx.tenantId,
        tx.type,
        tx.idempotencyKey,
        tx.requestHash,
        tx.reversesTransactionId ?? null,
        tx.reason ?? null,
        tx.actor.type,
        tx.actor.id,
        JSON.stringify(tx.metadata ?? {}),
        tx.occurredAt ?? null,
      ],
    );
    return rows[0]!.id;
  }

  /**
   * Inserts the entries of one transaction. Customer accounts that would be
   * debited are locked and pre-checked so callers get InsufficientFundsError
   * instead of a constraint violation; the database CHECK still stands behind
   * this for any path that skips the pre-check.
   */
  private async applyEntries(
    client: PoolClient,
    transactionId: string,
    entries: PendingEntry[],
  ): Promise<void> {
    const debited = entries.filter((e) => e.account.owner_type === 'customer' && e.amount < 0);
    if (debited.length > 0) {
      await this.lockAccounts(
        client,
        debited.map((e) => e.account),
      );
      const balances = await this.readBalances(
        client,
        debited.map((e) => e.account),
      );
      const net = new Map<string, number>();
      for (const e of entries) {
        if (e.account.owner_type !== 'customer') continue;
        net.set(e.account.id, (net.get(e.account.id) ?? 0) + e.amount);
      }
      for (const e of debited) {
        const available = balances.get(e.account.id) ?? 0;
        const delta = net.get(e.account.id) ?? 0;
        if (available + delta < 0) {
          throw new InsufficientFundsError(e.account.unit, available, -delta);
        }
      }
    }

    const tenantId = entries[0]!.account.tenant_id;
    await client.query(
      `insert into ledger_entries (tenant_id, transaction_id, account_id, unit, currency, amount)
       select $1::uuid, $2::uuid, account_id, unit, currency::char(3), amount
       from unnest($3::uuid[], $4::text[], $5::text[], $6::bigint[]) as e(account_id, unit, currency, amount)`,
      [
        tenantId,
        transactionId,
        entries.map((e) => e.account.id),
        entries.map((e) => e.account.unit),
        entries.map((e) => e.account.currency),
        entries.map((e) => e.amount),
      ],
    );
  }

  private async audit(
    client: PoolClient,
    tenantId: string,
    actor: Actor,
    action: string,
    entityId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await client.query(
      `insert into audit_log (tenant_id, actor_type, actor_id, action, entity_type, entity_id, payload)
       values ($1, $2, $3, $4, 'ledger_transaction', $5, $6)`,
      [tenantId, actor.type, actor.id, action, entityId, JSON.stringify(payload)],
    );
  }

  private async findTransaction(
    client: PoolClient,
    tenantId: string,
    transactionId: string,
  ): Promise<LedgerTransaction | null> {
    const { rows } = await client.query<TransactionRow>(
      `${TRANSACTION_SELECT} where t.tenant_id = $1 and t.id = $2 group by t.id`,
      [tenantId, transactionId],
    );
    return rows[0] === undefined ? null : toTransaction(rows[0]);
  }

  private async findTransactionByKey(
    client: PoolClient,
    tenantId: string,
    idempotencyKey: string,
  ): Promise<LedgerTransaction | null> {
    const { rows } = await client.query<TransactionRow>(
      `${TRANSACTION_SELECT} where t.tenant_id = $1 and t.idempotency_key = $2 group by t.id`,
      [tenantId, idempotencyKey],
    );
    return rows[0] === undefined ? null : toTransaction(rows[0]);
  }

  private async requireTransaction(
    client: PoolClient,
    tenantId: string,
    transactionId: string,
  ): Promise<LedgerTransaction> {
    const tx = await this.findTransaction(client, tenantId, transactionId);
    if (tx === null) throw new TransactionNotFoundError(transactionId);
    return tx;
  }
}

// ---------------------------------------------------------------------------

function requestHash(request: Record<string, unknown>): string {
  const canonical = JSON.stringify(request, Object.keys(request).sort());
  return createHash('sha256').update(canonical).digest('hex');
}

function assertPositiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new InvalidInputError(`${name} must be a positive integer (got ${value})`);
  }
}

function assertNonNegativeInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new InvalidInputError(`${name} must be a non-negative integer (got ${value})`);
  }
}

function assertCurrency(requested: string | undefined, tenantCurrency: string): void {
  if (requested !== undefined && requested !== tenantCurrency) {
    throw new InvalidInputError(
      `currency ${requested} does not match the tenant currency ${tenantCurrency}`,
    );
  }
}

function allocationOf(transaction: LedgerTransaction): { bonusMinor: number; paidMinor: number } {
  let bonusMinor = 0;
  let paidMinor = 0;
  for (const e of transaction.entries) {
    if (e.ownerType !== 'customer' || e.amount >= 0) continue;
    if (e.accountCode === 'bonus_funds') bonusMinor += -e.amount;
    if (e.accountCode === 'paid_funds') paidMinor += -e.amount;
  }
  return { bonusMinor, paidMinor };
}

function reversedIdFrom(error: unknown): string {
  const detail =
    typeof error === 'object' && error !== null && 'detail' in error
      ? String((error as { detail: unknown }).detail)
      : '';
  return /\(reverses_transaction_id\)=\(([^)]+)\)/.exec(detail)?.[1] ?? 'unknown';
}

function toAccount(row: AccountRow): Account {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    ownerType: row.owner_type,
    customerId: row.customer_id,
    code: row.code,
    unit: row.unit,
    currency: row.currency,
  };
}

function toTransaction(row: TransactionRow): LedgerTransaction {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    type: row.type,
    idempotencyKey: row.idempotency_key,
    reversesTransactionId: row.reverses_transaction_id,
    reason: row.reason,
    actor: { type: row.actor_type, id: row.actor_id },
    metadata: row.metadata,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    entries: row.entries,
  };
}
