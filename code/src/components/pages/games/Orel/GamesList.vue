<script>
    import { ref } from "@vue/reactivity";
    import { orel } from "../../../../services/api";
    import moment from "moment";
    import { useStore } from 'vuex';

    export default {
        emits: ["newGameClick"],
        setup(props, { emit }) {
            const gamesList = ref([]);
            const isGamesLoading = ref(true);
            const store = useStore();

            const createNewGame = () => {
                emit("newGameClick");
            };

            const onClickPlay = (id, hod) => {
                let gameIndex = gamesList.value.findIndex((game) => game.id === id);

                gamesList.value[gameIndex].isLoading = true;

                orel.play(id, hod).then((res) => {
                    // gamesList.value = gamesList.value.filter(
                    // 	(game) => game.id !== id
                    // );

                    gamesList.value[gameIndex].isLoading = false;
                    gamesList.value[gameIndex].isWin = res.game.win;

                    store.dispatch('auth/setData', res.gamer);
                });
            };

            const gameListReady = isGamesLoading.value === false && gamesList.value.length > 0;

            orel.get()
                .then((res) => {
                    res = res.map((game) => ({
                        ...game,
                        created_date: moment.unix(game.created_at).format("HH:mm:SS DD.MM.YYYY"),
                        isLoading: false,
                        isWin: null,
                    }));

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
            };
        },
    };
</script>

<template>
    <div class="list-group list-group-flush" v-loading="isGamesLoading">
        <div class="list-group-item list-group-item-title">
            <div class="row">
                <div class="col">Игрок</div>
                <div class="col">Ставка</div>
                <div class="col">Дата создания</div>
                <div class="col">Играть</div>
            </div>
        </div>

        <transition-group name="list" mode="out-in">
            <div
                :class="[
                    'list-group-item',
                    'list-group-item-action',
                    { 'game-win': game.isWin === true },
                    { 'game-lose': game.isWin === false },
                ]"
                v-for="game in gamesList"
                :key="game.id"
            >
                <div class="row align-items-center game-row" v-loading="game.isLoading">
                    <div class="col">{{ game.username }}</div>
                    <div class="col">{{ game.kon }} кр.</div>
                    <div class="col">{{ game.created_date }}</div>
                    <div class="col">
                        <div v-if="game.isWin === null">
                            <el-tooltip effect="dark" content="Играть" placement="top">
                                <el-button
                                    icon="sunny"
                                    type="primary"
                                    circle
                                    @click="onClickPlay(game.id, 2)"
                                />
                            </el-tooltip>

                            <el-tooltip effect="dark" content="Играть" placement="top">
                                <el-button icon="moon" circle @click="onClickPlay(game.id, 2)" />
                            </el-tooltip>
                        </div>
                        <div v-else-if="game.isWin === true">
                            Победа
                        </div>
                        <div v-else-if="game.isWin === false">
                            Поражение
                        </div>
                    </div>
                </div>
            </div>

            <div
                class="list-group-item no-games-placeholder"
                v-if="gamesList.length === 0 && !isGamesLoading"
            >
                <div class="d-inline-block me-3">Игр нет :(</div>
                <div>
                    <el-button type="primary" @click="createNewGame" round icon="Plus"
                        >Создать</el-button
                    >
                </div>
            </div>
        </transition-group>
    </div>
</template>

<style lang="scss" scoped>
    .list-group-item {
        min-height: 57px;
        display: flex;
        align-items: center;

        .game-row {
            height: 100%;
            width: 100%;
        }

        &.game-win {
            background-color: rgba(162, 236, 191, 0.562);
        }

        &.game-lose {
            background-color: rgba(236, 162, 162, 0.562);
        }
    }
</style>
