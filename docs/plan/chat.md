# План: чат на фронтенде (на основе форума, через WebSocket)

## Контекст

Нужно сделать чат поверх существующего стека (Vue 3 + Naive UI + Pinia/Vuex + Vue Router 4 + axios + Pug + SCSS). За основу взяты:

- **Существующий форум** (`src/components/pages/forum/Forum.vue`, `Read.vue`, `src/entities/forum/*`, `src/services/api/forum.js`) — паттерн REST + сущности + builders + страница со списком и страница чтения с формой ввода.
- **Референсный репозиторий** [Andrewshpik/chat](https://github.com/Andrewshpik/chat): набор событий протокола (`join`/`join_room`/`message`/`typing`/`typing_stop`/`react`/`edit_msg`/`delete_msg`/`set_avatar`/`promote`/`demote` от клиента; `rooms_list`/`room_joined`/`room_users`/`history`/`message`/`reaction_update`/`msg_deleted`/`msg_edited`/`typing`/`typing_stop`/`room_activity`/`channel_readonly`/`join_error`/`system` от сервера), модель данных (комнаты, история до 1000 сообщений, реакции, owner/admin, channels).

Соглашение: реализация транспорта на фронте **не зависит** от выбора WS-технологии на бэке. Адрес WS-сервера приходит через `VITE_WS_URL`. Если бэк выберет Centrifugo/Socket.IO/raw WS — меняется только `src/services/chat/socket.js`, остальная фронт-кодовая база остаётся.

Если для работы чата нужны правки бэка — они описаны отдельно в `back/docs/plan/chat.md`. Текущий план эту работу **не** ведёт.

## Принципы

- Пункты `б.1`–`б.2` — конфиг/установка; нужны до пунктов кода, но между собой независимы.
- Пункты `б.3`–`б.24` (сущности, сервисы, store, страницы, компоненты) — **атомарные и независимые**: каждый файл — самостоятельный пункт. Зависимости между пунктами обозначены явно как «требует: …»; пока зависимость не выполнена, компонент-потребитель показывает заглушку.
- UI пишется на Naive UI и Font Awesome (политика после миграции в `migrate-to-naive-ui.md` действует и здесь — никаких `@vicons`/EP).
- Все строки — на русском (язык интерфейса в проекте `ru-RU`).
- Можно прервать работу в любой момент: уже сделанные компоненты подключатся к Pinia-стору, который в отсутствии соединения сам деградирует в read-only по REST.

## Режим in-memory (пока нет бэка)

- [x] **б.26** — In-memory чат-движок `src/services/chat/mock.js`: классы `MockBackend` (хранилище в `localStorage` под ключом `ablakin_chat_mock_v1`: rooms, messages, members, reactions, admins) и `MockChatSocket` (тот же интерфейс `connect/disconnect/send/on/off`, что у боевого `ChatSocket`). Также экспортирует `mockApi.{room,message,auth}` — адаптер с тем же контрактом, что `roomApi`/`messageApi`/`chatAuthApi`.
- [x] **б.27** — Маршрутизация в `src/services/chat/socket.js`: `getChatSocket()` возвращает `MockChatSocket` если `VITE_WS_URL` пуст или равен `mock`/начинается с `mock:`. В `src/services/api/chat.js` экспорты `roomApi`/`messageApi`/`chatAuthApi` тоже подменяются на `mockApi.*` в том же условии. Никаких изменений в `useChatStore` и компонентах не требуется.
- [x] **б.28** — Стартовый seed: 3 комнаты («Общий», «Игры», «Объявления»-канал), 3 бота-«юзера» (`Бот` — эхо-ответ, `Орёл` — случайные реплики, `Гость` — молчит), пара исторических сообщений и реакций. При создании новой комнаты — текущий юзер становится owner+admin.
- [x] **б.29** — Имитация удалённой стороны: на каждое сообщение в обычной (не channel) комнате выбирается случайный бот из состава, через 300мс эмитится `typing`, через 0.7–1.8с — `message` от бота. В канале попытка отправить → `IN.CHANNEL_READONLY` (если ты не owner/admin). Каналы соблюдают права; пароль приватной комнаты сверяется в `joinRoom`.
- [x] **б.30** — Конфиг по умолчанию: `VITE_WS_URL=mock` в `.env`/`.env-sample`. Для переключения на боевой бэк — поменять значение на реальный `ws://…`/`wss://…`. Сброс in-memory состояния — `localStorage.removeItem('ablakin_chat_mock_v1')` или `getMockBackend().reset()` в консоли.

## Подготовка

- [x] **б.1** — Установить транспортную библиотеку. По умолчанию — нативный `WebSocket` (без зависимостей). Если бэк выберет Centrifugo — `npm i centrifuge`; если Socket.IO — `npm i socket.io-client`. Решение фиксируется при выполнении пункта; до этого `б.7` опирается на нативный API.
- [x] **б.2** — Конфиг адреса WS. Добавить в `frontend/project/.env-sample` и `.env` переменную `VITE_WS_URL` (например, `ws://localhost:8088/connection/websocket` для Centrifugo или `ws://localhost:3185` для произвольного сервера). Пробросить её через `src/config/params.js` (`wsUrl: import.meta.env.VITE_WS_URL`) и `src/config/config.js` (`getParam('wsUrl')`) по аналогии с `apiDomain`.

## Сущности и builders

- [x] **б.3** — Файл `src/entities/chat/room.js`: класс `ChatRoom extends MainEntity` с полями `id, name, owner, last_message_at, members_count, is_private, channel, unread`, методами `getId()`, `getName()`, `isChannel()`, `isPrivate()`, `getUnread()`. По образцу `src/entities/forum/theme.js`.
- [x] **б.4** — Файл `src/entities/chat/message.js`: класс `ChatMessage extends MainEntity` с полями `id, room_id, author, text, created_at, edited_at, deleted, reactions` и методами `getId()`, `getText()`, `getAuthor()`, `isEdited()`, `isDeleted()`, `getReactions()`. По образцу `src/entities/forum/comment.js`.
- [x] **б.5** — Файл `src/entities/chat/builder.js`: `ChatRoomBuilder` и `ChatMessageBuilder extends MainBuilder` (с инъекцией `userBuilder` как у `ForumCommentBuilder`). Обрабатывают response от REST и от WS одинаково — сначала вызывают `super.build(data)`, затем собирают поля. Требует: б.3, б.4.

## REST API service (история, комнаты, оффлайн-фолбэк)

- [x] **б.6** — Файл `src/services/api/chat.js`: экспорт `roomApi` (`index(page)`, `view(id)`, `create({name, isPrivate, password, channel})`, `delete(id)`, `my(page)`) и `messageApi` (`history(roomId, beforeId, limit=50)`, `view(id)`). Структура и формат promise — как в `src/services/api/forum.js` (поля `res.data.errors`, `res.headers['x-pagination-total-count']`).

## WebSocket-клиент и протокол

- [x] **б.7** — Файл `src/services/chat/socket.js`: класс `ChatSocket` с методами `connect(token)`, `disconnect()`, `send(type, payload)`, `on(eventName, handler)`, `off`. Внутри — нативный `WebSocket`, очередь исходящих до момента `OPEN`, реконнект с экспоненциальным backoff (1с → 30с, jitter), heartbeat-пинг каждые 25с. Эмиттер событий — собственный (`Map<event, Set<handler>>`), без зависимостей. URL берётся из `config.getParam('wsUrl')`.
- [x] **б.8** — Файл `src/services/chat/protocol.js`: константы типов событий (исходящие `OUT = { JOIN, JOIN_ROOM, MESSAGE, TYPING, TYPING_STOP, REACT, EDIT_MSG, DELETE_MSG, SET_AVATAR, PROMOTE, DEMOTE }`, входящие `IN = { ROOMS_LIST, ROOM_JOINED, ROOM_USERS, HISTORY, MESSAGE, REACTION_UPDATE, MSG_DELETED, MSG_EDITED, TYPING, TYPING_STOP, ROOM_ACTIVITY, CHANNEL_READONLY, JOIN_ERROR, SYSTEM }`) и фабрики payload'ов (`makeJoin(username)`, `makeMessage(roomId, text)`, …). Один источник правды для протокола — упрощает рефакторинг при смене бэка.

## Store (Pinia)

- [x] **б.9** — Файл `src/store/chat.js`: Pinia-стор `useChatStore` со state (`rooms`, `currentRoomId`, `messagesByRoom`, `usersByRoom`, `typingByRoom`, `unreadByRoom`, `connectionStatus`, `pendingMessages`), геттерами (`currentRoom`, `currentMessages`, `currentUsers`, `isConnected`) и actions (`connect(token)`, `disconnect`, `joinRoom(id)`, `loadHistory(beforeId)`, `sendMessage(text)` с оптимистичным апдейтом и rollback при ошибке, `react(msgId, emoji)`, `editMessage(msgId, text)`, `deleteMessage(msgId)`, `notifyTyping()`/`notifyTypingStop()`, `markRead(roomId)`). Подписывается на события `ChatSocket` через `socket.on(IN.MESSAGE, ...)`. По договорённости проекта новые сторы — Pinia (Vuex остаётся только для `auth`/`menu`). Требует: б.5, б.7, б.8.

## Router и навигация

- [x] **б.10** — В `src/router.js` добавить маршруты `{ path: '/chat', component: Chat, meta: { requiresAuth: true } }` и `{ path: '/chat/:roomId', component: Chat, meta: { requiresAuth: true } }` (один и тот же компонент-страница, разная активная комната через `route.params.roomId`).
- [x] **б.11** — В `src/components/navbar/NavBar.vue` добавить ссылку «Чат» с `<font-awesome-icon icon='fa fa-comments'/>` (или новой `faComment` из FA-словаря; добавить в `src/fontawesome.js` при необходимости). Бейдж непрочитанных — `n-badge` поверх ссылки, значение `useChatStore().totalUnread`.

## Страницы и компоненты

Каждый компонент — отдельный файл, отдельный пункт. Все используют Naive UI и слот-/prop-API; не зависят друг от друга кроме явных «требует».

- [x] **б.12** — `src/components/pages/chat/Chat.vue` (страница): два-колоночный layout (mobile-first), левая колонка — `RoomsList`, правая — `ChatRoom`. На мобильных колонки переключаются (drawer/sheet через `n-drawer`). Подключается к `useChatStore`, вызывает `connect()` в `onMounted` и `disconnect()` в `onBeforeUnmount`. Требует: б.9.
- [x] **б.13** — `src/components/pages/chat/RoomsList.vue`: список комнат из стора (`n-list`), активная подсвечена; клик → `joinRoom(id)` + `router.push('/chat/' + id)`. Кнопка «+» открывает `RoomCreateModal`. Бейдж непрочитанных на каждой комнате (`n-badge`). Требует: б.9.
- [x] **б.14** — `src/components/pages/chat/RoomCreateModal.vue`: `n-modal preset="card"` с формой `n-form` (название, чекбокс «приватная», поле пароля, чекбокс «канал»). При сабмите вызывает `chatStore.createRoom(...)` через `roomApi.create`. Требует: б.6.
- [x] **б.15** — `src/components/pages/chat/ChatRoom.vue`: заголовок с именем комнаты и `UsersList`-кнопкой (на мобиле — открыть drawer), `MessagesStream`, `TypingIndicator`, `MessageInput`. На `currentRoomId === null` показывает плейсхолдер «Выберите комнату».
- [x] **б.16** — `src/components/pages/chat/MessagesStream.vue`: `<div>` с `flex-direction: column-reverse` (упрощает авто-скролл к низу), внутри — `v-for` по `currentMessages` рендерит `MessageItem`. При скролле наверх вызывает `loadHistory(beforeId)`. Использует `transition-group` для появления новых сообщений. Требует: б.9, б.17.
- [x] **б.17** — `src/components/pages/chat/MessageItem.vue`: одно сообщение (аватар через `n-avatar`, имя, бабл, timestamp, реакции в виде пилюль). Выравнивание по правому краю если `message.author.id === currentUser.id`. На hover — кнопки реакции/редактирования/удаления (`ReactionPicker`, `MessageContextMenu`). Состояния «удалено» (italic + opacity 0.6), «изменено» (suffix `(изменено)`). Требует: б.4, б.20, б.21.
- [x] **б.18** — `src/components/pages/chat/MessageInput.vue`: `n-input type="textarea"` с автосайзом, кнопка отправки (`n-button` с `font-awesome-icon icon='fa fa-arrow-right'`), submit по Enter (Shift+Enter — перенос). Debounced `notifyTyping()` пока пользователь печатает, `notifyTypingStop()` через 3с после последнего ввода или сразу при отправке. Если у комнаты `channel_readonly: true` и пользователь не owner/admin — поле скрыто, показывается алерт. Требует: б.9.
- [x] **б.19** — `src/components/pages/chat/TypingIndicator.vue`: анимация из трёх точек + строка «Иван, Пётр печатают…», `v-if="typingUsers.length > 0"`. Имена берёт из `chatStore.typingByRoom[currentRoomId]`. Требует: б.9.
- [x] **б.20** — `src/components/pages/chat/UsersList.vue`: правая панель (или `n-drawer` на мобиле), список участников с ролями (owner — корона, admin — звезда — FA `fa-crown`/`fa-star`). Клик по юзеру → `n-popover` с профилем (имя, рейтинг, кнопка «На стену»). Требует: б.9.
- [x] **б.21** — `src/components/pages/chat/ReactionPicker.vue`: горизонтальный ряд из 6 эмодзи `['👍', '❤️', '😂', '😮', '😢', '👎']` (то же множество, что в референсе). Клик → `chatStore.react(messageId, emoji)`. Эмодзи — нативные unicode-символы, не Font Awesome.
- [x] **б.22** — `src/components/pages/chat/MessageContextMenu.vue`: `n-dropdown` с пунктами «Изменить» (только автор) и «Удалить» (автор / owner / admin). Удаление через `n-popconfirm`. Требует: б.9.

## Глобальные интеграции

- [x] **б.23** — Уведомления о сообщениях в неактивной комнате. В `useChatStore.actions` при `IN.MESSAGE`, если `roomId !== currentRoomId`, инкрементить `unreadByRoom[roomId]` и вызывать `useMessage().info('Новое сообщение в …')` (короткий toast). При `room_activity` — только бейдж.
- [x] **б.24** — Системные события (`IN.SYSTEM`, `IN.JOIN_ERROR`, `IN.CHANNEL_READONLY`) маршрутизируются через `useNotification()` (warning/error). Один маленький мапинг event → notification type в `src/services/chat/socket.js` или в сторе — на выбор.

## Проверка

- [x] **б.25** — Smoke: запустить `npm run dev`, открыть `/chat` в двух разных браузерах (или режим инкогнито) под двумя логинами, проверить:
  - комнаты подгружаются из REST `roomApi.index()`;
  - подключение к WS успешно (`chatStore.isConnected === true`);
  - сообщения доставляются в реальном времени;
  - typing-индикатор появляется у второго пользователя;
  - реакции/edit/delete синхронизируются;
  - при разрыве сети ChatSocket переподключается, очередь pending уходит после ре-коннекта;
  - бейдж непрочитанных растёт у неактивной комнаты;
  - `npm run build` собирается без ошибок, ws-чанк не превышает разумных размеров.
