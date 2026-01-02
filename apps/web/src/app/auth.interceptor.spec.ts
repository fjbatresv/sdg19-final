import { HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { vi } from 'vitest';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './services/auth.service';

describe('authInterceptor', () => {
  it('adds bearer token when available', async () => {
    const next = vi.fn(
      (req: HttpRequest<unknown>) => of(new HttpResponse({ body: req }))
    );
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { getValidIdToken$: () => of('token-123') },
        },
      ],
    });

    const req = new HttpRequest('GET', '/test');
    const response$ = TestBed.runInInjectionContext(() =>
      authInterceptor(req, next)
    );

    await firstValueFrom(response$);
    const calledRequest = next.mock.calls[0][0] as HttpRequest<unknown>;
    expect(calledRequest.headers.get('authorization')).toBe('Bearer token-123');
  });

  it('keeps request unchanged without token', async () => {
    const next = vi.fn(
      (req: HttpRequest<unknown>) => of(new HttpResponse({ body: req }))
    );
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { getValidIdToken$: () => of(null) },
        },
      ],
    });

    const req = new HttpRequest('GET', '/test');
    const response$ = TestBed.runInInjectionContext(() =>
      authInterceptor(req, next)
    );

    await firstValueFrom(response$);
    const calledRequest = next.mock.calls[0][0] as HttpRequest<unknown>;
    expect(calledRequest.headers.has('authorization')).toBe(false);
  });
});
