import { describe, expect, it } from 'vitest';
import { activeNavigation } from '@/config/navigation';

describe('main navigation sections', () => {
  it('highlights the section throughout nested pages', () => {
    for (const path of ['/world', '/world/nodes/83', '/world/workspace/83', '/world/storage/137']) expect(activeNavigation(path)).toBe('/world');
    expect(activeNavigation('/games/five/123')).toBe('/games');
    expect(activeNavigation('/forum/read/64')).toBe('/forum');
  });
  it('prefers referrals to the broader users section and respects path boundaries', () => {
    expect(activeNavigation('/users/referrals')).toBe('/users/referrals');
    expect(activeNavigation('/users/view/1')).toBe('/users');
    expect(activeNavigation('/worldwide')).toBeUndefined();
    expect(activeNavigation('/')).toBeUndefined();
  });
});
