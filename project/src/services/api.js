import {apiClient as axios} from "@/services/httpClient";
import config from "../config/config";
// TODO(stat-mock): убрать импорт и ветку в saveWall после подключения бэка
import {isStatMockMode, mockSaveWall} from "./stat/mock";

const baseUrl = config.getParam('apiDomain');

export const login = async (login, password) => {
    return new Promise((resolve, reject) => {
        axios.post(`${baseUrl}login`, { login, password }).then(res => {
            if (!res.data.errors) {
                resolve(res.data);
            } else {
                reject(res.data);
            }
        }).catch(e => reject(e));
    });
}

export const loginKey = async (key) => {
    return new Promise((resolve, reject) => {
        axios.get(`${baseUrl}login-key/${key}`).then(res => {
            if (!res.data.errors) {
                resolve(res.data);
            } else {
                reject(res.data);
            }
        }).catch(e => reject(e));
    });
}

export const registration = async (username, email, password) => {
    return new Promise((resolve, reject) => {
        axios.post(`${baseUrl}registration`, { username, email, password }).then(res => {
            if (!res.data.errors) {
                resolve(res.data);
            } else {
                reject(res.data);
            }
        }).catch(e => reject(e));
    });
}

export const logout = async () => {
    return new Promise((resolve, reject) => {
        axios.post(`${baseUrl}logout`, {}).then(res => {
            if (!res.data.errors) {
                resolve(res.data);
            } else {
                reject(res.data);
            }
        }).catch(e => reject(e));
    });
}

export const getWall = async (username) => {
    return new Promise((resolve, reject) => {
        axios.get(`${baseUrl}v1/users/wall/${username}`).then(res => {
            if (!res.data.errors) {
                resolve(res.data);
            } else {
                reject();
            }
        }).catch(e => reject(e));
    });
}

export const saveWall = async (description) => {
    if (isStatMockMode()) {
        return mockSaveWall(description);
    }
    return new Promise((resolve, reject) => {
        axios.patch(`${baseUrl}v1/users/wall`, { description }).then(res => {
            if (!res.data.errors) {
                resolve(res.data);
            } else {
                reject(res.data);
            }
        }).catch(e => reject(e));
    });
}

export const getProfile = async () => {
    return new Promise((resolve, reject) => {
        axios.get(`${baseUrl}v1/users/profile`).then(res => {
            if (!res.data.errors) {
                resolve(res.data);
            } else {
                reject(res.data);
            }
        }).catch(e => reject(e));
    });
}
