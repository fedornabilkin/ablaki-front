import {apiClient as axios} from "@/services/httpClient";
import config from "../../../config/config";
// TODO(stat-mock): убрать импорты и ветки isStatMockMode() после подключения бэка
import {isStatMockMode} from "../../stat/mock";
import {duelMock} from "./duelMock";

const baseUrl = config.getParam('apiDomain');
const baseUrlDuel = `${baseUrl}v1/duel`;

export const duel = {
    get: async () => {
        if (isStatMockMode()) {
            return duelMock.get();
        }
        return new Promise((resolve, reject) => {
            axios.get(`${baseUrlDuel}`).then(res => {
                if (!res.data.errors) {
                    resolve(res.data);
                } else {
                    reject(res.data);
                }
            }).catch(e => reject(e));
        });
    },

    my: async (page = 1) => {
        if (isStatMockMode()) {
            return duelMock.my();
        }
        return new Promise((resolve, reject) => {
            axios.get(`${baseUrlDuel}/my?page=${page}`).then(res => {
                if (!res.data.errors) {
                    resolve({
                        list: res.data,
                        count: Number(res.headers['x-pagination-total-count']),
                    });
                } else {
                    reject(res.data);
                }
            }).catch(e => reject(e));
        });
    },

    getHistory: async (page = 1) => {
        if (isStatMockMode()) {
            return duelMock.getHistory();
        }
        return new Promise((resolve, reject) => {
            axios.get(`${baseUrlDuel}/history?page=${page}`).then(res => {
                if (!res.data.errors) {
                    resolve({
                        list: res.data,
                        count: Number(res.headers['x-pagination-total-count']),
                    });
                } else {
                    reject(res.data);
                }
            }).catch(e => reject(e));
        });
    },

    create: async (kon, u1, b1) => {
        if (isStatMockMode()) {
            return duelMock.create(kon, u1, b1);
        }
        return new Promise((resolve, reject) => {
            axios.post(`${baseUrlDuel}`, {kon, u1, b1}).then(res => {
                if (!(res.data?.errors ?? null)) {
                    resolve(res.data);
                } else {
                    reject(res.data);
                }
            }).catch(e => reject(e));
        });
    },

    play: async (id, u2, b2) => {
        if (isStatMockMode()) {
            return duelMock.play(id, u2, b2);
        }
        return new Promise((resolve, reject) => {
            axios.post(`${baseUrlDuel}/play/${id}`, {u2, b2}).then(res => {
                if (!(res.data?.errors ?? null)) {
                    resolve(res.data);
                } else {
                    reject(res.data);
                }
            }).catch(e => reject(e));
        });
    },

    delete: async (id) => {
        if (isStatMockMode()) {
            return duelMock.delete(id);
        }
        return new Promise((resolve, reject) => {
            axios.delete(`${baseUrlDuel}/${id}`).then(res => {
                if (!res.data.errors) {
                    resolve(res.data);
                } else {
                    reject(res.data);
                }
            }).catch(e => reject(e));
        });
    },
}
