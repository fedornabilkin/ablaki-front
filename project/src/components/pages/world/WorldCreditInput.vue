<script setup lang="ts">
import { computed, ref } from 'vue';
import { NInput } from 'naive-ui';
import { formatCredits } from '@/entities/world/credits';
const props = withDefaults(defineProps<{ value?: string | null; placeholder?: string; exact?: boolean }>(), { value: '', placeholder: '0', exact: false });
const emit = defineEmits<{ 'update:value': [value: string] }>();
const focused = ref(false), draft = ref(''), edited = ref(false);
const formatInput = (value: string) => props.exact ? value.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') : formatCredits(value);
const display = computed(() => focused.value ? draft.value : !props.value ? '' : /^\d+(\.\d+)?$/.test(props.value) ? formatInput(props.value) : props.value);
const placeholder = computed(() => /^\d+(\.\d+)?$/.test(props.placeholder) ? formatCredits(props.placeholder) : props.placeholder);
function focus() { draft.value = display.value; focused.value = true; edited.value = false; }
function update(value: string) { draft.value = value; edited.value = true; emit('update:value', value); }
function blur() {
  if (edited.value && draft.value && /^\d+(\.\d+)?$/.test(draft.value)) emit('update:value', formatInput(draft.value));
  focused.value = false;
}
</script>
<template lang="pug">
n-input(:value="display" :placeholder="placeholder" :input-props="{ inputmode: 'decimal' }" @update:value="update" @focus="focus" @blur="blur")
</template>
