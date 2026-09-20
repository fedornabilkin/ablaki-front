export const navigation = [
  { to: '/games', title: 'Игры', icon: 'dice' },
  { to: '/forum', title: 'Форум', icon: 'comments' },
  { to: '/users', title: 'Участники', icon: 'users' },
  { to: '/statistic', title: 'Статистика', icon: 'trophy' },
  { to: '/exchange', title: 'Биржа', icon: 'exchange-alt' },
  { to: '/balance', title: 'История', icon: 'coins', account: true },
  { to: '/transfer', title: 'Переводы', icon: 'arrow-right', account: true },
  { to: '/users/referrals', title: 'Рефералы', icon: 'users', account: true },
];
export const games = [
  { to: '/games/five', title: '5 яблок', icon: 'apple-alt', description: 'Выбирайте яблоки, набирайте очки и первым достигните 21.', badge: 'До 21' },
  { to: '/games/orel', title: 'Орлянка', icon: 'coins', description: 'Выберите орла или решку, создайте свою игру или присоединитесь к чужой.', badge: '1 из 2' },
  { to: '/games/saper', title: 'Сапёр', icon: 'bomb', description: 'Пройдите пять рядов поля, выбирая безопасную клетку в каждом.', badge: '5 × 7' },
  { to: '/games/duel', title: 'Дуэль', icon: 'crosshairs', description: 'Сражение один на один, испытание силы тактики и удачи.', badge: '1 на 1' },
];
