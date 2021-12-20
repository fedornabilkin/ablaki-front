<script>
import { ref } from "@vue/reactivity";
import { orel } from "../../../../services/api";
import { ElNotification } from "element-plus";
import { watch } from "@vue/runtime-core";
import moment from "moment";

export default {
	props: {
		reloadListTrigger: {
			type: Boolean,
		},
	},
	emits: ["newGameClick"],
	setup(props, { emit }) {
		const gamesList = ref([]);
		const isGamesLoading = ref(true);

		const fetchGames = () => {
			isGamesLoading.value = true;
			orel.getMy()
				.then((res) => {
					res = res.map((game) => ({
						...game,
						created_date: moment
							.unix(game.created_at)
							.format("HH:mm:SS DD.MM.YYYY"),
						isLoading: false
					}));

					gamesList.value = res;
					isGamesLoading.value = false;
				})
				.catch((err) => {
					console.log(err);
				});
		};

		const deleteGame = (id) => {
			let gameIndex = gamesList.value.findIndex((game) => game.id === id);

			gamesList.value[gameIndex].isLoading = true;
			
			orel.delete(id).then((res) => {
				// gamesList.value = gamesList.value.filter(
				// 	(game) => game.id !== id
				// );

				gamesList.value.splice(gameIndex, 1);

				ElNotification({
					message: "Игра удалена",
					type: "info",
				});
			});
		};

		watch(() => props.reloadListTrigger, () => {
			fetchGames();
		});

		const onCreateGameClicked = () => {
			emit("newGameClick");
		};

		fetchGames();

		return {
			gamesList,
			isGamesLoading,
			onCreateGameClicked,
			deleteGame,
		};
	},
};
</script>

<template>
	<!--el-table :data="gamesList" v-loading="isGamesLoading" class="mt-2">
		<el-table-column prop="username" label="Игрок" />
		<el-table-column prop="kon" label="Ставка">
			<template #default="scope"> {{ scope.row.kon }} кр </template>
		</el-table-column>
		<el-table-column prop="created_date" label="Дата" />
		<el-table-column prop="kon" label="Играть">
			<template #default="scope">
				<el-tooltip
					effect="dark"
					content="Отменить игру"
					placement="top"
				>
					<el-button
						icon="delete"
						type="danger"
						circle
						@click="deleteGame(scope.row.id)"
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
						@click="onCreateGameClicked"
						round
						icon="Plus"
						>Создать</el-button
					>
				</span>
			</div>
			<div v-else>Загрузка...</div>
		</template>
	</el-table-->

	<div class="list-group list-group-flush" v-loading="isGamesLoading">
		<div class="list-group-item list-group-item-title">
			<div class="row">
				<div class="col">Игрок</div>
				<div class="col">Ставка</div>
				<div class="col">Дата создания</div>
				<div class="col">Действия</div>
			</div>
		</div>
		<transition-group name="list" mode="out-in">
			<div class="list-group-item list-group-item-action" v-for="game in gamesList" :key="game.id">
				<div class="row align-items-center">
					<div class="col">{{ game.username }}</div>
					<div class="col">{{ game.kon }} кр.</div>
					<div class="col">{{ game.created_date }}</div>
					<div class="col">
						<el-tooltip effect="dark" content="Отменить игру" placement="top">
							<el-button
								icon="delete"
								type="danger"
								circle
								:loading="game.isLoading"
								@click="deleteGame(game.id)"
							/>
						</el-tooltip>
					</div>
				</div>
			</div>

			<div class="list-group-item no-games-placeholder" v-if="gamesList.length === 0 && !isGamesLoading">
				<div class="d-inline-block me-3">Игр нет :(</div>
				<div>
					<el-button
						type="primary"
						@click="onCreateGameClicked"
						round
						icon="Plus"
						>Создать</el-button
					>
				</div>
			</div>
		</transition-group>
	</div>

</template>

<style lang="scss" scoped>
.no-games-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
}
</style>