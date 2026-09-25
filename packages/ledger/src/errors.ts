// Typed errors for callers, plus the mapping from the database's SQLSTATEs.
// The database is the last line of defence; these make its refusals readable.

export type LedgerErrorCode =
  | 'INSUFFICIENT_FUNDS'
  | 'IDEMPOTENCY_CONFLICT'
  | 'TRANSACTION_NOT_FOUND'
  | 'ALREADY_REVERSED'
  | 'NOT_REVERSIBLE'
  | 'INVALID_INPUT'
  | 'INVARIANT_VIOLATION';

export class LedgerError extends Error {
  readonly code: LedgerErrorCode;

  constructor(code: LedgerErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
  }
}

export class InsufficientFundsError extends LedgerError {
  readonly unit: 'money' | 'points';
  readonly available: number;
  readonly requested: number;

  constructor(unit: 'money' | 'points', available: number, requested: number) {
    super(
      'INSUFFICIENT_FUNDS',
      `insufficient ${unit}: available ${available}, requested ${requested}`,
    );
    this.unit = unit;
    this.available = available;
    this.requested = requested;
  }
}

export class IdempotencyConflictError extends LedgerError {
  readonly idempotencyKey: string;

  constructor(idempotencyKey: string) {
    super(
      'IDEMPOTENCY_CONFLICT',
      `idempotency key "${idempotencyKey}" was already used for a different request`,
    );
    this.idempotencyKey = idempotencyKey;
  }
}

export class TransactionNotFoundError extends LedgerError {
  constructor(transactionId: string) {
    super('TRANSACTION_NOT_FOUND', `transaction ${transactionId} not found`);
  }
}

export class AlreadyReversedError extends LedgerError {
  constructor(transactionId: string) {
    super('ALREADY_REVERSED', `transaction ${transactionId} has already been reversed`);
  }
}

export class NotReversibleError extends LedgerError {
  constructor(transactionId: string, why: string) {
    super('NOT_REVERSIBLE', `transaction ${transactionId} can not be reversed: ${why}`);
  }
}

export class InvalidInputError extends LedgerError {
  constructor(message: string) {
    super('INVALID_INPUT', message);
  }
}

/** The database refused a write because it would break a ledger invariant. */
export class LedgerInvariantError extends LedgerError {
  readonly sqlState: string;

  constructor(sqlState: string, message: string, cause: unknown) {
    super('INVARIANT_VIOLATION', message, { cause });
    this.sqlState = sqlState;
  }
}

/** SQLSTATE codes raised by the migrations in supabase/migrations. */
export const SQLSTATE = {
  UNBALANCED: 'LG001',
  MIXED_CURRENCIES: 'LG002',
  INEXACT_REVERSAL: 'LG003',
  IMMUTABLE: 'LG004',
  UNIT_MISMATCH: 'LG005',
  CHECK_VIOLATION: '23514',
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  INSUFFICIENT_PRIVILEGE: '42501',
} as const;

export function sqlStateOf(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

export function constraintOf(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'constraint' in error
    ? String((error as { constraint: unknown }).constraint)
    : undefined;
}

/** Wraps a pg error in a typed LedgerError when it is one of ours. */
export function translateDatabaseError(error: unknown): unknown {
  const state = sqlStateOf(error);
  if (state === undefined) return error;
  const message = error instanceof Error ? error.message : String(error);
  switch (state) {
    case SQLSTATE.UNBALANCED:
    case SQLSTATE.MIXED_CURRENCIES:
    case SQLSTATE.INEXACT_REVERSAL:
    case SQLSTATE.IMMUTABLE:
    case SQLSTATE.UNIT_MISMATCH:
      return new LedgerInvariantError(state, message, error);
    case SQLSTATE.CHECK_VIOLATION:
      return constraintOf(error) === 'ledger_balances_check'
        ? new LedgerInvariantError(state, 'balance would go negative', error)
        : new LedgerInvariantError(state, message, error);
    case SQLSTATE.FOREIGN_KEY_VIOLATION:
      return new InvalidInputError(`unknown customer, account or transaction: ${message}`);
    default:
      return error;
  }
}
