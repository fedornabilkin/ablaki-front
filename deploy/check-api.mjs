import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { setTimeout as pause } from 'node:timers/promises';

const REQUIRED_PORTAL_LISTS_VERSION = 1;
const MAX_RESPONSE_BYTES = 65_536;
class ReadinessError extends Error {}

export function validateEndpoints(apiUrl, frontendUrl, { target } = {}) {
  function parse(value, name) {
    try {
      if (typeof value !== 'string' || /\s/.test(value)) throw new Error();
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error();
      return url;
    } catch { throw new ReadinessError(`${name} must be an absolute HTTP(S) URL without credentials, query, or fragment.`); }
  }
  const api = parse(apiUrl, 'VITE_API_URL');
  const frontend = parse(frontendUrl, 'FRONTEND_HEALTHCHECK_URL');
  check(target === undefined || ['production', 'test'].includes(target), 'Expected API environment must be production or test.');
  if (!apiUrl.endsWith('/')) throw new ReadinessError('VITE_API_URL must end with /.');
  if (frontend.pathname !== '/') throw new ReadinessError('FRONTEND_HEALTHCHECK_URL must contain the frontend origin only.');
  if (target === 'production' && (frontend.protocol !== 'https:' || api.protocol !== 'https:')) throw new ReadinessError('Production frontend and API must use HTTPS.');
  if (frontend.protocol === 'https:' && api.protocol !== 'https:') throw new ReadinessError('An HTTPS frontend requires an HTTPS API; browsers block mixed content.');
  return { api, origin: frontend.origin };
}

function check(condition, message) {
  if (!condition) throw new ReadinessError(message);
}
function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function integer(value, minimum = 0) { return Number.isSafeInteger(value) && value >= minimum; }

async function getJson(api, path, origin, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = new URL(path, api);
    // Health responses must describe the running API, including during a concurrent deployment.
    url.searchParams.set('_readiness', String(Date.now()));
    const response = await fetch(url, {
      method: 'GET', redirect: 'error', credentials: 'omit', signal: controller.signal,
      headers: { Accept: 'application/json', Origin: origin },
    });
    check(response.status === 200, `${path}: expected HTTP 200, received ${response.status}.`);
    const allowedOrigin = response.headers.get('access-control-allow-origin');
    // These probes omit credentials. A wildcard is valid for anonymous browser requests.
    check(allowedOrigin === origin || allowedOrigin === '*', `${path}: CORS does not allow the frontend origin.`);
    const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    check(/^application\/(?:[\w.-]+\+)?json$/.test(contentType), `${path}: expected a JSON response, not HTML or another content type.`);
    check(response.body !== null, `${path}: response body is empty.`);
    const reader = response.body.getReader();
    const chunks = [];
    let bytes = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        check(bytes <= MAX_RESPONSE_BYTES, `${path}: response exceeds the readiness size limit.`);
        chunks.push(Buffer.from(value));
      }
    } finally { reader.releaseLock(); }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new ReadinessError(`${path}: response is not valid JSON.`); }
  } catch (error) {
    if (controller.signal.aborted) throw new ReadinessError(`${path}: request timed out.`);
    if (error instanceof ReadinessError) throw error;
    throw new ReadinessError(`${path}: request failed or redirected.`);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

async function probe(api, origin, deadline, requestTimeoutMs, expectedEnvironment) {
  const get = path => {
    const remaining = deadline - performance.now();
    check(remaining > 0, 'API readiness deadline reached.');
    return getJson(api, path, origin, Math.max(1, Math.min(requestTimeoutMs, remaining)));
  };
  const health = await get('health');
  check(object(health) && health.status === 'ok' && typeof health.revision === 'string' && /^[a-f\d]{40}$/i.test(health.revision) && health.portalListsVersion === REQUIRED_PORTAL_LISTS_VERSION,
    'health: running API does not expose the required revision and portal lists contract.');
  if (expectedEnvironment) check(health.environment === expectedEnvironment, `health: API environment does not match ${expectedEnvironment}.`);
  const online = await get('v1/users/online-count');
  check(object(online) && integer(online.count) && integer(online.windowSeconds, 1), 'online-count: invalid public presence response.');
  const comments = await get('v1/forum-comment?envelope=1&per-page=1');
  check(object(comments) && Array.isArray(comments.items) && object(comments._meta), 'forum-comment: expected items and pagination metadata.');
  const meta = comments._meta;
  check(integer(meta.totalCount) && integer(meta.pageCount) && meta.perPage === 1 && meta.currentPage === 1 && meta.pageCount === Math.ceil(meta.totalCount / meta.perPage) && comments.items.length === Math.min(meta.totalCount, 1),
    'forum-comment: invalid pagination metadata.');
  check(comments.items.every(item => object(item) && ['number', 'string'].includes(typeof item.id) && integer(Number(item.id), 1) && integer(item.gift_count) && typeof item.gifted_by_me === 'boolean'),
    'forum-comment: message gift fields are unavailable.');
  return health;
}

/** Read-only gate: no upload or activation may run until this promise succeeds. */
export async function waitForApiReady({ apiUrl, frontendUrl, expectedEnvironment }, { timeoutMs = 180_000, requestTimeoutMs = 5_000, retryIntervalMs = 5_000, log = () => {} } = {}) {
  const { api, origin } = validateEndpoints(apiUrl, frontendUrl, { target: expectedEnvironment });
  check(expectedEnvironment === undefined || ['production', 'test'].includes(expectedEnvironment), 'Expected API environment must be production or test.');
  check(integer(timeoutMs, 1) && timeoutMs <= 180_000, 'Readiness timeout must be between 1 and 180000 milliseconds.');
  check(integer(requestTimeoutMs, 1) && requestTimeoutMs <= 10_000, 'Request timeout must be between 1 and 10000 milliseconds.');
  check(integer(retryIntervalMs, 1) && retryIntervalMs <= 10_000, 'Retry interval must be between 1 and 10000 milliseconds.');
  const deadline = performance.now() + timeoutMs;
  let attempts = 0;
  let lastError = 'API readiness deadline reached.';
  while (performance.now() < deadline) {
    attempts++;
    try {
      const health = await probe(api, origin, deadline, requestTimeoutMs, expectedEnvironment);
      log(`API is ready: revision ${health.revision}, portal lists v${health.portalListsVersion}.`);
      return health;
    } catch (error) {
      lastError = error instanceof ReadinessError ? error.message : 'API readiness probe failed.';
      const remaining = deadline - performance.now();
      if (remaining <= 0) break;
      log(`API is not ready (attempt ${attempts}): ${lastError} Retrying.`);
      if (remaining <= retryIntervalMs) {
        await pause(remaining);
        break;
      }
      await pause(retryIntervalMs);
    }
  }
  throw new ReadinessError(`API did not become ready within ${timeoutMs} ms. ${lastError} Frontend activation was not started.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    check(['production', 'test'].includes(process.env.DEPLOY_TARGET), 'DEPLOY_TARGET must be production or test.');
    await waitForApiReady({ apiUrl: process.env.VITE_API_URL, frontendUrl: process.env.FRONTEND_HEALTHCHECK_URL, expectedEnvironment: process.env.DEPLOY_TARGET }, { log: console.log });
  } catch (error) {
    console.error(`::error::${error instanceof Error ? error.message : 'API readiness check failed.'}`);
    process.exitCode = 1;
  }
}
