<template>
    <div class="user-bar">
        <div class="user-bar-left">
            <router-link :to="'/users/wall/' + user.username">
                <el-button type="text" icon="postcard">Стена {{ user.username }}</el-button>
            </router-link>
        </div>
        
        <div class="user-bar-right">
            <div>
                <span>{{ user.person.balance }}</span>
                <span>Кг</span>
            </div>
            <div>
                <el-tooltip
                    effect="dark"
                    :content="creditsTooltipContent"
                    placement="top"
                    v-model="creditsTooltipAnimation"
                    :manual="true"
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
        </div>
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
.user-bar {
    display: flex;

    .user-bar-left {
        flex-grow: 1;
    }

    .user-bar-right {
        display: flex;
        align-items: center;
        gap: .5rem;
    }
}
</style>
