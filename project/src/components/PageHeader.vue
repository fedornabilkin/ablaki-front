<script setup lang="ts">
defineProps<{ pageTitle: string; extraLinks?: { link: string; title: string; icon?: string; type?: string }[] }>();
</script>
<template lang="pug">
.page-header
  .container.stack
    .page-heading
      h1 {{ pageTitle }}
      .actions
        slot(name="actions")
    nav.tab-links(v-if="extraLinks?.length" aria-label="Разделы страницы")
      router-link.nav-item(v-for="link in extraLinks" :key="link.link" :to="link.link" exact-active-class="selected") {{ link.title }}
</template>
<style scoped lang="scss">
.page-header { padding: 1.5rem 0; background: var(--bg-surface); border-bottom: 1px solid var(--border); }
.page-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; }
h1 { margin: 0; font-size: clamp(1.5rem, 4vw, 2rem); }
.tab-links { display: flex; gap: .5rem; overflow-x: auto; }
.selected { color: var(--primary); background: var(--primary-soft); }
</style>
