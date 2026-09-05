export const OUT = Object.freeze({
    JOIN: 'join',
    JOIN_ROOM: 'join_room',
    LEAVE_ROOM: 'leave_room',
    MESSAGE: 'message',
    TYPING: 'typing',
    TYPING_STOP: 'typing_stop',
    REACT: 'react',
    EDIT_MSG: 'edit_msg',
    DELETE_MSG: 'delete_msg',
    SET_AVATAR: 'set_avatar',
    PROMOTE: 'promote',
    DEMOTE: 'demote',
    READ: 'read',
});

export const IN = Object.freeze({
    ROOMS_LIST: 'rooms_list',
    ROOM_JOINED: 'room_joined',
    ROOM_USERS: 'room_users',
    HISTORY: 'history',
    MESSAGE: 'message',
    REACTION_UPDATE: 'reaction_update',
    MSG_DELETED: 'msg_deleted',
    MSG_EDITED: 'msg_edited',
    TYPING: 'typing',
    TYPING_STOP: 'typing_stop',
    ROOM_ACTIVITY: 'room_activity',
    CHANNEL_READONLY: 'channel_readonly',
    JOIN_ERROR: 'join_error',
    SYSTEM: 'system',
});

export const STATUS = Object.freeze({
    DISABLED: 'disabled',
    CONNECTING: 'connecting',
    OPEN: 'open',
    CLOSED: 'closed',
});

export const ALLOWED_REACTIONS = Object.freeze(['👍', '❤️', '😂', '😮', '😢', '👎']);

export const make = {
    join: (username, avatar = null) => ({type: OUT.JOIN, payload: {username, avatar}}),
    joinRoom: (roomId, password = null) => ({type: OUT.JOIN_ROOM, payload: {room_id: roomId, password}}),
    leaveRoom: (roomId) => ({type: OUT.LEAVE_ROOM, payload: {room_id: roomId}}),
    message: (roomId, text, clientId) => ({type: OUT.MESSAGE, payload: {room_id: roomId, text, client_id: clientId}}),
    typing: (roomId) => ({type: OUT.TYPING, payload: {room_id: roomId}}),
    typingStop: (roomId) => ({type: OUT.TYPING_STOP, payload: {room_id: roomId}}),
    react: (messageId, emoji) => ({type: OUT.REACT, payload: {message_id: messageId, emoji}}),
    edit: (messageId, text) => ({type: OUT.EDIT_MSG, payload: {message_id: messageId, text}}),
    delete: (messageId) => ({type: OUT.DELETE_MSG, payload: {message_id: messageId}}),
    setAvatar: (avatar) => ({type: OUT.SET_AVATAR, payload: {avatar}}),
    promote: (roomId, userId) => ({type: OUT.PROMOTE, payload: {room_id: roomId, user_id: userId}}),
    demote: (roomId, userId) => ({type: OUT.DEMOTE, payload: {room_id: roomId, user_id: userId}}),
    read: (roomId, messageId) => ({type: OUT.READ, payload: {room_id: roomId, message_id: messageId}}),
};
