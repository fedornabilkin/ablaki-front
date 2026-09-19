<script setup lang="ts">
import { computed, ref } from 'vue';
import { NButton, NInput, NModal } from 'naive-ui';
import { usePageRequest } from '@/hooks/usePageRequest';
import { list, emptyPage, field } from '@/services/api/portal';
const props = defineProps<{ commentId: number; count: number }>();
const showAll = ref(false); const search = ref('');
const commentId = computed(() => props.commentId);
const { data, loading } = usePageRequest(() => list(`forum-comment/${commentId.value}/gifts`, 1, { 'per-page': 1000 }), emptyPage(), [commentId, () => props.count]);
const users = computed(() => data.value.items);
const visibleUsers = computed(() => users.value.slice(0, 5));
const hiddenCount = computed(() => Math.max(0, props.count - visibleUsers.value.length));
const filteredUsers = computed(() => { const q = search.value.trim().toLocaleLowerCase(); return q ? users.value.filter(u => field(u.username).toLocaleLowerCase().includes(q)) : users.value; });
function parts(username: unknown) {
  const text = field(username), q = search.value.trim(), result: Array<{text: string; match: boolean}> = [];
  if (!q) return [{text, match: false}];
  const lower=text.toLocaleLowerCase(), needle=q.toLocaleLowerCase(); let from=0, at=lower.indexOf(needle);
  while (at >= 0) { if (at > from) result.push({text:text.slice(from,at),match:false}); result.push({text:text.slice(at,at+q.length),match:true}); from=at+q.length; at=lower.indexOf(needle,from); }
  if (from < text.length) result.push({text:text.slice(from),match:false}); return result;
}
</script>
<template lang="pug">
.gift-users(v-if="count > 0")
  span.muted Передали кредит:
  template(v-if="!loading")
    template(v-for="(user, index) in visibleUsers" :key="user.id")
      | {{ index ? ', ' : ' ' }}
      router-link(:to="'/wall/' + encodeURIComponent(field(user.username))") {{ field(user.username) }}
      small.muted {{ Number(user.amount) || 1 }} Cr
    n-button(v-if="hiddenCount > 0" text size="small" @click="showAll = true") +{{ hiddenCount }}
  n-modal(v-model:show="showAll" preset="card" title="Кто передал кредит" :style="{ width: 'min(32rem, calc(100vw - 1.5rem))' }")
    n-input(v-if="users.length > 10" v-model:value="search" clearable placeholder="Поиск пользователей")
    .gift-users-modal
      router-link.gift-user(v-for="user in filteredUsers" :key="user.id" :to="'/wall/' + encodeURIComponent(field(user.username))" @click="showAll = false")
        template(v-for="part in parts(user.username)" :key="part.text + String(part.match)")
          mark(v-if="part.match") {{ part.text }}
          span(v-else) {{ part.text }}
        small.muted  {{ Number(user.amount) || 1 }} Cr
      span.muted(v-if="!filteredUsers.length") Ничего не найдено
</template>
<style scoped>
.gift-users { display: inline-flex; align-items: center; flex-wrap: wrap; gap: .25rem; }
.gift-users-modal { display: flex; flex-direction: row; flex-wrap: wrap; gap: .5rem; max-height: min(24rem, 60vh); overflow-y: auto; }
.gift-user { display: block; padding: .35rem .25rem; }
.gift-user mark { border-radius: .2rem; background: color-mix(in srgb, var(--primary-color, #18a058) 25%, transparent); }
</style>
