import { environment as devEnvironment } from './environment';
import { environment as prodEnvironment } from './environment.prod';

describe('environment configs', () => {
  it('defines API base URLs', () => {
    const devUrl = new URL(devEnvironment.apiBaseUrl);
    const prodUrl = new URL(prodEnvironment.apiBaseUrl);
    const domainPattern = /^[a-z0-9.-]+(?::\d+)?$/i;

    expect(devUrl.protocol).toMatch(/^https?:$/);
    expect(prodUrl.protocol).toBe('https:');
    expect(devEnvironment.apiBaseUrl.endsWith('/')).toBe(false);
    expect(prodEnvironment.apiBaseUrl.endsWith('/')).toBe(false);
    expect(typeof devEnvironment.frontendDomain).toBe('string');
    expect(typeof prodEnvironment.frontendDomain).toBe('string');
    expect(devEnvironment.frontendDomain.length).toBeGreaterThan(0);
    expect(prodEnvironment.frontendDomain.length).toBeGreaterThan(0);
    expect(devEnvironment.frontendDomain).toMatch(domainPattern);
    expect(prodEnvironment.frontendDomain).toMatch(domainPattern);
    expect(devEnvironment.frontendDomain.endsWith('/')).toBe(false);
    expect(prodEnvironment.frontendDomain.endsWith('/')).toBe(false);
  });
});
