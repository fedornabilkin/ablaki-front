<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { NAlert, NButton, NSpin } from 'naive-ui';
import { loadKitchen } from '@/services/api/worldKitchen';
import { useSimpleWorldCommand } from '@/hooks/useSimpleWorldCommand';
import { useServerClock } from '@/hooks/useServerClock';
import { worldError } from '@/services/api/world';
import { worldActionButtonTheme } from '@/entities/world/theme';
import WorldCountdown from './WorldCountdown.vue';
import WorldHelpHint from './WorldHelpHint.vue';
const props = defineProps<{ nodeId: number; owner: number; session: number; writable: boolean }>();
const emit = defineEmits<{ changed: [] }>();
const state = ref<Awaited<ReturnType<typeof loadKitchen>> | null>(null), error = ref(''), notice = ref(''), loading = ref(false);
const runner = useSimpleWorldCommand(computed(() => `${props.owner}.kitchen`), computed(() => props.session));
const now = useServerClock(computed(() => state.value?.serverTime));
const open = computed(() => state.value?.current && now.value < state.value.current.endsAt && !state.value.used);
let generation = 0, nextWindowCheck = 0;
async function load() {
  const current = ++generation; loading.value = true; error.value = '';
  try { const result = await loadKitchen(props.nodeId); if (current === generation) state.value = result; }
  catch (cause) { if (current === generation) error.value = worldError(cause); }
  finally { if (current === generation) loading.value = false; }
}
async function eat(code?: string) {
  if (!state.value) return; const current = generation;
  const result = code ? await runner.submit('economy/food', { code, health_revision: state.value.health.revision, kitchen_node_id: props.nodeId }) : await runner.retry();
  if (result && current === generation) { notice.value = 'Приём пищи завершён. Порция списана из рюкзака.'; emit('changed'); void load(); }
}
watch(() => [props.nodeId, props.session, props.owner], () => { state.value = null; notice.value = ''; nextWindowCheck = 0; void load(); }, { immediate: true });
watch(now, () => { if (now.value >= nextWindowCheck && !loading.value && state.value && ((state.value.current && now.value >= state.value.current.endsAt) || (!state.value.current && state.value.next && now.value >= state.value.next.startsAt))) { nextWindowCheck = now.value + 10; void load(); } });
onScopeDispose(() => { generation++; });
</script>
<template lang="pug">
section.kitchen-panel(aria-label="Полевая кухня")
  .kitchen-heading
    h3 Полевая кухня
    world-help-hint(label="Расписание питания")
      p Завтрак 06:00–10:00 · обед 12:00–16:00 · ужин 18:00–22:00, время Москвы.
      p Один приём пищи в каждом окне на всех кухнях мира. Выберите готовую порцию из рюкзака; здесь она восстанавливает больше здоровья. Ограничение повторов еды из рюкзака не применяется, пищевое расстройство и ночная болезнь сохраняются до выздоровления.
  n-alert(v-if="error || runner.error.value" type="error") {{ error || runner.error.value }}
  n-button(v-if="error" :disabled="loading" @click="load") Повторить загрузку кухни
  n-spin(v-if="loading && !state" size="small")
  template(v-if="state")
    strong {{ state.current ? `${state.current.name}${state.used ? ' уже использован' : ''}` : 'Сейчас перерыв' }}
    p Здоровье: {{ state.health.hp }} / {{ state.health.maximum }}
    p(v-if="!open && state.next") {{ state.next.name }} через #[world-countdown(:until="state.next.startsAt" :server-time="state.serverTime")]
    .kitchen-menu
      article(v-for="food in state.health.foods" :key="food.code")
        strong {{ food.name }}
        span +{{ food.kitchenRestore }} HP · порций {{ food.quantity }}
        n-button(:theme-overrides="worldActionButtonTheme" type="primary" :loading="runner.busy.value" :disabled="!writable || !open || !food.quantity || runner.busy.value || !!runner.pending.value || loading" @click="eat(food.code)") Поесть
    n-button(v-if="runner.pending.value" :disabled="runner.busy.value" @click="eat()") Проверить результат
    p(v-if="notice" role="status") {{ notice }}
</template>
<style scoped>
.kitchen-panel { display: grid; gap: .8rem; padding: 1rem; border: 1px solid var(--border); border-radius: .7rem; background: var(--bg-surface); }.kitchen-heading { display: flex; align-items: center; justify-content: space-between; }.kitchen-panel h3, .kitchen-panel p { margin: 0; }.kitchen-menu { display: grid; grid-template-columns: repeat(auto-fit,minmax(12rem,1fr)); gap: .75rem; }.kitchen-menu article { display: grid; gap: .6rem; padding: .8rem; border: 1px solid var(--border); border-radius: .6rem; }.kitchen-menu span { color: var(--text-muted); font-size: .85rem; }
</style>
