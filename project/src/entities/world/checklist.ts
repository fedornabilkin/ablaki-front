import type { MvpState } from '@/services/api/worldMvp';

export const checklistItems = [
  { id: 'join', group: 'Старт', title: 'Заселиться и получить стоянку', detail: 'Вступление успешно; стоянка активна.', steps: ['city_joined', 'starter_site_active'] },
  { id: 'starter', group: 'Старт', title: 'Получить стартовый бюджет', detail: 'Выплата из резерва поселения поступила в бюджет первой стоянки.', special: 'starter' },
  { id: 'supply', group: 'Старт', title: 'Собрать ежедневное снабжение', detail: 'Сервер подтвердил получение стартовых ресурсов.', steps: ['daily_supply_claimed'] },
  { id: 'explore', group: 'Лагерь', title: 'Исследовать три ячейки', detail: 'Исследование собственных ячеек учтено в заданиях.', steps: ['explore_3_owned_map_cells'] },
  { id: 'tools', group: 'Лагерь', title: 'Получить молоток и лопату', detail: 'Оба инструмента засчитаны в начальном маршруте.', steps: ['hammer_crafted', 'shovel_crafted'] },
  { id: 'camp', group: 'Лагерь', title: 'Построить шалаш и огород', detail: 'Оба объекта завершены.', steps: ['shelter_built', 'garden_built'] },
  { id: 'harvest', group: 'Лагерь', title: 'Подготовить грядку и собрать урожай', detail: 'Грядка, посев и первый сбор моркови подтверждены.', steps: ['bed_dug', 'carrot_sown', 'carrot_harvested'] },
  { id: 'mine', group: 'Ресурсы', title: 'Построить шахту и добыть сырьё', detail: 'Добыты камень, уголь и руда.', steps: ['mine_built', 'stone_mined', 'coal_mined', 'ore_mined'] },
  { id: 'metal', group: 'Ресурсы', title: 'Получить первый металл', detail: 'Кузница, верстак, печь и первый слиток засчитаны.', steps: ['forge_built', 'bench_crafted', 'furnace_crafted', 'ingot_crafted'] },
  { id: 'rewards', group: 'Ресурсы', title: 'Получить награды обоих этапов', detail: 'Обе награды получены, повторного начисления нет.', special: 'rewards' },
  { id: 'supply-floor', group: 'Проверки MVP', title: 'Проверить минимальное снабжение, песок и глину', detail: 'После исчерпания основного запаса доступен минимум; постройка добычи уменьшает выдачу на 50%.' },
  { id: 'npc', group: 'Проверки MVP', title: 'Поработать в шахте NPC с буровой', detail: 'Без кирки можно начать работу. Проверьте объём партии, оплату, лимит и поступление в мини-склад.' },
  { id: 'storage', group: 'Проверки MVP', title: 'Купить ресурсы из мини-склада', detail: 'Покупка доступна из шахты. В мини-складе 5 слотов по 100; деньги и предметы меняются один раз.' },
  { id: 'craft', group: 'Проверки MVP', title: 'Проверить изготовление и оплату', detail: 'Стоимость, компоненты и число партий пересчитываются; результат и затраты видны после изготовления.' },
  { id: 'construction', group: 'Проверки MVP', title: 'Проверить строительство из родительской ноды', detail: 'Выбор ячейки, бюджет, остановка и возобновление работают; параллельная стройка запрещена.' },
  { id: 'quota', group: 'Проверки MVP', title: 'Проверить лимиты и заполненные хранилища', detail: 'Остаток и таймер видны заранее; превышение лимита заблокировано; при заполнении нет потери предметов и оплаты.' },
  { id: 'health', group: 'Проверки MVP', title: 'Проверить еду, ночлег и полевую кухню', detail: 'Назначение кровати, восстановление здоровья, ограничения повторов еды и расписание кухни понятны.' },
  { id: 'rights', group: 'Проверки MVP', title: 'Проверить второго пользователя и права', detail: 'Чужие ячейки нельзя исследовать или купить. Личный инвентарь, деньги и результаты чеклиста не смешиваются.' },
  { id: 'retry', group: 'Проверки MVP', title: 'Проверить повтор запроса и две вкладки', detail: 'Обновление страницы, повтор после потери связи и двойной клик не дублируют списание, награду или партию.' },
  { id: 'journal', group: 'Проверки MVP', title: 'Сверить историю и остатки', detail: 'Сбор, изготовление и покупка содержат названия и количество; остатки денег и предметов сходятся.' },
  { id: 'mobile', group: 'Проверки MVP', title: 'Проверить мобильный экран и модалки', detail: 'Кнопки доступны, модалки не прыгают, лимит и прогресс видны; после перезагрузки результаты чеклиста сохраняются.' },
] as const;

