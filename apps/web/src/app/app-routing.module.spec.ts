import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Location } from '@angular/common';
import { AppRoutingModule } from './app-routing.module';
import { appRoutes } from './app.routes';
import { authGuard } from './auth.guard';
import { API_BASE_URL } from './app.tokens';
import { AuthService } from './services/auth.service';

describe('AppRoutingModule', () => {
  it('configures expected routes', () => {
    TestBed.configureTestingModule({
      imports: [AppRoutingModule, RouterTestingModule.withRoutes(appRoutes)],
    });
    const router = TestBed.inject(Router);
    const routes = router.config;

    expect(routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '',
          redirectTo: 'shop',
          pathMatch: 'full',
        }),
        expect.objectContaining({ path: 'login' }),
        expect.objectContaining({ path: 'register' }),
        expect.objectContaining({ path: 'shop' }),
        expect.objectContaining({ path: 'orders' }),
        expect.objectContaining({ path: '**', redirectTo: 'shop' }),
      ])
    );

    const shopRoute = routes.find((route) => route.path === 'shop');
    const ordersRoute = routes.find((route) => route.path === 'orders');
    expect(shopRoute?.canActivate).toContain(authGuard);
    expect(ordersRoute?.canActivate).toContain(authGuard);
  });

  it('redirects empty path to the shop route', async () => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes(appRoutes)],
      providers: [
        { provide: API_BASE_URL, useValue: 'https://example.com' },
        { provide: AuthService, useValue: { isAuthenticated: () => true } },
      ],
    });
    const router = TestBed.inject(Router);
    const location = TestBed.inject(Location);

    await router.navigateByUrl('');

    expect(location.path()).toBe('/shop');
  });

  it('redirects unauthenticated users to login', async () => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes(appRoutes)],
      providers: [
        { provide: API_BASE_URL, useValue: 'https://example.com' },
        { provide: AuthService, useValue: { isAuthenticated: () => false } },
      ],
    });
    const router = TestBed.inject(Router);
    const location = TestBed.inject(Location);

    await router.navigateByUrl('/shop');

    expect(location.path()).toBe('/login');
  });
});
