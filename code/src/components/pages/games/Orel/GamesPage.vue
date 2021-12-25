<script>
import { ref } from "@vue/reactivity";
import { useStore } from 'vuex';
import GamesList from './GamesList.vue';
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

        const store = useStore();

        const fetchGames = () => {
            isGamesLoading.value = true;
            orel.get()
                .then((res) => {
                    res = res.map((game) => ({
                        ...game,
                        created_date: moment.unix(game.created_at).format("HH:mm:SS DD.MM.YYYY"),
                        isLoading: false,
                        isWin: null,
                        error: null,
                    }));

                    gamesList.value = res;
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

        const openDialogCreate = () => {
            emit('newGameClick');
        };

        fetchGames();

        return {
            gamesList,
            isGamesLoading,
            onPlay,
            openDialogCreate,
        };
    },
};

</script>

<template>
    <games-list
        :gamesList="gamesList"
        :isGamesLoading="isGamesLoading"
        @newGameClick="openDialogCreate"
        @onPlay="onPlay" />
</template>
