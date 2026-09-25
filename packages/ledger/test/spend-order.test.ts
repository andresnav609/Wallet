import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { actor, setupFixture, type Fixture } from './helpers';

describe('spend order (per-tenant configuration)', () => {
  let bonusFirst: Fixture;
  let paidFirst: Fixture;

  beforeAll(async () => {
    [bonusFirst, paidFirst] = await Promise.all([
      setupFixture({ spendOrder: 'bonus_first' }),
      setupFixture({ spendOrder: 'paid_first' }),
    ]);
  });

  afterAll(async () => {
    await Promise.all([bonusFirst.db.close(), paidFirst.db.close()]);
  });

  async function fund(f: Fixture): Promise<void> {
    await f.ledger.topUp({
      tenantId: f.tenantId,
      customerId: f.customerId,
      actor,
      idempotencyKey: f.key('topup'),
      amountMinor: 5000,
      bonusMinor: 500,
    });
  }

  it('bonus_first consumes bonus funds before paid funds', async () => {
    await fund(bonusFirst);
    const result = await bonusFirst.ledger.charge({
      tenantId: bonusFirst.tenantId,
      customerId: bonusFirst.customerId,
      actor,
      idempotencyKey: bonusFirst.key('charge'),
      amountMinor: 1000,
    });
    expect(result.allocation).toEqual({ bonusMinor: 500, paidMinor: 500 });
    expect(await bonusFirst.ledger.getBalances(bonusFirst.tenantId, bonusFirst.customerId)).toMatchObject(
      { paidMinor: 4500, bonusMinor: 0 },
    );
  });

  it('paid_first consumes paid funds before bonus funds', async () => {
    await fund(paidFirst);
    const result = await paidFirst.ledger.charge({
      tenantId: paidFirst.tenantId,
      customerId: paidFirst.customerId,
      actor,
      idempotencyKey: paidFirst.key('charge'),
      amountMinor: 1000,
    });
    expect(result.allocation).toEqual({ bonusMinor: 0, paidMinor: 1000 });
    expect(await paidFirst.ledger.getBalances(paidFirst.tenantId, paidFirst.customerId)).toMatchObject(
      { paidMinor: 4000, bonusMinor: 500 },
    );
  });

  it('paid_first falls back to bonus when paid funds run out', async () => {
    const result = await paidFirst.ledger.charge({
      tenantId: paidFirst.tenantId,
      customerId: paidFirst.customerId,
      actor,
      idempotencyKey: paidFirst.key('charge'),
      amountMinor: 4200,
    });
    expect(result.allocation).toEqual({ bonusMinor: 200, paidMinor: 4000 });
    expect(await paidFirst.ledger.getBalances(paidFirst.tenantId, paidFirst.customerId)).toMatchObject(
      { paidMinor: 0, bonusMinor: 300, totalMinor: 300 },
    );
  });

  it('a replayed charge reports the original allocation', async () => {
    const input = {
      tenantId: bonusFirst.tenantId,
      customerId: bonusFirst.customerId,
      actor,
      idempotencyKey: 'replay-allocation',
      amountMinor: 700,
    };
    const first = await bonusFirst.ledger.charge(input);
    const second = await bonusFirst.ledger.charge(input);
    expect(first.allocation).toEqual({ bonusMinor: 0, paidMinor: 700 });
    expect(second.allocation).toEqual(first.allocation);
    expect(second.replayed).toBe(true);
  });
});
