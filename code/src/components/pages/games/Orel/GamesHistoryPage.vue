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
    <!--el-table :data="gamesList" v-loading="isGamesLoading" class="mt-2">
        <el-table-column prop="username" label="Игрок" />
        <el-table-column prop="kon" label="Ставка">
            <template #default="scope"> {{ scope.row.kon }} кр </template>
        </el-table-column>
        <el-table-column prop="created_date" label="Дата" />
        <el-table-column prop="kon" label="Играть">
            <template #default="scope">
                <el-tooltip
                    effect="dark"
                    content="Отменить игру"
                    placement="top"
                >
                    <el-button
                        icon="delete"
                        type="danger"
                        circle
                        @click="deleteGame(scope.row.id)"
                    />
                </el-tooltip>
            </template>
        </el-table-column>

        <template #empty>
            <div v-if="!isGamesLoading">
                <span class="d-inline-block me-3">Игр нет :(</span>
                <span>
                    <el-button
                        type="primary"
                        @click="onCreateGameClicked"
                        round
                        icon="Plus"
                        >Создать</el-button
                    >
                </span>
            </div>
            <div v-else>Загрузка...</div>
        </template>
    </el-table-->
    <!-- <div class="list-group list-group-flush" v-loading="isGamesLoading">
        <div class="list-group-item list-group-item-title d-none d-sm-block">
            <div class="row">
                <div class="col-2">Игрок 1</div>
                <div class="col-2">Игрок 2</div>
                <div class="col-2">Ставка</div>
                <div class="col-3">Результат</div>
                <div class="col-3">Дата создания/Игры</div>
            </div>
        </div>
        <transition-group name="out-list">
            <div
                class="py-2"
                v-for="game in gamesList"
                :key="game.id"
            >
                <el-card shadow="hover">
                    <div class="row align-items-center">
                        <div class="col-sm-2">
                            <div class="row">
                                <div class="col-5 d-sm-none">Игрок 1: </div>
                                <div class="col-7">{{ game.username }}</div>
                            </div>
                        </div>
                        
                        <div class="col-sm-2">
                            <div class="row">
                                <div class="col-5 d-sm-none">Игрок 2: </div>
                                <div class="col-7">{{ game.username_gamer }}</div>
                            </div>
                        </div>
                        
                        <div class="col-sm-2">
                            <div class="row">
                                <div class="col-5 d-sm-none">Ставка: </div>
                                <div class="col-7">{{ game.kon }} кр.</div>
                            </div>
                        </div>

                        <div class="col-sm-3">
                            <div class="row">
                                <div class="col-5 d-sm-none">Результат: </div>
                                <div class="col-7">{{ game.isWin ? "Победа" : "Поражение" }} </div>
                            </div>
                        </div>

                        <div class="col-sm-3">
                            <div class="row">
                                <div class="col-5 d-sm-none">Дата создания: </div>
                                <div class="col-7 small text-muted">{{ game.createdDate }} </div>
                            </div>
                            <div class="row">
                                <div class="col-5 d-sm-none">Дата игры: </div>
                                <div class="col-7 small text-muted">{{ game.updatedDate }} </div>
                            </div>
                        </div>

                    </div>
                </el-card>
            </div>

            <div
                class="list-group-item no-games-placeholder"
                v-if="gamesList.length === 0 && !isGamesLoading"
            >
                <div class="d-inline-block me-3">Игр нет :(</div>
                <div>
                    <el-button type="primary" @click="onCreateGameClicked" round icon="Plus"
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
