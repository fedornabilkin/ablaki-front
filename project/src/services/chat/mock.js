import config from "@/config/config";
import {IN, STATUS, ALLOWED_REACTIONS} from "./protocol";

const STORAGE_KEY = 'ablakin_chat_mock_v1';
const BOT_REPLY_MIN_MS = 700;
const BOT_REPLY_MAX_MS = 1800;
const BOT_TYPING_DELAY_MS = 300;

const ME = () => {
    try {
        const raw = JSON.parse(localStorage.getItem('vuex') || '{}');
        const u = raw?.auth?.user;
        if (u && u.username) return {id: u.id ?? 1, username: u.username};
    } catch (e) { /* ignore */ }
    return {id: 1, username: 'Я'};
};

const BOTS = [
    {id: 1001, username: 'Бот', kind: 'echo'},
    {id: 1002, username: 'Орёл', kind: 'random'},
    {id: 1003, username: 'Гость', kind: 'idle'},
];

const RANDOM_REPLIES = [
    'Понял!',
    'Хорошая мысль.',
    'А я думал, что-то ещё.',
    'Кто-то ставил кредиты сегодня?',
    'Согласен.',
    'Не уверен, что это сработает.',
    'Может, сыграем в орла-решку?',
    'Заходи в Сапёр, там новая партия.',
    'Сегодня хорошее утро для биржи.',
    'Бывает.',
];

export const isMockMode = () => {
    const url = config.getParam('wsUrl');
    return !url || url === 'mock' || url.startsWith('mock:');
};

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const nowSec = () => Math.floor(Date.now() / 1000);

class MockBackend {
    constructor() {
        this.state = this._loadOrSeed();
        this.subscribers = new Set();
        this.typingTimers = {};
    }

