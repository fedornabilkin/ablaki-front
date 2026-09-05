// зоны дуэли — те же коды, что на бэке
export const ZONES = [
    { value: 1, label: 'Голова' },
    { value: 2, label: 'Корпус' },
    { value: 3, label: 'Ноги' },
];

export const zoneName = (value) => {
    const zone = ZONES.find(z => z.value === Number(value));
    return zone ? zone.label : '?';
};

// винительный падеж для «удар в ...»
export const zoneAccusative = {
    1: 'голову',
    2: 'корпус',
    3: 'ноги',
};
