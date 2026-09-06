import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { performance } from 'node:perf_hooks';
import { test } from 'node:test';
import { validateEndpoints, waitForApiReady } from './check-api.mjs';

const revision = 'a'.repeat(40);
const health = { status: 'ok', revision, portalListsVersion: 1 };
const frontendUrl = 'http://frontend.example/';
const fast = { timeoutMs: 500, requestTimeoutMs: 100, retryIntervalMs: 10 };
const oneAttempt = { timeoutMs: 150, requestTimeoutMs: 100, retryIntervalMs: 150 };
function json(request, response, body, { status = 200, cors = request.headers.origin, contentType = 'application/json' } = {}) {
  const headers = { 'content-type': contentType };
  if (cors !== null) headers['access-control-allow-origin'] = cors;
  response.writeHead(status, headers);
  response.end(typeof body === 'string' ? body : JSON.stringify(body));
}
function serveReady(request, response) {
  const url = new URL(request.url, 'http://local.test');
  if (url.pathname.endsWith('/health')) return json(request, response, health);
  if (url.pathname.endsWith('/v1/users/online-count')) return json(request, response, { count: 0, windowSeconds: 300 });
  if (url.pathname.endsWith('/v1/forum-comment')) {
    assert.equal(url.searchParams.get('envelope'), '1');
    assert.equal(url.searchParams.get('per-page'), '1');
    return json(request, response, { items: [], _meta: { totalCount: 0, pageCount: 0, currentPage: 1, perPage: 1 } });
  }
  return json(request, response, {}, { status: 404 });
}
async function localApi(t, handler) {
  const server = createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  return `http://127.0.0.1:${server.address().port}/`;
}

test('accepts the deployed health, presence and empty pagination contracts using only anonymous GET', async t => {
  const paths = [];
  const apiUrl = await localApi(t, (request, response) => {
    paths.push(new URL(request.url, 'http://local.test').pathname);
    assert.equal(request.method, 'GET');
    assert.equal(request.headers.origin, 'http://frontend.example');
    assert.equal(request.headers.authorization, undefined);
    assert.equal(request.headers.cookie, undefined);
    serveReady(request, response);
  });
  assert.deepEqual(await waitForApiReady({ apiUrl, frontendUrl }, fast), health);
  assert.deepEqual(paths, ['/health', '/v1/users/online-count', '/v1/forum-comment']);
});

test('waits for an old deployment to be replaced before allowing frontend activation', async t => {
  let attempts = 0;
  const apiUrl = await localApi(t, (request, response) => {
    if (request.url.startsWith('/health') && ++attempts < 3) return json(request, response, { status: 'ok' });
    serveReady(request, response);
  });
  assert.equal((await waitForApiReady({ apiUrl, frontendUrl }, fast)).revision, revision);
  assert.equal(attempts, 3);
});

test('supports a configured API base path and wildcard CORS for anonymous probes', async t => {
  const apiUrl = await localApi(t, (request, response) => {
    assert.ok(request.url.startsWith('/backend/'));
    if (request.url.startsWith('/backend/health')) return json(request, response, health, { cors: '*' });
    serveReady(request, response);
  });
  assert.equal((await waitForApiReady({ apiUrl: `${apiUrl}backend/`, frontendUrl }, fast)).portalListsVersion, 1);
});

test('rejects insecure or malformed configuration before making any requests', () => {
  assert.throws(() => validateEndpoints('http://api.example/', 'https://frontend.example/'), /HTTPS frontend requires an HTTPS API/);
  for (const value of [undefined, '/api/', 'https://api.example', ' https://api.example/', 'https://user:password@api.example/', 'https://api.example/?q=1']) {
    assert.throws(() => validateEndpoints(value, 'https://frontend.example/'));
  }
  assert.throws(() => validateEndpoints('https://api.example/', 'https://frontend.example/path'), /origin only/);
});

