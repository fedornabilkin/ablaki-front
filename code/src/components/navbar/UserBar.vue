<template>
    <div class="userbar p-x-1 bg-primary">
        <router-link :to="'/users/wall/' + user.username">Стена {{ user.username}}</router-link>
        <span class="">
            <span class="amount">{{ user.balance }}</span>
            <span>Кг</span>
        </span>
        <span class="">
            <span class="amount">{{ user.credit }}</span>
            <span>Cr</span>
        </span>
        <span class="">
            <span class="fa fa-star" aria-hidden="true"></span>
          <font-awesome-icon :icon="'star'"/>
            <span class="amount">{{ user.rating }}</span>
        </span>
    </div>
</template>

<script>
    export default {
        name: "UserBar",
        props: {
            user: {
                type: Object,
            },
        },
        data: function () {
            return {

            }
        },
    }
</script>

<style scoped>

</style>
