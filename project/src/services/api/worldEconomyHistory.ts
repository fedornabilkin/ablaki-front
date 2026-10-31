import { readApi } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record } from './world';

export type HistorySource = 'commands' | 'credits' | 'items' | 'transfers' | 'wallet' | 'health';
export const historySources: { value: HistorySource; label: string }[] = [
  { value: 'commands', label: 'Действия мира' }, { value: 'credits', label: 'Бюджеты и казны' },
  { value: 'items', label: 'Движение вещей' }, { value: 'transfers', label: 'Переводы кредитов' }, { value: 'health', label: 'Здоровье и еда' },
  { value: 'wallet', label: 'Личный баланс' },
];
const text = (value: unknown): string => { if (typeof value !== 'string' || value.length > 500) throw new Error('invalid-world-response'); return value; };
const amount = (value: unknown): string | null => { if (value === null) return null; const result = text(value); if (!/^-?\d{1,15}(\.\d{1,5})?$/.test(result)) throw new Error('invalid-world-response'); return result; };
const optionalId = (value: unknown) => value === undefined || value === null ? null : integer(value, 1);
export function parseEconomyHistory(value: unknown) {
  const row = record(value), meta = record(row._meta);
  if (!Array.isArray(row.items) || row.items.length > 20) throw new Error('invalid-world-response');
  const total = integer(meta.totalCount), pageSize = integer(meta.perPage, 1, 20), currentPage = integer(meta.currentPage, 1), pageCount = integer(meta.pageCount);
  if (pageCount !== Math.ceil(total / pageSize)) throw new Error('invalid-world-response');
  const items = row.items.map(value => {
    const item = record(value);
    if (!historySources.some(source => source.value === item.source) || !['action', 'internal', 'reward', 'earned', 'incoming', 'expense', 'item_movement', 'internal_transfer', 'health'].includes(String(item.classification))) throw new Error('invalid-world-response');
    const id = typeof item.id === 'string' && /^[a-f0-9]{32}$/.test(item.id) ? item.id : String(integer(item.id, 1));
    const quantity = item.quantity === null ? null : item.quantity;
    if (quantity !== null && (typeof quantity !== 'number' || !Number.isSafeInteger(quantity))) throw new Error('invalid-world-response');
    const transferIds = item.transfer_ids === undefined ? [] : item.transfer_ids;
    if (!Array.isArray(transferIds) || transferIds.length > 100) throw new Error('invalid-world-response');
    const phase = item.transfer_phase === undefined || item.transfer_phase === null ? null : text(item.transfer_phase);
    if (phase !== null && !['create', 'claim', 'cancel'].includes(phase)) throw new Error('invalid-world-response');
    const details = item.items ?? [];
    if (!Array.isArray(details) || details.length > 100) throw new Error('invalid-world-response');
    const items = details.map(value => { const detail = record(value); const direction = text(detail.direction);
      if (!['received', 'spent', 'moved', 'created', 'collected', 'sold', 'bought'].includes(direction)) throw new Error('invalid-world-response');
      return { id: integer(detail.item_id, 1), code: text(detail.code), name: text(detail.name), quantity: integer(detail.quantity, 1), direction };
    });
    return { id, kind: text(item.kind), source: text(item.source), classification: text(item.classification), createdAt: integer(item.created_at), amount: amount(item.amount_cr), quantity,
      balanceBefore: amount(item.balance_before_cr ?? null), balanceAfter: amount(item.balance_after_cr ?? null), nodeId: optionalId(item.node_id),
      profileVersion: optionalId(item.profile_version), transferIds: transferIds.map(value => integer(value, 1)), transferPhase: phase, items,
      operation: item.operation_id === null ? null : text(item.operation_id) };
  });
  if (items.length > total || new Set(items.map(item => `${item.source}:${item.id}`)).size !== items.length) throw new Error('invalid-world-response');
  return { items, total, pageSize, currentPage, pageCount };
}
export function economyKindLabel(kind: string): string {
  const exact: Record<string, string> = { transfer: 'Перевод кредитов', craft: 'Изготовление', craft_slots: 'Расширение инвентаря', world_storage: 'Расширение хранилища', world_invest: 'Взнос в бюджет',
    mandatory_fee: 'Оплата действия', personal_investment: 'Личный взнос', starter_goal: 'Награда цели', order_payment: 'Сдача сырья', crop_purchase: 'Продажа урожая', unprotected_night: 'Ночь без защищённого места', 'world.start': 'Вступление в мир' };
  if (exact[kind]) return exact[kind];
  for (const [pattern, label] of [['build', 'Строительство и труд'], ['mining', 'Добыча ресурса'], ['source:', 'Получение ресурса'], ['crop', 'Огород и урожай'], ['cultivation', 'Огород и урожай'],
    ['food', 'Потребление еды'], ['goal', 'Стартовая цель'], ['expand', 'Расширение'], ['craft', 'Изготовление'], ['supplies', 'Получение снабжения'], ['map', 'Действие с картой'], ['transfer', 'Перемещение'], ['collect', 'Сбор казны'], ['housing', 'Назначение ночлега'], ['order', 'Оплаченный заказ'], ['budget', 'Бюджет объекта']]) if (kind.includes(pattern)) return label;
  return 'Операция экономики';
}
export async function loadEconomyHistory(source: string, page: number, q: unknown) {
  return parseEconomyHistory((await readApi(config.makeApiUrl('v1/world/economy/history'), { params: { source, page, q } })).data);
}
