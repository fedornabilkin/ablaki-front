<template>
	<div class="">
		<span class="pe-1">
			<router-link :to="'/users/wall/' + user.username">
				<el-button type="text" icon="postcard">Стена {{ user.username }}</el-button>
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
			<el-icon style="vertical-align: text-top;"><star /></el-icon>
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
