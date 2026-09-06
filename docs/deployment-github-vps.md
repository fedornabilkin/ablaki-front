# Frontend: production и test через GitHub Actions

Обновлено 6 сентября 2026 года. Production frontend уже работает и остаётся в `/var/www/ablakin.ru`. Изменения ниже добавляют отдельный test deployment; настройка тестовых DNS, сертификатов и GitHub environment этой работой не выполнялась.

[Workflow](../.github/workflows/node.js.yml), [карта target](../deploy/deployment-target.mjs), [серверный скрипт](../deploy/frontend-deploy.sh), [проверка API](../deploy/check-api.mjs). Настройка backend описана отдельно в [его инструкции](https://github.com/fedornabilkin/ablaki/blob/master/docs/production-test-deployment.md).

## 1. Параметры окружений

| Параметр | Production | Test |
|---|---|---|
| Событие публикации | Push в `master`; ручной запуск production из master | Пока только ручной `workflow_dispatch`, target `test` |
| Исходная ветка | `master`, точный SHA события | Выбранная существующая ветка; по умолчанию `master` |
| GitHub environment | `production-frontend` | `test-frontend` |
| Каталог релизов и состояния | `/opt/ablaki-frontend` | `/opt/ablaki-frontend-test` |
| Web-root системного nginx | `/var/www/ablakin.ru` | `/var/code/ablaki-front/project/dist` |
| Checkout frontend на VPS | Не нужен для публикации | `/var/code/ablaki-front`; workflow его не обновляет |
| Каталог backend | `/var/www/api.ablakin.ru` | `/var/code/ablaki` |
| Frontend origin | `https://ablakin.ru` | Отдельный выбранный HTTPS origin |
| API origin | `https://api.ablakin.ru/` | Отдельный выбранный HTTPS API origin |
| Backend health.environment | `production` | `test` |

`test.ablakin.ru` и `api-test.ablakin.ru` — возможные примеры имён, а не подтверждённые настроенные домены. В nginx-примерах используется токен `TEST_FRONTEND_HOST`: замените его фактическим выбранным доменом.

Серверный скрипт принимает только две пары каталогов из таблицы. Для test нельзя передать `/var/code/ablaki-front` или `/var/code/ablaki-front/project`: `rsync --delete-after` разрешён только внутри `project/dist`. После `readlink -f` пути проверяются повторно; символьная ссылка на production или на другой каталог будет отклонена.

## 2. GitHub: отдельные secrets и variables

В репозитории `fedornabilkin/ablaki-front` создайте два environment. Существующие production secrets сохраните. Для test заведите отдельный SSH-ключ и пользователя, которому не разрешена запись в production.

| Environment secret | production-frontend | test-frontend |
|---|---|---|
| SSH host | `FRONTEND_DEPLOY_HOST` | `TEST_FRONTEND_DEPLOY_HOST` |
| SSH port | `FRONTEND_DEPLOY_PORT` | `TEST_FRONTEND_DEPLOY_PORT` |
| SSH user | `FRONTEND_DEPLOY_USER` | `TEST_FRONTEND_DEPLOY_USER` |
| Полный закрытый ключ | `FRONTEND_DEPLOY_SSH_KEY` | `TEST_FRONTEND_DEPLOY_SSH_KEY` |
| Проверенные known_hosts | `FRONTEND_DEPLOY_KNOWN_HOSTS` | `TEST_FRONTEND_DEPLOY_KNOWN_HOSTS` |

IP и порт могут совпадать, если оба окружения расположены на одном VPS. Ключи и права пользователей разделяются. Отпечаток серверного ключа проверяется через доверенную консоль VPS; не отключайте `StrictHostKeyChecking` и не доверяйте одному только `ssh-keyscan`.

| Variable | Production | Test | Где задать |
|---|---|---|---|
| Базовый API URL, обязательно с `/` на конце | `VITE_API_URL` | `TEST_VITE_API_URL` | Repository variables: нужны job сборки |
| WS URL, если сервис подключён | `VITE_WS_URL` | `TEST_VITE_WS_URL` | Repository variables; необязательные |
| Frontend HTTPS origin без пути | `FRONTEND_HEALTHCHECK_URL` | `TEST_FRONTEND_HEALTHCHECK_URL` | Соответствующий environment или Repository variables |

API URL обязательны; для обоих HTTPS-сайтов нужен HTTPS API. Все `VITE_*` публичны и попадают в сборку, поэтому пароли и серверные токены в них хранить нельзя. Пустая test variable не заменяется production значением. Отсутствующие test secrets также приводят к остановке, а не к использованию production ключей.

Production `VITE_API_URL` дополнительно используется только для сравнения origins: test API не может совпасть с ним или с хостом `api.ablakin.ru`. Test frontend не может иметь production origin из `FRONTEND_HEALTHCHECK_URL`, если variable доступна, либо хост `ablakin.ru`, `www.ablakin.ru` или `api.ablakin.ru`. Если production health variable хранится только в `production-frontend`, она недоступна из `test-frontend`; для проверки нестандартного production alias скопируйте публичное значение в Repository variables. Никакие production адреса не используются как test fallback.

API дополнительно сообщает окружение через `health.environment`, поэтому другой DNS alias production API не проходит test readiness. В backend необходимо правильно задать `APP_ENVIRONMENT` и сохранить отдельные существующие настройки окружений: production использует MySQL по `MYSQL_DB_*`, test — PostgreSQL по `PG_DB_*`. Публикация frontend не меняет их БД, Redis или сервисы.

Production environment разрешает публикации только из master. Для test обычно также запускают сам workflow из master, а исходную ветку выбирают полем `branch`. Защита environment оценивает ветку workflow, а не отдельный checkout приложения. Обязательные PR для работы владельца не вводятся.

Синтаксис `vars`, `secrets` и `needs` приведён в [официальном справочнике GitHub contexts](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts). Отсутствующий secret возвращает пустую строку; workflow проверяет обязательные значения до SSH, согласно [документации secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets).

## 3. Подготовить только test каталоги и доступ

Команды этого раздела выполняются на VPS администратором. Production frontend, его nginx и каталоги релизов не перемещаются.

Убедитесь, что checkout `/var/code/ablaki-front` уже существует и содержит `project`. Установлены `rsync`, `curl`, `tar`, `sha256sum`, `flock`, `readlink`; Node.js нужен только GitHub runner.

```bash
# Если пользователя ещё нет:
sudo adduser --disabled-password --gecos '' deploy-test

# Сначала проверить существующий checkout, затем создать только dist.
test -d /var/code/ablaki-front/project
sudo install -d -o deploy-test -g deploy-test -m 0750 \
  /opt/ablaki-frontend-test \
  /opt/ablaki-frontend-test/incoming \
  /opt/ablaki-frontend-test/releases
sudo install -d -o deploy-test -g www-data -m 0755 \
  /var/code/ablaki-front/project/dist
sudo install -d -o deploy-test -g deploy-test -m 0700 /home/deploy-test/.ssh
namei -l /var/code/ablaki-front/project/dist
```

Если `dist` уже содержит нужную тестовую статику, сначала сохраните её копию. Не выполняйте рекурсивные `chown`, `chmod`, `rm` или `rsync --delete` для `/var/code/ablaki-front`: в нём находятся исходники и `.git`. Сборка на сервере и синхронизация checkout для доставки dist не нужны.

Пользователю `deploy-test` и nginx (`www-data`) нужен проход по родительским каталогам. При закрытых правах выдайте точечный ACL, сохранив владельцев checkout; для команды нужен пакет `acl`:

```bash
sudo setfacl -m u:deploy-test:--x,u:www-data:--x \
  /var/code /var/code/ablaki-front /var/code/ablaki-front/project
sudo -u deploy-test test -w /var/code/ablaki-front/project/dist
sudo -u deploy-test test -w /opt/ablaki-frontend-test
sudo -u deploy-test test ! -w /var/www/ablakin.ru
sudo -u deploy-test test ! -w /opt/ablaki-frontend
```

Создайте отдельный SSH-ключ локально, добавьте публичную часть с префиксом `restrict ` в `/home/deploy-test/.ssh/authorized_keys`, выставьте владельца `deploy-test` и права `0600`. Закрытая часть попадает только в `TEST_FRONTEND_DEPLOY_SSH_KEY`. Перед использованием в Actions проверьте SSH вход с этим ключом и проверенным known_hosts.

Для нового пустого test dist можно создать заглушку; существующую страницу не перезаписывайте:

```bash
sudo -u deploy-test bash <<'BASH'
set -e
umask 022
cd /var/code/ablaki-front/project/dist
test ! -e index.html
printf '%s\n' '<!doctype html><meta charset="utf-8"><h1>Тестовый сайт готовится к запуску</h1>' > index.html
printf '%s\n' 'bootstrap' > deploy-version.txt
BASH
```

## 4. Системный nginx: HTTP bootstrap, затем сертификат

Сначала выберите тестовый frontend домен и направьте его A-запись на нужный VPS. AAAA используйте только при работающем IPv6. Порты 80 и 443 должны быть доступны. Эти DNS настройки ещё не подтверждены.

1. Создайте `/etc/nginx/sites-available/ablaki-frontend-test` на основе [HTTP-примера](../deploy/nginx/test-frontend.http.conf.example). Замените `TEST_FRONTEND_HOST` реальным доменом. На этом этапе в конфигурации нет ссылок на ещё не существующие сертификаты.
2. Включите один test vhost и проверьте nginx:

```bash
# Если такая ссылка уже существует, повторно её не создавайте.
sudo ln -s /etc/nginx/sites-available/ablaki-frontend-test /etc/nginx/sites-enabled/ablaki-frontend-test
sudo nginx -t
sudo systemctl reload nginx
```

3. Задайте фактический домен для следующих команд. Значение `YOUR_TEST_FRONTEND_DOMAIN` необходимо заменить:

```bash
TEST_FRONTEND_HOST=YOUR_TEST_FRONTEND_DOMAIN
curl -fsS "http://$TEST_FRONTEND_HOST/deploy-version.txt"
```

4. Используйте уже принятый на VPS способ управления сертификатами. Для установленного Certbot с webroot:

```bash
sudo certbot certonly --webroot \
  -w /var/code/ablaki-front/project/dist \
  -d "$TEST_FRONTEND_HOST"
```

5. После выдачи сертификата замените содержимое того же vhost на [HTTPS-пример](../deploy/nginx/test-frontend.https.conf.example), заменив токен домена и проверив фактический путь сертификата. HTTP bootstrap и HTTPS пример не включаются одновременно двумя файлами.

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo certbot renew --dry-run
curl -fsS "https://$TEST_FRONTEND_HOST/deploy-version.txt"
```

В примерах нет `default_server`, чтобы не повторить конфликт нескольких сайтов на 443. Root для всех test location — `/var/code/ablaki-front/project/dist`. `/assets/` при отсутствии файла возвращает 404; `index.html` и версия не кешируются; `.well-known` сохраняется при публикации. Скрытые файлы закрыты.

Production frontend использует существующий vhost `ablakin.ru`. [Образец location-блоков](../deploy/nginx/production-frontend.locations.conf.example) предназначен для сверки внутри него, а не для создания второго server. Сертификаты и существующий HTTPS redirect сохраняются.

Frontend nginx обслуживает статику. Запросы API идут на отдельный HTTPS origin из переменной сборки; `proxy_pass /api` здесь не добавляется. Backend каждого окружения должен разрешать CORS соответствующего frontend, включая OPTIONS и заголовки Authorization/Content-Type.

## 5. Как запускать

Production: обычный push в master запускает проверки и production deploy. Ручной production запуск допускается только из master с `target=production` и `branch=master`.

Test: GitHub → Actions → **Frontend CI and deploy** → **Run workflow**. Выберите workflow из master, `target=test` и существующую исходную `branch` (по умолчанию master). Workflow фиксирует фактически собранный SHA ветки. `release/**` push и PR в master выполняют только проверки, без публикации.

Последовательность одинакова для двух target:

1. Выбор фиксированной конфигурации target.
2. Checkout выбранного исходного коммита; отдельный checkout deployment scripts из ревизии workflow.
3. Node.js 24, npm ci, deployment tests, unit tests и build. Моки craft/stat/city выключены.
4. Артефакт `frontend-<target>-<source_sha>`, срок хранения 14 дней.
5. Deploy-job получает только environment выбранного target и его secrets. API URL берётся из результата той же сборки.
6. Проверка каталогов, origins и readiness API. До загрузки/активации статики ожидаются HTTP 200, JSON, совместимый `portalListsVersion`, SHA backend, правильное `health.environment`, online-count и envelope комментариев. Каждый публичный ответ должен разрешать CORS frontend origin. Общий лимит ожидания — 180 секунд.
7. Передача архива с checksum по SSH; публикация через releases/<sha> и rsync; проверка публичного deploy-version.txt. При ошибке активации восстанавливается предыдущая статика.

Сначала выпустите backend нужного окружения. Старый backend без `health.environment` не пропускается. Если backend ещё публикуется, frontend ждёт; после исчерпания лимита текущая статика остаётся. Для повтора упавшей deploy-job используйте **Re-run failed jobs**, пока артефакт доступен.

Backend обновляет код и vendor, затем выполняет обычный `make up` с миграциями существующей БД, без backup/dump перед деплоем. Frontend продолжает проверять полный `/health` и совместимость списков: ошибка миграций или неподготовленная схема не пропускает новую статику. Создание и копирование БД между окружениями не входят в этот процесс.

Пример публичных read-only проверок после test публикации:

```bash
curl -fsS "https://$TEST_FRONTEND_HOST/deploy-version.txt"
curl -I "https://$TEST_FRONTEND_HOST/forum"
curl -I "https://$TEST_FRONTEND_HOST/assets/does-not-exist.js"
```

Файл версии должен совпасть с фактическим source SHA, прямой маршрут SPA — открываться, отсутствующий asset — возвращать 404. В браузере проверьте Request URL: тестовая сборка обращается к тестовому API. Затем подтвердите, что SHA production сайта не изменился от test deployment.

Браузерные операции с балансом/играми проверяются только на изолированном test backend. Успешная доставка статики сама по себе не подтверждает корректность экономики или изоляцию тестовой БД.

## 6. Повторная сборка и откат

Releases production и test хранятся отдельно. Готовый каталог одного SHA повторно используется только внутри своего target. После изменения переменных сборки сделайте новый коммит: повтор того же SHA не заменяет уже готовую сборку. При неполной распаковке `<sha>` без `<sha>.ready` сначала проверьте каталог и перенесите его за пределы releases; действующий release не удаляйте.

Для обычного исправления production измените master и отправьте новый проверенный коммит. Для ручного отката остановите новые публикации target, дождитесь завершения текущей job, выберите готовый предыдущий SHA. Можно повторно упаковать соответствующий `releases/<sha>` и запустить актуальный `frontend-deploy.sh` с **той же фиксированной парой каталогов**, правильным `--target` и healthcheck origin из таблицы. Скрипт выполняет проверку версии и откат к текущей статике при ошибке так же, как при обычном релизе. Не используйте старый workflow другого target для отката.

`.current` и `.deploy.lock` находятся в `<deploy-root>/releases`. `.well-known` не удаляется. При первом сбое возвращается `pre-automation-*`; такие каталоги не являются commit SHA. Автоматической очистки releases нет: сохраняйте текущий, предыдущий рабочий и первоначальный backup до проверки восстановления. Не храните пользовательские загрузки в управляемом dist/web-root.

## 7. Если deployment остановился

| Сообщение/симптом | Проверить |
|---|---|
| Test API совпадает с production | TEST_VITE_API_URL, отдельный API origin и backend APP_ENVIRONMENT=test |
| API environment не совпадает | Нужный vhost/upstream, environment backend, свежий health endpoint |
| Test variable/secret пуст | Именно TEST_* namespace и environment test-frontend; fallback отсутствует |
| Deployment paths do not match | Выбранный target и фиксированные пары путей; checkout root недопустим |
| Paths resolve outside selected target | Символьные ссылки и readlink; нельзя направлять test dist в production |
| CORS/HTML/старый контракт | Правильный отдельный API, HTTPS, новые миграции и readiness endpoint |
| SSH denied/host key mismatch | Отдельный ключ, пользователь, authorized_keys, PORT и проверенный known_hosts |
| nginx duplicate default server | Не добавлять default_server к test vhost; не включать две копии vhost |
| 403 у test static | Права самого dist и проход nginx по родительским каталогам |
| 404 для всех assets | Root HTTPS-vhost и asset location должны указывать на test dist |
| Повтор SHA не меняет VITE_* | Нужен новый коммит и новая сборка |

Локальные Node tests используют только временный HTTP сервер, без production запросов. Статическая проверка workflow и Bash не заменяет реальную публикацию и проверку rollback на test VPS. [План оставшихся серверных проверок](../plans/2026-09-06-production-test-deployment.md).
