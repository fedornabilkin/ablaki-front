<script>
import { ref } from '@vue/reactivity';
import { orel } from '../../../../services/api';

export default {
    props: {
        newGameClick: {
            type: Function,
        }
    },
    setup(props) {
        const gamesList = ref([]);
        const isGamesLoading = ref(true);

        orel.get()
			.then((res) => {
				gamesList.value = res;
				isGamesLoading.value = false;
			})
			.catch((err) => {
				console.log(err);
			});

        const createNewGame = () => {
            props.newGameClick();
        }

        return {
            gamesList,
            isGamesLoading,
            createNewGame,
        }
    },
}
</script>

<template>
    <el-table
		:data="gamesList"
		v-loading="isGamesLoading"
		class="mt-2"
	>
		<el-table-column prop="date" label="Игрок" />
		<el-table-column prop="name" label="Ставка" />
		<el-table-column prop="address" label="Address" />

        <template #empty>
            <span class="d-inline-block me-3">Игр нет :(</span>
            <span>
                <el-button
                    type="primary"
                    @click="createNewGame"
                    round
                    icon="Plus"
                    >Создать</el-button
                >
            </span>
        </template>
	</el-table>
</template>