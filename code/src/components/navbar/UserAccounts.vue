<template>
    <div class="user-bar-right">
        <router-link to="/balance/pay">
            <el-link type="primary">
                <span>{{ user.person.balance }}</span>
                <span>Кг</span>
            </el-link>
        </router-link>

        <el-divider direction="vertical"></el-divider>
        
        <router-link to="/exchange">
            <el-tooltip
                effect="dark"
                :content="creditsTooltipContent"
                placement="bottom"
                v-model:visible="creditsTooltipAnimation"
                :manual="true"
                :append-to-body="false"
            >
                <div>
                    <span>{{ roundCredits(user.person.credit) }}</span>
                    <span>Cr</span>
                </div>
            </el-tooltip>
        </router-link>

        <el-divider direction="vertical"></el-divider>

        <router-link to="/top">
            <el-button type="text">
                <el-icon style="vertical-align: text-top;"><star /></el-icon>
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
}
</style>
