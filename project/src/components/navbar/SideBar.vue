<script setup>
import { computed } from "@vue/reactivity";
import { useStore } from "vuex";
import { NButton } from "naive-ui";

const store = useStore();
const isAuthenticated = computed(() => store.getters['auth/isAuthenticated']);

const menuItems = computed(() => {
    let games = [
        {anchor: 'Сапер', url: '/games/saper', title: 'Игра сапер', icon: 'fa fa-apple-alt'},
        {anchor: 'Орел-решка', url: '/games/orel', title: 'Игра Орел-решка', icon: 'fa fa-adjust'},
        {anchor: 'Дуэль', url: '/games/duel', title: 'Игра дуэль', icon: 'fa fa-crosshairs'},
        {anchor: '5 яблок', url: '/games/five', title: 'Игра 5 яблок', icon: 'fa fa-apple-alt'}
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

<template lang="pug">
  .sidebar-bar
    .container.menu-games
      router-link.menu-games-item(v-for='item in menuItems' :key='item.url' :to='item.url')
        n-button(text)
          template(#icon)
            font-awesome-icon(:icon='item.icon')
          | {{ item.anchor }}

</template>

<style lang="scss" scoped>
.sidebar-bar {
    background: var(--bg-surface);
    border-bottom: 0.0625rem solid var(--border);
}

.menu-games {
    display: flex;
    // mobile-first: на узком экране пункты распределяются равномерно
    justify-content: space-around;
    // margin: 0 2rem;

    @media (min-width: 36rem) {
        justify-content: flex-start;
    }

    .menu-games-item {
        font-size: 1rem;
        position: relative;

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

        :deep(.n-button) {
            // mobile-first: на узком экране иконка над подписью
            display: flex;
            flex-direction: column;
            padding: .8rem 0;
            font-size: inherit;
            height: auto;

            & .n-button__icon + span {
                margin-left: unset;
                margin-top: .5rem;
                font-size: .9rem;
            }

            @media (min-width: 36rem) {
                flex-direction: row;
                padding: 1rem;

                & .n-button__icon + span {
                    margin-top: 0;
                    font-size: inherit;
                }
            }
        }
    }
}
</style>