    _loadOrSeed() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.rooms && parsed.messagesByRoom) return parsed;
            }
        } catch (e) { /* ignore */ }
        return this._seed();
    }

    _seed() {
        const t = nowSec();
        const rooms = [
            {id: 1, name: 'Общий', owner_id: 1001, is_private: false, is_channel: false, members_count: 4, last_message_at: t},
            {id: 2, name: 'Игры', owner_id: 1002, is_private: false, is_channel: false, members_count: 3, last_message_at: t},
            {id: 3, name: 'Объявления', owner_id: 1001, is_private: false, is_channel: true, members_count: 4, last_message_at: t},
        ];
        const messagesByRoom = {
            1: [
                {id: 11, room_id: 1, user_id: 1001, user: {id: 1001, username: 'Бот'}, text: 'Добро пожаловать в чат!', created_at: t - 600, reactions: {}},
                {id: 12, room_id: 1, user_id: 1002, user: {id: 1002, username: 'Орёл'}, text: 'Кто-нибудь играет в орла-решку?', created_at: t - 300, reactions: {'👍': [1001]}},
            ],
            2: [
                {id: 21, room_id: 2, user_id: 1002, user: {id: 1002, username: 'Орёл'}, text: 'Тут обсуждаем игры. Велкам.', created_at: t - 1200, reactions: {}},
            ],
            3: [
                {id: 31, room_id: 3, user_id: 1001, user: {id: 1001, username: 'Бот'}, text: 'Канал «Объявления» — пишут только админы.', created_at: t - 86400, reactions: {}},
            ],
        };
        const membersByRoom = {
            1: BOTS.map(b => ({id: b.id, username: b.username})),
            2: BOTS.slice(0, 2).map(b => ({id: b.id, username: b.username})),
            3: BOTS.map(b => ({id: b.id, username: b.username})),
        };
        return {
            rooms,
            messagesByRoom,
            membersByRoom,
            reactions: {},
            adminIds: {1: [1001], 2: [1002], 3: [1001]},
            nextRoomId: 4,
            nextMessageId: 100,
        };
    }

    _persist() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state)); }
        catch (e) { /* ignore */ }
    }

    _ensureMember(roomId, user) {
        const list = this.state.membersByRoom[roomId] || (this.state.membersByRoom[roomId] = []);
        if (!list.some(u => u.id === user.id)) list.push(user);
    }

    subscribe(fn) {
        this.subscribers.add(fn);
        return () => this.subscribers.delete(fn);
    }

    _emit(type, payload) {
        for (const fn of this.subscribers) {
            try { fn(type, payload); } catch (e) { /* ignore */ }
        }
    }

    // ---- REST surface ----

    wsToken() {
        return Promise.resolve({token: 'mock-token'});
    }

    listRooms() {
        return Promise.resolve({list: this.state.rooms.slice(), count: this.state.rooms.length});
    }

    viewRoom(id) {
        const r = this.state.rooms.find(r => r.id === Number(id));
        return r ? Promise.resolve(r) : Promise.reject({errors: {id: 'not found'}});
    }

    createRoom({name, is_private = false, password = null, is_channel = false}) {
        const me = ME();
        const id = this.state.nextRoomId++;
        const room = {
            id,
            name: name || `Комната ${id}`,
            owner_id: me.id,
            is_private,
            is_channel,
            members_count: 1,
            last_message_at: nowSec(),
            _password: is_private ? password : null,
        };
        this.state.rooms.unshift(room);
        this.state.messagesByRoom[id] = [];
        this.state.membersByRoom[id] = [{id: me.id, username: me.username}];
        this.state.adminIds[id] = [me.id];
        this._persist();
        this._emit(IN.ROOMS_LIST, {rooms: this.state.rooms});
        return Promise.resolve(room);
    }

    deleteRoom(id) {
        this.state.rooms = this.state.rooms.filter(r => r.id !== Number(id));
        delete this.state.messagesByRoom[id];
        delete this.state.membersByRoom[id];
        delete this.state.adminIds[id];
        this._persist();
        this._emit(IN.ROOMS_LIST, {rooms: this.state.rooms});
        return Promise.resolve({ok: true});
    }

    joinRoom(id, password = null) {
        const room = this.state.rooms.find(r => r.id === Number(id));
        if (!room) return Promise.reject({errors: {id: 'not found'}});
        if (room.is_private && room._password && password !== room._password) {
            this._emit(IN.JOIN_ERROR, {room_id: id, message: 'Неверный пароль.'});
            return Promise.reject({errors: {password: 'wrong'}});
        }
        const me = ME();
        this._ensureMember(id, me);
        this._persist();
        const members = this.state.membersByRoom[id];
        const admins = this.state.adminIds[id] || [];
        this._emit(IN.ROOM_JOINED, {
            room_id: id,
            owner_id: room.owner_id,
            admin_ids: admins,
            is_channel: room.is_channel,
            is_private: room.is_private,
        });
        this._emit(IN.ROOM_USERS, {room_id: id, users: members.slice()});
        this._emit(IN.HISTORY, {room_id: id, messages: (this.state.messagesByRoom[id] || []).slice()});
        return Promise.resolve({ok: true});
    }

    leaveRoom(id) {
        const me = ME();
        const list = this.state.membersByRoom[id] || [];
        this.state.membersByRoom[id] = list.filter(u => u.id !== me.id);
        this._persist();
        this._emit(IN.ROOM_USERS, {room_id: id, users: this.state.membersByRoom[id]});
        return Promise.resolve({ok: true});
    }

    membersOf(id) {
        return Promise.resolve(this.state.membersByRoom[id] || []);
    }

    history(roomId, before = null, limit = 50) {
        const all = this.state.messagesByRoom[roomId] || [];
        let slice = all;
        if (before) {
            const idx = all.findIndex(m => m.id === Number(before));
            if (idx !== -1) slice = all.slice(0, idx);
        }
        return Promise.resolve(slice.slice(-limit));
    }

    createMessage(roomId, text, opts = {}) {
        const room = this.state.rooms.find(r => r.id === Number(roomId));
        if (!room) return Promise.reject({errors: {room_id: 'not found'}});
        const me = ME();

        if (room.is_channel) {
            const admins = this.state.adminIds[roomId] || [];
            const isAuthor = admins.includes(me.id) || room.owner_id === me.id;
            if (!isAuthor) {
                this._emit(IN.CHANNEL_READONLY, {room_id: roomId});
                return Promise.reject({errors: {channel: 'readonly'}});
            }
        }

        const id = this.state.nextMessageId++;
        const msg = {
            id,
            room_id: Number(roomId),
            user_id: opts.user?.id ?? me.id,
            user: opts.user ?? me,
            text,
            created_at: nowSec(),
            edited_at: 0,
            deleted_at: 0,
            reactions: {},
            client_id: opts.client_id ?? null,
        };
        (this.state.messagesByRoom[roomId] = this.state.messagesByRoom[roomId] || []).push(msg);
        room.last_message_at = msg.created_at;
        this._persist();
        this._emit(IN.MESSAGE, {message: msg});

        if (!opts.fromBot) this._scheduleBot(Number(roomId), text, me);
        return Promise.resolve(msg);
    }

    updateMessage(id, text) {
        const numId = Number(id);
        for (const roomId of Object.keys(this.state.messagesByRoom)) {
            const arr = this.state.messagesByRoom[roomId];
            const idx = arr.findIndex(m => m.id === numId);
            if (idx !== -1) {
                arr[idx].text = text;
                arr[idx].edited_at = nowSec();
                this._persist();
                this._emit(IN.MSG_EDITED, {message: arr[idx]});
                return Promise.resolve(arr[idx]);
            }
        }
        return Promise.reject({errors: {id: 'not found'}});
    }

    deleteMessage(id) {
        const numId = Number(id);
        for (const roomId of Object.keys(this.state.messagesByRoom)) {
            const arr = this.state.messagesByRoom[roomId];
            const idx = arr.findIndex(m => m.id === numId);
            if (idx !== -1) {
                arr[idx].deleted_at = nowSec();
                arr[idx].text = '';
                this._persist();
                this._emit(IN.MSG_DELETED, {room_id: Number(roomId), message_id: numId, deleted_at: arr[idx].deleted_at});
                return Promise.resolve({ok: true});
            }
        }
        return Promise.reject({errors: {id: 'not found'}});
    }

    react(messageId, emoji) {
        if (!ALLOWED_REACTIONS.includes(emoji)) return;
        const me = ME();
        const numId = Number(messageId);
        for (const roomId of Object.keys(this.state.messagesByRoom)) {
            const arr = this.state.messagesByRoom[roomId];
            const idx = arr.findIndex(m => m.id === numId);
            if (idx !== -1) {
                const r = arr[idx].reactions || (arr[idx].reactions = {});
                const list = r[emoji] || (r[emoji] = []);
                const p = list.indexOf(me.id);
                if (p === -1) list.push(me.id);
                else list.splice(p, 1);
                if (list.length === 0) delete r[emoji];
                this._persist();
                this._emit(IN.REACTION_UPDATE, {
                    room_id: Number(roomId),
                    message_id: numId,
                    reactions: arr[idx].reactions,
                });
                return;
            }
        }
    }

    markRead() {
        return Promise.resolve({ok: true});
    }

    _scheduleBot(roomId, text, me) {
        const room = this.state.rooms.find(r => r.id === roomId);
        if (!room || room.is_channel) return;
        const members = this.state.membersByRoom[roomId] || [];
        const bots = members.filter(u => u.id !== me.id && BOTS.some(b => b.id === u.id));
        if (bots.length === 0) return;
        const bot = pick(bots);
        const botCfg = BOTS.find(b => b.id === bot.id);
        if (!botCfg || botCfg.kind === 'idle') return;

        if (this.typingTimers[`${roomId}:${bot.id}`]) {
            clearTimeout(this.typingTimers[`${roomId}:${bot.id}`].typingTimer);
            clearTimeout(this.typingTimers[`${roomId}:${bot.id}`].replyTimer);
        }

        const typingTimer = setTimeout(() => {
            this._emit(IN.TYPING, {room_id: roomId, user: bot});
        }, BOT_TYPING_DELAY_MS);

        const replyDelay = randInt(BOT_REPLY_MIN_MS, BOT_REPLY_MAX_MS);
        const replyTimer = setTimeout(() => {
            this._emit(IN.TYPING_STOP, {room_id: roomId, user: bot});
            const replyText = botCfg.kind === 'echo'
                ? `${bot.username} услышал: «${text.slice(0, 80)}»`
                : pick(RANDOM_REPLIES);
            this.createMessage(roomId, replyText, {user: bot, fromBot: true}).catch(() => {});
            delete this.typingTimers[`${roomId}:${bot.id}`];
        }, replyDelay);

        this.typingTimers[`${roomId}:${bot.id}`] = {typingTimer, replyTimer};
    }

    reset() {
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
        this.state = this._seed();
        this._persist();
        this._emit(IN.ROOMS_LIST, {rooms: this.state.rooms});
    }
}

