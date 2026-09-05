<script setup>
import { ref } from "@vue/reactivity";
import { NModal, NButton, NInputNumber, useNotification } from 'naive-ui';
import { duel } from '@/services/api/games/duel.js';
import { errorHandler } from "@/services/api/errorHandler.js";
import { ZONES } from './zones.js';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'gameCreated']);

const konList = [10, 20, 50, 100, 200, 500];

const kon = ref(10);
const udar = ref(null);
const blok = ref(null);
const isLoading = ref(false);
const notification = useNotification();

const closeDialog = () => {
  emit('close');
};

const createGame = () => {
  isLoading.value = true;
  duel.create(kon.value, udar.value, blok.value)
      .then(() => {
        notification.success({ content: 'Схватка создана', duration: 4500 });
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
  n-modal(:show="isOpen" preset="card" title="Новая дуэль" style="max-width: 500px;" @update:show="(v) => v || closeDialog()")
    .form-newgame
      .row
        .col-sm.label Ставка (банк — две ставки)
        .col-sm-auto
          n-input-number(v-model:value="kon" :min="1")
      .fast-kon.mt-2
        n-button(v-for="btn in konList" :key="btn" type="info" size="small" :disabled="btn === kon" @click="kon = btn") {{ btn }}

      .label.mt-4
        font-awesome-icon(icon='fa fa-crosshairs')
        |  Удар по противнику:
      .zones.mt-2
        n-button(
          v-for="zone in ZONES"
          :key="zone.value"
          type="error"
          :secondary="zone.value !== udar"
          @click="udar = zone.value"
        ) {{ zone.label }}

      .label.mt-3
        font-awesome-icon(icon='fa fa-shield')
        |  Блок для себя:
      .zones.mt-2
        n-button(
          v-for="zone in ZONES"
          :key="zone.value"
          type="info"
          :secondary="zone.value !== blok"
          @click="blok = zone.value"
        ) {{ zone.label }}

      .hint.mt-2 Соперник не увидит твой выбор до розыгрыша.
      .mt-3
        n-button(type="primary" :disabled="!udar || !blok" :loading="isLoading" @click="createGame") Создать
</template>

<style lang="scss" scoped>
.form-newgame {
  .label {
    display: flex;
    align-items: center;
    gap: 0.35rem;

    svg {
      color: var(--primary);
    }
  }

  .fast-kon,
  .zones {
    display: flex;
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .hint {
    color: var(--text-muted);
    font-size: 0.85rem;
  }
}
</style>
