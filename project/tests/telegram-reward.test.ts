import { describe, expect, it } from 'vitest';
import { parseTelegramReward } from '../src/services/api/telegramReward';

const offer = () => ({ code: 'telegram-link', pack: 'rations', linked: false, claimed: false, can_claim: false,
  blocked_reason: 'Подключите Telegram в профиле.', items: [{ code: 'world-travel-ration', name: 'Походный паёк', quantity: 10 }] });

describe('Telegram reward contract', () => {
  it('supports staged rollout and does not invent a reward when absent', () => {
    expect(parseTelegramReward(null)).toBeNull();
    expect(parseTelegramReward(undefined)).toBeNull();
  });
  it('preserves the assigned quantities and the server claim/identity decisions', () => {
    expect(parseTelegramReward(offer())).toMatchObject({ linked: false, canClaim: false, items: [{ quantity: 10 }] });
    expect(parseTelegramReward({ ...offer(), linked: true, can_claim: true, blocked_reason: null })).toMatchObject({ linked: true, canClaim: true });
    expect(parseTelegramReward({ ...offer(), linked: true, blocked_reason: 'Уже получено другим аккаунтом' })).toMatchObject({ canClaim: false, blockedReason: 'Уже получено другим аккаунтом' });
    expect(parseTelegramReward({ ...offer(), claimed: true })).toMatchObject({ claimed: true, canClaim: false });
  });
  it('rejects invalid quantities and ambiguous eligibility', () => {
    for (const quantity of [0, -1, 1.5, '10', 10001]) expect(() => parseTelegramReward({ ...offer(), items: [{ ...offer().items[0], quantity }] })).toThrow();
    expect(() => parseTelegramReward({ ...offer(), can_claim: 'false' })).toThrow();
    expect(() => parseTelegramReward({ ...offer(), items: [] })).toThrow();
  });
});
