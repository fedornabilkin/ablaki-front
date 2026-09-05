<script>
import { computed } from '@vue/reactivity';
import { useStore } from 'vuex';
import UserAccounts from './UserAccounts.vue';
import { NButton } from 'naive-ui';

export default {
    components: { UserAccounts, NButton },
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
        n-button(text) Стена {{ user.username }}
      router-link(to='/users/profile/')
        font-awesome-icon(icon='fa fa-user')
        n-button(text) Профиль
      router-link(to='/exchange')
        font-awesome-icon(icon='fa fa-exchange-alt')
        n-button(text) Биржа кредитов

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

        .n-divider {
            display: none;
        }
    }
}
</style>
