<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue';
import { NAlert, NButton, NInput, NInputNumber, NSpin } from 'naive-ui';
import AppPopover from '@/components/AppPopover.vue';
import { loadMarket, marketTotal, type MarketItem, type MarketState } from '@/services/api/worldMarket';
import { useSimpleWorldCommand } from '@/hooks/useSimpleWorldCommand';
import { worldError } from '@/services/api/world';
import WorldPanel from './WorldPanel.vue';
import WorldSectionHeading from './WorldSectionHeading.vue';
import WorldHelpHint from './WorldHelpHint.vue';
import WorldCredits from './WorldCredits.vue';
import { creditUnits } from '@/entities/world/credits';
const props = defineProps<{ nodeId: number; owner: number; session: number; writable: boolean; active?: boolean }>();
const emit = defineEmits<{ changed: [] }>();
const state = ref<MarketState | null>(null), loading = ref(false), error = ref(''), notice = ref('');
const direction = ref<'buy' | 'sell'>('buy'), search = ref(''), selected = ref<number | null>(null), quantity = ref<number | null>(1);
const runner = useSimpleWorldCommand(computed(() => `${props.owner}.market.${props.nodeId}`), computed(() => props.session));
const rows = computed(() => (state.value?.[direction.value] ?? []).filter(item => item.name.toLocaleLowerCase().includes(search.value.toLocaleLowerCase())));
const remaining = computed(() => direction.value === 'buy' ? state.value?.buyRemaining : state.value?.sellRemaining);
const waiting = computed(() => loading.value || runner.busy.value || !!runner.pending.value);
let generation = 0;
async function load() {
  const current = ++generation; loading.value = true; error.value = '';
  try { const result = await loadMarket(props.nodeId); if (generation === current) state.value = result; }
  catch (cause) { if (generation === current) error.value = worldError(cause); }
  finally { if (generation === current) loading.value = false; }
}
function select(item: MarketItem) { selected.value = selected.value === item.inventoryId ? null : item.inventoryId; quantity.value = 1; }
function insufficient(item: MarketItem) { return direction.value === 'sell' && !!state.value && creditUnits(marketTotal(item.bid, quantity.value ?? 1)) > creditUnits(state.value.reserve); }
function total(item: MarketItem) { return marketTotal(item[direction.value], quantity.value ?? 1); }
async function trade(item?: MarketItem) {
  if (!state.value) return;
  const current = generation, mode = direction.value;
  const result = item ? await runner.submit(`markets/${props.nodeId}/trade`, { direction: mode, inventory_id: item.inventoryId, quantity: quantity.value ?? 1, unit_price_cr: item[mode], profile_version: state.value.version }) : await runner.retry();
  if (current !== generation) return;
  if (result) { notice.value = 'Сделка завершена. Предметы и оплата переданы.'; selected.value = null; emit('changed'); void load(); }
  else if (!runner.pending.value) { selected.value = null; void load(); }
}
watch(direction, () => { selected.value = null; quantity.value = 1; });
watch(() => [props.nodeId, props.owner, props.session], () => { state.value = null; selected.value = null; notice.value = ''; void load(); }, { immediate: true });
onScopeDispose(() => { generation++; });
</script>
<template lang="pug">
world-panel.market-panel(aria-label="Городской рынок")
  world-section-heading(title="Городской рынок" icon="exchange-alt" level="h3")
    world-help-hint(label="Цены и доставка рынка")
      p Здесь торгует только бот. На его складах сырьё дешевле. Цена рынка включает доставку {{ (state?.fees.delivery ?? 1500) / 100 }}%, комиссию городу {{ (state?.fees.city ?? 500) / 100 }}% и владельцу рынка {{ (state?.fees.owner ?? 500) / 100 }}%.
      p Бот выкупает сырьё за 50% цены склада, удерживая {{ (state?.fees.sell ?? 1000) / 100 }}% этой суммы. Ниже показана сумма к получению. Доставка и удержание выводят кредиты из оборота.
      p Запасы доставляются каждые 30 минут, если на складе бота есть ресурсы. Средства выкупа конечны; средства, уже выделенные на зарплаты, не используются.
    n-button(size="small" :disabled="waiting" @click="load" aria-label="Обновить рынок")
      template(#icon)
        font-awesome-icon(icon="sync-alt")
  .market-toolbar
    .market-modes(role="group" aria-label="Направление торговли")
      n-button(:type="direction === 'buy' ? 'primary' : 'default'" :aria-pressed="direction === 'buy'" @click="direction = 'buy'") Купить
      n-button(:type="direction === 'sell' ? 'primary' : 'default'" :aria-pressed="direction === 'sell'" @click="direction = 'sell'") Продать
    n-input.market-search(v-model:value="search" placeholder="Найти ресурс" :input-props="{ 'aria-label': 'Найти ресурс на рынке' }" clearable)
  n-alert(v-if="error || runner.error.value" type="error") {{ error || runner.error.value }}
  n-spin(v-if="loading && !state" size="small")
  template(v-if="state")
    .market-caption
      span {{ direction === 'buy' ? 'На рынке' : 'В рюкзаке' }} · сделок осталось {{ remaining }}
      span(v-if="direction === 'sell'") Резерв выкупа: #[world-credits(exact :value="state.reserve")]
    p.market-empty(v-if="!rows.length") {{ direction === 'buy' ? 'Подходящих ресурсов пока нет. Загляните после следующей доставки.' : 'Нет подходящего сырья в свободных ячейках рюкзака.' }}
    .market-grid(v-else)
      app-popover(v-for="item in rows" :key="`${direction}:${item.inventoryId}`" trigger="manual" placement="bottom" :show="selected === item.inventoryId" width="19rem" @clickoutside="selected = null" @keydown.esc="selected = null")
        template(#trigger)
          button.market-tile(type="button" :class="{ selected: selected === item.inventoryId }" :aria-expanded="selected === item.inventoryId" @click="select(item)")
            font-awesome-icon(:icon="item.icon" aria-hidden="true")
            strong {{ item.name }}
            span ×{{ item.quantity }}
            world-credits(exact :value="item[direction]")
        .market-offer
          strong {{ item.name }}
          span {{ direction === 'buy' ? 'К оплате' : 'Вы получите' }}: #[world-credits(exact :value="total(item)")]
          n-input-number(v-model:value="quantity" :min="1" :max="Math.min(item.quantity, state.maximum)" :precision="0" :disabled="waiting" :input-props="{ 'aria-label': 'Количество ресурса' }")
          small Цена за штуку: #[world-credits(exact :value="item[direction]")]. Все комиссии включены.
          small(v-if="insufficient(item)") У бота недостаточно свободных кредитов. Попробуйте меньшее количество или зайдите после новых покупок.
          n-button(type="primary" :loading="runner.busy.value" :disabled="!writable || waiting || !quantity || !remaining || insufficient(item)" @click="trade(item)") {{ direction === 'buy' ? 'Купить' : 'Продать' }}
    n-button(v-if="runner.pending.value" :disabled="runner.busy.value" @click="trade()") Проверить результат сделки
  p(v-if="notice" role="status") {{ notice }}
</template>
<style scoped>
.market-panel { min-width: 0; }.market-toolbar, .market-modes, .market-caption { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }.market-search { max-width: 20rem; }.market-caption, .market-empty { font-size: .8rem; color: var(--text-muted); }
.market-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr)); gap: .5rem; max-height: 24rem; overflow: auto; padding: .2rem; }.market-tile { display: grid; align-content: start; gap: .35rem; padding: .65rem; min-width: 0; min-height: 8rem; max-width: 10rem; text-align: left; background: var(--bg-base); color: inherit; border: 1px solid var(--border); border-radius: .6rem; cursor: pointer; }.market-tile.selected { border-color: var(--accent, #ff8500); background: rgba(255,133,0,.07); }.market-tile > svg { color: var(--accent, #ff8500); }.market-tile strong { font-size: .8rem; overflow-wrap: anywhere; }.market-tile span { font-size: .75rem; color: var(--text-muted); }.market-offer { display: grid; gap: .7rem; }.market-offer .n-button { justify-self: start; }
@media(min-width: 48rem) { .market-grid { grid-template-columns: repeat(auto-fill, 8rem); } }
</style>
