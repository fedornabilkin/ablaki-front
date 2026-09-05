# Деплой Ablaki из GitHub на VPS

Инструкция подготовлена 5 сентября 2026 года по текущему проекту. Пункты 7 и 8 выполнены в коде: [серверный скрипт](../deploy/frontend-deploy.sh) и [GitHub Actions workflow](../.github/workflows/node.js.yml) добавлены в frontend-репозиторий. Создавать их вручную больше не нужно. Настройки GitHub/VPS и первая публикация этой работой не выполнялись.

Инструкция относится только к Vue-фронтенду из `fedornabilkin/ablaki-front`: подготовке статики, GitHub Actions и frontend-VPS. Web-root согласован: `/var/www/ablakin.ru`. Домен в примерах — `ablakin.ru`, служебный каталог релизов — `/opt/ablaki-frontend`.

Схема PCM Helper: `push в master → тесты → сборка → артефакт dist → архив → SSH → releases/<sha> → rsync в web-root → проверка HTTPS → запись .current или откат`.

Образцы прочитаны из соседнего проекта: [инструкция PCM Helper](../../../pcm-helper/deploy/README.md), [workflow](../../../pcm-helper/.github/workflows/node.js.yml), [скрипт](../../../pcm-helper/deploy/frontend-deploy.sh) и [пример nginx](../../../pcm-helper/deploy/nginx/pcmhelper.ru.conf.example). Ниже всё необходимое приведено в самой инструкции. Также учтены [соглашение Ablaki](../agreements/deployment.md) и [план настройки](../plans/2026-09-05-frontend-deployment.md).

## 1. Подготовить параметры

Ниже предполагается новый VPS с Ubuntu 24.04 LTS, системным nginx и доступом администратора по SSH. Для действующего сервера сначала сохраните текущую конфигурацию nginx и файлы сайта. Не заменяйте существующие каталоги и пользователей вслепую.

| Параметр | Значение; IP, порт и upstream уточнить перед запуском |
|---|---|
| Домен сайта | `ablakin.ru` — принят в примерах по имени web-root |
| IP VPS | `203.0.113.10` |
| SSH-порт | `22` |
| Пользователь публикации | `deploy` |
| Web-root nginx | `/var/www/ablakin.ru` |
| Архивы, релизы и состояние | `/opt/ablaki-frontend` |
| API на том же VPS | `http://127.0.0.1:3180/` |
| Публичный адрес API | `https://ablakin.ru/api/` |

В DNS домена создайте A-запись на IPv4 VPS. AAAA добавляйте только при настроенном IPv6. В firewall провайдера разрешите входящие TCP 80, 443 и ваш SSH-порт. SSH должен быть доступен используемому GitHub runner; ограничение только домашним IP не пропустит Actions.

Все Bash-команды далее выполняются на VPS, кроме явно обозначенных локальных шагов и команд внутри workflow. Плейсхолдеры нужно заменить до выполнения.

## 2. Подготовить VPS

Войдите под административным пользователем с правами sudo:

```bash
sudo apt update
sudo apt install -y nginx rsync curl ca-certificates ufw util-linux
sudo systemctl enable --now nginx

# При нестандартном SSH-порте замените 22 до включения firewall.
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

sudo adduser --disabled-password --gecos '' deploy
sudo install -d -o deploy -g deploy -m 0750 \
  /opt/ablaki-frontend \
  /opt/ablaki-frontend/incoming \
  /opt/ablaki-frontend/releases
sudo install -d -o deploy -g deploy -m 700 /home/deploy/.ssh
```

Не закрывая текущую сессию, проверьте вход администратора во второй сессии. Пользователю `deploy` не нужны sudo, группа docker или доступ к БД. Node.js и исходники фронтенда на VPS для этой схемы не нужны.

Если пользователь `deploy` уже существует, используйте его и пропустите `adduser`. Если web-root уже существует, сначала сохраните его копию:

```bash
sudo cp -a /var/www/ablakin.ru "/var/www/ablakin.ru.backup-$(date +%Y%m%d-%H%M%S)"
```

Создайте web-root и выдайте права как в PCM Helper. В этом каталоге должны находиться только управляемая статика и `.well-known`: `rsync --delete-after` удалит остальные файлы, отсутствующие в релизе. Загрузки пользователей храните вне web-root.

