<script setup>
import {computed} from 'vue';
import {NTooltip} from 'naive-ui';

const props = defineProps({
    item: {type: Object, required: true},
    qty: {type: Number, default: 0},
    size: {type: String, default: 'md'},
    interactive: {type: Boolean, default: true},
});

const rarityClass = computed(() => `is-${props.item.rarity || 'common'}`);
const sizeClass = computed(() => `is-${props.size}`);
</script>

<template>
    <n-tooltip placement="top" :delay="200">
        <template #trigger>
            <div class="item-card" :class="[rarityClass, sizeClass, { 'is-interactive': interactive }]">
                <div class="item-icon">
                    <font-awesome-icon :icon="item.getIcon ? item.getIcon() : (item.icon || 'fa fa-cube')"/>
                </div>
                <div class="item-name">{{ item.getName ? item.getName() : item.name }}</div>
                <div v-if="qty > 0" class="item-qty">×{{ qty }}</div>
            </div>
        </template>
        <div class="item-tooltip">
            <div class="item-tooltip-name">{{ item.getName ? item.getName() : item.name }}</div>
            <div class="item-tooltip-rarity" :class="rarityClass">{{ item.rarity || 'common' }}</div>
            <div v-if="item.description" class="item-tooltip-desc">{{ item.description }}</div>
        </div>
    </n-tooltip>
</template>

<style lang="scss" scoped>
.item-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.4rem;
    padding: 0.6rem 0.5rem;
    background: var(--bg-surface);
    border: 0.0625rem solid var(--border);
    border-radius: 0.5rem;
    position: relative;
    transition: transform 0.15s ease, border-color 0.15s ease;

    &.is-interactive:hover {
        transform: translateY(-2px);
        border-color: var(--primary);
    }

    &.is-sm {
        padding: 0.35rem;

        .item-icon { font-size: 1.1rem; }
        .item-name { font-size: 0.75rem; }
    }
    &.is-md {
        .item-icon { font-size: 1.7rem; }
        .item-name { font-size: 0.85rem; }
    }
    &.is-lg {
        padding: 1rem 0.75rem;

        .item-icon { font-size: 2.4rem; }
        .item-name { font-size: 1rem; }
    }

    &.is-common .item-icon { color: var(--text-muted); }
    &.is-rare {
        border-color: rgba(33, 150, 243, 0.5);
        .item-icon { color: #2196f3; }
    }
    &.is-epic {
        border-color: rgba(156, 39, 176, 0.6);
        .item-icon { color: #ba68c8; }
    }

    .item-name {
        color: var(--text);
        line-height: 1.2;
    }

    .item-qty {
        position: absolute;
        bottom: 0.25rem;
        right: 0.4rem;
        background: var(--primary);
        color: var(--text-on-acc);
        font-size: 0.7rem;
        font-weight: 700;
        padding: 0.05rem 0.35rem;
        border-radius: 999px;
    }
}

.item-tooltip {
    max-width: 16rem;

    &-name {
        font-weight: 700;
    }
    &-rarity {
        text-transform: uppercase;
        font-size: 0.7rem;
        letter-spacing: 0.05em;
        margin-bottom: 0.3rem;

        &.is-common { color: var(--text-muted); }
        &.is-rare { color: #64b5f6; }
        &.is-epic { color: #ba68c8; }
    }
    &-desc {
        font-size: 0.85rem;
        line-height: 1.4;
        color: var(--text-muted);
    }
}
</style>
