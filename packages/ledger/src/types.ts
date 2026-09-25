// Public types of the ledger API. Amounts are always integers: minor units
// (cents) for money, whole points for points. Never floats.

export const CUSTOMER_ACCOUNT_CODES = ['paid_funds', 'bonus_funds', 'points'] as const;
export type CustomerAccountCode = (typeof CUSTOMER_ACCOUNT_CODES)[number];

export const TENANT_MONEY_ACCOUNT_CODES = [
  'topups_received',
  'cash_received',
  'bonus_issued',
  'sales_redeemed',
  'refunds_paid',
  'adjustments',
  'gift_cards_outstanding',
] as const;
export type TenantMoneyAccountCode = (typeof TENANT_MONEY_ACCOUNT_CODES)[number];

export const TENANT_POINTS_ACCOUNT_CODES = [
  'points_issued',
  'points_redeemed',
  'points_adjustments',
] as const;
export type TenantPointsAccountCode = (typeof TENANT_POINTS_ACCOUNT_CODES)[number];

export type TenantAccountCode = TenantMoneyAccountCode | TenantPointsAccountCode;
export type AccountCode = CustomerAccountCode | TenantAccountCode;

export type Unit = 'money' | 'points';
export type OwnerType = 'tenant' | 'customer';
export type SpendOrder = 'bonus_first' | 'paid_first';

export type TransactionType =
  | 'top_up'
  | 'cash_top_up'
  | 'bonus_credit'
  | 'payment'
  | 'reward_redemption'
  | 'void'
  | 'refund'
  | 'manual_adjustment'
  | 'gift_card_purchase'
  | 'gift_card_claim';

export interface Actor {
  type: 'customer' | 'cashier' | 'admin' | 'support' | 'system' | 'webhook';
  id: string;
}

export interface Account {
  id: string;
  tenantId: string;
  ownerType: OwnerType;
  customerId: string | null;
  code: AccountCode;
  unit: Unit;
  currency: string | null;
}

export interface Entry {
  accountId: string;
  accountCode: AccountCode;
  ownerType: OwnerType;
  customerId: string | null;
  unit: Unit;
  currency: string | null;
  amount: number;
}

export interface LedgerTransaction {
  id: string;
  tenantId: string;
  type: TransactionType;
  idempotencyKey: string;
  reversesTransactionId: string | null;
  reason: string | null;
  actor: Actor;
  metadata: Record<string, unknown>;
  occurredAt: Date;
  createdAt: Date;
  entries: Entry[];
}

export interface CustomerBalances {
  customerId: string;
  currency: string;
  paidMinor: number;
  bonusMinor: number;
  /** paidMinor + bonusMinor: what the customer can spend. */
  totalMinor: number;
  points: number;
}

export interface BalanceDrift {
  accountId: string;
  cached: number;
  computed: number;
}

interface BaseInput {
  tenantId: string;
  /**
   * Derived from the source event (payment provider confirmation id, cashier
   * request id, ...). The same key always yields the same single transaction.
   */
  idempotencyKey: string;
  actor: Actor;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
}

export interface TopUpInput extends BaseInput {
  customerId: string;
  amountMinor: number;
  /** Bonus funds granted with this top-up, recorded as a separate bonus_credit. */
  bonusMinor?: number;
  /** Defaults to the tenant currency; must match the customer's accounts. */
  currency?: string;
}

export interface ChargeInput extends BaseInput {
  customerId: string;
  amountMinor: number;
  /** Points earned by this payment, credited in the same transaction. */
  pointsEarned?: number;
  currency?: string;
}

export interface RedeemPointsInput extends BaseInput {
  customerId: string;
  points: number;
}

export interface ReversalInput extends BaseInput {
  transactionId: string;
  reason: string;
}

export interface AdjustmentInput extends BaseInput {
  customerId: string;
  account: CustomerAccountCode;
  /** Signed: positive credits the customer, negative debits. */
  amount: number;
  reason: string;
}

export interface WriteResult {
  transaction: LedgerTransaction;
  /** True when the idempotency key had already been processed. */
  replayed: boolean;
}

export interface TopUpResult extends WriteResult {
  bonusTransaction: LedgerTransaction | null;
}

export interface ChargeResult extends WriteResult {
  allocation: { bonusMinor: number; paidMinor: number };
}
