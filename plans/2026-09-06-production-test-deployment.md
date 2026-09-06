# Раздельный deployment frontend: production и test

Дата: 2026-09-06.

## Цель и контекст
Сохранить действующий push master → production и добавить ручной test-deploy выбранной ветки. Production frontend остаётся в `/var/www/ablakin.ru`; test checkout — `/var/code/ablaki-front`, управляемая статика только в `project/dist`. Backend production находится в `/var/www/api.ablakin.ru`, backend test — в `/var/code/ablaki`; этот план не меняет backend.

## Группа A: Workflow и изоляция
- [x] A1. Добавить target production/test и ручной выбор существующей test-ветки, default master.
- [x] A2. Разделить environments, namespaces секретов/variables, concurrency и каталоги releases.
- [x] A3. Запретить production deployment не из master; PR и release push оставить только checks.
- [x] A4. Проверять test API/frontend против production hosts/origins и health.environment.
- [x] A5. Зафиксировать target-пары путей в серверном скрипте до файловых операций и после readlink.

## Группа B: Инструкция и nginx
- [x] B1. Обновить runbook с конкретными production/test параметрами без переноса production frontend.
- [x] B2. Добавить отдельные HTTP bootstrap и HTTPS примеры nginx для test; домены оставить настраиваемыми.
- [x] B3. Описать права только на test dist и test releases, сертификаты, запуск и откат.

## Группа C: Проверки
- [x] C1. Выполнить Node deployment tests, Bash syntax и статическую проверку workflow.
- [ ] C2. После выбора test-доменов настроить DNS/TLS/GitHub environment на VPS и выполнить ручной test-deploy.
- [ ] C3. На test проверить две версии и автоматический откат, подтвердить неизменность production SHA.

## Критерии готовности
Test workflow не получает production secrets, не собирается с production API и публикует только test dist. Готовность API проверяется до загрузки/активации. Production пути и автоматический trigger master сохранены.

## Ограничения
Изменения подготовлены локально. Домены `test.ablakin.ru` / `api-test.ablakin.ru` — возможные примеры, DNS/TLS для них не подтверждены. Исходники приложения не изменяются; C2–C3 требуют отдельного серверного запуска.

## Выполненная проверка
- `node --test deploy/check-api.test.mjs deploy/deployment-target.test.mjs deploy/deployment-script.test.mjs`: 37 проверок прошли; запросы только к локальному временному HTTP серверу.
- `bash -n deploy/frontend-deploy.sh` и `node --check` двух deployment модулей: успешно.
- Workflow проверен actionlint 1.7.12 и чтением: target outputs/needs, master-only production, PR checks-only, выбранный source SHA, target environment/secret namespace и gate до SSH публикации. Реальный запуск GitHub Actions проверяется после push.
- Проверены относительные ссылки runbook/соглашения/плана и LF. Nginx проверен статически и тестами назначения test root; `nginx -t` на целевом сервере остаётся в C2.
