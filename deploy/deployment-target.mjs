import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEndpoints } from './check-api.mjs';

export const targets = Object.freeze({
  production: Object.freeze({ environment: 'production-frontend', deploy_root: '/opt/ablaki-frontend', web_root: '/var/www/ablakin.ru', secret_prefix: 'FRONTEND_DEPLOY_', api_variable: 'VITE_API_URL', ws_variable: 'VITE_WS_URL', health_variable: 'FRONTEND_HEALTHCHECK_URL' }),
  test: Object.freeze({ environment: 'test-frontend', deploy_root: '/opt/ablaki-frontend-test', web_root: '/var/code/ablaki-front/project/dist', secret_prefix: 'TEST_FRONTEND_DEPLOY_', api_variable: 'TEST_VITE_API_URL', ws_variable: 'TEST_VITE_WS_URL', health_variable: 'TEST_FRONTEND_HEALTHCHECK_URL' }),
});
function check(condition, message) { if (!condition) throw new Error(message); }
function checkedTarget(target) { check(Object.hasOwn(targets, target), 'Unknown frontend deployment target.'); return targets[target]; }
function checkedBranch(branch) {
  check(typeof branch === 'string' && /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(branch) && branch !== 'HEAD' && !branch.includes('..') && !branch.includes('//') && !/[./]$/.test(branch) && branch.split('/').every(part => !part.startsWith('.') && !part.endsWith('.lock')), 'Use an existing branch name without special characters.');
  return branch;
}
export function resolveTarget({ eventName, ref, sha, target: inputTarget, branch: inputBranch }) {
  check(typeof sha === 'string' && /^[a-f\d]{40}$/i.test(sha), 'Workflow commit SHA is invalid.');
  const manual = eventName === 'workflow_dispatch';
  check(['push', 'pull_request', 'workflow_dispatch'].includes(eventName), 'Unsupported workflow event.');
  const target = manual ? inputTarget : 'production';
  const config = checkedTarget(target);
  const branch = manual ? checkedBranch(inputBranch) : 'master';
  if (manual && target === 'production') check(ref === 'refs/heads/master' && branch === 'master', 'Production can only be dispatched from master using branch master.');
  return {
    target, ...config,
    checkout_ref: manual && target === 'test' ? `refs/heads/${branch}` : sha,
    deploy_enabled: String(manual || (eventName === 'push' && ref === 'refs/heads/master')),
  };
}
function cleanHost(host) { return host.toLowerCase().replace(/\.$/, ''); }
function normalizedOrigin(url) { return `${url.protocol}//${cleanHost(url.hostname)}${url.port ? ':' + url.port : ''}`; }
function parseApi(value) {
  // Both configured sites use TLS. The shared parser also forbids credentials and query strings.
  return validateEndpoints(value, 'https://validation.invalid/').api;
}
export function validateBuild({ target, apiUrl, productionApiUrl }) {
  checkedTarget(target);
  const api = parseApi(apiUrl);
  if (target === 'test') {
    check(cleanHost(api.hostname) !== 'api.ablakin.ru', 'Test frontend must not use the production API host.');
    if (productionApiUrl) check(normalizedOrigin(api) !== normalizedOrigin(parseApi(productionApiUrl)), 'Test API origin must differ from VITE_API_URL.');
  }
  return { api_url: api.href };
}
export function validateDeployment({ target, apiUrl, frontendUrl, productionApiUrl, productionFrontendUrl, deployRoot, webRoot }) {
  const config = checkedTarget(target);
  validateBuild({ target, apiUrl, productionApiUrl });
  const { api, origin } = validateEndpoints(apiUrl, frontendUrl);
  check(origin.startsWith('https://'), 'Frontend healthcheck must use HTTPS.');
  check(api.origin !== origin, 'Frontend and API must use separate origins.');
  check(deployRoot === config.deploy_root && webRoot === config.web_root, 'Deployment paths do not match the selected target.');
  if (target === 'test') {
    check(!['ablakin.ru', 'www.ablakin.ru', 'api.ablakin.ru'].includes(cleanHost(new URL(origin).hostname)), 'Test frontend must not use a production host.');
    if (productionFrontendUrl) {
      const production = validateEndpoints('https://validation.invalid/', productionFrontendUrl);
      check(normalizedOrigin(new URL(origin)) !== normalizedOrigin(new URL(production.origin)), 'Test frontend origin must differ from FRONTEND_HEALTHCHECK_URL.');
    }
  }
  return { api_url: api.href, health_url: origin };
}
function output(values) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(values).map(([key, value]) => `${key}=${value}\n`).join(''));
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const mode = process.argv[2];
    if (mode === 'plan') {
      output(resolveTarget({ eventName: process.env.GITHUB_EVENT_NAME, ref: process.env.GITHUB_REF, sha: process.env.GITHUB_SHA, target: process.env.INPUT_TARGET, branch: process.env.INPUT_BRANCH }));
    } else if (mode === 'validate-build') {
      output(validateBuild({ target: process.env.DEPLOY_TARGET, apiUrl: process.env.VITE_API_URL, productionApiUrl: process.env.PRODUCTION_API_URL }));
    } else if (mode === 'validate-deploy') {
      validateDeployment({ target: process.env.DEPLOY_TARGET, apiUrl: process.env.VITE_API_URL, frontendUrl: process.env.HEALTHCHECK_URL, productionApiUrl: process.env.PRODUCTION_API_URL, productionFrontendUrl: process.env.PRODUCTION_HEALTHCHECK_URL, deployRoot: process.env.DEPLOY_ROOT, webRoot: process.env.WEB_ROOT });
    } else throw new Error('Choose plan, validate-build, or validate-deploy.');
  } catch (error) {
    console.error(`::error::${error instanceof Error ? error.message : 'Deployment target validation failed.'}`);
    process.exitCode = 1;
  }
}
