import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { decodeJwtPayload, getExpiresAt } from './auth.utils';
import { API_BASE_URL } from '../app.tokens';
import { firstValueFrom } from 'rxjs';

const buildJwt = (expSeconds: number) => {
  const payload = btoa(JSON.stringify({ exp: expSeconds })).replaceAll(
    '+',
    '-'
  ).replaceAll('/', '_');
  return `header.${payload}.sig`;
};

describe('AuthService', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: API_BASE_URL,
          useValue: 'http://api.test',
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('logs in and persists the session', async () => {
    const service = TestBed.inject(AuthService);
    const login$ = firstValueFrom(
      service.login('user@test.com', 'Password!123')
    );

    const request = httpMock.expectOne('http://api.test/auth/login');
    request.flush({
      userId: 'user-1',
      accessToken: 'access',
      idToken: buildJwt(Math.floor(Date.now() / 1000) + 3600),
      refreshToken: 'refresh',
      expiresIn: 3600,
    });

    const session = await login$;
    expect(session.userId).toBe('user-1');
    expect(sessionStorage.getItem('sdg19.auth')).toContain('access');
  });

  it('persists expiresAt from expiresIn when token is malformed', async () => {
    const service = TestBed.inject(AuthService);
    const login$ = firstValueFrom(service.login('user@test.com', 'Password!123'));

    const request = httpMock.expectOne('http://api.test/auth/login');
    request.flush({
      userId: 'user-1',
      accessToken: 'access',
      idToken: 'malformed-token',
      refreshToken: 'refresh',
      expiresIn: 3600,
    });

    const session = await login$;
    expect(session.expiresAt).toBeTypeOf('number');
  });

  it('registers and stores the session', async () => {
    const service = TestBed.inject(AuthService);
    const register$ = firstValueFrom(
      service.register('User', 'user@test.com', 'Password!123')
    );

    const request = httpMock.expectOne('http://api.test/auth/register');
    request.flush({
      userId: 'user-2',
      accessToken: 'access',
      idToken: buildJwt(Math.floor(Date.now() / 1000) + 3600),
      refreshToken: 'refresh',
      expiresIn: 3600,
    });

    const session = await register$;
    expect(session.userId).toBe('user-2');
  });

  it('returns a valid token without refreshing', async () => {
    const session = {
      idToken: 'id-token',
      expiresAt: Date.now() + 3600_000,
    };
    sessionStorage.setItem('sdg19.auth', JSON.stringify(session));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: API_BASE_URL,
          useValue: 'http://api.test',
        },
      ],
    });
    const freshService = TestBed.inject(AuthService);
    const token = await firstValueFrom(freshService.getValidIdToken$());
    expect(token).toBe('id-token');
  });

  it('exposes auth state helpers', () => {
    sessionStorage.setItem(
      'sdg19.auth',
      JSON.stringify({
        idToken: 'id-token',
        expiresAt: Date.now() + 3600_000,
      })
    );
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: API_BASE_URL,
          useValue: 'http://api.test',
        },
      ],
    });
    const service = TestBed.inject(AuthService);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.getIdToken()).toBe('id-token');
  });

  it('refreshes the session when expired', async () => {
    sessionStorage.setItem(
      'sdg19.auth',
      JSON.stringify({
        idToken: 'expired',
        refreshToken: 'refresh',
        expiresAt: Date.now() - 1000,
      })
    );

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: API_BASE_URL,
          useValue: 'http://api.test',
        },
      ],
    });
    const freshService = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    const tokenPromise = firstValueFrom(freshService.getValidIdToken$());

    const request = httpMock.expectOne('http://api.test/auth/refresh');
    request.flush({
      accessToken: 'new-access',
      idToken: buildJwt(Math.floor(Date.now() / 1000) + 3600),
      refreshToken: 'refresh',
      expiresIn: 3600,
    });

    const token = await tokenPromise;
    expect(token).toBeTruthy();
  });

  it('returns null when not authenticated', async () => {
    const service = TestBed.inject(AuthService);
    const token = await firstValueFrom(service.getValidIdToken$());
    expect(token).toBeNull();
  });

  it('returns null when refresh fails', async () => {
    sessionStorage.setItem(
      'sdg19.auth',
      JSON.stringify({
        idToken: 'expired',
        refreshToken: 'refresh',
        expiresAt: Date.now() - 1000,
      })
    );

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: API_BASE_URL,
          useValue: 'http://api.test',
        },
      ],
    });
    const freshService = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    const tokenPromise = firstValueFrom(freshService.getValidIdToken$());

    const request = httpMock.expectOne('http://api.test/auth/refresh');
    request.flush({ message: 'fail' }, { status: 500, statusText: 'Error' });

    const token = await tokenPromise;
    expect(token).toBeNull();
  });

  it('logs out when refresh token is missing', async () => {
    sessionStorage.setItem(
      'sdg19.auth',
      JSON.stringify({
        idToken: 'expired',
        expiresAt: Date.now() - 1000,
      })
    );

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: API_BASE_URL,
          useValue: 'http://api.test',
        },
      ],
    });
    const freshService = TestBed.inject(AuthService);
    const token = await firstValueFrom(freshService.getValidIdToken$());
    expect(token).toBeNull();
    expect(sessionStorage.getItem('sdg19.auth')).toBeNull();
  });

  it('reuses in-flight refresh requests', async () => {
    sessionStorage.setItem(
      'sdg19.auth',
      JSON.stringify({
        idToken: 'expired',
        refreshToken: 'refresh',
        expiresAt: Date.now() - 1000,
      })
    );

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: API_BASE_URL,
          useValue: 'http://api.test',
        },
      ],
    });
    const freshService = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    const tokenPromise = firstValueFrom(freshService.getValidIdToken$());
    const tokenPromise2 = firstValueFrom(freshService.getValidIdToken$());

    const request = httpMock.expectOne('http://api.test/auth/refresh');
    request.flush({
      accessToken: 'new-access',
      idToken: buildJwt(Math.floor(Date.now() / 1000) + 3600),
      refreshToken: 'refresh',
      expiresIn: 3600,
    });

    await tokenPromise;
    await tokenPromise2;
  });

  it('logs out when refresh token is missing', async () => {
    sessionStorage.setItem(
      'sdg19.auth',
      JSON.stringify({
        idToken: buildJwt(Math.floor(Date.now() / 1000) - 10),
        expiresAt: Date.now() - 1000,
      })
    );
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: API_BASE_URL,
          useValue: 'http://api.test',
        },
      ],
    });
    const service = TestBed.inject(AuthService);

    const token = await firstValueFrom(service.getValidIdToken$());
    expect(token).toBeNull();
    expect(sessionStorage.getItem('sdg19.auth')).toBeNull();
  });

  it('returns undefined expiry when no token info exists', () => {
    expect(getExpiresAt()).toBeUndefined();
  });

  it('handles malformed jwt payloads', () => {
    expect(decodeJwtPayload('bad')).toBeNull();
  });

  it('clears session on logout', () => {
    const service = TestBed.inject(AuthService);
    sessionStorage.setItem(
      'sdg19.auth',
      JSON.stringify({ idToken: 'token', expiresAt: Date.now() + 1000 })
    );
    service.logout();
    expect(sessionStorage.getItem('sdg19.auth')).toBeNull();
  });

  it('ignores invalid persisted JSON', () => {
    sessionStorage.setItem('sdg19.auth', '{invalid');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        {
          provide: API_BASE_URL,
          useValue: 'http://api.test',
        },
      ],
    });
    const service = TestBed.inject(AuthService);
    expect(service.getIdToken()).toBeUndefined();
  });
});
