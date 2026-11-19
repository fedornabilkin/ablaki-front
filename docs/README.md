# Документация frontend

Сверено 19 ноября 2026. Прикладной пакет frontend `08298ca` опубликован 7 ноября, прошли 513 тестов и сборка. [Отчёт о выпуске](https://github.com/fedornabilkin/ablaki/blob/master/docs/plan/done/2026-11-07-full-package-release.md) · [Активные планы](plan/README.md)

| Раздел | Содержание |
| --- | --- |
| [plan](plan/README.md) | Активные задачи; [done](plan/done/) — полностью выполненные пакеты. |
| [reference](reference/) | Страницы и интеграция с API. |
| [operations](operations/) | Сборка, публикация и эксплуатация. |
| [reports](reports/) | Исторические отчёты проверок. |

## Текущий интерфейс

- В опубликованном пакете 7 ноября сохранена мастерская мира и удалён неиспользуемый демонстрационный крафт. [Состав крафта](reference/crafting-world.md)

- [Приёмка 4 ноября](plan/done/2026-11-04-world-acceptance-navigation.md): состав и ссылки рецептов, цветовые состояния, каталоги по сторонам карты, поповер покупки, своя стоянка и автоматический прогресс.

- [Единообразие и Mobile First](operations/2026-10-30-interface-consistency.md): общие шапки, панели, заголовки, окна и предметы; отчёты 2–3 ноября содержат актуальную проверку и ссылки на CI.
- [Шапка и выращивание](plan/done/2026-11-03-world-actions-cultivation.md): видимые задания/чеклист/персонаж, бейдж остатка, показатели финансов, выделение построек и явные этапы полива.
- [Крафт](plan/done/2026-11-01-craft-command-recovery.md) и [склад](plan/done/2026-11-01-warehouse-transfer.md): исправления опубликованы.
- [Чеклист MVP](operations/world-mvp-checklist.md): автоматические/ручные отметки, комментарии, localStorage и экспорт JSON; доступен в опубликованном интерфейсе.
- [Тесты frontend](operations/frontend-tests-2026-10-30.md) и [выбор выкладки](plan/done/2026-11-02-release-optimization.md): полный набор перед production, без пересборки приложения для одной документации.

## Оставшиеся проверки

Маршруты интерфейса и экономики объединены в B1/B2 ручной приёмки. Открыты общий проход двух игроков с реальным API на четырёх ширинах, клавиатурная проверка и экспорт отчёта. [План приёмки](plan/2026-10-29-manual-ui-acceptance.md)

[Общий план](https://github.com/fedornabilkin/ablaki/blob/master/docs/plan/2026-10-21-mvp-launch-readiness.md) относится к приёмке и эксплуатации уже включённого production. [Сквозные сроки выкладки](https://github.com/fedornabilkin/ablaki/blob/master/docs/plan/2026-10-19-test-deployment-optimization.md) пока не подтверждены серией десяти выпусков.

## Контракты и развитие

- [Общие запросы API](reference/api-reads.md), [контракт мира](https://github.com/fedornabilkin/ablaki/blob/master/docs/architecture/simple-world-api.md), [экономика](https://github.com/fedornabilkin/ablaki/blob/master/docs/architecture/economy-runtime-api.md), [выращивание](https://github.com/fedornabilkin/ablaki/blob/master/docs/architecture/world-cultivation-states.md).
- [Публикация frontend](operations/deployment-github-vps.md), [дорожная карта мира](plan/2026-09-26-world-frontend.md), [рынок](plan/2026-10-16-world-market-ui.md), [исходные ТЗ](https://github.com/fedornabilkin/ablaki/blob/master/docs/tz/README.md).
- [Сверка 19 ноября и объединённая приёмка](plan/README.md#объединённая-приёмка), [предыдущая сверка](plan/done/2026-10-29-plan-refresh.md).

Временные результаты, снимки и логи хранятся в общей `../temp/<задача>/`, вне Git. Датированные числа тестов в старых отчётах описывают соответствующий выпуск, а не текущую версию.
