import { onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue';
import { isAxiosError } from 'axios';
import { isWorldCommandPath, parseRevisions, sendWorldCommand, worldError } from '@/services/api/world';
import type { WorldCommandResult, WorldQuote } from '@/entities/world/types';
import { investmentAmount } from '@/entities/world/credits';
import { financePolicyInput } from '@/services/api/worldEconomy';
import { orderDeliveryInput, orderPublicationInput } from '@/services/api/worldOrders';
import { premisesPublicationInput } from '@/services/api/worldPremises';
import { shelterInput, type ShelterAction } from '@/services/api/worldShelter';
import { gardenInput, type GardenAction } from '@/services/api/worldGarden';
import { equipmentExpansionInput } from '@/services/api/worldEquipmentExpansion';

interface PendingCommand { path: string; body: Record<string, unknown> & { request_key: string; quote_id: string; expected_revisions: Record<string, number> } }
/** A retry resends the immutable snapshot, never a newly calculated price or key. */
export function useWorldCommand(session: Ref<number>, owner: Ref<number>, completed: (result: WorldCommandResult) => void) {
  const busy = ref(false), error = ref(''), pending = shallowRef<PendingCommand | null>(null);
  let epoch = 0, disposed = false;
  const key = () => owner.value ? `ablaki.world.pending.${owner.value}` : '';
  function persist(value: PendingCommand | null) {
    try { const id = key(); if (id) { if (value) sessionStorage.setItem(id, JSON.stringify(value)); else sessionStorage.removeItem(id); } } catch { /* In-memory retry remains available. */ }
  }
  function restore() {
    try {
      const raw = key() ? sessionStorage.getItem(key()) : null;
      if (!raw || raw.length > 32768) return;
      const value = JSON.parse(raw);
      if (!value || typeof value.path !== 'string' || !isWorldCommandPath(value.path)) return;
      const body = value.body;
      if (!body || typeof body !== 'object' || !/^[A-Za-z0-9_-]{16,80}$/.test(body.request_key) || !/^[a-f0-9]{32}$/.test(body.quote_id)) return;
      if (/^\/nodes\/[1-9]\d*\/invest$/.test(value.path)) {
        if (investmentAmount(body.amount) !== body.amount || typeof body.purpose !== 'string' || !body.purpose.trim() || body.purpose.length > 255) return;
      } else if (/^\/nodes\/[1-9]\d*\/(collect|supplies-starter|supplies-gather|housing-lodge|housing-leave|construction-pause|construction-resume|construction-cancel|building-pause|building-resume|building-repair|demolish)$/.test(value.path)) {
        if (Object.keys(body).some(key => !['request_key', 'quote_id', 'expected_revisions'].includes(key))) return;
      } else if (/^\/nodes\/[1-9]\d*\/budget-grant$/.test(value.path)) {
        if (!Number.isSafeInteger(body.destination_node_id) || body.destination_node_id < 1 || body.destination_node_id > 2147483647 || investmentAmount(body.amount) !== body.amount || typeof body.purpose !== 'string' || !body.purpose.trim() || body.purpose.length > 255) return;
      } else if (/^\/nodes\/[1-9]\d*\/pay$/.test(value.path)) {
        if (!Number.isSafeInteger(body.obligation_id) || body.obligation_id < 1 || body.obligation_id > 2147483647) return;
      } else if (/^\/nodes\/[1-9]\d*\/finance-policy$/.test(value.path)) {
        financePolicyInput(body);
      } else if (/^\/nodes\/[1-9]\d*\/order-publish$/.test(value.path)) {
        orderPublicationInput(body);
      } else if (/^\/nodes\/[1-9]\d*\/order-deliver$/.test(value.path)) {
        orderDeliveryInput(body);
      } else if (/^\/nodes\/[1-9]\d*\/order-cancel$/.test(value.path)) {
        if (!Number.isSafeInteger(body.order_id) || body.order_id < 1 || body.order_id > 2147483647) return;
      } else if (/^\/nodes\/[1-9]\d*\/premises-publish$/.test(value.path)) {
        premisesPublicationInput(body);
      } else if (/^\/nodes\/[1-9]\d*\/(premises-(buy|withdraw)|repair-contract)$/.test(value.path)) {
        if (!Number.isSafeInteger(body.offer_id) || body.offer_id < 1 || body.offer_id > 2147483647) return;
      } else if (/^\/nodes\/[1-9]\d*\/shelter-(claim|deploy|fold|lodge|leave|repair)$/.test(value.path)) {
        shelterInput(value.path.substring(value.path.lastIndexOf('shelter-') + 8) as ShelterAction, body);
      } else if (/^\/nodes\/[1-9]\d*\/garden-(publish|withdraw|buy|expand)$/.test(value.path)) {
        gardenInput(value.path.substring(value.path.lastIndexOf('garden-') + 7) as GardenAction, body);
      } else if (/^\/nodes\/[1-9]\d*\/equipment-expand$/.test(value.path)) {
        equipmentExpansionInput(body);
      } else if (/^\/nodes\/[1-9]\d*\/map-(explore|buy)$/.test(value.path)) {
        if (!Number.isSafeInteger(body.x) || !Number.isSafeInteger(body.y) || Math.abs(body.x) > 1000000 || Math.abs(body.y) > 1000000 || typeof body.top_up !== 'boolean') return;
      } else if (value.path === '/workspace/craft') {
        const validId = (id: unknown) => typeof id === 'number' && Number.isSafeInteger(id) && id > 0 && id <= 2147483647;
        if (['node_id', 'recipe_id', 'quantity', 'output_storage_id'].some(key => !validId(body[key])) || body.quantity > 100) return;
        for (const [field, max] of [['source_storage_ids', 20], ['equipment_instance_ids', 100]] as const) {
          const ids = body[field];
          if (!Array.isArray(ids) || ids.length > max || ids.some(id => !validId(id)) || new Set(ids).size !== ids.length) return;
        }
        if (!body.source_storage_ids.length) return;
      } else if (value.path === '/storage/recover') {
        if (!Number.isSafeInteger(body.inventory_id) || body.inventory_id < 1 || body.inventory_id > 2147483647) return;
      } else if (value.path === '/storage/chest-repair') {
        if (['storage_id', 'container_inventory_id'].some(key => !Number.isSafeInteger(body[key]) || body[key] < 1 || body[key] > 2147483647)) return;
      } else if (value.path === '/storage/transfer') {
        if (['inventory_id', 'source_storage_id', 'destination_storage_id', 'position', 'quantity'].some(key => !Number.isSafeInteger(body[key]) || body[key] < 1 || body[key] > 2147483647)) return;
        if (body.quantity > 10000 || (body.instance_id !== null && (!Number.isSafeInteger(body.instance_id) || body.instance_id < 1))) return;
      } else if (value.path === '/onboarding/join') {
        if (!Number.isSafeInteger(body.settlement_id) || body.settlement_id < 1) return;
      } else if (typeof body.reason !== 'string' || body.reason.length > 255 || body.reason.trim() === '') return;
      if (value.path.endsWith('/move') && (!Number.isSafeInteger(body.parent_id) || body.parent_id < 1)) return;
      body.expected_revisions = parseRevisions(body.expected_revisions);
      pending.value = { path: value.path, body };
    } catch { /* Untrusted local storage cannot become an unchecked command. */ }
  }
  async function send(command: PendingCommand) {
    if (busy.value || disposed) return;
    const current = ++epoch; busy.value = true; error.value = ''; pending.value = command; persist(command);
    try {
      const result = await sendWorldCommand(command.path, command.body);
      if (disposed || current !== epoch) return;
      if (result.request_key !== command.body.request_key) throw new Error('mismatched-command-result');
      pending.value = null; persist(null); completed(result);
    } catch (cause) {
      if (disposed || current !== epoch) return;
      error.value = worldError(cause);
      if (isAxiosError(cause) && cause.response && cause.response.status < 500) { pending.value = null; persist(null); }
    } finally { if (!disposed && current === epoch) busy.value = false; }
  }
  function submit(path: string, payload: Record<string, unknown>, quote: WorldQuote) {
    if (busy.value || pending.value) return Promise.resolve();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const request_key = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    const command = JSON.parse(JSON.stringify({ path, body: { ...payload, quote_id: quote.quote_id, expected_revisions: quote.expected_revisions, request_key } })) as PendingCommand;
    return send(command);
  }
  const retry = () => pending.value ? send(pending.value) : Promise.resolve();
  watch([session, owner], () => { epoch++; busy.value = false; error.value = ''; pending.value = null; restore(); }, { immediate: true, flush: 'sync' });
  onScopeDispose(() => { disposed = true; epoch++; });
  return { busy, error, pending, submit, retry };
}
export type WorldCommandRunner = ReturnType<typeof useWorldCommand>;
