<script>
import { ref } from "@vue/reactivity";
import { watch } from '@vue/runtime-core';
import CreateGame from "./CreateGame.vue";

export default {
	components: {
		CreateGame,
	},
	setup() {
		const dialogCreate = ref(false);

		const openDialogCreate = () => {
			dialogCreate.value = true;
		};

		const closeDialogCreate = () => {
			dialogCreate.value = false;
		};

		watch(dialogCreate, (v, ov) => {
			console.log("watch(dialogCreate", ov, v);
		})

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

	<div>
		<el-breadcrumb separator="/">
			<el-breadcrumb-item to="/games/orel">
				<el-button type="text" icon="apple">Все игры</el-button>
			</el-breadcrumb-item>

			<el-breadcrumb-item to="/games/orel/my">
				<el-button type="text" icon="apple">Мои игры</el-button>
			</el-breadcrumb-item>
			
			<el-breadcrumb-item to="/games/orel/history">
				<el-button type="text" icon="apple">История</el-button>
			</el-breadcrumb-item>
		</el-breadcrumb>
	</div>

	<create-game
        :isOpen="dialogCreate"
        @close="closeDialogCreate" />

	<router-view @newGameClick="openDialogCreate"></router-view>
</template>