test('fails closed for HTTP failures, SPA HTML, malformed JSON, and the old health contract', async t => {
  for (const [name, body, options, expected] of [
    ['http error', health, { status: 503 }, /expected HTTP 200/],
    ['SPA fallback', '<html>SPA</html>', { contentType: 'text/html' }, /expected a JSON response/],
    ['broken JSON', '{oops', {}, /not valid JSON/],
    ['old revision', { ...health, revision: 'master' }, {}, /required revision/],
    ['old capability', { ...health, portalListsVersion: 0 }, {}, /portal lists contract/],
  ]) {
    await t.test(name, async t => {
      const apiUrl = await localApi(t, (request, response) => json(request, response, body, options));
      await assert.rejects(waitForApiReady({ apiUrl, frontendUrl }, oneAttempt), expected);
    });
  }
});

test('requires matching CORS on health and the real list endpoints', async t => {
  for (const path of ['/health', '/v1/users/online-count', '/v1/forum-comment']) {
    await t.test(path, async t => {
      const apiUrl = await localApi(t, (request, response) => {
        if (new URL(request.url, 'http://local.test').pathname === path) return json(request, response, health, { cors: 'https://somewhere-else.example' });
        serveReady(request, response);
      });
      await assert.rejects(waitForApiReady({ apiUrl, frontendUrl }, oneAttempt), /CORS does not allow/);
    });
  }
});

test('rejects legacy arrays or incomplete schema contracts even when health is ready', async t => {
  for (const [name, value, expected] of [
    ['legacy list', [], /expected items and pagination metadata/],
    ['missing metadata', { items: [] }, /expected items and pagination metadata/],
    ['bad page count', { items: [], _meta: { totalCount: 0, pageCount: 9, currentPage: 1, perPage: 1 } }, /invalid pagination/],
    ['missing gift schema', { items: [{ id: 1 }], _meta: { totalCount: 1, pageCount: 1, currentPage: 1, perPage: 1 } }, /gift fields are unavailable/],
  ]) {
    await t.test(name, async t => {
      const apiUrl = await localApi(t, (request, response) => {
        if (request.url.startsWith('/v1/forum-comment')) return json(request, response, value);
        serveReady(request, response);
      });
      await assert.rejects(waitForApiReady({ apiUrl, frontendUrl }, oneAttempt), expected);
    });
  }
});

test('rejects redirects instead of following them to another endpoint', async t => {
  const apiUrl = await localApi(t, (_request, response) => { response.writeHead(302, { location: '/elsewhere' }); response.end(); });
  await assert.rejects(waitForApiReady({ apiUrl, frontendUrl }, oneAttempt), /failed or redirected/);
});

test('the overall deadline covers a response body that never finishes', async t => {
  let attempts = 0;
  const apiUrl = await localApi(t, (request, response) => {
    attempts++;
    response.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': request.headers.origin });
    response.write('{');
  });
  const start = performance.now();
  await assert.rejects(waitForApiReady({ apiUrl, frontendUrl }, { ...fast, timeoutMs: 180, requestTimeoutMs: 60 }), /did not become ready.*timed out/);
  assert.ok(performance.now() - start < 1000, 'deadline must include stalled bodies and retry pauses');
  assert.ok(attempts >= 2, 'transient timeouts must be retried within the overall budget');
});

test('rejects oversized readiness responses without retaining unlimited server data', async t => {
  const apiUrl = await localApi(t, (request, response) => json(request, response, { ...health, padding: 'x'.repeat(70_000) }));
  await assert.rejects(waitForApiReady({ apiUrl, frontendUrl }, oneAttempt), /size limit/);
});

test('accepts populated pages with gifts and rejects a fabricated zero presence count', async t => {
  let invalidOnline = false;
  const apiUrl = await localApi(t, (request, response) => {
    if (request.url.startsWith('/v1/forum-comment')) return json(request, response, { items: [{ id: '9', gift_count: 2, gifted_by_me: false }], _meta: { totalCount: 23, pageCount: 23, currentPage: 1, perPage: 1 } });
    if (invalidOnline && request.url.startsWith('/v1/users/online-count')) return json(request, response, { count: '0', windowSeconds: 300 });
    serveReady(request, response);
  });
  assert.equal((await waitForApiReady({ apiUrl, frontendUrl }, fast)).revision, revision);
  invalidOnline = true;
  await assert.rejects(waitForApiReady({ apiUrl, frontendUrl }, oneAttempt), /invalid public presence response/);
});
