<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { NAlert, NButton } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import { useWorldCommand } from '@/hooks/useWorldCommand';
import WorldStoragePanel from './WorldStoragePanel.vue';
const route = useRoute(), auth = useStore(), revision = ref(0);
const session = computed(() => Number(auth.state.auth.revision)), owner = computed(() => Number(auth.getters['auth/user']?.id ?? 0));
const storageId = computed(() => Number(route.params.id));
const nodeId = computed(() => route.query.node_id === undefined ? null : Number(route.query.node_id));
const valid = computed(() => [storageId.value, ...(nodeId.value === null ? [] : [nodeId.value])].every(id => Number.isSafeInteger(id) && id > 0 && id <= 2147483647));
const command = useWorldCommand(session, owner, () => { revision.value++; });
const { error, pending, busy } = command;
</script>
<template lang="pug">
page-header(pageTitle="Хранилище")
.container
  router-link(:to="nodeId ? `/world/nodes/${nodeId}` : '/world'") Вернуться в мир
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  n-alert(v-if="pending" type="info")
    p Ответ на прошлое действие ещё не получен.
    n-button(:loading="busy" @click="command.retry") Повторить запрос
  n-alert(v-if="!valid" type="error") Некорректный адрес хранилища.
  world-storage-panel(v-else :key="revision" :node-id="nodeId" :storage-id="storageId" :session="session" :writable="true" :command="command")
</template>
