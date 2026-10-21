<script setup lang="ts">
import { worldActionButtonTheme } from '@/entities/world/theme';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { NAlert, NButton } from 'naive-ui';
import { useWorldCommand } from '@/hooks/useWorldCommand';
import WorldStoragePanel from './WorldStoragePanel.vue';
import WorldPageActions from './WorldPageActions.vue';
const route = useRoute(), auth = useStore(), revision = ref(0);
const session = computed(() => Number(auth.state.auth.revision)), owner = computed(() => Number(auth.getters['auth/user']?.id ?? 0));
const storageId = computed(() => Number(route.params.id));
const nodeId = computed(() => route.query.node_id === undefined ? null : Number(route.query.node_id));
const valid = computed(() => [storageId.value, ...(nodeId.value === null ? [] : [nodeId.value])].every(id => Number.isSafeInteger(id) && id > 0 && id <= 2147483647));
const command = useWorldCommand(session, owner, () => { revision.value++; });
const { error, pending, busy } = command;
</script>
<template lang="pug">
.container.world-storage-page
  section.storage-hero
    .storage-crest(aria-hidden="true")
      font-awesome-icon(icon="box")
    div
      span.storage-eyebrow Вещи и размещение
      h1 Хранилище
      p Переносите предметы между хранилищами и слотами мира.
      router-link.storage-parent(:to="nodeId ? `/world/nodes/${nodeId}#workshop` : '/world'") ← Вернуться в мир
    world-page-actions(:node-id="nodeId ?? undefined")
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  n-alert(v-if="pending" type="info")
    p Ответ на прошлое действие ещё не получен.
    n-button(:theme-overrides="worldActionButtonTheme" :loading="busy" @click="command.retry") Повторить запрос
  n-alert(v-if="!valid" type="error") Некорректный адрес хранилища.
  world-storage-panel(v-else :revision="revision" :node-id="nodeId" :storage-id="storageId" :session="session" :writable="true" :command="command")
</template>
<style scoped>
.world-storage-page { display: grid; gap: 1rem; padding-block: 1.5rem 3rem; max-width: 1320px; }
.storage-hero { display: flex; gap: 1rem; align-items: start; padding: 1rem; border: 1px solid var(--border); border-radius: .8rem; background: radial-gradient(circle at 80% 12%, var(--primary-soft), transparent 45%), var(--bg-surface); }
.storage-hero > div:not(.storage-crest):not(.world-page-actions) { min-width: 0; flex: 1; }
.storage-crest { display: grid; place-items: center; flex: 0 0 4.5rem; height: 4.5rem; border: 1px solid var(--primary); border-radius: .85rem; background: var(--primary-soft); color: var(--primary); font-size: 2rem; }
.storage-eyebrow { color: var(--primary); font-size: .72rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
h1 { margin: .25rem 0; font-size: clamp(1.6rem, 3vw, 2.4rem); }p { margin: 0 0 .6rem; color: var(--text-muted); }
.storage-parent { display: inline-flex; padding: .35rem .7rem; border: 1px solid var(--border); border-radius: .45rem; font-size: .85rem; }
@media(max-width: 900px) { .storage-hero { flex-wrap: wrap; }.world-page-actions { width: 100%; } }
@media(max-width: 600px) { .storage-crest { flex-basis: 3rem; height: 3rem; font-size: 1.5rem; } }
</style>
