<script>
    import { computed, ref } from "@vue/reactivity";
    import { watch } from "@vue/runtime-core";

    export default {
        props: {
            gamesList: {
                type: Array,
            },
            gamesCount: {
                type: Number,
            },
            konCount: {
                type: Array,
            },
            isGamesLoading: {
                type: Boolean,
                default: () => true,
            },
        },
        emits: ["newGameClick", "pageChange", "konFilter", "play"],
        setup(props, { emit }) {
            // const currentPage = ref(1);
            const konFilter = ref();
            // const transitionName = ref("fade-list");

            const createNewGame = () => {
                emit("newGameClick");
            };

            const onClickPlay = (id, hod) => {
                emit("play", id, hod);
            };

            const onClickKonFilter = (kon) => {
                // transitionName.value = "none";

                konFilter.value = konFilter.value === kon ? undefined : kon;

                emit("konFilter", konFilter.value);
                // currentPage.value = 1;

                // setTimeout(() => {
                    // transitionName.value = "fade-list";
                // });
            };

            const gameListReady = props.isGamesLoading === false && props.gamesList.length > 0;

            // watch(currentPage, (page, oldPage) => {
                // emit("pageChange", page);
            // });

            // watch(() => props.gamesList, () => {
            //     transitionName.value = "none";

            //     setTimeout(() => {
            //         // transitionName.value = "fade-list";
            //     });
            // });

            // watch(
            //     [currentPage, () => props.gamesList],
            //     (newValues, prevValues) => {
            //         transitionName.value = "none";

            //         setTimeout(() => {
            //             transitionName.value = "out-list";
            //         });

            //         konList.value.clear();
            //         newValues[1].map((game) => {
            //             if (game.isWin === null && game.error === null) {
            //                 konList.value.set(game.kon, (konList.value.get(game.kon) ?? 0) + 1);
            //             }
            //         });
            //     }
            // );

            // const pageGamesList = computed(() =>
            //     props.gamesList
            //         .filter((game) =>
            //             konFilter.value === undefined ? true : game.kon === konFilter.value
            //         )
            //         .slice((currentPage.value - 1) * 10, currentPage.value * 10)
            // );

            // const filteredGamesCount = computed(() => 
            //     props.gamesList
            //         .filter((game) =>
            //             konFilter.value === undefined ? true : game.kon === konFilter.value
            //         ).length
            // );

            console.log(props);

            return {
                props,
                // currentPage,
                konFilter,
                // transitionName,
                gameListReady,
                // pageGamesList,
                // filteredGamesCount,
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
            v-for="{kon, count} in props.konCount"
            effect="dark"
            :content="`${count} шт`"
            placement="top"
        >
            <el-button round @click="onClickKonFilter(kon)" :class="{selected: kon === konFilter}">{{ kon }}</el-button>
        </el-tooltip>
    </el-button-group>

    <div class="list-group list-group-flush" v-loading="props.isGamesLoading">
        <div class="list-group-item list-group-item-title game-list-title">
            <div class="row">
                <div class="col">Игрок</div>
                <div class="col">Ставка</div>
                <div class="col">Дата создания</div>
                <div class="col">Играть</div>
            </div>
        </div>

        <!-- <transition-group :name="transitionName"> -->
            <div
                class="game-item"
                v-for="game in gamesList"
                :key="game.id"
                v-loading="game.isLoading"
            >
                <el-card shadow="hover" :class="[
                    'game-card',
                    { 'game-win': game.isWin === true },
                    { 'game-lose': game.isWin === false },
                ]">
                    <div class="row align-items-center game-row">
                        <div class="col col-username">
                            <div class="d-sm-none small text-muted label">С кем:</div>
                            <div class="">{{ game.username }}</div>
                        </div>
                        <div class="col col-kon">
                            <div class="d-sm-none small text-muted label">На сколько:</div>
                            <div class="">{{ game.kon }} кр.</div>
                        </div>
                        <div class="col col-createdDate">{{ game.createdDate }}</div>
                        <div class="col col-play">
                            <div v-if="game.error !== null">
                                {{ game.error }}
                            </div>
                            <div v-else-if="game.isWin === null" class="game-buttons">
                                <el-button
                                    icon="sunny"
                                    type="primary"
                                    circle
                                    @click="onClickPlay(game.id, 1)"
                                />

                                <el-button
                                    icon="moon"
                                    class="ms-3"
                                    circle
                                    @click="onClickPlay(game.id, 2)"
                                />
                            </div>
                            <div v-else-if="game.isWin === true">
                                Победа
                            </div>
                            <div v-else-if="game.isWin === false">
                                Поражение
                            </div>
                        </div>
                    </div>
                </el-card>
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
        <!-- </transition-group> -->
    </div>

    <!-- <el-pagination
        background
        :pager-count="5"
        layout="pager"
        :page-size="10"
        :total="props.gamesCount"
        v-model:current-page="currentPage"
        class="mt-2"
    /> -->
</template>

<style lang="scss" scoped>

    .kon-filter {
        .selected {
            background: var(--el-color-primary);
            color: var(--el-color-white);
        }
    }

    .game-list-title {
        @include media-breakpoint-down(sm) {
                display: none;
            }
    }

    .game-item {
        padding-top: 0.5rem;
        padding-bottom: 0.5rem;
        position: relative;

        .game-card {
            .col-createdDate {
                @include media-breakpoint-down(sm) {
                    display: none;
                }
            }

            .col-play {
                .game-buttons {
                    display: flex;
                }
            }

            &.game-win {
                background: linear-gradient(90deg, transparent 54%, #31a00447 100%);
            }

            &.game-lose {
                background: linear-gradient(90deg, transparent 54%, rgba(236, 162, 162, 0.562) 100%);
            }
        }
    }
</style>
