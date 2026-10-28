import { describe, expect, it } from 'vitest';
import { parseMvp } from '../src/services/api/worldMvp';
import { parseKitchen } from '../src/services/api/worldKitchen';

const health = () => ({ hp: 100, max_hp: 100, revision: 4, can_eat: true, disorder_until: null,
  foods: [{ code: 'world-cooked-carrot', name: 'Печёная морковь', restore_hp: 4, kitchen_restore_hp: 15, quantity: 2,
    can_eat: true, repeat_limit: 2, repeat_remaining: 1, repeat_seconds: 21600, restores_at: null }] });
const breakfast = { code: 'breakfast', name: 'Завтрак', starts_at: 100, ends_at: 200 };
const kitchen = () => ({ node_id: 12, meal: { timezone: 'Europe/Moscow', current: breakfast, next: { ...breakfast, code: 'lunch', name: 'Обед', starts_at: 300, ends_at: 400 } }, meal_used: false, health: health(), server_time: 150 });

describe('food and meal contracts', () => {
  it('keeps dish-specific limits and full-health nutrition available', () => {
    const data = parseMvp({ enabled: true, feedback_path: '/forum', server_time: 150, health: health(), can_fund_goals: true,
      goals: [{ code: 'day-1', claimed: false, funded: false, can_claim: false, credits_cr: '50.0000', steps: [], funding_settlement_id: 5, blocked_reason: 'Нужен резерв' }], quotas: [] });
    expect(data.health).toMatchObject({ canEat: true, foods: [{ restore: 4, kitchenRestore: 15, repeatLimit: 2, repeatRemaining: 1, repeatSeconds: 21600, canEat: true }] });
    expect(data.goals[0]).toMatchObject({ canClaim: false, blockedReason: 'Нужен резерв', fundingSettlement: 5 });
    expect(data.canFundGoals).toBe(true);
  });
  it('preserves the shared meal window, used flag and the next meal outside serving hours', () => {
    expect(parseKitchen(kitchen())).toMatchObject({ nodeId: 12, used: false, current: { code: 'breakfast', endsAt: 200 }, next: { code: 'lunch', startsAt: 300 } });
    expect(parseKitchen({ ...kitchen(), meal_used: true, meal: { ...kitchen().meal, current: null } })).toMatchObject({ used: true, current: null, next: { code: 'lunch' } });
  });
  it('rejects malformed windows and repeat limits before displaying an action', () => {
    expect(() => parseKitchen({ ...kitchen(), meal: { ...kitchen().meal, timezone: 'UTC' } })).toThrow();
    expect(() => parseKitchen({ ...kitchen(), meal_used: 'false' })).toThrow();
    expect(() => parseKitchen({ ...kitchen(), meal: { ...kitchen().meal, current: { ...breakfast, code: 'snack' } } })).toThrow();
    expect(() => parseKitchen({ ...kitchen(), meal: { ...kitchen().meal, current: { ...breakfast, ends_at: breakfast.starts_at } } })).toThrow();
    expect(() => parseKitchen({ ...kitchen(), health: { ...health(), foods: [{ ...health().foods[0], repeat_limit: 0 }] } })).toThrow();
  });
});
