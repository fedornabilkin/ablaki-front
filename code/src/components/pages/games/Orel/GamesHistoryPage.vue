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

                orel.getHistory(page)
                    .then((res) => {
                        let games = res.list.map((game) => ({
                            ...game,
                            createdDate: moment
                                .unix(game.created_at)
                                .format("HH:mm:ss DD.MM.YYYY"),
                            updatedDate: moment
                                .unix(game.updated_at)
                                .format("HH:mm:ss DD.MM.YYYY"),
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

            // watch(() => props.reloadListTrigger, () => {
            //     fetchGames();
            // });

            const onPageChange = (page) => {
                fetchGames(page);
            }

            const onCreateGameClicked = () => {
                emit("newGameClick");
            };

            fetchGames();

            return {
                gamesList,
                gamesCount,
                isGamesLoading,
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
    >
        <template v-slot:dateTitle>
            <span>Дата</span>
        </template>
    </games-list>
</template>

<style lang="scss" scoped>
</style>
