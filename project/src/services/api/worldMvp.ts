import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record } from './world';
import { creditAmount } from '@/entities/world/credits';
import { parseEconomyQuota } from './worldEconomyQuota';

const text = (value: unknown): string => { if (typeof value !== 'string' || value.length > 500) throw new Error('invalid-world-response'); return value; };
const bool = (value: unknown): boolean => { if (typeof value !== 'boolean') throw new Error('invalid-world-response'); return value; };
const list = (value: unknown): unknown[] => { if (!Array.isArray(value) || value.length > 100) throw new Error('invalid-world-response'); return value; };
export function parseMvp(value: unknown) {
  const row = record(value), health = record(row.health);
  const feedback = text(row.feedback_path);
  if (!/^\/forum\/read\/[1-9]\d*$/.test(feedback)) throw new Error('invalid-world-response');
  const hp = integer(health.hp, 0, 100), maximum = integer(health.max_hp, 1, 100);
  if (hp > maximum) throw new Error('invalid-world-response');
  const href = (value: unknown): string | null => {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string' || !/^\/world(?:\/nodes\/[1-9]\d*|\/workspace\/[1-9]\d*)?$/.test(value)) throw new Error('invalid-world-response');
    return value;
  };
  return { enabled: bool(row.enabled), feedback, serverTime: integer(row.server_time),
    personalCredits: row.personal_credit_cr === undefined ? null : creditAmount(row.personal_credit_cr),
    targetStartCredits: row.target_start_credit_cr === undefined || row.target_start_credit_cr === null ? null : creditAmount(row.target_start_credit_cr),
    secondMilestoneDay: row.second_milestone_day === undefined || row.second_milestone_day === null ? null : integer(row.second_milestone_day, 1, 365),
    health: { hp, maximum, revision: integer(health.revision), foods: list(health.foods).map(value => {
      const food = record(value); return { code: text(food.code), name: text(food.name), restore: integer(food.restore_hp, 1, 100), quantity: integer(food.quantity) };
    }) },
    goals: list(row.goals).map(value => {
      const goal = record(value);
      return { code: text(goal.code), claimed: bool(goal.claimed), funded: bool(goal.funded), canClaim: bool(goal.can_claim), credits: creditAmount(goal.credits_cr),
        steps: list(goal.steps).map(value => { const step = record(value); return { code: text(step.code), completed: bool(step.completed), quantity: integer(step.quantity), required: integer(step.required, 1), href: href(step.action_href) }; }) };
    }),
    quotas: list(row.quotas).filter(value => value !== null).map(value => parseEconomyQuota(value)!),
  };
}
export async function loadMvp() { return parseMvp((await apiClient.get(config.makeApiUrl('v1/world/economy'))).data); }
export type MvpState = ReturnType<typeof parseMvp>;

export const milestoneLabels: Record<string, string> = {
  city_joined: 'Вступить в мир', starter_site_active: 'Завершить стоянку', explore_3_owned_map_cells: 'Исследовать три ячейки',
  shelter_built: 'Построить шалаш', hammer_crafted: 'Изготовить молоток', gather_5_logs: 'Получить пять брёвен', gather_5_stones: 'Получить пять камней',
  campfire_placed: 'Разместить костёр', garden_built: 'Построить огород', shovel_crafted: 'Изготовить лопату', bed_dug: 'Вскопать грядку', carrot_sown: 'Посадить морковь',
  daily_supply_claimed: 'Получить ежедневное снабжение', carrot_harvested: 'Собрать морковь', mine_built: 'Построить шахту', stone_pickaxe_crafted: 'Изготовить каменную кирку',
  stone_mined: 'Добыть камень в шахте', coal_mined: 'Добыть уголь', ore_mined: 'Добыть руду', forge_built: 'Построить кузницу',
  bench_crafted: 'Изготовить верстак', furnace_crafted: 'Изготовить плавильню', ingot_crafted: 'Изготовить слиток',
};
