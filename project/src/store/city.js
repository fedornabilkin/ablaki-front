import {defineStore} from 'pinia';
import {store as vuexStore} from '@/store/store';
import {getBuilding} from '@/entities/city/buildings';
import {pickWeightedEvent} from '@/entities/city/events';
import {
    GRID_SIZE,
    loadCityState,
    resetCityState,
    saveCityState,
} from '@/services/city/mock';

const now = () => Math.floor(Date.now() / 1000);

// налоги капают максимум за сутки отсутствия — дальше копилка не растёт
const MAX_ACCRUE_SECONDS = 24 * 3600;
// и события за время отсутствия разыгрываются максимум за сутки
const MAX_EVENT_HOURS = 24;
// шанс события на каждый игровой час
const EVENT_CHANCE = 0.35;

const MAX_PARK_BONUS = 0.5;
const DEMOLISH_REFUND = 0.5;
// налог с каждого занятого жителя, кр/ч
const WORKER_TAX = 0.5;
const FESTIVAL_MULTIPLIER = 1.5;
const DROUGHT_FOOD_FACTOR = 0.5;
const AUDIT_FACTOR = 0.8;
const EVENTS_LOG_LIMIT = 20;

const round2 = (value) => Math.round(value * 100) / 100;

const authUser = () => vuexStore?.getters?.['auth/user'] ?? null;

