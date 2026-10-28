import { describe, expect, it } from 'vitest';
import { parseMvp } from '../src/services/api/worldMvp';
import { parseMining } from '../src/services/api/worldMining';
import { parseEconomyHistory } from '../src/services/api/worldEconomyHistory';

const mvp = () => ({ enabled: true, server_time: 100, feedback_path: '/forum/read/80',
  health: { hp: 85, max_hp: 100, revision: 1, foods: [{ code: 'world-cooked-carrot', name: 'Печёная морковь', restore_hp: 15, quantity: 2 }] },
  goals: [{ code: 'day-1', claimed: false, funded: true, can_claim: false, credits_cr: '50.0000', steps: [{ code: 'city_joined', completed: true, quantity: 1, required: 1 }] }],
  quotas: [{ kind: 'extraction_daily', maximum: 20, remaining: 19, restores_at: 86400 }] });

describe('closed-test server contracts', () => {
  it('shows the accepted settlement payout instead of the default profile rate', () => {
    expect(parseMvp({...mvp(), target_start_credit_cr: '250.0000', starter_funding: {amount_cr: '80.0000'}}).targetStartCredits).toBe('80.0000');
    expect(parseMvp({...mvp(), target_start_credit_cr: '250.0000', starter_funding: null}).targetStartCredits).toBeNull();
  });
  it('keeps health revision, funded goals and exact reward credits', () => {
    expect(parseMvp(mvp())).toMatchObject({ feedback: '/forum', health: { hp: 85, revision: 1, foods: [{ restore: 15, quantity: 2 }] }, goals: [{ credits: '50.0000', funded: true, canClaim: false }] });
  });
  it('rejects unsafe feedback links, impossible health and malformed rewards', () => {
    for (const path of ['https://foreign.invalid/', '//foreign.invalid/', '/forum/read/0', '/forum/read/80?token=secret']) expect(() => parseMvp({ ...mvp(), feedback_path: path })).toThrow();
    expect(() => parseMvp({ ...mvp(), health: { ...mvp().health, hp: 101 } })).toThrow();
    expect(() => parseMvp({ ...mvp(), health: { ...mvp().health, max_hp: 50 } })).toThrow();
    expect(() => parseMvp({ ...mvp(), goals: [{ ...mvp().goals[0], credits_cr: 50 }] })).toThrow();
  });
  it('accepts the inactive profile without inventing goals or quotas', () => {
    expect(parseMvp({ ...mvp(), enabled: false, goals: [], quotas: [null] })).toMatchObject({ enabled: false, goals: [], quotas: [] });
  });
  it('accepts exact personal funds and safe action links while rejecting external navigation', () => {
    const data = { ...mvp(), personal_credit_cr: '250.0000', target_start_credit_cr: '250.0000', second_milestone_day: 5 };
    data.goals[0].steps[0] = { ...data.goals[0].steps[0], action_href: '/world/nodes/12' } as any;
    expect(parseMvp(data)).toMatchObject({ personalCredits: '250.0000', secondMilestoneDay: 5, goals: [{ steps: [{ href: '/world/nodes/12' }] }] });
    for (const action_href of ['https://foreign.invalid/', '//foreign.invalid/', '/world/nodes/0', '/world/nodes/12?token=secret']) {
      data.goals[0].steps[0] = { ...data.goals[0].steps[0], action_href } as any;
      expect(() => parseMvp(data)).toThrow();
    }
    expect(() => parseMvp({ ...mvp(), personal_credit_cr: 250 })).toThrow();
  });
  const mining = () => ({ node_id: 1, ready: true, working: false, workers: 0, produced_quantity: 2, pending_quantity: 1, seconds_per_unit: 120, server_time: 100,
    worked_seconds: 120, action_code: 'gather-log', blocked_message: 'Освободите место', quota: { maximum: 20, remaining: 18, restores_at: 86400 },
    actions: [{ code: 'gather-log', work_seconds: 120, cooldown_seconds: 0, output: [{ code: 'classic-log', name: 'Бревно', quantity: 1 }], tools: ['classic-hammer'], daily_limit: null }] });
  it('preserves a blocked completed source batch and remains compatible with legacy mining', () => {
    expect(parseMining(mining())).toMatchObject({ pending_quantity: 1, worked_seconds: 120, blocked_message: 'Освободите место', actions: [{ output: [{ quantity: 1 }] }] });
    const { actions, worked_seconds, action_code, blocked_message, quota, ...legacy } = mining();
    expect(parseMining(legacy)).toEqual(legacy);
  });
  it('rejects malformed source output and quotas before rendering actions', () => {
    expect(() => parseMining({ ...mining(), actions: [{ ...mining().actions[0], output: [{}] }] })).toThrow();
    expect(() => parseMining({ ...mining(), quota: { maximum: 20, remaining: '18', restores_at: 86400 } })).toThrow();
  });
  it('preserves the accepted storage and checks localized tool names against requirements', () => {
    const data = { ...mining(), output_storage_id: 17, actions: [{ ...mining().actions[0], experience: 5, tool_names: ['Молоток'] }] };
    expect(parseMining(data)).toMatchObject({ output_storage_id: 17, actions: [{ experience: 5, tool_names: ['Молоток'] }] });
    expect(() => parseMining({ ...data, actions: [{ ...data.actions[0], tool_names: [] }] })).toThrow();
    expect(() => parseMining({ ...data, actions: [{ ...data.actions[0], experience: -1 }] })).toThrow();
    expect(() => parseMining({ ...data, output_storage_id: -1 })).toThrow();
  });
  it('preserves server drill quantities and separates base, effective and accepted wages', () => {
    const data = {...mining(), actions: [{...mining().actions[0], tools: [], tool_names: [], output: [{code: 'classic-stone', name: 'Камень', quantity: 15}], drilling: {node_id: 7, output_multiplier: 5, reward_multiplier: 3}}],
      employment: {enabled: true, owner: false, available: true, reason: null, storage_id: 8, storages: [], base_reward_cr: '2.0000', reward_cr: '6.0000', reward_multiplier: 3, accepted_reward_cr: '3.0000'}};
    expect(parseMining(data)).toMatchObject({actions: [{output: [{quantity: 15}], tools: [], drilling: {output_multiplier: 5}}], employment: {base_reward_cr: '2.0000', reward_cr: '6.0000', accepted_reward_cr: '3.0000'}});
    for (const value of [0, 21, 2.5, '3']) expect(() => parseMining({...data, employment: {...data.employment, reward_multiplier: value}})).toThrow();
    expect(() => parseMining({...data, actions: [{...data.actions[0], drilling: {...data.actions[0].drilling, node_id: 0}}]})).toThrow();
  });
  const history = () => ({ items: [{ id: 'a'.repeat(32), source: 'commands', kind: 'world.start', classification: 'action', operation_id: 'a'.repeat(32), created_at: 100, quantity: null, amount_cr: null }],
    _meta: { totalCount: 1, currentPage: 1, pageCount: 1, perPage: 20 } });
  it('accepts real operation IDs and legacy five-decimal transfer deltas', () => {
    expect(parseEconomyHistory(history()).items[0].id).toBe('a'.repeat(32));
    const data = history();
    expect(parseEconomyHistory({ ...data, items: [{ ...data.items[0], id: 1, source: 'transfers', operation_id: null, amount_cr: '-250.00000' }] }).items[0]).toMatchObject({ id: '1', amount: '-250.00000', operation: null });
  });
  it('rejects inconsistent history totals and malformed amounts', () => {
    expect(() => parseEconomyHistory({ ...history(), _meta: { ...history()._meta, pageCount: 2 } })).toThrow();
    expect(() => parseEconomyHistory({ ...history(), items: [{ ...history().items[0], amount_cr: '1e9' }] })).toThrow();
  });
  it('keeps journal balances and transfer phases while accepting earlier responses', () => {
    const data = history();
    const item = { ...data.items[0], balance_before_cr: '250.0000', balance_after_cr: '220.0000', node_id: 8, profile_version: 2, transfer_ids: [42], transfer_phase: 'claim' };
    expect(parseEconomyHistory({ ...data, items: [item] }).items[0]).toMatchObject({ balanceBefore: '250.0000', balanceAfter: '220.0000', nodeId: 8, profileVersion: 2, transferIds: [42], transferPhase: 'claim' });
    expect(parseEconomyHistory(data).items[0]).toMatchObject({ balanceBefore: null, profileVersion: null, transferIds: [] });
    for (const change of [{ transfer_phase: 'paid' }, { transfer_ids: [-1] }, { profile_version: '2' }, { balance_after_cr: 'NaN' }])
      expect(() => parseEconomyHistory({ ...data, items: [{ ...item, ...change }] })).toThrow();
  });
});
