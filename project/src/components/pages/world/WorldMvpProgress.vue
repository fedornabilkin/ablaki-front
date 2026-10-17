<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { NAlert, NButton, NCollapse, NCollapseItem, NProgress } from 'naive-ui';
import { useSimpleWorldCommand } from '@/hooks/useSimpleWorldCommand';
import { loadMvp, milestoneLabels, type MvpState } from '@/services/api/worldMvp';
import { worldError } from '@/services/api/world';
import { formatCredits } from '@/entities/world/credits';
const props = defineProps<{ owner: number; session: number; revision: number; writable: boolean }>();
const emit = defineEmits<{ changed: [] }>();
const state = ref<MvpState | null>(null), error = ref(''), loading = ref(false);
const runner = useSimpleWorldCommand(computed(() => `${props.owner}.mvp`), computed(() => props.session));
let generation = 0;
async function load() {
  const current = ++generation; loading.value = true; error.value = '';
  try { const result = await loadMvp(); if (current === generation) { state.value = result; error.value = ''; } }
  catch (cause) { if (current === generation) error.value = worldError(cause); }
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
watch(() => [props.owner, props.session], () => { generation++; state.value = null; error.value = ''; void load(); }, { immediate: true });
watch(() => props.revision, () => { void load(); });
onScopeDispose(() => { generation++; });
</script>
<template lang="pug">
section.mvp-progress.world-content-card(v-if="state?.enabled || error" aria-label="Начальный маршрут" :aria-busy="loading")
  h2 Закрытое тестирование
  n-alert(v-if="error || runner.error.value" type="error") {{ error || runner.error.value }}
  n-button(v-if="error" :loading="loading" :disabled="loading" @click="load") Повторить загрузку
  p(v-if="state?.enabled") Стартовые кредиты и набор вещей учитываются отдельно. Подготовленный перевод можно получить на странице переводов.
  p(v-if="state?.personalCredits !== null && state?.personalCredits !== undefined") Личный баланс: {{ formatCredits(state.personalCredits) }} Cr. {{ state.targetStartCredits !== null ? `Расчётный старт: ${formatCredits(state.targetStartCredits)} Cr отдельным переводом.` : '' }}
  p(v-if="state?.secondMilestoneDay") Маршрут до первого металла рассчитан на {{ state.secondMilestoneDay }} дней. Цели не сгорают при пропуске дня.
  .mvp-links(v-if="state?.enabled")
    router-link(to="/transfer") Переводы кредитов
    router-link(to="/world/workspace/inventory") Инвентарь
    router-link(to="/world/workspace/recipes") Рецепты
    router-link(to="/world/workspace/history") История экономики
    router-link(:to="state.feedback") Сообщить о проблеме
  n-button(v-if="runner.pending.value" :loading="runner.busy.value" @click="act()") Проверить результат запроса
  n-collapse(v-if="state?.enabled")
    n-collapse-item(v-for="goal in state.goals" :key="goal.code" :title="`${titles[goal.code] ?? 'Начальная цель'}${goal.claimed ? ' — выполнено' : ''}`" :name="goal.code")
      n-progress(type="line" :percentage="Math.floor(goal.steps.filter(step => step.completed).length * 100 / Math.max(1, goal.steps.length))" :show-indicator="false")
      ul
        li(v-for="step in goal.steps" :key="step.code")
          span {{ step.completed ? '✓' : '○' }} {{ milestoneLabels[step.code] ?? 'Шаг начального маршрута' }}: {{ Math.min(step.quantity, step.required) }} / {{ step.required }}
          router-link(v-if="!step.completed && step.href" :to="step.href") Перейти к действию
      p Награда: {{ formatCredits(goal.credits) }} Cr в казну стоянки. После сбора действуют отчисления; личный баланс не пополняется.
      p(v-if="!goal.funded && !goal.claimed") Награда ожидает резервирования бюджета поселения.
      n-button(v-if="!goal.claimed" :disabled="busy || !goal.canClaim" :loading="runner.busy.value" @click="act('economy/goals/claim', { code: goal.code })") Получить награду
    n-collapse-item(title="Здоровье и еда" name="health")
      p Здоровье: {{ state.health.hp }} / {{ state.health.maximum }}. Еда восстанавливает здоровье; ночная болезнь проходит после защищённых ночей.
      .mvp-foods
        n-button(v-for="food in state.health.foods" :key="food.code" :disabled="busy || state.health.hp === state.health.maximum || food.quantity === 0" @click="act('economy/food', { code: food.code, health_revision: state.health.revision })") {{ food.name }} · +{{ food.restore }} · в наличии {{ food.quantity }}
    n-collapse-item(title="Остатки лимитов" name="quotas")
      p(v-for="quota in state.quotas" :key="quota.kind") {{ quotaLabels[quota.kind] ?? 'Действия' }}: доступно {{ quota.remaining }} из {{ quota.maximum }}. Восстановление: {{ new Date(quota.restoresAt * 1000).toLocaleString('ru-RU') }}. {{ quota.grossRemaining !== null ? `Остаток валовой выручки: ${formatCredits(quota.grossRemaining)} Cr.` : '' }}
</template>
<style scoped>
.mvp-progress { display: grid; gap: .75rem; min-width: 0; }.mvp-progress h2, .mvp-progress p { margin: 0; }
.mvp-links, .mvp-foods { display: flex; flex-wrap: wrap; gap: .75rem; }.mvp-foods :deep(button) { max-width: 100%; height: auto; min-height: 34px; white-space: normal; }.mvp-progress ul { padding-left: 1.25rem; }
</style>
