import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
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
        {
          provide: Router,
          useValue: { createUrlTree: () => ({}) },
        },
      ],
    });

    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/shop' } as RouterStateSnapshot;
    const result = TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(result).toBe(true);
  });

  it('redirects unauthenticated users', () => {
    const urlTree = { url: '/login' };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { isAuthenticated: () => false },
        },
        {
          provide: Router,
          useValue: { createUrlTree: () => urlTree },
        },
      ],
    });

    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/shop' } as RouterStateSnapshot;
    const result = TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(result).toBe(urlTree);
  });
});
