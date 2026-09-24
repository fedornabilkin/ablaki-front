import { onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue';
import { isAxiosError } from 'axios';
import { craftError, loadCraft, sendCraft, type CraftState, type CraftCommand, type CraftAction, type CraftInput } from '@/services/api/classicCraft';

export function useClassicCraft(session: Ref<number>, refreshAccount: () => Promise<unknown>, owner?: Ref<number>) {
  const storageKey = () => owner?.value ? `ablaki.craft.pending.${owner.value}` : '';
  function persist(command: CraftCommand | null) {
    try { const key = storageKey(); if (key) { if (command) sessionStorage.setItem(key, JSON.stringify(command)); else sessionStorage.removeItem(key); } } catch { /* In-memory retries remain available. */ }
  }
  function restore(): CraftCommand | null {
    try {
      const key = storageKey(), value = key ? JSON.parse(sessionStorage.getItem(key) || 'null') : null;
      const inventoryAction = value && ['use', 'discard', 'merge', 'transfer'].includes(value.action);
      const validSlot = value && (value.slot_id === undefined || (inventoryAction && Number.isSafeInteger(value.slot_id) && value.slot_id > 0));
      const validTarget = value && (value.action === 'merge' ? Number.isSafeInteger(value.target_slot_id) && value.target_slot_id > 0 && value.slot_id > 0 && value.target_slot_id !== value.slot_id && value.quantity === 1 : value.target_slot_id === undefined);
      const validTransfer = value && (value.action === 'transfer' ? value.slot_id > 0 && Number.isSafeInteger(value.container_id) && value.container_id >= 0 && Number.isSafeInteger(value.position) && value.position > 0 && value.position <= 100 : value.container_id === undefined && value.position === undefined);
      const validPrice = value && (value.action === 'buy_slots' ? Number.isSafeInteger(value.unit_price) && value.unit_price >= 0 && value.unit_price <= 1000000 : value.unit_price === undefined);
      if (value && validSlot && validTarget && validTransfer && validPrice && ['craft','starter','gather','use','discard','merge','transfer','buy_slots'].includes(value.action) && Number.isSafeInteger(value.id) && value.id >= 0 && Number.isSafeInteger(value.quantity) && value.quantity >= 1 && value.quantity <= (inventoryAction ? 10000 : 100) && typeof value.request_key === 'string' && /^[A-Za-z0-9_-]{16,80}$/.test(value.request_key)) return value;
    } catch { /* Malformed local state is not a command. */ }
    return null;
  }
  const state = shallowRef<CraftState | null>(null);
  const busy = ref(false), loading = ref(false), error = ref(''), notice = ref('');
  const pending = shallowRef<CraftCommand | null>(restore());
  let revision = 0, disposed = false;
  async function refresh() {
    if (busy.value) return;
    const current = ++revision; loading.value = true; error.value = '';
    try { const data = await loadCraft(); if (!disposed && current === revision) state.value = data; }
    catch (cause) { if (!disposed && current === revision) error.value = craftError(cause); }
    finally { if (!disposed && current === revision) loading.value = false; }
  }
  async function send(command: CraftCommand) {
    if (busy.value) return;
    busy.value = true; loading.value = false; error.value = ''; notice.value = '';
    const current = ++revision; pending.value = command; persist(command);
    try {
      const result = await sendCraft(command);
      if (disposed || current !== revision) return;
      state.value = result.state; notice.value = result.message; pending.value = null; persist(null);
      try { await refreshAccount(); } catch { if (current === revision) notice.value += ' Обновите профиль, чтобы синхронизировать счёт в шапке.'; }
    } catch (cause) {
      if (disposed || current !== revision) return;
      error.value = craftError(cause);
      // A timeout/5xx may happen after commit. Keep the exact key until its outcome is known.
      if (isAxiosError(cause) && cause.response && cause.response.status < 500) { pending.value = null; persist(null); }
    } finally { if (!disposed && current === revision) busy.value = false; }
  }
  function command(action: CraftAction, id = 0, quantity = 1, slotId?: number, targetSlotId?: number) {
    return submit({action, id, quantity, ...(slotId === undefined ? {} : {slot_id: slotId}), ...(targetSlotId === undefined ? {} : {target_slot_id: targetSlotId})});
  }
  function submit(input: CraftInput) {
    if (busy.value || pending.value) return Promise.resolve();
    const bytes = new Uint8Array(16); crypto.getRandomValues(bytes);
    return send({...input, request_key: Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('')});
  }
  const retry = () => pending.value ? send(pending.value) : Promise.resolve();
  watch(session, () => { revision++; state.value = null; busy.value = false; loading.value = false; pending.value = null; error.value = ''; notice.value = ''; });
  onScopeDispose(() => { disposed = true; revision++; });
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  watch(state, value => {
    clearTimeout(expiryTimer);
    if (value?.slots_expire_at && value.server_time) expiryTimer = setTimeout(() => { if (!pending.value) void refresh(); }, Math.min(2147483647, Math.max(1000, (value.slots_expire_at - value.server_time) * 1000 + 1000)));
  });
  onScopeDispose(() => clearTimeout(expiryTimer));
  return {state, busy, loading, error, notice, pending, refresh, command, submit, retry};
}
