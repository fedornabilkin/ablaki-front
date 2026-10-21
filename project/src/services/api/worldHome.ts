import { startState } from './simpleWorld';

// Share only concurrent home reads. Each new read after completion still reaches the server.
const pending = new Map<string, ReturnType<typeof startState>>();
export function loadWorldHome(owner: number, session: number) {
  const key = `${owner}.${session}`;
  let request = pending.get(key);
  if (!request) {
    request = startState(); pending.set(key, request);
    void request.finally(() => { if (pending.get(key) === request) pending.delete(key); }).catch(() => {});
  }
  return request;
}
