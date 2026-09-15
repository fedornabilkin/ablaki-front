<script setup lang="ts">
import type { WikiMenuItem } from '@/entities/wiki/tree';
defineProps<{ items: readonly WikiMenuItem[] }>();
</script>
<template lang="pug">
ul.wiki-menu
  li(v-for="item in items" :key="item.key")
    details(v-if="item.children?.length" open)
      summary
        router-link(:to="item.to") {{ item.title }}
      wiki-menu-branch(:items="item.children")
    router-link(v-else :to="item.to") {{ item.title }}
</template>
<style scoped>
.wiki-menu { padding-left: 1.25rem; }
li { margin-block: .5rem; overflow-wrap: anywhere; }
.router-link-exact-active { font-weight: 700; color: var(--primary); }
</style>
