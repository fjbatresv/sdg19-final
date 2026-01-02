import { describe, it, expect, afterEach } from 'vitest';
import { requireEnv } from './env';

describe('requireEnv', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    for (const [key, value] of Object.entries(originalEnv)) {
      process.env[key] = value;
    }
  });

  it('returns the environment value when set', () => {
    process.env.TEST_ENV = 'value';
    expect(requireEnv('TEST_ENV')).toBe('value');
  });

  it('throws when value is missing', () => {
    delete process.env.MISSING_ENV;
    expect(() => requireEnv('MISSING_ENV')).toThrowError(
      /Missing environment variable/
    );
  });

  it('treats empty strings as missing', () => {
    process.env.EMPTY_ENV = '';
    expect(() => requireEnv('EMPTY_ENV')).toThrowError(
      /Missing environment variable/
    );
  });
});
