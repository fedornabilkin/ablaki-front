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

        const deleteGame = (id) => {
            let gameIndex = gamesList.value.findIndex((game) => game.id === id);

            gamesList.value[gameIndex].isLoading = true;
            
            orel.delete(id).then((res) => {
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

    </games-list>

</template>

<style lang="scss" scoped>
.no-games-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>