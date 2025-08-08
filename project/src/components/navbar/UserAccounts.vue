<template lang="pug">
  .user-bar-right
    router-link(to='/balance/pay')
      el-button(type='text')
        el-tooltip(effect='dark' :content='balanceTooltipContent' placement='bottom' v-model:visible='balanceTooltipAnimation' :manual='true')
          div
            el-icon
              span &Kcy;&gcy;
            span {{ roundBalance(user.person.balance) }}
    el-divider(direction='vertical')
    router-link(to='/exchange')
      el-button(type='text')
        el-tooltip(effect='dark' :content='creditsTooltipContent' placement='bottom' v-model:visible='creditsTooltipAnimation' :manual='true')
          div
            el-icon Cr
            span {{ roundCredits(user.person.credit) }}
    el-divider(direction='vertical')

    el-button(v-if="checkAvailableRatingEvery()" type='text' @click="addRating()")
      font-awesome-icon.text-warning.jello-horizontal(icon='fa fa-star')
    font-awesome-icon.text-success(v-if="!checkAvailableRatingEvery()" icon='fa fa-star')
    router-link(to='/top')
      el-button(type='text')
        span {{ user.person.rating }}
    el-divider(direction='vertical')
</template>

<script>
import { computed, ref } from '@vue/reactivity';
import { useStore } from 'vuex';
import { watch } from '@vue/runtime-core';
import { ratingApi } from '@/services/api/rating';
import {ElNotification} from "element-plus";

export default {
    setup() {
        const store = useStore();
        const user = computed(() => store.getters['auth/user']);
        const isAvailableRatingEvery = ref(true);
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

        const addRating = () => {
          const notify = {title: 'Рейтинг', message: 'Что-то пошло не так', type: 'info'}
          ratingApi.every()
              .then((response) => {
                notify.type = 'success'
                notify.message = 'Рейтинг успешно добавлен'
                if (response !== true && response.message !== undefined) {
                  notify.type = 'warning'
                  notify.message = response.message
                }
                isAvailableRatingEvery.value = false
              })
              .catch((err) => {
                console.log(err)
                notify.type = 'error'
                notify.message = err.message
              })
              .finally(() => {
                ElNotification(notify)
              })
        }

        const checkAvailableRatingEvery = () => {
          return isAvailableRatingEvery.value
        }

        return {
            user,
            creditsTooltipAnimation,
            creditsTooltipContent,
            balanceTooltipAnimation,
            balanceTooltipContent,
            roundCredits,
            roundBalance,
          addRating,
          checkAvailableRatingEvery,
        }
    },
}
</script>

<style lang="scss" scoped>
@import "bootstrap/scss/functions";
@import "bootstrap/scss/variables";
@import "bootstrap/scss/mixins";

.jello-horizontal{
  animation:jello-horizontal 5s linear both;
  animation-iteration-count: infinite;
  animation-delay: 2s;
}
@keyframes jello-horizontal{
  0%{transform:scale3d(1,1,1)}
  3%{transform:scale3d(1.25,.75,1)}
  4%{transform:scale3d(.75,1.25,1)}
  5%{transform:scale3d(1.15,.85,1)}
  6%{transform:scale3d(.95,1.05,1)}
  7%{transform:scale3d(1.05,.95,1)}
  100%{transform:scale3d(1,1,1)}
}

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
