import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';

let readToken: () => string = () => '';
let handleUnauthorized: () => void = () => {};
let sessionRevision: () => number = () => 0;
let readEpoch = 0;
const pendingReads = new Map<string, Promise<AxiosResponse>>();

function invalidateReads() { readEpoch++; pendingReads.clear(); }

// Local development can use a remote test database with a slower connection.
export const apiClient = axios.create({timeout: import.meta.env.DEV ? 60_000 : 15_000});

export function configureApiSession(getToken: () => string, onUnauthorized: () => void, revision: () => number = () => 0) {
    readToken = getToken;
    handleUnauthorized = onUnauthorized;
    sessionRevision = revision;
    invalidateReads();
}

/** Share concurrent, explicitly read-only requests. Never cache a completed response or a command. */
export async function readApi(url: string, config?: Pick<AxiosRequestConfig, 'params' | 'signal'>): Promise<AxiosResponse> {
    // A caller owns its cancellation; cancelling it must not cancel another component's request.
    if (config?.signal) return apiClient.get(url, config);
    const key = JSON.stringify([readToken(), sessionRevision(), readEpoch, apiClient.getUri({ url, ...config })]);
    let pending = pendingReads.get(key);
    if (!pending) {
        pending = config ? apiClient.get(url, config) : apiClient.get(url);
        pendingReads.set(key, pending);
        const current = pending;
        void pending.finally(() => { if (pendingReads.get(key) === current) pendingReads.delete(key); }).catch(() => {});
    }
    const response = await pending;
    // Consumers may decorate their DTOs; do not let one component mutate another's data.
    return { ...response, data: structuredClone(response.data) };
}

const writes = (method?: string) => !['get', 'head', 'options'].includes((method ?? 'get').toLowerCase());

apiClient.interceptors.request.use(request => {
    if (writes(request.method)) invalidateReads();
    const token = readToken();
    if (token) request.headers.set('Authorization', `Bearer ${token}`);
    else request.headers.delete('Authorization');
    return request;
}, undefined, { synchronous: true });

apiClient.interceptors.response.use(response => {
    if (writes(response.config.method)) invalidateReads();
    return response;
}, error => {
    if (writes(error.config?.method)) invalidateReads();
    const token = readToken();
    // A delayed response from an earlier account must not clear the current session.
    if (error.response?.status === 401 && token &&
        error.config?.headers?.get('Authorization') === `Bearer ${token}`) {
        handleUnauthorized();
    }
    return Promise.reject(error);
});
