<script>
    import { computed, ref } from "@vue/reactivity";
    import { watch } from "@vue/runtime-core";

    export default {
        props: {
            gamesList: {
                type: Array,
            },
            isGamesLoading: {
                type: Boolean,
                default: () => true,
            },
        },
        emits: ["newGameClick", "onPlay"],
        setup(props, { emit }) {
            const currentPage = ref(1);
            const konList = ref(new Map());
            const konFilter = ref();
            const transitionName = ref("out-list");

            const createNewGame = () => {
                emit("newGameClick");
            };

            const onClickPlay = (id, hod) => {
                emit("onPlay", id, hod);
            };

            const onClickKonFilter = (kon) => {
                transitionName.value = "none";

                konFilter.value = konFilter.value === kon ? undefined : kon;
                currentPage.value = 1;

                setTimeout(() => {
                    transitionName.value = "out-list";
                });
            };

            const gameListReady = props.isGamesLoading === false && props.gamesList.length > 0;

            watch(
                [currentPage, () => props.gamesList],
                (newValues, prevValues) => {
                    transitionName.value = "none";

                    setTimeout(() => {
                        transitionName.value = "out-list";
                    });

                    // if (newValues[1] !== prevValues[1]) {
                    konList.value.clear();
                    newValues[1].map((game) => {
                        if (game.isWin === null && game.error === null) {
                            konList.value.set(game.kon, (konList.value.get(game.kon) ?? 0) + 1);
                        }
                    });
                    // }
                }
            );

            const pageGamesList = computed(() =>
                props.gamesList
                    .filter((game) =>
                        konFilter.value === undefined ? true : game.kon === konFilter.value
                    )
                    .slice((currentPage.value - 1) * 10, currentPage.value * 10)
            );

            const filteredGamesCount = computed(() => 
                props.gamesList
                    .filter((game) =>
                        konFilter.value === undefined ? true : game.kon === konFilter.value
                    ).length
            );

            return {
                props,
                currentPage,
                konList,
                konFilter,
                transitionName,
                gameListReady,
                pageGamesList,
                filteredGamesCount,
                createNewGame,
                onClickPlay,
                onClickKonFilter,
            };
        },
    };
</script>

<template>
    <el-button-group class="kon-filter">
        <el-tooltip
            v-for="[kon, count] in konList"
            effect="dark"
            :content="`${count} шт`"
            placement="top"
        >
            <el-button round @click="onClickKonFilter(kon)" :class="{selected: kon === konFilter}">{{ kon }}</el-button>
        </el-tooltip>
    </el-button-group>

    <div class="list-group list-group-flush" v-loading="props.isGamesLoading">
        <div class="list-group-item list-group-item-title">
            <div class="row">
                <div class="col">Игрок</div>
                <div class="col">Ставка</div>
                <div class="col">Дата создания</div>
                <div class="col">Играть</div>
            </div>
        </div>

        <transition-group :name="transitionName">
            <div
                :class="[
                    'list-group-item',
                    'list-group-item-action',
                    { 'game-win': game.isWin === true },
                    { 'game-lose': game.isWin === false },
                ]"
                v-for="game in pageGamesList"
                :key="game.id"
                v-loading="game.isLoading"
            >
                <div class="row align-items-center game-row">
                    <div class="col">{{ game.username }}</div>
                    <div class="col">{{ game.kon }} кр.</div>
                    <div class="col">{{ game.created_date }}</div>
                    <div class="col">
                        <div v-if="game.error !== null">
                            {{ game.error }}
                        </div>
                        <div v-else-if="game.isWin === null">
                            <!-- <el-tooltip effect="dark" content="Играть" placement="top" :append-to-body="false"> -->
                            <el-button
                                icon="sunny"
                                type="primary"
                                circle
                                @click="onClickPlay(game.id, 1)"
                            />
                            <!-- </el-tooltip> -->

                            <!-- <el-tooltip effect="dark" content="Играть" placement="top" :append-to-body="false"> -->
                            <el-button
                                icon="moon"
                                class="ms-3"
                                circle
                                @click="onClickPlay(game.id, 2)"
                            />
                            <!-- </el-tooltip> -->
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
                v-if="props.gamesList.length === 0 && !isGamesLoading"
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

    <el-pagination
        background
        layout="prev, pager, next"
        :page-size="10"
        :total="filteredGamesCount"
        v-model:current-page="currentPage"
    />
</template>

<style lang="scss" scoped>
    .kon-filter {
        .selected {
            background: var(--el-color-primary);
            color: var(--el-color-white);
        }
    }
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
