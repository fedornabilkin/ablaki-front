import type { CultivationAction, parseCultivation } from '@/services/api/worldCultivation';

type Bed = ReturnType<typeof parseCultivation>;
export interface CultivationStage {
  kind: 'dig' | 'sow' | 'water_wait' | 'water' | 'growing' | 'harvest' | 'expired';
  title: string;
  button: string;
  icon: string;
  action: CultivationAction | null;
  until: number | null;
}

/** Server timestamps define the current stage; commands still require a fresh quote. */
export function cultivationStage(bed: Bed | null, now: number): CultivationStage | null {
  if (!bed) return null;
  const c = bed.cycle;
  if (!c) return bed.dug
    ? { kind: 'sow', title: 'Грядка готова к посадке', button: 'Посадить семена', icon: 'seedling', action: 'sow', until: null }
    : { kind: 'dig', title: 'Подготовка земли', button: 'Вскопать', icon: 'hammer', action: 'dig', until: null };
  if (now >= c.expires_at) return { kind: 'expired', title: 'Срок сбора истёк', button: 'Очистить грядку', icon: 'times', action: 'cancel', until: null };
  if (now >= c.ready_at) return { kind: 'harvest', title: 'Урожай созрел', button: 'Собрать', icon: 'seedling', action: 'harvest', until: c.expires_at };
  if (c.water_due_at !== null && c.water_deadline_at !== null && !c.water_missed && now < c.water_deadline_at) {
    if (now < c.water_due_at) return { kind: 'water_wait', title: c.watering_step === 2 ? 'Ожидание второго полива' : 'Ожидание полива', button: 'Полить', icon: 'bottle-water', action: null, until: c.water_due_at };
    return { kind: 'water', title: c.watering_step === 1 ? 'Первый полив' : c.watering_step === 2 ? 'Второй полив' : 'Полив', button: 'Полить', icon: 'bottle-water', action: 'water', until: c.water_deadline_at };
  }
  return { kind: 'growing', title: 'Урожай растёт', button: 'Собрать', icon: 'seedling', action: null, until: c.ready_at };
}
