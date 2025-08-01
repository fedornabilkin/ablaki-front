<script>
import {computed, ref} from "@vue/reactivity";
import {watch} from "@vue/runtime-core";
import {orel} from "../../../../services/api/games/orel";
import GamesList from './GamesList.vue';

import {ElNotification} from "element-plus";
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
        const currentPage = ref(1);

        const fetchGames = (page = 1, merge = false) => {
            isGamesLoading.value = true;
            currentPage.value = page;

            orel.my(page)
                .then((res) => {
                    let games = res.list.map((game) => ({
                        ...game,
                        createdDate: moment
                            .unix(game.created_at)
                            .format("HH:mm:ss DD.MM.YYYY"),
                        isLoading: false,
                        isWin: game.win,
                        error: null,
                    }));

                    if (merge === true) {
                        // console.log("gamesList.value", gamesList.value);
                        // console.log("games", games);

                        gamesList.value = gamesList.value.concat(games);
                        // console.log("gamesList.value", gamesList.value);
                    } else {
                        gamesList.value = games;
                    }
                    
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
                if (gamesCount.value > 20 && gamesList.value.length < 40) {
                    fetchGames(currentPage.value + 1, true);
                }

                gamesList.value.splice(gameIndex, 1);
                gamesCount.value--;

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
            fetchGames(currentPage.value);
        });

        const onCreateGameClicked = () => {
            emit("newGameClick");
        };

        const currentPageGamesList = computed(() => gamesList.value.slice(0, 20));

        fetchGames();

        return {
            gamesList,
            gamesCount,
            isGamesLoading,
            currentPageGamesList,
            deleteGame,
            onPageChange,
            onCreateGameClicked,
        };
    },
};
</script>

<template>
    <games-list
        :gamesList="currentPageGamesList"
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

    </games-list>

</template>

<style lang="scss" scoped>
.no-games-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>
