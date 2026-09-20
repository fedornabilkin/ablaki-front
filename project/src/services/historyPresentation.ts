const types: Record<string, [string, string]> = {
  game_five: ['5 яблок', 'apple-alt'], ablaki: ['5 яблок', 'apple-alt'],
  game_orel: ['Орёл и решка', 'adjust'], orel: ['Орёл и решка', 'adjust'],
  game_duel: ['Дуэль', 'crosshairs'], duel: ['Дуэль', 'crosshairs'],
  game_saper: ['Сапёр', 'bomb'], saper: ['Сапёр', 'bomb'],
  sponsor: ['Призовой фонд', 'trophy'], bonus: ['Бонусы', 'coins'],
  everyday: ['Ежедневный бонус', 'sun'], exchange: ['Биржа', 'exchange-alt'],
  awards: ['Благодарности', 'comments'], forum_gift: ['Благодарности', 'comments'],
  transfer: ['Переводы', 'paper-plane'], payment: ['Пополнение', 'plus'],
  zakaz: ['Выплата', 'arrow-down'], referral: ['Рефералы', 'users'],
  game_ablaki: ['5 яблок', 'apple-alt'], game_ablaki_double: ['Удвоение яблок', 'apple-alt'],
  everyday_credit: ['Ежедневные кредиты', 'coins'], everyday_kg: ['Ежедневный баланс', 'cube'],
};
export function historyPresentation(type: string) {
  const legacy = /^(create|remove)_(ablaki|orel|duel|saper)$/.exec(type);
  const game = legacy ? types['game_' + legacy[2]] : null;
  const [label, icon] = game ? [(legacy![1] === 'create' ? 'Создание: ' : 'Отмена: ') + game[0], game[1]] : types[type] ?? [type, 'scroll'];
  return { label, icon };
}
