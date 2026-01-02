import { environment as devEnvironment } from './environment';
import { environment as prodEnvironment } from './environment.prod';

describe('environment configs', () => {
  it('defines API base URLs', () => {
    expect(devEnvironment.apiBaseUrl).toContain('http');
    expect(prodEnvironment.apiBaseUrl).toContain('http');
  });
});
