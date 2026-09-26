# План: миграция UI с element-plus и bootstrap на Naive UI

## Контекст

В проекте сейчас используется две UI-библиотеки:

- **element-plus** — основная: 181 использование в 27 `.vue`-файлах, подключён в `src/main.js`, SCSS-темы и кастомизации в `src/index.scss`, иконки `@element-plus/icons-vue` регистрируются глобально.
- **bootstrap** + **bootstrap-vue-3** — фактически не используются как Vue-компоненты (теги `b-*` встречаются только в `src/components/pages/user/Registration_old.vue`, который не подключён к роутеру). Остался лишь CSS-фреймворк bootstrap — классы `container`, `list-group`, `list-group-item` в navbar и пр.

Цель — заменить оба на [Naive UI](https://www.naiveui.com/) (Vue 3, TypeScript-friendly, без CSS-фреймворка).

## Принципы

- Пункты `а.1` и `а.2` — подготовка, выполняются один раз до миграции компонентов.
- Пункты `а.3`–`а.28` (миграция компонентов) **атомарны и независимы**: каждый файл переписывается отдельно, старые библиотеки остаются установлены, поэтому немигрированные компоненты продолжают работать. Можно выполнять в любом порядке и остановиться в любой момент.
- Финальная группа `а.29`–`а.34` (очистка) выполняется **только после того, как все компоненты мигрированы**.
- Проверка после каждого пункта: открыть страницу с этим компонентом на `http://localhost:5173` и убедиться, что UI отрисовался и работает.

## Политика иконок

Единственный источник иконок — **Font Awesome** (`@fortawesome/free-solid-svg-icons` через `<font-awesome-icon>`). Регистрация — в `src/fontawesome.js` (массив `myIcons`); если в мигрируемом компоненте нужна новая иконка — добавлять её туда же. Иконки `@element-plus/icons-vue` и наборы `@vicons/*` **не используются**. В Naive UI слоты `#icon` (например, у `n-button`, `n-input`, `n-tag`) заполнять `<font-awesome-icon :icon="..."/>`. Это правило действует и для каждого пункта миграции `а.3`–`а.28`.

## Подготовка

- [x] **а.1** — Установить Naive UI: `npm i naive-ui` в `frontend/project/`. Иконочные пакеты Naive (`@vicons/*`) **не ставить** — иконки только из уже подключённого Font Awesome.
- [x] **а.2** — Обернуть приложение провайдерами Naive UI. В `src/App.vue` (или создать `src/components/NaiveProviders.vue`) обернуть `<router-view>` в `<n-config-provider>` + `<n-message-provider>` + `<n-dialog-provider>` + `<n-notification-provider>` + `<n-loading-bar-provider>`. Это даст глобальный API `useMessage()`, `useDialog()`, `useNotification()` взамен `ElMessage`, `ElMessageBox`, `ElNotification`.

## Миграция компонентов

Для каждого файла: заменить теги `el-*` на эквиваленты `n-*`, обновить импорты в `<script>` (если используются `ElMessage`, `ElNotification` и т.п. — заменить на `useMessage()`/`useNotification()` из `naive-ui`), при необходимости заменить bootstrap-классы (`container`, `row`, `col-*`, `list-group*`) на нативную вёрстку или `<n-grid>`/`<n-list>`. Любые иконки в шаблоне переводить на `<font-awesome-icon :icon="..."/>` согласно политике иконок выше; недостающие имена добавлять в `src/fontawesome.js`.

- [x] **а.3** — `src/components/PageHeader.vue` (1 `el-*` + bootstrap-классы).
- [x] **а.4** — `src/components/filter/Filter.vue` (6 `el-*`).
- [x] **а.5** — `src/components/navbar/NavBar.vue` (4 `el-*` + bootstrap-классы).
- [x] **а.6** — `src/components/navbar/SideBar.vue` (3 `el-*` + bootstrap-классы).
- [x] **а.7** — `src/components/navbar/UserAccounts.vue` (13 `el-*` + bootstrap-классы).
- [x] **а.8** — `src/components/navbar/UserBar.vue` (4 `el-*`).
- [x] **а.9** — `src/components/pages/Main.vue` (1 `el-*`).
- [x] **а.10** — `src/components/pages/PageNotFound.vue` (4 `el-*`).
- [x] **а.11** — `src/components/pages/forum/Forum.vue` (17 `el-*`).
- [x] **а.12** — `src/components/pages/forum/Read.vue` (10 `el-*`).
- [x] **а.13** — `src/components/pages/games/CreateGame.vue` (6 `el-*`).
- [x] **а.14** — `src/components/pages/games/Orel/GameFilter.vue` (6 `el-*`).
- [x] **а.15** — `src/components/pages/games/Orel/GamesList.vue` (9 `el-*` + bootstrap-классы).
- [x] **а.16** — `src/components/pages/games/Orel/MyGamesPage.vue` (1 `el-*`).
- [x] **а.17** — `src/components/pages/games/Orel/Orel.vue` (1 `el-*`).
- [x] **а.18** — `src/components/pages/games/saper/PlayGame.vue` (3 `el-*`).
- [x] **а.19** — `src/components/pages/games/saper/Saper.vue` (7 `el-*`).
- [x] **а.20** — `src/components/pages/user/Exchange/Exchange.vue` (1 `el-*`).
- [x] **а.21** — `src/components/pages/user/Exchange/MyOrdersPage.vue` (6 `el-*`).
- [x] **а.22** — `src/components/pages/user/Exchange/NewOrder.vue` (23 `el-*`).
- [x] **а.23** — `src/components/pages/user/Exchange/OrdersHistoryPage.vue` (3 `el-*`).
- [x] **а.24** — `src/components/pages/user/Exchange/OrdersList.vue` (5 `el-*`).
- [x] **а.25** — `src/components/pages/user/Exchange/OrdersPage.vue` (8 `el-*`).
- [x] **а.26** — `src/components/pages/user/Login.vue` (9 `el-*`).
- [x] **а.27** — `src/components/pages/user/Registration.vue` (23 `el-*`).
- [x] **а.28** — `src/components/pages/user/Wall.vue` (3 `el-*`).

## Очистка (только после полной миграции компонентов)

- [x] **а.29** — `src/index.scss`: убрать `@forward 'element-plus/theme-chalk/src/common/var.scss' ...`, `@use "element-plus/theme-chalk/src/index.scss"`, `@import "bootstrap"`. Удалить все правила `.el-*` (`.el-notification__content`, `.el-form--label-top`, `.el-input-number`, `.el-dialog`) и `.list-group*` (или переписать под Naive). Цвет primary `#33a004` перенесён в тему `n-config-provider :theme-overrides` (а.2).
- [x] **а.30** — `src/main.js`: убрать импорты `element-plus/dist/index.css`, `bootstrap/dist/css/bootstrap.min.css`, `ElementPlus`, `@element-plus/icons-vue` и блок регистрации `ElementPlusIconsVue`-компонентов; убрать `.use(ElementPlus)`. Иконки `font-awesome-icon` остаются как есть.
- [x] **а.31** — Удалить файл `src/plugins/bootstrap-vue.js` и компонент-приёмник `src/components/pages/user/Registration_old.vue` (он не подключён в `router.js`, единственный потребитель `b-*` тегов).
- [x] **а.32** — Прочесать `<style lang="scss">` в `.vue`-файлах и убрать локальные `@import "bootstrap/scss/..."` (точно есть в `src/components/navbar/SideBar.vue`: `functions`, `variables`, `mixins`; проверить остальные). Заменить использования миксинов/переменных на нативный CSS или собственные SCSS-переменные.
- [x] **а.33** — `vite.config.js`: в `build.rollupOptions.output.manualChunks` убрать `element-plus` из чанка `ui` и `@element-plus/icons-vue` из чанка `icons`. Если в `ui` ничего не осталось — удалить ключ целиком.
- [x] **а.34** — `package.json`: удалить из `dependencies` `element-plus`, `@element-plus/icons-vue`, `bootstrap`, `bootstrap-vue`, `bootstrap-vue-3`. Выполнить `npm install`, чтобы пересобрать lock-файл.

## Проверка после завершения

- `npm run dev` запускается без ошибок и ворнингов про ненайденные модули.
- `grep -r "element-plus\|bootstrap\|el-\|b-form\|b-modal" src/` ничего не находит (кроме разрешённых случаев).
- `grep -r "@vicons\|@element-plus/icons-vue\|ElementPlusIconsVue" src/` ничего не находит — иконки только Font Awesome.
- `npm run build` собирает production-бандл; бандл `ui`-чанка содержит только naive-ui.
- Все основные сценарии работают визуально: логин/регистрация, форум (список/чтение), игры (Орёл/Сапёр — список, фильтр, создание, игра), биржа (мои/история/создание ордера), профиль/стена.
