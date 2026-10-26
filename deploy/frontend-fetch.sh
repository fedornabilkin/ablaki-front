#!/usr/bin/env bash
# Fetch the prepared package over HTTPS; SSH carries only this small script.
set -Eeuo pipefail
target=${1:?target}; deploy_root=${2:?deploy root}; web_root=${3:?web root}; sha=${4:?sha}; health=${5:?health URL}
case "$target|$deploy_root|$web_root" in
  'test|/opt/ablaki-frontend-test|/var/code/ablaki-front'|'production|/opt/ablaki-frontend|/var/www/ablakin.ru') ;;
  *) echo 'Invalid deployment paths or target' >&2; exit 1 ;;
esac
[[ "$sha" =~ ^[0-9a-f]{40}$ ]]
[[ "${ARTIFACT_URL:-}" = https://* && "$ARTIFACT_URL" != *$'\n'* ]]
[[ -d "$deploy_root" && ! -L "$deploy_root" && "$(readlink -f "$deploy_root")" = "$deploy_root" ]]
[[ ! -L "$deploy_root/incoming" && ! -L "$deploy_root/incoming/$sha" ]]
remote_dir="$deploy_root/incoming/$sha"
mkdir -p "$remote_dir"
[[ "$(readlink -f "$remote_dir")" = "$remote_dir" ]]
archive="frontend-$sha.tar.gz"
package=$(mktemp "$remote_dir/.package-XXXXXX.zip")
trap 'rm -f -- "$package"' EXIT
started=$SECONDS
printf '[frontend-fetch] SSH connected; downloading verified package over HTTPS\n'
curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' --connect-timeout 5 --max-time 60 "$ARTIFACT_URL" -o "$package"
printf '[frontend-fetch] Package downloaded in %s seconds\n' "$((SECONDS-started))"
python3 - "$package" "$remote_dir" "$archive" <<'PY'
import pathlib, sys, zipfile
package, directory, archive = sys.argv[1:]
expected = {archive, archive + '.sha256', 'frontend-deploy.sh'}
with zipfile.ZipFile(package) as zipped:
    entries = zipped.infolist()
    if len(entries) != 3 or {entry.filename for entry in entries} != expected or sum(entry.file_size for entry in entries) > 32 * 1024 * 1024:
        raise RuntimeError('Unexpected release package contents')
    for name in expected:
        path = pathlib.Path(directory) / name
        if path.is_symlink(): raise RuntimeError('Release file is a symbolic link')
        path.write_bytes(zipped.read(name))
PY
bash "$remote_dir/frontend-deploy.sh" --target "$target" --deploy-root "$deploy_root" --web-root "$web_root" --sha "$sha" --archive "$remote_dir/$archive" --healthcheck-url "$health" </dev/null
