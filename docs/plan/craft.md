# План: интерфейс крафта на фронтенде (REST + in-memory мок)

## Контекст

На бэке крафта нет (модули `back/yii2/common/modules/` — только `exchange`, `forum`, `games`; никаких `item`/`recipe`/`inventory`/`craft` ни в моделях, ни в миграциях, ни в REST). План для бэка описан отдельно в `back/docs/plan/craft.md` (нумерация `д.*`).

Фронт делает полноценный UI, REST-слой по контракту бэк-плана и in-memory мок-движок по образцу чата (`src/services/chat/mock.js`). Контракт REST и in-memory **совпадают**: после реализации бэка переключение — изменение одной env-переменной, никаких правок UI не нужно.

Модель данных крафта (минимум для MVP):

- **Item** — предмет. Поля: `id, code, name, description, icon, category ('material'|'product'|'consumable'), rarity ('common'|'rare'|'epic')`.
- **Recipe** — рецепт. Поля: `id, name, description, output_item_id, output_qty, cost_credits, time_seconds (для будущего асинхрона; в MVP = 0, крафт мгновенный), category`.
- **RecipeIngredient** — связка `recipe_id, item_id, qty`.
- **InventoryEntry** — `user_id, item_id, qty` (на фронте — `{item, qty}`).

Один эндпоинт-действие: `POST /v1/craft-recipe/{id}/craft` — атомарно проверяет достаточность ингредиентов и кредитов, списывает, создаёт результат, возвращает обновлённый инвентарь и созданный предмет.

## Принципы

- Пункты `г.1`–`г.6` и `г.13`–`г.15` (entities, REST-обёртка, мок, конфиг) — **независимы между собой**, можно делать в любом порядке.
- Пункты `г.7` (стор) и `г.8`–`г.12` (компоненты) — зависят от `г.3`–`г.6` (контракты данных/REST) и `г.13`–`г.15` (мок-данные на старте). Иначе компоненты будут показывать пустоту.
- UI — Naive UI + FontAwesome (политика из `migrate-to-naive-ui.md`).
- Все строки — на русском.

## Подготовка

- [x] **г.1** — Добавить в `src/fontawesome.js` иконки для предметов: `faHammer`, `faTree`, `faCube`, `faLink`, `faScroll`, `faFire`, `faGem`, `faBullseye`, `faToolbox`. Иконка ссылки в NavBar — `faHammer`.
- [x] **г.2** — Конфиг режима. Никаких новых env: мок включается, если `VITE_API_URL` пуст ИЛИ задан `VITE_CRAFT_MOCK=1`. Прокинуть `craftMock: import.meta.env.VITE_CRAFT_MOCK === '1'` через `src/config/params.js`.

## Entities и builders

- [x] **г.3** — `src/entities/craft/item.js`: класс `Item extends MainEntity` (`id, code, name, description, icon, category, rarity`) + методы `getId()`, `getName()`, `getIcon()`, `isMaterial()`, `isProduct()`.
- [x] **г.4** — `src/entities/craft/recipe.js`: класс `Recipe extends MainEntity` (`id, name, description, output, output_qty, ingredients[], cost_credits, time_seconds, category`) + `canCraft(inventory, balance)` (чистая функция: возвращает `{ok, reason}`).
- [x] **г.5** — `src/entities/craft/builder.js`: `ItemBuilder`, `RecipeBuilder` (с инъекцией `itemBuilder` для сборки `output` и `ingredients[]` рекурсивно), `InventoryEntryBuilder`. Все по образцу `src/entities/forum/builder.js`.

## REST API service

- [x] **г.6** — `src/services/api/craft.js`: экспорты `itemApi.index()`, `recipeApi.{index, view}`, `inventoryApi.my()`, `craftApi.execute(recipeId)`. Каждая функция при `isCraftMockMode()` отдаёт `mockApi.*` (по аналогии с `src/services/api/chat.js`).

## Pinia-стор

- [x] **г.7** — `src/store/craft.js`: `useCraftStore` со state (`items`, `recipes`, `inventory`, `crafting` (id рецепта в работе), `loading`, `lastResult`) и actions (`load()`, `craft(recipeId)` с оптимистичной отметкой `crafting`, обновлением `lastResult` для модалки результата). Геттеры: `inventoryMap` (item.id → qty), `canCraftRecipe(recipe)`. Требует: г.5, г.6.

## Маршрут и навигация

- [x] **г.8** — `src/router.js`: маршрут `{ path: '/craft', component: Craft, meta: { requiresAuth: true } }`.
- [x] **г.9** — `src/components/navbar/NavBar.vue`: пункт «Крафт» рядом с «Чат», с иконкой `fa-hammer`. Условие `v-if="isAuthenticated"`.

## Страница и компоненты

