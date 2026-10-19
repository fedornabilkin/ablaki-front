export interface WorkProgressSnapshot {
  worked_seconds: number;
  required_seconds: number;
  server_time: number;
  working: boolean;
  live_work: { accounted_at: number; last_seen_at: number }[];
}
/** Projection only. Completion and rewards are always confirmed by the server. */
export function projectedWorkSeconds(work: WorkProgressSnapshot, elapsed: number): number {
  if (!work.working) return Math.min(work.required_seconds, work.worked_seconds);
  const now = work.server_time + Math.max(0, elapsed);
  const pending = work.live_work.reduce((sum, worker) => sum + Math.max(0, Math.min(now, worker.last_seen_at + 60) - worker.accounted_at), 0);
  return Math.min(work.required_seconds, work.worked_seconds + pending);
}
