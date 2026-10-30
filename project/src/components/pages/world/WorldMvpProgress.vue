<script setup lang="ts">
import AppDialog from '@/components/AppDialog.vue';
import WorldCredits from '@/components/pages/world/WorldCredits.vue';
import { computed, onScopeDispose, ref, watch } from 'vue';
import { NAlert, NButton, NModal, NProgress, NSpin, NTabs, NTabPane } from 'naive-ui';
import { worldActionButtonTheme, worldModalTheme } from '@/entities/world/theme';
import { useSimpleWorldCommand } from '@/hooks/useSimpleWorldCommand';
import { loadMvp, milestoneLabels, type MvpState } from '@/services/api/worldMvp';
import { isClosedTestError, worldError } from '@/services/api/world';
import { formatCredits } from '@/entities/world/credits';
import WorldCountdown from './WorldCountdown.vue';
import WorldQuotaNotice from './WorldQuotaNotice.vue';
const props = defineProps<{ owner: number; session: number; revision: number; writable: boolean }>();
const emit = defineEmits<{ changed: []; snapshot: [value: { state: MvpState | null; loading: boolean; error: string }] }>();
const state = ref<MvpState | null>(null), error = ref(''), closedTest = ref(false), loading = ref(false);
const show = ref(false), tab = ref('camp');
watch([state, loading, error], () => emit('snapshot', { state: state.value, loading: loading.value, error: error.value }), { flush: 'sync' });
const activeGoal = computed(() => state.value?.goals.find(goal => goal.code === (tab.value === 'resources' ? 'day-2' : 'day-1')));
const orderedSteps = computed(() => [...(activeGoal.value?.steps ?? [])].sort((a, b) => Number(a.completed) - Number(b.completed)));
const remainingTasks = computed(() => state.value?.goals.reduce((total, goal) => total + (goal.claimed ? 0 : goal.steps.filter(step => !step.completed).length), 0) ?? null);
const runner = useSimpleWorldCommand(computed(() => `${props.owner}.mvp`), computed(() => props.session));
let generation = 0;
let refreshQueued = false, disposed = false;
function refresh() {
  if (refreshQueued) return;
  refreshQueued = true;
  queueMicrotask(() => { refreshQueued = false; if (!disposed && props.owner) void load(); });
}
async function load() {
  const current = ++generation; loading.value = true; error.value = ''; closedTest.value = false;
  try { const result = await loadMvp(); if (current === generation) { state.value = result; error.value = ''; } }
  catch (cause) { if (current === generation) { error.value = worldError(cause); closedTest.value = isClosedTestError(cause); } }
  finally { if (current === generation) loading.value = false; }
}
async function act(path?: string, body: Record<string, unknown> = {}) {
  const current = generation;
  const result = path ? await runner.submit(path, body) : await runner.retry();
  if (result && current === generation) { emit('changed'); refresh(); }
}
const busy = computed(() => !props.writable || runner.busy.value || !!runner.pending.value);
const titles: Record<string, string> = { 'day-1': 'Первый лагерь', 'day-2': 'Ресурсы и первый металл' };
const quotaLabels: Record<string, string> = { crafting_hourly: 'Изготовление за час', extraction_daily: 'Добыча сегодня', sales_daily: 'Продажи сегодня' };
watch(() => [props.owner, props.session], () => { generation++; state.value = null; error.value = ''; show.value = false; if (props.owner) void load(); }, {immediate: true});
watch(show, value => { if (value && !state.value && !error.value && !loading.value) void load(); });
watch(() => props.revision, refresh);
onScopeDispose(() => { disposed = true; generation++; });
</script>
<template lang="pug">
span.mvp-tasks-trigger
  n-button.mvp-tasks-button(:theme-overrides="worldActionButtonTheme" size="small" title="Задания" aria-label="Задания" @click="show = true")
    template(#icon)
      font-awesome-icon(icon="list-check" aria-hidden="true")
  span.tasks-badge(v-if="remainingTasks !== null && remainingTasks > 0" :aria-label="`Осталось заданий: ${remainingTasks}`") {{ remainingTasks }}
app-dialog(icon="list-check" v-model:show="show" title="Мой путь в мире" :style="{ width: 'min(50rem, calc(100vw - 1.5rem))' }")
 .mvp-progress(:aria-busy="loading")
  n-alert(closable v-if="error || runner.error.value" type="error") {{ error || runner.error.value }}
  router-link.mvp-action(v-if="closedTest && !state" to="/forum" @click="show = false") Сообщить на форуме о желании участвовать в тестировании
  n-button(v-if="error" :loading="loading" :disabled="loading" @click="load") Повторить загрузку
  n-spin(v-if="loading && !state" size="small")
  n-button(v-if="runner.pending.value" :loading="runner.busy.value" @click="act()") Проверить результат запроса
  n-tabs(v-if="state?.enabled" v-model:value="tab" type="segment" animated)
    n-tab-pane(name="camp" tab="Лагерь")
    n-tab-pane(name="resources" tab="Ресурсы")
    n-tab-pane(name="quotas" tab="Лимиты")
    n-tab-pane(name="health" tab="Здоровье")
  template(v-if="state?.enabled")
    template(v-if="activeGoal && (tab === 'camp' || tab === 'resources')")
      .journey-heading
        div
          span.journey-eyebrow {{ activeGoal.claimed ? 'Цель выполнена' : 'Следующий этап' }}
          h3 {{ titles[activeGoal.code] }}
        strong {{ activeGoal.steps.filter(step => step.completed).length }} / {{ activeGoal.steps.length }}
      n-progress(type="line" :percentage="Math.floor(activeGoal.steps.filter(step => step.completed).length * 100 / Math.max(1, activeGoal.steps.length))" :show-indicator="false")
      p.journey-note(v-if="tab === 'resources' && state.secondMilestoneDay") Первый металл — ориентир на {{ state.secondMilestoneDay }}-й день. Цели не сгорают при пропуске дня.
      ol.journey-steps
        li.journey-step(v-for="step in orderedSteps" :key="step.code" :class="{ complete: step.completed }")
          .step-icon
            font-awesome-icon(:icon="step.completed ? 'check' : 'flag'" aria-hidden="true")
          .step-body
            strong {{ milestoneLabels[step.code] ?? 'Шаг начального маршрута' }}
            span {{ Math.min(step.quantity, step.required) }} из {{ step.required }}
          router-link.mvp-action(v-if="!step.completed && step.href" :to="step.href" @click="show = false")
            | К действию
            font-awesome-icon(icon="arrow-right" aria-hidden="true")
      .journey-reward
        div
          strong Награда · #[world-credits(:value="activeGoal.credits")]
          p В казну стоянки; после сбора действуют отчисления.
        n-button(v-if="!activeGoal.claimed" :theme-overrides="worldActionButtonTheme" type="primary" :disabled="busy || !activeGoal.canClaim" :loading="runner.busy.value" @click="act('economy/goals/claim', { code: activeGoal.code })") {{ !activeGoal.funded && activeGoal.steps.every(step => step.completed) ? 'Ожидает резерва' : 'Получить' }}
        font-awesome-icon(v-else icon="check" title="Награда получена")
      n-alert(closable v-if="!activeGoal.funded && !activeGoal.claimed" type="info") Награда ожидает резерва из бюджета родительского поселения. Средства на неё выделяет владелец бюджета.
      .mvp-links
        router-link.mvp-action(to="/world/workspace/inventory" @click="show = false") Инвентарь
        router-link.mvp-action(to="/world/workspace/recipes" @click="show = false") Рецепты
      p.journey-note(v-if="tab === 'camp' && state.targetStartCredits") Стартовые #[world-credits(:value="state.targetStartCredits")] переводятся из стартового резерва поселения в бюджет первой стоянки. Если средств не хватает, обязательство ждёт пополнения резерва в очереди. Получать отдельный перевод или повторно вступать не нужно.
    .journey-quotas(v-else-if="tab === 'quotas'")
      article.quota-card(v-for="quota in state.quotas" :key="quota.kind")
        world-quota-notice(:quota="quota" :server-time="state.serverTime")
        p(v-if="quota.grossRemaining !== null") Остаток выручки: #[world-credits(:value="quota.grossRemaining")]
      router-link.mvp-action(to="/world/workspace/history" @click="show = false") История экономики
    template(v-else-if="tab === 'health'")
      .journey-heading
        h3 Здоровье
        strong {{ state.health.hp }} / {{ state.health.maximum }}
      n-progress(type="line" :percentage="100 * state.health.hp / state.health.maximum" :show-indicator="false")
      p.journey-note Из рюкзака можно есть в любом месте, до 8 HP за порцию. У каждого блюда свой лимит повторов и время восстановления. Лишняя порция вызывает пищевое расстройство (−4 HP), поэтому чередуйте блюда. В полевой кухне еда полезнее: завтрак 06–10, обед 12–16, ужин 18–22, время Москвы. После трёх суток без еды теряется 2 HP в сутки. Ночная болезнь проходит после защищённых ночей.
      n-alert(closable v-if="state.health.disorderUntil" type="warning") Пищевое расстройство. Восстановление через #[world-countdown(:until="state.health.disorderUntil" :server-time="state.serverTime")]. Пока можно поесть в полевой кухне.
      .mvp-foods
        article.food-card(v-for="food in state.health.foods" :key="food.code")
          font-awesome-icon(icon="utensils" aria-hidden="true")
          strong {{ food.name }}
          span +{{ food.restore }} здоровья · в наличии {{ food.quantity }}
          span(v-if="food.repeatLimit !== null") Повторов осталось {{ food.repeatRemaining }} / {{ food.repeatLimit }} за {{ (food.repeatSeconds ?? 0) / 3600 }} ч
          span(v-if="food.restoresAt") Новая порция через #[world-countdown(:until="food.restoresAt" :server-time="state.serverTime")]
          n-button(:theme-overrides="worldActionButtonTheme" type="primary" :disabled="busy || !food.canEat || food.quantity === 0" @click="act('economy/food', { code: food.code, health_revision: state.health.revision })") {{ food.repeatRemaining === 0 ? 'Чередуйте блюда' : 'Поесть' }}
    router-link.mvp-action.journey-feedback(:to="state.feedback" @click="show = false")
      font-awesome-icon(icon="comment" aria-hidden="true")
      | Сообщить о проблеме на форуме
</template>
<style scoped>
.mvp-tasks-trigger { position: relative; display: inline-flex; flex-shrink: 0; }
.tasks-badge { position: absolute; z-index: 1; right: -.4rem; top: -.4rem; display: inline-grid; place-items: center; box-sizing: border-box; min-width: 1.2rem; height: 1.2rem; border-radius: 1rem; padding-inline: .2rem; background: var(--primary); color: var(--primary-contrast, #171717); border: 2px solid var(--bg-surface); font-size: .7rem; font-weight: 750; font-variant-numeric: tabular-nums; line-height: 1; pointer-events: none; }
.mvp-progress { display: grid; gap: 1rem; min-width: 0; max-height: 75vh; overflow-y: auto; padding: .15rem; }.mvp-progress h3, .mvp-progress p { margin: 0; }
.journey-heading, .journey-reward { display: flex; align-items: center; justify-content: space-between; gap: .75rem; }.journey-heading h3 { font-size: 1.1rem; }.journey-heading > strong { white-space: nowrap; font-variant-numeric: tabular-nums; color: var(--primary); }.journey-eyebrow { color: var(--text-muted); font-size: .75rem; }
.journey-steps { display: grid; gap: .6rem; margin: 0; padding: 0; list-style: none; }.journey-step { display: flex; align-items: center; gap: .75rem; padding: .85rem; border: 1px solid var(--border); border-radius: .65rem; background: var(--bg-base); }.step-icon { flex: 0 0 2rem; display: grid; place-items: center; height: 2rem; border-radius: 50%; color: var(--primary); background: var(--primary-soft); }.complete .step-icon { color: var(--success, #36ad6a); }.step-body { display: grid; gap: .25rem; flex: 1; min-width: 0; }.step-body span, .journey-note, .journey-reward p { color: var(--text-muted); font-size: .8rem; line-height: 1.5; }
.mvp-action { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; padding: .45rem .7rem; border: 1px solid var(--border); border-radius: .45rem; color: var(--primary); background: var(--primary-soft); font-size: .8rem; text-align: center; }.mvp-action:hover { border-color: var(--primary); }.mvp-action:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.mvp-links { display: flex; flex-wrap: wrap; gap: .5rem; }.journey-reward, .quota-card { padding: 1rem; border: 1px solid var(--border); border-radius: .65rem; background: var(--bg-base); }.journey-quotas, .quota-card { display: grid; gap: .75rem; }.mvp-foods { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: .75rem; }.food-card { display: grid; gap: .6rem; padding: 1rem; border: 1px solid var(--border); border-radius: .65rem; }.food-card > svg { color: var(--primary); }.food-card span { font-size: .8rem; color: var(--text-muted); }.journey-feedback { font-size: .8rem; color: var(--text-muted); text-align: center; }
@media(max-width: 500px) { .journey-step { flex-wrap: wrap; }.journey-step .mvp-action { margin-left: 2.75rem; }.journey-reward { flex-wrap: wrap; } }
</style>