- [x] **г.10** — `src/components/pages/craft/Craft.vue` (страница): двухколоночный mobile-first layout. Левая — `InventoryGrid`, правая — `RecipeList`. На мобиле — табы. В `onMounted` дёргает `craftStore.load()`. Подключает `CraftResultModal` для отображения результата успешного/неудачного крафта.
- [x] **г.11** — `src/components/pages/craft/InventoryGrid.vue`: сетка карточек `ItemCard`, отсортированных по категории затем имени. Пустое состояние — `n-empty`. Бейдж количества — поверх иконки.
- [x] **г.12** — `src/components/pages/craft/ItemCard.vue`: prop `item` + `qty`. Иконка через `font-awesome-icon`, имя, рамка цвета редкости (`common`/`rare`/`epic` — нейтральный/синий/фиолетовый), `n-tooltip` на наведение с описанием. Требует: г.3.
- [x] **г.13** — `src/components/pages/craft/RecipeList.vue`: список карточек `RecipeCard`. Фильтр-табы по `category`. Поиск по имени — `n-input`. Требует: г.4.
- [x] **г.14** — `src/components/pages/craft/RecipeCard.vue`: prop `recipe`. Слева — список ингредиентов (мини-иконки + `qty_have/qty_need`, красным если не хватает). Справа — `output` (иконка + имя × qty). Кнопка «Скрафтить» (`n-button type="primary"`, disabled если `canCraft = false`, loading если этот рецепт в работе). Стоимость в кредитах — мелкая строка под кнопкой. Требует: г.4, г.7.
- [x] **г.15** — `src/components/pages/craft/CraftResultModal.vue`: `n-modal` с результатом последнего крафта: «Готово! Получено: 1× Факел». Иконка предмета + конфетти-анимация (опционально CSS). Кнопка «Скрафтить ещё». При ошибке (нехватка ингредиентов из-за гонки) — `n-alert error` с причиной.

## In-memory мок

- [x] **г.16** — `src/services/craft/mock.js`: класс `CraftMockBackend` со state в `localStorage` под ключом `ablakin_craft_mock_v1`. Seed:
  - **Предметы**: материалы — Дерево, Камень, Верёвка, Ткань, Серебро; продукты — Факел, Корзина, Амулет, Лук.
  - **Стартовый инвентарь** пользователя: по 5 каждого материала, 0 продуктов.
  - **Рецепты**: Факел = 1× Дерево + 1× Ткань → 1× Факел; Корзина = 2× Дерево + 1× Верёвка → 1× Корзина; Амулет = 1× Серебро + 1× Верёвка + 1× Ткань → 1× Амулет; Лук = 3× Дерево + 1× Верёвка + 1× Камень → 1× Лук, cost_credits: 5.
  - Persist всего state в `localStorage`. Метод `reset()` для DevTools.
- [x] **г.17** — `isCraftMockMode()` экспортируется из `mock.js`: возвращает `true` при `params.craftMock === true` или отсутствии `apiDomain`. Используется в `src/services/api/craft.js` для подмены real → mock.
- [x] **г.18** — `mockApi.craft.execute(recipeId)`: проверяет инвентарь и (если задано) баланс кредитов; при недостатке — `Promise.reject({errors: {reason: 'не хватает …'}})`; при успехе — атомарно списывает ингредиенты, прибавляет результат, возвращает `{result_item, qty, inventory}`.

## Проверка

- [x] **г.19** — Smoke: `npm run dev`, открыть `/craft`. Проверить:
  - Сетка инвентаря показывает 5 материалов по 5 шт каждый;
  - Список из 4 рецептов; Факел и Корзина — «можно крафтить», Амулет и Лук — disabled (нет серебра / камня).
  - После клика «Скрафтить» Факел: модалка результата, инвентарь обновился (−1 Дерево, −1 Ткань, +1 Факел), Факел теперь виден среди продуктов в инвентаре.
  - После перезагрузки страницы инвентарь сохранён (`localStorage`).
  - `npm run build` собирается без ошибок.

## Переключение на боевой бэк

Когда модуль `common/modules/craft/` на бэке готов и REST-эндпоинты подняты:
1. Снять `VITE_CRAFT_MOCK=1` из `.env` (или вообще не задавать).
2. Очистить `localStorage.removeItem('ablakin_craft_mock_v2')`.
3. `npm run dev`. UI и стор не меняются — данные идут с бэка.

## Магазин материалов на бирже

- [x] **г.20** — Расширить набор материалов в `mock.js` (seed v2): добавить `Уголь`, `Палки`, `Железо`, `Пластик`, `Медь`, `Олово`, `Нить`, `Кожа` (плюс существующие `Дерево`, `Камень`, `Верёвка`, `Ткань`, `Серебро`). У каждого материала поле `price_credits` (цена за штуку). Бамп ключа `localStorage` → `ablakin_craft_mock_v2`, стартовый инвентарь пустой. Перебалансировать рецепты под новые материалы и добавить новые продукты (`Костёр`, `Меч`).
- [x] **г.21** — В сущности `Item` (`src/entities/craft/item.js`) и `ItemBuilder` добавить поле `price_credits`. Бэк-контракт: материалы возвращаются с этим полем.
- [x] **г.22** — REST: `src/services/api/craft.js` — экспорт `shopApi.{list, buy(itemId, qty)}`. Эндпоинты: `GET /v1/craft-shop`, `POST /v1/craft-shop/{id}/buy {qty}`. В мок-режиме отдаёт `mockApi.shop`.
- [x] **г.23** — Pinia-стор `src/store/craft.js`: новые state `shop`, `shopLoaded`, `buying`, `lastPurchase`; action `loadShop()`, `buyMaterial(itemId, qty)`. В моке списание кредитов делает стор через Vuex `auth/addCredit(-cost)` (с откатом при ошибке REST), в боевом бэке — атомарно сам эндпоинт `/buy` (стор только обновляет инвентарь из ответа).
- [x] **г.24** — Страница `src/components/pages/user/Exchange/MaterialsShop.vue`: сетка карточек материалов (иконка, имя, описание, в наличии, цена, поле количества `n-input-number`, кнопка «Купить за N Cr» с loading-состоянием). Показывает текущий баланс кредитов вверху. Использует `useMessage()` для тостов покупки/ошибки.
- [x] **г.25** — Маршрутизация: `MaterialsShop` экспортирован из `src/components/pages/user/Exchange/index.js`, в `router.js` добавлен child-роут `/exchange/shop`, в `Exchange.vue` — пункт `extraLinks` «Магазин» с иконкой `fa-cart-shopping`.
