<template>
    <div class="nav">
        <div class="nav-links">
            <router-link class="nav-link logo active" to="/">
                <!-- <el-button type="text">Ablaki</el-button> -->
                Ablaki
            </router-link>

            <router-link class="nav-link" to="/forum">
                <el-icon><comment /></el-icon>Форум
            </router-link>

            <router-link class="nav-link" to="/wiki">
                <el-icon><question-filled /></el-icon>Wiki
            </router-link>
        </div>

        <!-- <el-tabs>
            <el-tab-pane label="User" name="first" />
            <el-tab-pane label="Config" name="second" />
            <el-tab-pane label="Role" name="third" />
            <el-tab-pane label="Task" name="fourth" />
        </el-tabs> -->

        <!-- <el-dropdown class="user-menu" trigger="click">
            <span>
                <el-icon size="20"><avatar /></el-icon>
            </span>
            <template #dropdown>
                <el-dropdown-menu>
                    <el-dropdown-item>
                        <router-link to="/users/wall/a">
                            <el-button type="text" icon="postcard">Стена</el-button>
                        </router-link>
                    </el-dropdown-item>
                    <el-dropdown-item>
                        <router-link to="/users/profile">Кабинет</router-link>
                    </el-dropdown-item>
                    <el-dropdown-item>
                        <router-link to="/users/wall/qweqwe">Стена</router-link>
                    </el-dropdown-item>
                    <el-dropdown-item divided>
                        <router-link to="/users/logout">Выход</router-link>
                    </el-dropdown-item>
                </el-dropdown-menu>
            </template>
        </el-dropdown> -->

        <!-- v-model:visible="isMenuOpened"
        :hide-after="0" -->
        <el-popover
            trigger="click"
            placement="bottom"
            width="250px"
            popper-class="user-menu-popper"
            :popper-options="{ boundariesElement: 'viewport' }"
            :offset="0"
            :show-arrow="false"
            
        >
            <div class="user-menu-list" v-if="isAuthenticated">
                <user-bar v-if="isAuthenticated"/>
                <!-- <router-link :to="`/users/wall/${user.username}`" class="user-menu-link">
                    <el-icon size="20"><postcard /></el-icon>Стена
                </router-link>

                <router-link to="/users/profile" class="user-menu-link">
                    <el-icon size="20"><user /></el-icon>Кабинет
                </router-link> -->

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
                    <img src="https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg" alt="">
                    <el-icon><arrow-down /></el-icon>
                </div>
            </template>
        </el-popover>
    </div>
</template>

<script>
import { mapGetters } from 'vuex';
import UserBar from './UserBar.vue';

export default {
    components: { UserBar },
    name: "NavBar",
    data: function () {
        return {
            isMenuOpened: false,
        };
    },
    computed: {
        ...mapGetters('auth', [
            'isAuthenticated',
            'user',
        ]),
        menuItems() {
            let items = [
                {anchor: 'Форум', url: '/forum', title: 'Форум', icon: 'comment'},
                {anchor: 'Wiki', url: '/wiki', title: 'wiki', icon: 'question-filled'},
            ];
            
            if (!this.isAuthenticated) {
                // items.push({anchor: 'Регистрация', url: '/users/registration', title: 'Регистрация', icon: 'circle-plus-filled'});
                // items.push({anchor: 'Войти', url: '/users/login', title: 'Авторизация', icon: 'user-filled'});
            } else {
                // items.push({anchor: 'Выход', url: '/users/logout', title: 'Выход', icon: 'circle-close-filled'});
            }

            return items;
        }
    },
    methods: {
        toggleMenu () {
            this.isMenuOpened = !this.isMenuOpened;
        },
        closeMenu () {
            this.isMenuOpened = false;
        }
    },
    watch: {
        $route (to, from) {
            this.closeMenu();
        }
    }
};
</script>

<style lang="scss" scoped>
.logo {
    font-size: 1.2rem;
    margin-left: 1rem;
}

.nav {
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
            color: #333333;
            padding: 0.5rem 1rem;
            display: flex;
            align-items: center;
            gap: .6rem;
            border-bottom: 2px solid transparent;

            &:hover {
                color: var(--el-color-primary);
                background: #f5f4f4;
            }

            &.router-link-active {
                border-bottom-color: var(--el-color-primary);
            }
        }
    }

    .user-menu {
        width: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 1rem;
    }

    .user-avatar {
        display: flex;
        align-items: center;
        padding: 10px;
        margin-right: 1rem;
        cursor: pointer;

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
                // margin: .6rem;
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