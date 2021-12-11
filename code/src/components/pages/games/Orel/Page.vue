<script>
import { ref } from "@vue/reactivity";
import { orel } from "../../../../services/api";
import CreateGame from "./CreateGame";

export default {
	components: { CreateGame },
	setup() {
		const gamesList = ref([]);
		const dialogCreate = ref(false);
		const isGamesLoading = ref(true);

		const dialogCreateClose = () => {
			dialogCreate.value = false;
		};

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
			dialogCreate,
            isGamesLoading,
			dialogCreateClose,
		};
	},
};

/*gameUrl: function () {
        return 'v1/orel';
},
urlList: function () {
        return config.makeApiUrl(this.gameUrl());
},
urlPlay: function (id) {
        return config.makeApiUrl(this.gameUrl() + '/play/' + id);
},
urlDel: function (id) {
        return config.makeApiUrl(this.gameUrl() + id);
},
urlRemove: function () {
        return config.makeApiUrl(this.gameUrl() + '/remove');
},
urlCreate: function () {
        return config.makeApiUrl(this.gameUrl());
},
urlMy: function () {
        return config.makeApiUrl(this.gameUrl() + '/my');
},
urlHistory: function () {
        return config.makeApiUrl(this.gameUrl() + '/history');
},*/
</script>

<template>
	<div class="row mt-2">
		<div class="col">
			<div class="display-6">Игра Орел-решка</div>
		</div>

		<div class="col-auto">
			<el-button
				type="primary"
				@click="dialogCreate = true"
				round
				icon="Plus"
				>Создать игры</el-button
			>
		</div>
	</div>

	<create-game
        :isOpen="dialogCreate"
        :onClose="dialogCreateClose" />

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
                    @click="dialogCreate = true"
                    round
                    icon="Plus"
                    >Создать</el-button
                >
            </span>
        </template>
	</el-table>
</template>
