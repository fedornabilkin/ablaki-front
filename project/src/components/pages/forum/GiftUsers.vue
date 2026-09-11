<script setup lang="ts">
import { computed, ref } from 'vue';
import { NButton, NModal } from 'naive-ui';
import { usePageRequest } from '@/hooks/usePageRequest';
import { list, emptyPage, field } from '@/services/api/portal';

const props = defineProps<{ commentId: number; count: number }>();
const showAll = ref(false);
const commentId = computed(() => props.commentId);
const { data, loading } = usePageRequest(
  () => list(`forum-comment/${commentId.value}/gifts`, 1, { 'per-page': 1000 }),
  emptyPage(),
  [commentId],
);
const users = computed(() => data.value.items);
const visibleUsers = computed(() => users.value.slice(0, 5));
const hiddenCount = computed(() => Math.max(0, props.count - visibleUsers.value.length));
</script>

<template lang="pug">
.gift-users(v-if="count > 0")
  span.muted Передали кредит:
  template(v-if="!loading")
    template(v-for="(user, index) in visibleUsers" :key="user.id")
      | {{ index ? ', ' : ' ' }}
      router-link(:to="'/wall/' + encodeURIComponent(field(user.username))") {{ field(user.username) }}
    n-button(v-if="hiddenCount > 0" text size="small" @click="showAll = true") +{{ hiddenCount }}
  n-modal(v-model:show="showAll" preset="card" title="Кто передал кредит" :style="{ width: 'min(32rem, calc(100vw - 1.5rem))' }")
    .gift-users-modal
      router-link.gift-user(v-for="user in users" :key="user.id" :to="'/wall/' + encodeURIComponent(field(user.username))" @click="showAll = false")
        | {{ field(user.username) }}
</template>

<style scoped>
.gift-users { display: inline-flex; align-items: center; flex-wrap: wrap; gap: .25rem; }
.gift-users-modal { display: flex; flex-direction: column; gap: .5rem; max-height: min(24rem, 60vh); overflow-y: auto; }
.gift-user { padding: .35rem .25rem; }
</style>
