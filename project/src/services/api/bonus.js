import {apiClient as axios} from "@/services/httpClient";
import config from "../../config/config";

const baseUrl = config.getParam('apiDomain');
const baseUrlBonus = `${baseUrl}v1/bonus/`;

export const bonusApi = {
    every: async () => {
        return new Promise((resolve, reject) => {
            axios.get(`${baseUrlBonus}everyday`).then(res => {
                if (!res.data.errors) {
                    resolve(res.data);
                } else {
                    reject(res.data);
                }
            }).catch(e => reject(e));
        });
    },
}
