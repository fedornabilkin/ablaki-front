<script setup>
import { computed } from "@vue/reactivity";
import { useStore } from "vuex";

const store = useStore();
const isAuthenticated = computed(() => store.getters['auth/isAuthenticated']);

const menuItems = computed(() => {
    let games = [
        {anchor: 'Saper', url: '/games/saper', title: 'Игра Saper', icon: 'apple'},
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
        <div class="container menu-games">
            <router-link class="menu-games-item" v-for="item in menuItems" :key="item.url" :to="item.url">
                <el-button type="text" :icon="item.icon">{{ item.anchor }}</el-button>
            </router-link>
        </div>
    </div>
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