export const useCityStore = defineStore('city', {
    state: () => ({
        grid: [],
        localBudget: 0,
        treasury: 0,
        lastAccrueAt: 0,
        lastEventRollAt: 0,
        activeEffects: [],   // [{code, until, cellIndex?}]
        eventsLog: [],       // [{code, title, text, at}]
        loaded: false,
        selected: null,      // код здания для постройки или 'demolish'
        lastError: null,
        lastMessage: null,
        nowTick: now(),
    }),

    getters: {
        gridSize: () => GRID_SIZE,

        cells: (s) => s.grid.map((code, index) => ({
            index,
            code,
            building: code ? getBuilding(code) : null,
        })),

        liveEffects: (s) => s.activeEffects.filter(e => e.until > s.nowTick),

        hasEffect() {
            return (code) => this.liveEffects.some(e => e.code === code);
        },

        // клетки, выведенные из строя пожаром
        disabledCells() {
            return new Set(this.liveEffects.filter(e => e.code === 'fire').map(e => e.cellIndex));
        },

        // работающие постройки (не сгоревшие)
        builtCells() {
            return this.cells.filter(c => c.building && !this.disabledCells.has(c.index));
        },

        housing() {
            return this.builtCells.reduce((sum, c) => sum + c.building.capacity, 0);
        },

        food() {
            const factor = this.hasEffect('drought') ? DROUGHT_FOOD_FACTOR : 1;
            return Math.floor(this.builtCells.reduce((sum, c) => sum + c.building.feeds, 0) * factor);
        },

        // жителей не может быть больше, чем еды
        population() {
            return Math.min(this.housing, this.food);
        },

        // здания работают в порядке постройки, пока хватает жителей
        workReport() {
            let available = this.population;
            let income = 0;
            let busy = 0;
            const working = new Set();

            this.builtCells.forEach((cell) => {
                const b = cell.building;
                if (b.workers > available) return;
                available -= b.workers;
                busy += b.workers;
                income += b.income;
                working.add(cell.index);
            });

            const parks = this.builtCells
                .reduce((sum, c) => sum + c.building.bonus, 0);
            const parkBonus = Math.min(parks, MAX_PARK_BONUS);
            const festival = this.hasEffect('festival') ? FESTIVAL_MULTIPLIER : 1;

            const gross = round2((income + busy * WORKER_TAX) * (1 + parkBonus) * festival);
            const expenses = round2(this.builtCells.reduce((sum, c) => sum + c.building.upkeep, 0));

            return {
                working,
                busyWorkers: busy,
                grossPerHour: gross,
                expensesPerHour: expenses,
                netPerHour: round2(gross - expenses),
                parkBonus,
                festival: festival > 1,
            };
        },

        incomePerHour() {
            return this.workReport.grossPerHour;
        },

        expensesPerHour() {
            return this.workReport.expensesPerHour;
        },

        netIncomePerHour() {
            return this.workReport.netPerHour;
        },

        balance: (s) => {
            const user = authUser();
            if (user) {
                return Number(user.person?.credit ?? 0);
            }
            return s.localBudget;
        },
    },

    actions: {
        load() {
            const state = loadCityState();
            this.grid = state.grid;
            this.localBudget = state.localBudget;
            this.treasury = state.treasury;
            this.lastAccrueAt = state.lastAccrueAt;
            this.lastEventRollAt = state.lastEventRollAt;
            this.activeEffects = state.activeEffects;
            this.eventsLog = state.eventsLog;
            this.loaded = true;

            this.tick();
            this.startTicker();
        },

        startTicker() {
            if (this._ticker) return;
            this._ticker = setInterval(() => this.tick(), 10000);
        },

        // один шаг симуляции: накапливаем казну и разыгрываем события
        tick() {
            this.nowTick = now();
            this.accrue();
            this.rollEvents();
            this.persist();
        },

        accrue() {
            const elapsed = Math.min(Math.max(this.nowTick - this.lastAccrueAt, 0), MAX_ACCRUE_SECONDS);
            if (elapsed <= 0) return;
            // дефицитный город не копит ничего, но и в минус казна не уходит
            this.treasury = Math.max(0, round2(this.treasury + this.netIncomePerHour * elapsed / 3600));
            this.lastAccrueAt = this.nowTick;
        },

        rollEvents() {
            let hours = Math.floor((this.nowTick - this.lastEventRollAt) / 3600);
            if (hours <= 0) return;
            hours = Math.min(hours, MAX_EVENT_HOURS);

            for (let i = 1; i <= hours; i++) {
                const at = this.lastEventRollAt + i * 3600;
                if (Math.random() < EVENT_CHANCE) {
                    this.applyEvent(pickWeightedEvent(), at);
                }
            }

            this.lastEventRollAt = this.nowTick;
        },

        applyEvent(event, at) {
            let text = event.text;

            if (event.type === 'effect') {
                // событие могло случиться, пока вкладка была закрыта: until отсчитываем
                // от момента события, протухшее просто остаётся записью в хронике
                const existing = this.activeEffects.find(e => e.code === event.code);
                const until = at + event.duration;
                if (existing) {
                    existing.until = Math.max(existing.until, until);
                } else {
                    this.activeEffects.push({ code: event.code, until });
                }
            } else if (event.type === 'fire') {
                const targets = this.cells.filter(
                    c => c.building && !c.building.fixed && !this.disabledCells.has(c.index)
                );
                if (!targets.length) {
                    return; // гореть нечему — событие не случилось
                }
                const target = targets[Math.floor(Math.random() * targets.length)];
                this.activeEffects.push({
                    code: 'fire',
                    until: at + event.duration,
                    cellIndex: target.index,
                });
                text = `Загорелось здание «${target.building.name}» — простаивает 3 часа.`;
            } else if (event.code === 'migrants') {
                this.treasury = round2(this.treasury + event.amount);
            } else if (event.code === 'audit') {
                const lost = round2(this.treasury * (1 - AUDIT_FACTOR));
                this.treasury = round2(this.treasury - lost);
                text = `Ревизор нашёл нарушения: казна −${lost} кр.`;
            } else if (event.code === 'fair') {
                const markets = this.grid.filter(code => code === 'market').length;
                const gain = markets > 0 ? markets * 10 : 5;
                this.treasury = round2(this.treasury + gain);
                text = `Ярмарка прошла с размахом: +${gain} кр в казну.`;
            }

            this.eventsLog.unshift({ code: event.code, title: event.title, text, at });
            this.eventsLog = this.eventsLog.slice(0, EVENTS_LOG_LIMIT);

            // протухшие эффекты подчищаем заодно
            this.activeEffects = this.activeEffects.filter(e => e.until > this.nowTick);
        },

        persist() {
            saveCityState({
                version: 2,
                grid: this.grid,
                localBudget: this.localBudget,
                treasury: this.treasury,
                lastAccrueAt: this.lastAccrueAt,
                lastEventRollAt: this.lastEventRollAt,
                activeEffects: this.activeEffects,
                eventsLog: this.eventsLog,
            });
        },

        spend(amount) {
            if (authUser()) {
                vuexStore.dispatch('auth/addCredit', -amount);
            } else {
                this.localBudget = round2(this.localBudget - amount);
            }
        },

        select(code) {
            this.selected = this.selected === code ? null : code;
            this.lastError = null;
            this.lastMessage = null;
        },

        clickCell(index) {
            this.lastError = null;
            this.lastMessage = null;

            if (this.selected === 'demolish') {
                return this.demolish(index);
            }

            if (this.selected && !this.grid[index]) {
                return this.build(index, this.selected);
            }
        },

        build(index, code) {
            const building = getBuilding(code);
            if (!building || building.fixed) {
                return;
            }
            if (this.grid[index]) {
                this.lastError = 'Участок занят.';
                return;
            }
            if (this.balance < building.cost) {
                this.lastError = `Не хватает кредитов: нужно ${building.cost}, есть ${Math.floor(this.balance)}.`;
                return;
            }

            // доход по старой ставке начисляем до изменения города
            this.tick();
            this.spend(building.cost);
            this.grid[index] = code;
            this.lastMessage = `${building.name} построен (−${building.cost} кр).`;
            this.persist();
        },

        demolish(index) {
            const code = this.grid[index];
            if (!code) {
                return;
            }
            const building = getBuilding(code);
            if (building.fixed) {
                this.lastError = 'Ратушу снести нельзя.';
                return;
            }

            this.tick();
            const refund = Math.floor(building.cost * DEMOLISH_REFUND);
            this.grid[index] = null;
            // пожар на снесённой клетке гасим
            this.activeEffects = this.activeEffects.filter(
                e => !(e.code === 'fire' && e.cellIndex === index)
            );
            this.spend(-refund);
            this.lastMessage = `${building.name} снесён (+${refund} кр).`;
            this.persist();
        },

        collect() {
            this.tick();
            const amount = this.treasury;
            if (amount <= 0) {
                this.lastError = 'В казне пусто — налоги ещё не накапали.';
                return;
            }
            this.spend(-amount);
            this.treasury = 0;
            this.lastMessage = `Собрано ${amount} кр из казны.`;
            this.persist();
        },

        reset() {
            const state = resetCityState();
            this.grid = state.grid;
            this.localBudget = state.localBudget;
            this.treasury = state.treasury;
            this.lastAccrueAt = state.lastAccrueAt;
            this.lastEventRollAt = state.lastEventRollAt;
            this.activeEffects = state.activeEffects;
            this.eventsLog = state.eventsLog;
            this.selected = null;
            this.lastError = null;
            this.lastMessage = 'Город снесён до основания. Начинаем заново!';
        },
    },
});
