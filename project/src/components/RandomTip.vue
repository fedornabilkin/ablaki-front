<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { usePageRequest } from '@/hooks/usePageRequest';
import { randomTip, type Tip } from '@/services/api/header';
const route = useRoute();
const pathname = computed(() => route.path);
const { data } = usePageRequest(randomTip, null as Tip | null, [pathname]);
</script>
<template lang="pug">
aside.random-tip.container(v-if="data" aria-label="Случайная подсказка")
  font-awesome-icon.tip-icon(icon="fa fa-question-circle" aria-hidden="true")
  div
    strong Подсказка
    p {{ data.title }}
</template>
<style scoped>
.random-tip { display: flex; align-items: flex-start; gap: .75rem; padding: 1rem; margin-bottom: 1.5rem; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px; }
.tip-icon { flex-shrink: 0; margin-top: .2rem; color: var(--primary); }
.random-tip strong { display: block; margin-bottom: .25rem; font-size: .8rem; color: var(--text-muted); }
.random-tip p { margin: 0; white-space: pre-wrap; }
</style>
