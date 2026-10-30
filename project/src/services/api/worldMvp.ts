import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record } from './world';
import { creditAmount } from '@/entities/world/credits';
import { parseEconomyQuota } from './worldEconomyQuota';

const text = (value: unknown): string => { if (typeof value !== 'string' || value.length > 500) throw new Error('invalid-world-response'); return value; };
const bool = (value: unknown): boolean => { if (typeof value !== 'boolean') throw new Error('invalid-world-response'); return value; };
const list = (value: unknown): unknown[] => { if (!Array.isArray(value) || value.length > 100) throw new Error('invalid-world-response'); return value; };
export function parseHealth(value: unknown) {
  const health = record(value), hp = integer(health.hp, 0, 100), maximum = integer(health.max_hp, 1, 100);
  if (hp > maximum) throw new Error('invalid-world-response');
  return { hp, maximum, canEat: health.can_eat === undefined ? hp < maximum : bool(health.can_eat), revision: integer(health.revision),
    disorderUntil: health.disorder_until == null ? null : integer(health.disorder_until),
    foods: list(health.foods).map(value => {
      const food = record(value); return { code: text(food.code), name: text(food.name), restore: integer(food.restore_hp, 1, 100), quantity: integer(food.quantity),
        canEat: food.can_eat === undefined ? integer(food.quantity) > 0 && hp < maximum : bool(food.can_eat),
        kitchenRestore: food.kitchen_restore_hp === undefined ? integer(food.restore_hp, 1, 100) : integer(food.kitchen_restore_hp, 1, 100),
        repeatLimit: food.repeat_limit === undefined ? null : integer(food.repeat_limit, 1, 10),
        repeatRemaining: food.repeat_remaining === undefined ? null : integer(food.repeat_remaining, 0, 10),
        repeatSeconds: food.repeat_seconds === undefined ? null : integer(food.repeat_seconds, 1, 86400),
        restoresAt: food.restores_at == null ? null : integer(food.restores_at) };
    }) };
}
export function parseMvp(value: unknown) {
  const row = record(value);
  const worldInstance = row.world_instance == null ? null : text(row.world_instance);
  if (worldInstance !== null && !/^[1-9]\d{0,18}:[1-9]\d{0,18}$/.test(worldInstance)) throw new Error('invalid-world-response');
  const startAmount = row.starter_funding === undefined ? row.target_start_credit_cr : row.starter_funding === null ? null : record(row.starter_funding).amount_cr;
  const feedback = text(row.feedback_path);
  if (!/^\/forum(?:\/read\/[1-9]\d*)?$/.test(feedback)) throw new Error('invalid-world-response');
  const href = (value: unknown): string | null => {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string' || !/^\/world(?:\/nodes\/[1-9]\d*|\/workspace\/[1-9]\d*|\/character)?$/.test(value)) throw new Error('invalid-world-response');
    return value;
  };
  return { enabled: bool(row.enabled), feedback: '/forum', serverTime: integer(row.server_time),
    worldInstance,
    starterPaid: row.starter_funding == null ? false : record(row.starter_funding).status === 'paid',
    canFundGoals: row.can_fund_goals === undefined ? false : bool(row.can_fund_goals),
    personalCredits: row.personal_credit_cr === undefined ? null : creditAmount(row.personal_credit_cr),
    targetStartCredits: startAmount == null ? null : creditAmount(startAmount),
    secondMilestoneDay: row.second_milestone_day === undefined || row.second_milestone_day === null ? null : integer(row.second_milestone_day, 1, 365),
    development: row.development == null ? null : parseDevelopment(row.development, href),
    health: parseHealth(row.health),
    goals: list(row.goals).map(value => {
      const goal = record(value);
      return { code: text(goal.code), claimed: bool(goal.claimed), funded: bool(goal.funded), canClaim: bool(goal.can_claim), credits: creditAmount(goal.credits_cr),
        blockedReason: goal.blocked_reason == null ? null : text(goal.blocked_reason),
        fundingSettlement: goal.funding_settlement_id == null ? null : integer(goal.funding_settlement_id, 1, 2147483647),
        steps: list(goal.steps).map(value => { const step = record(value); return { code: text(step.code), completed: bool(step.completed), quantity: integer(step.quantity), required: integer(step.required, 1), href: href(step.action_href) }; }) };
    }),
    quotas: list(row.quotas).filter(value => value !== null).map(value => parseEconomyQuota(value)!),
  };
}
export async function loadMvp() { return parseMvp((await apiClient.get(config.makeApiUrl('v1/world/economy'))).data); }
export type MvpState = ReturnType<typeof parseMvp>;

function parseDevelopment(value: unknown, href: (value: unknown) => string | null) {
  const route = record(value);
  const stages = list(route.stages).map(value => {
    const stage = record(value);
    return { code: text(stage.code), title: text(stage.title), description: text(stage.description), completed: bool(stage.completed),
      steps: list(stage.steps).map(value => {
        const step = record(value);
        return { code: text(step.code), title: text(step.title), completed: bool(step.completed), quantity: integer(step.quantity), required: integer(step.required, 1), href: href(step.action_href) };
      }) };
  });
  const nextStage = route.next_stage == null ? null : text(route.next_stage);
  if (nextStage !== null && !stages.some(stage => stage.code === nextStage)) throw new Error('invalid-world-response');
  const total = integer(route.total, 1), completed = integer(route.completed, 0, total);
  if (stages.reduce((count, stage) => count + stage.steps.length, 0) !== total) throw new Error('invalid-world-response');
  return { version: integer(route.version, 1), stages, nextStage, total, completed };
}

export type DevelopmentState = NonNullable<MvpState['development']>;

export const milestoneLabels: Record<string, string> = {
  city_joined: 'Вступить в мир', starter_site_active: 'Завершить стоянку', explore_3_owned_map_cells: 'Исследовать три ячейки',
  shelter_built: 'Построить шалаш', hammer_crafted: 'Получить молоток', gather_5_logs: 'Получить пять брёвен', gather_5_stones: 'Получить пять камней',
  campfire_placed: 'Разместить костёр', garden_built: 'Построить огород', shovel_crafted: 'Изготовить лопату', bed_dug: 'Вскопать грядку', carrot_sown: 'Посадить морковь',
  daily_supply_claimed: 'Получить ежедневное снабжение', carrot_harvested: 'Собрать морковь', mine_built: 'Построить шахту', stone_pickaxe_crafted: 'Получить каменную кирку',
  stone_mined: 'Добыть камень в шахте', coal_mined: 'Добыть уголь', ore_mined: 'Добыть руду', forge_built: 'Построить кузницу',
  bench_crafted: 'Изготовить верстак', furnace_crafted: 'Изготовить плавильню', ingot_crafted: 'Изготовить слиток',
};
