import axios from "axios";
import config from "../../../config/config";
// TODO(stat-mock): убрать импорты и ветки isStatMockMode() после подключения бэка
import {isStatMockMode} from "../../stat/mock";
import {fiveMock} from "./fiveMock";

const baseUrl = config.getParam('apiDomain');
const baseUrlFive = `${baseUrl}v1/five`;

export const five = {
    get: async () => {
        if (isStatMockMode()) {
            return fiveMock.get();
        }
        return new Promise((resolve, reject) => {
            axios.get(`${baseUrlFive}`).then(res => {
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
            return fiveMock.my();
        }
        return new Promise((resolve, reject) => {
            axios.get(`${baseUrlFive}/my?page=${page}`).then(res => {
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
            return fiveMock.getHistory();
        }
        return new Promise((resolve, reject) => {
            axios.get(`${baseUrlFive}/history?page=${page}`).then(res => {
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

    create: async (kon, ball) => {
        if (isStatMockMode()) {
            return fiveMock.create(kon, ball);
        }
        return new Promise((resolve, reject) => {
            axios.post(`${baseUrlFive}`, {kon, ball}).then(res => {
                if (!(res.data?.errors ?? null)) {
                    resolve(res.data);
                } else {
                    reject(res.data);
                }
            }).catch(e => reject(e));
        });
    },

    play: async (id, ball) => {
        if (isStatMockMode()) {
            return fiveMock.play(id, ball);
        }
        return new Promise((resolve, reject) => {
            axios.post(`${baseUrlFive}/play/${id}`, {ball}).then(res => {
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
            return fiveMock.delete(id);
        }
        return new Promise((resolve, reject) => {
            axios.delete(`${baseUrlFive}/${id}`).then(res => {
                if (!res.data.errors) {
                    resolve(res.data);
                } else {
                    reject(res.data);
                }
            }).catch(e => reject(e));
        });
    },
}
