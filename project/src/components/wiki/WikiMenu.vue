<script setup lang="ts">
import { computed } from 'vue';
import { WikiMenuVisitor, type WikiNode } from '@/entities/wiki/tree';
import WikiMenuBranch from './WikiMenuBranch.vue';
const props = defineProps<{ nodes: readonly WikiNode[] }>();
const items = computed(() => props.nodes.map(node => node.accept(new WikiMenuVisitor())));
</script>
<template lang="pug">
nav(aria-label="Разделы Wiki")
  wiki-menu-branch(:items="items")
</template>
