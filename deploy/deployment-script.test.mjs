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
