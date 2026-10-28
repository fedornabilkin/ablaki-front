<script setup lang="ts">
import { worldActionButtonTheme, worldNeutralButtonTheme } from '@/entities/world/theme';
import { computed, onScopeDispose, ref, watch } from 'vue';
import { NAlert, NButton, NSelect, NCheckbox } from 'naive-ui';
import { loadMining, parseMining, type MiningState } from '@/services/api/worldMining';
import { useSimpleWorldCommand } from '@/hooks/useSimpleWorldCommand';
import { worldError } from '@/services/api/world';
import { formatDuration } from '@/entities/world/duration';
import { investmentAmount } from '@/entities/world/credits';
import WorldCreditInput from './WorldCreditInput.vue';
import WorldCredits from './WorldCredits.vue';
import WorldHelpHint from './WorldHelpHint.vue';
import WorldWorkProgress from './WorldWorkProgress.vue';
import WorldQuotaNotice from './WorldQuotaNotice.vue';
const props = defineProps<{ nodeId: number; owner: number; session: number; writable: boolean }>();
const emit = defineEmits<{ changed: [] }>();
const state = ref<MiningState | null>(null), error = ref('');
const selectedDestination = ref<'backpack' | 'mini_storage'>('backpack');
const storageOptions = computed(() => state.value?.output_storages ?? []);
const hasMiniStorage = computed(() => storageOptions.value.some(storage => storage.kind === 'stockpile'));
const effectiveDestination = computed(() => state.value?.output_destination ?? (state.value?.action_code && storageOptions.value.find(storage => storage.id === state.value?.output_storage_id)?.kind === 'stockpile' ? 'mini_storage' : selectedDestination.value));
const hireEnabled = ref(false), hireReward = ref('1'), saved = ref('');
const selectedAction = ref<string | null>(null);
const selected = computed(() => state.value?.actions?.find(action => action.code === (state.value?.action_code ?? selectedAction.value)) ?? state.value?.actions?.[0]);
const options = computed(() => state.value?.actions?.map(action => ({ value: action.code, label: action.output.map(item => `${item.name} × ${item.quantity}`).join(', ') })) ?? []);
const runner = useSimpleWorldCommand(computed(() => `${props.owner}.${props.nodeId}.mining`), computed(() => props.session));
const pendingSettings = computed(() => runner.pending.value?.path.endsWith('/settings') ?? false);
const normalizedHireReward = computed(() => { try { return investmentAmount(hireReward.value.trim().replace(',', '.')); } catch { return null; } });
const employmentBlocked = computed(() => !props.writable || !state.value?.employment?.owner || runner.busy.value || (!!runner.pending.value && !pendingSettings.value) || (!runner.pending.value && !normalizedHireReward.value));
const checking = ref(false);
const unavailable = computed(() => state.value?.unavailable_reason || state.value?.employment?.reason || (!state.value?.action_code ? selected.value?.unavailable_reason : null));
const actionLabel = computed(() => runner.pending.value && !runner.busy.value ? 'Повторить запрос'
  : state.value?.working ? 'Приостановить добычу'
  : state.value?.pending_quantity || selected.value?.work_seconds === 0 ? 'Получить готовую партию'
  : state.value?.actions ? 'Работать над партией' : 'Добывать руду');
const actionBlocked = computed(() => !props.writable || runner.busy.value || pendingSettings.value || (!runner.pending.value && !state.value?.working
  && (!!unavailable.value || (!state.value?.pending_quantity && (state.value?.quota?.remaining === 0 || (!state.value?.action_code && (selected.value?.available_at ?? 0) > (state.value?.server_time ?? 0)))))));
const progress = computed(() => ({ worked_seconds: state.value?.actions ? state.value.worked_seconds ?? 0 : (state.value?.worked_seconds ?? 0) % Math.max(1, state.value?.seconds_per_unit ?? 1),
  required_seconds: state.value?.action_code ? state.value.required_seconds ?? selected.value?.work_seconds ?? 1 : selected.value?.work_seconds ?? state.value?.seconds_per_unit ?? 1,
  working: !!state.value?.working, server_time: state.value?.server_time ?? 0, live_work: state.value?.live_work ?? [] }));
