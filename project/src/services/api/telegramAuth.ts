import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { parseTelegramReward, type TelegramReward } from './telegramReward';

export type TelegramPurpose = 'login' | 'link';
export interface TelegramProof { request_id: string; browser_secret: string }
export interface TelegramRequest {
  id: string; browser_secret: string; display_code: string; expires_at: number;
  telegram_url: string; poll_after_ms: number; status: string;
}
export interface TelegramStatus { status: 'pending' | 'approved' | 'completed' | 'denied' | 'cancelled' | 'expired'; telegram: { username: string | null } | null }
const url = (action: string) => config.makeApiUrl(`auth/telegram/${action}`);
export function validTelegramRequest(value: any): value is TelegramRequest {
  return value && /^[\w-]{43}$/.test(value.id) && /^[\w-]{43}$/.test(value.browser_secret)
    && /^https:\/\/t\.me\/[a-zA-Z0-9_]+\?start=login_[\w-]{43}$/.test(value.telegram_url)
    && /^\d{6}$/.test(value.display_code) && Number.isFinite(value.expires_at);
}
export const telegramConfig = async (signal?: AbortSignal): Promise<boolean> => (await apiClient.get(url('config'), { signal })).data.telegram?.enabled === true;
export const telegramIdentity = async (signal?: AbortSignal): Promise<{ username: string | null; connected: boolean; reward?: TelegramReward | null }> => {
  const data = (await apiClient.get(url('identity'), { signal })).data;
  return { ...(data.telegram ?? { username: null, connected: false }), reward: parseTelegramReward(data.world_reward) };
};
export const unlinkTelegram = async (password: string, signal?: AbortSignal): Promise<void> => {
  await apiClient.post(url('unlink'), { password }, { signal });
};
export const startTelegram = async (purpose: TelegramPurpose, allowSignup: boolean, signal?: AbortSignal): Promise<TelegramRequest> => {
  const value = (await apiClient.post(url('start'), { purpose, allow_signup: allowSignup }, { signal })).data.request;
  if (!validTelegramRequest(value)) throw new Error('Не удалось подготовить вход через Telegram.');
  return value;
};
export const pollTelegram = async (proof: TelegramProof, signal?: AbortSignal): Promise<TelegramStatus> => (await apiClient.post(url('status'), proof, { signal })).data.request;
export const cancelTelegram = async (proof: TelegramProof) => apiClient.post(url('cancel'), proof, { timeout: 5000 });
export const completeTelegram = async (proof: TelegramProof, signal?: AbortSignal) => {
  const response = await apiClient.post(url('complete'), proof, { signal });
  if (signal?.aborted) throw new Error('Вход отменён.');
  return response.data;
};
