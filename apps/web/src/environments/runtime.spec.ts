import { afterEach } from 'vitest';
import { resolveApiBaseUrl } from './runtime';

describe('resolveApiBaseUrl', () => {
  afterEach(() => {
    delete (globalThis as { __env?: { apiBaseUrl?: string } }).__env;
  });

  it('returns runtime URL when provided', () => {
    (globalThis as { __env?: { apiBaseUrl?: string } }).__env = {
      apiBaseUrl: 'https://api.test',
    };
    expect(resolveApiBaseUrl('https://fallback')).toBe('https://api.test');
  });

  it('falls back when runtime value is empty', () => {
    (globalThis as { __env?: { apiBaseUrl?: string } }).__env = {
      apiBaseUrl: '   ',
    };
    expect(resolveApiBaseUrl('https://fallback')).toBe('https://fallback');
  });

  it('falls back when runtime env is missing', () => {
    delete (globalThis as { __env?: { apiBaseUrl?: string } }).__env;
    expect(resolveApiBaseUrl('https://fallback')).toBe('https://fallback');
  });

  it('falls back when runtime apiBaseUrl is undefined', () => {
    (globalThis as { __env?: { apiBaseUrl?: string } }).__env = {};
    expect(resolveApiBaseUrl('https://fallback')).toBe('https://fallback');
  });
});
