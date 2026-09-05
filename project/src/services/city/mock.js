import config from "@/config/config";
import {TOWN_HALL} from "@/entities/city/buildings";

// Город пока живёт только на клиенте: состояние в localStorage.
// Когда появится бэк (/v1/city), этот файл уйдёт, а cityApi в
// services/api/city.js начнёт ходить по сети (см. TODO там).

const STORAGE_KEY = 'ablakin_city_v1';

export const GRID_SIZE = 8;
export const TOWN_HALL_CELL = 27; // ряд 3, колонка 3 — почти центр

// стартовый бюджет на случай, когда нет авторизации (нечего списывать через vuex)
export const START_LOCAL_BUDGET = 500;

export const isCityMockMode = () => {
    if (config.getParam('cityMock')) return true;
    const apiDomain = config.getParam('apiDomain');
    return !apiDomain || apiDomain === 'mock';
};

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

export const loadCityState = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return defaultCityState();
        }
        const state = JSON.parse(raw);
        if (!Array.isArray(state.grid) || state.grid.length !== GRID_SIZE * GRID_SIZE) {
            return defaultCityState();
        }
        return migrate(state);
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

export const saveCityState = (state) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        // localStorage недоступен — играем без сохранения
    }
};

export const resetCityState = () => {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* ignore */ }
    return defaultCityState();
};
