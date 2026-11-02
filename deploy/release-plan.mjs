import { appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { targets, validateDeployment } from './deployment-target.mjs';

export function classifyChanges(paths) {
  if (paths === null) return { checks: true, publish: true };
  let checks = false, publish = false;
  for (const path of paths) {
    if (/^(docs\/|agreements\/)/.test(path) || ['AGENTS.md', 'README.md', '.gitignore'].includes(path)) continue;
    checks = true;
    if (!path.startsWith('project/tests/') && !/^deploy\/[^/]+\.test\.mjs$/.test(path)) publish = true;
  }
  return { checks, publish };
}

export function changedFiles(base, head = 'HEAD', cwd) {
  if (!/^[a-f0-9]{40}$/.test(base)) return null;
  try {
    const options = { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] };
    execFileSync('git', ['merge-base', '--is-ancestor', base, head], options);
    return execFileSync('git', ['diff', '--no-renames', '--name-only', '-z', base, head], options).split('\0').filter(Boolean);
  } catch { return null; }
}

export async function publishedBase(url, target, apiUrl, productionApiUrl, fetcher = fetch) {
  const config = targets[target];
  const checked = validateDeployment({ target, apiUrl, frontendUrl: url, productionApiUrl, deployRoot: config?.deploy_root, webRoot: config?.web_root });
  const response = await fetcher(`${checked.health_url}/deploy-version.txt`, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('Published version is unavailable');
  const sha = (await response.text()).trim();
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Invalid published version');
  return sha;
}

export async function publishedFromActions({ repository, token, target, runId }, fetcher = fetch) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '') || !Object.hasOwn(targets, target) || !token) throw new Error('Release lookup is not configured');
  const deadline = Date.now() + 20000;
  const api = async path => {
    const response = await fetcher(`https://api.github.com/repos/${repository}/${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(5000), redirect: 'error',
    });
    if (!response.ok) throw new Error('Release lookup failed');
    return response.json();
  };
  const { workflow_runs: runs } = await api('actions/workflows/node.js.yml/runs?per_page=50');
  for (const run of runs) {
    if (Date.now() >= deadline) break;
    if (String(run.id) === String(runId) || (target === 'production' && run.head_branch !== 'master')) continue;
    const { jobs } = await api(`actions/runs/${run.id}/jobs?per_page=100`);
    if (!jobs.some(job => job.name === `Deploy frontend (${target})` && job.conclusion === 'success')) continue;
    // Manual test runs can build a branch other than the workflow revision.
    // The published artifact name records the actual source checkout SHA.
    const { artifacts } = await api(`actions/runs/${run.id}/artifacts?per_page=100`);
    const names = artifacts.map(artifact => artifact.name).filter(name => new RegExp(`^frontend-${target}-[a-f0-9]{40}$`).test(name));
    if (names.length === 1) return names[0].slice(-40);
    throw new Error('Published source commit is unavailable');
  }
  throw new Error('No successful publication found');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  let base = '';
  if (process.env.GITHUB_EVENT_NAME !== 'pull_request') {
    try {
      base = await publishedBase(process.env.PUBLISHED_URL, process.env.DEPLOY_TARGET, process.env.VITE_API_URL, process.env.PRODUCTION_API_URL);
    } catch {
      try {
        base = await publishedFromActions({ repository: process.env.GITHUB_REPOSITORY, token: process.env.GH_TOKEN, target: process.env.DEPLOY_TARGET, runId: process.env.GITHUB_RUN_ID });
      } catch { console.log('Published version unavailable; keep the complete build and checks.'); }
    }
  }
  const paths = process.env.FORCE_FULL === 'true' ? null : changedFiles(base);
  const selection = classifyChanges(paths);
  const values = { ...selection, publish: selection.publish && process.env.DEPLOY_ENABLED === 'true', base: paths === null ? '' : base };
  appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(values).map(([key, value]) => `${key}=${value}\n`).join(''));
  console.log(JSON.stringify({ ...values, changed_files: paths?.length ?? null }));
}
