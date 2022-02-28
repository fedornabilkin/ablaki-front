<script setup>
import { computed } from "@vue/reactivity";
import { useStore } from "vuex";

const store = useStore();
const isAuthenticated = computed(() => store.getters['auth/isAuthenticated']);

const menuItems = computed(() => {
    let games = [
        {anchor: 'Ablaki', url: '/games/ablaki', title: 'Игра Ablaki', icon: 'apple'},
        {anchor: 'Орел-решка', url: '/games/orel', title: 'Игра Орел-решка', icon: 'coin'},
        {anchor: 'Дуэль', url: '/games/duel', title: 'Игра дуэль', icon: 'aim'},
        {anchor: '5 яблок', url: '/games/fiveapple', title: 'Игра 5 яблок', icon: 'collection'}     
    ];
    if (isAuthenticated.value) {
        return [
            ...games,
            // {anchor: 'Заказать выплату',url: 'balance/zakaz',title: 'Заказать выплату',icon: 'money'},
            // {anchor: 'Кабинет', url: '/users/profile', title: 'Кабинет', icon: 'user'},
            // {anchor: 'Выход', url: '/users/logout', title: 'Выход', icon: 'circle-close'}
        ]
    } else {
        return [
            {anchor: 'Войти', url: '/users/login', title: 'Авторизация', icon: 'user'},
            ...games
        ]
    }
})

</script>

<template>
    <div class="bg-white">
        <div class="menu-games">
            <router-link class="menu-games-item" v-for="item in menuItems" :key="item.url" :to="item.url">
                <el-button type="text" :icon="item.icon">{{ item.anchor }}</el-button>
            </router-link>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.menu-games {
    display: flex;
    justify-content: flex-start;
    margin: 0 2rem;

    .menu-games-item {
        font-size: 16px;
        
        .el-button {
            padding: 1rem;
            font-size: inherit;
            height: auto;
        }
    }
}
</style>