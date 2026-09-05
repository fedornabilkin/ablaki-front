# Настройка деплоя frontend
Дата: 2026-09-05. Статус: workflow и серверный скрипт реализованы; настройка GitHub/VPS и первая публикация этой работой не выполнялись.

## Цель и контекст
Воспроизводимо публиковать проверенный project/dist на VPS с откатом по схеме PCM Helper.
[Соглашение](../agreements/deployment.md). Workflow должен находиться в frontend/.github/workflows относительно общего рабочего каталога.
Основная ветка master, подготовительная release/2026-09-05. Текущий этап — только frontend. Web-root: `/var/www/ablakin.ru`, deploy-root: `/opt/ablaki-frontend`. [Инструкция, пункты 7 и 8](../docs/deployment-github-vps.md) реализована в коде; у проекта отдельный backend API.

## Группа A: Готовность и параметры
- [ ] A1. Определить domain, origin API, SSH-host/port, web-root и deploy-root.
- [ ] A2. Закрыть production-блокеры моков и экономики из планов frontend/backend.
- [ ] A3. Зафиксировать VITE_API_URL и доступные функции; запретить неявный demo fallback.

## Группа B: Проверки и артефакт
- [x] B1. Создать workflow на основе PCM Helper с working-directory project и Node.js 24: `.github/workflows/node.js.yml`.
- [x] B2. Реализовать npm ci, test:unit и build для PR/master/release; проверять обязательный абсолютный VITE_API_URL с завершающим `/`. Запуск в GitHub Actions проверяется отдельно.
- [ ] B3. Добавить typecheck и браузерные smoke-тесты, затем включить их в обязательные проверки.
- [x] B4. Сохранять проверенный dist как артефакт commit SHA; не пересобирать на VPS. Реализовано в workflow, запуск в Actions ещё не проверен.
- [x] B5. Ограничить автоматическую публикацию проверенным master, сериализовать deploy через concurrency. Реализовано в workflow.

## Группа C: VPS, nginx и SSH
- [ ] C1. Подготовить пользователя deploy с отдельным ключом, минимальными правами и проверенным host key.
- [ ] C2. Подготовить web-root и каталоги релизов; сохранить текущую статику.
- [ ] C3. Настроить HTTPS/DNS, SPA fallback, asset 404, кеширование хешированных файлов и no-cache index.
- [ ] C4. Проверить прямые запросы браузера к отдельному API-хосту из Repository variable VITE_API_URL, HTTPS и CORS. Проксирование `/api/` на frontend nginx исключено по уточнению пользователя.
- [ ] C5. Настроить WS только после готовности серверного чата.
- [ ] C6. Добавить GitHub environment production-frontend и secrets/variables из соглашения.

## Группа D: Релиз и откат
- [x] D1. Добавить deploy/frontend-deploy.sh из PCM Helper: SHA-256, immutable releases, flock, сохранение .well-known. Пути Ablaki передаются из workflow; LF закреплён в `.gitattributes`.
- [x] D2. Реализовать проверку deploy-version.txt через публичный HTTPS-origin и откат при неуспехе. Сквозная проверка на сервере остаётся в D3.
- [ ] D3. Проверить два релиза, повтор SHA и отказ health check на тестовом сервере.
- [ ] D4. Проверить главную, прямой SPA URL, JS/CSS, вход и API; зависит от C3–C6.
- [ ] D5. Определить хранение старых релизов и резервирование; текущий и предыдущий не удалять.
- [ ] D6. Выполнить первую production-публикацию только после A2 и D3–D4.

## Критерии готовности
Один проверенный артефакт публикуется повторяемо; сбой восстанавливает предыдущую версию.
Рабочий API подтверждён отдельно от проверки SHA. Домены, ключи и серверные пути не подставляются из PCM Helper буквально.

## Проверка добавленных файлов
- `bash -n deploy/frontend-deploy.sh` — успешно.
- `npm run test:unit` — 15 тестов в 3 файлах прошли.
- `npm run build` — успешно; Vite предупреждает о крупных чанках.
- Тесты и сборка выполнены вне песочницы после ошибки доступа Vite к конфигурации. Это локальные проверки, не запуск workflow в GitHub и не проверка rsync/отката на VPS.
