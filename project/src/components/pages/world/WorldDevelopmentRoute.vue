<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { NProgress } from 'naive-ui';
import type { DevelopmentState } from '@/services/api/worldMvp';
const props = defineProps<{ route: DevelopmentState }>();
const emit = defineEmits<{ navigate: [] }>();
const expanded = ref<string | null>(props.route.nextStage ?? props.route.stages[0]?.code ?? null);
watch(() => props.route.nextStage, (next, previous) => { if (expanded.value === previous && next) expanded.value = next; });
const percentage = computed(() => Math.floor(props.route.completed * 100 / props.route.total));
</script>
<template lang="pug">
.development-route
  .development-heading
    strong От стоянки до буровой
    span {{ route.completed }} / {{ route.total }}
  n-progress(type="line" :percentage="percentage" :show-indicator="false")
  p.development-note Развивайтесь на стартовую помощь и игровой заработок. Внешние пополнения не нужны. Этапы не сгорают; дорогие постройки можно отложить, сохранив прогресс.
  section.development-stage(v-for="(stage, index) in route.stages" :key="stage.code" :class="{ current: stage.code === route.nextStage }")
    button.development-stage-toggle(type="button" :aria-expanded="expanded === stage.code" :aria-controls="`development-${stage.code}`" @click="expanded = expanded === stage.code ? null : stage.code")
      font-awesome-icon(:icon="stage.completed ? 'check' : 'flag'" aria-hidden="true")
      strong {{ index + 1 }}. {{ stage.title }}
      span {{ stage.steps.filter(step => step.completed).length }} / {{ stage.steps.length }}
      font-awesome-icon(:icon="expanded === stage.code ? 'arrow-up' : 'arrow-down'" aria-hidden="true")
    .development-stage-body(v-if="expanded === stage.code" :id="`development-${stage.code}`")
      p.development-note {{ stage.description }}
      ol.development-steps
        li(v-for="step in stage.steps" :key="step.code" :class="{ complete: step.completed }")
          font-awesome-icon(:icon="step.completed ? 'check' : 'circle'" aria-hidden="true")
          span {{ step.title }}
          router-link(v-if="!step.completed && step.href" :to="step.href" :aria-label="step.title" @click="emit('navigate')")
            font-awesome-icon(icon="arrow-right" aria-hidden="true")
</template>
<style scoped>
.development-route { display: grid; gap: .75rem; min-width: 0; }
.development-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.development-heading > span, .development-stage-toggle > span { white-space: nowrap; font-variant-numeric: tabular-nums; color: var(--text-muted); font-size: .8rem; }
.development-note { margin: 0; color: var(--text-muted); font-size: .82rem; line-height: 1.6; }
.development-stage { border: 1px solid var(--border); border-radius: .65rem; overflow: hidden; background: var(--bg-base); }
.development-stage.current { border-color: var(--primary); }
.development-stage-toggle { display: flex; align-items: center; gap: .65rem; width: 100%; padding: .9rem; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; font: inherit; }
.development-stage-toggle strong { flex: 1; min-width: 0; font-size: .88rem; }
.development-stage-toggle > svg { flex-shrink: 0; color: var(--primary); }
.development-stage-toggle:focus-visible, .development-steps a:focus-visible { outline: 2px solid var(--primary); outline-offset: -3px; }
.development-stage-body { display: grid; gap: .8rem; padding: 0 .9rem .9rem; }
.development-steps { display: grid; gap: .35rem; margin: 0; padding: 0; list-style: none; }
.development-steps li { display: flex; align-items: center; gap: .6rem; min-height: 2.75rem; font-size: .85rem; }
.development-steps li > span { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.development-steps li > svg { flex-shrink: 0; width: 1rem; color: var(--text-muted); }
.development-steps li.complete > svg { color: var(--success, #36ad6a); }
.development-steps a { display: grid; place-items: center; flex: 0 0 2.75rem; height: 2.75rem; border-radius: .4rem; background: var(--primary-soft); color: var(--primary); }
</style>
