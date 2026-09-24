import {getBuilding, TOWN_HALL} from "@/entities/city/buildings";

// Город пока живёт только на клиенте: состояние в localStorage.
// Бюджет симуляции отделён от кредитов аккаунта; серверной экономики города пока нет.

const storageKey = (ownerId) => 'ablakin_city_v2:' + (Number.isSafeInteger(ownerId) && ownerId > 0 ? ownerId : 'guest');

export const GRID_SIZE = 8;
export const TOWN_HALL_CELL = 27; // ряд 3, колонка 3 — почти центр

// Стартовый бюджет локального города каждого аккаунта.
export const START_LOCAL_BUDGET = 500;

export const defaultCityState = () => {
    const grid = Array(GRID_SIZE * GRID_SIZE).fill(null);
    grid[TOWN_HALL_CELL] = TOWN_HALL;
    const ts = Math.floor(Date.now() / 1000);
    return {
        version: 2,
        grid,
        localBudget: START_LOCAL_BUDGET,
        treasury: 0,
        lastAccrueAt: ts,
        lastEventRollAt: ts,
        activeEffects: [],
        eventsLog: [],
    };
};

export const loadCityState = (ownerId) => {
    try {
        const raw = localStorage.getItem(storageKey(ownerId));
        if (!raw) {
            return defaultCityState();
        }
        const state = JSON.parse(raw);
        if (!Array.isArray(state.grid) || state.grid.length !== GRID_SIZE * GRID_SIZE) {
            return defaultCityState();
        }
        return sanitize(migrate(state));
    } catch (e) {
        return defaultCityState();
    }
};

// сейв первой версии (до экономики и событий) дополняем новыми полями
const migrate = (state) => {
    if (state.version >= 2) {
        return state;
    }
    const ts = Math.floor(Date.now() / 1000);
    return {
        ...defaultCityState(),
        grid: state.grid,
        localBudget: state.localBudget ?? START_LOCAL_BUDGET,
        lastAccrueAt: state.lastCollectAt ?? ts,
        lastEventRollAt: ts,
    };
};

export const saveCityState = (state, ownerId) => {
    try {
        localStorage.setItem(storageKey(ownerId), JSON.stringify(state));
    } catch (e) {
        // localStorage недоступен — играем без сохранения
    }
};

export const resetCityState = (ownerId) => {
    try {
        localStorage.removeItem(storageKey(ownerId));
    } catch (e) { /* ignore */ }
    return defaultCityState();
};

const sanitize = (state) => {
    const fallback = defaultCityState();
    const finite = (value, initial) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.min(value, 1e12) : initial;
    const grid = state.grid.map(code => typeof code === 'string' && getBuilding(code) && code !== TOWN_HALL ? code : null);
    grid[TOWN_HALL_CELL] = TOWN_HALL;
    return {
        ...fallback, grid,
        localBudget: finite(state.localBudget, fallback.localBudget),
        treasury: finite(state.treasury, 0),
        lastAccrueAt: Math.min(finite(state.lastAccrueAt, fallback.lastAccrueAt), fallback.lastAccrueAt),
        lastEventRollAt: Math.min(finite(state.lastEventRollAt, fallback.lastEventRollAt), fallback.lastEventRollAt),
        activeEffects: Array.isArray(state.activeEffects) ? state.activeEffects.filter(e => e && ['festival', 'drought', 'fire'].includes(e.code) && Number.isFinite(e.until) && (e.code !== 'fire' || (Number.isInteger(e.cellIndex) && e.cellIndex >= 0 && e.cellIndex < grid.length))).slice(0, 64) : [],
        eventsLog: Array.isArray(state.eventsLog) ? state.eventsLog.filter(e => e && typeof e.code === 'string' && typeof e.title === 'string' && typeof e.text === 'string' && Number.isFinite(e.at)).slice(0, 20) : [],
    };
};
