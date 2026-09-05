import { createServer } from 'node:http';
// Local-only browser fixtures. No requests are forwarded to the real API.
const user = { id: 99, username: 'preview', email: 'preview@example.test', created_at: 1700000000, person: { balance: 120, credit: 60, rating: 3, description: 'Тестовый участник' } };
let themes = [{ id: 1, title: 'Проверка длинного заголовка обсуждения на мобильном экране', created_at: 1700000000, view: 2, user_id: 99 }];
let comments = [{ id: 1, theme_id: 1, comment: 'Сообщение из локального тестового сервера.\nВторая строка.', user, created_at: 1700000000 }];
let commentFailure = true;
const readBody = async req => { let text = ''; for await (const chunk of req) text += chunk; return text ? JSON.parse(text) : {}; };
createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Expose-Headers', 'X-Pagination-Total-Count,X-Pagination-Per-Page');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  const send = (data, status = 200) => { res.statusCode = status; res.end(data === undefined ? '' : JSON.stringify(data)); };
  if (path === '/login') return send({ user, token: 'local-fixture-only' });
  if (path === '/logout') return send(true);
  if (path === '/v1/users/profile') return send(user);
  if (path === '/v1/users/last') return send([user]);
  if (path.startsWith('/v1/users/wall/')) return send(user);
  if (path === '/v1/users/wall') { user.person.description = (await readBody(req)).description; return send(user.person); }
  if (path === '/v1/forum-theme' && req.method === 'POST') {
    const body = await readBody(req);
    const theme = { id: themes.length + 1, title: body.title, user_id: 99, created_at: 1700000000, view: 0 };
    themes.unshift(theme); return send(theme, 201);
  }
  if (path === '/v1/forum-theme' || path === '/v1/forum-theme/my') return send(themes);
  if (/^\/v1\/forum-theme\/\d+$/.test(path)) return send(themes.find(t => t.id === Number(path.split('/').pop())));
  if (path === '/v1/forum-comment' && req.method === 'POST') {
    if (commentFailure) { commentFailure = false; return send({ errors: { comment: ['Temporary validation failure'] } }, 422); }
    const body = await readBody(req);
    const comment = { ...body, id: comments.length + 1, user, created_at: 1700000000 };
    comments.unshift(comment); return send(comment, 201);
  }
  if (path === '/v1/forum-comment') return send(comments.filter(c => c.theme_id === Number(url.searchParams.get('filter[theme_id]'))));
  if (path.startsWith('/v1/history/')) return send([{ id: 1, comment: 'Тестовая операция', balance: 120, credit: 60, balance_up: 2, credit_up: -1, rating: 3, rating_up: .01, created_at: 1700000000 }]);
  if (path.startsWith('/v1/orel/play/')) return send({ gamer: user, game: { win: false } });
  if (path.startsWith('/v1/saper/start/')) return send(undefined, 204);
  if (path.startsWith('/v1/saper/play/')) {
    const body = await readBody(req);
    return body.col === 7 ? send({ message: 'Игра проиграна' }, 400) : send(undefined, 204);
  }
  if (/^\/v1\/(orel|saper)(\/my|\/history)?$/.test(path)) {
    if (req.method === 'POST') return send(undefined, 201);
    return send([{ id: 1, kon: 5, username: 'opponent', username_gamer: 'preview', user_id: path.endsWith('/my') ? 99 : 5, win: false, created_at: 1700000000 }]);
  }
  if (/^\/v1\/(orel|saper)\/\d+$/.test(path) && req.method === 'DELETE') return send(undefined, 204);
  if (path === '/v1/transfer' && req.method === 'POST') return send(undefined, 201);
  if (path.startsWith('/v1/transfer')) {
    if (req.method !== 'GET') return send(undefined, 204);
    return send([{ id: 12, user_id: 99, user_buyer: 0, created_at: 1700000000 }]);
  }
  if (path.startsWith('/v1/exchange')) return send([]);
  return send({ message: 'Not found' }, 404);
}).listen(4178, '127.0.0.1', () => console.log('Local API fixtures on 127.0.0.1:4178'));
