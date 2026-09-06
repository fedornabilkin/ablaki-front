# Соглашение по деплою frontend

Статус: владелец подтвердил успешный production-деплой frontend. [Инструкция](../docs/deployment-github-vps.md).

## Схема
- GitHub Actions собирает project/dist и передаёт проверенный архив по SSH; статику отдаёт системный nginx.
- Разработка и публикация ведутся непосредственно в master по решению владельца. Push master выполняет CI и production deploy; PR не обязателен. Рабочие ветки создаются только по отдельной просьбе.
- Базовое окружение CI — Node.js 24; npm ci → npm run test:unit → npm run build.
- На VPS передавать только dist и скрипт релиза. Сборка на сервере не требуется.
- Web-root — `/var/www/ablakin.ru`, deploy-root — `/opt/ablaki-frontend`. В инструкции используется домен `ablakin.ru`; SSH-доступ и адрес отдельного API-хоста нужно сверить до первого запуска.
- Workflow: [.github/workflows/node.js.yml](../.github/workflows/node.js.yml). Серверный скрипт: [deploy/frontend-deploy.sh](../deploy/frontend-deploy.sh).

## Публикация и откат
- Артефакт привязан к commit SHA, проверяется SHA-256.
- Публикации сериализуются GitHub concurrency и серверным flock.
- Перед публикацией статики `deploy/check-api.mjs` проверяет совместимый health-контракт backend, JSON списков, CORS и HTTPS. Ожидание ограничено 180 секундами; при отказе текущая статика сохраняется. После обновления backend frontend workflow повторяется отдельно.
- Перед первым релизом сохранять предыдущую статику; предусмотреть проверенный автоматический и ручной откат.
- Скрипт публикует статику через `rsync --delete-after --delay-updates`, сохраняет `.well-known` и предыдущую статику для отката. Файл `releases/.current` содержит SHA успешного релиза. Пользовательские загрузки нельзя размещать в управляемом web-root.
- Проверка deploy-version.txt подтверждает SHA публикации; дополнительно проверять SPA, API и WebSocket.
- Политику хранения старых releases определить отдельно.

## Доступ и конфигурация
- Environment: production-frontend. Отдельный SSH-ключ deploy, проверенный known_hosts, минимальные права без sudo для обычного релиза.
- Secrets: FRONTEND_DEPLOY_HOST, FRONTEND_DEPLOY_PORT, FRONTEND_DEPLOY_USER, FRONTEND_DEPLOY_SSH_KEY, FRONTEND_DEPLOY_KNOWN_HOSTS.
- Variable FRONTEND_HEALTHCHECK_URL — публичный HTTPS origin.
- `VITE_API_URL` задаётся как GitHub Repository variable: полный HTTP(S)-адрес отдельного API-хоста с завершающим `/`. Workflow проверяет адрес перед сборкой; пустое значение и относительный `/api/` не допускаются. `VITE_*` публичны и записываются в сборку.
- Браузер напрямую обращается к отдельному API-хосту. Frontend nginx раздаёт статику и не проксирует API. Для frontend по HTTPS нужен HTTPS API, разрешающий CORS с origin `https://ablakin.ru`, используемые методы и заголовки `Content-Type`/`Authorization`.
- Для доступного чата нужен готовый сервер WS и согласованный протокол; одного VITE_WS_URL недостаточно.
- TLS, DNS, firewall, nginx и backend настраиваются отдельно от публикации статики.
- Bash и workflow сохранять с LF.

## Готовность
- Моки и незавершённые функции должны быть изолированы до выпуска.
- Изменения API выпускать с обратной совместимостью либо в согласованном порядке backend → frontend.
- Задачи настройки находятся в [плане деплоя](../plans/2026-09-05-frontend-deployment.md).
