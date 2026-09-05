<script>
import { computed, ref } from '@vue/reactivity';
import { mapGetters, useStore } from 'vuex';
import UserBar from './UserBar.vue';
import { watch, onMounted, onUnmounted } from '@vue/runtime-core';
import { useRoute } from 'vue-router';
import UserAccounts from './UserAccounts.vue';
import { NPopover, NBadge } from 'naive-ui';
import { useChatStore } from '@/store/chat';

export default {
    components: { UserBar, UserAccounts, NPopover, NBadge },
    name: "NavBar",

    setup() {
        const route = useRoute();
        const store = useStore();
        const chatStore = useChatStore();
        const totalUnread = computed(() => chatStore.totalUnread);

        const showMenu = ref(false);
        const showUserMenu = ref(false);

        const isAuthenticated = computed(() => store.getters['auth/isAuthenticated']);

        const closeUserMenu = () => {
            showUserMenu.value = false;
        }

        const closeMenu = () => {
            showMenu.value = false;
        }

        watch(route, () => {
            closeUserMenu();
            closeMenu();
        });

        // sticky-хедер: сжатие при прокрутке (порог ~0.5rem ≈ 8px)
        const scrolled = ref(false);
        const onScroll = () => {
            scrolled.value = window.scrollY > 8;
        };
        onMounted(() => {
            window.addEventListener('scroll', onScroll, { passive: true });
            onScroll();
        });
        onUnmounted(() => {
            window.removeEventListener('scroll', onScroll);
        });

        return {
            showMenu,
            showUserMenu,
            isAuthenticated,
            scrolled,
            totalUnread,
        };
    }
};
</script>

