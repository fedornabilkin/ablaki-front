import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record } from './world';

export function parseProgression(value: unknown) {
  const row = record(value);
  const parse = (value: unknown) => {
    if (!Array.isArray(value) || value.length > 200) throw new Error('invalid-world-response');
    return value.map(value => {
      const track = record(value);
      if (typeof track.name !== 'string' || track.name.length > 120) throw new Error('invalid-world-response');
      return { name: track.name, level: integer(track.level, 1, 2147483647), xp: integer(track.xp) };
    });
  };
  let extractionWork;
  if (row.extraction_work !== undefined && row.extraction_work !== null) {
    const work = record(row.extraction_work);
    if (typeof work.name !== 'string' || work.name.length > 120) throw new Error('invalid-world-response');
    extractionWork = {nodeId: integer(work.node_id, 1, 2147483647), name: work.name, lastSeenAt: integer(work.last_seen_at)};
  }
  return { craft: parse(row.craft), professions: parse(row.professions), ...(extractionWork ? {extractionWork} : {}) };
}
export async function loadProgression() { return parseProgression((await apiClient.get(config.makeApiUrl('v1/world/economy/progression'))).data); }
