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

        const popoverRef = ref();

        const isAuthenticated = computed(() => store.getters['auth/isAuthenticated']);

        const closeMenu = () => {
            popoverRef.value.hide();
        }

        watch(route, () => {
            closeMenu();
        });

        return {
            popoverRef,
            isAuthenticated,
        };
    }
};
</script>

<template>
    <div class="nav">
        <div class="nav-links">
            <router-link class="nav-link logo" to="/">
                <!-- <el-button type="text">Ablaki</el-button> -->
                <img src="@/assets/logo-spinning.gif" alt="">
                Ablaki
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
                ref="popoverRef"
                trigger="click"
                :manual="true"
                placement="bottom"
                width="250px"
                popper-class="user-menu-popper"
                :offset="0"
                :show-arrow="false"
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
                    <div class="user-avatar" @click="toggleMenu">
                        <!-- <img src="https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg" alt=""> -->
                        <el-icon><user-filled /></el-icon>
                    </div>
                </template>
            </el-popover>
        </div>
        
    </div>
</template>

<style lang="scss" scoped>
@import "~bootstrap/scss/functions";
@import "~bootstrap/scss/variables";
@import "~bootstrap/scss/mixins";

.logo {
    font-size: 1.2rem;
    margin-left: 1rem;
}

.nav {
    box-shadow: 0 20px 7px -13px rgb(67 95 138 / 7%);
    background: #ffffff;
    position: sticky;
    width: 100%;
    top: 0;
    left: 0;
    border-bottom: 1px solid var(--border-color);
    z-index: 1;
    display: flex;
    justify-content: space-between;
    // align-items: center;
    align-items: stretch;
    flex-wrap: nowrap;

    .nav-links {
        display: flex;
        align-items: stretch;

        .nav-link {
            color: #585858;
            padding: 0.5rem 1rem;
            display: flex;
            align-items: center;
            gap: .6rem;
            border-bottom: 2px solid transparent;
            font-weight: 600;

            @include media-breakpoint-down(sm) {
                font-size: .9rem;
                padding: 0.5rem;
            }

            &:hover {
                color: var(--el-color-primary);
                background: #f5f4f4;
            }

            &.router-link-active {
                border-bottom-color: var(--el-color-primary);
            }
        }
    }

    .nav-user {
        display: flex;
        flex-direction: row;
        align-items: center;

        .user-bar-right {
            @include media-breakpoint-down(sm) {
                display: none;
            }
        }
    }

    .user-avatar {
        display: flex;
        align-items: center;
        padding: 10px;
        margin-right: 1rem;
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
        padding: .4rem 0;
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
</style>