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
            <router-link :to="'/users/wall/' + user.username">
                <el-button type="text" icon="postcard">Стена {{ user.username }}</el-button>
            </router-link>
            
            <router-link to="/users/profile/">
                <el-button type="text" icon="user">Профиль</el-button>
            </router-link>

            <router-link to="/exchange">
                <el-button type="text" icon="refresh">Биржа кредитов</el-button>
            </router-link>
        </div>
        
        <user-accounts />
        
        <!--div class="user-bar-right">
            <div>
                <span>{{ user.person.balance }}</span>
                <span>Кг</span>
            </div>
            <div>
                <el-tooltip
                    effect="dark"
                    :content="creditsTooltipContent"
                    placement="top"
                    v-model:visible="creditsTooltipAnimation"
                    :manual="true"
                    :append-to-body="false"
                >
                    <div>
                        <span>{{ roundCredits(user.person.credit) }}</span>
                        <span>Cr</span>
                    </div>
                </el-tooltip>
            </div>
            <div>
                <el-icon style="vertical-align: text-top;"><star /></el-icon>
                <span>{{ user.person.rating }}</span>
            </div>
        </div-->
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
