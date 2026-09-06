#!/usr/bin/env bash
set -Eeuo pipefail
umask 027

log() {
  printf '[frontend-deploy] %s\n' "$*"
}

die() {
  printf '[frontend-deploy] ERROR: %s\n' "$*" >&2
  return 1
}

deploy_root=''
web_root=''
sha=''
archive=''
healthcheck_url=''
target='production'

while [ "$#" -gt 0 ]; do
  case "$1" in
    --target)
      target="${2:-}"
      shift 2
      ;;
    --deploy-root)
      deploy_root="${2:-}"
      shift 2
      ;;
    --web-root)
      web_root="${2:-}"
      shift 2
      ;;
    --sha)
      sha="${2:-}"
      shift 2
      ;;
    --archive)
      archive="${2:-}"
      shift 2
      ;;
    --healthcheck-url)
      healthcheck_url="${2:-}"
      shift 2
      ;;
    *)
      die "Unknown argument: $1"
      ;;
  esac
done

case "$target" in
  production)
    expected_deploy_root='/opt/ablaki-frontend'
    expected_web_root='/var/www/ablakin.ru'
    ;;
  test)
    expected_deploy_root='/opt/ablaki-frontend-test'
    expected_web_root='/var/code/ablaki-front'
    ;;
  *) die 'Unknown deployment target' ;;
esac
[[ "$deploy_root" = "$expected_deploy_root" && "$web_root" = "$expected_web_root" ]] || die 'Deployment paths do not match selected target'

[[ "$deploy_root" =~ ^/[A-Za-z0-9._/-]+$ ]] || die 'Invalid deployment root'
[[ "$web_root" =~ ^/[A-Za-z0-9._/-]+$ ]] || die 'Invalid web root'
[[ "$deploy_root" != *..* && "$web_root" != *..* ]] || die 'Paths must not contain ..'
[[ "$deploy_root" != '/' && "$web_root" != '/' ]] || die 'Root filesystem cannot be a deployment target'
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || die 'Invalid Git commit SHA'
healthcheck_url_pattern='^https://[A-Za-z0-9._:-]+/?$'
if [[ "$target" = test ]]; then
  healthcheck_url_pattern='^https?://[A-Za-z0-9._:-]+/?$'
fi
[[ "$healthcheck_url" =~ $healthcheck_url_pattern ]] || die 'Invalid healthcheck URL'
[ -f "$archive" ] || die "Release archive does not exist: $archive"
[ -f "$archive.sha256" ] || die "Checksum file does not exist: $archive.sha256"

for command_name in curl find flock grep readlink rsync seq sha256sum tar tr; do
  command -v "$command_name" >/dev/null 2>&1 || die "$command_name is required"
done

deploy_root="$(readlink -f "$deploy_root")"
web_root="$(readlink -f "$web_root")"
[[ "$deploy_root" = "$expected_deploy_root" && "$web_root" = "$expected_web_root" ]] || die 'Deployment paths resolve outside selected target'
archive="$(readlink -f "$archive")"
[ "$deploy_root" != '/' ] && [ "$web_root" != '/' ] || die 'Resolved target cannot be the root filesystem'
case "$web_root/" in
  "$deploy_root/"*) die 'Web root must not be inside deployment root' ;;
esac
case "$deploy_root/" in
  "$web_root/"*) die 'Deployment root must not be inside web root' ;;
esac
[ -d "$web_root" ] || die "Web root does not exist: $web_root"
[ -w "$web_root" ] || die "Web root is not writable by $(id -un)"

# The former test checkout must be moved aside before this root holds only static files.
if [[ "$target" = test ]] && [[ -e "$web_root/.git" || -L "$web_root/.git" || -d "$web_root/project" || -f "$web_root/package.json" ]]; then
  die 'Test web root still contains a source checkout; move it outside /var/code/ablaki-front before deployment'
fi

