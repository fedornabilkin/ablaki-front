<script setup lang="ts">
import { computed, ref, watch, onMounted, onScopeDispose } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { NButton } from 'naive-ui';
import { navigation, activeNavigation } from '@/config/navigation';
import HeaderAccount from './HeaderAccount.vue';
import DailyRewards from './DailyRewards.vue';
import OnlineUsers from './OnlineUsers.vue';
const store = useStore();
const route = useRoute();
const user = computed(() => store.getters['auth/user']);
const guest = computed(() => ['guest', 'error'].includes(store.getters['auth/authStatus']) && !user.value);
const links = computed(() => navigation.filter(link => !link.account || user.value));
const activeSection = computed(() => activeNavigation(route.path));
const worldSection = computed(() => route.path === '/world' || route.path.startsWith('/world/'));
const menuOpen = ref(false);
const menuToggle = ref<HTMLButtonElement>();
watch(() => route.fullPath, () => { menuOpen.value = false; });
function closeMenu() {
  if (!menuOpen.value) return;
  menuOpen.value = false;
  menuToggle.value?.focus();
}
const compact = ref(false);
const header = ref<HTMLElement>();
let headerObserver: ResizeObserver | undefined;
function updateCompact() {
  // Separate thresholds keep the header stable when its own height changes.
  if (!compact.value && window.scrollY > 160) compact.value = true;
  else if (compact.value && window.scrollY < 24) compact.value = false;
}
onMounted(() => {
  updateCompact(); window.addEventListener('scroll', updateCompact, { passive: true });
  const measure = () => document.documentElement.style.setProperty('--site-header-height', `${header.value?.getBoundingClientRect().height || 0}px`);
  measure(); headerObserver = new ResizeObserver(measure);
  if (header.value) headerObserver.observe(header.value);
});
onScopeDispose(() => { window.removeEventListener('scroll', updateCompact); headerObserver?.disconnect(); });
const loginTarget = computed(() => route.path === '/users/login' ? route.fullPath : { path: '/users/login', query: { redirect: route.fullPath } });
</script>
<template lang="pug">
header.site-header(ref="header" :class="{ compact, 'world-section': worldSection, 'menu-open': menuOpen }" @keydown.esc="closeMenu")
  .container.navbar
    router-link.brand(to="/" aria-label="Ablakin — главная")
      img.brand-logo(src="/ablakin-fire-logo.png" alt="" width="40" height="40" decoding="async")
      span.brand-name(v-show="!compact") ablakin
    .nav-account
      header-account(v-if="user" :compact="compact")
      .guest-actions(v-else-if="guest")
        router-link.nav-item(to="/users/registration") Регистрация
        router-link(:to="loginTarget" custom v-slot="{ href, navigate }")
          n-button(tag="a" :href="href" @click="navigate" type="primary" secondary) Войти
    button.nav-toggle(ref="menuToggle" type="button" :aria-label="menuOpen ? 'Закрыть меню' : 'Все разделы сайта'" :aria-expanded="menuOpen" aria-controls="site-navigation" @click="menuOpen = !menuOpen")
      font-awesome-icon(:icon="menuOpen ? 'xmark' : 'bars'" aria-hidden="true")
  .container.header-nav#site-navigation(v-show="!compact || menuOpen")
    .header-utilities
      online-users
      daily-rewards(v-if="user")
    nav.desktop-nav(aria-label="Основная навигация")
      router-link.nav-item(v-for="link in links" :key="link.to" :to="link.to" :class="{'account-link': link.account, 'section-active': activeSection === link.to}" :aria-current="activeSection === link.to ? 'page' : undefined" :aria-label="link.title")
        font-awesome-icon(:icon="link.icon" aria-hidden="true")
        span.nav-label {{ link.title }}
      router-link.nav-item.nav-logout(v-if="user" to="/users/logout" aria-label="Выйти")
        font-awesome-icon(icon="sign-out-alt" aria-hidden="true")
        span.nav-label Выйти
    router-link.menu-profile(v-if="user" to="/users/profile")
      font-awesome-icon(icon="user" aria-hidden="true")
      span {{ user.username }}