<template>
  <div class="nav" :class="{ scrolled }">
    <div class="container">
      <div class="nav-links">

        <n-popover
            trigger="click"
            placement="bottom"
            :width="250"
            :show-arrow="false"
            v-model:show="showMenu"
        >
          <template #trigger>
            <button class="nav-link mobile-menu">
              <div class="mobile-menu-hamburger">
                <div class="line"></div>
                <div class="line"></div>
                <div class="line"></div>
              </div>
            </button>
          </template>

          <div class="mobile-nav-popper">
            <div class="mobile-nav">
              <router-link class="nav-link logo" to="/">
                <img src="@/assets/logo-spinning.gif" alt="">
                Ablakin
              </router-link>

              <router-link class="nav-link" to="/forum">
                <font-awesome-icon icon="fa fa-comments"/>
                Форум
              </router-link>

              <router-link class="nav-link" to="/chat" v-if="isAuthenticated">
                <font-awesome-icon icon="fa fa-comment"/>
                Чат
              </router-link>

              <router-link class="nav-link" to="/craft" v-if="isAuthenticated">
                <font-awesome-icon icon="fa fa-hammer"/>
                Крафт
              </router-link>

              <router-link class="nav-link" to="/city" v-if="isAuthenticated">
                <font-awesome-icon icon="fa fa-house"/>
                Строить город
              </router-link>

              <router-link class="nav-link" to="/wiki">
                <font-awesome-icon icon="fa fa-question-circle"/>
                Wiki
              </router-link>
            </div>
          </div>
        </n-popover>


        <router-link class="nav-link logo" to="/">
          <img src="@/assets/logo-spinning.gif" alt="">
          <span>Ablakin</span>
        </router-link>

        <router-link class="nav-link" to="/forum">
          <font-awesome-icon icon="fa fa-comments"/>
          Форум
        </router-link>

        <router-link class="nav-link" to="/chat" v-if="isAuthenticated">
          <n-badge :value="totalUnread" :max="99" :show="totalUnread > 0">
            <font-awesome-icon icon="fa fa-comment"/>
          </n-badge>
          Чат
        </router-link>

        <router-link class="nav-link" to="/craft" v-if="isAuthenticated">
          <font-awesome-icon icon="fa fa-hammer"/>
          Крафт
        </router-link>

        <router-link class="nav-link" to="/city" v-if="isAuthenticated">
          <font-awesome-icon icon="fa fa-house"/>
          Строить город
        </router-link>

        <router-link class="nav-link" to="/wiki">
          <font-awesome-icon icon="fa fa-question-circle"/>
          Wiki
        </router-link>
      </div>

      <div class="nav-user">

        <user-accounts v-if="isAuthenticated"/>

        <n-popover
            trigger="click"
            placement="bottom"
            :width="250"
            :show-arrow="false"
            v-model:show="showUserMenu"
        >
          <template #trigger>
            <div class="user-avatar">
              <font-awesome-icon icon="fa fa-user"/>
            </div>
          </template>

          <div class="user-menu-popper">
            <div class="user-menu-list" v-if="isAuthenticated">
              <user-bar v-if="isAuthenticated"/>

              <hr/>

              <router-link to="/users/logout" class="user-menu-link">
                <font-awesome-icon icon="fa fa-sign-out-alt"/>
                Выход
              </router-link>
            </div>
            <div class="user-menu-list" v-else>
              <router-link to="/users/login" class="user-menu-link">
                <font-awesome-icon icon="fa fa-sign-in-alt"/>
                Вход
              </router-link>

              <router-link to="/users/registration" class="user-menu-link">
                <font-awesome-icon icon="fa fa-plus"/>
                Регистрация
              </router-link>
            </div>
          </div>
        </n-popover>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.nav {
    box-shadow: 0 0.5rem 0.4375rem -0.125rem rgba(0, 0, 0, 0.45);
    background: var(--bg-surface);
    position: sticky;
    width: 100%;
    top: 0;
    left: 0;
    border-bottom: 0.0625rem solid var(--border);
    z-index: 2;
    transition: box-shadow 0.2s ease;

    // sticky-сжатие: после скролла уменьшаем паддинг ссылок и размер лого
    &.scrolled {
        box-shadow: 0 0.25rem 0.75rem -0.125rem rgba(0, 0, 0, 0.6);
        --nav-pad-y: var(--nav-pad-y-min);

        .nav-links .nav-link.logo {
            font-size: var(--nav-logo-min);
        }
    }

    .container {
        display: flex;
        justify-content: space-between;
        align-items: stretch;
        flex-wrap: nowrap;
    }

    .nav-links {
        display: flex;
        // align-items: stretch;
        align-items: center;
        font-size: .9rem;

        .nav-link {
            // mobile-first: на узком экране обычные ссылки скрыты, видны с ≥36rem
            display: none;
            color: var(--text-muted);
            padding: var(--nav-pad-y) 1rem;
            align-items: center;
            gap: .6rem;
            font-weight: 600;
            position: relative;
            transition: padding 0.2s ease, font-size 0.2s ease;

            @media (min-width: 36rem) {
                display: flex;
            }

            &:hover {
                color: var(--primary);
            }

            &.logo {
                font-size: var(--nav-logo);
                padding: var(--nav-pad-y) 1rem;

                img {
                    width: 1.5625rem;
                    height: auto;
                }
            }

            &.mobile-menu {
                // mobile-first: бургер виден по умолчанию, прячется с ≥36rem
                display: flex;
                position: relative;
                width: 2.1875rem;
                height: 100%;
                min-height: 3.125rem;
                padding: 0;
                margin: 0;
                border: none;
                background: none;

                .mobile-menu-hamburger {
                    width: 100%;
                    height: 1.5625rem;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-evenly;
                    align-items: center;
                    background: transparent;

                    .line {
                        width: 60%;
                        height: 0.125rem;
                        background: var(--text-muted);
                        border-radius: 0.375rem;
                    }
                }

                @media (min-width: 36rem) {
                    display: none;
                }
            }

            &.router-link-active {
                &::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 10%;
                    width: 80%;
                    height: 0.25rem;
                    background: var(--primary);
                    border-radius: 0.25rem;
                }
            }
        }
    }

    .nav-user {
        display: flex;
        flex-direction: row;
        align-items: center;
    }

    .user-avatar {
        display: flex;
        align-items: center;
        padding: 0.625rem;
        cursor: pointer;
        transition: .2s;
        border-radius: 50%;
        color: var(--text);

        &:hover {
            background: var(--bg-surface-2);
        }

        img {
            width: 1.875rem;
            height: 1.875rem;
            object-fit: cover;
            border-radius: 50%;
            margin-right: .3rem;
        }
    }
}

:deep(.user-menu-popper) {
    padding: 0 !important;
    background: var(--bg-surface-2);
}

.user-menu-popper {
    padding: 0 !important;
    background: var(--bg-surface-2);

    .user-menu-list {
        display: flex;
        flex-direction: column;
        // padding: .4rem 0;
        // min-width: 250px;

        .user-menu-link {
            color: var(--text);
            display: flex;
            gap: .8rem;
            padding: .4rem;
            border-radius: 0.3125rem;
            align-items: center;

            &:hover {
                background: var(--bg-surface);
                color: var(--primary);
            }
        }

        :deep(.user-bar) {
            flex-direction: column;

            .user-bar-right {
                border-radius: 0.375rem;
                background: var(--bg-surface);
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                padding: 0.5rem 1rem;
                order: 1;

                & > div {
                    color: var(--text-muted);
                    font-size: .9rem;
                }
            }

            .user-bar-left {
                order: 2;
                margin-top: .5rem;

                & > a {
                    @extend .user-menu-link;
                }
            }
        }
    }
}

.mobile-nav-popper {
    .mobile-nav {
        .nav-link {
            color: var(--text-muted);
            padding: 0.5rem 0.4rem;
            display: flex;
            align-items: center;
            gap: .6rem;
            font-weight: 400;
            position: relative;

            &:hover {
                color: var(--primary);
            }
        }
    }
}
</style>
