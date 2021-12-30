<script>
import { ref } from "@vue/reactivity";
import { watch } from "@vue/runtime-core";
import { orel } from "../../../../services/api";
import GamesList from './GamesList';

import { ElNotification } from "element-plus";
import moment from "moment";

export default {
    components: { GamesList },
    props: {
        reloadListTrigger: {
            type: Boolean,
        },
    },
    emits: ["newGameClick"],
    setup(props, { emit }) {
        const gamesList = ref([]);
        const gamesCount = ref(0);
        const isGamesLoading = ref(true);

        const fetchGames = (page = 1) => {
            isGamesLoading.value = true;

            orel.getMy(page)
                .then((res) => {
                    let games = res.list.map((game) => ({
                        ...game,
                        createdDate: moment
                            .unix(game.created_at)
                            .format("HH:mm:SS DD.MM.YYYY"),
                        isLoading: false,
                        isWin: game.win,
                        error: null,
                    }));

                    gamesList.value = games;
                    gamesCount.value = res.count;
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
                //     (game) => game.id !== id
                // );

                gamesList.value.splice(gameIndex, 1);

                ElNotification({
                    message: "Игра удалена",
                    type: "info",
                });
            });
        };

        const onPageChange = (page) => {
            fetchGames(page);
        }

        watch(() => props.reloadListTrigger, () => {
            fetchGames();
        });

        const onCreateGameClicked = () => {
            emit("newGameClick");
        };

        fetchGames();

        return {
            gamesList,
            gamesCount,
            isGamesLoading,
            deleteGame,
            onPageChange,
            onCreateGameClicked,
        };
    },
};
</script>

<template>
    <games-list
        :gamesList="gamesList"
        :gamesCount="gamesCount"
        :isGamesLoading="isGamesLoading"
        @newGameClick="onCreateGameClicked"
        @pageChange="onPageChange"
        noplayer
        notHideDate
    >
        <template v-slot:actionTitle>Удалить</template>
        
        <template v-slot:actionCol="{ gameId, isLoading }">
            <el-button
                icon="delete"
                type="danger"
                circle
                :loading="isLoading"
                @click="deleteGame(gameId)"
            />
        </template>

        <template v-slot:dateCol="{ createdDate }">
            <span>{{ createdDate }}</span>
        </template>

        <!-- <el-tooltip effect="dark" content="Отменить игру" placement="top">
            <el-button
                icon="delete"
                type="danger"
                circle
                :loading="game.isLoading"
                @click="deleteGame(game.id)"
            />
        </el-tooltip> -->
    </games-list>

    <!-- <div class="list-group list-group-flush" v-loading="isGamesLoading">
        <div class="list-group-item list-group-item-title">
            <div class="row">
                <div class="col">Игрок</div>
                <div class="col">Ставка</div>
                <div class="col">Дата создания</div>
                <div class="col">Действия</div>
            </div>
        </div>
        <transition-group name="out-list">
            <div class="list-group-item list-group-item-action" v-for="game in gamesList" :key="game.id">
                <div class="row align-items-center">
                    <div class="col">{{ game.username }}</div>
                    <div class="col">{{ game.kon }} кр.</div>
                    <div class="col">{{ game.createdDate }}</div>
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
    </div> -->

</template>

<style lang="scss" scoped>
.no-games-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>