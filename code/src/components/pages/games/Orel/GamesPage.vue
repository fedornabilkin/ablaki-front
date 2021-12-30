<script>
import { ref } from "@vue/reactivity";
import { useStore } from 'vuex';
import GamesList from './GamesList';
import { orel, errorHandler } from '../../../../services/api';

import moment from "moment";

export default {
    components: {
        GamesList,
    },
    props: {
        reloadListTrigger: {
            type: Boolean,
        }
    },
    emits: ['newGameClick'],
    setup(props, { emit }) {
        const gamesList = ref([]);
        const isGamesLoading = ref(true);
        const konCount = ref([]);

        const store = useStore();

        const fetchGames = (konFilter) => {
            isGamesLoading.value = true;

            orel.getGamesPage(konFilter)
                .then((res) => {
                    const games = res.games.map((game) => ({
                        ...game,
                        createdDate: moment
                            .unix(game.created_at)
                            .format("HH:mm:ss DD.MM.YYYY"),
                        isLoading: false,
                        isWin: null,
                        error: null,
                    }));

                    gamesList.value = games;
                    konCount.value = res.konCount;
                    isGamesLoading.value = false;
                })
                .catch((err) => {
                    console.log(err);
                });
        }

        const onPlay = (id, hod) => {
            let gameIndex = gamesList.value.findIndex((game) => game.id === id);

            gamesList.value[gameIndex].isLoading = true;

            orel.play(id, hod).then((res) => {

                gamesList.value[gameIndex].isLoading = false;
                gamesList.value[gameIndex].isWin = res.game.win;

                store.dispatch('auth/setData', res.gamer);
            }).catch(e => {
                gamesList.value[gameIndex].isLoading = false;
                errorHandler(e, {
                    "The requested model does not exist.": () => {
                        gamesList.value[gameIndex].error = "Игра удалена";
                    },
                    "No free game": () => {
                        gamesList.value[gameIndex].error = "Игра сыграна";
                        // gamesList.value.splice(gameIndex, 1);
                    }
                });
            }).finally(onfinally => {
                let freeGames = gamesList.value.filter(game => {
                    return game.isWin === null && game.error === null;
                });

                if (freeGames.length === 0) {
                    fetchGames();
                }
            });
        }

        const onKonFilter = (kon) => {
            fetchGames(kon);
        }

        const openDialogCreate = () => {
            emit('newGameClick');
        };

        fetchGames();

        return {
            gamesList,
            konCount,
            isGamesLoading,
            onPlay,
            onKonFilter,
            openDialogCreate,
        };
    },
};

</script>

<template>
    <games-list
        :gamesList="gamesList"
        :isGamesLoading="isGamesLoading"
        :konCount="konCount"
        @newGameClick="openDialogCreate"
        @play="onPlay"
        @konFilter="onKonFilter" />
</template>
