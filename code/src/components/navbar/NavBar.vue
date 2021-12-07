<template>
    <div>
        <router-link class="pe-2" :to="'/'">Ablaki</router-link>

        <router-link
            class="pe-2"
            v-for="item in menuItems"
            :key="item.url"
            :to="item.url"
        >
            <font-awesome-icon :icon="item.icon" />
            <span class="hidden-sm-down">{{ item.anchor }}</span>
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
                {anchor: 'Форум', url: '/forum', title: 'Форум', icon: 'comments'},
                {anchor: 'Wiki', url: '/wiki', title: 'wiki', icon: 'question-circle'},
            ];
            
            if (!this.isAuthenticated) {
                items.push({anchor: 'Регистрация', url: '/users/registration', title: 'Регистрация', icon: 'plus'});
                items.push({anchor: 'Войти', url: '/users/login', title: 'Авторизация', icon: 'sign-in-alt'});
            } else {
                items.push({anchor: 'Выход', url: '/users/logout', title: 'Выход', icon: 'sign-out-alt'});
            }

            return items;
        }
    }
};
</script>

<style scoped>
</style>
