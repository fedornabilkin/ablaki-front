<template>
    <div class="user-bar-right">
        <router-link to="/balance/pay">
            <el-button type="text">
                <el-icon><span>Кг</span></el-icon>
                <span>{{ user.person.balance }}</span>
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
                    :append-to-body="false"
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

        const roundCredits = (credits) => {
            return Math.round(credits * 10) / 10;
        }

        return {
            user,
            creditsTooltipAnimation,
            creditsTooltipContent,
            roundCredits,
        }
    },
}
</script>

<style lang="scss" scoped>
.user-bar-right {
    display: flex;
    align-items: center;
    gap: .5rem;
    font-weight: 600;

    .el-button {
        font-weight: 700;
    }

    .el-icon {
        font-style: normal;
    }
}
</style>
