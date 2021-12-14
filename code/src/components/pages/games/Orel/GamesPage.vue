<script>
import { ref } from "@vue/reactivity";
import GamesList from './GamesList.vue';

export default {
	components: {
		GamesList,
	},
    emits: ['newGameClick'],
	setup(props, { emit }) {
		const openDialogCreate = () => {
            emit('newGameClick');
		};

		return {
			openDialogCreate,
		};
	},
};

</script>

<template>
	<games-list 
		@newGameClick="openDialogCreate" />
</template>
