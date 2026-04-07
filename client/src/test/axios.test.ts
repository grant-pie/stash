import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Import the real api module — we test the interceptors it registers
import api from '@/lib/axios';

// Helper to extract the fulfilled handler of the request interceptor
function getRequestFulfilledHandler(): (config: any) => any {
  const manager = (api.interceptors.request as any);
  const handlers: Array<{ fulfilled: Function; rejected: Function } | null> = manager.handlers;
  for (const h of handlers) {
    if (h?.fulfilled) return h.fulfilled;
  }
  throw new Error('Request interceptor not found');
}

// Helper to extract the rejected handler of the response interceptor
function getResponseRejectedHandler(): (error: any) => any {
  const manager = (api.interceptors.response as any);
  const handlers: Array<{ fulfilled: Function; rejected: Function } | null> = manager.handlers;
  for (const h of handlers) {
    if (h?.rejected) return h.rejected;
  }
  throw new Error('Response interceptor not found');
}

describe('axios request interceptor', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('attaches Authorization header when a token is in localStorage', () => {
    localStorage.setItem('access_token', 'my-jwt-token');
    const handle = getRequestFulfilledHandler();
    const config = { headers: {} as Record<string, string> };
    const result = handle(config);
    expect(result.headers.Authorization).toBe('Bearer my-jwt-token');
  });

  it('does not attach Authorization header when there is no token', () => {
    const handle = getRequestFulfilledHandler();
    const config = { headers: {} as Record<string, string> };
    const result = handle(config);
    expect(result.headers.Authorization).toBeUndefined();
  });

  it('returns the config object unchanged (apart from header)', () => {
    localStorage.setItem('access_token', 'tok');
    const handle = getRequestFulfilledHandler();
    const config = { headers: {} as Record<string, string>, url: '/test' };
    const result = handle(config);
    expect(result.url).toBe('/test');
  });
});

describe('axios response interceptor', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('access_token', 'old-token');
    localStorage.setItem('user', JSON.stringify({ id: '1', username: 'alice' }));
  });
  afterEach(() => localStorage.clear());

  it('clears access_token from localStorage on a 401 response', async () => {
    const handle = getResponseRejectedHandler();
    await handle({ response: { status: 401 } }).catch(() => {});
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('clears user from localStorage on a 401 response', async () => {
    const handle = getResponseRejectedHandler();
    await handle({ response: { status: 401 } }).catch(() => {});
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('dispatches the auth:logout window event on a 401', async () => {
    const handler = vi.fn();
    window.addEventListener('auth:logout', handler);
    const handle = getResponseRejectedHandler();
    await handle({ response: { status: 401 } }).catch(() => {});
    expect(handler).toHaveBeenCalledOnce();
    window.removeEventListener('auth:logout', handler);
  });

  it('does NOT clear localStorage for non-401 errors', async () => {
    const handle = getResponseRejectedHandler();
    await handle({ response: { status: 500 } }).catch(() => {});
    expect(localStorage.getItem('access_token')).toBe('old-token');
    expect(localStorage.getItem('user')).not.toBeNull();
  });

  it('rejects the promise so callers can still handle the error', async () => {
    const handle = getResponseRejectedHandler();
    await expect(handle({ response: { status: 401 } })).rejects.toBeDefined();
  });
});
