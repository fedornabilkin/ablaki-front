import { describe, expect, it } from 'vitest';
import { parseMvp } from '../src/services/api/worldMvp';

const response = () => ({ enabled: true, server_time: 100, feedback_path: '/forum',
  health: { hp: 100, max_hp: 100, revision: 1, foods: [] }, goals: [], quotas: [],
  development: { version: 1, next_stage: 'home', completed: 0, total: 1,
    stages: [{ code: 'home', title: 'Стоянка', description: 'Сначала заселитесь.', completed: false,
      steps: [{ code: 'city_joined', title: 'Заселиться', completed: false, quantity: 0, required: 1, action_href: '/world' }] }] } });

describe('world development guide contract', () => {
  it('keeps ordered stages, server progress and internal action links', () => {
    expect(parseMvp(response()).development).toMatchObject({ nextStage: 'home', total: 1, completed: 0,
      stages: [{ title: 'Стоянка', steps: [{ title: 'Заселиться', href: '/world', completed: false }] }] });
    expect(parseMvp({ ...response(), development: undefined }).development).toBeNull();
    const character = response();
    character.development.stages[0].steps[0].action_href = '/world/character';
    expect(parseMvp(character).development?.stages[0].steps[0].href).toBe('/world/character');
  });
  it('rejects untrusted action URLs and inconsistent stage counts', () => {
    const data = response();
    data.development.stages[0].steps[0].action_href = 'https://example.com';
    expect(() => parseMvp(data)).toThrow();
    expect(() => parseMvp({ ...response(), development: { ...response().development, total: 2 } })).toThrow();
    expect(() => parseMvp({ ...response(), development: { ...response().development, next_stage: 'missing' } })).toThrow();
  });
});
