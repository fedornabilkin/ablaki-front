import { onScopeDispose, ref, shallowRef, watch, type Ref } from 'vue';
import { isAxiosError } from 'axios';
import { command } from '@/services/api/simpleWorld';
import { worldError } from '@/services/api/world';

interface Pending { path: string; body: Record<string, unknown>; key: string }
const allowed = /^(start|builds|builds\/[1-9]\d*\/(start|heartbeat|stop|cancel)|objects\/[1-9]\d*\/(budget|gather))$/;
/** Keep the same payload and key until the server has confirmed the result. */
export function useSimpleWorldCommand(scope: Ref<string>, session: Ref<number>) {
  const busy = ref(false), error = ref(''), pending = shallowRef<Pending | null>(null);
  let epoch = 0, disposed = false;
  const storageKey = () => `ablaki.simple-world.${scope.value}`;
  function persist(value: Pending | null) {
    try { if (value) sessionStorage.setItem(storageKey(), JSON.stringify(value)); else sessionStorage.removeItem(storageKey()); } catch { /* Memory retry remains available. */ }
  }
  async function send(value: Pending) {
    if (busy.value || disposed) return;
    const token = epoch; busy.value = true; error.value = ''; pending.value = value; persist(value);
    try {
      const result = await command(value.path, value.body, value.key);
      if (disposed || token !== epoch) return;
      pending.value = null; persist(null); return result;
    } catch (cause) {
      if (disposed || token !== epoch) return;
      error.value = worldError(cause);
      if (isAxiosError(cause) && cause.response && cause.response.status < 500 && ![408, 425, 429].includes(cause.response.status)) { pending.value = null; persist(null); }
    } finally { if (!disposed && token === epoch) busy.value = false; }
  }
  function submit(path: string, body: Record<string, unknown> = {}) {
    if (pending.value || !allowed.test(path)) return Promise.resolve(undefined);
    return send({ path, body: JSON.parse(JSON.stringify(body)), key: crypto.randomUUID() });
  }
  function restore() {
    epoch++; busy.value = false; error.value = ''; pending.value = null;
    try {
      const raw = sessionStorage.getItem(storageKey()); if (!raw || raw.length > 8192) return;
      const value = JSON.parse(raw);
      if (typeof value.path === 'string' && allowed.test(value.path) && typeof value.key === 'string' && /^[A-Za-z0-9_-]{16,80}$/.test(value.key)
        && value.body && typeof value.body === 'object' && !Array.isArray(value.body)) pending.value = value;
    } catch { /* Ignore corrupt local data. The server validates restored input. */ }
  }
  watch([scope, session], restore, { immediate: true, flush: 'sync' });
  onScopeDispose(() => { disposed = true; epoch++; });
  return { busy, error, pending, submit, retry: () => pending.value ? send(pending.value) : Promise.resolve(undefined) };
}
