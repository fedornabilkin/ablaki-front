import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, shallowRef } from 'vue';
import { usePopoverViewport } from '../src/hooks/usePopoverViewport';

afterEach(() => vi.unstubAllGlobals());

describe('popover viewport', () => {
  it('keeps a wide edge-anchored popover visible after scrolling, resizing and opening the keyboard', async () => {
    const viewport = Object.assign(new EventTarget(), { width: 390, height: 844, offsetLeft: 0, offsetTop: 0 });
    const browser = Object.assign(new EventTarget(), { visualViewport: viewport });
    const documentElement = { clientWidth: 375 };
    const frames = new Map<number, FrameRequestCallback>();
    let sequence = 0;
    const flush = () => { for (const [id, callback] of [...frames]) { frames.delete(id); callback(0); } };
    const disconnect = vi.fn();
    class Observer { observe() {} disconnect = disconnect; }
    vi.stubGlobal('window', browser); vi.stubGlobal('document', { documentElement });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++sequence, callback); return sequence; });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    vi.stubGlobal('ResizeObserver', Observer); vi.stubGlobal('MutationObserver', Observer);
    let anchor = { x: -110, y: 413 };
    const style = { translate: '', maxWidth: '', maxHeight: '' };
    const followerStyle = { translate: '' };
    const popover = Object.assign(new EventTarget(), {
      style, isConnected: true, parentElement: { style: followerStyle },
      getBoundingClientRect: () => {
        const [x = 0, y = 0] = followerStyle.translate.split(' ').map(value => parseFloat(value) || 0);
        const width = Math.min(358, Number(style.maxWidth.match(/, ([\d.]+)px/)?.[1] ?? 358));
        const height = Math.min(415, Number(style.maxHeight.match(/, ([\d.]+)px/)?.[1] ?? 415));
        return { left: anchor.x + x, top: anchor.y + y, right: anchor.x + x + width, bottom: anchor.y + y + height, width, height };
      },
    });
    const content = shallowRef<HTMLElement | null>(null), scope = effectScope();
    scope.run(() => usePopoverViewport(content));
    content.value = { closest: () => popover } as unknown as HTMLElement;
    await nextTick(); flush();
    const expectInside = () => {
      const rect = popover.getBoundingClientRect();
      expect(rect.left).toBeGreaterThanOrEqual(viewport.offsetLeft + 16);
      expect(rect.right).toBeLessThanOrEqual(viewport.offsetLeft + Math.min(viewport.width, documentElement.clientWidth) - 16);
      expect(rect.top).toBeGreaterThanOrEqual(viewport.offsetTop + 16);
      expect(rect.bottom).toBeLessThanOrEqual(viewport.offsetTop + viewport.height - 16);
    };
    expectInside();
    // A library render can reset its follower styles between positioning passes.
    followerStyle.translate = ''; browser.dispatchEvent(new Event('resize')); flush(); expectInside();
    anchor = { x: 290, y: -100 }; browser.dispatchEvent(new Event('scroll')); flush(); expectInside();
    viewport.width = documentElement.clientWidth = 320; browser.dispatchEvent(new Event('resize')); flush(); expectInside();
    viewport.height = 300; viewport.offsetTop = 120; viewport.dispatchEvent(new Event('resize')); flush(); expectInside();
    disconnect.mockClear(); scope.stop(); expect(disconnect).toHaveBeenCalledTimes(2);
    browser.dispatchEvent(new Event('scroll')); expect(frames.size).toBe(0);
  });
});
