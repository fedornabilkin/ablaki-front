import { startState } from './simpleWorld';

// Compatibility facade. Pending reads and session boundaries belong to the common transport.
export function loadWorldHome(_owner: number, _session: number) { return startState(); }
