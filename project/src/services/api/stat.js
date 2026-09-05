import axios from "axios";
import config from "../../config/config";
// TODO(stat-mock): убрать импорт и ветки isStatMockMode() после подключения бэка
import {isStatMockMode, mockStatIndex, mockStatTop, mockStatUser} from "../stat/mock";

const baseUrl = config.getParam('apiDomain');

export const statApi = {
    index: async () => {
        if (isStatMockMode()) {
            return mockStatIndex();
        }
        return new Promise((resolve, reject) => {
            axios.get(`${baseUrl}v1/stat`).then(res => {
                if (!res.data.errors) {
                    resolve(res.data);
                } else {
                    reject(res.data);
                }
            }).catch(e => reject(e));
        });
    },

    user: async (login) => {
        if (isStatMockMode()) {
            return mockStatUser(login);
        }
        return new Promise((resolve, reject) => {
            axios.get(`${baseUrl}v1/stat/user/${login}`).then(res => {
                if (!res.data.errors) {
                    resolve(res.data);
                } else {
                    reject(res.data);
                }
            }).catch(e => reject(e));
        });
    },

    top: async (period = 'all') => {
        if (isStatMockMode()) {
            return mockStatTop(period);
        }
        return new Promise((resolve, reject) => {
            axios.get(`${baseUrl}v1/stat/top?period=${period}`).then(res => {
                if (!res.data.errors) {
                    resolve(res.data);
                } else {
                    reject(res.data);
                }
            }).catch(e => reject(e));
        });
    },
}