case "$archive" in
  "$deploy_root"/incoming/*) ;;
  *) die 'Release archive must be inside the incoming directory' ;;
esac

mkdir -p "$deploy_root/releases"
state_dir="$deploy_root/releases"
current_marker="$state_dir/.current"
exec 9>"$state_dir/.deploy.lock"
flock -n 9 || die 'Another frontend deployment is already running'

archive_dir="$(dirname "$archive")"
archive_name="$(basename "$archive")"
(
  cd "$archive_dir"
  sha256sum -c "$archive_name.sha256"
)

if tar -tzf "$archive" | grep -Eq '(^/|(^|/)\.\.(/|$))'; then
  die 'Archive contains an unsafe path'
fi

release="$deploy_root/releases/$sha"
ready_marker="$deploy_root/releases/$sha.ready"
if [ -e "$release" ] && [ ! -f "$ready_marker" ]; then
  die "Incomplete release directory already exists: $release"
fi

if [ ! -d "$release" ]; then
  mkdir "$release"
  tar -xzf "$archive" -C "$release"
  if find "$release" -type l -print -quit | grep -q .; then
    die 'Release contains a symbolic link'
  fi
  chmod -R u=rwX,go=rX "$release"
  [ -f "$release/index.html" ] || die 'Release does not contain index.html'
  [ -f "$release/deploy-version.txt" ] || die 'Release does not contain deploy-version.txt'
  printf '%s\n' "$sha" > "$ready_marker"
fi
[ -f "$release/index.html" ] || die 'Release does not contain index.html'
[ -f "$release/deploy-version.txt" ] || die 'Release does not contain deploy-version.txt'
[ "$(tr -d '\r\n' < "$release/deploy-version.txt")" = "$sha" ] || die 'Release version does not match commit SHA'

previous_release=''
if [ -f "$current_marker" ]; then
  previous_sha="$(tr -d '\r\n' < "$current_marker")"
  [[ "$previous_sha" =~ ^[0-9a-f]{40}$ ]] || die 'Current release marker contains an invalid SHA'
  previous_release="$deploy_root/releases/$previous_sha"
  [ -d "$previous_release" ] || die 'Current release directory does not exist'
elif [ ! -e "$current_marker" ]; then
  previous_release="$deploy_root/releases/pre-automation-$(date -u +%Y%m%dT%H%M%SZ)"
  mkdir "$previous_release"
  rsync --archive "$web_root/" "$previous_release/"
  chmod -R u=rwX,go=rX "$previous_release"
  printf '%s\n' 'pre-automation' > "$previous_release.ready"
else
  die 'Current release marker is not a regular file'
fi

publish_release() {
  source_dir="$1"
  rsync \
    --archive \
    --delete-after \
    --delay-updates \
    --exclude='.well-known/' \
    "$source_dir/" \
    "$web_root/"
}

activated=0

rollback() {
  if [ -n "$previous_release" ] && [ -d "$previous_release" ]; then
    log "Rolling back static files to $(basename "$previous_release")"
    publish_release "$previous_release"
  else
    log 'No previous release is available for rollback'
  fi
}

on_error() {
  exit_code=$?
  trap - ERR
  log "Deployment failed with exit code $exit_code"
  if [ "$activated" -eq 1 ]; then
    rollback || log 'Automatic rollback also failed'
  fi
  exit "$exit_code"
}
trap on_error ERR

log "Publishing frontend release $sha to $web_root"
activated=1
publish_release "$release"

application_ready=0
version_url="${healthcheck_url%/}/deploy-version.txt?deploy=$sha"
for _ in $(seq 1 12); do
  deployed_version="$(
    curl \
      --connect-timeout 5 \
      --max-time 15 \
      --location \
      --max-redirs 3 \
      --fail \
      --silent \
      --show-error \
      --header 'Cache-Control: no-cache' \
      "$version_url" 2>/dev/null || true
  )"
  deployed_version="$(printf '%s' "$deployed_version" | tr -d '\r\n')"
  if [ "$deployed_version" = "$sha" ]; then
    application_ready=1
    break
  fi
  sleep 5
done
[ "$application_ready" -eq 1 ] || die 'Frontend health check failed'

temporary_marker="$state_dir/.current-$sha"
printf '%s\n' "$sha" > "$temporary_marker"
mv -f "$temporary_marker" "$current_marker"
activated=0

rm -f "$archive" "$archive.sha256"
log "Frontend deployment $sha completed successfully"
