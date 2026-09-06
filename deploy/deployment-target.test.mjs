import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveTarget, targets, validateBuild, validateDeployment } from './deployment-target.mjs';
const sha = 'a'.repeat(40);
const production = { eventName: 'push', ref: 'refs/heads/master', sha };
const testEvent = { eventName: 'workflow_dispatch', ref: 'refs/heads/master', sha, target: 'test', branch: 'feature/check-pages' };
const testUrls = { target: 'test', apiUrl: 'https://api-test.example/', frontendUrl: 'https://test.example/', productionApiUrl: 'https://api.ablakin.ru/', productionFrontendUrl: 'https://ablakin.ru/', deployRoot: '/opt/ablaki-frontend-test', webRoot: '/var/code/ablaki-front/project/dist' };

test('master push retains production automation and exact current directories', () => {
  const value = resolveTarget(production);
  assert.equal(value.target, 'production');
  assert.equal(value.deploy_enabled, 'true');
  assert.equal(value.checkout_ref, sha);
  assert.equal(value.deploy_root, '/opt/ablaki-frontend');
  assert.equal(value.web_root, '/var/www/ablakin.ru');
});
test('PR and release-branch pushes run checks without deployment', () => {
  assert.equal(resolveTarget({ ...production, eventName: 'pull_request', ref: 'refs/pull/7/merge' }).deploy_enabled, 'false');
  assert.equal(resolveTarget({ ...production, ref: 'refs/heads/release/check' }).deploy_enabled, 'false');
});
test('manual test chooses an existing branch ref with a separate namespace and dist-only destination', () => {
  const value = resolveTarget(testEvent);
  assert.equal(value.checkout_ref, 'refs/heads/feature/check-pages');
  assert.equal(value.environment, 'test-frontend');
  assert.equal(value.secret_prefix, 'TEST_FRONTEND_DEPLOY_');
  assert.equal(value.api_variable, 'TEST_VITE_API_URL');
  assert.equal(value.health_variable, 'TEST_FRONTEND_HEALTHCHECK_URL');
  assert.equal(value.web_root, '/var/code/ablaki-front/project/dist');
  assert.equal(value.deploy_enabled, 'true');
});
test('production dispatch cannot use test source or a non-master workflow ref', () => {
  assert.throws(() => resolveTarget({ ...testEvent, target: 'production' }), /only be dispatched/);
  assert.throws(() => resolveTarget({ ...testEvent, target: 'production', branch: 'master', ref: 'refs/heads/test' }), /only be dispatched/);
  assert.equal(resolveTarget({ ...testEvent, target: 'production', branch: 'master' }).checkout_ref, sha);
});
test('unsafe branch expressions and unknown targets are rejected without shell evaluation', () => {
  for (const branch of ['../master', 'a//b', 'topic;cmd', '-master', 'master\nother', 'HEAD', 'topic.lock', '']) assert.throws(() => resolveTarget({ ...testEvent, branch }));
  assert.throws(() => resolveTarget({ ...testEvent, target: 'staging' }));
});
test('test configuration never substitutes a missing test API with production', () => {
  assert.throws(() => validateBuild({ target: 'test', apiUrl: '', productionApiUrl: 'https://api.ablakin.ru/' }));
  assert.equal(targets.test.ws_variable, 'TEST_VITE_WS_URL');
});
test('test API cannot point at production via hostname, port, trailing dot, or configured origin', () => {
  for (const apiUrl of ['https://api.ablakin.ru/', 'https://api.ablakin.ru:9443/', 'https://API.ABLAKIN.RU./', 'https://custom-production.example/v1/']) {
    assert.throws(() => validateBuild({ target: 'test', apiUrl, productionApiUrl: 'https://custom-production.example/' }));
  }
});
test('test deployment rejects production site origins and a checkout-root destination', () => {
  for (const frontendUrl of ['https://ablakin.ru/', 'https://www.ablakin.ru/', 'https://production.example/']) {
    assert.throws(() => validateDeployment({ ...testUrls, frontendUrl, productionFrontendUrl: 'https://production.example/' }));
  }
  for (const webRoot of ['/var/code/ablaki-front', '/var/www/ablakin.ru']) assert.throws(() => validateDeployment({ ...testUrls, webRoot }), /paths/);
  assert.throws(() => validateDeployment({ ...testUrls, deployRoot: '/opt/ablaki-frontend' }), /paths/);
});
test('separate test origins and fixed test paths are accepted, but plaintext API is rejected', () => {
  assert.equal(validateDeployment(testUrls).health_url, 'https://test.example');
  assert.throws(() => validateDeployment({ ...testUrls, apiUrl: 'http://api-test.example/' }), /HTTPS/);
  assert.throws(() => validateDeployment({ ...testUrls, frontendUrl: 'https://api-test.example/' }), /separate origins/);
});
