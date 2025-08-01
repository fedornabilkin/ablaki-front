import axios from "axios";
import config from "../../config/config";

const baseUrl = config.getParam('apiDomain');
const baseUrlTheme = `${baseUrl}v1/forum-theme`;
const baseUrlComment = `${baseUrl}v1/forum-comment`;

export const themeApi = {
    my: async (page = 1) => {
        return new Promise((resolve, reject) => {
            axios.get(`${baseUrlTheme}/my?sort=-id&page=${page}`).then(res => {
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

    index: async (page = 1) => {
        return new Promise((resolve, reject) => {
            axios.get(`${baseUrlTheme}?sort=-id&page=${page}`).then(res => {
                if (!res.data.errors) {
                    resolve(res.data);
                } else {
                    reject(res.data);
                }
            }).catch(e => reject(e));
        });
    },

    create: async (title, comment) => {
        return new Promise((resolve, reject) => {
            axios.post(`${baseUrlTheme}`, {title, comment}).then(res => {
                if (!res.data.errors) {
                    resolve(res.data);
                } else {
                    reject(res.data);
                }
            }).catch(e => reject(e));
        });
    },

    update: async (id, title) => {
        return new Promise((resolve, reject) => {
            axios.put(`${baseUrlTheme}/${id}`, {title}).then(res => {
                if (!res.data.errors) {
                    resolve(res.data);
                } else {
                    reject(res.data);
                }
            }).catch(e => reject(e));
        });
    },

    view: async (id) => {
        return new Promise((resolve, reject) => {
            axios.get(`${baseUrlTheme}/${id}`).then(res => {
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
            axios.delete(`${baseUrlTheme}/${id}`).then(res => {
                if (!res.data.errors) {
                    resolve(res.data);
                } else {
                    reject(res.data);
                }
            }).catch(e => reject(e));
        });
    },
}

export const commentApi = {
    my: async (page = 1) => {
        return new Promise((resolve, reject) => {
            axios.get(`${baseUrlComment}/my?sort=-id&page=${page}`).then(res => {
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

    index: async (theme_id, page = 1) => {
        return new Promise((resolve, reject) => {
            axios.get(`${baseUrlComment}?filter[theme_id]=${theme_id}&expand=user&page=${page}`).then(res => {
                if (!res.data.errors) {
                    resolve(res.data);
                } else {
                    reject(res.data);
                }
            }).catch(e => reject(e));
        });
    },

    create: async (title, comment) => {
        return new Promise((resolve, reject) => {
            axios.post(`${baseUrlComment}`, {title, comment}).then(res => {
                if (!res.data.errors) {
                    resolve(res.data);
                } else {
                    reject(res.data);
                }
            }).catch(e => reject(e));
        });
    },

    update: async (id, title) => {
        return new Promise((resolve, reject) => {
            axios.put(`${baseUrlComment}/${id}`, {title}).then(res => {
                if (!res.data.errors) {
                    resolve(res.data);
                } else {
                    reject(res.data);
                }
            }).catch(e => reject(e));
        });
    },

    view: async (id) => {
        return new Promise((resolve, reject) => {
            axios.get(`${baseUrlComment}/${id}`).then(res => {
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
            axios.delete(`${baseUrlComment}/${id}`).then(res => {
                if (!res.data.errors) {
                    resolve(res.data);
                } else {
                    reject(res.data);
                }
            }).catch(e => reject(e));
        });
    },
}
