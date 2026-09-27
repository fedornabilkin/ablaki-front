<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { NAlert, NButton, NCheckbox, NSpin } from 'naive-ui';
import type { WorldCommandRunner } from '@/hooks/useWorldCommand';
import { loadShelter, previewShelter, type ShelterAction } from '@/services/api/worldShelter';
import { worldError } from '@/services/api/world';
const props = defineProps<{ nodeId: number; session: number; command: WorldCommandRunner }>();
const state = shallowRef<Awaited<ReturnType<typeof loadShelter>> | null>(null), quote = shallowRef<Awaited<ReturnType<typeof previewShelter>> | null>(null);
const error = ref(''), loading = ref(false), calculating = ref(false), endLodging = ref(false), { busy, pending } = props.command;
const locked = computed(() => busy.value || Boolean(pending.value) || !state.value?.writable);
const here = computed(() => state.value?.deployment?.plot_id === props.nodeId);
const labels: Record<ShelterAction, string> = { claim: 'Получить шалаш', deploy: 'Установить шалаш', fold: 'Сложить шалаш', lodge: 'Назначить ночлег', leave: 'Отменить ночлег', repair: 'Починить шалаш' };
let generation = 0, previewGeneration = 0, disposed = false;
function clear() { previewGeneration++; quote.value = null; calculating.value = false; }
async function load() {
  const current = ++generation; clear(); state.value = null; loading.value = true; error.value = ''; endLodging.value = false;
  try { const result = await loadShelter(props.nodeId); if (!disposed && current === generation) state.value = result; }
  catch (cause) { if (!disposed && current === generation) error.value = worldError(cause); }
  finally { if (!disposed && current === generation) loading.value = false; }
}
watch([() => props.nodeId, () => props.session], load, { immediate: true, flush: 'sync' });
watch([busy, endLodging], clear, { flush: 'sync' });
async function preview(action: ShelterAction, direct = false) {
  if (locked.value || calculating.value) return;
  clear(); const current = previewGeneration; calculating.value = true; error.value = '';
  try {
    const result = await previewShelter(props.nodeId, action, { direct_deploy: direct, end_lodging: action === 'fold' && endLodging.value });
    if (!disposed && current === previewGeneration) quote.value = result;
  } catch (cause) { if (!disposed && current === previewGeneration) error.value = worldError(cause); }
  finally { if (!disposed && current === previewGeneration) calculating.value = false; }
}
async function confirm() {
  if (!quote.value || locked.value || (quote.value.repair && !quote.value.repair.available)) return;
  const chosen = quote.value;
  await props.command.submit(`/nodes/${props.nodeId}/shelter-${chosen.action}`, chosen.input, chosen.quote);
  if (!disposed && !pending.value) void load();
}
const date = (value: number) => new Date(value * 1000).toLocaleString('ru-RU');
onScopeDispose(() => { disposed = true; generation++; previewGeneration++; });
</script>
<template lang="pug">
section.world-shelter#shelter
  h2 Шалаш и ночлег
  p Один бесплатный шалаш на аккаунт. Он даёт одно место ночлега, но не защищает станции и сундуки. Установка не занимает площадь капитальных построек.
  n-button(:loading="loading" :disabled="busy || Boolean(pending)" @click="load") Обновить состояние
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  n-spin(v-if="loading" aria-label="Загрузка шалаша")
  template(v-else-if="state")
    p(v-if="!state.writable") Действия станут доступны после включения хранения мира.
    n-alert(v-if="!state.night_resolution_enabled" type="info") Назначение ночлега сохраняется, пока вы офлайн. Расчёт болезни и выздоровления ещё не включён.
    p(v-else) Ночлег действует и офлайн. Для защиты всей ночи назначьте исправный шалаш до её начала.
    .shelter-actions(v-if="!state.claimed")
      n-button(:disabled="locked || calculating" @click="preview('claim')") Получить в рюкзак
      n-button(:disabled="locked || calculating" @click="preview('claim', true)") Получить и установить здесь
    template(v-else)
      p Шалаш уже получен. Повторная выдача в другом мире недоступна.
      p(v-if="state.instance_id") Прочность: {{ state.durability }} / {{ state.max_durability }}.
      n-alert(v-else type="warning") Экземпляр недоступен. Право выдачи сохранено как использованное; требуется восстановление предмета.
      router-link(v-if="state.instance_id" :to="`/world/equipment/${state.instance_id}/wear`") История прочности шалаша
      template(v-if="state.deployment")
        router-link(:to="`/world/nodes/${state.deployment.node_id}`") Открыть установленный шалаш
        router-link(v-if="!here" :to="`/world/nodes/${state.deployment.plot_id}`") Перейти на стоянку с шалашом
        p(v-if="state.durability") При текущем износе защита действует до {{ date(state.deployment.protected_until) }}.
        n-alert(v-else type="warning") Шалаш изношен и больше не защищает ночлег.
        p(v-if="state.lodging") Ночлег назначен с {{ date(state.lodging.assigned_at) }}. {{ state.lodging.protects_now ? 'Укрытие действует.' : 'Защита на этой стоянке сейчас не действует.' }}
        p(v-else) Ночлег ещё не назначен.
        template(v-if="here")
          .shelter-actions
            n-button(v-if="!state.lodging" :disabled="locked || calculating || !state.durability || Boolean(state.current_assignment)" @click="preview('lodge')") Назначить ночлег
            n-button(v-else :disabled="locked || calculating" @click="preview('leave')") Отменить ночлег
          n-checkbox(v-if="state.lodging" v-model:checked="endLodging" :disabled="locked") Прекратить ночлег при складывании шалаша
          n-button(:disabled="locked || calculating || (Boolean(state.lodging) && !endLodging)" @click="preview('fold')") Сложить в рюкзак
      n-button(v-else-if="state.instance_id" :disabled="locked || calculating || !state.durability" @click="preview('deploy')") Установить на этой стоянке
      router-link(v-if="state.current_assignment?.kind === 'house'" :to="`/world/nodes/${state.current_assignment.node_id}#housing`") Ночлег назначен в доме — открыть назначение
      n-button(v-if="state.instance_id && state.durability !== null && state.max_durability !== null && state.durability < state.max_durability && (!state.deployment || here)" :disabled="locked || calculating" @click="preview('repair')") Рассчитать ремонт
    section(v-if="quote" aria-live="polite")
      h3 {{ labels[quote.action] }}
      p Стоимость: 0 Cr.
      p(v-if="quote.action === 'claim'") Разовое право будет использовано только после успешного получения.
      p(v-if="quote.input.direct_deploy || quote.action === 'deploy'") Шалаш появится на этой стоянке. Назначить ночлег можно следующим действием. Износ на улице — 4 единицы прочности в сутки.
      p(v-if="quote.position") Ячейка рюкзака: {{ quote.position }}.
      p(v-if="quote.endsLodging || quote.action === 'leave'") Текущее назначение ночлега прекратится сразу после подтверждения.
      p(v-if="quote.action === 'lodge'") Этот шалаш станет постоянным местом ночлега персонажа до отмены или складывания. Изношенное укрытие не защищает.
      template(v-if="quote.repair")
        p Прочность после ремонта: {{ quote.repair.before }} → {{ quote.repair.after }}.
        p Ручной ремонт без инструментов и станции. Расход зависит от повреждения и текущих рецептов досок и верёвки. Материалы берутся из доступных ячеек рюкзака.
        ul.shelter-materials
          li(v-for="material in quote.repair.materials" :key="material.item_id" :class="{ 'shelter-missing': !material.available }")
            span {{ material.name }}: {{ material.have }} / {{ material.quantity }}
            span(v-if="!material.available") — недостаточно
        n-alert(v-if="!quote.repair.available" type="error" role="alert") {{ quote.repair.reasons.join(' ') }}
        p Установленный шалаш останется на месте, назначенный ночлег сохранится. Ремонт восстановит защиту с текущего момента. Прошлые незащищённые ночи останутся в истории.
      n-button(type="primary" :disabled="locked || Boolean(quote.repair && !quote.repair.available)" @click="confirm") Подтвердить
</template>
<style scoped>
.world-shelter { display: grid; gap: .75rem; }
.shelter-actions { display: flex; flex-wrap: wrap; gap: .75rem; }
.shelter-materials { padding-left: 1.25rem; }
.shelter-missing { color: var(--n-error-color, #d03050); }
</style>
