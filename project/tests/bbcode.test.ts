import { describe, it, expect } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import BBCode from '../src/components/BBCode.vue';
import { parseBBCode, safeBBUrl, bbColor, decodeLegacyText } from '../src/services/bbcode';
import { dailyRewardDefinitions, parseDailyAvailability } from '../src/services/api/community';
describe('legacy forum text', () => {
  it('renders nested formatting, lists, links, images and quotes', async () => {
    const html = await renderToString(createSSRApp({ render: () => h(BBCode, { text: '[quote="Автор"][b]Текст [i]курсив[/i][/b][/quote][list=1][*]один[*]два[/list][url=https://example.org]ссылка[/url][img]/image.png[/img]' }) }));
    expect(html).toContain('<strong>Текст <em>курсив</em></strong>');
    expect(html).toContain('<cite>Автор</cite>');
    expect(html).toContain('<ol><li>один</li><li>два</li></ol>');
    expect(html).toContain('href="https://example.org/"');
    expect(html).toContain('src="/image.png"');
  });
  it('never turns stored HTML, URL schemes or tag attributes into executable markup', async () => {
    const html = await renderToString(createSSRApp({ render: () => h(BBCode, { text: '&lt;script&gt;alert(1)&lt;/script&gt;[url=javascript:alert(1)]click[/url][img]data:image/svg+xml,evil[/img][span onclick="alert(1)"]safe[/span][color=red;position:fixed]color[/color]' }) }));
    expect(html).not.toContain('<script');
    expect(html).not.toContain('href=');
    expect(html).not.toContain('onclick=');
    expect(html).not.toContain('position:fixed');
    expect(html).toContain('&lt;script&gt;');
  });
  it('bounds malformed nesting and retains unknown text', () => {
    expect(parseBBCode('[unknown]hello[/unknown]')[0].text).toBe('[unknown]');
    expect(() => parseBBCode('[b]'.repeat(20000) + 'end')).not.toThrow();
    expect(decodeLegacyText('&amp;lt;')).toBe('&lt;');
    for (const url of ['javascript:alert(1)', '//evil.com', '/\\evil.com', 'data:image/png,x', 'https://a:b@host/', 'https://host/\nfoo']) expect(safeBBUrl(url)).toBeUndefined();
    expect(bbColor('red;display:none')).toBeUndefined();
  });
});
describe('daily reward selection', () => {
  it('selects one known reward from the available list and ignores future unsupported kinds', () => {
    const value = parseDailyAvailability({ items: [{ id: 'future' }, { id: 'rating' }], refresh_at: 2000000000 });
    expect(dailyRewardDefinitions.find(reward => value.items.some(item => item.id === reward.id))?.id).toBe('rating');
    expect(dailyRewardDefinitions.find(reward => [].includes(reward as never))).toBeUndefined();
  });
  it('rejects malformed availability', () => {
    for (const value of [null, {}, { items: [null], refresh_at: 1 }, { items: [], refresh_at: '1' }]) expect(() => parseDailyAvailability(value)).toThrow();
  });
});
