import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { mutate } from '@/services/api/portal';

export interface HistoryType { label: string; value: string; }
export function parseHistoryTypes(data: unknown): HistoryType[] {
  if (!Array.isArray(data)) throw new Error('invalid-response');
  return data.map(value => {
    if (!value || typeof value !== 'object' || typeof value.type !== 'string' || !value.type.trim()) throw new Error('invalid-response');
    const label = typeof value.label === 'string' && value.label.trim() ? value.label : value.type;
    const count = Number(value.count);
    return { value: value.type, label: Number.isSafeInteger(count) && count >= 0 ? `${label} (${count})` : label };
  });
}
export async function historyTypes(kind: 'balance' | 'rating'): Promise<HistoryType[]> {
  return parseHistoryTypes((await apiClient.get(config.makeApiUrl(`v1/history/${kind}-type`))).data);
}

export interface CommentGift { commentId: number; alreadyGiven: boolean; giftCount: number; giftedByMe: true; credit: number; }
export function parseCommentGift(data: unknown, commentId: number): CommentGift {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('invalid-response');
  const value = data as Record<string, unknown>;
  if (value.commentId !== commentId || typeof value.alreadyGiven !== 'boolean' || value.giftedByMe !== true ||
      !Number.isSafeInteger(value.giftCount) || Number(value.giftCount) < 1 || typeof value.credit !== 'number' || !Number.isFinite(value.credit) || value.credit < 0) {
    throw new Error('invalid-response');
  }
  return { commentId, alreadyGiven: value.alreadyGiven, giftCount: Number(value.giftCount), giftedByMe: true, credit: value.credit };
}
export async function giveCommentCredit(commentId: number, amount = 1): Promise<CommentGift> {
  if (!Number.isSafeInteger(commentId) || commentId < 1) throw new Error('invalid-comment');
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 3) throw new Error('invalid-amount');
  return parseCommentGift(await mutate(`forum-comment/${commentId}/gift`, 'post', { amount }), commentId);
}

export const dailyRewardDefinitions = [
  { id: 'bonus' as const, icon: 'coins', label: 'Получить ежедневный кредит' },
  { id: 'rating' as const, icon: 'star', label: 'Получить ежедневный рейтинг' },
];
export interface DailyAvailability { items: Array<{ id: string }>; refresh_at: number; }
export function parseDailyAvailability(value: unknown): DailyAvailability {
  const data = value as DailyAvailability;
  if (!data || !Array.isArray(data.items) || !data.items.every(item => item && typeof item.id === 'string') || !Number.isSafeInteger(data.refresh_at) || data.refresh_at <= 0) throw new Error('invalid-response');
  return { items: data.items.map(item => ({ id: item.id })), refresh_at: data.refresh_at };
}
export async function dailyAvailability(): Promise<DailyAvailability> {
  return parseDailyAvailability((await apiClient.get(config.makeApiUrl('v1/bonus/available'))).data);
}
