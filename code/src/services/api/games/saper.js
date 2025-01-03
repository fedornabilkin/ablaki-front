import axios from "axios";
import config from "../../../config/config";

const baseUrl = config.getParam('apiDomain');
const baseUrlSaper = `${baseUrl}v1/saper`;

export const saper = {
  my: async (page = 1) => {
    return new Promise((resolve, reject) => {
      axios.get(`${baseUrlSaper}/my?page=${page}`).then(res => {
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

  get: async (konFilter) => {
    let urlParams = konFilter ? `filter[kon]=${konFilter}` : '';
    return new Promise((resolve, reject) => {
      axios.get(`${baseUrlSaper}?${urlParams}`).then(res => {
        if (!res.data.errors) {
          resolve(res.data);
        } else {
          reject(res.data);
        }
      }).catch(e => reject(e));
    });
  },

  getKonCount: async () => {
    return new Promise((resolve, reject) => {
      axios.get(`${baseUrlSaper}/kon-count`).then(res => {
        if (!res.data.errors) {
          resolve(res.data);
        } else {
          reject(res.data);
        }
      }).catch(e => reject(e));
    });
  },

  getGamesPage: async (konFilter) => {
    return Promise.all([saper.get(konFilter), saper.getKonCount()]).then(res => {
      return {
        games: res[0],
        konCount: res[1],
      };
    })
  },

  create: async (kon, count) => {
    return new Promise((resolve, reject) => {
      axios.post(`${baseUrlSaper}`, {kon, count}).then(res => {
        if (!res.data.errors) {
          resolve(res.data);
        } else {
          reject(res.data);
        }
      }).catch(e => reject(e));
    });
  },

  start: async (id) => {
    return new Promise((resolve, reject) => {
      axios.get(`${baseUrlSaper}/start/${id}`)
        .then(res => {
          if (!(res.data?.errors ?? null)) {
            resolve(res.data);
          } else {
            reject(res.data);
          }
        }).catch(e => reject(e));
    });
  },

  play: async (id, row, col) => {
    return new Promise((resolve, reject) => {
      axios.post(`${baseUrlSaper}/play/${id}`, {row, col})
        .then(res => {
          if (!(res.data?.errors ?? null)) {
            resolve(res.data);
          } else {
            reject(res.data);
          }
        }).catch(e => reject(e));
    });
  },

  delete: async (id) => {
    return new Promise((resolve, reject) => {
      axios.delete(`${baseUrlSaper}/${id}`).then(res => {
        if (!res.data.errors) {
          resolve(res.data);
        } else {
          reject(res.data);
        }
      }).catch(e => reject(e));
    });
  },

  getHistory: async (page = 1) => {
    return new Promise((resolve, reject) => {
      axios.get(`${baseUrlSaper}/history?page=${page}`).then(res => {
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
}
