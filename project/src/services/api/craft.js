import {apiClient as axios} from "@/services/httpClient";
import config from "../../config/config";
import {isCraftMockMode, mockApi} from "@/services/craft/mock";

const baseUrl = config.getParam('apiDomain');
const baseUrlItem = `${baseUrl}v1/craft-item`;
const baseUrlRecipe = `${baseUrl}v1/craft-recipe`;
const baseUrlInventory = `${baseUrl}v1/craft-inventory`;
const baseUrlShop = `${baseUrl}v1/craft-shop`;

const handle = (axiosPromise) => new Promise((resolve, reject) => {
    axiosPromise.then(res => {
        if (res.data && res.data.errors) {
            reject(res.data);
            return;
        }
        resolve(res.data);
    }).catch(e => reject(e?.response?.data || e));
});

const realItemApi = {
    index: () => handle(axios.get(baseUrlItem)),
};

const realRecipeApi = {
    index: () => handle(axios.get(baseUrlRecipe)),
    view: (id) => handle(axios.get(`${baseUrlRecipe}/${id}`)),
};

const realInventoryApi = {
    my: () => handle(axios.get(`${baseUrlInventory}/my`)),
};

const realCraftApi = {
    execute: (recipeId) => handle(axios.post(`${baseUrlRecipe}/${recipeId}/craft`)),
};

const realShopApi = {
    list: () => handle(axios.get(baseUrlShop)),
    buy: (itemId, qty = 1) => handle(axios.post(`${baseUrlShop}/${itemId}/buy`, {qty})),
};

export const itemApi = isCraftMockMode() ? mockApi.item : realItemApi;
export const recipeApi = isCraftMockMode() ? mockApi.recipe : realRecipeApi;
export const inventoryApi = isCraftMockMode() ? mockApi.inventory : realInventoryApi;
export const craftApi = isCraftMockMode() ? mockApi.craft : realCraftApi;
export const shopApi = isCraftMockMode() ? mockApi.shop : realShopApi;
