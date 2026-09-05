<script>
    import { computed, ref } from "@vue/reactivity";
    import { watch } from "@vue/runtime-core";
    import { useStore } from "vuex";
    import GameFilter from './GameFilter.vue';
    import {
        NCard,
        NButton,
        NSpin,
        NPagination,
    } from "naive-ui";

    export default {
        components: { GameFilter, NCard, NButton, NSpin, NPagination },
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

            const pageCount = computed(() => Math.max(1, Math.ceil((props.gamesCount || 0) / 20)));

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
                gameListReady,
                pageCount,
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

    <n-card
        v-if="props.gamesList.length === 0 && !isGamesLoading"
        hoverable
        class="no-games-card"
    >
        <div class="no-games-placeholder">
            <div class="me-3">Игр нет :(</div>
            <div>
                <n-button type="primary" @click="createNewGame" round>
                    <template #icon>
                        <font-awesome-icon icon="fa fa-plus"/>
                    </template>
                    Создать
                </n-button>
            </div>
        </div>
    </n-card>

    <n-spin v-else :show="props.isGamesLoading">
        <div class="games-list list-group list-group-flush">
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
                    <n-spin :show="!!game.isLoading">
                        <div class="game-item">
                            <n-card
                                hoverable
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
                                                <n-button
                                                    type="primary"
                                                    circle
                                                    @click="onClickPlay(game.id, 1)"
                                                >
                                                    <template #icon>
                                                        <font-awesome-icon icon="fa fa-sun"/>
                                                    </template>
                                                </n-button>

                                                <n-button
                                                    class="ms-3"
                                                    circle
                                                    @click="onClickPlay(game.id, 2)"
                                                >
                                                    <template #icon>
                                                        <font-awesome-icon icon="fa fa-moon"/>
                                                    </template>
                                                </n-button>
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
                            </n-card>
                        </div>
                    </n-spin>
                </div>
            </transition-group>
        </div>
    </n-spin>

    <n-pagination
        v-if="pageCount > 1"
        v-model:page="currentPage"
        :page-count="pageCount"
        :page-slot="5"
        class="mt-2"
    />
</template>

<style lang="scss" scoped>
    .games-list {
        .games-list-title {
            @media (max-width: 575.98px) {
                display: none;
            }
        }

        .game-item {
            padding-top: 0.2rem;
            padding-bottom: 0.2rem;
            position: relative;

            .game-card {
                .col-created-date {
                    color: var(--text-muted);
                    font-size: 0.875em;

                    &.hide-mobile {
                        @media (max-width: 575.98px) {
                            display: none;
                        }
                    }
                }

                .col-play {
                    font-size: 1.2rem;
                    font-weight: 600;
                    color: var(--text-muted);
                    min-height: 2.5rem;
                    display: flex;
                    align-items: center;

                    .game-buttons {
                        display: flex;
                    }
                }

                :deep(.n-card__content) {
                    padding: 0.5rem 1rem;
                }

                &.game-win {
                    background-image: linear-gradient(90deg, transparent 54%, rgba(255, 122, 0, 0.28) 100%);
                }

                &.game-lose {
                    background-image: linear-gradient(
                        90deg,
                        transparent 54%,
                        rgba(154, 154, 154, 0.22) 100%
                    );
                }
            }
        }
    }

    .no-games-card {
        :deep(.n-card__content) {
            padding: 0.7rem;
        }

        .no-games-placeholder {
            display: flex;
            align-items: center;
            justify-content: center;
        }
    }
</style>
