<script setup lang="ts">
import { computed, ref, watch, onMounted, onScopeDispose } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { NButton, NDrawer, NDrawerContent } from 'naive-ui';
import { navigation } from '@/config/navigation';
import HeaderAccount from './HeaderAccount.vue';
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
  if (!compact.value && window.scrollY > 96) compact.value = true;
  else if (compact.value && window.scrollY < 24) compact.value = false;
}
onMounted(() => { updateCompact(); window.addEventListener('scroll', updateCompact, { passive: true }); });
onScopeDispose(() => { window.removeEventListener('scroll', updateCompact); });
const loginTarget = computed(() => route.path === '/users/login' ? route.fullPath : { path: '/users/login', query: { redirect: route.fullPath } });
watch(() => route.fullPath, () => { open.value = false; });
</script>
<template lang="pug">
header.site-header(:class="{ compact }")
  .container.navbar
    router-link.brand(to="/" aria-label="Ablakin — главная") ablakin<span>.</span>
    nav.desktop-nav(aria-label="Основная навигация")
      router-link.nav-item(v-for="link in desktopLinks" :key="link.to" :to="link.to") {{ link.title }}
    .nav-account
      router-link.nav-item.account-link(v-if="user" to="/users/profile") {{ user.username }}
      router-link.nav-item(v-else :to="loginTarget") Войти
      n-button.menu-button(aria-label="Открыть меню" :aria-expanded="open" @click="open = true") Меню
  .container.header-details
    header-account(v-if="user" :compact="compact")
      online-users
    online-users(v-else)
  n-drawer(v-model:show="open" placement="right" :width="300")
    n-drawer-content(title="Навигация" closable)
      nav.mobile-nav(aria-label="Мобильная навигация")
        router-link.nav-item(to="/") Главная
        router-link.nav-item(v-for="link in links" :key="link.to" :to="link.to") {{ link.title }}
        router-link.nav-item(v-if="user" to="/users/profile") Мой профиль
        router-link.nav-item(v-if="user" to="/users/logout") Выйти
        router-link.nav-item(v-else to="/users/registration") Регистрация
</template>
<style scoped lang="scss">
.site-header { position: sticky; top: 0; z-index: 50; background: var(--bg-surface); border-bottom: 1px solid var(--border); }
.navbar, .nav-account, .desktop-nav { display: flex; align-items: center; gap: .5rem; }
.navbar { min-height: 72px; justify-content: space-between; transition: min-height .18s ease; }
.compact .navbar { min-height: 52px; }
.compact { box-shadow: 0 6px 18px var(--bg-base); }
.header-details { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .25rem .5rem; padding-block: .35rem .75rem; }
.compact .header-details { padding-block: 0 .25rem; }
.brand { font-size: 1.6rem; font-weight: 800; letter-spacing: -.06em; color: var(--text); }
.brand span { color: var(--primary); }
.desktop-nav { display: none; }
.account-link { max-width: 115px; overflow: hidden; text-overflow: ellipsis; }
.nav-account { min-width: 0; }
.mobile-nav { display: grid; gap: .5rem; }
@media (min-width: 1100px) { .desktop-nav { display: flex; } }
</style>
