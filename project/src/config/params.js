export default {
    apiDomain: import.meta.env.VITE_API_URL,
    wsUrl: import.meta.env.VITE_WS_URL,
    craftMock: import.meta.env.VITE_CRAFT_MOCK === '1',
    // TODO(stat-mock): убрать после подключения бэка со stat-эндпоинтами
    statMock: import.meta.env.VITE_STAT_MOCK === '1',
    // Город: 1 = in-memory/localStorage (без бэка), 0 = реальные эндпоинты /v1/city-*
    cityMock: import.meta.env.VITE_CITY_MOCK === '1',
};
