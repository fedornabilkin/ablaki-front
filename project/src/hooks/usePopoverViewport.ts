import { watch, type Ref } from 'vue';

/** Keep teleported popovers inside the visible viewport, including an open keyboard. */
export function usePopoverViewport(content: Ref<HTMLElement | null>) {
  watch(content, (element, _, onCleanup) => {
    const popover = element?.closest?.<HTMLElement>('.app-popover');
    if (!popover) return;
    let frame = 0;
    let follower: HTMLElement | null = null;
    popover.style.translate = '';
    const viewport = window.visualViewport;
    function fit() {
      frame = 0;
      if (!popover?.isConnected) return;
      // The follower may be attached after the slot's first render.
      if (follower !== popover.parentElement) {
        if (follower) follower.style.translate = '';
        position.disconnect(); follower = popover.parentElement;
        if (follower) follower.style.translate = '';
        if (follower) position.observe(follower, { attributes: true, attributeFilter: ['style'] });
      }
      const left = viewport?.offsetLeft ?? 0, top = viewport?.offsetTop ?? 0;
      const width = Math.min(viewport?.width ?? innerWidth, document.documentElement.clientWidth);
      const height = viewport?.height ?? innerHeight;
      popover.style.maxWidth = `min(32rem, ${Math.max(0, width - 32)}px)`;
      popover.style.maxHeight = `min(36rem, ${Math.max(0, height - 32)}px)`;
      const rect = popover.getBoundingClientRect();
      const [appliedX = 0, appliedY = 0] = (follower?.style.translate ?? '').split(' ').map(value => parseFloat(value) || 0);
      const originX = rect.left - appliedX, originY = rect.top - appliedY;
      const x = Math.max(left + 16, Math.min(originX, left + width - 16 - rect.width)) - originX;
      const y = Math.max(top + 16, Math.min(originY, top + height - 16 - rect.height)) - originY;
      // Move the follower too: an off-screen wrapper would widen the whole page.
      const translation = `${x}px ${y}px`;
      if (follower && follower.style.translate !== translation) follower.style.translate = translation;
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(fit); }
    const resize = new ResizeObserver(schedule);
    resize.observe(popover);
    const position = new MutationObserver(schedule);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, { capture: true, passive: true });
    viewport?.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    popover.addEventListener('transitionend', schedule);
    schedule();
    onCleanup(() => {
      resize.disconnect(); position.disconnect(); cancelAnimationFrame(frame);
      popover.style.translate = '';
      if (follower) follower.style.translate = '';
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, { capture: true });
      viewport?.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
      popover.removeEventListener('transitionend', schedule);
    });
  }, { flush: 'post' });
}
