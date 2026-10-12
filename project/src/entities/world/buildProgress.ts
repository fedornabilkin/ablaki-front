import type { Build } from '@/services/api/simpleWorld';
/** Same 60-second disconnect window as BuildClock; never completes a build locally. */
export function projectedBuildSeconds(build: Build, elapsed: number): number {
  if (build.status !== 'building') return build.worked_seconds;
  const now = (build.server_time ?? 0) + Math.max(0, elapsed);
  const pending = (build.live_work ?? []).reduce((sum, work) => sum + Math.max(0, Math.min(now, work.last_seen_at + 60) - work.accounted_at), 0);
  return Math.min(build.required_seconds, build.worked_seconds + pending);
}
