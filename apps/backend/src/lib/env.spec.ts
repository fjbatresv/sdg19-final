import { describe, it, expect } from 'vitest';
import { requireEnv } from './env';

describe('requireEnv', () => {
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
