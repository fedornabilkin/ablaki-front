import axios from "axios";
import config from "../config/config";

const baseUrl = config.getParam('apiDomain')

console.log(baseUrl);

export const login = async (login, password) => {
    return new Promise((resolve, reject) => {
        axios.post(`${baseUrl}login`, { login, password }).then(res => {
            if (!res.data.errors) {
                resolve(res.data)
            } else {
                reject(res.data)
            }
        }).catch(e => reject(e));
    });
}

export const registration = async (username, email, password) => {
    return new Promise((resolve, reject) => {
        axios.post(`${baseUrl}registration`, { username, email, password }).then(res => {
            if (!res.data.errors) {
                resolve(res.data)
            } else {
                reject(res.data)
            }
        }).catch(e => reject(e));
    });
}