```bash
sudo install -d -o deploy -g www-data -m 02755 /var/www/ablakin.ru
sudo chown -R deploy:www-data /var/www/ablakin.ru
sudo find /var/www/ablakin.ru -type d -exec chmod 0755 {} +
sudo find /var/www/ablakin.ru -type f -exec chmod 0644 {} +
sudo -u deploy test -w /var/www/ablakin.ru
sudo -u deploy test -w /opt/ablaki-frontend
```

Только для нового пустого web-root создайте начальную страницу:

```bash
sudo -u deploy bash <<'BASH'
set -e
umask 022
cd /var/www/ablakin.ru
test ! -e index.html
printf '%s\n' '<!doctype html><meta charset="utf-8"><h1>Сайт готовится к запуску</h1>' > index.html
printf '%s\n' 'bootstrap' > deploy-version.txt
BASH
```

У действующего сайта оставьте его текущую статику. Перед первым релизом скрипт дополнительно сохранит весь web-root в `releases/pre-automation-*`. Символьные ссылки `current` и каталоги `releases/bootstrap` в этой схеме не нужны.

## 3. Создать SSH-ключ для GitHub Actions

На локальном компьютере в PowerShell:

```powershell
ssh-keygen -t ed25519 -C "github-actions-ablaki-frontend" -f "$env:USERPROFILE/.ssh/ablaki_frontend_deploy"
```

Для этого отдельного автоматического ключа оставьте passphrase пустой. Не перезаписывайте существующий ключ при совпадении имени.

Содержимое `ablaki_frontend_deploy.pub` добавьте на VPS одной строкой в `/home/deploy/.ssh/authorized_keys`, поставив перед ключом `restrict `:

```text
restrict ssh-ed25519 AAAA... github-actions-ablaki-frontend
```

Редактирование и права на VPS:

```bash
sudo nano /home/deploy/.ssh/authorized_keys
sudo chown deploy:deploy /home/deploy/.ssh/authorized_keys
sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

Закрытый ключ — файл без `.pub` — понадобится только в GitHub Secret. Не добавляйте его в Git и не отправляйте в переписку.

Через доверенную консоль VPS у провайдера получите отпечаток серверного ключа:

```bash
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

На локальном компьютере:

```powershell
ssh-keyscan -p 22 -t ed25519 203.0.113.10 2>$null | Out-File -Encoding ascii ./ablaki_known_hosts
ssh-keygen -lf ./ablaki_known_hosts
```

Сравните SHA256-отпечатки. Сохраняйте результат сканирования только после совпадения. Сам по себе `ssh-keyscan` не подтверждает подлинность сервера.

Проверьте вход и право записи:

```powershell
ssh -p 22 -i "$env:USERPROFILE/.ssh/ablaki_frontend_deploy" -o StrictHostKeyChecking=yes -o UserKnownHostsFile=./ablaki_known_hosts deploy@203.0.113.10 "command -v rsync && command -v flock && test -w /var/www/ablakin.ru && test -w /opt/ablaki-frontend && echo deploy-ready"
```

Ожидаемый ответ: `deploy-ready`.

## 4. Настроить nginx

На новом VPS создайте `/etc/nginx/sites-available/ablakin.ru`. На действующем сервере внесите location-блоки в существующий vhost, сохранив сертификаты, HTTPS и HTTP → HTTPS redirect, как в инструкции PCM Helper.

```nginx
server {
    listen 80;
    server_name ablakin.ru;
    root /var/www/ablakin.ru;
    index index.html;

    location ^~ /.well-known/acme-challenge/ {
        try_files $uri =404;
    }

    location = /api { return 308 /api/; }
    location ^~ /api/ {
        proxy_pass http://127.0.0.1:3180/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # До отдельной настройки WS неизвестные запросы не получают HTML SPA.
    location = /ws { return 404; }
    location ^~ /ws/ { return 404; }

    location = /index.html {
        add_header Cache-Control "no-store" always;
    }

    location = /deploy-version.txt {
        add_header Cache-Control "no-store" always;
        try_files $uri =404;
    }

    location ^~ /assets/ {
        try_files $uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache" always;
    }
}
```

Завершающий `/` в `proxy_pass` преобразует `/api/v1/...` в `/v1/...`, как нужно маршрутам Yii. Неизвестный API-запрос остаётся в backend и не попадает в HTML фронтенда. Это поведение описано в [документации nginx](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass).

