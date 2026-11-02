import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { classifyChanges, changedFiles, publishedBase, publishedFromActions } from './release-plan.mjs';

test('documentation skips publishing; tests still run; unknown base keeps all checks', () => {
  assert.deepEqual(classifyChanges(['docs/plan/a.md', 'AGENTS.md']), { checks: false, publish: false });
  assert.deepEqual(classifyChanges(['project/tests/auth.test.ts', 'deploy/release-plan.test.mjs']), { checks: true, publish: false });
  for (const paths of [null, ['project/src/World.vue'], ['deploy/frontend-deploy.sh'], ['new-file']])
    assert.deepEqual(classifyChanges(paths), { checks: true, publish: true });
});
test('published marker must be a successful SHA on an isolated environment', async () => {
  const sha = 'a'.repeat(40), fetcher = async () => ({ ok: true, text: async () => sha });
  assert.equal(await publishedBase('https://ablakin.ru', 'production', 'https://api.ablakin.ru/', '', fetcher), sha);
  await assert.rejects(publishedBase('https://ablakin.ru', 'test', 'http://test-api.invalid/', '', fetcher));
  await assert.rejects(publishedBase('https://ablakin.ru', 'production', 'https://api.ablakin.ru/', '', async () => ({ ok: false })));
  await assert.rejects(publishedBase('https://ablakin.ru', 'production', 'https://api.ablakin.ru/', '', async () => ({ ok: true, text: async () => '<html>oops</html>' })));
});
test('diff covers failed intermediate releases and both ends of a rename', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'frontend-release-plan-'));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  try {
    git('init'); git('config', 'user.name', 'Fixture'); git('config', 'user.email', 'fixture@example.invalid');
    writeFileSync(join(cwd, 'app.js'), 'one'); git('add', '.'); git('commit', '-qm', 'published'); const base = git('rev-parse', 'HEAD');
    writeFileSync(join(cwd, 'app.js'), 'two'); git('add', '.'); git('commit', '-qm', 'not published');
    mkdirSync(join(cwd, 'docs')); git('mv', 'app.js', 'docs/archive.md'); git('commit', '-qm', 'docs');
    assert.deepEqual(changedFiles(base, 'HEAD', cwd).sort(), ['app.js', 'docs/archive.md']);
    assert.equal(changedFiles('f'.repeat(40), 'HEAD', cwd), null);
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});

test('Actions fallback ignores failed publications and uses the artifact source SHA, not the workflow branch', async () => {
  const responses = [
    { workflow_runs: [{ id: 3, head_sha: 'c'.repeat(40) }, { id: 2, head_sha: 'b'.repeat(40) }, { id: 1, head_sha: 'a'.repeat(40) }] },
    { jobs: [{ name: 'Deploy frontend (test)', conclusion: 'failure' }] },
    { jobs: [{ name: 'Deploy frontend (test)', conclusion: 'success' }] },
    { artifacts: [{ name: `frontend-test-${'d'.repeat(40)}` }] },
  ];
  const result = await publishedFromActions({ repository: 'fixture/frontend', token: 'fixture', target: 'test', runId: '3' }, async () => ({ ok: true, json: async () => responses.shift() }));
  assert.equal(result, 'd'.repeat(40));
  assert.equal(responses.length, 0);
  await assert.rejects(publishedFromActions({ repository: 'fixture/frontend', token: 'fixture', target: 'test' }, async () => ({ ok: false })));
});
