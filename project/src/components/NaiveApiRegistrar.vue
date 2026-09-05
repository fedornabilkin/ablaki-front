<script setup>
// Пробрасывает API Naive UI (диалоги/сообщения/нотификации) в глобальный
// доступ, чтобы их можно было вызывать вне setup-контекста — например, из
// сервисов в src/services/*. Компонент должен находиться ВНУТРИ провайдеров
// n-dialog-provider / n-message-provider / n-notification-provider (см. App.vue).
import { useDialog, useMessage, useNotification } from 'naive-ui';

window.$dialog = useDialog();
window.$message = useMessage();
window.$notification = useNotification();
</script>

<template>
  <span style="display: none"></span>
</template>
