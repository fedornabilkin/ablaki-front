import { integer, record } from './world';

export function parseTelegramReward(value: unknown) {
  if (value == null) return null;
  const row = record(value);
  if (row.code !== 'telegram-link' || typeof row.pack !== 'string'
    || !['linked', 'claimed', 'can_claim'].every(key => typeof row[key] === 'boolean')
    || !Array.isArray(row.items) || row.items.length < 1 || row.items.length > 10
    || (row.blocked_reason != null && typeof row.blocked_reason !== 'string')) throw new Error('invalid-world-response');
  return { code: 'telegram-link', pack: row.pack, linked: row.linked as boolean, claimed: row.claimed as boolean,
    canClaim: row.can_claim as boolean, blockedReason: row.blocked_reason as string | null,
    items: row.items.map(value => {
      const item = record(value);
      if (typeof item.code !== 'string' || typeof item.name !== 'string' || item.name.length > 200) throw new Error('invalid-world-response');
      return { code: item.code, name: item.name, quantity: integer(item.quantity, 1, 10000) };
    }) };
}
export type TelegramReward = NonNullable<ReturnType<typeof parseTelegramReward>>;