let backendSingleton = null;
export const getMockBackend = () => {
    if (!backendSingleton) backendSingleton = new MockBackend();
    return backendSingleton;
};

export class MockChatSocket {
    constructor() {
        this.backend = getMockBackend();
        this.status = STATUS.CLOSED;
        this.handlers = new Map();
        this.unsubscribe = null;
    }

    isEnabled() { return true; }

    on(event, fn) {
        if (!this.handlers.has(event)) this.handlers.set(event, new Set());
        this.handlers.get(event).add(fn);
        return () => this.off(event, fn);
    }

    off(event, fn) {
        this.handlers.get(event)?.delete(fn);
    }

    _emit(event, payload) {
        const set = this.handlers.get(event);
        if (!set) return;
        for (const fn of set) {
            try { fn(payload); } catch (e) { /* ignore */ }
        }
    }

    _setStatus(status) {
        if (this.status === status) return;
        this.status = status;
        this._emit('status', status);
    }

    connect() {
        if (!this.unsubscribe) {
            this.unsubscribe = this.backend.subscribe((type, payload) => {
                this._emit(type, payload);
                this._emit('*', {type, payload});
            });
        }
        setTimeout(() => {
            this._setStatus(STATUS.OPEN);
            this._emit(IN.ROOMS_LIST, {rooms: this.backend.state.rooms});
        }, 50);
    }

