# Production-релиз

Цель: выпустить проверенные в test статистику, форум и четыре игры по указанию владельца.
Контекст: release/09-production собрана от master из рабочих веток и проверенных отдельных коммитов; дерево совпадает с test, сама ветка test не является предком релиза.

## Группа A: Проверка
- [x] A1. Сверить состав релиза с test и разрешить конфликты проверенными версиями файлов.
- [x] A2. Пройти unit/сборку и проверить production API URL в сборке.

Результат A: 119 unit-тестов / 18 файлов и production-сборка с https://api.ablakin.ru/ прошли локально. [CI 34889959052](https://github.com/fedornabilkin/ablaki-front/actions/runs/34889959052) успешно выполнил проверки и test deploy.

## Группа B: Production
- [x] B1. Влить release-ветку в master после успешного backend deploy.
- [x] B2. Проверить SHA статики, страницы и API; удалить выпущенные рабочие ветки.

Результат B: [production CI 34891887770](https://github.com/fedornabilkin/ablaki-front/actions/runs/34891887770) успешен. https://ablakin.ru/deploy-version.txt подтверждает 088701bb6a2a5351ad25fbe35dca2fb5f8df45e8; опубликованный index-DyNsay6O.js содержит https://api.ablakin.ru/, начальные JS-файлы не содержат тестовый адрес. /games/five, /games/duel, /statistics возвращают 200. Backend-релиз 9aa6d61 выложен и проверен перед frontend. Рабочие ветки удалены; test в master не вливался.

Локальный http://localhost:5173/games/five отвечает 200; .env.local сохранён с тестовым API http://94.250.251.94:3180/. Проверка production выполнена по HTTP и CI; интерактивная авторизованная игра в браузере не выполнялась.

Критерии: сайт обслуживает новую версию и обращается к production API, локальный dev остаётся подключён к test.
