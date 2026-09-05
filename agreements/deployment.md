# Соглашение по деплою frontend

Статус: workflow и серверный скрипт добавлены в код по образцу PCM Helper; настройка GitHub/VPS и первый production-запуск этой работой не выполнялись. [Инструкция](../docs/deployment-github-vps.md).

## Схема
- GitHub Actions собирает project/dist и передаёт проверенный архив по SSH; статику отдаёт системный nginx.
- PR выполняет проверки. Production-публикация допускается из master после проверок; release/2026-09-05 предназначена для подготовки.
- Базовое окружение CI — Node.js 24; npm ci → npm run test:unit → npm run build.
- На VPS передавать только dist и скрипт релиза. Сборка на сервере не требуется.
- Web-root — `/var/www/ablakin.ru`, deploy-root — `/opt/ablaki-frontend`. В инструкции используется домен `ablakin.ru`; SSH-доступ и API upstream нужно сверить с сервером до первого запуска.
- Workflow: [.github/workflows/node.js.yml](../.github/workflows/node.js.yml). Серверный скрипт: [deploy/frontend-deploy.sh](../deploy/frontend-deploy.sh).

## Публикация и откат
- Артефакт привязан к commit SHA, проверяется SHA-256.
- Публикации сериализуются GitHub concurrency и серверным flock.
- Перед первым релизом сохранять предыдущую статику; предусмотреть проверенный автоматический и ручной откат.
- Скрипт публикует статику через `rsync --delete-after --delay-updates`, сохраняет `.well-known` и предыдущую статику для отката. Файл `releases/.current` содержит SHA успешного релиза. Пользовательские загрузки нельзя размещать в управляемом web-root.
- Проверка deploy-version.txt подтверждает SHA публикации; дополнительно проверять SPA, API и WebSocket.
- Политику хранения старых releases определить отдельно.

## Доступ и конфигурация
- Environment: production-frontend. Отдельный SSH-ключ deploy, проверенный known_hosts, минимальные права без sudo для обычного релиза.
- Secrets: FRONTEND_DEPLOY_HOST, FRONTEND_DEPLOY_PORT, FRONTEND_DEPLOY_USER, FRONTEND_DEPLOY_SSH_KEY, FRONTEND_DEPLOY_KNOWN_HOSTS.
- Variable FRONTEND_HEALTHCHECK_URL — публичный HTTPS origin.
- VITE_API_URL и флаги функций задаются при сборке; VITE_* публичны.
- Рекомендуемый API — /api/ на домене SPA с явным преобразованием URI в маршруты Yii.
- Для доступного чата нужен готовый сервер WS и согласованный протокол; одного VITE_WS_URL недостаточно.
- TLS, DNS, firewall, nginx и backend настраиваются отдельно от публикации статики.
- Bash и workflow сохранять с LF.

## Готовность
- Моки и незавершённые функции должны быть изолированы до выпуска.
- Изменения API выпускать с обратной совместимостью либо в согласованном порядке backend → frontend.
- Задачи настройки находятся в [плане деплоя](../plans/2026-09-05-frontend-deployment.md).