export type ChecklistId = typeof checklistItems[number]['id'];
export type ChecklistResult = 'auto' | 'pending' | 'pass' | 'fail' | 'skip';
export interface ChecklistEntry { result: ChecklistResult; note: string; autoAt: number | null; updatedAt: number }
export interface ChecklistRun { version: 1; startedAt: number; updatedAt: number; entries: Partial<Record<ChecklistId, ChecklistEntry>> }
export const emptyChecklist = (now = Date.now()): ChecklistRun => ({ version: 1, startedAt: now, updatedAt: now, entries: {} });
export const emptyEntry = (): ChecklistEntry => ({ result: 'auto', note: '', autoAt: null, updatedAt: 0 });
const validTime = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const results: ChecklistResult[] = ['auto', 'pending', 'pass', 'fail', 'skip'];
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export function checklistKey(owner: number, instance: string): string {
  if (!Number.isSafeInteger(owner) || owner <= 0 || !/^[1-9]\d{0,18}:[1-9]\d{0,18}$/.test(instance)) throw new Error('invalid-checklist-owner');
  return `ablaki:world-checklist:v1:${owner}:${instance}`;
}
export function parseChecklist(raw: string): ChecklistRun {
  if (raw.length > 100000) throw new Error('invalid-checklist');
  const row: unknown = JSON.parse(raw);
  if (!object(row) || row.version !== 1 || !validTime(row.startedAt) || !validTime(row.updatedAt) || !object(row.entries)) throw new Error('invalid-checklist');
  const entries: ChecklistRun['entries'] = {};
  for (const item of checklistItems) {
    if (!Object.hasOwn(row.entries, item.id)) continue;
    const entry = row.entries[item.id];
    if (!object(entry) || !results.includes(entry.result as ChecklistResult) || typeof entry.note !== 'string' || entry.note.length > 1500
      || (entry.autoAt !== null && !validTime(entry.autoAt)) || !validTime(entry.updatedAt)) throw new Error('invalid-checklist');
    entries[item.id] = { result: entry.result as ChecklistResult, note: entry.note, autoAt: entry.autoAt as number | null, updatedAt: entry.updatedAt };
  }
  return { version: 1, startedAt: row.startedAt, updatedAt: row.updatedAt, entries };
}
export function observeChecklist(run: ChecklistRun, state: MvpState | null, now = Date.now()): ChecklistRun {
  if (!state?.enabled) return run;
  const completed = new Set(state.goals.flatMap(goal => goal.steps.filter(step => step.completed).map(step => step.code)));
  let next = run;
  for (const item of checklistItems) {
    const success = 'steps' in item ? item.steps.every(step => completed.has(step))
      : 'special' in item && (item.special === 'starter' ? state.starterPaid : ['day-1', 'day-2'].every(code => state.goals.some(goal => goal.code === code && goal.claimed)));
    if (!success || run.entries[item.id]?.autoAt != null) continue;
    if (next === run) next = { ...run, updatedAt: now, entries: { ...run.entries } };
    next.entries[item.id] = { ...(run.entries[item.id] ?? emptyEntry()), autoAt: now, updatedAt: now };
  }
  return next;
}
export function checklistStatus(entry?: ChecklistEntry): Exclude<ChecklistResult, 'auto'> {
  return !entry || entry.result === 'auto' ? entry?.autoAt != null ? 'pass' : 'pending' : entry.result;
}
export function readChecklist(storage: Pick<Storage, 'getItem'>, key: string): { run: ChecklistRun; error: string } {
  try { const raw = storage.getItem(key); return { run: raw === null ? emptyChecklist() : parseChecklist(raw), error: '' }; }
  catch { return { run: emptyChecklist(), error: 'Не удалось прочитать сохранённый чеклист. Результаты доступны до закрытия страницы; используйте экспорт.' }; }
}
export function saveChecklist(storage: Pick<Storage, 'setItem'>, key: string, run: ChecklistRun): boolean {
  try { storage.setItem(key, JSON.stringify(run)); return true; } catch { return false; }
}
