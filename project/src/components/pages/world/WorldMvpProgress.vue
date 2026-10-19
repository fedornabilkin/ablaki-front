<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { NAlert, NButton, NModal, NProgress, NSpin, NTabs, NTabPane } from 'naive-ui';
import { worldActionButtonTheme, worldModalTheme } from '@/entities/world/theme';
import { useSimpleWorldCommand } from '@/hooks/useSimpleWorldCommand';
import { loadMvp, milestoneLabels, type MvpState } from '@/services/api/worldMvp';
import { isClosedTestError, worldError } from '@/services/api/world';
import { formatCredits } from '@/entities/world/credits';
const props = defineProps<{ owner: number; session: number; revision: number; writable: boolean }>();
const emit = defineEmits<{ changed: [] }>();
const state = ref<MvpState | null>(null), error = ref(''), closedTest = ref(false), loading = ref(false);
const show = ref(false), tab = ref('camp');
const activeGoal = computed(() => state.value?.goals.find(goal => goal.code === (tab.value === 'resources' ? 'day-2' : 'day-1')));
const runner = useSimpleWorldCommand(computed(() => `${props.owner}.mvp`), computed(() => props.session));
let generation = 0;
async function load() {
  const current = ++generation; loading.value = true; error.value = ''; closedTest.value = false;
  try { const result = await loadMvp(); if (current === generation) { state.value = result; error.value = ''; } }
  catch (cause) { if (current === generation) { error.value = worldError(cause); closedTest.value = isClosedTestError(cause); } }
  finally { if (current === generation) loading.value = false; }
}
async function act(path?: string, body: Record<string, unknown> = {}) {
  const current = generation;
  const result = path ? await runner.submit(path, body) : await runner.retry();
  if (result && current === generation) { emit('changed'); await load(); }
}
const busy = computed(() => !props.writable || runner.busy.value || !!runner.pending.value);
const titles: Record<string, string> = { 'day-1': 'Первый лагерь', 'day-2': 'Ресурсы и первый металл' };
const quotaLabels: Record<string, string> = { crafting_hourly: 'Изготовление за час', extraction_daily: 'Добыча сегодня', sales_daily: 'Продажи сегодня' };
watch(() => [props.owner, props.session], () => { generation++; state.value = null; error.value = ''; show.value = false; });
watch(show, value => { if (value) void load(); });
watch(() => props.revision, () => { if (show.value) void load(); });
onScopeDispose(() => { generation++; });
</script>
<template lang="pug">
n-button(:theme-overrides="worldActionButtonTheme" secondary size="small" @click="show = true")
  template(#icon)
    font-awesome-icon(icon="list-check" aria-hidden="true")
  | Задания
n-modal(v-model:show="show" :theme-overrides="worldModalTheme" preset="card" title="Мой путь в мире" :style="{ width: 'min(50rem, calc(100vw - 1.5rem))' }")
 .mvp-progress(:aria-busy="loading")
  n-alert(v-if="error || runner.error.value" type="error") {{ error || runner.error.value }}
  router-link.mvp-action(v-if="closedTest && !state" to="/forum/read/80" @click="show = false") Сообщить на форуме о желании участвовать в тестировании
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
        li.journey-step(v-for="step in activeGoal.steps" :key="step.code" :class="{ complete: step.completed }")
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
          strong Награда · {{ formatCredits(activeGoal.credits) }} Cr
          p В казну стоянки; после сбора действуют отчисления.
        n-button(v-if="!activeGoal.claimed" :theme-overrides="worldActionButtonTheme" type="primary" :disabled="busy || !activeGoal.canClaim" :loading="runner.busy.value" @click="act('economy/goals/claim', { code: activeGoal.code })") Получить
        font-awesome-icon(v-else icon="check" title="Награда получена")
      p.journey-note(v-if="!activeGoal.funded && !activeGoal.claimed") Награда ожидает резервирования бюджета поселения.
      .mvp-links
        router-link.mvp-action(to="/world/workspace/inventory" @click="show = false") Инвентарь
        router-link.mvp-action(to="/world/workspace/recipes" @click="show = false") Рецепты
        router-link.mvp-action(v-if="tab === 'camp'" to="/transfer" @click="show = false") Переводы
      p.journey-note(v-if="tab === 'camp' && state.personalCredits !== null") Личный баланс: {{ formatCredits(state.personalCredits) }} Cr. Стартовые кредиты приходят отдельным переводом.
    .journey-quotas(v-else-if="tab === 'quotas'")
      article.quota-card(v-for="quota in state.quotas" :key="quota.kind")
        .journey-heading
          h3 {{ quotaLabels[quota.kind] ?? 'Действия' }}
          strong {{ quota.remaining }} / {{ quota.maximum }}
        n-progress(type="line" :percentage="100 * quota.remaining / Math.max(1, quota.maximum)" :show-indicator="false")
        p.journey-note Восстановление: {{ new Date(quota.restoresAt * 1000).toLocaleString('ru-RU') }}
        p(v-if="quota.grossRemaining !== null") Остаток выручки: {{ formatCredits(quota.grossRemaining) }} Cr
      router-link.mvp-action(to="/world/workspace/history" @click="show = false") История экономики
    template(v-else-if="tab === 'health'")
      .journey-heading
        h3 Здоровье
        strong {{ state.health.hp }} / {{ state.health.maximum }}
      n-progress(type="line" :percentage="100 * state.health.hp / state.health.maximum" :show-indicator="false")
      p.journey-note Еда восстанавливает здоровье. Ночная болезнь проходит после защищённых ночей.
      .mvp-foods
        article.food-card(v-for="food in state.health.foods" :key="food.code")
          font-awesome-icon(icon="utensils" aria-hidden="true")
          strong {{ food.name }}
          span +{{ food.restore }} здоровья · в наличии {{ food.quantity }}
          n-button(:theme-overrides="worldActionButtonTheme" secondary :disabled="busy || state.health.hp === state.health.maximum || food.quantity === 0" @click="act('economy/food', { code: food.code, health_revision: state.health.revision })") Поесть
    router-link.journey-feedback(:to="state.feedback" @click="show = false") Сообщить о проблеме на форуме
</template>
<style scoped>
.mvp-progress { display: grid; gap: 1rem; min-width: 0; max-height: 75vh; overflow-y: auto; padding: .15rem; }.mvp-progress h3, .mvp-progress p { margin: 0; }
.journey-heading, .journey-reward { display: flex; align-items: center; justify-content: space-between; gap: .75rem; }.journey-heading h3 { font-size: 1.1rem; }.journey-heading > strong { white-space: nowrap; font-variant-numeric: tabular-nums; color: var(--primary); }.journey-eyebrow { color: var(--text-muted); font-size: .75rem; }
.journey-steps { display: grid; gap: .6rem; margin: 0; padding: 0; list-style: none; }.journey-step { display: flex; align-items: center; gap: .75rem; padding: .85rem; border: 1px solid var(--border); border-radius: .65rem; background: var(--bg-base); }.step-icon { flex: 0 0 2rem; display: grid; place-items: center; height: 2rem; border-radius: 50%; color: var(--primary); background: var(--primary-soft); }.complete .step-icon { color: var(--success, #36ad6a); }.step-body { display: grid; gap: .25rem; flex: 1; min-width: 0; }.step-body span, .journey-note, .journey-reward p { color: var(--text-muted); font-size: .8rem; line-height: 1.5; }
.mvp-action { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; padding: .45rem .7rem; border: 1px solid var(--border); border-radius: .45rem; color: var(--primary); background: var(--primary-soft); font-size: .8rem; text-align: center; }.mvp-action:hover { border-color: var(--primary); }.mvp-action:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.mvp-links { display: flex; flex-wrap: wrap; gap: .5rem; }.journey-reward, .quota-card { padding: 1rem; border: 1px solid var(--border); border-radius: .65rem; background: var(--bg-base); }.journey-quotas, .quota-card { display: grid; gap: .75rem; }.mvp-foods { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: .75rem; }.food-card { display: grid; gap: .6rem; padding: 1rem; border: 1px solid var(--border); border-radius: .65rem; }.food-card > svg { color: var(--primary); }.food-card span { font-size: .8rem; color: var(--text-muted); }.journey-feedback { font-size: .8rem; color: var(--text-muted); text-align: center; }
@media(max-width: 500px) { .journey-step { flex-wrap: wrap; }.journey-step .mvp-action { margin-left: 2.75rem; }.journey-reward { flex-wrap: wrap; } }
</style>
