<template>
    <div class="user-bar-right">
        <router-link to="/balance/pay">
            <el-button type="text">
                <el-tooltip
                    effect="dark"
                    :content="balanceTooltipContent"
                    placement="bottom"
                    v-model:visible="balanceTooltipAnimation"
                    :manual="true"
                >
                    <div>
                        <el-icon><span>Кг</span></el-icon>
                        <span>{{ roundBalance(user.person.balance) }}</span>
                    </div>
                </el-tooltip>
            </el-button>
        </router-link>

        <el-divider direction="vertical"></el-divider>
        
        <router-link to="/exchange">
            <el-button type="text">
                <el-tooltip
                    effect="dark"
                    :content="creditsTooltipContent"
                    placement="bottom"
                    v-model:visible="creditsTooltipAnimation"
                    :manual="true"
                >
                    <div>
                        <el-icon>Cr</el-icon>
                        <span>{{ roundCredits(user.person.credit) }}</span>
                    </div>
                </el-tooltip>
            </el-button>
        </router-link>

        <el-divider direction="vertical"></el-divider>

        <router-link to="/top">
            <el-button type="text" icon="star">
                <!-- <el-icon><star /></el-icon> -->
                <span>{{ user.person.rating }}</span>
            </el-button>
        </router-link>

        <el-divider direction="vertical"></el-divider>
    </div>

</template>

<script>
import { computed, ref } from '@vue/reactivity';
import { useStore } from 'vuex';
import { watch } from '@vue/runtime-core';

export default {
    setup() {
        const store = useStore();
        const user = computed(() => store.getters['auth/user']);
        const creditsTooltipAnimation = ref(false);
        const creditsTooltipContent = ref("");
        const creditsTooltipAnimationTimeout = ref();

        const balanceTooltipAnimation = ref(false);
        const balanceTooltipContent = ref("");
        const balanceTooltipAnimationTimeout = ref();

        watch(() => user.value?.person?.credit, (value, oldValue) => {
            let diff = roundCredits(value - oldValue);
            let displayedDiff = `${diff < 0 ? '-' : '+'}${Math.abs(diff)}`;

            creditsTooltipContent.value = `${displayedDiff} Cr`
            creditsTooltipAnimation.value = true;

            clearTimeout(creditsTooltipAnimationTimeout.value);
            creditsTooltipAnimationTimeout.value = setTimeout(() => {
                creditsTooltipAnimation.value = false;
            }, 2500);
        });

        watch(() => user.value?.person?.balance, (value, oldValue) => {
            let diff = roundBalance(value - oldValue);
            let displayedDiff = `${diff < 0 ? '-' : '+'}${Math.abs(diff)}`;

            balanceTooltipContent.value = `${displayedDiff} Cr`
            balanceTooltipAnimation.value = true;

            clearTimeout(balanceTooltipAnimationTimeout.value);
            balanceTooltipAnimationTimeout.value = setTimeout(() => {
                balanceTooltipAnimation.value = false;
            }, 2500);
        });

        const roundCredits = (credits) => {
            return Math.round(credits * 10) / 10;
        }
        
        const roundBalance = (credits) => {
            return Math.round(credits * 100) / 100;
        }

        return {
            user,
            creditsTooltipAnimation,
            creditsTooltipContent,
            balanceTooltipAnimation,
            balanceTooltipContent,
            roundCredits,
            roundBalance,
        }
    },
}
</script>

<style lang="scss" scoped>
@import "~bootstrap/scss/functions";
@import "~bootstrap/scss/variables";
@import "~bootstrap/scss/mixins";

.user-bar-right {
    display: flex;
    align-items: center;
    gap: .5rem;
    font-weight: 600;

    @include media-breakpoint-down(sm) {
        gap: 0rem;
        font-size: 1.1rem;

        :deep(.el-button) {
            font-size: 0.8rem;
        }
    }

    .el-button {
        font-weight: 700;
    }

    .el-icon {
        font-style: normal;
    }
}
</style>
