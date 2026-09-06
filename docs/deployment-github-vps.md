# Frontend: production и test через GitHub Actions

Обновлено 6 сентября 2026 года. Production frontend уже работает и остаётся в `/var/www/ablakin.ru`. Test использует HTTP по IP и отдельным портам; DNS и сертификаты для него не нужны. Настройка VPS и GitHub environment выполняется отдельно по командам ниже.

[Workflow](../.github/workflows/node.js.yml), [карта target](../deploy/deployment-target.mjs), [серверный скрипт](../deploy/frontend-deploy.sh), [общая валидация URL](../deploy/check-api.mjs). Настройка backend описана отдельно в [его инструкции](https://github.com/fedornabilkin/ablaki/blob/master/docs/production-test-deployment.md).

## 1. Параметры окружений

| Параметр | Production | Test |
|---|---|---|
| Событие публикации | Push в `master`; ручной запуск production из master | Пока только ручной `workflow_dispatch`, target `test` |
| Исходная ветка | `master`, точный SHA события | Выбранная существующая ветка; по умолчанию `master` |
| GitHub environment | `production-frontend` | `test-frontend` |
| Каталог релизов и состояния | `/opt/ablaki-frontend` | `/opt/ablaki-frontend-test` |
| Web-root системного nginx | `/var/www/ablakin.ru` | `/var/code/ablaki-front` |
| Checkout frontend на VPS | Не нужен для публикации | Не нужен; прежний checkout сохраняется вне web-root |
| Каталог backend | `/var/www/api.ablakin.ru` | `/var/code/ablaki` |
| Frontend origin | `https://ablakin.ru` | `http://94.250.251.94:3181` |
| API URL | `https://api.ablakin.ru/` | `http://94.250.251.94:3180/` |
| Backend admin | Не изменяется этим workflow | `http://94.250.251.94:3195` |

Тестовые frontend и API имеют один IP, но разные origins из-за портов `3181` и `3180`. Поэтому API должен разрешать CORS именно для `http://94.250.251.94:3181`. Порт `3195` относится к админке backend; frontend workflow её не публикует.

Серверный скрипт принимает только две пары каталогов из таблицы. Test, как и production, получает содержимое сборки непосредственно в web-root: `index.html`, `assets/` и остальные публичные файлы. Сборка в GitHub по-прежнему создаётся в `project/dist`; на VPS этого вложенного пути больше нет. После `readlink -f` пути проверяются повторно; символьная ссылка на другой каталог будет отклонена. Если в test web-root ещё находится `.git`, `project` или `package.json`, публикация останавливается до rsync.

## 2. GitHub: отдельные secrets и variables

В репозитории `fedornabilkin/ablaki-front` создайте два environment. Существующие production secrets сохраните. Для test заведите отдельный SSH-ключ и пользователя, которому не разрешена запись в production.

| Environment secret | production-frontend | test-frontend |
|---|---|---|
| SSH host | `FRONTEND_DEPLOY_HOST` | `TEST_FRONTEND_DEPLOY_HOST` |
| SSH port | `FRONTEND_DEPLOY_PORT` | `TEST_FRONTEND_DEPLOY_PORT` |
| SSH user | `FRONTEND_DEPLOY_USER` | `TEST_FRONTEND_DEPLOY_USER` |
| Полный закрытый ключ | `FRONTEND_DEPLOY_SSH_KEY` | `TEST_FRONTEND_DEPLOY_SSH_KEY` |
| Проверенные known_hosts | `FRONTEND_DEPLOY_KNOWN_HOSTS` | `TEST_FRONTEND_DEPLOY_KNOWN_HOSTS` |

Для test задайте `TEST_FRONTEND_DEPLOY_HOST=94.250.251.94`. `TEST_FRONTEND_DEPLOY_PORT` — фактический **SSH-порт**, не HTTP-порт `3181`. Ключи и права пользователей разделяются. Отпечаток серверного ключа проверяется через доверенную консоль VPS; не отключайте `StrictHostKeyChecking` и не доверяйте одному только `ssh-keyscan`.

| Variable | Production | Test | Где задать |
|---|---|---|---|
| Базовый API URL, обязательно с `/` на конце | `VITE_API_URL` | `TEST_VITE_API_URL` | Repository variables: нужны job сборки |
| WS URL, если сервис подключён | `VITE_WS_URL` | `TEST_VITE_WS_URL` | Repository variables; необязательные |
| Frontend origin без пути | `FRONTEND_HEALTHCHECK_URL` | `TEST_FRONTEND_HEALTHCHECK_URL` | Соответствующий environment или Repository variables |

Точные test variables: `TEST_VITE_API_URL=http://94.250.251.94:3180/`, `TEST_FRONTEND_HEALTHCHECK_URL=http://94.250.251.94:3181`. Production сохраняет HTTPS для frontend и API. HTTP разрешён только для target `test`; если test позже использует HTTPS frontend, его API также должен использовать HTTPS.

API URL обязательны. Все `VITE_*` публичны и попадают в сборку, поэтому пароли и серверные токены в них хранить нельзя. Пустая test variable не заменяется production значением. Отсутствующие test secrets также приводят к остановке, а не к использованию production ключей.

Production `VITE_API_URL` дополнительно используется только для сравнения origins: test API не может совпасть с ним или с хостом `api.ablakin.ru`. Test frontend не может иметь production origin из `FRONTEND_HEALTHCHECK_URL`, если variable доступна, либо хост `ablakin.ru`, `www.ablakin.ru` или `api.ablakin.ru`. Если production health variable хранится только в `production-frontend`, она недоступна из `test-frontend`; для проверки нестандартного production alias скопируйте публичное значение в Repository variables. Никакие production адреса не используются как test fallback.

Workflow проверяет настроенные API и frontend origins без обращения к backend `/health`. Фактический API нужного окружения и CORS проверяются отдельно в браузере. Production использует существующую MySQL по `MYSQL_DB_*`, test — PostgreSQL по `PG_DB_*`; публикация frontend не меняет их БД, Redis или сервисы. `FRONTEND_HEALTHCHECK_URL` и его test-аналог нужны для проверки файла версии самой статики, а не backend health.

Production environment разрешает публикации только из master. Для test обычно также запускают сам workflow из master, а исходную ветку выбирают полем `branch`. Защита environment оценивает ветку workflow, а не отдельный checkout приложения. Обязательные PR для работы владельца не вводятся.

Синтаксис `vars`, `secrets` и `needs` приведён в [официальном справочнике GitHub contexts](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts). Отсутствующий secret возвращает пустую строку; workflow проверяет обязательные значения до SSH, согласно [документации secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets).

## 3. Подготовить только test каталоги и доступ

Команды этого раздела выполняются на VPS администратором. Production frontend, его nginx и каталоги релизов не перемещаются.

Установлены `rsync`, `curl`, `tar`, `sha256sum`, `flock`, `readlink`; Node.js нужен только GitHub runner. Используйте существующего пользователя из `TEST_FRONTEND_DEPLOY_USER`.

При переходе с прежнего checkout выполните блок ниже. Он сохраняет checkout рядом с именем `ablaki-front-source-ДАТА`, создаёт web-root и копирует прежнюю сборку. Согласуйте выполнение с изменением nginx в разделе 4: старый root `project/dist` после переноса перестанет обслуживаться. Если каталог уже содержит только статику, перенос пропускается.

```bash
deploy_user='ИМЯ_ИЗ_TEST_FRONTEND_DEPLOY_USER'
sudo bash -s -- "$deploy_user" <<'BASH'
set -euo pipefail
deploy_user=$1
id "$deploy_user"
deploy_group=$(id -gn "$deploy_user")
web_root=/var/code/ablaki-front
test "$(readlink -f "$web_root")" = "$web_root"
saved_checkout=''
if [[ -e "$web_root/.git" || -L "$web_root/.git" || -d "$web_root/project" || -f "$web_root/package.json" ]]; then
  saved_checkout="/var/code/ablaki-front-source-$(date +%Y%m%d-%H%M%S)"
  test ! -e "$saved_checkout"
  mv -T "$web_root" "$saved_checkout"
  printf 'Checkout сохранён: %s\n' "$saved_checkout"
fi
install -d -o "$deploy_user" -g "$deploy_group" -m 0750 \
  /opt/ablaki-frontend-test /opt/ablaki-frontend-test/incoming /opt/ablaki-frontend-test/releases
install -d -o "$deploy_user" -g www-data -m 0755 "$web_root"
if [[ -n "$saved_checkout" && -d "$saved_checkout/project/dist" ]]; then
  rsync --archive "$saved_checkout/project/dist/" "$web_root/"
fi
chown -R "$deploy_user" /opt/ablaki-frontend-test "$web_root"
chmod -R u+rwX /opt/ablaki-frontend-test
chmod -R u+rwX,go+rX "$web_root"
BASH
```

Сохранённый checkout не удаляется и не участвует в последующих публикациях. Сборка на сервере и git pull для frontend не нужны.

Пользователю деплоя и nginx (`www-data`) нужен проход по `/var/code`. Если каталог закрыт, выдайте точечный ACL (пакет `acl`):

```bash
sudo setfacl -m "u:$deploy_user:--x,u:www-data:--x" /var/code
sudo -u "$deploy_user" test -w /var/code/ablaki-front
sudo -u "$deploy_user" test -w /opt/ablaki-frontend-test
```

Настроенные SSH-ключи, secrets и variables сохраняются. Для новой настройки публичный ключ добавляется в `.ssh/authorized_keys` выбранного пользователя; закрытый ключ хранится в `TEST_FRONTEND_DEPLOY_SSH_KEY`.

Для нового пустого web-root можно создать заглушку; существующую страницу не перезаписывайте:

```bash
sudo -u "$deploy_user" bash <<'BASH'
set -e
umask 022
cd /var/code/ablaki-front
test ! -e index.html
printf '%s\n' '<!doctype html><meta charset="utf-8"><h1>Тестовый сайт готовится к запуску</h1>' > index.html
printf '%s\n' 'bootstrap' > deploy-version.txt
BASH
```

## 4. Системный nginx: test на HTTP-порту 3181

[Test HTTP-конфиг](../deploy/nginx/test-frontend.http.conf.example) содержит `listen 3181`, `server_name 94.250.251.94` и root `/var/code/ablaki-front`. Убедитесь, что порт `3181` предназначен системному nginx и разрешён в firewall VPS. Сертификаты, DNS-записи и HTTPS redirect для этого test vhost не настраиваются.

В существующем vhost замените `root /var/code/ablaki-front/project/dist;` на `root /var/code/ablaki-front;`, включая отдельные root внутри location, если они есть. Найти действующий файл можно командой `sudo nginx -T 2>&1 | grep -n -B 5 -A 15 'listen.*3181'`. Затем выполните `sudo nginx -t && sudo systemctl reload nginx`.

Только для нового vhost можно загрузить готовый пример:

```bash
curl -fsS -o /tmp/ablaki-frontend-test.conf \
  https://raw.githubusercontent.com/fedornabilkin/ablaki-front/master/deploy/nginx/test-frontend.http.conf.example &&
sudo install -m 0644 /tmp/ablaki-frontend-test.conf /etc/nginx/sites-available/ablaki-frontend-test
# Если такая ссылка уже существует, повторно её не создавайте.
sudo ln -s /etc/nginx/sites-available/ablaki-frontend-test /etc/nginx/sites-enabled/ablaki-frontend-test
sudo nginx -t && sudo systemctl reload nginx
curl -fsS http://94.250.251.94:3181/deploy-version.txt
```

В test-конфиге нет `default_server` и изменений production-портов 80/443. `/assets/` при отсутствии файла возвращает 404; `index.html` и версия не кешируются; `.well-known` сохраняется при публикации. Скрытые файлы закрыты. Сохранённый отдельный HTTPS-пример для возможного будущего домена сейчас не применяется.

Production frontend использует существующий vhost `ablakin.ru`. [Образец location-блоков](../deploy/nginx/production-frontend.locations.conf.example) предназначен для сверки внутри него, а не для создания второго server. Сертификаты и существующий HTTPS redirect сохраняются.

Frontend nginx обслуживает статику. Запросы API идут на отдельный origin из переменной сборки; `proxy_pass /api` здесь не добавляется. В test это `http://94.250.251.94:3180/`. Backend должен разрешать CORS frontend origin `http://94.250.251.94:3181`, включая OPTIONS и заголовки Authorization/Content-Type. Production использует прежние HTTPS origins.

## 5. Как запускать

Production: обычный push в master запускает проверки и production deploy. Ручной production запуск допускается только из master с `target=production` и `branch=master`.

Test: GitHub → Actions → **Frontend CI and deploy** → **Run workflow**. Выберите workflow из master, `target=test` и существующую исходную `branch` (по умолчанию master). Workflow фиксирует фактически собранный SHA ветки. `release/**` push и PR в master выполняют только проверки, без публикации.

После смены web-root запустите новый workflow из обновлённого master: Re-run старого запуска использует прежнюю настройку пути.

Последовательность одинакова для двух target:

1. Выбор фиксированной конфигурации target.
2. Checkout выбранного исходного коммита; отдельный checkout deployment scripts из ревизии workflow.
3. Node.js 24, npm ci, deployment tests, unit tests и build. Моки craft/stat/city выключены.
4. Артефакт `frontend-<target>-<source_sha>`, срок хранения 14 дней.
5. Deploy-job получает только environment выбранного target и его secrets. API URL берётся из результата той же сборки.
6. Проверка каталогов, формата URL, допустимых протоколов и разделения настроенных origins production/test. Запрос к backend `/health` не выполняется.
7. Передача архива с checksum по SSH; публикация через releases/<sha> и rsync; проверка публичного deploy-version.txt. При ошибке активации восстанавливается предыдущая статика.

Первоначальный frontend-deploy не требовал backend `/health`; добавленное обязательное ожидание удалено. Backend разворачивается отдельно, а frontend workflow публикует статику без требования нового health-контракта или SHA-маркера backend. `check-api.mjs` сохранён для общего валидатора адресов, его сетевые проверки workflow не запускает. Проверка `deploy-version.txt` самой статики и откат при ошибке её публикации остаются. Для повтора упавшей deploy-job используйте **Re-run failed jobs**, пока артефакт доступен.

Пример публичных read-only проверок после test публикации:

```bash
curl -fsS http://94.250.251.94:3181/deploy-version.txt
curl -I http://94.250.251.94:3181/forum
curl -I http://94.250.251.94:3181/assets/does-not-exist.js
```

Файл версии должен совпасть с фактическим source SHA, прямой маршрут SPA — открываться, отсутствующий asset — возвращать 404. В браузере проверьте Request URL: тестовая сборка обращается к тестовому API. Затем подтвердите, что SHA production сайта не изменился от test deployment.

Браузерные операции с балансом/играми проверяются только на изолированном test backend. Успешная доставка статики сама по себе не подтверждает корректность экономики или изоляцию тестовой БД.

## 6. Повторная сборка и откат

Releases production и test хранятся отдельно. Готовый каталог одного SHA повторно используется только внутри своего target. После изменения переменных сборки сделайте новый коммит: повтор того же SHA не заменяет уже готовую сборку. При неполной распаковке `<sha>` без `<sha>.ready` сначала проверьте каталог и перенесите его за пределы releases; действующий release не удаляйте.

Для обычного исправления production измените master и отправьте новый проверенный коммит. Для ручного отката остановите новые публикации target, дождитесь завершения текущей job, выберите готовый предыдущий SHA. Можно повторно упаковать соответствующий `releases/<sha>` и запустить актуальный `frontend-deploy.sh` с **той же фиксированной парой каталогов**, правильным `--target` и healthcheck origin из таблицы. Скрипт выполняет проверку версии и откат к текущей статике при ошибке так же, как при обычном релизе. Не используйте старый workflow другого target для отката.

`.current` и `.deploy.lock` находятся в `<deploy-root>/releases`. `.well-known` не удаляется. При первом сбое возвращается `pre-automation-*`; такие каталоги не являются commit SHA. Автоматической очистки releases нет: сохраняйте текущий, предыдущий рабочий и первоначальный backup до проверки восстановления. Не храните пользовательские загрузки в управляемом dist/web-root.

## 7. Если deployment остановился или страницы не работают

| Сообщение/симптом | Проверить |
|---|---|
| Test API совпадает с production | TEST_VITE_API_URL и отдельный API origin |
| Test variable/secret пуст | Именно TEST_* namespace и environment test-frontend; fallback отсутствует |
| Deployment paths do not match | Выбранный target и фиксированные пары путей; прежний вложенный project/dist больше не используется на VPS |
| Test web root still contains a source checkout | Выполнить однократный перенос checkout из раздела 3 |
| Paths resolve outside selected target | Символьные ссылки и readlink; нельзя направлять test web-root в production |
| API-запросы в браузере не работают | Test API :3180, разрешённый CORS origin http://94.250.251.94:3181 и совместимость API со страницей |
| HTTP rejected | HTTP допустим только для target=test; production frontend и API требуют HTTPS |
| SSH denied/host key mismatch | Отдельный ключ, пользователь, authorized_keys, PORT и проверенный known_hosts |
| nginx duplicate default server | Не добавлять default_server к test vhost; не включать две копии vhost |
| 403 у test static | Права /var/code/ablaki-front и проход nginx по родительским каталогам |
| 404 для всех assets | Root vhost на порту 3181 и asset location должны указывать на /var/code/ablaki-front |
| Повтор SHA не меняет VITE_* | Нужен новый коммит и новая сборка |

Локальные Node tests используют только временный HTTP сервер, без production запросов. Статическая проверка workflow и Bash не заменяет реальную публикацию и проверку rollback на test VPS. [План оставшихся серверных проверок](../plans/2026-09-06-production-test-deployment.md).
