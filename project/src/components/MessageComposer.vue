<script setup lang="ts">
import { watch } from 'vue';
import { NInput, NButton, NAlert } from 'naive-ui';
import { useDictation } from '@/hooks/useDictation';
import { submitShortcut } from '@/services/submitShortcut';
const props = withDefaults(defineProps<{ modelValue: string; disabled?: boolean; submitDisabled?: boolean; submitLabel?: string; id: string; placeholder?: string; maxlength?: number }>(), { maxlength: 3000, placeholder: 'Напишите сообщение', submitLabel: 'Отправить' });
const emit = defineEmits<{ (event: 'update:modelValue', value: string): void; (event: 'submit'): void }>();
const voice = useDictation(text => {
  if (!props.disabled) emit('update:modelValue', (props.modelValue + (props.modelValue && !/\s$/.test(props.modelValue) ? ' ' : '') + text).slice(0, props.maxlength));
});
watch(() => props.disabled, disabled => { if (disabled) voice.cancel(); });
function submit() { if (!props.disabled && !props.submitDisabled && props.modelValue.trim()) { voice.cancel(); emit('submit'); } }
</script>
<template lang="pug">
.message-composer
  n-input(:input-props="{ id }" :value="modelValue" @update:value="emit('update:modelValue', $event)" type="textarea" :maxlength="maxlength" :autosize="{ minRows: 3, maxRows: 12 }" :disabled="disabled" :placeholder="placeholder" @keydown="submitShortcut($event, submit)")
  .composer-tools
    n-button(size="small" type="primary" :loading="disabled" :disabled="disabled || submitDisabled || !modelValue.trim()" @click="submit") {{ submitLabel }}
    small.muted(title="Ctrl+Enter — отправить") Ctrl+Enter
    n-button.voice-button(size="small" :type="voice.listening.value ? 'error' : 'default'" :disabled="disabled || !voice.supported" :aria-pressed="voice.listening.value" :aria-label="voice.listening.value ? 'Остановить диктовку' : 'Голосовой ввод'" :title="voice.listening.value ? 'Остановить диктовку' : 'Голосовой ввод'" @click="voice.toggle")
      svg(width="16" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true")
        rect(x="9" y="2" width="6" height="12" rx="3")
        path(d="M5 10v2a7 7 0 0014 0v-2M12 19v3M8 22h8")
  small.muted(v-if="!voice.supported") Голосовой ввод не поддерживается этим браузером.
  small.muted(v-else-if="voice.listening.value" role="status") Слушаю… Распознанный текст появится в поле; отправьте его после проверки.
  n-alert(v-if="voice.error.value" type="warning" :show-icon="false") {{ voice.error.value }}
</template>
<style scoped>
.message-composer { width: 100%; display: grid; gap: .5rem; }
.composer-tools { display: flex; align-items: center; flex-wrap: nowrap; gap: .5rem; }
.composer-tools small { white-space: nowrap; font-size: .7rem; }
.voice-button { margin-left: auto; flex-shrink: 0; }
</style>
