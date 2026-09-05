import {apiClient as axios} from "@/services/httpClient";
import config from "../../config/config";

const baseUrl = config.getParam('apiDomain');
const baseUrlRating = `${baseUrl}v1/rating/`;

export const ratingApi = {
    every: async () => {
        return new Promise((resolve, reject) => {
            axios.get(`${baseUrlRating}everyday`).then(res => {
                if (!res.data.errors) {
                    resolve(res.data);
                } else {
                    reject(res.data);
                }
            }).catch(e => reject(e));
        });
    },
}
