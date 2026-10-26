import assert from 'node:assert/strict';
import { existsSync, readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
const script = fileURLToPath(new URL('./frontend-deploy.sh', import.meta.url));
const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
const unavailable = process.platform === 'win32' && !existsSync(bash);

test('server script refuses the old nested destination and production paths before any file operations', { skip: unavailable }, () => {
  for (const [root, web] of [['/opt/ablaki-frontend-test', '/var/code/ablaki-front/project/dist'], ['/opt/ablaki-frontend', '/var/www/ablakin.ru']]) {
    const result = spawnSync(bash, [script, '--target', 'test', '--deploy-root', root, '--web-root', web], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /paths do not match selected target/);
  }
});
test('known production and test pairs pass path selection but stop at the absent SHA without touching the filesystem', { skip: unavailable }, () => {
  for (const [target, root, web] of [['production', '/opt/ablaki-frontend', '/var/www/ablakin.ru'], ['test', '/opt/ablaki-frontend-test', '/var/code/ablaki-front']]) {
    const result = spawnSync(bash, [script, '--target', target, '--deploy-root', root, '--web-root', web], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Invalid Git commit SHA/);
  }
});
test('nginx test templates serve the direct static root without a default server or API proxy', () => {
  for (const name of ['test-frontend.http.conf.example', 'test-frontend.https.conf.example']) {
    const config = readFileSync(new URL(`./nginx/${name}`, import.meta.url), 'utf8');
    const directives = config.split('\n').filter(line => !line.trim().startsWith('#')).join('\n');
    assert.match(directives, /root \/var\/code\/ablaki-front;/);
    assert.doesNotMatch(directives, /\/project\/dist/);
    assert.doesNotMatch(directives, /default_server|proxy_pass|\/var\/www\/ablakin\.ru/);
  }
});

test('a remaining test checkout is preserved before releases, backup or rsync are touched', { skip: unavailable }, () => {
  const tempRoot = realpathSync.native(tmpdir());
  const fixture = mkdtempSync(join(tempRoot, 'ablaki-web-root-'));
  const posix = path => path.replaceAll('\\', '/').replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`);
  try {
    const bin = join(fixture, 'bin');
    mkdirSync(bin);
    for (const command of ['curl', 'flock', 'rsync']) {
      writeFileSync(join(bin, command), '#!/bin/sh\nexit 99\n', { mode: 0o755 });
    }
    for (const marker of ['git-directory', 'git-file', 'project', 'package.json']) {
      const root = join(fixture, marker);
      const web = join(root, 'web');
      const deploy = join(root, 'deploy');
      const incoming = join(deploy, 'incoming');
      mkdirSync(web, { recursive: true });
      mkdirSync(incoming, { recursive: true });
      if (marker === 'git-directory') mkdirSync(join(web, '.git'));
      else if (marker === 'project') mkdirSync(join(web, 'project'));
      else writeFileSync(join(web, marker === 'git-file' ? '.git' : marker), 'fixture source');
      writeFileSync(join(web, 'keep.txt'), 'existing source');
      const archive = join(incoming, 'release.tar.gz');
      writeFileSync(archive, '');
      writeFileSync(`${archive}.sha256`, '');
      const localScript = join(root, 'deploy.sh');
      writeFileSync(localScript, readFileSync(script, 'utf8')
        .replaceAll('/opt/ablaki-frontend-test', posix(deploy))
        .replaceAll('/var/code/ablaki-front', posix(web)));
      const result = spawnSync(bash, [localScript, '--target', 'test', '--deploy-root', posix(deploy), '--web-root', posix(web),
        '--sha', 'a'.repeat(40), '--archive', posix(archive), '--healthcheck-url', 'http://94.250.251.94:3181'], {
        encoding: 'utf8', env: { ...process.env, PATH: `${posix(bin)}:/usr/bin:/bin` },
      });
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, /still contains a source checkout/, result.stderr);
      assert.equal(readFileSync(join(web, 'keep.txt'), 'utf8'), 'existing source');
      assert.equal(existsSync(join(deploy, 'releases')), false);
    }
  } finally {
    assert.equal(resolve(fixture).startsWith(`${resolve(tempRoot)}${process.platform === 'win32' ? '\\' : '/'}ablaki-web-root-`), true);
    rmSync(fixture, { recursive: true, force: true });
  }
});

test('server script allows HTTP only for test before reading an archive', { skip: unavailable }, () => {
  for (const [target, root, web] of [['production', '/opt/ablaki-frontend', '/var/www/ablakin.ru'], ['test', '/opt/ablaki-frontend-test', '/var/code/ablaki-front']]) {
    const result = spawnSync(bash, [script, '--target', target, '--deploy-root', root, '--web-root', web, '--sha', 'a'.repeat(40), '--healthcheck-url', 'http://94.250.251.94:3181'], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, target === 'production' ? /Invalid healthcheck URL/ : /Release archive does not exist/);
  }
});

test('test HTTP nginx uses the confirmed IP and static port without TLS requirements', () => {
  const config = readFileSync(new URL('./nginx/test-frontend.http.conf.example', import.meta.url), 'utf8');
  assert.match(config, /listen 3181;/);
  assert.match(config, /server_name 94\.250\.251\.94;/);
  assert.doesNotMatch(config, /ssl_certificate|listen 443|TEST_FRONTEND_HOST|return 301/);
});

test('workflow SSH validation accepts test HTTP and rejects production HTTP', { skip: unavailable }, () => {
  const workflow = readFileSync(new URL('../.github/workflows/node.js.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const step = workflow.split('      - name: Validate SSH settings\n')[1].split('\n      - name:')[0];
  const code = step.split('        run: |\n')[1].split('\n').map(line => line.replace(/^          /, '')).join('\n');
  for (const [target, url, status] of [['test', 'http://94.250.251.94:3181', 0], ['production', 'http://94.250.251.94:3181', 1], ['production', 'https://ablakin.ru', 0]]) {
    const result = spawnSync(bash, ['-e', '-s'], { input: code, encoding: 'utf8', env: { ...process.env, DEPLOY_TARGET: target, HEALTHCHECK_URL: url, DEPLOY_HOST: '94.250.251.94', DEPLOY_PORT: '22', DEPLOY_USER: 'deploy-test', DEPLOY_SSH_KEY: 'test-only', DEPLOY_KNOWN_HOSTS: 'test-only' } });
    assert.equal(result.status, status, result.stderr);
  }
});

test('incremental stage rejects wrong target, paths and revision before writing', { skip: unavailable }, () => {
  const fetchScript = fileURLToPath(new URL('./frontend-stage.sh', import.meta.url));
  const valid = ['test', '/opt/ablaki-frontend-test', '/var/code/ablaki-front', 'a'.repeat(40), 'http://94.250.251.94:3181'];
  const cases = [
    ['unknown', ...valid.slice(1)],
    ['test', '/opt/ablaki-frontend', ...valid.slice(2)],
    ['test', valid[1], '/var/www/ablakin.ru', ...valid.slice(3)],
    [...valid.slice(0, 3), '../invalid', valid[4]],
  ];
  for (const args of cases) {
    const result = spawnSync(bash, [fetchScript, 'prepare', ...args], { encoding: 'utf8', env: { ...process.env, ARTIFACT_URL: '' } });
    assert.equal(result.status, 1, result.stderr);
    assert.doesNotMatch(result.stdout, /downloading|Publishing/);
  }
});

test('incremental release matches the CI archive and rejects corrupted staging while preserving the previous release', { skip: unavailable }, () => {
  const tempRoot = realpathSync.native(tmpdir());
  const fixture = mkdtempSync(join(tempRoot, 'ablaki-incremental-'));
  const posix = path => path.replaceAll('\\', '/').replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`);
  const sha = 'b'.repeat(40), previous = 'a'.repeat(40);
  try {
    const deploy = join(fixture, 'deploy'), web = join(fixture, 'web');
    const old = join(deploy, 'releases', previous);
    const dist = join(fixture, 'release', 'dist');
    mkdirSync(join(old, 'assets'), { recursive: true });
    mkdirSync(join(dist, 'assets'), { recursive: true });
    mkdirSync(web);
    writeFileSync(join(deploy, 'releases', '.current'), previous);
    writeFileSync(`${old}.ready`, previous);
    writeFileSync(join(old, 'index.html'), 'previous index');
    writeFileSync(join(old, 'assets', 'same.js'), 'unchanged asset');
    utimesSync(join(old, 'assets', 'same.js'), 1000, 1000);
    writeFileSync(join(dist, 'assets', 'same.js'), 'unchanged asset');
    utimesSync(join(dist, 'assets', 'same.js'), 2000, 2000);
    writeFileSync(join(dist, 'index.html'), 'new index');
    writeFileSync(join(deploy, 'frontend-deploy.sh'), `#!/bin/bash\nset -e\ncd "$(dirname "$0")"\nsha256sum -c frontend-${sha}.tar.gz.sha256\necho activated\n`);
    const workflow = readFileSync(new URL('../.github/workflows/node.js.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    const step = workflow.split('      - name: Package frontend release\n')[1].split('\n      - name:')[0];
    const packageCode = step.split('        run: |\n')[1].split('\n').map(line => line.replace(/^          /, '')).join('\n');
    const packaged = spawnSync(bash, ['-e', '-s'], { cwd: fixture, input: packageCode, encoding: 'utf8', env: { ...process.env, SOURCE_SHA: sha } });
    assert.equal(packaged.status, 0, packaged.stderr);
    const stage = join(fixture, 'stage.sh');
    writeFileSync(stage, readFileSync(new URL('./frontend-stage.sh', import.meta.url), 'utf8')
      .replaceAll('/opt/ablaki-frontend-test', posix(deploy)).replaceAll('/var/code/ablaki-front', posix(web)));
    const run = phase => spawnSync(bash, [stage, phase, 'test', posix(deploy), posix(web), sha, 'http://test.invalid'], { encoding: 'utf8' });
    assert.equal(run('prepare').status, 0);
    const incoming = join(deploy, 'incoming', sha);
    assert.equal(readFileSync(join(incoming, 'dist', 'assets', 'same.js'), 'utf8'), 'unchanged asset');
    // These are the changed files rsync delivers; the unchanged asset is reused.
    for (const name of ['index.html', 'deploy-version.txt']) writeFileSync(join(incoming, 'dist', name), readFileSync(join(dist, name)));
    for (const name of [`frontend-${sha}.tar.gz.sha256`, 'frontend-deploy.sh']) writeFileSync(join(incoming, name), readFileSync(join(fixture, 'release', name)));
    const activated = run('activate');
    assert.equal(activated.status, 0, activated.stderr);
    assert.match(activated.stdout, /activated/);
    assert.deepEqual(readFileSync(join(incoming, `frontend-${sha}.tar.gz`)), readFileSync(join(fixture, 'release', `frontend-${sha}.tar.gz`)));
    writeFileSync(join(incoming, 'dist', 'index.html'), 'corrupted');
    assert.notEqual(run('activate').status, 0);
    assert.equal(readFileSync(join(old, 'index.html'), 'utf8'), 'previous index');
  } finally {
    assert.equal(resolve(fixture).startsWith(`${resolve(tempRoot)}${process.platform === 'win32' ? '\\' : '/'}ablaki-incremental-`), true);
    rmSync(fixture, { recursive: true, force: true });
  }
});
