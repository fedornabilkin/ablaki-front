import axios from 'axios';

let readToken: () => string = () => '';
let handleUnauthorized: () => void = () => {};

export const apiClient = axios.create({timeout: 15_000});

export function configureApiSession(getToken: () => string, onUnauthorized: () => void) {
    readToken = getToken;
    handleUnauthorized = onUnauthorized;
}

apiClient.interceptors.request.use(request => {
    const token = readToken();
    if (token) request.headers.set('Authorization', `Bearer ${token}`);
    else request.headers.delete('Authorization');
    return request;
});

apiClient.interceptors.response.use(response => response, error => {
    const token = readToken();
    // A delayed response from an earlier account must not clear the current session.
    if (error.response?.status === 401 && token &&
        error.config?.headers?.get('Authorization') === `Bearer ${token}`) {
        handleUnauthorized();
    }
    return Promise.reject(error);
});
