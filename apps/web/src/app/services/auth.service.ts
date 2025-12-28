import { HttpBackend, HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  BehaviorSubject,
  catchError,
  finalize,
  map,
  Observable,
  of,
  shareReplay,
  tap,
} from 'rxjs';
import { API_BASE_URL } from '../app.tokens';

type AuthResponse = {
  userId?: string;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn?: number;
};

type AuthSession = {
  userId?: string;
  email?: string;
  name?: string;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  expiresAt?: number;
};

const STORAGE_KEY = 'sdg19.auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private rawHttp = new HttpClient(inject(HttpBackend));
  private apiBase = inject(API_BASE_URL);
  private sessionSubject = new BehaviorSubject<AuthSession | null>(
    this.loadSession()
  );
  private refreshRequest?: Observable<AuthSession | null>;

  session$ = this.sessionSubject.asObservable();

  login(email: string, password: string) {
    return this.http
      .post<AuthResponse>(`${this.apiBase}/auth/login`, {
        email,
        password,
      })
      .pipe(
        map((response) => this.persistSession(response, { email })),
        tap((session) => this.sessionSubject.next(session))
      );
  }

  register(name: string, email: string, password: string) {
    return this.http
      .post<AuthResponse>(`${this.apiBase}/auth/register`, {
        name,
        email,
        password,
      })
      .pipe(
        map((response) => this.persistSession(response, { email, name })),
        tap((session) => this.sessionSubject.next(session))
      );
  }

  logout() {
    localStorage.removeItem(STORAGE_KEY);
    this.sessionSubject.next(null);
  }

  isAuthenticated() {
    return Boolean(this.sessionSubject.value?.idToken);
  }

  getIdToken() {
    return this.sessionSubject.value?.idToken;
  }

  getValidIdToken$() {
    const session = this.sessionSubject.value;
    if (!session?.idToken) {
      return of(null);
    }
    const expiresAt = session.expiresAt;
    const needsRefresh =
      typeof expiresAt === 'number' && expiresAt <= Date.now() + 60000;
    if (!needsRefresh) {
      return of(session.idToken);
    }
    if (!session.refreshToken) {
      this.logout();
      return of(null);
    }
    return this.refreshSession().pipe(
      map((nextSession) => nextSession?.idToken ?? null)
    );
  }

  private refreshSession() {
    if (this.refreshRequest) {
      return this.refreshRequest;
    }
    const session = this.sessionSubject.value;
    if (!session?.refreshToken) {
      return of(null);
    }
    this.refreshRequest = this.rawHttp
      .post<AuthResponse>(`${this.apiBase}/auth/refresh`, {
        refreshToken: session.refreshToken,
      })
      .pipe(
        map((response) =>
          this.persistSession(response, {
            email: session.email,
            name: session.name,
            refreshToken: session.refreshToken,
          })
        ),
        tap((nextSession) => this.sessionSubject.next(nextSession)),
        catchError(() => {
          this.logout();
          return of(null);
        }),
        finalize(() => {
          this.refreshRequest = undefined;
        }),
        shareReplay(1)
      );
    return this.refreshRequest;
  }

  private persistSession(
    response: AuthResponse,
    meta: { email?: string; name?: string; refreshToken?: string }
  ) {
    const expiresAt = this.getExpiresAt(
      response.idToken,
      response.expiresIn
    );
    const session: AuthSession = {
      userId: response.userId,
      accessToken: response.accessToken,
      idToken: response.idToken,
      refreshToken: response.refreshToken ?? meta.refreshToken,
      expiresIn: response.expiresIn,
      expiresAt,
      email: meta.email,
      name: meta.name,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return session;
  }

  private getExpiresAt(idToken?: string, expiresIn?: number) {
    if (idToken) {
      const payload = this.decodeJwtPayload(idToken);
      if (payload?.exp) {
        return payload.exp * 1000;
      }
    }
    if (expiresIn) {
      return Date.now() + expiresIn * 1000;
    }
    return undefined;
  }

  private decodeJwtPayload(token: string) {
    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }
    try {
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(payload);
      return JSON.parse(decoded) as { exp?: number };
    } catch {
      return null;
    }
  }

  private loadSession(): AuthSession | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      return null;
    }
  }
}
