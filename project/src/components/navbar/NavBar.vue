<script setup lang="ts">
import { computed, ref, watch, onMounted, onScopeDispose } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { NButton, NDrawer, NDrawerContent } from 'naive-ui';
import { navigation } from '@/config/navigation';
import HeaderAccount from './HeaderAccount.vue';
import DailyRewards from './DailyRewards.vue';
import OnlineUsers from './OnlineUsers.vue';
const store = useStore();
const route = useRoute();
const open = ref(false);
const user = computed(() => store.getters['auth/user']);
const links = computed(() => navigation.filter(link => !link.account || user.value));
const desktopLinks = computed(() => links.value.filter(link => !link.account));
const compact = ref(false);
function updateCompact() {
  // Separate thresholds keep the header stable when its own height changes.
  if (!compact.value && window.scrollY > 160) compact.value = true;
  else if (compact.value && window.scrollY < 24) compact.value = false;
}
onMounted(() => { updateCompact(); window.addEventListener('scroll', updateCompact, { passive: true }); });
onScopeDispose(() => { window.removeEventListener('scroll', updateCompact); });
const loginTarget = computed(() => route.path === '/users/login' ? route.fullPath : { path: '/users/login', query: { redirect: route.fullPath } });
watch(() => route.fullPath, () => { open.value = false; });
watch(compact, value => { if (value) open.value = false; });
</script>
<template lang="pug">
header.site-header(:class="{ compact }")
  .container.navbar
    router-link.brand(to="/" aria-label="Ablakin — главная")
      img.brand-logo(src="/ablakin-fire-logo.png" alt="" width="40" height="40" decoding="async")
      span.brand-name(v-if="!compact") ablakin
    .nav-account
      header-account(v-if="user" :compact="compact")
      .guest-actions(v-else)
        router-link.nav-item(to="/users/registration") Регистрация
        router-link(:to="loginTarget" custom v-slot="{ href, navigate }")
          n-button(tag="a" :href="href" @click="navigate" type="primary" secondary) Войти
  .container.header-nav(v-if="!compact")
    online-users(:collapsed="compact")
    daily-rewards(v-if="user")
    nav.desktop-nav(aria-label="Основная навигация")
      router-link.nav-item(v-for="link in desktopLinks" :key="link.to" :to="link.to")
        font-awesome-icon(:icon="link.icon" aria-hidden="true")
        | {{ link.title }}
    n-button.menu-button(quaternary aria-label="Открыть меню" :aria-expanded="open" aria-controls="mobile-navigation" @click="open = true")
      template(#icon)
        font-awesome-icon(icon="bars")
  n-drawer(v-model:show="open" placement="right" width="min(20rem, 100vw)")
    n-drawer-content(title="Навигация" closable)
      nav#mobile-navigation.mobile-nav(aria-label="Мобильная навигация")
        router-link.nav-item(to="/") Главная
        router-link.nav-item(v-for="link in links" :key="link.to" :to="link.to")
          font-awesome-icon(:icon="link.icon" aria-hidden="true")
          | {{ link.title }}
        router-link.nav-item(v-if="user" to="/users/profile") Мой профиль
        router-link.nav-item(v-if="user" to="/users/logout") Выйти
        router-link.nav-item.login-link(v-else :to="loginTarget" aria-label="Войти" title="Войти")
          font-awesome-icon(icon="sign-in-alt" aria-hidden="true")
          span.login-label Войти
        router-link.nav-item(v-if="!user" to="/users/registration") Регистрация
</template>
<style scoped lang="scss">
.site-header { position: sticky; top: 0; z-index: 50; background: var(--bg-surface); border-bottom: 1px solid var(--border); }
.navbar, .nav-account, .desktop-nav, .header-nav, .guest-actions { display: flex; align-items: center; gap: .5rem; }
.navbar { min-height: 4.5rem; flex-wrap: nowrap; padding-block: .35rem; transition: min-height .18s ease; }
.compact .navbar { min-height: 3.25rem; }
.compact { box-shadow: none; }
.header-nav { justify-content: flex-start; padding-bottom: .35rem; overflow-x: auto; }
.header-nav > * { flex-shrink: 0; }
.header-nav .menu-button { margin-left: auto; }
.brand { display: inline-flex; align-items: center; gap: .5rem; min-height: 2.75rem; font-size: 1.4rem; font-weight: 800; letter-spacing: -.04em; color: var(--primary); transition: font-size .18s ease; }
.compact .brand { font-size: 1.2rem; }
.brand-logo { display: block; width: 2.5rem; height: 2.5rem; object-fit: contain; flex-shrink: 0; }
.compact .brand-logo { width: 2rem; height: 2rem; }
.desktop-nav { display: none; }
.menu-button { width: 2.75rem; }
.desktop-nav .nav-item { border-radius: 0; border-bottom: .125rem solid transparent; padding-inline: .5rem; white-space: nowrap; }
.desktop-nav .router-link-active { border-bottom-color: var(--primary); color: var(--text); background: transparent; }
.nav-account { min-width: 0; flex: 1; justify-content: flex-end; margin-left: auto; }
.guest-actions { flex-wrap: wrap; justify-content: flex-end; }
.login-link { display: inline-flex; align-items: center; gap: .35rem; }
.mobile-nav { display: grid; gap: .5rem; }
@media (max-width: 47.99rem) {
  .brand { font-size: 1rem; gap: .25rem; flex-shrink: 0; }
  .brand-logo { width: 2rem; height: 2rem; }
  .brand-name { display: none; }
  .navbar { gap: .25rem; }
  .compact .navbar { flex-wrap: nowrap; }
  .compact .navbar > .nav-account { flex-basis: auto; }
}
@media (min-width: 64rem) { .desktop-nav { display: flex; margin-right: auto; } }
</style>
