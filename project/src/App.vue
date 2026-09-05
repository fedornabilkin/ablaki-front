<script setup lang="ts">
import { darkTheme, ruRU, dateRuRU, NConfigProvider, NLoadingBarProvider, NDialogProvider, NNotificationProvider, NMessageProvider } from 'naive-ui';
import NavBar from '@/components/navbar/NavBar.vue';
import NaiveApiRegistrar from '@/components/NaiveApiRegistrar.vue';
import { themeOverrides } from '@/theme/tokens';
</script>
<template lang="pug">
n-config-provider(:theme="darkTheme" :theme-overrides="themeOverrides" :locale="ruRU" :date-locale="dateRuRU")
  n-loading-bar-provider
    n-dialog-provider
      n-notification-provider
        n-message-provider
          naive-api-registrar
          a.skip-link(href="#content") К содержимому
          nav-bar
          main#content(tabindex="-1")
            router-view
          footer.site-footer.container Ablakin · Игры и общение
</template>
