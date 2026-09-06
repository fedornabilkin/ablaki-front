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
    router-link.brand(to="/" aria-label="Ablakin — главная")
      font-awesome-icon(icon="fire" aria-hidden="true")
      | ablakin
    nav.desktop-nav(aria-label="Основная навигация")
      router-link.nav-item(v-for="link in desktopLinks" :key="link.to" :to="link.to")
        font-awesome-icon(:icon="link.icon" aria-hidden="true")
        | {{ link.title }}
    .nav-account
      router-link.nav-item.account-link(v-if="user" to="/users/profile") {{ user.username }}
      router-link.nav-item(v-else :to="loginTarget") Войти
      n-button.menu-button(quaternary aria-label="Открыть меню" :aria-expanded="open" aria-controls="mobile-navigation" @click="open = true")
        template(#icon)
          font-awesome-icon(icon="bars")
  .container.header-details
    header-account(v-if="user" :compact="compact")
      online-users
    online-users(v-else)
  n-drawer(v-model:show="open" placement="right" width="min(20rem, 100vw)")
    n-drawer-content(title="Навигация" closable)
      nav#mobile-navigation.mobile-nav(aria-label="Мобильная навигация")
        router-link.nav-item(to="/") Главная
        router-link.nav-item(v-for="link in links" :key="link.to" :to="link.to")
          font-awesome-icon(:icon="link.icon" aria-hidden="true")
          | {{ link.title }}
        router-link.nav-item(v-if="user" to="/users/profile") Мой профиль
        router-link.nav-item(v-if="user" to="/users/logout") Выйти
        router-link.nav-item(v-else :to="loginTarget") Войти
        router-link.nav-item(v-if="!user" to="/users/registration") Регистрация
</template>
<style scoped lang="scss">
.site-header { position: sticky; top: 0; z-index: 50; background: var(--bg-surface); border-bottom: 1px solid var(--border); }
.navbar, .nav-account, .desktop-nav { display: flex; align-items: center; gap: .5rem; }
.navbar { min-height: 4.5rem; justify-content: space-between; transition: min-height .18s ease; }
.compact .navbar { min-height: 3.25rem; }
.compact { box-shadow: 0 .375rem 1.125rem var(--bg-base); }
.header-details { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .25rem .5rem; padding-block: .35rem .75rem; }
.compact .header-details { padding-block: 0 .25rem; }
.brand { display: inline-flex; align-items: center; gap: .5rem; min-height: 2.75rem; font-size: 1.4rem; font-weight: 800; letter-spacing: -.04em; color: var(--primary); transition: font-size .18s ease; }
.compact .brand { font-size: 1.2rem; }
.desktop-nav { display: none; }
.account-link { display: block; max-width: 6rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.menu-button { width: 2.75rem; }
.desktop-nav .nav-item { border-radius: 0; border-bottom: .125rem solid transparent; padding-inline: .5rem; white-space: nowrap; }
.desktop-nav .router-link-active { border-bottom-color: var(--primary); color: var(--text); background: transparent; }
.nav-account { min-width: 0; }
.mobile-nav { display: grid; gap: .5rem; }
@media (min-width: 64rem) { .desktop-nav { display: flex; } .account-link { max-width: 8rem; } }
</style>
