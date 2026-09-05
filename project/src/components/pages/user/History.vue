<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { NCard } from 'naive-ui';
import PageHeader from '@/components/PageHeader.vue';
import RequestState from '@/components/RequestState.vue';
import PagePager from '@/components/PagePager.vue';
import { list, emptyPage, field, date } from '@/services/api/portal';
import { usePageRequest } from '@/hooks/usePageRequest';
const route = useRoute();
const rating = computed(() => route.path === '/rating');
const page = ref(1);
watch(rating, () => { page.value = 1; });
const { data, loading, error, refresh } = usePageRequest(() => list(rating.value ? 'history/rating' : 'history/balance', page.value, { sort: '-id' }), emptyPage(), [rating, page]);
function change(value: unknown) { return value === null || value === undefined || !Number.isFinite(Number(value)) ? '—' : (Number(value) > 0 ? '+' : '') + field(value); }
</script>
<template lang="pug">
page-header(page-title="История счёта" :extra-links="[{ link: '/balance', title: 'Баланс и кредиты' }, { link: '/rating', title: 'Рейтинг' }]")
.container.page
  n-card
    request-state(:loading="loading" :error="error" :empty="!data.items.length" @retry="refresh")
      article.record-row(v-for="entry in data.items" :key="entry.id")
        div
          h3 {{ field(entry.comment || entry.type) }}
          .muted {{ date(entry.created_at) }} · №{{ entry.id }}
        .stack(v-if="rating")
          strong Изменение: {{ change(entry.rating_up) }}
          span.muted Рейтинг после: {{ field(entry.rating) }}
        .stack(v-else)
          strong {{ change(entry.balance_up) }} Кг · {{ change(entry.credit_up) }} Cr
          span.muted После: {{ field(entry.balance) }} Кг · {{ field(entry.credit) }} Cr
    page-pager(v-if="!error" v-model:page="page" :result="data" :disabled="loading")
</template>