    disconnect() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        this._setStatus(STATUS.CLOSED);
    }

    send(type, payload = {}) {
        switch (type) {
            case 'join_room':
                this.backend.joinRoom(payload.room_id, payload.password).catch(() => {});
                return true;
            case 'leave_room':
                this.backend.leaveRoom(payload.room_id);
                return true;
            case 'message':
                this.backend.createMessage(payload.room_id, payload.text, {client_id: payload.client_id}).catch(() => {});
                return true;
            case 'edit_msg':
                this.backend.updateMessage(payload.message_id, payload.text).catch(() => {});
                return true;
            case 'delete_msg':
                this.backend.deleteMessage(payload.message_id).catch(() => {});
                return true;
            case 'react':
                this.backend.react(payload.message_id, payload.emoji);
                return true;
            case 'typing':
            case 'typing_stop':
            case 'read':
            case 'set_avatar':
            case 'promote':
            case 'demote':
            case 'ping':
                return true;
            default:
                return true;
        }
    }
}

// REST adapter for chat.js when in mock mode
export const mockApi = {
    room: {
        index: () => getMockBackend().listRooms(),
        my: () => getMockBackend().listRooms(),
        view: (id) => getMockBackend().viewRoom(id),
        create: (payload) => getMockBackend().createRoom(payload),
        delete: (id) => getMockBackend().deleteRoom(id),
        join: (id, password) => getMockBackend().joinRoom(id, password),
        leave: (id) => getMockBackend().leaveRoom(id),
        members: (id) => getMockBackend().membersOf(id),
    },
    message: {
        history: (roomId, before, limit) => getMockBackend().history(roomId, before, limit),
        view: () => Promise.reject({errors: {api: 'not implemented'}}),
        create: (roomId, text) => getMockBackend().createMessage(roomId, text),
        update: (id, text) => getMockBackend().updateMessage(id, text),
        delete: (id) => getMockBackend().deleteMessage(id),
        markRead: () => getMockBackend().markRead(),
    },
    auth: {
        wsToken: () => getMockBackend().wsToken(),
    },
};
