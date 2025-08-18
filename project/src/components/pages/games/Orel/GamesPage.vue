<script>
import {ref} from "@vue/reactivity";
import {useStore} from 'vuex';
import GamesList from './GamesList.vue';
import {orel} from '@/services/api/games/orel.js';

import moment from "moment";
import {errorHandler} from "@/services/api/errorHandler.js";

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
      const gamesCount = ref(0);
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
                  gamesCount.value = res.length
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

                let kon = gamesList.value[gameIndex].kon;

                konCount.value = konCount.value.map((konItem) =>
                    konItem.kon === kon ?
                        { ...konItem, count: konItem.count - 1 } :
                        konItem
                );

                store.dispatch('auth/setData', res.gamer);
            }).catch(e => {
                gamesList.value[gameIndex].isLoading = false;
                errorHandler(e, (msg) => gamesList.value[gameIndex].error = msg);
            }).finally(onfinally => {
                let freeGames = gamesList.value.filter(game => {
                    return game.isWin === null && game.error === null;
                });

                if (freeGames.length === 0) {
                    setTimeout(() => {
                        fetchGames();
                    }, 1000);
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
          gamesCount,
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
        :gamesCount="gamesCount"
        :isGamesLoading="isGamesLoading"
        :konCount="konCount"
        @newGameClick="openDialogCreate"
        @play="onPlay"
        @konFilter="onKonFilter" />
</template>
