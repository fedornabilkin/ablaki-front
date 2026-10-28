#!/usr/bin/env bash
# Test-only incremental transport. Verify every file against the CI manifest.
set -Eeuo pipefail
phase=${1:?phase}; target=${2:?target}; deploy_root=${3:?deploy root}; web_root=${4:?web root}; sha=${5:?sha}; health=${6:?health URL}
[[ "$phase" = prepare || "$phase" = activate ]]
[[ "$target|$deploy_root|$web_root" = 'test|/opt/ablaki-frontend-test|/var/code/ablaki-front' ]]
[[ "$sha" =~ ^[0-9a-f]{40}$ ]]
[[ -d "$deploy_root" && ! -L "$deploy_root" && "$(readlink -f "$deploy_root")" = "$deploy_root" ]]
[[ ! -L "$deploy_root/incoming" && ! -L "$deploy_root/incoming/$sha" ]]
remote_dir="$deploy_root/incoming/$sha"
mkdir -p "$remote_dir/dist"
[[ "$(readlink -f "$remote_dir")" = "$remote_dir" && ! -L "$remote_dir/dist" ]]
if [[ "$phase" = prepare ]]; then
  current="$deploy_root/releases/.current"
  if [[ -f "$current" && ! -L "$current" ]]; then
    previous=$(tr -d '\r\n' < "$current")
    [[ "$previous" =~ ^[0-9a-f]{40}$ ]]
    previous_dir="$deploy_root/releases/$previous"
    [[ -d "$previous_dir" && "$(readlink -f "$previous_dir")" = "$previous_dir" && -f "$previous_dir.ready" ]]
    # A local copy saves network traffic and never shares writable hardlinks.
    cp -a "$previous_dir/." "$remote_dir/dist/"
    printf '[frontend-stage] Reused static files from %s\n' "$previous"
  fi
  exit 0
fi
archive="frontend-$sha.tar.gz"
# Hash contents and the exact file list; gzip output varies across server versions.
if find "$remote_dir/dist" ! -type f ! -type d -print -quit | grep -q .; then echo 'Unexpected static file type' >&2; exit 1; fi
(
  cd "$remote_dir/dist"
  find . -type f -print0 | LC_ALL=C sort -z | xargs -0 sha256sum
) > "$remote_dir/received.files.sha256"
cmp "$remote_dir/received.files.sha256" "$remote_dir/$archive.files.sha256"
printf '[frontend-stage] Full CI file manifest verified\n'
tar -C "$remote_dir/dist" -czf "$remote_dir/$archive" .
(cd "$remote_dir"; sha256sum "$archive" > "$archive.sha256")
bash "$remote_dir/frontend-deploy.sh" --target "$target" --deploy-root "$deploy_root" --web-root "$web_root" --sha "$sha" --archive "$remote_dir/$archive" --healthcheck-url "$health" </dev/null
