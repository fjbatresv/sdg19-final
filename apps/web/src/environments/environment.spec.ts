import { environment as devEnvironment } from './environment';
import { environment as prodEnvironment } from './environment.prod';

describe('environment configs', () => {
  it('defines API base URLs', () => {
    const devUrl = new URL(devEnvironment.apiBaseUrl);
    const prodUrl = new URL(prodEnvironment.apiBaseUrl);

    expect(devUrl.protocol).toMatch(/^https?:$/);
    expect(prodUrl.protocol).toBe('https:');
    expect(devEnvironment.apiBaseUrl.endsWith('/')).toBe(false);
    expect(prodEnvironment.apiBaseUrl.endsWith('/')).toBe(false);
  });
});
