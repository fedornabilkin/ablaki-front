<template>
    <div>
      <div>
        <router-link class="pr-2" :to="'/'">Ablaki</router-link>

        <router-link class="pr-2" v-for="item in menuTop" :key="item.url" :to="item.url">
          <font-awesome-icon :icon="item.icon"/>
          <span class="hidden-sm-down">{{ item.anchor }}</span>
        </router-link>
      </div>
    </div>
</template>

<script>
    export default {
        name: "NavBar",
        props: {
          menuTop: {type: Array},
        },
        data: function () {
            return {

            }
        },
    }
</script>

<style scoped>

</style>
