<script>
import { computed } from '@vue/reactivity';
import { useStore } from 'vuex';
import UserAccounts from './UserAccounts.vue';

export default {
    components: { UserAccounts },
    setup() {
        const store = useStore();
        const user = computed(() => store.getters['auth/user']);

        return {
            user,
        }
    },
}
</script>

<template lang="pug">
  .user-bar
    .user-bar-left
      router-link(:to="'/wall/' + user.username")
        font-awesome-icon(icon='fa fa-id-card')
        el-button(type='text') Стена {{ user.username }}
      router-link(to='/users/profile/')
        font-awesome-icon(icon='fa fa-user')
        el-button(type='text') Профиль
      router-link(to='/exchange')
        font-awesome-icon(icon='fa fa-exchange-alt')
        el-button(type='text') Биржа кредитов

</template>

<style lang="scss" scoped>
.user-bar {
    display: flex;

    .user-bar-left {
        flex-grow: 1;
    }

    :deep(.user-bar-right) {
        display: flex;
        align-items: center;
        gap: 0;

        .el-divider {
            display: none;            
        }
    }
}
</style>
