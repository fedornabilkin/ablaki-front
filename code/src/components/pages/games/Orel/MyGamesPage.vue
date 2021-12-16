<script>
import { ref } from '@vue/reactivity';
import { orel } from '../../../../services/api';
export default {
	emits: ['newGameClick'],
	setup(props, { emit }) {
		const gamesList = ref([]);
		const isGamesLoading = ref(true);

		orel.getMy()
			.then((res) => {
				gamesList.value = res;
				isGamesLoading.value = false;
			})
			.catch((err) => {
				console.log(err);
			});

		const createNewGame = () => {
			emit('newGameClick');
		}

		return {
			gamesList,
			isGamesLoading,
			createNewGame,
		}
	}
};
</script>

<template>
	<el-table
		:data="gamesList"
		v-loading="isGamesLoading"
		class="mt-2"
	>
		<el-table-column prop="username" label="Игрок" />
		<el-table-column prop="kon" label="Ставка">
            <template #default="scope">
                {{ scope.row.kon }} кр
            </template>
        </el-table-column>
		<el-table-column prop="kon" label="Играть">
            <template #default="scope">
                <el-tooltip
                    effect="dark"
                    content="Отменить игру"
                    placement="top"
                >
                    <el-button icon="delete" type="danger" circle />
                </el-tooltip>
            </template>
        </el-table-column>

        <template #empty>
            <div v-if="!isGamesLoading">
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
            </div>
            <div v-else>Загрузка...</div>
        </template>
	</el-table>
</template>
