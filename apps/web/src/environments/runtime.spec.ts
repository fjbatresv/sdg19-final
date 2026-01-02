import { resolveApiBaseUrl } from './runtime';

describe('resolveApiBaseUrl', () => {
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
});
