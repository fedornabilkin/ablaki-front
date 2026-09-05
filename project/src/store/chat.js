import {defineStore} from 'pinia';
import {getChatSocket} from '@/services/chat/socket';
import {IN, OUT, STATUS, make} from '@/services/chat/protocol';
import {roomApi, messageApi, chatAuthApi} from '@/services/api/chat';
import {ChatRoomBuilder, ChatMessageBuilder} from '@/entities/chat/builder';
import {UserBuilder} from '@/entities/user/builder';

const TYPING_THROTTLE_MS = 2_500;
const TYPING_STOP_DELAY_MS = 3_500;

const buildRooms = (raw = []) => {
    const b = new ChatRoomBuilder();
    b.createCollection(raw);
    return b.getCollection();
};

const buildMessages = (raw = []) => {
    const userBuilder = new UserBuilder();
    const b = new ChatMessageBuilder({userBuilder});
    b.createCollection(raw);
    return b.getCollection();
};

const buildSingleMessage = (data) => {
    const [m] = buildMessages([data]);
    return m;
};

export const useChatStore = defineStore('chat', {
    state: () => ({
        rooms: [],
        currentRoomId: null,
        messagesByRoom: {},
        usersByRoom: {},
        typingByRoom: {},
        unreadByRoom: {},
        roomMeta: {},
        connectionStatus: STATUS.CLOSED,
        bound: false,
        roomsLoading: false,
        historyLoading: {},
        lastTypingSentAt: {},
        typingStopTimers: {},
        pendingByRoom: {},
        notificationHandlers: {info: null, warning: null, error: null},
    }),

    getters: {
        currentRoom: (s) => s.rooms.find(r => r.getId() === s.currentRoomId) || null,
        currentMessages: (s) => s.currentRoomId ? (s.messagesByRoom[s.currentRoomId] || []) : [],
        currentUsers: (s) => s.currentRoomId ? (s.usersByRoom[s.currentRoomId] || []) : [],
        currentTyping: (s) => s.currentRoomId ? (s.typingByRoom[s.currentRoomId] || []) : [],
        isConnected: (s) => s.connectionStatus === STATUS.OPEN,
        isDisabled: (s) => s.connectionStatus === STATUS.DISABLED,
        totalUnread: (s) => Object.values(s.unreadByRoom).reduce((a, b) => a + b, 0),
        currentMeta: (s) => s.currentRoomId ? (s.roomMeta[s.currentRoomId] || {}) : {},
    },

    actions: {
        setNotifiers({info, warning, error} = {}) {
            this.notificationHandlers.info = info || null;
            this.notificationHandlers.warning = warning || null;
            this.notificationHandlers.error = error || null;
        },
        _notify(kind, payload) {
            const fn = this.notificationHandlers[kind];
            if (typeof fn === 'function') {
                try { fn(payload); } catch (e) { /* ignore */ }
            }
        },

        async connect() {
            const socket = getChatSocket();
            if (!socket.isEnabled()) {
                this.connectionStatus = STATUS.DISABLED;
                await this.loadRooms();
                return;
            }
            this._bind(socket);
            let token = null;
            try {
                const res = await chatAuthApi.wsToken();
                token = res?.token || null;
            } catch (e) {
                // REST может быть недоступен; пытаемся подключиться без токена
            }
            socket.connect(token);
            await this.loadRooms();
        },

        disconnect() {
            const socket = getChatSocket();
            socket.disconnect();
        },

        _bind(socket) {
            if (this.bound) return;
            this.bound = true;

            socket.on('status', (s) => { this.connectionStatus = s; });

            socket.on(IN.ROOMS_LIST, (payload) => {
                const list = payload?.rooms ?? payload ?? [];
                this.rooms = buildRooms(list);
                for (const r of this.rooms) {
                    if (typeof r.unread === 'number') this.unreadByRoom[r.getId()] = r.unread;
                }
            });

            socket.on(IN.ROOM_JOINED, (payload) => {
                const roomId = payload?.room_id;
                if (!roomId) return;
                this.roomMeta[roomId] = {
                    owner_id: payload.owner_id ?? null,
                    admin_ids: payload.admin_ids ?? [],
                    is_channel: !!payload.is_channel,
                    is_private: !!payload.is_private,
                };
            });

            socket.on(IN.ROOM_USERS, (payload) => {
                const roomId = payload?.room_id;
                if (!roomId) return;
                this.usersByRoom[roomId] = payload.users ?? [];
            });

            socket.on(IN.HISTORY, (payload) => {
                const roomId = payload?.room_id;
                if (!roomId) return;
                const items = buildMessages(payload.messages ?? []);
                const existing = this.messagesByRoom[roomId] || [];
                const seen = new Set(existing.map(m => m.id));
                const merged = [...items.filter(m => !seen.has(m.id)), ...existing];
                merged.sort((a, b) => a.id - b.id);
                this.messagesByRoom[roomId] = merged;
            });

            socket.on(IN.MESSAGE, (payload) => {
                const raw = payload?.message ?? payload;
                if (!raw || !raw.room_id) return;
                const msg = buildSingleMessage(raw);
                const arr = this.messagesByRoom[msg.room_id] || [];
                const clientId = raw.client_id;
                if (clientId) {
                    const idx = arr.findIndex(m => m.pending && m._client_id === clientId);
                    if (idx !== -1) {
                        arr.splice(idx, 1, msg);
                        this.messagesByRoom[msg.room_id] = arr;
                        return;
                    }
                }
                arr.push(msg);
                this.messagesByRoom[msg.room_id] = arr;

                if (msg.room_id !== this.currentRoomId) {
                    this.unreadByRoom[msg.room_id] = (this.unreadByRoom[msg.room_id] || 0) + 1;
                    this._notify('info', {
                        title: 'Новое сообщение',
                        content: msg.getText().slice(0, 80) || '...',
                    });
                }
            });

            socket.on(IN.MSG_EDITED, (payload) => {
                const raw = payload?.message ?? payload;
                if (!raw || !raw.room_id || !raw.id) return;
                const arr = this.messagesByRoom[raw.room_id];
                if (!arr) return;
                const idx = arr.findIndex(m => m.id === raw.id);
                if (idx !== -1) arr.splice(idx, 1, buildSingleMessage(raw));
            });

            socket.on(IN.MSG_DELETED, (payload) => {
                const roomId = payload?.room_id;
                const messageId = payload?.message_id;
                if (!roomId || !messageId) return;
                const arr = this.messagesByRoom[roomId];
                if (!arr) return;
                const idx = arr.findIndex(m => m.id === messageId);
                if (idx !== -1) {
                    const m = arr[idx];
                    m.deleted_at = payload.deleted_at || Math.floor(Date.now() / 1000);
                    arr.splice(idx, 1, m);
                }
            });

            socket.on(IN.REACTION_UPDATE, (payload) => {
                const {room_id, message_id, reactions} = payload || {};
                if (!room_id || !message_id) return;
                const arr = this.messagesByRoom[room_id];
                if (!arr) return;
                const idx = arr.findIndex(m => m.id === message_id);
                if (idx !== -1) {
                    arr[idx].reactions = reactions || {};
                    arr.splice(idx, 1, arr[idx]);
                }
            });

            socket.on(IN.TYPING, (payload) => {
                const {room_id, user} = payload || {};
                if (!room_id || !user) return;
                const list = this.typingByRoom[room_id] || [];
                if (!list.some(u => u.id === user.id)) {
                    this.typingByRoom[room_id] = [...list, user];
                }
            });

            socket.on(IN.TYPING_STOP, (payload) => {
                const {room_id, user} = payload || {};
                if (!room_id || !user) return;
                const list = this.typingByRoom[room_id] || [];
                this.typingByRoom[room_id] = list.filter(u => u.id !== user.id);
            });

            socket.on(IN.ROOM_ACTIVITY, (payload) => {
                const roomId = payload?.room_id;
                if (!roomId || roomId === this.currentRoomId) return;
                this.unreadByRoom[roomId] = (this.unreadByRoom[roomId] || 0) + 1;
            });

            socket.on(IN.JOIN_ERROR, (payload) => {
                this._notify('error', {
                    title: 'Не удалось войти в комнату',
                    content: payload?.message || 'Проверьте пароль или права доступа.',
                });
            });

            socket.on(IN.CHANNEL_READONLY, () => {
                this._notify('warning', {
                    title: 'Канал только для чтения',
                    content: 'Только владелец и админы могут писать в этот канал.',
                });
            });

            socket.on(IN.SYSTEM, (payload) => {
                this._notify('info', {
                    title: 'Система',
                    content: payload?.message || '',
                });
            });
        },

        async loadRooms() {
            this.roomsLoading = true;
            try {
                const res = await roomApi.index();
                const list = res?.list ?? res ?? [];
                this.rooms = buildRooms(list);
            } catch (e) {
                if (this.rooms.length === 0) this.rooms = [];
            } finally {
                this.roomsLoading = false;
            }
        },

        async joinRoom(roomId, password = null) {
            const id = Number(roomId);
            if (!id) return;
            this.currentRoomId = id;
            this.unreadByRoom[id] = 0;
            const socket = getChatSocket();
            if (socket.status === STATUS.OPEN) {
                socket.send(...Object.values(make.joinRoom(id, password)));
            }
            if (!this.messagesByRoom[id] || this.messagesByRoom[id].length === 0) {
                await this.loadHistory(id);
            }
            this.markRead(id);
        },

        async loadHistory(roomId, before = null) {
            const id = Number(roomId);
            if (!id) return;
            if (this.historyLoading[id]) return;
            this.historyLoading[id] = true;
            try {
                const data = await messageApi.history(id, before);
                const items = buildMessages(data || []);
                const existing = this.messagesByRoom[id] || [];
                const seen = new Set(existing.map(m => m.id));
                const merged = [...items.filter(m => !seen.has(m.id)), ...existing];
                merged.sort((a, b) => a.id - b.id);
                this.messagesByRoom[id] = merged;
            } catch (e) {
                /* swallow; пустая история */
            } finally {
                this.historyLoading[id] = false;
            }
        },

        async createRoom(payload) {
            const created = await roomApi.create(payload);
            await this.loadRooms();
            if (created?.id) {
                await this.joinRoom(created.id, payload.password);
            }
            return created;
        },

        async sendMessage(text) {
            const roomId = this.currentRoomId;
            if (!roomId || !text || !text.trim()) return;
            const clientId = `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const optimistic = buildSingleMessage({
                id: -Date.now(),
                room_id: roomId,
                text,
                created_at: Math.floor(Date.now() / 1000),
                pending: true,
            });
            optimistic._client_id = clientId;
            const arr = this.messagesByRoom[roomId] || [];
            arr.push(optimistic);
            this.messagesByRoom[roomId] = arr;

            const socket = getChatSocket();
            const envelope = make.message(roomId, text, clientId);
            const sent = socket.send(envelope.type, envelope.payload);
            if (!sent) {
                try {
                    const created = await messageApi.create(roomId, text);
                    const real = buildSingleMessage(created);
                    const cur = this.messagesByRoom[roomId];
                    const idx = cur.findIndex(m => m._client_id === clientId);
                    if (idx !== -1) cur.splice(idx, 1, real);
                } catch (e) {
                    const cur = this.messagesByRoom[roomId];
                    const idx = cur.findIndex(m => m._client_id === clientId);
                    if (idx !== -1) {
                        cur[idx].failed = true;
                        cur[idx].pending = false;
                        cur.splice(idx, 1, cur[idx]);
                    }
                    this._notify('error', {
                        title: 'Не удалось отправить',
                        content: 'Сообщение не доставлено. Попробуйте ещё раз.',
                    });
                }
            }
        },

        react(messageId, emoji) {
            const socket = getChatSocket();
            const envelope = make.react(messageId, emoji);
            socket.send(envelope.type, envelope.payload);
        },

        editMessage(messageId, text) {
            const socket = getChatSocket();
            const envelope = make.edit(messageId, text);
            socket.send(envelope.type, envelope.payload);
        },

        async deleteMessage(messageId) {
            const socket = getChatSocket();
            const envelope = make.delete(messageId);
            const sent = socket.send(envelope.type, envelope.payload);
            if (!sent) {
                try { await messageApi.delete(messageId); }
                catch (e) { /* ignore */ }
            }
        },

        notifyTyping() {
            const roomId = this.currentRoomId;
            if (!roomId) return;
            const now = Date.now();
            const last = this.lastTypingSentAt[roomId] || 0;
            if (now - last > TYPING_THROTTLE_MS) {
                this.lastTypingSentAt[roomId] = now;
                const socket = getChatSocket();
                const envelope = make.typing(roomId);
                socket.send(envelope.type, envelope.payload);
            }
            if (this.typingStopTimers[roomId]) clearTimeout(this.typingStopTimers[roomId]);
            this.typingStopTimers[roomId] = setTimeout(() => this.notifyTypingStop(), TYPING_STOP_DELAY_MS);
        },

        notifyTypingStop() {
            const roomId = this.currentRoomId;
            if (!roomId) return;
            if (this.typingStopTimers[roomId]) {
                clearTimeout(this.typingStopTimers[roomId]);
                this.typingStopTimers[roomId] = null;
            }
            this.lastTypingSentAt[roomId] = 0;
            const socket = getChatSocket();
            const envelope = make.typingStop(roomId);
            socket.send(envelope.type, envelope.payload);
        },

        markRead(roomId) {
            const id = Number(roomId);
            if (!id) return;
            this.unreadByRoom[id] = 0;
            const arr = this.messagesByRoom[id] || [];
            const last = arr.length ? arr[arr.length - 1].id : null;
            if (!last) return;
            const socket = getChatSocket();
            const envelope = make.read(id, last);
            socket.send(envelope.type, envelope.payload);
            messageApi.markRead(id, last).catch(() => {});
        },
    },
});
