<script setup>
import { computed } from "@vue/reactivity";
import { useStore } from "vuex";

const store = useStore();
const isAuthenticated = computed(() => store.getters.isAuthenticated);

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
            {anchor: 'Заказать выплату',url: 'balance/zakaz',title: 'Заказать выплату',icon: 'money'},
            {anchor: 'Кабинет', url: '/users/profile', title: 'Кабинет', icon: 'user'},
            {anchor: 'Выход', url: '/users/logout', title: 'Выход', icon: 'circle-close'}
        ]
    } else {
        return [
            {anchor: 'Войти', url: '/users/login', title: 'Авторизация', icon: 'sign-in-alt'},
            ...games
        ]
    }
})

</script>

<template>
    <div class="">
        <router-link class="pe-2" v-for="item in menuItems" :key="item.url" :to="item.url">
            <el-button type="text" :icon="item.icon">{{ item.anchor }}</el-button>
            <!-- <font-awesome-icon class="pr-1" :icon="item.icon"/> -->
            <!-- <span class="hidden-sm-down">{{ item.anchor }}</span> -->
        </router-link>
    </div>
</template>