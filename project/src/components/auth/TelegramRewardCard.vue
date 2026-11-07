<script setup lang="ts">
import { NButton } from 'naive-ui';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faGift, faCheck, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import type { TelegramReward } from '@/services/api/telegramReward';
defineProps<{ reward: TelegramReward; busy?: boolean; disabled?: boolean }>();
defineEmits<{ claim: []; link: [] }>();
</script>
<template lang="pug">
section.telegram-reward(aria-label="Подарок за Telegram")
  .reward-heading
    font-awesome-icon(:icon="reward.claimed ? faCheck : faGift" aria-hidden="true")
    strong {{ reward.claimed ? 'Подарок получен' : reward.linked ? 'Ваш подарок за Telegram' : 'Привяжите Telegram — получите подарок' }}
  ul.reward-items
    li(v-for="item in reward.items" :key="item.code") {{ item.name }} × {{ item.quantity }}
  template(v-if="!reward.claimed")
    p.reward-note Один раз, в рюкзак. Набор сохранится, пока вы освобождаете место.
    n-button(v-if="!reward.linked" :disabled="disabled" @click="$emit('link')")
      template(#icon)
        font-awesome-icon(:icon="faPaperPlane" aria-hidden="true")
      | Привязать Telegram
    n-button(v-else-if="reward.canClaim" type="primary" :loading="busy" :disabled="disabled || busy" @click="$emit('claim')") Получить подарок
    p.reward-note(v-else role="status") {{ reward.blockedReason }}
</template>
<style scoped>
.telegram-reward { display: grid; justify-items: start; gap: .7rem; padding: 1rem; border: 1px solid var(--border); border-radius: .75rem; background: var(--bg-surface); min-width: 0; }
.reward-heading { display: flex; gap: .6rem; align-items: baseline; }
.reward-heading svg { color: var(--primary); flex: none; }
.reward-items { display: flex; flex-wrap: wrap; gap: .4rem 1rem; padding: 0; margin: 0; list-style: none; font-size: .9rem; }
.reward-note { color: var(--text-muted); font-size: .8rem; margin: 0; }
</style>
