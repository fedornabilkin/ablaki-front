<script setup lang="ts">
import {ref, computed} from 'vue';
import {NAlert, NButton, NCard, NTag, NInputNumber} from 'naive-ui';
import {materials, recipes, starter, readInventory, createItem, prices, startingCredits, readCredits, buyMaterial} from '@/services/craft/workshop';
const storageKey = 'ablaki-local-workshop-v1';
let saved: string | null = null;
try { saved = localStorage.getItem(storageKey); } catch { /* Storage can be unavailable. */ }
const inventory = ref(readInventory(saved));
const credits = ref(readCredits(saved));
const quantities = ref<Record<string, number | null>>({});
const shopOpen = ref(false);
const quantity = (code: string) => quantities.value[code] === undefined ? 1 : quantities.value[code];
const canBuy = (code: string) => {
  const qty = quantity(code);
  return qty !== null && Number.isSafeInteger(qty) && qty >= 1 && qty <= 999 && prices[code] * qty <= credits.value;
};
const result = ref('');
const error = ref('');
const products = computed(() => recipes.filter(item => inventory.value[item.code] > 0));
const nameOf = (code: string) => materials.find(item => item.code === code)?.name ?? code;
const available = (recipe: typeof recipes[number]) => recipe.ingredients.every(item => (inventory.value[item.code] ?? 0) >= item.qty);
function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify({...inventory.value, credits: credits.value})); }
  catch { error.value = 'Сохранение недоступно. После закрытия страницы прогресс может потеряться.'; }
}
function craft(code: string) {
  error.value = '';
  result.value = '';
  try {
    inventory.value = createItem(inventory.value, code);
    result.value = `Получено: ${recipes.find(item => item.code === code)!.name} × 1`;
    persist();
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось создать предмет'; }
}
function buy(code: string) {
  result.value = '';
  error.value = '';
  try {
    const qty = quantity(code);
    const purchase = buyMaterial(inventory.value, credits.value, code, qty ?? 0);
    inventory.value = purchase.inventory;
    credits.value = purchase.credits;
    result.value = `Куплено: ${nameOf(code)} × ${qty} за ${purchase.cost} Cr`;
    persist();
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось купить материал'; }
}
function reset() {
  inventory.value = starter();
  credits.value = startingCredits;
  result.value = '';
  error.value = '';
  persist();
}
</script>

<template lang="pug">
.workshop.container.page
  n-alert(type="info" :show-icon="false") Локальная мастерская. Материалы, предметы и игровые кредиты сохраняются в этом браузере отдельно от аккаунта. Стартовый баланс — 500 Cr.
  .recipe-action
    strong Баланс мастерской: {{ credits }} Cr
    n-button(type="primary" @click="shopOpen = !shopOpen" :aria-expanded="shopOpen") {{ shopOpen ? 'Скрыть магазин' : 'Магазин материалов' }}
  n-alert(v-if="result" type="success" role="status") {{ result }}
  n-alert(v-if="error" type="error" role="alert") {{ error }}
  n-card(v-if="shopOpen" title="Магазин материалов")
    .shop-grid
      .shop-item(v-for="item in materials" :key="item.code")
        strong {{ item.name }}
        span {{ prices[item.code] }} Cr / шт. · В наличии: {{ inventory[item.code] ?? 0 }}
        n-input-number(v-model:value="quantities[item.code]" :default-value="1" :min="1" :max="999" :precision="0" :aria-label="'Количество: ' + item.name")
        n-button(type="primary" :disabled="!canBuy(item.code)" @click="buy(item.code)") Купить за {{ prices[item.code] * (quantity(item.code) ?? 0) }} Cr
  .workshop-columns
    .inventory
      n-card(title="Материалы")
        .material(v-for="item in materials" :key="item.code")
          font-awesome-icon(:icon="['fas', item.icon]")
          span {{ item.name }}
          n-tag(:bordered="false") {{ inventory[item.code] ?? 0 }} шт.
      n-card(title="Готовые предметы")
        p(v-if="!products.length") Создайте первый факел — он появится здесь.
        .material(v-for="item in products" :key="item.code")
          font-awesome-icon(:icon="['fas', item.icon]")
          span {{ item.name }}
          n-tag(:bordered="false") {{ inventory[item.code] }} шт.
    .recipes
      n-card(v-for="recipe in recipes" :key="recipe.code" :title="recipe.name")
        .formula
          template(v-for="(ingredient, index) in recipe.ingredients" :key="ingredient.code")
            span(v-if="index" aria-hidden="true") +
            span {{ nameOf(ingredient.code) }} × {{ ingredient.qty }}
          span →
          strong {{ recipe.name }} × 1
        .recipe-action
          span {{ available(recipe) ? 'Материалы есть в инвентаре' : 'Не хватает материалов' }}
          n-button(type="primary" :disabled="!available(recipe)" @click="craft(recipe.code)") Создать
  n-button(secondary @click="reset") Начать заново
</template>

<style scoped lang="scss">
.workshop { display: grid; gap: 20px; padding-bottom: 32px; }
.shop-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr)); gap: 16px; }
.shop-item { display: grid; gap: 12px; padding: 16px; border: 1px solid var(--border); border-radius: 10px; }
.shop-item > span { color: var(--text-muted); font-size: 0.85rem; }
.workshop-columns { display: grid; grid-template-columns: minmax(240px, 1fr) minmax(0, 2fr); gap: 20px; align-items: start; }
.inventory, .recipes { display: grid; gap: 16px; min-width: 0; }
.material { display: flex; align-items: center; gap: 12px; padding: 10px 0; }
.material span { flex: 1; }
.formula { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 20px; }
.formula strong { color: var(--primary); }
.recipe-action { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
.recipe-action > span { color: var(--text-muted); }
@media (max-width: 720px) { .workshop-columns { grid-template-columns: 1fr; } }
</style>
