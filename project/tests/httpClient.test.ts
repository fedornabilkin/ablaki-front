import {AxiosError} from 'axios';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {apiClient, configureApiSession, readApi} from '../src/services/httpClient';

afterEach(() => { vi.restoreAllMocks(); configureApiSession(() => '', () => {}); });

describe('concurrent API reads', () => {
    it('shares pending requests, isolates DTOs and never caches a completed read', async () => {
        let complete;
        const get = vi.spyOn(apiClient, 'get').mockImplementation(() => new Promise(resolve => { complete = resolve; }));
        const a = readApi('/world', {params: {page: 1}}), b = readApi('/world', {params: {page: 1}});
        expect(get).toHaveBeenCalledTimes(1);
        complete({data: {items: [{id: 1}]}});
        const [first, second] = await Promise.all([a, b]);
        first.data.items[0].id = 9;
        expect(second.data.items[0].id).toBe(1);
        get.mockResolvedValue({data: {items: []}});
        await readApi('/world', {params: {page: 1}});
        expect(get).toHaveBeenCalledTimes(2);
    });
    it('does not share across account revisions, parameters or cancellation owners', async () => {
        let revision = 1;
        configureApiSession(() => 'same-token', () => {}, () => revision);
        const get = vi.spyOn(apiClient, 'get').mockResolvedValue({data: {}});
        const reads = [readApi('/world')]; revision++;
        reads.push(readApi('/world'), readApi('/world', {params: {page: 2}}));
        reads.push(readApi('/world', {signal: new AbortController().signal}), readApi('/world', {signal: new AbortController().signal}));
        await Promise.all(reads);
        expect(get).toHaveBeenCalledTimes(5);
    });
    it('clears failed reads for retry', async () => {
        const get = vi.spyOn(apiClient, 'get').mockRejectedValueOnce(new Error('offline')).mockResolvedValue({data: {ok: true}});
        const a = readApi('/world'), b = readApi('/world');
        await expect(a).rejects.toThrow('offline'); await expect(b).rejects.toThrow('offline');
        expect((await readApi('/world')).data.ok).toBe(true);
        expect(get).toHaveBeenCalledTimes(2);
    });
    it('does not join a read started before or during a command, including an uncertain failure', async () => {
        const get = vi.spyOn(apiClient, 'get').mockResolvedValue({data: {}});
        const before = readApi('/world');
        const command = apiClient.post('/command', {}, {adapter: async config => { throw new AxiosError('offline', 'ERR_NETWORK', config); }});
        const during = readApi('/world');
        await expect(command).rejects.toThrow('offline');
        const after = readApi('/world');
        await Promise.all([before, during, after]);
        expect(get).toHaveBeenCalledTimes(3);
    });
});

describe('API authorization', () => {
    it('attaches the current token and omits the header for guests', async () => {
        let token = 'first';
        configureApiSession(() => token, vi.fn());
        const headers: unknown[] = [];
        const adapter = async config => {
            headers.push(config.headers.get('Authorization'));
            return {data: {}, status: 200, statusText: 'OK', headers: {}, config};
        };
        await apiClient.get('/test', {adapter});
        token = '';
        await apiClient.get('/test', {adapter});
        expect(headers).toEqual(['Bearer first', undefined]);
    });
    it('does not clear a newer session on a late 401 from the previous token', async () => {
        let token = 'old';
        const unauthorized = vi.fn();
        configureApiSession(() => token, unauthorized);
        await expect(apiClient.get('/test', {adapter: async config => {
            token = 'new';
            throw new AxiosError('unauthorized', 'ERR_BAD_REQUEST', config, null,
                {status: 401, data: {}, statusText: '', headers: {}, config});
        }})).rejects.toThrow();
        expect(unauthorized).not.toHaveBeenCalled();
    });
    it('clears the active session on its own 401', async () => {
        const unauthorized = vi.fn();
        configureApiSession(() => 'active', unauthorized);
        await expect(apiClient.get('/test', {adapter: async config => {
            throw new AxiosError('unauthorized', 'ERR_BAD_REQUEST', config, null,
                {status: 401, data: {}, statusText: '', headers: {}, config});
        }})).rejects.toThrow();
        expect(unauthorized).toHaveBeenCalledOnce();
    });
});
