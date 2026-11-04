# Документация frontend

Актуально на **4 ноября 2026**. Мир и интерфейс опубликованы на production. Последняя прикладная версия `af177ee` от 3 ноября: 491 тест и сборка прошли, опубликованный SHA подтверждён. **[Активные планы](plan/README.md)** содержат оставшуюся ручную приёмку и дальнейшее развитие.

| Раздел | Содержание |
| --- | --- |
| [plan](plan/README.md) | Активные задачи; [done](plan/done/) — полностью выполненные пакеты. |
| [reference](reference/) | Страницы и интеграция с API. |
| [operations](operations/) | Сборка, публикация и эксплуатация. |
| [reports](reports/) | Исторические отчёты проверок. |

## Текущий интерфейс

- [Единообразие и Mobile First](operations/2026-10-30-interface-consistency.md): общие шапки, панели, заголовки, окна и предметы; отчёты 2–3 ноября содержат актуальную проверку и ссылки на CI.
- [Шапка и выращивание](plan/done/2026-11-03-world-actions-cultivation.md): видимые задания/чеклист/персонаж, бейдж остатка, показатели финансов, выделение построек и явные этапы полива.
- [Крафт](plan/done/2026-11-01-craft-command-recovery.md) и [склад](plan/done/2026-11-01-warehouse-transfer.md): исправления опубликованы.
- [Чеклист MVP](operations/world-mvp-checklist.md): автоматические/ручные отметки, комментарии, localStorage и экспорт JSON; доступен в опубликованном интерфейсе.
- [Тесты frontend](operations/frontend-tests-2026-10-30.md) и [выбор выкладки](plan/done/2026-11-02-release-optimization.md): полный набор перед production, без пересборки приложения для одной документации.

## Оставшиеся проверки

[Ручная приёмка](plan/2026-10-29-manual-ui-acceptance.md), [UI:E2/E3](plan/2026-10-15-world-closed-test-ui.md) и [CONUI:E2/E3](plan/2026-10-16-world-economy-content-ui.md): два игрока, реальный API, 360/390/768/1280 px, клавиатура и фокус. Осмотры 2–3 ноября выполнены на настоящих компонентах с изолированными ответами; авторизованный IAB был недоступен. Это не полный ручной игровой маршрут.

[Общий план](../../back/docs/plan/2026-10-21-mvp-launch-readiness.md) относится к приёмке и эксплуатации уже включённого production. [Сквозные сроки выкладки](../../back/docs/plan/2026-10-19-test-deployment-optimization.md) пока не подтверждены серией десяти выпусков.

## Контракты и развитие

- [Общие запросы API](reference/api-reads.md), [контракт мира](../../back/docs/architecture/simple-world-api.md), [экономика](../../back/docs/architecture/economy-runtime-api.md), [выращивание](../../back/docs/architecture/world-cultivation-states.md).
- [Публикация frontend](operations/deployment-github-vps.md), [дорожная карта мира](plan/2026-09-26-world-frontend.md), [рынок](plan/2026-10-16-world-market-ui.md), [исходные ТЗ](../../back/docs/tz/README.md).
- [Результат актуализации 4 ноября](plan/README.md#результат-актуализации), [предыдущая сверка](plan/done/2026-10-29-plan-refresh.md).

Временные результаты, снимки и логи хранятся в общей `../temp/<задача>/`, вне Git. Датированные числа тестов в старых отчётах описывают соответствующий выпуск, а не текущую версию.
