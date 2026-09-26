import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useCityStore } from '../src/store/city';
import { loadCityState, defaultCityState } from '../src/services/city/mock';
import { BUILDINGS } from '../src/entities/city/buildings';
import { navigation } from '../src/config/navigation';
let values: Map<string, string>;
beforeEach(() => { values = new Map(); vi.useFakeTimers(); setActivePinia(createPinia()); vi.stubGlobal('localStorage', {getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key)}); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });
it('opens the city in navigation, isolates account saves and stops its timer', () => {
  expect(navigation.find(link => link.to === '/city')).toMatchObject({account: true});
  const city = useCityStore(); city.load(37);
  const building = Object.values(BUILDINGS).find(item => !item.fixed)!;
  city.build(0, building.code); expect(city.balance).toBe(500 - building.cost);
  city.load(38); expect(city.grid[0]).toBeNull(); expect(city.balance).toBe(500);
  city.load(37); expect(city.grid[0]).toBe(building.code); expect(city.balance).toBe(500 - building.cost);
  expect(vi.getTimerCount()).toBe(1); city.stopTicker(); expect(vi.getTimerCount()).toBe(0);
});
it('rejects malformed browser state and sanitizes partial saves', () => {
  values.set('ablakin_city_v2:37', 'null'); expect(loadCityState(37)).toEqual(defaultCityState());
  values.set('ablakin_city_v2:37', JSON.stringify({...defaultCityState(), localBudget: '999999', activeEffects: [null], eventsLog: {}, treasury: -5}));
  expect(loadCityState(37)).toMatchObject({localBudget: 500, treasury: 0, activeEffects: [], eventsLog: []});
});
