<template>
    <div class="nav">
        <router-link class="pe-2 logo" :to="'/'">
            <el-button type="text">Ablaki</el-button>
        </router-link>

        <router-link
            class="pe-2"
            v-for="item in menuItems"
            :key="item.url"
            :to="item.url"
        >
            <el-button type="text" :icon="item.icon">{{ item.anchor }}</el-button>
            <!-- <el-link :icon="item.icon">{{ item.anchor }}</el-link> -->
            <!-- <el-icon><component :is="item.icon"/></el-icon> -->
            <!-- <font-awesome-icon :icon="item.icon" /> -->
            <!-- <span class="hidden-sm-down">{{ item.anchor }}</span> -->
        </router-link>
    </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
	name: "NavBar",
	data: function () {
		return {};
	},
    created: function () {

    },
    computed: {
        ...mapGetters([
            'isAuthenticated',
        ]),
        menuItems() {
            let items = [
                {anchor: 'Форум', url: '/forum', title: 'Форум', icon: 'comment'},
                {anchor: 'Wiki', url: '/wiki', title: 'wiki', icon: 'question-filled'},
            ];
            
            if (!this.isAuthenticated) {
                items.push({anchor: 'Регистрация', url: '/users/registration', title: 'Регистрация', icon: 'circle-plus-filled'});
                items.push({anchor: 'Войти', url: '/users/login', title: 'Авторизация', icon: 'user-filled'});
            } else {
                items.push({anchor: 'Выход', url: '/users/logout', title: 'Выход', icon: 'circle-close-filled'});
            }

            return items;
        }
    }
};
</script>

<style lang="scss" scoped>
.logo {
    .el-button {
        font-size: 1.2rem;
    }
}

// .nav {
//     position: sticky;
//     width: 100%;
//     top: 0;
//     left: 0;
//     border-bottom: 1px solid var(--border-color);
// }
</style>