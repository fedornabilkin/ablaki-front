<script setup lang="ts">
import { NResult } from 'naive-ui';
</script>
<template lang="pug">
.container.page
  n-result(status="info" title="Раздел пока недоступен" description="Этот раздел ещё не подключён к действующему серверу.")
    template(#footer)
      router-link.nav-item(to="/games") К доступным играм
      router-link.nav-item(to="/forum") На форум
</template>
