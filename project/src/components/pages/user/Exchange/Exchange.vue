<script>
import { ref } from '@vue/reactivity';
import NewOrder from './NewOrder.vue';
import PageHeader from '../../../PageHeader.vue';
import { useRoute } from 'vue-router';
import { NButton } from 'naive-ui';

export default {
    components: { NewOrder, PageHeader, NButton },
    setup() {
        const newOrderDialog = ref(false);
        const viewRef = ref(null);
        const route = useRoute();

        const openNewOrderDialog = () => {
            newOrderDialog.value = true;
        };

        const closeNewOrderDialog = () => {
            newOrderDialog.value = false;
        };

        const onCreated = (type) => {
            closeNewOrderDialog();

            if (route.fullPath === "/exchange/my") {
                if (type === "buy") viewRef.value.refetchBuy();
                if (type === "sell") viewRef.value.refetchSell();
            }
        };

      const extraLinks = [
        {
          link: '/exchange',
          title: 'Все заявки',
        }, {
          link: '/exchange/my',
          title: 'Мои заявки',
        }, {
          link: '/exchange/history',
          title: 'История',
        }, {
          link: '/exchange/shop',
          title: 'Магазин',
          icon: 'fa fa-cart-shopping',
        },
      ]

        return {
            viewRef,
            newOrderDialog,
            openNewOrderDialog,
            closeNewOrderDialog,
            onCreated,
          extraLinks,
        }
    },
}
</script>

<template lang="pug">
  page-header(page-title='Биржа кредитов' :extra-links='extraLinks')
    template(v-slot:actions='')
      n-button(type='primary' @click='openNewOrderDialog()' round)
        template(#icon)
          font-awesome-icon.text-warning.jello-horizontal(icon='fa fa-plus')
        | Добавить заявку

  new-order(:is-open='newOrderDialog' @created='onCreated' @close='closeNewOrderDialog')

  .container
    router-view(v-slot='{ Component }')
      component(:is='Component' ref='viewRef')
</template>