Включите конфигурацию:

```bash
sudo ln -s /etc/nginx/sites-available/ablakin.ru /etc/nginx/sites-enabled/ablakin.ru
sudo nginx -t
sudo systemctl reload nginx
curl -fsS http://ablakin.ru/deploy-version.txt
```

Для новой заглушки должно вернуться `bootstrap`. Для существующего сайта проверьте его главную страницу; файл версии появится после первого релиза. Если vhost уже включён, пропустите создание ссылки и не создавайте дубликат `server_name`.

Адрес `127.0.0.1:3180` — пример уже работающего API на том же VPS: подставьте фактический upstream. Если API пока нет, временно замените содержимое `location ^~ /api/` на `return 503;`. Это не мешает публикации статики. Маршруты AI и Node-RED из PCM Helper сюда не переносятся; настройка серверных приложений в эту инструкцию не входит.

## 5. Включить HTTPS

После успешной HTTP-проверки на VPS установите Certbot по [официальной инструкции для nginx](https://certbot.eff.org/instructions?os=snap&ws=nginx). На новом сервере со snap:

```bash
sudo apt install -y snapd
sudo snap install --classic certbot
sudo /snap/bin/certbot --nginx -d ablakin.ru --redirect
sudo /snap/bin/certbot renew --dry-run
curl -fsS https://ablakin.ru/deploy-version.txt
```

Certbot запросит email и согласие с условиями. На существующем сервере используйте уже установленный способ управления сертификатами. Для новой заглушки проверка HTTPS должна вернуть `bootstrap` без отключения проверки сертификата; у существующего сайта проверьте главную страницу.

## 6. Настроить GitHub

Откройте репозиторий `fedornabilkin/ablaki-front` → Settings → Environments → New environment. Создайте `production-frontend` и разрешите публикацию только из ветки `master`. Доступность правил зависит от тарифа и видимости репозитория; ограничения GitHub описаны в [документации environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).

Добавьте Environment secrets:

| Secret | Значение |
|---|---|
| `FRONTEND_DEPLOY_HOST` | IP или SSH-домен VPS, совпадающий с known_hosts |
| `FRONTEND_DEPLOY_PORT` | `22` или ваш порт |
| `FRONTEND_DEPLOY_USER` | `deploy` |
| `FRONTEND_DEPLOY_SSH_KEY` | Полный закрытый ключ, включая BEGIN/END |
| `FRONTEND_DEPLOY_KNOWN_HOSTS` | Проверенное содержимое `ablaki_known_hosts` |

Добавьте Environment variable:

| Variable | Значение |
|---|---|
| `FRONTEND_HEALTHCHECK_URL` | `https://ablakin.ru`, без пути |

Как в PCM Helper, основные production-параметры сборки задаются прямо в workflow:

| Variable | Значение |
|---|---|
| `VITE_API_URL` | `/api/` — завершающий слеш обязателен для текущего кода |
| `VITE_CRAFT_MOCK` | `0` |
| `VITE_STAT_MOCK` | `0` |
| `VITE_CITY_MOCK` | `0` |

Только `VITE_WS_URL` при необходимости создайте как **Repository variable** в Settings → Secrets and variables → Actions → Variables. Укажите адрес уже работающего WS-сервиса. Эта переменная нужна на этапе сборки, поэтому её не следует помещать только в environment deploy-job.

Все `VITE_*` попадают в публичную сборку. Они не подходят для паролей, закрытых ключей и серверных токенов.

Значения `0` включают реальные API вместо моков. Если API ещё нет, соответствующие функции не заработают, но доставку статики можно проверить отдельно. Пустой `VITE_WS_URL` или `mock` включает демонстрационный чат: не считайте его работающим серверным чатом. Перед публичным запуском незавершённые функции нужно скрыть или явно обозначить как демонстрационные.

## 7. Серверный скрипт — добавлен в код

Файл [deploy/frontend-deploy.sh](../deploy/frontend-deploy.sh) уже находится в корне frontend-репозитория, рядом с `project`. Ниже приведена его текущая версия из `../pcm-helper/deploy/frontend-deploy.sh` без изменений: пути проекта передаются аргументами из workflow. Переводы строк LF закреплены в `.gitattributes`.

```bash
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

while [ "$#" -gt 0 ]; do
  case "$1" in
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

[[ "$deploy_root" =~ ^/[A-Za-z0-9._/-]+$ ]] || die 'Invalid deployment root'
[[ "$web_root" =~ ^/[A-Za-z0-9._/-]+$ ]] || die 'Invalid web root'
[[ "$deploy_root" != *..* && "$web_root" != *..* ]] || die 'Paths must not contain ..'
[[ "$deploy_root" != '/' && "$web_root" != '/' ]] || die 'Root filesystem cannot be a deployment target'
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || die 'Invalid Git commit SHA'
healthcheck_url_pattern='^https?://[A-Za-z0-9._:-]+/?$'
[[ "$healthcheck_url" =~ $healthcheck_url_pattern ]] || die 'Invalid healthcheck URL'
[ -f "$archive" ] || die "Release archive does not exist: $archive"
[ -f "$archive.sha256" ] || die "Checksum file does not exist: $archive.sha256"

for command_name in curl find flock grep readlink rsync seq sha256sum tar tr; do
  command -v "$command_name" >/dev/null 2>&1 || die "$command_name is required"
done

deploy_root="$(readlink -f "$deploy_root")"
web_root="$(readlink -f "$web_root")"
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
```

Скрипт проверяет SHA-256 переданного архива, создаёт `releases/<sha>` и маркер `<sha>.ready`, затем публикует статику через `rsync --delete-after --delay-updates`. Перед первой публикацией сохраняется прежний web-root в `releases/pre-automation-*`. Каталог `.well-known` исключён из синхронизации и остаётся на сервере.

После успешной проверки публичного `deploy-version.txt` файл `releases/.current` получает SHA релиза. При ошибке копирования или проверки скрипт восстанавливает предыдущую статику; `.current` не обновляется. Это обычный файл состояния, а не символьная ссылка.

Ограничения образца: rsync не переключает весь сайт атомарно; при остановке процесса сигналом или отключении VPS автоматический откат не гарантирован. Health check проверяет версию статики, а пользовательские сценарии, API и WS проверяются отдельно.

## 8. GitHub Actions workflow — добавлен в код

Файл [.github/workflows/node.js.yml](../.github/workflows/node.js.yml) уже находится в frontend-репозитории. Локально это `ablakin/frontend/.github/workflows/node.js.yml`; в GitHub путь начинается с `.github`, без внешнего `frontend/`. Ниже приведена его текущая версия.

Сохранены две job, их названия, environment, сериализация production-деплоя, артефакт `frontend-dist-<sha>`, упаковка в deploy-job и интерфейс серверного скрипта из PCM Helper. Для Ablaki каталог `app` заменён на `project`, а проверки — на существующий `test:unit`. У Ablaki пока нет команд `typecheck` и `test:e2e:heavy`; добавлять их в workflow до реализации нельзя.

```yaml
name: Frontend CI and production deploy

on:
  push:
    branches: [master, 'release/**']
  pull_request:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read

jobs:
  frontend:
    name: Frontend checks
    runs-on: ubuntu-latest
    timeout-minutes: 20
    defaults:
      run:
        working-directory: project
    steps:
      - name: Check out repository
        uses: actions/checkout@v7

      - name: Set up Node.js
        uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: project/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Check deployment script syntax
        run: bash -n ../deploy/frontend-deploy.sh

      - name: Run unit tests
        run: npm run test:unit

      - name: Build frontend
        run: npm run build
        env:
          VITE_API_URL: /api/
          VITE_CRAFT_MOCK: '0'
          VITE_STAT_MOCK: '0'
          VITE_CITY_MOCK: '0'
          VITE_WS_URL: ${{ vars.VITE_WS_URL }}

      - name: Upload frontend artifact
        if: github.event_name != 'pull_request' && github.ref == 'refs/heads/master'
        uses: actions/upload-artifact@v7
        with:
          name: frontend-dist-${{ github.sha }}
          path: project/dist
          if-no-files-found: error
          retention-days: 14

  deploy:
    name: Deploy frontend to production
    needs: frontend
    if: github.event_name != 'pull_request' && github.ref == 'refs/heads/master'
    runs-on: ubuntu-latest
    timeout-minutes: 15
    environment: production-frontend
    concurrency:
      group: production-frontend
      cancel-in-progress: false
    env:
      DEPLOY_HOST: ${{ secrets.FRONTEND_DEPLOY_HOST }}
      DEPLOY_PORT: ${{ secrets.FRONTEND_DEPLOY_PORT }}
      DEPLOY_USER: ${{ secrets.FRONTEND_DEPLOY_USER }}
      DEPLOY_SSH_KEY: ${{ secrets.FRONTEND_DEPLOY_SSH_KEY }}
      DEPLOY_KNOWN_HOSTS: ${{ secrets.FRONTEND_DEPLOY_KNOWN_HOSTS }}
      HEALTHCHECK_URL: ${{ vars.FRONTEND_HEALTHCHECK_URL }}
    steps:
      - name: Check out deployment scripts
        uses: actions/checkout@v7

      - name: Download frontend artifact
        uses: actions/download-artifact@v8
        with:
          name: frontend-dist-${{ github.sha }}
          path: release/dist

      - name: Package frontend release
        shell: bash
        run: |
          archive="frontend-${{ github.sha }}.tar.gz"
          printf '%s\n' "${{ github.sha }}" > release/dist/deploy-version.txt
          tar -C release/dist -czf "release/$archive" .
          (
            cd release
            sha256sum "$archive" > "$archive.sha256"
          )
          cp deploy/frontend-deploy.sh release/

      - name: Validate SSH settings
        shell: bash
        run: |
          for name in DEPLOY_HOST DEPLOY_PORT DEPLOY_USER DEPLOY_SSH_KEY DEPLOY_KNOWN_HOSTS HEALTHCHECK_URL; do
            if [ -z "${!name:-}" ]; then
              echo "::error::$name is not configured"
              exit 1
            fi
          done
          [[ "$DEPLOY_PORT" =~ ^[0-9]+$ ]]
          healthcheck_url_pattern='^https://[A-Za-z0-9._:-]+/?$'
          [[ "$HEALTHCHECK_URL" =~ $healthcheck_url_pattern ]]

      - name: Configure SSH
        shell: bash
        run: |
          install -d -m 700 "$HOME/.ssh"
          printf '%s\n' "$DEPLOY_SSH_KEY" | tr -d '\r' > "$HOME/.ssh/deploy_key"
          printf '%s\n' "$DEPLOY_KNOWN_HOSTS" | tr -d '\r' > "$HOME/.ssh/known_hosts"
          chmod 600 "$HOME/.ssh/deploy_key" "$HOME/.ssh/known_hosts"

      - name: Upload and activate frontend
        shell: bash
        run: |
          archive="frontend-${{ github.sha }}.tar.gz"
          remote_dir="/opt/ablaki-frontend/incoming/${{ github.sha }}"
          ssh -i "$HOME/.ssh/deploy_key" -p "$DEPLOY_PORT" \
            -o BatchMode=yes -o ConnectTimeout=15 \
            -o StrictHostKeyChecking=yes \
            -o UserKnownHostsFile="$HOME/.ssh/known_hosts" \
            "$DEPLOY_USER@$DEPLOY_HOST" "mkdir -p '$remote_dir'"
          scp -i "$HOME/.ssh/deploy_key" -P "$DEPLOY_PORT" \
            -o BatchMode=yes -o ConnectTimeout=15 \
            -o StrictHostKeyChecking=yes \
            -o UserKnownHostsFile="$HOME/.ssh/known_hosts" \
            "release/$archive" \
            "release/$archive.sha256" \
            "release/frontend-deploy.sh" \
            "$DEPLOY_USER@$DEPLOY_HOST:$remote_dir/"
          ssh -i "$HOME/.ssh/deploy_key" -p "$DEPLOY_PORT" \
            -o BatchMode=yes -o ConnectTimeout=15 \
            -o StrictHostKeyChecking=yes \
            -o UserKnownHostsFile="$HOME/.ssh/known_hosts" \
            "$DEPLOY_USER@$DEPLOY_HOST" \
            "bash '$remote_dir/frontend-deploy.sh' \
              --deploy-root '/opt/ablaki-frontend' \
              --web-root '/var/www/ablakin.ru' \
              --sha '${{ github.sha }}' \
              --archive '$remote_dir/$archive' \
              --healthcheck-url '$HEALTHCHECK_URL'"
```

Как в PCM Helper, Node.js 24 используется только в CI. Артефакт содержит `project/dist` и хранится 14 дней. Deploy скачивает эту сборку, добавляет файл версии, создаёт архив и checksum, затем передаёт их вместе со скриптом на VPS. Повторной сборки на сервере нет. nginx перезапускать при обычном релизе не требуется.

Production-значения `/api/` и флаги `0` зафиксированы в workflow; WS-адрес берётся из Repository variable. До объединения в master проверьте готовность соответствующих функций. Флаги сборки не создают backend и не отключают автоматически незавершённые экраны.

Если упала только deploy-job, используйте **Re-run failed jobs**: имя артефакта зависит от SHA, а не от номера попытки. После успешного деплоя повтор той же версии делайте новым ручным запуском из актуального master. Изменённой сборке нужен новый коммит: готовый каталог того же SHA скрипт использует повторно, даже если прислан другой архив.

## 9. Проверить до включения production

Сначала выполните шаги на тестовом домене и отдельном тестовом web-root. Для тестового экземпляра замените домен, каталоги и environment в копии конфигурации; production-секреты ему не передавайте. Доставку статики и откат можно проверить без API.

Проверьте два последовательных релиза, повторную публикацию одного и того же SHA, испорченный архив, сохранность `.well-known` и отказ проверки версии. Для проверки отката на тестовом VPS передайте скрипту через `--healthcheck-url` доступный HTTPS-origin другого тестового сайта, возвращающий другую версию: скрипт должен завершиться с ошибкой, статика в web-root — восстановиться, а `releases/.current` — сохранить предыдущий SHA. При первом неудачном релизе должна восстановиться копия `pre-automation-*`.

После тестирования:

1. Проверьте состав публикуемого frontend и значения сборки; незавершённые функции не должны выглядеть как работающие.
2. Добавьте workflow и скрипт в подготовительную ветку через Git и откройте PR в `master`.
3. Дождитесь успешной job `Frontend checks`.
4. В Settings → Rules/Rulesets или Branches включите для `master` обязательный PR, успешный `Frontend checks` и запрет force push, если эти правила доступны для репозитория.
5. Проверьте production-параметры и объедините PR. Push в `master` запустит первую публикацию.
6. Откройте Actions → Frontend CI and production deploy → убедитесь, что успешны обе job.

Проверьте опубликованную версию:

```bash
curl -fsS https://ablakin.ru/deploy-version.txt
```

Она должна совпасть с SHA коммита в master. Для текущего этапа проверьте главную, прямое открытие существующего вложенного маршрута и JS/CSS. Запрос `/assets/does-not-exist.js` должен дать 404. Запросы `/api/does-not-exist` и `/ws/does-not-exist` не должны возвращать HTML Vue-приложения. Вход, выход и WS проверяйте дополнительно, если соответствующие сервисы уже подключены; их запуск не относится к этому этапу frontend-деплоя.

Если тесты или сборка падают, исправьте причину. Не удаляйте проверки, чтобы получить зелёный deploy.

## 10. Откат и обслуживание

Как в PCM Helper, текущая версия записана в `/opt/ablaki-frontend/releases/.current`. nginx всегда использует `/var/www/ablakin.ru`.

Для ручного отката приостановите новые публикации и дождитесь завершения текущей deploy-job. Посмотрите доступные версии на VPS:

```bash
cat /opt/ablaki-frontend/releases/.current
ls -1 /opt/ablaki-frontend/releases
cat /var/www/ablakin.ru/deploy-version.txt
```

Подставьте SHA конкретного готового релиза. Команды сохранят текущую статику, восстановят выбранную через rsync и обновят `.current` только после проверки HTTPS. При ошибке будет восстановлена сохранённая статика:

```bash
sudo -u deploy bash <<'BASH'
set -Eeuo pipefail
umask 027
base=/opt/ablaki-frontend
web=/var/www/ablakin.ru
sha=PASTE_PREVIOUS_COMMIT_SHA
[[ "$sha" =~ ^[0-9a-f]{40}$ ]]
exec 9>"$base/releases/.deploy.lock"
flock -n 9
target="$base/releases/$sha"
test -f "$base/releases/$sha.ready"
test -s "$target/index.html"
test "$(tr -d '\r\n' < "$target/deploy-version.txt")" = "$sha"
backup=$(mktemp -d "$base/manual-rollback-backup.XXXXXXXX")
rsync --archive "$web/" "$backup/"
publish() {
  rsync --archive --delete-after --delay-updates \
    --exclude='.well-known/' "$1/" "$web/"
}
restore_on_error() {
  status=$?
  trap - ERR
  publish "$backup" || echo 'Не удалось восстановить статику' >&2
  exit "$status"
}
trap restore_on_error ERR
publish "$target"
actual=$(curl --fail --silent --show-error --connect-timeout 5 --max-time 15 \
  --header 'Cache-Control: no-cache' \
  "https://ablakin.ru/deploy-version.txt?deploy=$sha")
test "$(printf '%s' "$actual" | tr -d '\r\n')" = "$sha"
printf '%s\n' "$sha" > "$base/releases/.current-manual"
mv -f "$base/releases/.current-manual" "$base/releases/.current"
trap - ERR
BASH
curl -fsS https://ablakin.ru/deploy-version.txt
```

При первом неуспешном автоматическом релизе скрипт сам восстанавливает `releases/pre-automation-*`; `.current` ещё не появляется. Каталоги `pre-automation-*` не являются commit SHA и не подходят для команды выше.

После отката проверьте главную и прямой SPA-маршрут. Перед возобновлением автодеплоя исправьте или отмените проблемный коммит через PR. Не перезапускайте старые workflow для отката: они могут опубликовать устаревшее состояние поверх нового.

Повторный запуск работает как в PCM Helper:

- Готовый `releases/<sha>` с `<sha>.ready` используется повторно. Для изменённой сборки нужен новый коммит.
- Если распаковка прервалась до создания `<sha>.ready`, проверьте и переместите незавершённый каталог за пределы `releases/<sha>` перед повтором. Не удаляйте действующий релиз.
- При failed health check `.current` содержит предыдущий успешный SHA.
- После успеха скрипт удаляет переданный архив и его checksum. Готовые releases, прежний web-root и служебные скрипты сохраняются.
- Автоматической очистки старых releases нет. Храните минимум текущий и один предыдущий рабочий релиз; до первой проверенной публикации сохраняйте `pre-automation-*`. Срок хранения остальных версий и ручных резервных копий задайте отдельно.

Контролируйте свободное место. Очистку incoming и резервных копий выполняйте только при отсутствии активной публикации. Артефакты в Actions хранятся 14 дней. Сохраняйте копию nginx-конфигурации и настроек восстановления VPS.

Rsync удаляет старые assets из web-root. Поэтому давно открытые вкладки могут получить 404 при запросе JS/CSS прежней версии. Проверьте этот сценарий при выпуске frontend; при необходимости предусмотрите обновление клиента или отдельное хранение версионированных assets.

## 11. Типичные ошибки

| Симптом | Что проверить |
|---|---|
| `Permission denied (publickey)` | Пользователь, полное содержимое ключа, authorized_keys и права 700/600 |
| `Host key verification failed` | Совпадение HOST/PORT с проверенным known_hosts; не отключать проверку |
| SSH timeout из Actions | Firewall VPS/провайдера, порт и доступность из runner |
| `nginx` отдаёт 403 | Права чтения релиза и прохода по каталогам, наличие index.html |
| `/api/` отвечает 502 | Запущен ли backend, правильный loopback-порт и upstream |
| Вложенный маршрут отвечает 404 | SPA fallback в location / |
| API возвращает HTML фронтенда | Приоритет location /api/ и завершающий слеш proxy_pass |
| Проверка SHA не проходит | DNS, HTTPS, web-root, deploy-version.txt, кеш CDN/proxy |
| `Incomplete release directory` | Есть `releases/<sha>`, но нет `<sha>.ready`; проверить и переместить незавершённый каталог перед повтором |
| Повтор SHA не применил изменения сборки | Готовый релиз того же SHA используется повторно; для изменённой сборки нужен новый коммит |
| Не найден артефакт после retry | Имя `frontend-dist-<sha>`, успешная frontend-job и срок хранения 14 дней; для упавшего deploy использовать Re-run failed jobs |
| После изменения VITE_* сайт прежний | Требуется новая сборка и публикация; изменения на VPS недостаточно |

Проверка инструкции выполнена по файлам проекта и официальной документации. Серверный скрипт сверен с PCM Helper. Примеры не запускались на вашем VPS и не проходили сквозную проверку в GitHub Actions; тестовый прогон из шага 9 обязателен перед боевым применением.