let generation = 0, readRevision = 0, disposed = false, reading = false;
async function load() {
  const current = generation, read = ++readRevision; reading = true;
  try {
    const result = await loadMining(props.nodeId);
    if (!disposed && current === generation && read === readRevision) {
      const previous = state.value?.employment;
      state.value = result; error.value = '';
      if (!result.action_code && !result.output_storages?.some(storage => storage.kind === 'stockpile')) selectedDestination.value = 'backpack';
      if (result.employment?.owner && (!previous || previous.enabled !== result.employment.enabled || (previous.base_reward_cr ?? previous.reward_cr) !== (result.employment.base_reward_cr ?? result.employment.reward_cr))) {
        hireEnabled.value = result.employment.enabled; hireReward.value = result.employment.base_reward_cr ?? result.employment.reward_cr;
      }
    }
  }
  catch (cause) { if (!disposed && current === generation && read === readRevision) error.value = worldError(cause); }
  finally { if (current === generation && read === readRevision) reading = false; }
}
async function act(action: 'start' | 'heartbeat' | 'stop', retry = false) {
  if (runner.busy.value || (retry && pendingSettings.value) || (!retry && runner.pending.value)) return;
  if (!retry && action !== 'stop' && !state.value?.working && unavailable.value) return;
  readRevision++; reading = false;
  checking.value = action === 'heartbeat' && !retry;
  const current = generation; error.value = '';
  const result = retry ? await runner.retry() : await runner.submit(`objects/${props.nodeId}/mining/${action}`, action === 'start' && selected.value ? { action_code: selected.value.code, ...(selectedDestination.value === 'mini_storage' ? { output_destination: 'mini_storage' } : {}) } : {});
  if (result && !disposed && current === generation) { try { const next = parseMining(result); const delivered = next.produced_quantity !== state.value?.produced_quantity; state.value = next; if (delivered) emit('changed'); } catch (cause) { error.value = worldError(cause); } }
  if (current === generation) checking.value = false;
}
async function saveEmployment(retry = false) {
  if (employmentBlocked.value || (retry && !pendingSettings.value) || (!retry && runner.pending.value)) return;
  const current = generation; saved.value = '';
  const result = retry ? await runner.retry() : await runner.submit(`objects/${props.nodeId}/mining/settings`, {enabled: hireEnabled.value, reward_cr: normalizedHireReward.value});
  if (result && !disposed && current === generation) { saved.value = 'Условия оплачиваемой работы сохранены.'; await load(); emit('changed'); }
}
watch(() => [props.nodeId, props.session], () => { generation++; reading = false; state.value = null; selectedDestination.value = 'backpack'; selectedAction.value = null; error.value = ''; saved.value = ''; void load(); }, { immediate: true });
const timer = setInterval(() => {
  if (runner.busy.value || runner.pending.value || reading) return;
  if (state.value?.working) void act('heartbeat'); else void load();
}, 10_000);
function refreshVisible() { if (!document.hidden && !runner.busy.value && !runner.pending.value && !reading) void load(); }
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', refreshVisible);
onScopeDispose(() => { disposed = true; generation++; clearInterval(timer); if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', refreshVisible); });
</script>
<template lang="pug">
section.mining-panel(aria-label="Получение ресурсов")
  world-quota-notice(v-if="state?.quota" :quota="state.quota" :server-time="state.server_time")
  .mining-heading
    h3 Получение ресурсов
    world-help-hint(label="Как учитывается добыча")
      p Работа учитывается при открытой странице и связи с сервером; после обрыва — не более 60 секунд. Выдачу ресурсов подтверждает сервер.
      p(v-if="selected?.cooldown_seconds") Восстановление источника после получения: {{ formatDuration(selected.cooldown_seconds) }}.
      p(v-if="selected?.tool_names?.length") Нужен исправный инструмент: {{ selected.tool_names.join(', ') }}.
      p(v-if="selected?.drilling") Работает буровая: выход ресурсов ×{{ selected.drilling.output_multiplier }}, оплата партии ×{{ selected.drilling.reward_multiplier }}. Кирка не нужна. Условия уже начатой партии сохраняются; буровая должна оставаться исправной для её завершения.
      p(v-if="selected?.experience") Опыт за партию: +{{ selected.experience }}.
      p Добыча владельца по умолчанию поступает в рюкзак. Кнопка «Мини-склад» включает автоматический выбор ближайшего мини-склада внутри объекта с местом для всей партии. Расстояние считается от центра карты. Перед выдачей место проверяется снова.
      p(v-if="!hasMiniStorage") Для хранения добычи здесь постройте мини-склад внутри объекта.
  n-alert(closable v-if="error || runner.error.value" type="error") {{ error || runner.error.value }}
  n-alert(v-if="saved" type="success" closable @close="saved = ''") {{ saved }}
  section.mine-employment(v-if="state?.employment?.owner")
    .mining-heading
      h4 Работа для других игроков
      world-help-hint(label="Условия найма шахтёров")
        p Работнику нужно не менее 60% здоровья и собственный инструмент. Шахта должна действовать с прочностью от 50% и иметь собственный склад с местом. Оплата резервируется из бюджета шахты при принятии партии. Принятая цена сохраняется при изменении условий.
        p Добыча работников автоматически поступает в ближайший мини-склад шахты с местом для всей партии. Постройте мини-склад внутри шахты перед включением найма.
    n-checkbox(v-model:checked="hireEnabled" :disabled="runner.busy.value || !!runner.pending.value") Разрешить оплачиваемую добычу
    label Базовая оплата партии
      world-credit-input(v-model:value="hireReward" exact :disabled="runner.busy.value || !!runner.pending.value")
    p(v-if="(state.employment.reward_multiplier ?? 1) > 1") С буровой базовая ставка умножается на {{ state.employment.reward_multiplier }}. Действующая оплата: #[world-credits(:value="state.employment.reward_cr")].
    p.mining-unavailable(v-if="!normalizedHireReward" role="status") Укажите оплату больше нуля, не более четырёх знаков после запятой.
    n-button(:theme-overrides="worldActionButtonTheme" :loading="runner.busy.value && pendingSettings" :disabled="employmentBlocked" @click="saveEmployment(pendingSettings)") {{ pendingSettings ? 'Повторить сохранение' : 'Сохранить условия' }}
  n-alert(closable v-if="state?.employment && !state.employment.owner" type="info")
    p Оплата партии: #[world-credits(:value="state.employment.accepted_reward_cr ?? state.employment.reward_cr")]. Добыча поступит в мини-склад объекта, оплата — на ваш личный баланс.
  template(v-if="state")
    p(v-if="!state.ready") Постройте буровую установку внутри шахты, чтобы начать добычу.
    template(v-else)
      template(v-if="state.actions")
        p.mining-equipment(v-if="selected?.drilling" role="status") Буровая: ресурсы ×{{ selected.drilling.output_multiplier }}, оплата ×{{ selected.drilling.reward_multiplier }} · Кирка не нужна
        n-select(:value="selected?.code" :options="options" :disabled="state.working || !!state.action_code || runner.busy.value || !!runner.pending.value" aria-label="Ресурс для добычи" @update:value="selectedAction = $event")
        p(v-if="selected") {{ selected.output.map(item => `${item.name} × ${item.quantity}`).join(', ') }}
        p(v-if="!state.action_code && (selected?.available_at ?? 0) > state.server_time") Следующая партия доступна: {{ new Date((selected?.available_at ?? 0) * 1000).toLocaleString('ru-RU') }}.
        .mining-destinations(v-if="storageOptions.length" role="group" aria-label="Куда поступит добыча")
          n-button(v-if="storageOptions.some(storage => storage.kind === 'backpack')" size="small" :theme-overrides="effectiveDestination === 'backpack' ? worldActionButtonTheme : worldNeutralButtonTheme" :aria-pressed="effectiveDestination === 'backpack'" :disabled="!!state.action_code || runner.busy.value || !!runner.pending.value" @click="selectedDestination = 'backpack'") Рюкзак
          n-button(v-if="hasMiniStorage || effectiveDestination === 'mini_storage'" size="small" :theme-overrides="effectiveDestination === 'mini_storage' ? worldActionButtonTheme : worldNeutralButtonTheme" :aria-pressed="effectiveDestination === 'mini_storage'" :disabled="!!state.action_code || runner.busy.value || !!runner.pending.value" @click="selectedDestination = 'mini_storage'") Мини-склад
        n-alert(closable v-if="state.blocked_message" type="warning") {{ state.blocked_message }}. Заработанная партия сохранена.
      template(v-else)
        p Работников: {{ state.workers }}. Добыто: {{ state.produced_quantity }} ед. руды.
      world-work-progress(v-if="progress.required_seconds > 0" :snapshot="progress" :identity="`${nodeId}.${state.work_id ?? state.action_code ?? 'idle'}.${state.produced_quantity}`" :syncing="runner.busy.value" @check="act('heartbeat')")
      p(v-if="state.pending_quantity") Ожидает выдачи: {{ state.pending_quantity }}. Освободите место в хранилище.
      p.mining-unavailable(v-if="unavailable" role="status") {{ unavailable }}
      n-button(:theme-overrides="worldActionButtonTheme" :type="state.working ? 'default' : 'primary'" :loading="runner.busy.value && !checking" :disabled="actionBlocked" @click="runner.pending.value ? act('heartbeat', true) : act(state.working ? 'stop' : state.pending_quantity ? 'heartbeat' : 'start')") {{ actionLabel }}
</template>
<style scoped>
.mining-destinations { display: flex; flex-wrap: wrap; gap: .4rem; }
.mine-employment { display: grid; gap: .65rem; padding: .85rem; border: 1px solid var(--border); border-radius: .6rem; }.mine-employment h4 { margin: 0; }.mine-employment label { display: grid; grid-template-columns: 1fr minmax(5rem, 9rem); align-items: center; gap: .5rem; }
.mining-panel { display: grid; gap: .75rem; }.mining-panel p, .mining-panel h3 { margin: 0; }
.mining-heading { display: flex; align-items: start; justify-content: space-between; gap: .5rem; }
.mining-unavailable { color: var(--error, #d03050); font-size: .85rem; }
.mining-equipment { padding: .55rem .7rem; border-radius: .4rem; background: var(--primary-soft); color: var(--primary); font-size: .85rem; }
</style>
