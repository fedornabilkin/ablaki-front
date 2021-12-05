<template>
	<div class="">
		<span class="pe-1">
			Стена
			<router-link :to="'/users/wall/' + user.username">
                {{ user.username }}
            </router-link>
		</span>
		<span class="pe-1">
			<span class="amount">{{ user.person.balance }}</span>
			<span>Кг</span>
		</span>
		<span class="pe-1">
			<span class="amount">{{ user.person.credit }}</span>
			<span>Cr</span>
		</span>
		<span class="pe-1">
			<span class="fa fa-star" aria-hidden="true"></span>
			<font-awesome-icon :icon="'star'" />
			<span class="amount">{{ user.person.rating }}</span>
		</span>
	</div>
</template>

<script>
import { mapGetters } from 'vuex';
export default {
	name: "UserBar",
	data: function () {
		return {};
	},
    computed: {
        ...mapGetters([
            'user',
        ]),
    }
};
</script>

<style scoped>
</style>
