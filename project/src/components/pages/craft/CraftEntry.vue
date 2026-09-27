<script setup lang="ts">
import { useRoute } from 'vue-router';
import Workshop from './Workshop.vue';
import WorldWorkspace from '../world/WorldWorkspace.vue';
const route = useRoute();
</script>
<template lang="pug">
world-workspace(v-if="route.query.node !== undefined")
workshop(v-else)
</template>
