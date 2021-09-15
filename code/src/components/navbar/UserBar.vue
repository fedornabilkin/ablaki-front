<template>
  <div class="userbar px-3">
        <span class="pr-1">
          Стена <router-link :to="'/users/wall/' + user.username">{{ user.username }}</router-link>
        </span>
    <span class="pr-1">
            <span class="amount">{{ user.balance }}</span>
            <span>Кг</span>
        </span>
    <span class="pr-1">
            <span class="amount">{{ user.credit }}</span>
            <span>Cr</span>
        </span>
    <span class="pr-1">
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
