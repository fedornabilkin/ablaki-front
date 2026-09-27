import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record } from './world';
const invalid = (): never => { throw new Error('invalid-night-response'); };
const id = (value: unknown) => integer(value, 1, 2147483647);
const bool = (value: unknown): boolean => typeof value === 'boolean' ? value : invalid();
const timeOrNull = (value: unknown) => value === null ? null : integer(value);
function night(value: unknown) {
  const r = record(value), started_at = integer(r.started_at), ended_at = integer(r.ended_at);
  if (ended_at <= started_at) invalid();
  return { sequence: integer(r.sequence), started_at, ended_at };
}
function policy(value: unknown) {
  const r = record(value), day_seconds = integer(r.day_seconds, 3600, 604800), night_offset = integer(r.night_offset, 0, day_seconds - 1), night_seconds = integer(r.night_seconds, 60, day_seconds - 1);
  if (night_offset + night_seconds > day_seconds) invalid();
  const mild_efficiency_bps = integer(r.mild_efficiency_bps, 1, 9999);
  return { id: id(r.id), version: integer(r.version, 1), activated_at: integer(r.activated_at), day_seconds, night_offset, night_seconds,
    max_severity: integer(r.max_severity, 2, 10), recovery_nights: integer(r.recovery_nights, 1, 30), mild_efficiency_bps, severe_efficiency_bps: integer(r.severe_efficiency_bps, 1, mild_efficiency_bps) };
}
export async function loadNights(node: number, page: number, outcome: string) {
  id(node); integer(page, 1, 1000000); if (!['', 'protected', 'unprotected'].includes(outcome)) invalid();
  const r = record((await apiClient.get(config.makeApiUrl(`v1/world/nodes/${node}/nights`), { params: { page, outcome } })).data);
  if (id(r.node_id) !== node) invalid();
  const enabled = bool(r.enabled), rules = r.policy === null ? null : policy(r.policy), server_time = integer(r.server_time);
  const grace_until = timeOrNull(r.grace_until), first = r.first_eligible_night === null ? null : night(r.first_eligible_night), upcoming = r.current_or_next_night === null ? null : night(r.current_or_next_night);
  const protection_forecast = r.protection_forecast === null ? null : bool(r.protection_forecast);
  const enrollment_pending = bool(r.enrollment_pending), catching_up = bool(r.catching_up), processing_available = bool(r.processing_available);
  if (enabled !== Boolean(rules) || (enabled && (grace_until === null || !first || !upcoming || protection_forecast === null))) invalid();
  if (rules && first && upcoming && grace_until !== null) {
    if (grace_until < rules.activated_at + rules.day_seconds || first.started_at < grace_until || upcoming.ended_at <= server_time) invalid();
    for (const interval of [first, upcoming]) if (interval.started_at !== rules.activated_at + interval.sequence * rules.day_seconds + rules.night_offset || interval.ended_at - interval.started_at !== rules.night_seconds) invalid();
  }
  let health = null;
  if (r.health !== null) {
    if (!rules || enrollment_pending) invalid();
    const h = record(r.health), severity = integer(h.severity, 0, rules!.max_severity), onset_at = timeOrNull(h.onset_at), processed_until = timeOrNull(h.processed_until);
    const recovery_progress = integer(h.recovery_progress, 0, rules!.recovery_nights - 1);
    if ((severity === 0 && (onset_at !== null || recovery_progress !== 0)) || (severity > 0 && onset_at === null) || (processed_until !== null && processed_until > server_time)) invalid();
    // The immediate craft routes currently retain their existing rewards and costs.
    if (h.work_penalty_applied !== false) invalid();
    health = { severity, onset_at, processed_until, recovery_progress, exposure_nights: integer(h.exposure_nights), next_sequence: integer(h.next_sequence), revision: integer(h.revision, 1), work_efficiency_bps: integer(h.work_efficiency_bps, 1, 10000) };
  }
  const history = record(r.history), meta = record(history._meta);
  if (!Array.isArray(history.items) || history.items.length > 20) invalid();
  const items = (history.items as unknown[]).map(value => {
    const row = record(value), interval = night(row);
    if (!rules || typeof row.outcome !== 'string' || !['protected', 'unprotected'].includes(row.outcome) || (outcome && row.outcome !== outcome) || interval.ended_at > server_time) invalid();
    return { ...interval, id: id(row.id), outcome: row.outcome as 'protected' | 'unprotected', severity_before: integer(row.severity_before, 0, rules!.max_severity), severity_after: integer(row.severity_after, 0, rules!.max_severity), recovery_progress: integer(row.recovery_progress, 0, rules!.recovery_nights - 1), resolved_at: integer(row.resolved_at) };
  });
  const total = integer(meta.totalCount), pageSize = integer(meta.perPage, 20, 20), currentPage = integer(meta.currentPage, 1, 1000000);
  if (currentPage !== page || integer(meta.pageCount) !== Math.ceil(total / pageSize) || items.length > total || new Set(items.map(item => item.id)).size !== items.length) invalid();
  if (!enabled && (health || grace_until !== null || first || upcoming || protection_forecast !== null || enrollment_pending || catching_up || processing_available || total > 0)) invalid();
  return { enabled, policy: rules, grace_until, first_eligible_night: first, current_or_next_night: upcoming, protection_forecast, health, enrollment_pending, catching_up, processing_available,
    history: { items, total, pageSize, currentPage }, server_time };
}
