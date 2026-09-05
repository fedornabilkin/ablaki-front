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
export async function giveCommentCredit(commentId: number): Promise<CommentGift> {
  if (!Number.isSafeInteger(commentId) || commentId < 1) throw new Error('invalid-comment');
  return parseCommentGift(await mutate(`forum-comment/${commentId}/gift`, 'post'), commentId);
}
