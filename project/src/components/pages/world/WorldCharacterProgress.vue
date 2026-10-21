<script setup lang="ts">
import { onMounted, onScopeDispose, ref } from 'vue';
import { NSpin } from 'naive-ui';
import { apiClient } from '@/services/httpClient';
import config from '@/config/config';
import { integer, record, worldError } from '@/services/api/world';
const tracks = ref<{ name: string; level: number; xp: number }[]>([]), loading = ref(true), error = ref('');
let disposed = false;
onMounted(async () => {
  try {
    const row = record((await apiClient.get(config.makeApiUrl('v1/world/economy/progression'))).data);
    const parse = (value: unknown) => {
      if (!Array.isArray(value) || value.length > 200) throw new Error('invalid-world-response');
      return value.map(value => { const track = record(value); if (typeof track.name !== 'string' || track.name.length > 120) throw new Error('invalid-world-response');
        return { name: track.name, level: integer(track.level, 1, 2147483647), xp: integer(track.xp) }; });
    };
    const result = [...parse(row.craft), ...parse(row.professions)]; if (!disposed) tracks.value = result;
  } catch (cause) { if (!disposed) error.value = worldError(cause); }
  finally { if (!disposed) loading.value = false; }
});
onScopeDispose(() => { disposed = true; });
</script>
<template lang="pug">
section.character-progress
  h4 Прокачка персонажа
  n-spin(v-if="loading" size="small" aria-label="Загрузка опыта")
  p(v-else-if="error") {{ error }}
  dl(v-else-if="tracks.length")
    template(v-for="track in tracks" :key="track.name")
      dt {{ track.name }}
      dd Уровень {{ track.level }} · {{ track.xp }} XP
  p(v-else) Пока нет опыта. Исследуйте карту, изготавливайте вещи и выполняйте задания.
  p Исследователь повышает уровень в панели открытия ячеек на карте. Навыки ремесла растут при изготовлении.
</template>
<style scoped>
.character-progress { border-top: 1px solid var(--border); padding-top: .75rem; }.character-progress h4 { margin: 0 0 .6rem; }.character-progress dl { display: grid; grid-template-columns: 1fr auto; gap: .4rem .75rem; }.character-progress dd { margin: 0; }.character-progress a { font-size: .85rem; }
</style>
