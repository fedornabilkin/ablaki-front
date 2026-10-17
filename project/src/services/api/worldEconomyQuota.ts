import { integer, record } from './world';
import { creditAmount } from '@/entities/world/credits';
export function parseEconomyQuota(value: unknown) {
  if (value === null || value === undefined) return null;
  const row = record(value);
  if (!['crafting_hourly', 'extraction_daily', 'sales_daily'].includes(String(row.kind))) throw new Error('invalid-world-response');
  const maximum = integer(row.maximum, 1, 10000);
  return { kind: String(row.kind), maximum, remaining: integer(row.remaining, 0, maximum), restoresAt: integer(row.restores_at),
    grossRemaining: row.gross_remaining_cr === undefined || row.gross_remaining_cr === null ? null : creditAmount(row.gross_remaining_cr) };
}
