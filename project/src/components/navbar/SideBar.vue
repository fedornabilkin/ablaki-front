<script setup>
import { computed } from "@vue/reactivity";
import { useStore } from "vuex";

const store = useStore();
const isAuthenticated = computed(() => store.getters['auth/isAuthenticated']);

const menuItems = computed(() => {
    let games = [
        {anchor: 'Сапер', url: '/games/saper', title: 'Игра сапер', icon: 'fa fa-apple-alt'},
        {anchor: 'Орел-решка', url: '/games/orel', title: 'Игра Орел-решка', icon: 'fa fa-adjust'},
        {anchor: 'Дуэль', url: '/games/duel', title: 'Игра дуэль', icon: 'fa fa-crosshairs'},
        {anchor: '5 яблок', url: '/games/fiveapple', title: 'Игра 5 яблок', icon: 'fa fa-graduation-cap'}
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
  .bg-white
    .container.menu-games
      router-link.menu-games-item(v-for='item in menuItems' :key='item.url' :to='item.url')
        el-button(type='text')
          font-awesome-icon.mx-1(:icon='item.icon')
          | {{ item.anchor }}

</template>

<style lang="scss" scoped>
@import "bootstrap/scss/functions";
@import "bootstrap/scss/variables";
@import "bootstrap/scss/mixins";

.menu-games {
    display: flex;
    justify-content: flex-start;
    // margin: 0 2rem;

    @include media-breakpoint-down(sm) {
        justify-content: space-around;
    }

    .menu-games-item {
        font-size: 16px;
        position: relative;

        &.router-link-active {
            // border-bottom: 1px solid var(--el-color-primary);
            // border-bottom-color: var(--el-color-primary);

            &::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 10%;
                width: 80%;
                height: 4px;
                // background: rgb(198 206 230);
                background: #009688;
                border-radius: 4px;
            }
        }
        
        :deep(.el-button) {
            padding: 1rem;
            font-size: inherit;
            height: auto;

            @include media-breakpoint-down(sm) {
                display: flex;
                flex-direction: column;
                padding: .8rem 0;

                & [class*=el-icon] + span {
                    margin-left: unset;
                    font-size: .9rem;
                }
            }

            & > span {
                @include media-breakpoint-down(sm) {
                    margin-top: .5rem;
                }
            }
        }
    }
}
</style>