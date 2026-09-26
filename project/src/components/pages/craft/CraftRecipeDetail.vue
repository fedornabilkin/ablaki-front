<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { NButton, NInputNumber, NPopover } from 'naive-ui';
import type { CraftRecipe, CraftState } from '@/services/api/classicCraft';
import { craftRequirements, maxCraftQuantity } from '@/entities/craft/classic';
const props = defineProps<{state: CraftState; recipe: CraftRecipe; blocked: boolean; busy: boolean}>();
const emit = defineEmits<{craft: [id: number, quantity: number]; hide: []}>();
const quantity = ref<number | null>(1);
const items = computed(() => new Map(props.state.items.map(i => [i.id, i])));
const requirements = computed(() => craftRequirements(props.state, props.recipe, quantity.value ?? 0));
const maximum = computed(() => maxCraftQuantity(props.state, props.recipe));
</script>
<template lang="pug">
aside.recipe-detail(aria-label="Выбранный рецепт")
  .detail-heading
    font-awesome-icon.detail-icon(:icon="items.get(recipe.item_id)?.icon || 'cube'")
    h2 {{ items.get(recipe.item_id)?.name }}
    n-button.hide-button(quaternary circle size="small" aria-label="Скрыть рецепт" title="Скрыть рецепт" @click="emit('hide')")
      font-awesome-icon(icon="eye-slash")
  p {{ recipe.description }}
  .recipe-facts
    span(title="Предметов за партию")
      font-awesome-icon(icon="cubes")
      |  {{ recipe.output_quantity }} шт.
    span(title="Опыт за партию")
      font-awesome-icon(icon="graduation-cap")
      |  +{{ recipe.experience }} XP
  label Количество партий
    .quantity-row
      n-input-number(:min="1" :max="100" :step="1" :input-props="{type: 'number', inputmode: 'numeric', min: 1, max: 100, step: 1}" v-model:value="quantity" :precision="0" :disabled="blocked")
      n-button(:disabled="blocked || maximum === 0" @click="quantity = maximum") Максимум: {{ maximum }}
  ul.resource-list
    li(v-for="r in requirements.resources" :key="r.id" :class="{shortage: r.have < r.needed}")
      span.resource-name
        font-awesome-icon(:icon="items.get(r.id)?.icon || 'cube'")
        router-link(:to="{path: '/craft', query: {item: r.id}}") {{ r.name }}
        n-popover(v-if="r.retained" trigger="hover")
          template(#trigger)
            span.resource-symbol(tabindex="0" :aria-label="r.station ? 'Станция: один предмет сохраняется' : 'Инструмент: один предмет сохраняется'")
              font-awesome-icon(:icon="r.station ? 'industry' : 'wrench'")
          | {{ r.station ? 'Станция' : 'Инструмент' }}: один предмет остаётся в инвентаре после создания.
      span.resource-count
        font-awesome-icon.shortage-icon(v-if="r.have < r.needed" icon="exclamation-circle" role="img" aria-label="Не хватает ресурса")
        strong {{ r.have }} / {{ r.needed }}
  .recipe-facts
    span(v-if="state.charge_credits")
      font-awesome-icon(icon="coins")
      |  {{ requirements.cost }} Cr
    span(v-else) Без списания кредитов
    span
      font-awesome-icon(icon="cube")
      |  {{ recipe.output_quantity * (quantity || 0) }} шт.
  ul.reasons(v-if="requirements.reasons.length")
    li(v-for="reason in requirements.reasons" :key="reason")
      font-awesome-icon(:class="{'shortage-icon': reason.startsWith('Не хватает')}" :icon="reason.startsWith('Не хватает') ? 'exclamation-circle' : 'lock'")
      span {{ reason }}
  n-button(type="primary" block :loading="busy" :disabled="blocked || !!requirements.reasons.length" @click="emit('craft', recipe.id, quantity || 0)") Создать
</template>
<style scoped lang="scss">
.recipe-detail { background: var(--bg-surface); border: 1px solid var(--border); border-radius: .8rem; padding: 1rem; display: grid; gap: .8rem; font-size: .85rem; box-shadow: 0 12px 32px #0004; }
.detail-heading { display: flex; align-items: center; gap: .65rem; }.detail-heading h2 { flex: 1; min-width: 0; margin: 0; font-size: 1.05rem; }.detail-icon { font-size: 1.5rem; color: #d6b685; flex-shrink: 0; }.hide-button { flex-shrink: 0; }
p { margin: 0; color: var(--text-muted); }
label { display: grid; gap: .4rem; }
.quantity-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .5rem; align-items: center; }
.recipe-facts { display: flex; flex-wrap: wrap; justify-content: space-between; gap: .5rem; font-size: .8rem; }
.resource-list { list-style: none; padding: 0; margin: 0; display: grid; gap: .65rem; }.resource-list li { display: flex; justify-content: space-between; gap: .5rem; }
.resource-name, .resource-count { display: flex; align-items: center; gap: .4rem; }.resource-name { min-width: 0; }.resource-name > svg { flex-shrink: 0; color: #d6b685; }.resource-symbol { color: var(--text-muted); cursor: help; }.resource-count { white-space: nowrap; }
.shortage, .shortage-icon { color: #ef4444; }
.reasons { margin: 0; padding: 0; list-style: none; font-size: .8rem; color: var(--text-muted); display: grid; gap: .45rem; }.reasons li { display: flex; align-items: baseline; gap: .45rem; }.reasons svg { flex-shrink: 0; }
</style>
