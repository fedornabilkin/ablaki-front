import { h, onScopeDispose, watch, type Ref } from 'vue';
import { useMessage, type MessageReactive } from 'naive-ui';
import CraftToastContent from '@/components/pages/craft/CraftToastContent.vue';

export function useCraftToasts(notice: Ref<string>, session: Ref<number>) {
  const messages = useMessage();
  const active = new Set<MessageReactive>();
  const clear = () => { active.forEach(message => message.destroy()); active.clear(); };
  watch(notice, text => {
    if (!text) return;
    const duration = 5000;
    const message = messages.success(() => h(CraftToastContent, {text, duration}), {
      duration, closable: true, keepAliveOnHover: false,
      onAfterLeave: () => active.delete(message),
    });
    active.add(message);
    notice.value = '';
  });
  watch(session, clear);
  onScopeDispose(clear);
}
