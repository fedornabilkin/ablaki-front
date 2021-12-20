<script>
import { ref } from '@vue/reactivity';
import { orel } from '../../../../services/api';

export default {
    emits: ['newGameClick'],
    setup(props, { emit }) {
        const gamesList = ref([]);
        const isGamesLoading = ref(true);

        const createNewGame = () => {
            emit('newGameClick');
        }

        const onClickPlay = (id, hod) => {
            orel.play(id, hod).then(res => {
                gamesList.value = gamesList.value.filter(
					(game) => game.id !== id
				);
            })
        }

        const gameListReady = isGamesLoading.value === false && gamesList.value.length > 0;

        orel.get()
			.then((res) => {
				gamesList.value = res;
				isGamesLoading.value = false;
			})
			.catch((err) => {
				console.log(err);
			});

        return {
            gamesList,
            isGamesLoading,
            createNewGame,
            onClickPlay,
            gameListReady,
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
                    content="Играть"
                    placement="top"
                >
                    <el-button
                        icon="sunny"
                        type="primary"
                        circle
                        @click="onClickPlay(scope.row.id, 0)"
                    />
                </el-tooltip>
                <el-tooltip
                    effect="dark"
                    content="Играть"
                    placement="top"
                >
                    <el-button
                        icon="moon"
                        circle
                        @click="onClickPlay(scope.row.id, 0)"
                    />
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