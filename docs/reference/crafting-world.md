# Действующий крафт мира

Аудит 7 ноября 2026. Изменения проверены локально, без публикации в test/production.

Изготовление в объекте находится в `WorldWorkspace.vue`; страницы инвентаря, рецептов, карты рецептов и истории используют `Workshop.vue` и общие компоненты `CraftInventory`, `CraftSlotGrid`, `CraftRoadmap`, `CraftRecipeDetail`. Сервисы `classicCraft.ts`, `useClassicCraft` и `useCampsiteCraft` остаются рабочими зависимостями. Название classic — историческое, а не признак отдельного старого движка.

На сервере используется `common/modules/world/modules/craft`. Админский каталог управляет этими же предметами и рецептами. Старый `v1/craft` — совместимая оболочка над модулем мира; перенаправление `/craft` на актуальный интерфейс сохранено.

Удалены только неиспользуемые файлы прежнего демо:

- `components/pages/craft/Craft.vue`, `CraftResultModal.vue`, `InventoryGrid.vue`, `ItemCard.vue`, `RecipeCard.vue`, `RecipeList.vue`;
- `components/pages/user/Exchange/MaterialsShop.vue` и его экспорт;
- `entities/craft/item.js`, `recipe.js`, `builder.js`;
- `services/api/craft.js`, `services/craft/mock.js`, `store/craft.js`;
- неиспользуемая настройка `craftMock` из `config/params.js`.

Проверено: 373 unit-теста, 6 сценариев `craftView.slow.test.ts`, сборка Vite и выбор рецепта в локальной авторизованной мастерской. Полный slow-набор не запускался; production в эту задачу не входит. Правила списания ресурсов, квоты, опыт и API-контракты не изменены.

[Общий отчёт об админке и серверном крафте](../../../back/docs/operations/admin-home-and-crafting.md).
