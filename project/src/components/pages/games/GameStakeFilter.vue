<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { NButton } from 'naive-ui';
import { usePageRequest } from '@/hooks/usePageRequest';
import { lobbyStakes, type HistoryGameKind, type HistoryKon } from '@/services/api/gameHistory';
const props = withDefaults(defineProps<{ kind: HistoryGameKind; scope?: 'my' | 'available'; modelValue: string; version?: unknown; disabled?: boolean }>(), { scope: 'available' });
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const store = useStore();
const request = usePageRequest(() => lobbyStakes(props.kind, props.scope), [] as HistoryKon[], [
  () => props.kind, () => props.scope, computed(() => store.state.auth.revision),
]);
const stakes = ref<HistoryKon[]>([]);
watch([() => props.kind, () => props.scope, () => store.state.auth.revision], () => { stakes.value = []; }, { flush: 'sync' });
watch(() => props.version, () => { void request.refresh(); });
watch(request.data, rows => {
  const counts = new Map(rows.map(row => [Number(row.kon), row]));
  const known = new Set(stakes.value.map(row => Number(row.kon)));
  stakes.value = [...stakes.value.map(row => ({ ...row, count: counts.get(Number(row.kon))?.count ?? 0 })), ...rows.filter(row => !known.has(Number(row.kon)))];
}, { immediate: true });
const unit = computed(() => props.kind === 'saper' ? 'Кг' : 'Cr');
const missingSelected = computed(() => props.modelValue && !stakes.value.some(item => Number(item.kon) === Number(props.modelValue)));
</script>
<template lang="pug">
.stake-filter(role="group" aria-label="Фильтр по ставке" :aria-busy="request.loading.value")
  n-button(size="small" :type="!modelValue ? 'primary' : 'default'" :aria-pressed="!modelValue" :disabled="disabled" @click="emit('update:modelValue', '')") Все
  n-button(v-for="item in stakes" :key="Number(item.kon)" size="small" :type="Number(modelValue) === Number(item.kon) ? 'primary' : 'default'" :aria-pressed="Number(modelValue) === Number(item.kon)" :title="Number(item.kon) + ' ' + unit + ' × ' + item.count + ' игр'" :disabled="disabled" @click="emit('update:modelValue', item.kon)") {{ Number(item.kon) }}х{{ item.count }}
  n-button(v-if="missingSelected" size="small" type="primary" aria-pressed="true" :disabled="disabled" @click="emit('update:modelValue', '')") {{ modelValue }}х0
  n-button(v-if="request.error.value" size="small" @click="request.refresh") Повторить загрузку ставок
</template>
<style scoped>
.stake-filter { display: flex; flex-wrap: nowrap; align-items: center; gap: .4rem; overflow-x: auto; max-width: 100%; padding-block: .3rem; }
.stake-filter > * { flex: 0 0 auto; }
</style>
