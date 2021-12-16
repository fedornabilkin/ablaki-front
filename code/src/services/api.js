import axios from "axios";
import config from "../config/config";

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
                reject(res.data);
            }
        }).catch(e => reject(e));
    });
}

export const orel = {
    get: async () => {
        return new Promise((resolve, reject) => {
            axios.get(`${baseUrl}v1/orel`).then(res => {
                if (!res.data.errors) {
                    resolve(res.data);
                } else {
                    reject(res.data);
                }
            }).catch(e => reject(e));
        });
    },

    create: async (kon, count) => {
        return new Promise((resolve, reject) => {
            axios.post(`${baseUrl}v1/orel`, {kon, count}).then(res => {
                if (!res.data.errors) {
                    resolve(res.data);
                } else {
                    reject(res.data);
                }
            }).catch(e => reject(e));
        });
    },

    getMy: async () => {
        return new Promise((resolve, reject) => {
            axios.get(`${baseUrl}v1/orel/my`).then(res => {
                if (!res.data.errors) {
                    resolve(res.data);
                } else {
                    reject(res.data);
                }
            }).catch(e => reject(e));
        });
    },

    delete: async (id) => {
        return new Promise((resolve, reject) => {
            axios.delete(`${baseUrl}v1/orel/${id}`).then(res => {
                if (!res.data.errors) {
                    resolve(res.data);
                } else {
                    reject(res.data);
                }
            }).catch(e => reject(e));
        });
    },
}