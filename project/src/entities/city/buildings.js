// Справочник зданий градостроительного симулятора.
// capacity — сколько жителей даёт; feeds — сколько жителей кормит;
// workers — сколько жителей нужно, чтобы здание работало;
// income — кредитов в час, когда работает; bonus — множитель дохода города;
// upkeep — содержание, кредитов в час (вычитается из дохода города).

export const TOWN_HALL = 'townhall';

export const BUILDINGS = {
    [TOWN_HALL]: {
        code: TOWN_HALL,
        name: 'Ратуша',
        icon: 'fa fa-landmark',
        color: '#b8860b',
        cost: 0,
        capacity: 2,
        feeds: 4,
        workers: 0,
        income: 1,
        upkeep: 0,
        bonus: 0,
        fixed: true,
        description: 'Сердце города. Даёт 2 жителей, кормит 4 и приносит 1 кр/ч. Снести нельзя.',
    },
    house: {
        code: 'house',
        name: 'Дом',
        icon: 'fa fa-house',
        color: '#4f7cac',
        cost: 50,
        capacity: 4,
        feeds: 0,
        workers: 0,
        income: 0,
        upkeep: 0,
        bonus: 0,
        description: '+4 жителя. Жителям нужна еда, иначе они не заселятся. Занятые жители платят налог 0.5 кр/ч.',
    },
    farm: {
        code: 'farm',
        name: 'Ферма',
        icon: 'fa fa-seedling',
        color: '#5a8f3d',
        cost: 40,
        capacity: 0,
        feeds: 8,
        workers: 1,
        income: 0,
        upkeep: 0.5,
        bonus: 0,
        description: 'Кормит 8 жителей. Требует 1 работника, содержание 0.5 кр/ч.',
    },
    market: {
        code: 'market',
        name: 'Рынок',
        icon: 'fa fa-store',
        color: '#a8632e',
        cost: 100,
        capacity: 0,
        feeds: 0,
        workers: 3,
        income: 5,
        upkeep: 1,
        bonus: 0,
        description: '5 кр/ч. Требует 3 работников, содержание 1 кр/ч.',
    },
    factory: {
        code: 'factory',
        name: 'Фабрика',
        icon: 'fa fa-industry',
        color: '#6b6b78',
        cost: 250,
        capacity: 0,
        feeds: 0,
        workers: 8,
        income: 15,
        upkeep: 4,
        bonus: 0,
        description: '15 кр/ч. Требует 8 работников, содержание 4 кр/ч.',
    },
    park: {
        code: 'park',
        name: 'Парк',
        icon: 'fa fa-tree',
        color: '#3d8f6b',
        cost: 60,
        capacity: 0,
        feeds: 0,
        workers: 0,
        income: 0,
        upkeep: 0.5,
        bonus: 0.1,
        description: '+10% к доходу города (не больше +50% от всех парков). Содержание 0.5 кр/ч.',
    },
};

// здания, доступные для постройки (без ратуши)
export const BUILDABLE = Object.values(BUILDINGS).filter(b => !b.fixed);

export const getBuilding = (code) => BUILDINGS[code] ?? null;
