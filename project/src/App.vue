<script setup lang="ts">
import { darkTheme, ruRU, dateRuRU, NConfigProvider, NLoadingBarProvider, NDialogProvider, NNotificationProvider, NMessageProvider } from 'naive-ui';
import NavBar from '@/components/navbar/NavBar.vue';
import Breadcrumbs from '@/components/Breadcrumbs.vue';
import NaiveApiRegistrar from '@/components/NaiveApiRegistrar.vue';
import { themeOverrides } from '@/theme/tokens';
import { useRoute } from 'vue-router';
import RequestState from '@/components/RequestState.vue';
const route = useRoute();
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
            breadcrumbs(v-if="!route.meta.hideBreadcrumbs")
            .container.page(v-if="!route.matched.length")
              request-state(:loading="true" error="")
            router-view(v-else)
          footer.site-footer.container Ablakin — каждый день!
</template>
<style scoped>
#content { scroll-margin-top: 13rem; }
</style>
<style>
.n-message, .n-notification {
  border: 1px solid var(--primary);
  box-shadow: 0 .5rem 1.5rem rgba(0, 0, 0, .5), 0 0 .75rem var(--primary-soft) !important;
}
</style>
