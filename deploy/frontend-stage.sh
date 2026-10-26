#!/usr/bin/env bash
# Test-only incremental transport. The existing activator verifies the full archive.
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
# Canonical tar metadata gives the same checksum on runner and server.
tar --sort=name --mtime=@0 --owner=0 --group=0 --numeric-owner --format=gnu --mode='u=rwX,go=rX' -C "$remote_dir/dist" -czf "$remote_dir/$archive" .
bash "$remote_dir/frontend-deploy.sh" --target "$target" --deploy-root "$deploy_root" --web-root "$web_root" --sha "$sha" --archive "$remote_dir/$archive" --healthcheck-url "$health" </dev/null
