import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from './services/auth.service';

describe('authGuard', () => {
  it('allows authenticated users', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { isAuthenticated: () => true },
        },
        provideRouter([]),
      ],
    });

    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/shop' } as RouterStateSnapshot;
    const result = TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(result).toBe(true);
  });

  it('redirects unauthenticated users', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { isAuthenticated: () => false },
        },
        provideRouter([]),
      ],
    });
    const router = TestBed.inject(Router);
    const urlTree = router.createUrlTree(['/login']);

    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/shop' } as RouterStateSnapshot;
    const result = TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(result).toEqual(urlTree as UrlTree);
  });
});
