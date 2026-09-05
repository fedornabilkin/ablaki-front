import config from "@/config/config";
import {STATUS} from "./protocol";
import {isMockMode, MockChatSocket} from "./mock";

const PING_INTERVAL_MS = 25_000;
const PING_TIMEOUT_MS = 10_000;
const BACKOFF_MIN_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;
const BACKOFF_JITTER = 0.3;

export class ChatSocket {
    constructor() {
        this.url = config.getParam('wsUrl') || null;
        this.token = null;
        this.ws = null;
        this.status = this.url ? STATUS.CLOSED : STATUS.DISABLED;
        this.handlers = new Map();
        this.queue = [];
        this.reconnectAttempts = 0;
        this.reconnectTimer = null;
        this.pingTimer = null;
        this.pongTimer = null;
        this.shouldReconnect = false;
    }

    isEnabled() {
        return !!this.url;
    }

    on(event, fn) {
        if (!this.handlers.has(event)) this.handlers.set(event, new Set());
        this.handlers.get(event).add(fn);
        return () => this.off(event, fn);
    }

    off(event, fn) {
        this.handlers.get(event)?.delete(fn);
    }

    emit(event, payload) {
        const set = this.handlers.get(event);
        if (!set) return;
        for (const fn of set) {
            try {
                fn(payload);
            } catch (e) {
                console.error('[chat-socket] handler error', event, e);
            }
        }
    }

    connect(token = null) {
        if (!this.isEnabled()) {
            this.status = STATUS.DISABLED;
            this.emit('status', this.status);
            return;
        }
        this.token = token;
        this.shouldReconnect = true;
        this._open();
    }

    disconnect() {
        this.shouldReconnect = false;
        this._clearTimers();
        if (this.ws) {
            try { this.ws.close(1000, 'client disconnect'); } catch (e) { /* ignore */ }
            this.ws = null;
        }
        this._setStatus(STATUS.CLOSED);
    }

    send(type, payload = {}) {
        const envelope = {type, payload};
        if (this.status !== STATUS.OPEN || !this.ws) {
            this.queue.push(envelope);
            return false;
        }
        try {
            this.ws.send(JSON.stringify(envelope));
            return true;
        } catch (e) {
            this.queue.push(envelope);
            return false;
        }
    }

    _open() {
        if (!this.isEnabled()) return;
        this._setStatus(STATUS.CONNECTING);
        const url = this.token ? `${this.url}?token=${encodeURIComponent(this.token)}` : this.url;
        try {
            this.ws = new WebSocket(url);
        } catch (e) {
            this._scheduleReconnect();
            return;
        }

        this.ws.addEventListener('open', () => {
            this.reconnectAttempts = 0;
            this._setStatus(STATUS.OPEN);
            this._flush();
            this._startPing();
        });

        this.ws.addEventListener('message', (event) => {
            let msg;
            try {
                msg = JSON.parse(event.data);
            } catch (e) {
                return;
            }
            if (msg && msg.type === 'pong') {
                this._onPong();
                return;
            }
            if (msg && typeof msg.type === 'string') {
                this.emit(msg.type, msg.payload ?? msg);
                this.emit('*', msg);
            }
        });

        this.ws.addEventListener('close', () => {
            this._clearTimers();
            this._setStatus(STATUS.CLOSED);
            if (this.shouldReconnect) this._scheduleReconnect();
        });

        this.ws.addEventListener('error', () => {
            try { this.ws?.close(); } catch (e) { /* ignore */ }
        });
    }

    _flush() {
        const queued = this.queue.splice(0, this.queue.length);
        for (const envelope of queued) {
            try { this.ws.send(JSON.stringify(envelope)); }
            catch (e) { this.queue.push(envelope); }
        }
    }

    _scheduleReconnect() {
        const attempt = ++this.reconnectAttempts;
        const base = Math.min(BACKOFF_MIN_MS * 2 ** (attempt - 1), BACKOFF_MAX_MS);
        const jitter = base * BACKOFF_JITTER * (Math.random() * 2 - 1);
        const delay = Math.max(BACKOFF_MIN_MS, Math.round(base + jitter));
        this.reconnectTimer = setTimeout(() => this._open(), delay);
    }

    _startPing() {
        this._clearPing();
        this.pingTimer = setInterval(() => {
            if (!this.ws || this.status !== STATUS.OPEN) return;
            try { this.ws.send(JSON.stringify({type: 'ping'})); } catch (e) { /* ignore */ }
            this.pongTimer = setTimeout(() => {
                try { this.ws?.close(4001, 'pong timeout'); } catch (e) { /* ignore */ }
            }, PING_TIMEOUT_MS);
        }, PING_INTERVAL_MS);
    }

    _onPong() {
        if (this.pongTimer) {
            clearTimeout(this.pongTimer);
            this.pongTimer = null;
        }
    }

    _clearPing() {
        if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
        if (this.pongTimer) { clearTimeout(this.pongTimer); this.pongTimer = null; }
    }

    _clearTimers() {
        this._clearPing();
        if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    }

    _setStatus(status) {
        if (this.status === status) return;
        this.status = status;
        this.emit('status', status);
    }
}

let singleton = null;
export const getChatSocket = () => {
    if (!singleton) {
        singleton = isMockMode() ? new MockChatSocket() : new ChatSocket();
    }
    return singleton;
};
