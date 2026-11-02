<script setup lang="ts">
import { worldActionButtonTheme } from '@/entities/world/theme';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { NAlert, NButton } from 'naive-ui';
import { useWorldCommand } from '@/hooks/useWorldCommand';
import { useWorldPresence } from '@/hooks/useWorldPresence';
import WorldStoragePanel from './WorldStoragePanel.vue';
import WorldHero from './WorldHero.vue';
import WorldPageActions from './WorldPageActions.vue';
const route = useRoute(), auth = useStore(), revision = ref(0);
const session = computed(() => Number(auth.state.auth.revision)), owner = computed(() => Number(auth.getters['auth/user']?.id ?? 0));
const storageId = computed(() => Number(route.params.id));
const nodeId = computed(() => route.query.node_id === undefined ? null : Number(route.query.node_id));
const valid = computed(() => [storageId.value, ...(nodeId.value === null ? [] : [nodeId.value])].every(id => Number.isSafeInteger(id) && id > 0 && id <= 2147483647));
useWorldPresence(computed(() => valid.value && owner.value ? nodeId.value : null), session, { enter: false });
const command = useWorldCommand(session, owner, () => { revision.value++; });
const { error, pending, busy } = command;
</script>
<template lang="pug">
.container.world-storage-page
  world-hero(title="Хранилище" icon="box" :parent-to="nodeId ? `/world/nodes/${nodeId}#workshop` : '/world'" parent-label="Вернуться в мир")
    template(#actions)
      world-page-actions(:node-id="nodeId ?? undefined")
  n-alert(closable v-if="error" type="error" role="alert") {{ error }}
  n-alert(closable v-if="pending" type="info")
    p Ответ на прошлое действие ещё не получен.
    n-button(:theme-overrides="worldActionButtonTheme" :loading="busy" @click="command.retry") Повторить запрос
  n-alert(closable v-if="!valid" type="error") Некорректный адрес хранилища.
  world-storage-panel(v-else :revision="revision" :node-id="nodeId" :storage-id="storageId" :session="session" :writable="true" :command="command")
</template>
<style scoped>
.world-storage-page { display: grid; gap: 1rem; padding-block: 1rem 3rem; max-width: 1320px; }
</style>
