<script setup lang="ts">
import GameHistoryPanel from '../GameHistoryPanel.vue';
defineProps<{ reloadListTrigger?: boolean }>();
</script>
<template lang="pug">
game-history-panel(kind="five" :reload-list-trigger="reloadListTrigger")
</template>
