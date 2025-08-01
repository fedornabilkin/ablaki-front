import axios from "axios";
import { router } from "../router";
import config from "../config/config";

let urlMain = config.makeApiUrl('menu-list');

const menu = {
    state: () => ({
        list: []
    }),
    getters: {
        menuList: state => state.list || [],
    },
    mutations: {
        menu_set(state, list = []) {
            for (let name of Array.from(list)) {
                state.list.push(router.resolve({name: name}).route);
            }
        },
        menu_clear(state) {
            state.list = [];
        }
    },
    actions: {
        setMenu({commit}) {
            return new Promise((resolve, reject) => {
                axios({
                    url: urlMain,
                    method: 'GET',
                    headers: {'Authorization': 'Bearer ' + localStorage.getItem('token')}
                })
                    .then(resp => {
                        commit('menu_set', resp.data);
                        resolve(resp);
                    })
                    .catch(err => {
                        commit('menu_clear');
                        reject(err);
                    })
            });
        },
        menuClear({commit}) {
            commit('menu_clear');
        }
    }
}

export { menu };