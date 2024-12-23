import axios from "axios";
import config from "../../../config/config";

const baseUrl = config.getParam('apiDomain');
const baseUrlOrel = `${baseUrl}v1/saper`;

export const saper = {
  my: async (page = 1) => {
    return new Promise((resolve, reject) => {
      axios.get(`${baseUrlOrel}/my?page=${page}`).then(res => {
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
      axios.get(`${baseUrlOrel}?${urlParams}`).then(res => {
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
      axios.get(`${baseUrlOrel}/kon-count`).then(res => {
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
      axios.post(`${baseUrlOrel}`, {kon, count}).then(res => {
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
      axios.post(`${baseUrlOrel}/play/${id}`, {
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

  delete: async (id) => {
    return new Promise((resolve, reject) => {
      axios.delete(`${baseUrlOrel}/${id}`).then(res => {
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
      axios.get(`${baseUrlOrel}/history?page=${page}`).then(res => {
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
