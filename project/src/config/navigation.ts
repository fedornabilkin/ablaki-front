export const navigation = [
  { to: '/games', title: 'Игры', icon: 'dice' },
  { to: '/forum', title: 'Форум', icon: 'comments' },
  { to: '/users', title: 'Участники', icon: 'users' },
  { to: '/statistic', title: 'Статистика', icon: 'trophy' },
  { to: '/exchange', title: 'Биржа', icon: 'exchange-alt' },
  { to: '/balance', title: 'История счёта', icon: 'coins', account: true },
  { to: '/transfer', title: 'Переводы', icon: 'arrow-right', account: true },
  { to: '/users/referrals', title: 'Рефералы', icon: 'users', account: true },
];
export const games = [
  { to: '/games/orel', title: 'Орлянка', icon: 'coins', description: 'Выберите орла или решку, создайте свою игру или присоединитесь к чужой.', badge: '1 из 2' },
  { to: '/games/saper', title: 'Сапёр', icon: 'bomb', description: 'Пройдите пять рядов поля, выбирая безопасную клетку в каждом.', badge: '5 × 7' },
];
