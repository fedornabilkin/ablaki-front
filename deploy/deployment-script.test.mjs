import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
const script = fileURLToPath(new URL('./frontend-deploy.sh', import.meta.url));
const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
const unavailable = process.platform === 'win32' && !existsSync(bash);

test('server script refuses the test checkout root and production paths before any file operations', { skip: unavailable }, () => {
  for (const [root, web] of [['/opt/ablaki-frontend-test', '/var/code/ablaki-front'], ['/opt/ablaki-frontend', '/var/www/ablakin.ru']]) {
    const result = spawnSync(bash, [script, '--target', 'test', '--deploy-root', root, '--web-root', web], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /paths do not match selected target/);
  }
});
test('known production and test pairs pass path selection but stop at the absent SHA without touching the filesystem', { skip: unavailable }, () => {
  for (const [target, root, web] of [['production', '/opt/ablaki-frontend', '/var/www/ablakin.ru'], ['test', '/opt/ablaki-frontend-test', '/var/code/ablaki-front/project/dist']]) {
    const result = spawnSync(bash, [script, '--target', target, '--deploy-root', root, '--web-root', web], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Invalid Git commit SHA/);
  }
});
test('nginx test templates expose only dist and introduce no default server or API proxy', () => {
  for (const name of ['test-frontend.http.conf.example', 'test-frontend.https.conf.example']) {
    const config = readFileSync(new URL(`./nginx/${name}`, import.meta.url), 'utf8');
    const directives = config.split('\n').filter(line => !line.trim().startsWith('#')).join('\n');
    assert.match(directives, /root \/var\/code\/ablaki-front\/project\/dist;/);
    assert.doesNotMatch(directives, /root \/var\/code\/ablaki-front;/);
    assert.doesNotMatch(directives, /default_server|proxy_pass|\/var\/www\/ablakin\.ru/);
  }
});

test('server script allows HTTP only for test before reading an archive', { skip: unavailable }, () => {
  for (const [target, root, web] of [['production', '/opt/ablaki-frontend', '/var/www/ablakin.ru'], ['test', '/opt/ablaki-frontend-test', '/var/code/ablaki-front/project/dist']]) {
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
