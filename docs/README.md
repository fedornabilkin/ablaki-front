# Документация frontend

Актуальное состояние и ближайшие действия: **[планы](plan/README.md)**. Реализация текущего MVP и автоматические проверки готовы; остаётся ручная приёмка двух участников.

| Раздел | Содержание |
| --- | --- |
| [plan](plan/README.md) | Действующие планы; [done](plan/done/) — завершённые пакеты. |
| [reference](reference/) | Страницы и интеграция с API. |
| [operations](operations/) | Сборка, публикация и эксплуатация. |
| [reports](reports/) | Исторические отчёты проверок. |

## Текущий этап

- [Локальный чеклист MVP](operations/world-mvp-checklist.md): 21 пункт, автоматические/ручные отметки, комментарии, localStorage и JSON-отчёт. Установлен локально; test этим изменением не обновлялся.
- [Ручная приёмка](plan/2026-10-29-manual-ui-acceptance.md), [UI](plan/2026-10-15-world-closed-test-ui.md), [CONUI](plan/2026-10-16-world-economy-content-ui.md).
- [Общий план запуска](../../back/docs/plan/2026-10-21-mvp-launch-readiness.md): существующая локальная БД, два пользователя, время 1:1, затем отдельная production-активация.
- [Быстрая выкладка](../../back/docs/operations/fast-test-release-2026-10-26.md) реализована; [десять замеров и полный предел](../../back/docs/plan/2026-10-19-test-deployment-optimization.md) пока открыты.

## Инструкции и развитие

- [Выкладка frontend](operations/deployment-github-vps.md), [контракт мира](../../back/docs/architecture/simple-world-api.md) и [экономики](../../back/docs/architecture/economy-runtime-api.md).
- [Дорожная карта мира](plan/2026-09-26-world-frontend.md), [следующий этап рынка](plan/2026-10-16-world-market-ui.md), [исходные ТЗ](../../back/docs/tz/README.md).
- [Итог актуализации](plan/done/2026-10-29-plan-refresh.md).

Проверка кода 29 октября: 404 теста и production-сборка. Визуальная приёмка отмечается только после фактического прохождения. Временные результаты сохраняются в общей `../temp/<задача>/`, вне Git.
