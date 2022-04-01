<script>
    import { computed, reactive, ref } from "@vue/reactivity";
    import { watch } from "@vue/runtime-core";
    import { useStore } from "vuex";
    import GameFilter from './GameFilter.vue';

    export default {
    components: { GameFilter },
        props: {
            gamesList: {
                type: Array,
            },
            gamesCount: {
                type: Number,
                default: () => 0,
            },
            konCount: {
                type: Array,
                default: () => null,
            },
            isGamesLoading: {
                type: Boolean,
                default: () => true,
            },
            noplayer: {
                type: Boolean,
                default: () => false,
            },
            notHideDate: {
                type: Boolean,
                default: () => false,
            },
        },
        emits: ["newGameClick", "pageChange", "konFilter", "play"],
        setup(props, { emit }) {
            const currentPage = ref(1);
            const transitionName = ref("out-list");
            const tooltipButtonRef = reactive({el: null, content: null});

            const store = useStore();

            const createNewGame = () => {
                emit("newGameClick");
            };

            const onClickPlay = (id, hod) => {
                emit("play", id, hod);
            };

            const onKonFilter = (kon) => {
                emit("konFilter", kon);
            };

            const gameListReady = props.isGamesLoading === false && props.gamesList.length > 0;

            const getPlayerName = (username, usernameGamer) => {
                return username === store.getters["auth/user"].username ? usernameGamer : username;
            };

            const getGameDate = (createdDate, updatedDate) => {
                return updatedDate ?? createdDate;
            };

            watch(currentPage, (page, oldPage) => {
                emit("pageChange", page);
            });

            watch(
                () => props.gamesList,
                () => {
                    let prevTransition = transitionName.value;
                    transitionName.value = "none";

                    setTimeout(() => {
                        transitionName.value = prevTransition;
                    });
                }
            );

            return {
                props,
                currentPage,
                transitionName,
                tooltipButtonRef,
                gameListReady,
                getPlayerName,
                getGameDate,
                createNewGame,
                onClickPlay,
                onKonFilter,
            };
        },
    };
</script>

<template>
    <game-filter :konCount="props.konCount" @konFilter="onKonFilter"/>

    <el-card
        v-if="props.gamesList.length === 0 && !isGamesLoading"
        shadow="hover"
        class="no-games-card"
    >
        <div class="no-games-placeholder">
            <div class="me-3">Игр нет :(</div>
            <div>
                <el-button type="primary" @click="createNewGame" round icon="Plus"
                    >Создать</el-button
                >
            </div>
        </div>
    </el-card>

    <div v-else class="games-list list-group list-group-flush" v-loading="props.isGamesLoading">
        <div class="list-group-item list-group-item-title games-list-title">
            <div class="row">
                <div class="col" v-if="!props.noplayer">
                    <slot name="playerTitle">Игрок</slot>
                </div>
                <div class="col">Ставка</div>
                <div class="col">
                    <slot name="dateTitle">Дата создания</slot>
                </div>
                <div class="col">
                    <slot name="actionTitle">Играть</slot>
                </div>
            </div>
        </div>

        <transition-group name="list-complete">
            <div class="list-complete-item" v-for="game in props.gamesList" :key="game.id">
                <div class="game-item" v-loading="game.isLoading">
                    <el-card
                        shadow="hover"
                        :class="[
                            'game-card',
                            { 'game-win': game.isWin === true },
                            { 'game-lose': game.isWin === false },
                        ]"
                    >
                        <div class="row align-items-center game-row">
                            <div class="col col-username" v-if="!props.noplayer">
                                <div class="d-sm-none small text-muted label">С кем:</div>
                                <div class="">
                                    {{ getPlayerName(game.username, game.username_gamer) }}
                                </div>
                            </div>
                            <div class="col col-kon">
                                <div>
                                    <span class="d-sm-none small text-muted label">Кон:</span>
                                    <span>{{ game.kon }} кр.</span>
                                </div>
                                <!-- <div class=""></div> -->
                            </div>
                            <div
                                :class="[
                                    'col',
                                    'col-created-date',
                                    { 'hide-mobile': !props.notHideDate },
                                ]"
                            >
                                <slot
                                    name="dateCol"
                                    :createdDate="game.createdDate"
                                    :updatedDate="game.updatedDate"
                                >
                                    <div class="">
                                        {{ getGameDate(game.createdDate, game.updatedDate) }}
                                    </div>
                                </slot>
                            </div>
                            <div class="col col-play">
                                <slot
                                    name="actionCol"
                                    :gameId="game.id"
                                    :isLoading="game.isLoading"
                                >
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
                                </slot>
                            </div>
                        </div>
                    </el-card>
                </div>
            </div>
        </transition-group>
    </div>

    <el-pagination
        background
        :pager-count="5"
        layout="pager"
        :page-size="20"
        :total="props.gamesCount"
        v-model:current-page="currentPage"
        :hide-on-single-page="true"
        class="mt-2"
    />
</template>

<style lang="scss" scoped>
    @import "~bootstrap/scss/functions";
    @import "~bootstrap/scss/variables";
    @import "~bootstrap/scss/mixins";

    .games-list {
        .games-list-title {
            @include media-breakpoint-down(sm) {
                display: none;
            }
        }

        .game-item {
            padding-top: 0.2rem;
            padding-bottom: 0.2rem;
            position: relative;

            .game-card {
                .col-created-date {
                    color: #666;
                    font-size: 0.875em;

                    &.hide-mobile {
                        @include media-breakpoint-down(sm) {
                            display: none;
                        }
                    }
                }

                .col-play {
                    font-size: 1.2rem;
                    font-weight: 600;
                    color: rgb(119, 119, 119);
                    min-height: 40px;
                    display: flex;
                    align-items: center;

                    .game-buttons {
                        display: flex;
                    }
                }

                ::v-deep .el-card__body {
                    padding: 0.5rem 1rem;
                }

                &.game-win {
                    background-image: linear-gradient(90deg, transparent 54%, #31a00447 100%);
                }

                &.game-lose {
                    background-image: linear-gradient(
                        90deg,
                        transparent 54%,
                        rgba(236, 162, 162, 0.562) 100%
                    );
                }
            }
        }
    }

    .no-games-card {
        ::v-deep .el-card__body {
            padding: 0.7rem;
        }

        .no-games-placeholder {
            display: flex;
            align-items: center;
            justify-content: center;
        }
    }
</style>
