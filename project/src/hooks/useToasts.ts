import { h } from 'vue';
import { useMessage } from 'naive-ui';
import ToastContent from '@/components/ToastContent.vue';

/** The indicator and Naive UI lifetime share one duration; hover does not extend either. */
export function useToasts(): ReturnType<typeof useMessage> {
  const api = useMessage();
  const wrapped = {...api};
  for (const method of ['create', 'info', 'success', 'warning', 'error', 'loading'] as const) {
    wrapped[method] = (content, options = {}) => {
      const type = method === 'create' ? options.type || 'default' : method;
      const duration = options.duration ?? (type === 'loading' ? 0 : 5000);
      return api[method](() => h(ToastContent, {type, duration}, {default: () => typeof content === 'function' ? content() : content}), {...options, duration, keepAliveOnHover: false});
    };
  }
  return wrapped;
}
