<template lang="pug">
  .user-bar-right
    router-link(to='/balance/pay')
      n-button(text)
        n-tooltip(trigger="manual" :show='balanceTooltipAnimation' placement='bottom')
          template(#trigger)
            div
              span Кг
              span {{ roundBalance(user.person.balance) }}
          | {{ balanceTooltipContent }}
    n-divider(vertical)


    n-button(v-if="checkAvailableBonusEvery()" text @click="addBonus()")
      template(#icon)
        font-awesome-icon.text-warning.jello-horizontal(icon='fa fa-coins')
    router-link(to='/exchange')
      n-button(text)
        n-tooltip(trigger="manual" :show='creditsTooltipAnimation' placement='bottom')
          template(#trigger)
            div
              span Cr
              span {{ roundCredits(user.person.credit) }}
          | {{ creditsTooltipContent }}
    n-divider(vertical)

    n-button(v-if="checkAvailableRatingEvery()" text @click="addRating()")
      template(#icon)
        font-awesome-icon.text-warning.jello-horizontal(icon='fa fa-star')
    font-awesome-icon.text-success(v-if="!checkAvailableRatingEvery()" icon='fa fa-star')
    router-link(to='/top')
      n-button(text)
        span {{ user.person.rating }}
    n-divider(vertical)
</template>

<script>
import { computed, ref } from '@vue/reactivity';
import { useStore } from 'vuex';
import { watch } from '@vue/runtime-core';
import { ratingApi } from '@/services/api/rating';
import { NButton, NTooltip, NDivider, useNotification } from 'naive-ui';
import {bonusApi} from "@/services/api/bonus.js";

export default {
    components: { NButton, NTooltip, NDivider },
    setup() {
        const store = useStore();
        const notification = useNotification();
        const user = computed(() => store.getters['auth/user']);
        const isAvailableRatingEvery = ref(true);
        const isAvailableBonusEvery = ref(true);
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

      const notify = (payload) => {
        const type = ['info', 'success', 'warning', 'error'].includes(payload.type) ? payload.type : 'info';
        notification[type]({
          title: payload.title,
          content: payload.message,
          duration: 4500,
        });
      }

      const addRating = () => {
        const payload = {title: 'Рейтинг', message: 'Что-то пошло не так', type: 'info'}
        ratingApi.every()
            .then((response) => {
              payload.type = 'success'
              payload.message = 'Рейтинг успешно добавлен'
              if (response !== true && response.message !== undefined) {
                payload.type = 'warning'
                payload.message = response.message
              }
              isAvailableRatingEvery.value = false
            })
            .catch((err) => {
              console.log(err)
              payload.type = 'error'
              payload.message = err.message
            })
            .finally(() => {
              notify(payload)
            })
      }

      const addBonus = () => {
        const payload = {title: 'Бонус', message: 'Что-то пошло не так', type: 'info'}
        bonusApi.every()
            .then((response) => {
              payload.type = 'success'
              payload.message = 'Бонус успешно получен'
              if (response !== true && response.message !== undefined) {
                payload.type = 'warning'
                payload.message = response.message
              }
              isAvailableBonusEvery.value = false
            })
            .catch((err) => {
              console.log(err)
              payload.type = 'error'
              payload.message = err.message
            })
            .finally(() => {
              notify(payload)
            })
      }

        const checkAvailableRatingEvery = () => {
          return isAvailableRatingEvery.value
        }

        const checkAvailableBonusEvery = () => {
          return isAvailableBonusEvery.value
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
          addBonus,
          checkAvailableRatingEvery,
          checkAvailableBonusEvery,
        }
    },
}
</script>

<style lang="scss" scoped>
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

    @media (max-width: 575.98px) {
        gap: 0rem;
        font-size: 1.1rem;

        :deep(.n-button) {
            font-size: 0.8rem;
        }
    }

    .n-button {
        font-weight: 700;
    }
}
</style>
