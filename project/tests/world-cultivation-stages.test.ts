import { describe, expect, it } from 'vitest';
import { cultivationStage } from '../src/entities/world/cultivation';
import { parseCultivation } from '../src/services/api/worldCultivation';

const cycle = { id: 1, crop_revision_id: 1, name: 'Морковь', state: 'needs_water', ready_at: 400, expires_at: 1000,
  water_due_at: 100, water_deadline_at: 250, watering_step: 1, watering_total: 2, water_missed: false, can_water: true, yield_factor_bps: 10000 };
const bed = (changes: Record<string, unknown> = {}) => parseCultivation({ bed_id: 1, owner: true, writable: true, dug: false, server_time: 100, cycle: { ...cycle, ...changes } });

describe('cultivation stage sequence', () => {
  it('follows dig, sow, first water, wait, second water, grow, harvest, dig', () => {
    const empty = { ...bed(), cycle: null };
    expect(cultivationStage(empty, 100)?.action).toBe('dig');
    expect(cultivationStage({ ...empty, dug: true }, 100)?.action).toBe('sow');
    expect(cultivationStage(bed(), 100)).toMatchObject({ kind: 'water', title: 'Первый полив', until: 250 });
    const second = bed({ watering_step: 2, water_due_at: 250, water_deadline_at: 400, can_water: false });
    expect(cultivationStage(second, 249)).toMatchObject({ kind: 'water_wait', action: null, until: 250 });
    expect(cultivationStage(second, 250)).toMatchObject({ kind: 'water', title: 'Второй полив', action: 'water', until: 400 });
    const watered = bed({ watering_step: null, water_due_at: null, water_deadline_at: null });
    expect(cultivationStage(watered, 399)).toMatchObject({ kind: 'growing', action: null, until: 400 });
    expect(cultivationStage(watered, 400)).toMatchObject({ kind: 'harvest', action: 'harvest', until: 1000 });
    expect(cultivationStage(empty, 401)?.action).toBe('dig');
  });
  it('does not offer useless watering after a missed deadline or harvesting after expiry', () => {
    expect(cultivationStage(bed(), 250)?.kind).toBe('growing');
    expect(cultivationStage(bed({ water_missed: true }), 110)?.action).toBeNull();
    expect(cultivationStage(bed(), 1000)).toMatchObject({ kind: 'expired', action: 'cancel', until: null });
  });
  it('supports crops accepted before the two-step schedule', () => {
    const legacy = bed({ watering_step: undefined, watering_total: undefined });
    expect(cultivationStage(legacy, 100)?.title).toBe('Полив');
    expect(() => bed({ watering_step: 3 })).toThrow();
  });
});
