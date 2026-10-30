# Облакин — frontend

Vue 3 SPA для игрового мира, крафта, форума, биржи и мини-игр. Приложение находится в `project/`. Стек: Vite 7, Vue Router 4, Naive UI, Pug, SCSS, Font Awesome; сессией владеет Vuex auth, в новых доменах используется Pinia.

[Документация](docs/README.md) · [Текущие планы](docs/plan/README.md) · [Соглашения](agreements/general.md)

## Локальная разработка

В CI используется Node.js 24. Из `project/`:

```sh
npm ci
npm run dev
```

Vite доступен по `http://localhost:5173`. Запросы `/api/` проксируются на `API_PROXY_TARGET`, затем `VITE_API_URL` из `project/.env`; по умолчанию — `http://localhost:3180/`. После изменения адреса перезапустить Vite. Переменные `VITE_*` доступны клиенту и не должны содержать серверные секреты.

## Проверки и сборка

Из `project/`:

```sh
npm run test:unit
npm run test:slow
npm run test:full
npm run build
```

После мобильных доработок и поповеров хранилищ 30 октября 2026 года полный набор — 448 тестов: 323 unit и 125 slow. `test:full` обязателен перед production. Отдельного lint/typecheck пока нет; транспиляция не проверяет типы. [Состав, CI и замеры](docs/operations/frontend-tests-2026-10-30.md).

Результат сборки — `project/dist/`. `docker-compose.yml` запускает `npm ci && npm run build` в сервисе `nodejs`, nginx публикует результат на порту `BLK_NGINX_PORT` из корневого `.env` (шаблон — `.env-sample`). Запуск из корня frontend: `docker-compose up -d` или `make up`.

Старые Makefile-цели `npm-*` и `build-frontend` ссылаются на `code/`; их пути не соответствуют текущему `project/`. Для разработки и сборки использовать команды выше. `make init` удаляет volumes и не нужен для обычного запуска.

## Текущий этап

MVP реализован локально; остаются [ручная приёмка](docs/plan/2026-10-29-manual-ui-acceptance.md) двумя участниками и отдельная подготовка production по [общему плану](../back/docs/plan/2026-10-21-mvp-launch-readiness.md). Локальная сборка не подтверждает удалённую публикацию. Инструкция выпуска — [deployment](docs/operations/deployment-github-vps.md).
