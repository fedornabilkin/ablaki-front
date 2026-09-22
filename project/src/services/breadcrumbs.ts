export interface Crumb { title: string; to?: string }
const sections: Record<string, string> = { games: 'Игры', users: 'Участники', forum: 'Форум', exchange: 'Биржа кредитов', balance: 'История счёта', rating: 'Рейтинг', transfer: 'Переводы', statistic: 'Статистика', wiki: 'Вики', chat: 'Чат', craft: 'Мастерская', city: 'Город' };
const games: Record<string, string> = { orel: 'Орлянка', saper: 'Сапёр', duel: 'Дуэль', five: '5 яблок' };
export function breadcrumbs(path: string, params: Record<string, unknown> = {}): Crumb[] {
  const parts = path.split('/').filter(Boolean);
  const result: Crumb[] = [{ title: 'Главная', to: '/' }];
  if (!parts.length) return [{ title: 'Главная' }];
  if (parts[0] === 'wall') result.push({ title: 'Участники', to: '/users' }, { title: String(params.login ?? 'Профиль') });
  else {
    result.push({ title: sections[parts[0]] ?? 'Страница не найдена', to: '/' + parts[0] });
    if (parts[0] === 'games' && games[parts[1]]) {
      result.push({ title: games[parts[1]], to: '/games/' + parts[1] });
      if (parts[2]) result.push({ title: parts[2] === 'my' ? 'Мои игры' : 'История' });
    } else if (parts[0] === 'forum' && parts[1]) result.push({ title: parts[1] === 'my' ? 'Мои темы' : 'Тема №' + String(params.theme_id ?? '') });
    else if (parts[0] === 'users' && parts[1]) result.push({ title: ({ profile: 'Профиль', referrals: 'Рефералы', login: 'Вход', 'login-key': 'Вход', logout: 'Выход', registration: 'Регистрация' } as Record<string, string>)[parts[1]] ?? 'Профиль' });
    else if (parts[0] === 'exchange' && parts[1]) result.push({ title: parts[1] === 'my' ? 'Мои заявки' : 'История' });
  }
  delete result[result.length - 1].to;
  return result;
}
