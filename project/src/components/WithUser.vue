<script>
import { computed } from '@vue/reactivity';
import { useStore } from 'vuex';

export default {
    setup() {
        const store = useStore();

        const authStatus = computed(() => store.getters['auth/authStatus']);

        return {
            authStatus,
        }
    }
}
</script>

<template>
    <div v-loading="authStatus !== 'user'">
        <router-view v-if="authStatus === 'user'" />
    </div>
    
</template>