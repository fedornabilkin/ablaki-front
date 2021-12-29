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

export const orel = {
    get: async (konFilter) => {
        let urlParams = konFilter ? `filter[kon]=${konFilter}` : '';
        return new Promise((resolve, reject) => {
            axios.get(`${baseUrl}v1/orel?${urlParams}`).then(res => {
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

    getKonCount: async () => {
        return new Promise((resolve, reject) => {
            axios.get(`${baseUrl}v1/orel/kon-count`).then(res => {
                if (!res.data.errors) {
                    resolve(res.data);
                } else {
                    reject(res.data);
                }
            }).catch(e => reject(e));
        });
    },

    getGamesPage: async (konFilter) => {
        return Promise.all([orel.get(konFilter), orel.getKonCount()]).then(res => {
           return {
               games: res[0],
               konCount: res[1],
           };
        })
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

    play: async (id, hod) => {
        return new Promise((resolve, reject) => {
            axios.post(`${baseUrl}v1/orel/play/${id}`, {
                hod
            }).then(res => {
                if (!(res.data?.errors ?? null)) {
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

    getHistory: async () => {
        return new Promise((resolve, reject) => {
            axios.get(`${baseUrl}v1/orel/history`).then(res => {
                if (!res.data.errors) {
                    resolve(res.data);
                } else {
                    reject(res.data);
                }
            }).catch(e => reject(e));
        });
    },
}

export const errorHandler = (e, errors) => {
    if (!errors.hasOwnProperty("404")) {
        errors['404'] = () => alert("something сломалось")
    }
    if (!e.response) {
        console.log("Ошибка Интернета");
    } else {
        Object.keys(errors).map(function (key) {
            let error = String(e.response.data.message);
            let errorCode = String(e.response.status);

            if (error === key || errorCode === key) {
                errors[key]();
            }
        })
    }
}