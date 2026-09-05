// Случайные события города.
// type: 'effect' — временный модификатор (duration в секундах),
//       'fire'   — поджигает случайное здание (оно простаивает duration),
//       'instant'— мгновенно меняет казну.
// weight — вес при случайном выборе; chance события на каждый игровой час — в сторе.

export const CITY_EVENTS = {
    festival: {
        code: 'festival',
        type: 'effect',
        title: 'Городской праздник',
        text: 'Жители гуляют и тратят деньги: доход ×1.5 на 2 часа.',
        icon: 'fa fa-star',
        duration: 2 * 3600,
        weight: 3,
    },
    drought: {
        code: 'drought',
        type: 'effect',
        title: 'Засуха',
        text: 'Урожай гибнет: фермы кормят вдвое меньше 3 часа.',
        icon: 'fa fa-fire',
        duration: 3 * 3600,
        weight: 2,
    },
    fire: {
        code: 'fire',
        type: 'fire',
        title: 'Пожар',
        text: 'Загорелось здание — оно простаивает 3 часа.',
        icon: 'fa fa-fire-flame-curved',
        duration: 3 * 3600,
        weight: 2,
    },
    migrants: {
        code: 'migrants',
        type: 'instant',
        title: 'Караван переселенцев',
        text: 'Гости оставили городу подарки: +25 кр в казну.',
        icon: 'fa fa-users',
        amount: 25,
        weight: 3,
    },
    audit: {
        code: 'audit',
        type: 'instant',
        title: 'Налоговая проверка',
        text: 'Ревизор нашёл нарушения: казна −20%.',
        icon: 'fa fa-search',
        weight: 2,
    },
    fair: {
        code: 'fair',
        type: 'instant',
        title: 'Ярмарка',
        text: 'Каждый рынок наторговал по +10 кр в казну.',
        icon: 'fa fa-store',
        weight: 3,
    },
};

export const getEvent = (code) => CITY_EVENTS[code] ?? null;

export const pickWeightedEvent = (random = Math.random()) => {
    const list = Object.values(CITY_EVENTS);
    const total = list.reduce((sum, e) => sum + e.weight, 0);
    let roll = random * total;
    for (const event of list) {
        roll -= event.weight;
        if (roll <= 0) {
            return event;
        }
    }
    return list[list.length - 1];
};
