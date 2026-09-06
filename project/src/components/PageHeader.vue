<script setup lang="ts">
defineProps<{ pageTitle: string; extraLinks?: { link: string; title: string; icon?: string; type?: string }[] }>();
</script>
<template lang="pug">
.page-header.container
  .stack
    .page-heading
      h1 {{ pageTitle }}
      .actions
        slot(name="actions")
    nav.tab-links(v-if="extraLinks?.length" aria-label="Разделы страницы")
      router-link.nav-item(v-for="link in extraLinks" :key="link.link" :to="link.link" active-class="" exact-active-class="selected") {{ link.title }}
</template>
<style scoped lang="scss">
.page-header { margin-top: 1.25rem; padding: 1.125rem 1.25rem; background: var(--bg-surface); border: 1px solid var(--border); border-radius: .5rem; }
.page-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; }
h1 { margin: 0; font-size: clamp(1.5rem, 4vw, 2rem); }
.tab-links { display: flex; flex-wrap: wrap; gap: .375rem; }
.actions { display: flex; flex-wrap: wrap; gap: .5rem; min-width: 0; }
.actions :deep(a) { display: inline-flex; align-items: center; min-height: 2.75rem; }
.selected { color: var(--primary); background: var(--primary-soft); }
</style>
