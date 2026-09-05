import axios from "axios";
import config from "../../config/config";
import {isMockMode, mockApi} from "@/services/chat/mock";

const baseUrl = config.getParam('apiDomain');
const baseUrlRoom = `${baseUrl}v1/chat-room`;
const baseUrlMessage = `${baseUrl}v1/chat-message`;
const baseUrlAuth = `${baseUrl}v1/chat`;

const handle = (axiosPromise, withCount = false) => {
    return new Promise((resolve, reject) => {
        axiosPromise.then(res => {
            if (res.data && res.data.errors) {
                reject(res.data);
                return;
            }
            if (withCount) {
                resolve({
                    list: res.data,
                    count: Number(res.headers['x-pagination-total-count'] ?? 0),
                });
            } else {
                resolve(res.data);
            }
        }).catch(e => reject(e));
    });
};

const realRoomApi = {
    index: (page = 1) => handle(axios.get(`${baseUrlRoom}?sort=-last_message_at&page=${page}`), true),
    my: (page = 1) => handle(axios.get(`${baseUrlRoom}/my?sort=-last_message_at&page=${page}`), true),
    view: (id) => handle(axios.get(`${baseUrlRoom}/${id}`)),
    create: ({name, is_private = false, password = null, is_channel = false}) =>
        handle(axios.post(baseUrlRoom, {name, is_private, password, is_channel})),
    delete: (id) => handle(axios.delete(`${baseUrlRoom}/${id}`)),
    join: (id, password = null) => handle(axios.post(`${baseUrlRoom}/${id}/join`, {password})),
    leave: (id) => handle(axios.post(`${baseUrlRoom}/${id}/leave`)),
    members: (id) => handle(axios.get(`${baseUrlRoom}/${id}/members`)),
};

const realMessageApi = {
    history: (room_id, before = null, limit = 50) => {
        const params = new URLSearchParams({'filter[room_id]': room_id, limit});
        if (before) params.append('before', before);
        return handle(axios.get(`${baseUrlMessage}?${params.toString()}`));
    },
    view: (id) => handle(axios.get(`${baseUrlMessage}/${id}`)),
    create: (room_id, text) => handle(axios.post(baseUrlMessage, {room_id, text})),
    update: (id, text) => handle(axios.patch(`${baseUrlMessage}/${id}`, {text})),
    delete: (id) => handle(axios.delete(`${baseUrlMessage}/${id}`)),
    markRead: (room_id, message_id) => handle(axios.post(`${baseUrlRoom}/${room_id}/read`, {message_id})),
};

const realAuthApi = {
    wsToken: () => handle(axios.post(`${baseUrlAuth}/ws-token`)),
};

export const roomApi = isMockMode() ? mockApi.room : realRoomApi;
export const messageApi = isMockMode() ? mockApi.message : realMessageApi;
export const chatAuthApi = isMockMode() ? mockApi.auth : realAuthApi;
