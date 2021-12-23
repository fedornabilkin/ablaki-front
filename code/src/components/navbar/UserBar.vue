<template>
	<div class="user-bar">
		<div class="user-bar-left">
			<router-link :to="'/users/wall/' + user.username">
				<el-button type="text" icon="postcard">Стена {{ user.username }}</el-button>
            </router-link>
		</div>
		
		<div class="user-bar-right">
			<div>
				<span class="amount">{{ user.person.balance }}</span>
				<span>Кг</span>
			</div>
			<div>
				<span class="amount">{{ user.person.credit }}</span>
				<span>Cr</span>
			</div>
			<div>
				<el-icon style="vertical-align: text-top;"><star /></el-icon>
				<span class="amount">{{ user.person.rating }}</span>
			</div>
		</div>
	</div>
</template>

<script>
import { computed } from '@vue/reactivity';
import { useStore } from 'vuex';

export default {
	setup() {
		const store = useStore();
		const user = computed(() => store.getters['auth/user']);

		return {
			user,
		}
	},
}
</script>

<style lang="scss" scoped>
.user-bar {
	display: flex;

	.user-bar-left {
		flex-grow: 1;
	}

	.user-bar-right {
		display: flex;
		align-items: center;
		gap: .5rem;
	}
}
</style>