import { describe, expect, it } from 'vitest';
import { projectedWorkSeconds } from '../src/entities/world/workProgress';
import { creditCost, needsPersonalTopUp } from '../src/entities/world/credits';

describe('server anchored work projection', () => {
  const work = { worked_seconds: 20, required_seconds: 120, server_time: 110, working: true, live_work: [{ accounted_at: 100, last_seen_at: 105 }] };
  it('advances smoothly from the last checkpoint and stops at the disconnect window', () => {
    expect(projectedWorkSeconds(work, 0)).toBe(30);
    expect(projectedWorkSeconds(work, 2.5)).toBe(32.5);
    expect(projectedWorkSeconds(work, 1000)).toBe(85);
    expect(projectedWorkSeconds({ ...work, working: false }, 1000)).toBe(20);
    expect(projectedWorkSeconds({ ...work, required_seconds: 40 }, 1000)).toBe(40);
  });
  it('accepts a new server checkpoint without double counting work', () => {
    const next = { ...work, worked_seconds: 40, server_time: 120, live_work: [{ accounted_at: 120, last_seen_at: 120 }] };
    expect(projectedWorkSeconds(work, 10)).toBe(projectedWorkSeconds(next, 0));
    expect(projectedWorkSeconds(next, 5)).toBe(45);
  });
});
describe('optional credit costs and contributions', () => {
  it('hides zero charges without losing fractional positive charges', () => {
    expect(creditCost('0')).toBe(''); expect(creditCost('0.0000')).toBe('');
    expect(creditCost('12.5000')).toBe(' · 12.5 Cr');
    expect(creditCost('0.0001')).toBe(' · 0.0001 Cr');
    expect(needsPersonalTopUp('0.0001', '0')).toBe(true);
    expect(needsPersonalTopUp('0', '0')).toBe(false);
    expect(needsPersonalTopUp('10.0000', '10')).toBe(false);
    expect(needsPersonalTopUp('10', null)).toBe(false);
  });
});
