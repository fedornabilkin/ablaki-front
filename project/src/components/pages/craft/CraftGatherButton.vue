<script setup lang="ts">
defineProps<{ available: boolean; disabled?: boolean; countdown: string; remaining?: number; limit?: number; exhausted?: boolean }>();
defineEmits<{ gather: [] }>();
</script>
<template lang="pug">
button.gather-button(v-if="!exhausted" type="button" :disabled="disabled || !available" @click="$emit('gather')")
  font-awesome-icon(:icon="available ? 'seedling' : 'check-circle'" aria-hidden="true")
  strong {{ available ? 'Собрать сырьё' : 'Сырьё собрано' }}
  span(v-if="remaining !== undefined && limit !== undefined") Осталось сборов: {{ remaining }} / {{ limit }}
  span(v-if="!available") Через {{ countdown }}
  span(v-else) Раз в сутки мира · количество убывает
</template>
<style scoped>
.gather-button { border: 1px solid #779b66; border-radius: .45rem; background: #233326; color: #e0f0d9; display: grid; grid-template-columns: auto 1fr; align-items: center; gap: .2rem .35rem; padding: .5rem; cursor: pointer; width: fit-content; }.gather-button > svg { font-size: .9rem; }.gather-button strong { font-size: .85rem; }.gather-button span { grid-column: 1 / -1; font-size: .75rem; }.gather-button:disabled { opacity: .65; cursor: default; }
</style>
