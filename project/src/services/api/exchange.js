import axios from "axios";
import config from "../../config/config";

const baseUrl = config.getParam('apiDomain');

export const exchange = {
    getBuy: async () => {
        return new Promise((resolve, reject) => {
            axios.get(`${baseUrl}v1/exchange`, {params: {"filter[type]": "buy", "sort": "-amount"}}).then(res => {
                resolve(res.data);
            }).catch(e => reject(e));
        });
    },
    getSell: async () => {
        return new Promise((resolve, reject) => {
            axios.get(`${baseUrl}v1/exchange`, {params: {"filter[type]": "sell", "sort": "price"}}).then(res => {
                resolve(res.data);
            }).catch(e => reject(e));
        });
    },
    getMyBuy: async () => {
        return new Promise((resolve, reject) => {
            axios.get(`${baseUrl}v1/exchange/my`, {params: {"filter[type]": "buy"}}).then(res => {
                resolve(res.data);
            }).catch(e => reject(e));
        });
    },
    getMySell: async () => {
        return new Promise((resolve, reject) => {
            axios.get(`${baseUrl}v1/exchange/my`, {params: {"filter[type]": "sell"}}).then(res => {
                resolve(res.data);
            }).catch(e => reject(e));
        });
    },
    getHistory: async () => {
        return new Promise((resolve, reject) => {
            axios.get(`${baseUrl}v1/exchange/history`).then(res => {
                if (!res.data.errors) {
                    resolve(res.data);
                } else {
                    reject();
                }
            }).catch(e => reject(e));
        });
    },
    create: async (type, credit, amount, count) => {
        return new Promise((resolve, reject) => {
            axios.post(`${baseUrl}v1/exchange`, {type, credit, amount}).then(res => {
                resolve(res.data);
            }).catch(e => reject(e));
        });
    },
    proceed: async (id) => {
        return new Promise((resolve, reject) => {
            axios.put(`${baseUrl}v1/exchange/${id}`, {}).then(res => {
                resolve(res.data);
            }).catch(e => reject(e));
        });
    },
    cancel: async (id) => {
        return new Promise((resolve, reject) => {
            axios.delete(`${baseUrl}v1/exchange/${id}`).then(res => {
                resolve(res.data);
            }).catch(e => reject(e));
        });
    }
};

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
