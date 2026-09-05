// TODO(stat-mock): временный in-memory мок игры «Дуэль», пока на бэке нет
// эндпоинтов /v1/duel. После подключения бэка удалить этот файл и ветки
// isStatMockMode() в services/api/games/duel.js (флаг общий — VITE_STAT_MOCK).

const delay = (ms = 250) => new Promise(resolve => setTimeout(resolve, ms));

const now = () => Math.floor(Date.now() / 1000);

// зоны: 1 — голова, 2 — корпус, 3 — ноги
const randomZone = () => 1 + Math.floor(Math.random() * 3);

// правила — те же, что на бэке: удар проходит мимо блока — попадание;
// попал только один — победил, иначе ничья
export const resolveDuel = (u1, b1, u2, b2) => {
    const creatorHit = u1 !== b2;
    const gamerHit = u2 !== b1;
    if (creatorHit === gamerHit) {
        return 'draw';
    }
    return creatorHit ? 'user' : 'gamer';
};

let nextId = 3000;

// свободные схватки ботов; u1/b1 скрыты, в списке не отдаются
const openGames = [
    { id: 1, user_id: 11, username: 'Vint', kon: 10, u1: 1, b1: 2, created_at: now() - 3600 },
    { id: 2, user_id: 12, username: 'Tuman', kon: 25, u1: 3, b1: 1, created_at: now() - 1800 },
    { id: 3, user_id: 13, username: 'Strelok', kon: 50, u1: 2, b1: 2, created_at: now() - 600 },
    { id: 4, user_id: 14, username: 'Ryba', kon: 10, u1: 2, b1: 3, created_at: now() - 60 },
];

const myFreeGames = [];

const history = [
    {
        id: 800, user_id: 12, username: 'Tuman', username_gamer: 'Kotofey',
        kon: 20, u1: 1, b1: 2, u2: 2, b2: 1, result: 'gamer',
        created_at: now() - 90000, updated_at: now() - 86400,
    },
    {
        id: 801, user_id: 13, username: 'Strelok', username_gamer: 'Lavina',
        kon: 35, u1: 2, b1: 1, u2: 1, b2: 3, result: 'draw',
        created_at: now() - 50000, updated_at: now() - 43200,
    },
];

const freeGameFields = (game) => ({
    id: game.id,
    user_id: game.user_id,
    username: game.username,
    username_gamer: null,
    kon: game.kon,
    created_at: game.created_at,
    updated_at: game.created_at,
});

export const duelMock = {
    get: async () => {
        await delay();
        return openGames.map(freeGameFields);
    },

    my: async () => {
        await delay();
        const list = myFreeGames.map(game => ({
            ...freeGameFields(game),
            username: 'Вы',
            u1: game.u1,
            b1: game.b1,
            my_role: 'user',
        }));
        return { list, count: list.length };
    },

    getHistory: async () => {
        await delay();
        return {
            list: [...history].sort((a, b) => b.updated_at - a.updated_at),
            count: history.length,
        };
    },

    create: async (kon, u1, b1) => {
        await delay();
        const game = {
            id: nextId++,
            user_id: 0,
            username: 'Вы',
            kon,
            u1,
            b1,
            created_at: now(),
        };
        myFreeGames.unshift(game);
        return { ...freeGameFields(game), u1, b1 };
    },

    play: async (id, u2, b2) => {
        await delay();

        if (myFreeGames.some(game => game.id === id)) {
            return Promise.reject({ message: 'Это твоя схватка' });
        }

        const index = openGames.findIndex(game => game.id === id);
        if (index === -1) {
            return Promise.reject({ message: 'Схватка уже разыграна' });
        }

        const open = openGames[index];
        openGames.splice(index, 1);

        const game = {
            ...freeGameFields(open),
            username_gamer: 'Вы',
            u1: open.u1,
            b1: open.b1,
            u2,
            b2,
            result: resolveDuel(open.u1, open.b1, u2, b2),
            updated_at: now(),
            my_role: 'gamer',
        };
        history.unshift(game);

        return { gamer: null, game };
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
