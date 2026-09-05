import {AxiosError} from 'axios';
import {describe, expect, it, vi} from 'vitest';
import {apiClient, configureApiSession} from '../src/services/httpClient';

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
