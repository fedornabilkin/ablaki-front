import { createServer } from 'node:http';
import { randomInt } from 'node:crypto';

// Isolated, disposable browser fixtures. No requests are forwarded to any other host.
// Login accepts any form values and always returns the same local-only account/token.
const now = () => Math.floor(Date.now() / 1000);
const token = 'local-fixture-only';
const user = { id: 99, username: 'preview', email: 'preview@example.test', created_at: now() - 864000, last_login_at: now(), person: { balance: 120, credit: 60, rating: 3, bonus_count: 0, description: 'Локальный тестовый участник', refovod: 1 } };
const members = Array.from({ length: 45 }, (_, i) => ({ id: i + 1, username: `member${String(i + 1).padStart(2, '0')}`, created_at: now() - (46 - i) * 3600, last_login_at: now() - i, last_seen_at: now() - i, person: { rating: (i + 1) / 10, description: `Описание участника ${i + 1}`, refovod: 99 } }));
const users = [...members, user];
for (const member of users) member.is_online = true;
const byId = id => users.find(value => value.id === Number(id));
const username = id => byId(id)?.username ?? null;
const themes = Array.from({ length: 45 }, (_, i) => ({ id: i + 1, user_id: 99, title: `Тема ${String(i + 1).padStart(2, '0')}: обсуждение возможностей сайта`, view: i, created_at: now() - (46 - i) * 60, last_post: now() - (46 - i) * 30 }));
const comments = Array.from({ length: 45 }, (_, i) => ({ id: i + 1, theme_id: 1, user_id: i % 7 === 0 ? 99 : (i % 45) + 1, active: 1, comment: `Сообщение ${String(i + 1).padStart(2, '0')} из локального обсуждения.\nВторая строка для проверки мобильного экрана.`, created_at: now() - (46 - i) * 30 }));
for (const theme of themes.slice(1)) comments.push({ id: comments.length + 1, theme_id: theme.id, user_id: 2, active: 1, comment: 'Первое сообщение этой темы.', created_at: theme.created_at });
const gifts = members.filter(member => member.id !== comments[44].user_id).map((member, i) => ({ id: i + 1, comment_id: 45, donor_id: member.id, username: member.username, created_at: now() - (45 - i) * 30 }));
const operations = Array.from({ length: 60 }, (_, i) => ({ id: i + 1, user_id: 99, type: ['game_orel', 'game_saper', 'exchange', 'bonus', 'forum_gift', 'rating'][i % 6], comment: `Тестовая операция ${i + 1}`, balance: 120, credit: 60, balance_up: i % 2 ? 2 : -1, credit_up: i % 2 ? -1 : 2, rating: 3, rating_up: 0.01, created_at: now() - (61 - i) * 60 }));
const historyLabels = { game_orel: 'Орлянка', game_saper: 'Сапёр', exchange: 'Биржа', bonus: 'Ежедневный бонус', forum_gift: 'Кредит сообщению', rating: 'Рейтинг', transfer: 'Переводы' };
const games = Object.fromEntries(['orel', 'saper'].map(kind => [kind, Array.from({ length: 180 }, (_, i) => {
  const group = Math.floor(i / 45);
  const complete = group >= 2;
  const creator = group === 1 || (group === 2 && i % 2 === 0) ? 99 : (i % 45) + 1;
  const gamer = complete ? (group === 2 && creator !== 99 ? 99 : ((i + 1) % 45) + 1) : 0;
  return { id: i + 1, user_id: creator, user_gamer: gamer, kon: [1, 5, 10][i % 3], win: complete ? i % 2 === 0 : null, etap: complete ? (i % 2 === 0 ? 0 : 10) : 5, created_at: now() - (181 - i) * 60, updated_at: now() - (181 - i) * 30, time_over_at: now() - (181 - i) * 30, completed_at: complete ? now() - (181 - i) * 30 : null };
})]));
const exchanges = Array.from({ length: 135 }, (_, i) => ({ id: i + 1, user_id: i >= 45 && i < 90 ? 99 : (i % 45) + 1, user_client: i >= 90 ? 99 : 0, type: i % 2 ? 'buy' : 'sell', credit: [10, 20, 50][i % 3], amount: [1, 2, 5][i % 3], price: 100, created_at: now() - (136 - i) * 60, updated_at: now() - (136 - i) * 30 }));
const transfers = Array.from({ length: 90 }, (_, i) => ({ id: i + 1, user_id: 99, user_buyer: i >= 45 ? (i % 45) + 1 : 0, amount: (i % 5) + 1, created_at: now() - (91 - i) * 60, updated_at: now() - (91 - i) * 30 }));
transfers.push({ id: 100, user_id: 1, user_buyer: 0, amount: 5, created_at: now(), updated_at: now() });
const daily = new Set();
const tips = [
  { id: 1, title: 'Ссылку с фильтрами и номером страницы можно сохранить в закладки.' },
  { id: 2, title: 'За хорошее сообщение на форуме можно передать автору 1 кредит.' },
  { id: 3, title: 'В истории счёта можно выбрать тип операции.' },
  { id: 4, title: 'Корона отмечает победителя завершённой игры.' },
];
const nextId = values => Math.max(0, ...values.map(value => value.id)) + 1;
const addOperation = (type, balance, credit, rating = 0) => {
  user.person.balance = Number((user.person.balance + balance).toFixed(5));
  user.person.credit = Number((user.person.credit + credit).toFixed(5));
  user.person.rating = Number((user.person.rating + rating).toFixed(5));
  operations.push({ id: nextId(operations), user_id: 99, type, comment: `Локальная операция: ${historyLabels[type] || type}`, balance: user.person.balance, credit: user.person.credit, rating: user.person.rating, balance_up: balance, credit_up: credit, rating_up: rating, created_at: now() });
};
const readBody = async req => {
  let text = '';
  for await (const chunk of req) { text += chunk; if (text.length > 65536) throw new Error('body-too-large'); }
  return text ? JSON.parse(text) : {};
};
const searchable = row => [row.id, row.title, row.comment, row.username, row.username_gamer, row.username_client, row.user?.username, row.type, row.amount, row.credit, row.kon, username(row.user_id), username(row.user_gamer), username(row.user_client), username(row.user_buyer)].filter(value => value != null).join(' ').toLocaleLowerCase('ru');
function pageData(values, params) {
  let result = [...values];
  const q = (params.get('q') || '').trim().toLocaleLowerCase('ru');
  if (q) result = result.filter(row => searchable(row).includes(q));
  for (const [key, value] of params) {
    const match = /^filter\[([^\]]+)\]$/.exec(key);
    if (match && value !== '' && !['period', 'mode'].includes(match[1])) result = result.filter(row => String(row[match[1]]) === value);
  }
  const sort = (params.get('sort') || '-id').split(',');
  result.sort((a, b) => {
    for (const part of sort) {
      const key = part.replace(/^-/, '');
      const direction = part.startsWith('-') ? -1 : 1;
      const left = a[key]; const right = b[key];
      if (left !== right) return (typeof left === 'number' && typeof right === 'number' ? left - right : String(left ?? '').localeCompare(String(right ?? ''), 'ru')) * direction;
    }
    return b.id - a.id;
  });
  const perPage = Math.max(1, Math.min(100, Number(params.get('per-page')) || 20));
  const totalCount = result.length;
  const pageCount = Math.ceil(totalCount / perPage);
  const currentPage = Math.max(1, Math.min(Math.max(1, pageCount), Math.floor(Number(params.get('page')) || 1)));
  return { items: result.slice((currentPage - 1) * perPage, currentPage * perPage), _meta: { totalCount, pageCount, currentPage, perPage } };
}
const gameDto = game => ({ ...game, username: username(game.user_id), username_gamer: username(game.user_gamer) });
const orderDto = order => ({ ...order, username: username(order.user_id), username_client: username(order.user_client) });
const commentDto = comment => ({ ...comment, user: byId(comment.user_id), gift_count: gifts.filter(gift => gift.comment_id === comment.id).length, gifted_by_me: gifts.some(gift => gift.comment_id === comment.id && gift.donor_id === 99) });
const themeDto = theme => ({ ...theme, comment_count: comments.filter(comment => comment.theme_id === theme.id && comment.active === 1).length });

createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Expose-Headers', 'X-Pagination-Total-Count,X-Pagination-Per-Page,X-Pagination-Page-Count,X-Pagination-Current-Page');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url, 'http://127.0.0.1:4178');
  const path = url.pathname;
  const send = (data, status = 200) => { res.statusCode = status; res.end(data === undefined ? '' : JSON.stringify(data)); };
  const fail = (message, status = 422) => send({ message }, status);
  const authenticated = req.headers.authorization === `Bearer ${token}`;
  const requireAuth = () => { if (authenticated) return true; fail('Local fixture login required', 401); return false; };
  const sendPage = values => {
    const page = pageData(values, url.searchParams);
    for (const [header, key] of [['Total-Count', 'totalCount'], ['Per-Page', 'perPage'], ['Page-Count', 'pageCount'], ['Current-Page', 'currentPage']]) res.setHeader(`X-Pagination-${header}`, page._meta[key]);
    return send(url.searchParams.get('envelope') === '1' ? page : page.items);
  };
  try {
    if (path === '/login' && req.method === 'POST') { await readBody(req); return send({ user, token }); }
    if (path === '/registration' && req.method === 'POST') return send({ success: true }, 201);
    if (path === '/logout') return send(true);
    if (path === '/v1/users/online-count' || path === '/v1/users/heartbeat') {
      if (path.endsWith('/heartbeat') && !requireAuth()) return;
      return send({ count: users.length, windowSeconds: 300 });
    }
    if (path === '/v1/tips/random') return send(tips[randomInt(tips.length)]);
    if (path === '/v1/users/profile') return requireAuth() && send(user);
    if (path === '/v1/users/online' && url.searchParams.get('all') === '1') return send(users);
    if (path === '/v1/users/last' || path === '/v1/users' || path === '/v1/users/online') return sendPage(users);
    if (path === '/v1/users/referrals') return requireAuth() && sendPage(members);
    if (path.startsWith('/v1/users/wall/')) {
      const found = users.find(value => value.username === decodeURIComponent(path.split('/').pop()));
      return found ? send(found) : fail('Not found', 404);
    }
    if (path === '/v1/users/wall' && req.method === 'PATCH') {
      if (!requireAuth()) return;
      user.person.description = String((await readBody(req)).description || ''); return send(user.person);
    }
    if (/^\/v1\/(bonus|rating)\/everyday$/.test(path)) {
      if (!requireAuth()) return;
      const kind = path.split('/')[2]; const key = kind + new Date().toISOString().slice(0, 10);
      if (daily.has(key)) return send({ message: 'Already received today' });
      daily.add(key); addOperation(kind, 0, kind === 'bonus' ? 1 : 0, kind === 'rating' ? 0.01 : 0); return send(true);
    }
    if (path === '/v1/stat') return send({ users: users.length, games: { orel: games.orel.filter(game => game.win !== null).length, saper: games.saper.filter(game => game.win !== null).length }, forum: { themes: themes.length, comments: comments.length }, exchange: exchanges.filter(order => order.user_client > 0).length });
    if (path === '/v1/stat/top') {
      const period = url.searchParams.get('period') || 'all';
      const multipliers = { all: 1, day: 0.01, week: 0.07, month: 0.3, 'half-year': 0.5 };
      if (!(period in multipliers)) return fail('Invalid period', 400);
      return sendPage(users.map(value => ({ id: value.id, username: value.username, rating: Number((value.person.rating * multipliers[period]).toFixed(5)) })));
    }
    if (path === '/v1/forum-theme' && req.method === 'POST') {
      if (!requireAuth()) return;
      const body = await readBody(req);
      if (!String(body.title || '').trim()) return fail('Title required');
      const theme = { id: nextId(themes), title: body.title, user_id: 99, created_at: now(), last_post: now(), view: 0 };
      themes.push(theme);
      if (body.comment) comments.push({ id: nextId(comments), theme_id: theme.id, user_id: 99, active: 1, comment: body.comment, created_at: now() });
      return send(themeDto(theme), 201);
    }
    if (path === '/v1/forum-theme' || path === '/v1/forum-theme/my') {
      if (path.endsWith('/my') && !requireAuth()) return;
      return sendPage(themes.map(themeDto));
    }
    if (/^\/v1\/forum-theme\/\d+$/.test(path)) { const theme = themes.find(value => value.id === Number(path.split('/').pop())); return theme ? send(themeDto(theme)) : fail('Not found', 404); }
    const giftMatch = /^\/v1\/forum-comment\/(\d+)\/(gift|gifts)$/.exec(path);
    if (giftMatch) {
      const id = Number(giftMatch[1]); const comment = comments.find(value => value.id === id);
      if (!comment) return fail('Not found', 404);
      if (giftMatch[2] === 'gifts') return sendPage(gifts.filter(gift => gift.comment_id === id));
      if (req.method !== 'POST') return fail('Method not allowed', 405);
      if (!requireAuth()) return;
      if (comment.user_id === 99) return fail('Cannot reward yourself', 403);
      const alreadyGiven = gifts.some(gift => gift.comment_id === id && gift.donor_id === 99);
      if (!alreadyGiven) {
        if (user.person.credit < 1) return fail('Insufficient credits');
        // This synchronous in-memory command cannot interleave duplicate gifts across awaits.
        gifts.push({ id: nextId(gifts), comment_id: id, donor_id: 99, username: user.username, created_at: now() });
        addOperation('forum_gift', 0, -1);
      }
      return send({ commentId: id, alreadyGiven, giftCount: gifts.filter(gift => gift.comment_id === id).length, giftedByMe: true, credit: user.person.credit });
    }
    if (path === '/v1/forum-comment' && req.method === 'POST') {
      if (!requireAuth()) return;
      const body = await readBody(req);
      if (!themes.some(theme => theme.id === Number(body.theme_id)) || !String(body.comment || '').trim()) return fail('Theme and comment required');
      const comment = { id: nextId(comments), theme_id: Number(body.theme_id), user_id: 99, active: 1, comment: body.comment, created_at: now() };
      comments.push(comment); return send(commentDto(comment), 201);
    }
    if (path === '/v1/forum-comment') return sendPage(comments.map(commentDto));
    if (/^\/v1\/history\/(balance|rating)-type$/.test(path)) {
      if (!requireAuth()) return;
      return send([...new Set(operations.map(value => value.type))].map(type => ({ type, label: historyLabels[type] || type, count: operations.filter(value => value.type === type).length })));
    }
    if (path === '/v1/history/balance' || path === '/v1/history/rating') return requireAuth() && sendPage(operations);
    const gameMatch = /^\/v1\/(orel|saper)(?:\/(.*))?$/.exec(path);
    if (gameMatch) {
      if (!requireAuth()) return;
      const kind = gameMatch[1]; const action = gameMatch[2] || ''; const values = games[kind];
      if (action === 'summary') {
        const today = new Date().toISOString().slice(0, 10); const from = Date.parse(today + 'T00:00:00Z') / 1000;
        const finished = values.filter(game => game.win !== null && game.completed_at >= from && [game.user_id, game.user_gamer].includes(99));
        const own = values.filter(game => game.user_id === 99 && game.user_gamer === 0);
        return send({ today: { played: finished.length, wins: finished.filter(game => (game.user_gamer === 99) === game.win).length, balance: Number(operations.filter(op => op.type === 'game_' + kind && op.created_at >= from).reduce((sum, op) => sum + op[kind === 'orel' ? 'credit_up' : 'balance_up'], 0).toFixed(5)), date: today, timezone: 'UTC' }, own: { count: own.length, amount: own.reduce((sum, game) => sum + game.kon, 0) } });
      }
      if (['', 'my', 'history', 'recent'].includes(action) && req.method === 'GET') return sendPage(values.filter(game => action === 'my' ? game.user_id === 99 && game.user_gamer === 0 : action === 'history' ? game.win !== null && [game.user_id, game.user_gamer].includes(99) : action === 'recent' ? game.win !== null : game.user_id !== 99 && game.user_gamer === 0).map(gameDto));
      if (!action && req.method === 'POST') {
        const body = await readBody(req); const kon = Number(body.kon); const count = Number(body.count || 1); const currency = kind === 'orel' ? 'credit' : 'balance';
        if (!(kon > 0) || !Number.isSafeInteger(count) || count < 1 || count > 100 || user.person[currency] < kon * count) return fail('Invalid stake or insufficient funds');
        for (let i = 0; i < count; i++) values.push({ id: nextId(values), user_id: 99, user_gamer: 0, kon, etap: 5, win: null, completed_at: null, created_at: now(), updated_at: now() });
        addOperation('game_' + kind, kind === 'saper' ? -kon * count : 0, kind === 'orel' ? -kon * count : 0); return send(undefined, 201);
      }
      const game = values.find(value => value.id === Number(action.split('/').pop()));
      if (!game) return fail('Not found', 404);
      if (/^\d+$/.test(action) && req.method === 'DELETE') {
        if (game.user_id !== 99 || game.user_gamer !== 0) return fail('Not your available game', 403);
        values.splice(values.indexOf(game), 1); addOperation('game_' + kind, kind === 'saper' ? game.kon : 0, kind === 'orel' ? game.kon : 0); return send(undefined, 204);
      }
      if (kind === 'saper' && action.startsWith('start/')) {
        if (game.user_gamer || game.user_id === 99 || user.person.balance < game.kon) return fail('Unavailable game');
        game.user_gamer = 99; game.etap = 5; addOperation('game_saper', -game.kon, 0); return send(undefined, 204);
      }
      if (action.startsWith('play/') && req.method === 'POST') {
        const body = await readBody(req);
        if (kind === 'orel') {
          if (game.user_gamer || game.user_id === 99 || ![1, 2].includes(Number(body.hod)) || user.person.credit < game.kon) return fail('Unavailable game');
          game.user_gamer = 99; game.win = Number(body.hod) === 2; game.completed_at = game.updated_at = now();
          addOperation('game_orel', 0, game.win ? game.kon * .9 : -game.kon); return send({ gamer: user, game: gameDto(game) });
        }
        if (game.user_gamer !== 99 || game.win !== null || Number(body.row) !== game.etap || !Number.isInteger(Number(body.col)) || body.col < 1 || body.col > 7) return fail('Invalid move', 400);
        if (Number(body.col) === 7) { game.win = false; game.etap = 10; game.completed_at = game.time_over_at = now(); return fail('Игра проиграна', 400); }
        game.etap--;
        if (game.etap === 0) { game.win = true; game.completed_at = game.time_over_at = now(); addOperation('game_saper', game.kon * 1.9, 0); }
        return send(undefined, 204);
      }
      return fail('Not found', 404);
    }
    if (path.startsWith('/v1/exchange')) {
      if (!requireAuth()) return;
      if (req.method === 'GET') return sendPage(exchanges.filter(order => path.endsWith('/my') ? order.user_id === 99 && order.user_client === 0 : path.endsWith('/history') ? order.user_client > 0 && [order.user_id, order.user_client].includes(99) : order.user_id !== 99 && order.user_client === 0).map(orderDto));
      if (path === '/v1/exchange' && req.method === 'POST') {
        const body = await readBody(req); const credit = Number(body.credit); const amount = Number(body.amount); const count = Number(body.count || 1); const type = body.type;
        if (!['buy', 'sell'].includes(type) || !(credit > 0) || !(amount > 0) || !Number.isSafeInteger(count) || count < 1 || count > 100 || user.person[type === 'buy' ? 'credit' : 'balance'] < (type === 'buy' ? credit : amount) * count) return fail('Invalid order or insufficient funds');
        for (let i = 0; i < count; i++) exchanges.push({ id: nextId(exchanges), user_id: 99, user_client: 0, type, credit, amount, price: 1000 * amount / credit, created_at: now(), updated_at: now() });
        addOperation('exchange', type === 'sell' ? -amount * count : 0, type === 'buy' ? -credit * count : 0); return send(undefined, 201);
      }
      const order = exchanges.find(value => value.id === Number(path.split('/').pop()));
      if (!order) return fail('Not found', 404);
      if (order.user_client > 0) return fail('Order already completed', 409);
      if (req.method === 'DELETE') {
        if (order.user_id !== 99) return fail('Forbidden', 403);
        exchanges.splice(exchanges.indexOf(order), 1); addOperation('exchange', order.type === 'sell' ? order.amount : 0, order.type === 'buy' ? order.credit : 0); return send(undefined, 204);
      }
      if (req.method === 'PUT') {
        if (order.user_id === 99 || user.person[order.type === 'buy' ? 'balance' : 'credit'] < (order.type === 'buy' ? order.amount : order.credit)) return fail('Unavailable order');
        order.user_client = 99; order.updated_at = now(); addOperation('exchange', order.type === 'buy' ? -order.amount : order.amount, order.type === 'buy' ? order.credit : -order.credit); return send(orderDto(order));
      }
    }
    if (path.startsWith('/v1/transfer')) {
      if (!requireAuth()) return;
      if (req.method === 'GET') return sendPage(transfers.filter(value => path.endsWith('/history') ? value.user_buyer > 0 && [value.user_id, value.user_buyer].includes(99) : value.user_id === 99 && value.user_buyer === 0));
      if (path === '/v1/transfer' && req.method === 'POST') {
        const amount = Number((await readBody(req)).amount);
        if (!(amount > 0) || amount > user.person.credit) return fail('Invalid amount');
        transfers.push({ id: nextId(transfers), user_id: 99, user_buyer: 0, amount, created_at: now(), updated_at: now() }); addOperation('transfer', 0, -amount); return send(undefined, 201);
      }
      const transfer = transfers.find(value => value.id === Number(path.split('/').pop()));
      if (!transfer) return fail('Not found', 404);
      if (transfer.user_buyer) return fail('Already received', 409);
      if (req.method === 'DELETE' && transfer.user_id === 99) { transfers.splice(transfers.indexOf(transfer), 1); addOperation('transfer', 0, transfer.amount); return send(undefined, 204); }
      if (req.method === 'PUT' && transfer.user_id !== 99) { transfer.user_buyer = 99; transfer.updated_at = now(); addOperation('transfer', 0, transfer.amount); return send(transfer); }
      return fail('Forbidden', 403);
    }
    return fail('Not found', 404);
  } catch { return fail('Invalid fixture request', 400); }
}).listen(4178, '127.0.0.1', () => console.log('Local API fixtures on 127.0.0.1:4178; login token: local-fixture-only'));
