import config from "@/config/config";

// TODO(stat-mock): временные фейковые данные, пока на бэке нет эндпоинтов
// /v1/stat, /v1/stat/top, /v1/stat/user/{login} и PATCH /v1/users/wall.
// После подключения бэка удалить: этот файл, флаг VITE_STAT_MOCK (params.js,
// .env, .env-sample) и ветки isStatMockMode() в services/api/stat.js и services/api.js.

export const isStatMockMode = () => {
    if (config.getParam('statMock')) return true;
    const apiDomain = config.getParam('apiDomain');
    return !apiDomain || apiDomain === 'mock';
};

const delay = (ms = 250) => new Promise(resolve => setTimeout(resolve, ms));

// топ по периодам: разные списки, чтобы фильтры визуально работали;
// за день специально меньше четырёх — виден пустой слот подиума без списка
const TOP_BY_PERIOD = {
    'all': [
        { username: 'BORA179', rating: 155 },
        { username: 'Ass238', rating: 72.9 },
        { username: 'ZmeyGor', rating: 64.1 },
        { username: 'Koleso', rating: 51.8 },
        { username: 'Mexx', rating: 47.3 },
        { username: 'Tuman', rating: 39 },
        { username: 'Lavina', rating: 33.6 },
        { username: 'Kotofey', rating: 27.2 },
        { username: 'Strelok', rating: 21.5 },
        { username: 'Vihr', rating: 18.4 },
    ],
    'half-year': [
        { username: 'ZmeyGor', rating: 38.2 },
        { username: 'BORA179', rating: 35.7 },
        { username: 'Lavina', rating: 29.4 },
        { username: 'Mexx', rating: 24.8 },
        { username: 'Ass238', rating: 22.1 },
        { username: 'Kotofey', rating: 17.9 },
        { username: 'Koleso', rating: 15.3 },
        { username: 'Ryba', rating: 12.6 },
        { username: 'Strelok', rating: 9.8 },
        { username: 'Tuman', rating: 7.5 },
    ],
    'month': [
        { username: 'Lavina', rating: 14.6 },
        { username: 'ZmeyGor', rating: 12.3 },
        { username: 'Kotofey', rating: 10.9 },
        { username: 'BORA179', rating: 8.4 },
        { username: 'Ryba', rating: 6.7 },
        { username: 'Mexx', rating: 5.2 },
        { username: 'Vihr', rating: 3.9 },
        { username: 'Ass238', rating: 2.8 },
        { username: 'Strelok', rating: 1.6 },
    ],
    'week': [
        { username: 'Kotofey', rating: 5.4 },
        { username: 'Lavina', rating: 4.1 },
        { username: 'Ryba', rating: 3.3 },
        { username: 'ZmeyGor', rating: 2.7 },
        { username: 'Vint', rating: 1.9 },
        { username: 'Mexx', rating: 1.2 },
        { username: 'Vihr', rating: 0.8 },
    ],
    'day': [
        { username: 'Ryba', rating: 1.4 },
        { username: 'Kotofey', rating: 0.9 },
    ],
};

export const mockStatIndex = async () => {
    await delay();
    return {
        users: 1248,
        games: { orel: 8214, saper: 3471 },
        forum: { themes: 312, comments: 4587 },
        exchange: 1925,
        topRating: TOP_BY_PERIOD['all'].slice(0, 5),
    };
};

export const mockStatTop = async (period = 'all') => {
    await delay();
    return {
        period,
        list: TOP_BY_PERIOD[period] ?? [],
    };
};

// детерминированно по логину, чтобы у каждой стены были свои, но стабильные числа
export const mockStatUser = async (login) => {
    await delay();
    const seed = [...String(login)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const orelPlayed = 40 + (seed % 260);
    return {
        games: {
            orel: {
                played: orelPlayed,
                won: Math.floor(orelPlayed * (0.35 + (seed % 30) / 100)),
            },
            saper: { played: seed % 120 },
        },
        forum: {
            themes: seed % 14,
            comments: 5 + (seed % 230),
        },
        exchange: seed % 90,
    };
};

export const mockSaveWall = async (description) => {
    await delay();
    return { description };
};
