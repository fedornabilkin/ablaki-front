<script setup lang="ts">
import { computed } from 'vue';
import AppPopover from '@/components/AppPopover.vue';
import { milestoneLabels, type MvpState } from '@/services/api/worldMvp';
const props = defineProps<{ state: MvpState | null; loading: boolean; error: string }>();
const next = computed(() => {
  const step = props.state?.development?.stages.flatMap(stage => stage.steps).find(step => !step.completed);
  if (step) return step;
  const legacy = props.state?.goals.filter(goal => !goal.claimed).flatMap(goal => goal.steps).find(step => !step.completed);
  return legacy ? { ...legacy, title: milestoneLabels[legacy.code] ?? legacy.code } : null;
});
</script>
<template lang="pug">
app-popover(trigger="click" placement="bottom-end")
  template(#trigger)
    button.next-goal-button(type="button" aria-label="Ближайшая цель" title="Ближайшая цель")
      font-awesome-icon(icon="flag" aria-hidden="true")
  .next-goal
    strong Ближайшая цель
    p(v-if="loading && !state") Загружаем задания…
    p(v-else-if="error") {{ error }}
    template(v-else-if="next")
      p {{ next.title }}
      span.next-goal-progress {{ next.quantity }} / {{ next.required }}
      router-link(v-if="next.href" :to="next.href") Перейти к цели →
    p(v-else-if="state") Все доступные этапы выполнены.
    p(v-else) Цели появятся после входа в мир.
</template>
<style scoped>
.next-goal-button { display: inline-grid; place-items: center; width: 2.75rem; height: 2.75rem; padding: 0; border: 1px solid var(--border); border-radius: .5rem; color: var(--primary); background: var(--bg-surface); cursor: pointer; }
.next-goal-button:hover { background: var(--primary-soft); }
.next-goal-button:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.next-goal { display: grid; gap: .6rem; max-width: 18rem; font-size: .875rem; }.next-goal p { margin: 0; }.next-goal-progress { color: var(--text-muted); }
</style>
