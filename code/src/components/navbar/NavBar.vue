<script>
import { computed, ref } from '@vue/reactivity';
import { mapGetters, useStore } from 'vuex';
import UserBar from './UserBar.vue';
import { watch } from '@vue/runtime-core';
import { useRoute } from 'vue-router';
import UserAccounts from './UserAccounts.vue';

export default {
    components: { UserBar, UserAccounts },
    name: "NavBar",

    setup() {
        const route = useRoute();
        const store = useStore();

        const popoverUserMenuRef = ref();
        const popoverMenuRef = ref();

        const isAuthenticated = computed(() => store.getters['auth/isAuthenticated']);

        const closeUserMenu = () => {
            popoverUserMenuRef.value.hide();
        }

        const closeMenu = () => {
            popoverMenuRef.value.hide();
        }

        watch(route, () => {
            closeUserMenu();
            closeMenu();
        });

        return {
            popoverUserMenuRef,
            popoverMenuRef,
            isAuthenticated,
        };
    }
};
</script>

<template>
    <div class="nav">
        <div class="container">
            <div class="nav-links">

                <el-popover
                    ref="popoverMenuRef"
                    trigger="click"
                    :manual="true"
                    placement="bottom"
                    width="250px"
                    popper-class="mobile-nav-popper"
                    :offset="0"
                    :show-arrow="false"
                    :persistent="false"
                    transition="el-zoom-in-top"
                >

                    <div class="mobile-nav">
                        <router-link class="nav-link logo" to="/">
                            <el-icon><monitor /></el-icon>Ablaki
                        </router-link>

                        <router-link class="nav-link" to="/forum">
                            <el-icon><comment /></el-icon>Форум
                        </router-link>

                        <router-link class="nav-link" to="/wiki">
                            <el-icon><question-filled /></el-icon>Wiki
                        </router-link>
                    </div>

                    <template #reference>
                        <button class="nav-link mobile-menu">
                            <div class="mobile-menu-hamburger">
                                <div class="line"></div>
                                <div class="line"></div>
                                <div class="line"></div>
                            </div>
                        </button>
                    </template>
                </el-popover>

                
                <router-link class="nav-link logo" to="/">
                    <img src="@/assets/logo-spinning.gif" alt="">
                    <span>Ablaki</span>
                </router-link>

                <router-link class="nav-link" to="/forum">
                    <el-icon><comment /></el-icon>Форум
                </router-link>

                <router-link class="nav-link" to="/wiki">
                    <el-icon><question-filled /></el-icon>Wiki
                </router-link>
            </div>

            <div class="nav-user">

                <user-accounts v-if="isAuthenticated" />

                <el-popover
                    ref="popoverUserMenuRef"
                    trigger="click"
                    :manual="true"
                    placement="bottom"
                    width="250px"
                    popper-class="user-menu-popper"
                    :offset="0"
                    :show-arrow="false"
                    :persistent="false"
                    transition="el-zoom-in-top"
                >
                    <div class="user-menu-list" v-if="isAuthenticated">
                        <user-bar v-if="isAuthenticated"/>

                        <hr />

                        <router-link to="/users/logout" class="user-menu-link">
                            <el-icon size="20"><circle-close /></el-icon>Выход
                        </router-link>
                    </div>
                    <div class="user-menu-list" v-else>
                        <router-link to="/users/login" class="user-menu-link">
                            <el-icon size="20"><user /></el-icon>Вход
                        </router-link>

                        <router-link to="/users/registration" class="user-menu-link">
                            <el-icon size="20"><circle-plus /></el-icon>Регистрация
                        </router-link>
                    </div>
                    <template #reference>
                        <div class="user-avatar">
                            <el-icon><user-filled /></el-icon>
                        </div>
                    </template>
                </el-popover>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "~bootstrap/scss/functions";
@import "~bootstrap/scss/variables";
@import "~bootstrap/scss/mixins";

.nav {
    box-shadow: 0 8px 7px -2px rgb(67 95 138 / 7%);
    background: #ffffff;
    position: sticky;
    width: 100%;
    top: 0;
    left: 0;
    border-bottom: 1px solid var(--border-color);
    z-index: 2;

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
            color: #585858;
            padding: 0.75rem 1rem;
            display: flex;
            align-items: center;
            gap: .6rem;
            font-weight: 600;
            position: relative;

            @include media-breakpoint-down(sm) {
                font-size: .9rem;
                padding: 0.5rem;
            }

            @include media-breakpoint-down(sm) {
                display: none;
            }

            &:hover {
                color: var(--el-color-primary);
            }

            &.logo {
                font-size: 1.1rem;
                padding: 0.95rem 1rem;

                img {
                    width: 25px;
                    height: auto;
                }
            }

            &.mobile-menu {
                display: none;
                position: relative;
                width: 35px;
                height: 100%;
                min-height: 50px;
                padding: 0;
                margin: 0;
                border: none;
                background: none;

                .mobile-menu-hamburger {
                    width: 100%;
                    height: 25px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-evenly;
                    align-items: center;
                    background: #fff;

                    .line {
                        width: 60%;
                        height: 2px;
                        background: grey;
                        border-radius: 6px;
                    }
                }

                @include media-breakpoint-down(sm) {
                    display: flex;
                }
            }

            &.router-link-active {
                &::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 10%;
                    width: 80%;
                    height: 4px;
                    background: #009688;
                    border-radius: 4px;
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
        padding: 10px;
        cursor: pointer;
        transition: .2s;
        border-radius: 50%;

        &:hover {
            background: #f5f4f4;
        }

        img {
            width: 30px;
            height: 30px;
            object-fit: cover;
            border-radius: 50%;
            margin-right: .3rem;
        }
    }
}

:deep(.user-menu-popper) {
    padding: 0 !important;
    background: #ccc;
}

.user-menu-popper {
    padding: 0 !important;
    background: #ccc;

    .user-menu-list {
        display: flex;
        flex-direction: column;
        // padding: .4rem 0;
        // min-width: 250px;

        .user-menu-link {
            color: #333333;
            display: flex;
            gap: .8rem;
            padding: .4rem;
            border-radius: 5px;
            align-items: center;

            &:hover {
                background: #fafafa;
            }
        }

        :deep(.user-bar) {
            flex-direction: column;

            .user-bar-right {
                border-radius: 6px;
                background: #f0f2f5;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                padding: 0.5rem 1rem;
                order: 1;

                & > div {
                    color: #666666;
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
            color: #666;
            padding: 0.5rem 0.4rem;
            display: flex;
            align-items: center;
            gap: .6rem;
            font-weight: 400;
            position: relative;
        }
    }
}
</style>