</template>
<style scoped lang="scss">
.site-header { position: sticky; top: 0; z-index: 50; background: var(--bg-surface); border-bottom: 1px solid var(--border); }
.navbar, .nav-account, .desktop-nav, .header-nav, .header-utilities, .guest-actions { display: flex; align-items: center; gap: .5rem; }
.world-section > .container { max-width: 1320px; }
.navbar { min-height: 3.25rem; flex-wrap: nowrap; padding-block: .25rem; transition: min-height .18s ease; }
.compact .navbar { min-height: 3.25rem; }
.compact { box-shadow: none; }
.header-nav { justify-content: flex-start; flex-wrap: wrap; padding-bottom: .25rem; gap: .25rem; }
.header-utilities { display: none; }
.brand { display: inline-flex; align-items: center; gap: .5rem; min-height: 2.75rem; font-size: 1.4rem; font-weight: 800; letter-spacing: -.04em; color: var(--primary); transition: font-size .18s ease; }
.compact .brand { font-size: 1.2rem; }
.brand-logo { display: block; width: 2rem; height: 2rem; object-fit: contain; flex-shrink: 0; }
.compact .brand-logo { width: 2rem; height: 2rem; }
.desktop-nav { display: flex; gap: .25rem; min-width: 0; margin-right: auto; }
.nav-label { display: none; }
.desktop-nav .nav-item { justify-content: center; min-width: 2.75rem; border-radius: 0; border-bottom: .125rem solid transparent; padding-inline: .5rem; white-space: nowrap; font-size: .8125rem; }
.desktop-nav .nav-item:nth-of-type(n+6), .desktop-nav .nav-logout { display: none; }
.desktop-nav .section-active { border-bottom-color: var(--primary); color: var(--primary); background: transparent; }
.nav-account { min-width: 0; flex: 1; justify-content: flex-end; margin-left: auto; }
.guest-actions { flex-wrap: wrap; justify-content: flex-end; }
.nav-toggle { display: inline-grid; place-items: center; flex: 0 0 2.75rem; width: 2.75rem; height: 2.75rem; padding: 0; border: 1px solid transparent; border-radius: .5rem; color: var(--text-muted); background: transparent; cursor: pointer; }
.nav-toggle:hover, .nav-toggle[aria-expanded='true'] { color: var(--primary); background: var(--primary-soft); }
.menu-profile { display: none; min-width: 0; min-height: 2.75rem; align-items: center; gap: .5rem; font-size: .8125rem; overflow-wrap: anywhere; }
.menu-open .desktop-nav { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); width: 100%; }
.menu-open .desktop-nav .nav-item { display: flex; justify-content: flex-start; padding-inline: .25rem; white-space: normal; }
.menu-open .nav-label { display: inline; }
.menu-open .header-utilities { display: flex; order: 2; margin-right: auto; }
.menu-open .menu-profile { display: inline-flex; order: 3; }
@media (max-width: 47.99rem) {
  .brand { font-size: 1rem; gap: .25rem; flex-shrink: 0; }
  .brand-logo { width: 2rem; height: 2rem; }
  .brand-name { display: none; }
  .navbar { gap: .25rem; }
  .compact .navbar { flex-wrap: nowrap; }
  .compact .navbar > .nav-account { flex-basis: auto; }
}
@media (min-width: 64rem) {
  .navbar { min-height: 3.75rem; }
  .brand-logo { width: 2.5rem; height: 2.5rem; }
  .nav-label { display: inline; }
  .header-utilities { display: flex; }
  .desktop-nav { flex-wrap: wrap; gap: .125rem; }
  .desktop-nav .nav-item:nth-of-type(n+6), .desktop-nav .nav-logout { display: inline-flex; }
  .site-header:not(.compact):not(.menu-open) .nav-toggle { display: none; }
}
</style>
