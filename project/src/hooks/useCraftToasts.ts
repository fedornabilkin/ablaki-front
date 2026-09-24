import { onScopeDispose, watch, type Ref } from 'vue';
import { type MessageReactive } from 'naive-ui';
import { useToasts } from './useToasts';

export function useCraftToasts(notice: Ref<string>, session: Ref<number>) {
  const messages = useToasts();
  const active = new Set<MessageReactive>();
  const clear = () => { active.forEach(message => message.destroy()); active.clear(); };
  watch(notice, text => {
    if (!text) return;
    const duration = 5000;
    const message = messages.success(text, {
      duration, closable: true, keepAliveOnHover: false,
      onAfterLeave: () => active.delete(message),
    });
    active.add(message);
    notice.value = '';
  });
  watch(session, clear);
  onScopeDispose(clear);
}
