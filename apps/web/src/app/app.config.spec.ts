import { appConfig } from './app.config';
import { appRoutes } from './app.routes';
import { API_BASE_URL } from './app.tokens';

describe('app configuration', () => {
  it('exposes app routes', () => {
    expect(appRoutes.length).toBeGreaterThan(0);
  });

  it('provides the API base URL token', () => {
    const provider = appConfig.providers.find(
      (entry) =>
        typeof entry === 'object' &&
        entry !== null &&
        'provide' in entry &&
        (entry as { provide: unknown }).provide === API_BASE_URL
    ) as { useValue?: string } | undefined;

    expect(provider?.useValue).toBeTruthy();
  });
});
