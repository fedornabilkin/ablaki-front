<script>
import { ref } from "@vue/reactivity";
import { orel } from "../../../../services/api";
import CreateGame from "./CreateGame.vue";
import GamesList from './GamesList.vue';

export default {
	components: {
		CreateGame,
		GamesList
	},
	setup() {
		const dialogCreate = ref(false);

		const openDialogCreate = () => {
			dialogCreate.value = true;
		};

		const closeDialogCreate = () => {
			dialogCreate.value = false;
		};

		return {
			dialogCreate,
			openDialogCreate,
			closeDialogCreate,
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
		<div class="col-sm">
			<div class="display-6">Игра Орел-решка</div>
		</div>

		<div class="col-sm-auto mt-3 mt-sm-0">
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
        :onClose="closeDialogCreate" />

	<games-list 
		:newGameClick="openDialogCreate" />
</template>
