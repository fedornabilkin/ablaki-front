// TODO(stat-mock): временный in-memory мок игры «5 яблок», пока на бэке нет
// эндпоинтов /v1/five. После подключения бэка удалить этот файл и ветки
// isStatMockMode() в services/api/games/five.js (флаг общий — VITE_STAT_MOCK).
//
// Партия до 21 очка. Боты-создатели отвечают мгновенно: после каждого твоего
// хода бот сразу делает следующий скрытый ход, так что ход всегда за тобой.

const delay = (ms = 250) => new Promise(resolve => setTimeout(resolve, ms));

const now = () => Math.floor(Date.now() / 1000);

const WIN_POINTS = 21;

const botBall = () => 1 + Math.floor(Math.random() * 5);

// правила раунда — те же, что на бэке:
// равные числа — ничья; разница в 1 — меньший забирает сумму очками; иначе больший забирает разность
export const resolveRound = (userBall, gamerBall) => {
    if (userBall === gamerBall) {
        return { status: 'draw', amount: 0 };
    }
    const diff = Math.abs(userBall - gamerBall);
    if (diff === 1) {
        return { status: userBall < gamerBall ? 'user' : 'gamer', amount: userBall + gamerBall };
    }
    return { status: userBall > gamerBall ? 'user' : 'gamer', amount: diff };
};

let nextId = 2000;

// свободные партии ботов; hiddenBall — скрытый ход создателя, в ответах не отдаётся
const openGames = [
    { id: 1, user_id: 11, username: 'Vint', kon: 10, hiddenBall: 2, created_at: now() - 3600 },
    { id: 2, user_id: 12, username: 'Tuman', kon: 25, hiddenBall: 5, created_at: now() - 1800 },
    { id: 3, user_id: 13, username: 'Strelok', kon: 50, hiddenBall: 3, created_at: now() - 600 },
    { id: 4, user_id: 14, username: 'Ryba', kon: 10, hiddenBall: 1, created_at: now() - 60 },
];

// идущие партии, где я — соперник (gamer) против бота-создателя
const activeGames = [];

// мои свободные партии (в моке боты в них не вступают)
const myFreeGames = [];

const history = [
    {
        id: 900, user_id: 12, username: 'Tuman', username_gamer: 'Kotofey',
        kon: 20, user_points: 21, gamer_points: 14, status: 'user',
        created_at: now() - 90000, updated_at: now() - 86400,
    },
    {
        id: 901, user_id: 13, username: 'Strelok', username_gamer: 'Lavina',
        kon: 35, user_points: 9, gamer_points: 23, status: 'gamer',
        created_at: now() - 50000, updated_at: now() - 43200,
    },
];

const freeGameFields = (game) => ({
    id: game.id,
    user_id: game.user_id,
    username: game.username,
    username_gamer: null,
    kon: game.kon,
    status: 'free',
    user_points: 0,
    gamer_points: 0,
    turn: 'gamer',
    created_at: game.created_at,
    updated_at: game.created_at,
});

const activeGameFields = (game) => ({
    id: game.id,
    user_id: game.user_id,
    username: game.username,
    username_gamer: 'Вы',
    kon: game.kon,
    status: game.status,
    user_points: game.user_points,
    gamer_points: game.gamer_points,
    turn: game.status === 'play' ? 'gamer' : null,
    created_at: game.created_at,
    updated_at: game.updated_at,
    my_role: 'gamer',
});

// мой ход закрывает раунд; бот сразу делает следующий скрытый ход
const resolveStep = (game, ball) => {
    const hiddenBall = game.hiddenBall;
    const result = resolveRound(hiddenBall, ball);

    const hod = {
        user_ball: hiddenBall,
        gamer_ball: ball,
        status: result.status,
        user_amount: result.status === 'user' ? result.amount : 0,
        gamer_amount: result.status === 'gamer' ? result.amount : 0,
    };

    game.user_points += hod.user_amount;
    game.gamer_points += hod.gamer_amount;
    game.updated_at = now();

    if (game.user_points >= WIN_POINTS || game.gamer_points >= WIN_POINTS) {
        game.status = game.user_points >= WIN_POINTS ? 'user' : 'gamer';
        const activeIndex = activeGames.findIndex(g => g.id === game.id);
        if (activeIndex !== -1) {
            activeGames.splice(activeIndex, 1);
        }
        history.unshift({ ...activeGameFields(game) });
    } else {
        game.hiddenBall = botBall();
    }

    return { gamer: null, game: activeGameFields(game), hod };
};

export const fiveMock = {
    get: async () => {
        await delay();
        return openGames.map(freeGameFields);
    },

    my: async () => {
        await delay();
        const list = [
            ...activeGames.map(activeGameFields),
            ...myFreeGames.map(game => ({
                ...freeGameFields(game),
                username: 'Вы',
                turn: 'gamer',
                my_role: 'user',
                my_ball: game.ball,
            })),
        ];
        return { list, count: list.length };
    },

    getHistory: async () => {
        await delay();
        return {
            list: [...history].sort((a, b) => b.updated_at - a.updated_at),
            count: history.length,
        };
    },

    create: async (kon, ball) => {
        await delay();
        const game = {
            id: nextId++,
            user_id: 0,
            username: 'Вы',
            kon,
            ball,
            created_at: now(),
        };
        myFreeGames.unshift(game);
        return freeGameFields(game);
    },

    play: async (id, ball) => {
        await delay();

        if (myFreeGames.some(game => game.id === id)) {
            return Promise.reject({ message: 'Это твоя игра' });
        }

        const openIndex = openGames.findIndex(game => game.id === id);
        if (openIndex !== -1) {
            const open = openGames[openIndex];
            openGames.splice(openIndex, 1);
            const game = {
                ...open,
                status: 'play',
                user_points: 0,
                gamer_points: 0,
                updated_at: now(),
            };
            activeGames.unshift(game);
            return resolveStep(game, ball);
        }

        const active = activeGames.find(game => game.id === id);
        if (active) {
            return resolveStep(active, ball);
        }

        return Promise.reject({ message: 'Игра уже разыграна' });
    },

    delete: async (id) => {
        await delay();
        const index = myFreeGames.findIndex(game => game.id === id);
        if (index !== -1) {
            myFreeGames.splice(index, 1);
        }
        return true;
    },
};
