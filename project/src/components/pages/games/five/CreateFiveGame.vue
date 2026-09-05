<script setup>
import { ref } from "@vue/reactivity";
import { NModal, NButton, NInputNumber, useNotification } from 'naive-ui';
import { five } from '@/services/api/games/five.js';
import { errorHandler } from "@/services/api/errorHandler.js";

const props = defineProps({
  isOpen: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'gameCreated']);

const konList = [10, 20, 50, 100, 200, 500];
const balls = [1, 2, 3, 4, 5];

const kon = ref(10);
const ball = ref(3);
const isLoading = ref(false);
const notification = useNotification();

const closeDialog = () => {
  emit('close');
};

const createGame = () => {
  isLoading.value = true;
  five.create(kon.value, ball.value)
      .then(() => {
        notification.success({ content: 'Партия создана', duration: 4500 });
        emit('gameCreated');
        emit('close');
      })
      .catch((err) => {
        errorHandler(err, (msg) => notification.warning({
          content: msg || 'Что-то пошло не так',
          duration: 4500,
        }));
      })
      .finally(() => {
        isLoading.value = false;
      });
};
</script>

<template lang="pug">
  n-modal(:show="isOpen" preset="card" title="Новая партия «5 яблок»" style="max-width: 500px;" @update:show="(v) => v || closeDialog()")
    .form-newgame
      .row
        .col-sm.label Ставка (банк — две ставки)
        .col-sm-auto
          n-input-number(v-model:value="kon" :min="1")
      .fast-kon.mt-2
        n-button(v-for="btn in konList" :key="btn" type="info" size="small" :disabled="btn === kon" @click="kon = btn") {{ btn }}

      .label.mt-4 Твой первый ход — соперник его не увидит:
      .balls.mt-2
        n-button(
          v-for="b in balls"
          :key="b"
          type="info"
          size="large"
          :secondary="b !== ball"
          @click="ball = b"
        )
          font-awesome-icon(icon='fa fa-apple-alt')
          span.ball-num {{ b }}

      .hint.mt-2 Кто первым наберёт 21 очко — забирает банк.
      .mt-3
        n-button(type="primary" :loading="isLoading" @click="createGame") Создать
</template>

<style lang="scss" scoped>
.form-newgame {
  .label {
    display: flex;
    align-items: center;
  }

  .fast-kon {
    display: flex;
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .balls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .ball-num {
    margin-left: 0.35rem;
    font-weight: 700;
  }

  .hint {
    color: var(--text-muted);
    font-size: 0.85rem;
  }
}
</style>
