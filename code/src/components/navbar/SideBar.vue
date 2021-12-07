<script setup>
import { computed } from "@vue/reactivity";
import { useStore } from "vuex";

const store = useStore();
const isAuthenticated = computed(() => store.getters.isAuthenticated);

const menuItems = computed(() => {
    if (isAuthenticated.value) {
        return [
            {anchor: 'Ablaki', url: '/games/ablaki', title: 'Игра Ablaki', icon: 'apple-alt'},
            {anchor: 'Орел-решка', url: '/games/orel', title: 'Игра Орел-решка', icon: 'adjust'},
            {anchor: 'Дуэль', url: '/games/duel', title: 'Игра дуэль', icon: 'crosshairs'},
            {anchor: '5 яблок', url: '/games/fiveapple', title: 'Игра 5 яблок', icon: 'graduation-cap'},
            {anchor: 'Заказать выплату',url: 'balance/zakaz',title: 'Заказать выплату',icon: 'dollar-sign'},
            {anchor: 'Кабинет', url: '/users/profile', title: 'Кабинет', icon: 'user'},
            {anchor: 'Выход', url: '/users/logout', title: 'Выход', icon: 'sign-out-alt'}
        ]
    } else {
        return [
            {anchor: 'Войти', url: '/users/login', title: 'Авторизация', icon: 'sign-in-alt'},
            {anchor: 'Ablaki', url: '/games/ablaki', title: 'Игра Ablaki', icon: 'apple-alt'},
            {anchor: 'Орел-решка', url: '/games/orel', title: 'Игра Орел-решка', icon: 'adjust'},
            {anchor: 'Дуэль', url: '/games/duel', title: 'Игра дуэль', icon: 'crosshairs'},
            {anchor: '5 яблок', url: '/games/fiveapple', title: 'Игра 5 яблок', icon: 'graduation-cap'}
        ]
    }
})

</script>

<template>
    <router-link class="pe-2" v-for="item in menuItems" :key="item.url" :to="item.url">
        <font-awesome-icon class="pr-1" :icon="item.icon"/>
        <span class="hidden-sm-down">{{ item.anchor }}</span>
    </router-link>
</template>