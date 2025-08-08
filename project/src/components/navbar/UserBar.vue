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

<template>
    <div class="user-bar">
        <div class="user-bar-left">
            <router-link :to="'/wall/' + user.username">
              <font-awesome-icon icon="fa fa-id-card"/>
              <el-button type="text">Стена {{ user.username }}</el-button>
            </router-link>
            
            <router-link to="/users/profile/">
              <font-awesome-icon icon="fa fa-user"/>
              <el-button type="text">Профиль</el-button>
            </router-link>

            <router-link to="/exchange">
              <font-awesome-icon icon="fa fa-exchange-alt"/>
              <el-button type="text">Биржа кредитов</el-button>
            </router-link>
        </div>
        
<!--        <user-accounts />-->
        
    </div>
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
