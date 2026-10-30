<script setup lang="ts">
import { onScopeDispose, ref, watch } from 'vue';
import { NButton, NProgress, NSpin } from 'naive-ui';
import { loadProgression } from '@/services/api/worldCharacter';
import { worldError } from '@/services/api/world';
import type { MvpState } from '@/services/api/worldMvp';
const props = defineProps<{ health?: MvpState['health']; healthError?: string; session?: number }>();
const tracks = ref<Awaited<ReturnType<typeof loadProgression>> | null>(null), loading = ref(true), error = ref('');
let generation = 0;
async function load() {
  const current = ++generation; loading.value = true; error.value = ''; tracks.value = null;
  try { const result = await loadProgression(); if (current === generation) tracks.value = result; }
  catch (cause) { if (current === generation) error.value = worldError(cause); }
  finally { if (current === generation) loading.value = false; }
}
watch(() => props.session, load, {immediate: true});
onScopeDispose(() => { generation++; });
</script>
<template lang="pug">
section.character-progress(aria-label="Состояние персонажа")
  h4 Персонаж
  template(v-if="health")
    p.character-health Здоровье: {{ health.hp }} / {{ health.maximum }}
    n-progress(type="line" :percentage="100 * health.hp / health.maximum" :show-indicator="false" :status="health.hp < 60 ? 'error' : 'success'")
    p(v-if="health.disorderUntil") Пищевое расстройство до {{ new Date(health.disorderUntil * 1000).toLocaleString('ru-RU') }}
  p(v-else-if="healthError") {{ healthError }}
  p(v-else) Здоровье загружается…
  n-spin(v-if="loading" size="small" aria-label="Загрузка опыта")
  template(v-else-if="error")
    p {{ error }}
    n-button(size="small" @click="load") Обновить прокачку
  template(v-else-if="tracks")
    router-link(v-if="tracks.extractionWork" :to="`/world/nodes/${tracks.extractionWork.nodeId}`") Добыча: {{ tracks.extractionWork.name }} →
    template(v-for="group in [{name: 'Ремесло', entries: tracks.craft}, {name: 'Профессии', entries: tracks.professions}]" :key="group.name")
      h5 {{ group.name }}
      dl(v-if="group.entries.length")
        template(v-for="track in group.entries" :key="track.name")
          dt {{ track.name }}
          dd Уровень {{ track.level }} · {{ track.xp }} XP
      p(v-else) Пока нет опыта.
  small Исследуйте карту, изготавливайте вещи и выполняйте задания. Уровень исследователя повышается на карте.
</template>
<style scoped>
.character-progress { display: grid; gap: .5rem; min-width: min(18rem, 80vw); }.character-progress h4, .character-progress h5, .character-progress p, .character-progress dl { margin: 0; }.character-progress h5 { margin-top: .5rem; }.character-progress dl { display: grid; grid-template-columns: 1fr auto; gap: .4rem .75rem; font-size: .8rem; }.character-progress dd { margin: 0; }.character-progress small { color: var(--text-muted); font-size: .75rem; }.character-health { font-weight: 600; }
</style>
