<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { breadcrumbs } from '@/services/breadcrumbs';
const route = useRoute();
const items = computed(() => breadcrumbs(route.path, route.params));
</script>
<template lang="pug">
nav.breadcrumbs.container(aria-label="Хлебные крошки")
  ol
    li(v-for="(item, index) in items" :key="index")
      span.separator(v-if="index" aria-hidden="true") / 
      router-link(v-if="item.to" :to="item.to") {{ item.title }}
      span(v-else aria-current="page") {{ item.title }}
</template>
<style scoped>
.breadcrumbs { padding-top: .75rem; }
ol { list-style: none; display: flex; flex-wrap: wrap; gap: .4rem; padding: 0; margin: 0; font-size: .85rem; }
li { display: flex; align-items: center; gap: .4rem; min-width: 0; overflow-wrap: anywhere; }
.separator, [aria-current] { color: var(--text-muted); }
</style>
