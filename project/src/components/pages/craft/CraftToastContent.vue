<script setup lang="ts">
defineProps<{text: string; duration: number}>();
</script>
<template lang="pug">
.craft-toast
  span {{ text }}
  .toast-track(aria-hidden="true")
    .toast-progress(:style="{animationDuration: duration + 'ms'}")
</template>
<style scoped>
.craft-toast { min-width: 180px; max-width: min(360px, 65vw); padding-block: .2rem; }
.toast-track { height: 3px; margin-top: .6rem; border-radius: 2px; background: #ffffff15; overflow: hidden; }
.toast-progress { height: 100%; background: #72ce92; transform-origin: left; animation: toast-countdown linear forwards; }
@keyframes toast-countdown { from { transform: scaleX(1); } to { transform: scaleX(0); } }
</style>
