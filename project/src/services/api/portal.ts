import { isAxiosError } from 'axios';
import { apiClient } from '@/services/httpClient';
import config from '@/config/config';

export type RecordData = Record<string, unknown> & { id: number };
export interface Page { items: RecordData[]; total: number | null; pageSize: number; currentPage?: number; pageCount?: number; }
export const emptyPage = (): Page => ({ items: [], total: null, pageSize: 20 });
const url = (path: string) => config.makeApiUrl(`v1/${path}`);
export function record(value: unknown): RecordData {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !('id' in value) || !['number', 'string'].includes(typeof value.id) || !Number.isSafeInteger(Number(value.id)) || Number(value.id) < 1) {
    throw new Error('invalid-response');
  }
  return { ...value, id: Number(value.id) };
}
export function field(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '—';
}
export function person(user: unknown): Record<string, unknown> {
  if (!user || typeof user !== 'object' || !('person' in user)) return {};
  const value = user.person;
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function date(value: unknown): string {
  if (!value || !Number.isFinite(Number(value))) return '—';
  const date = new Date(Number(value) * 1000);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });
}
export function pageData(data: unknown, headers: Record<string, unknown>): Page {
  if (data && typeof data === 'object' && !Array.isArray(data) && 'items' in data && '_meta' in data) {
    const meta = data._meta;
    if (!Array.isArray(data.items) || !meta || typeof meta !== 'object') throw new Error('invalid-response');
    const values = meta as Record<string, unknown>;
    const total = Number(values.totalCount);
    const pageSize = Number(values.perPage);
    const currentPage = Number(values.currentPage);
    const pageCount = Number(values.pageCount);
    if ([values.totalCount, values.perPage, values.currentPage, values.pageCount].some(value => !['number', 'string'].includes(typeof value)) ||
      !Number.isSafeInteger(total) || total < 0 || !Number.isSafeInteger(pageSize) || pageSize < 1 ||
      !Number.isSafeInteger(currentPage) || currentPage < 1 || !Number.isSafeInteger(pageCount) || pageCount < 0 ||
      pageCount !== Math.ceil(total / pageSize)) throw new Error('invalid-response');
    return { items: data.items.map(record), total, pageSize, currentPage, pageCount };
  }
  if (!Array.isArray(data)) throw new Error('invalid-response');
  const rawTotal = headers['x-pagination-total-count'];
  const total = rawTotal == null || rawTotal === '' ? null : Number(rawTotal);
  const size = Number(headers['x-pagination-per-page']);
  return { items: data.map(record), total: total !== null && Number.isSafeInteger(total) && total >= 0 ? total : null, pageSize: Number.isSafeInteger(size) && size > 0 ? size : 20 };
}
export async function list(path: string, page = 1, params: Record<string, unknown> = {}): Promise<Page> {
  const response = await apiClient.get(url(path), { params: { page, ...params, envelope: 1 } });
  return pageData(response.data, response.headers);
}
export async function detail(path: string): Promise<RecordData> {
  return record((await apiClient.get(url(path))).data);
}
// Some Yii actions report validation failures with HTTP 200; never treat them as success.
export function checkMutation(data: unknown): unknown {
  if (data === '' || data === null || data === undefined || data === true) return data;
  if (Array.isArray(data) && data.some(item => item && typeof item === 'object' && 'message' in item)) throw new Error('validation-response');
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if ('errors' in data || Object.values(data).some(value => Array.isArray(value) && value.some(item => typeof item === 'string'))) throw new Error('validation-response');
  }
  return data;
}
export async function mutate(path: string, method: 'post' | 'put' | 'patch' | 'delete', data?: unknown) {
  return checkMutation((await apiClient.request({ url: url(path), method, data })).data);
}
export async function startSaper(id: number) {
  // Existing backend command uses GET; call only on an explicit user action.
  return checkMutation((await apiClient.get(url(`saper/start/${id}`))).data);
}
export async function claimDaily(kind: 'bonus' | 'rating'): Promise<boolean> {
  const data = checkMutation((await apiClient.get(url(`${kind}/everyday`))).data);
  if (data === true) return true;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if ('credit' in data && Number(data.credit) > 0) return true;
    if ('message' in data && typeof data.message === 'string') return false;
  }
  throw new Error('invalid-response');
}
export function errorText(error: unknown): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) return 'Войдите в аккаунт, чтобы продолжить.';
    if (status === 403) return 'Это действие недоступно для вашего аккаунта.';
    if (status === 404) return 'Сервер не нашёл страницу или запись.';
    if (status === 422 || status === 400) return 'Не удалось выполнить действие. Проверьте введённые данные и доступные средства.';
    if (status && status >= 500) return 'Сервер временно недоступен. Попробуйте позже.';
    if (!error.response) return 'Не удалось связаться с сервером. Проверьте подключение и повторите загрузку.';
  }
  return 'Не удалось выполнить запрос. Обновите данные и попробуйте ещё раз.';
}
