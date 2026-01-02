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
import { getExpiresAt } from './auth.utils';

/**
 * Token response returned by the auth API.
 */
interface AuthResponse {
  /**
   * User identifier returned by Cognito.
   */
  userId?: string;
  /**
   * Access token for API requests.
   */
  accessToken?: string;
  /**
   * ID token with profile claims.
   */
  idToken?: string;
  /**
   * Refresh token for session renewal.
   */
  refreshToken?: string;
  /**
   * Expiration time (seconds) for the tokens.
   */
  expiresIn?: number;
}

/**
 * Persisted auth session used by the UI.
 */
interface AuthSession {
  /**
   * Cognito user id.
   */
  userId?: string;
  /**
   * User email address.
   */
  email?: string;
  /**
   * Display name.
   */
  name?: string;
  /**
   * Access token for API calls.
   */
  accessToken?: string;
  /**
   * ID token used for auth guard.
   */
  idToken?: string;
  /**
   * Refresh token used to renew the session.
   */
  refreshToken?: string;
  /**
   * Expiration time (seconds) for the tokens.
   */
  expiresIn?: number;
  /**
   * Absolute expiry timestamp in milliseconds.
   */
  expiresAt?: number;
}

/**
 * SessionStorage key used to persist the auth session.
 */
const STORAGE_KEY = 'sdg19.auth';

/**
 * Manages authentication state and token refresh for the frontend.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  /**
   * Http client for authenticated requests.
   */
  private readonly http = inject(HttpClient);
  /**
   * Raw HTTP client bypassing interceptors for refresh.
   */
  private readonly rawHttp = new HttpClient(inject(HttpBackend));
  /**
   * Base URL for the auth API.
   */
  private readonly apiBase = inject(API_BASE_URL);
  /**
   * Subject holding the latest session state.
   */
  private readonly sessionSubject = new BehaviorSubject<AuthSession | null>(
    this.loadSession()
  );
  /**
   * In-flight refresh request to deduplicate calls.
   */
  private refreshRequest?: Observable<AuthSession | null>;

  /**
   * Observable of the current auth session (or null).
   */
  session$ = this.sessionSubject.asObservable();

  /**
   * Authenticate a user with email/password and persist the session.
   */
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

  /**
   * Register a new user and persist the session on success.
   */
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

  /**
   * Clears local session state and storage.
   */
  logout() {
    sessionStorage.removeItem(STORAGE_KEY);
    this.sessionSubject.next(null);
  }

  /**
   * Returns true when an ID token is available in memory.
   */
  isAuthenticated() {
    return Boolean(this.sessionSubject.value?.idToken);
  }

  /**
   * Returns the current ID token if present.
   */
  getIdToken() {
    return this.sessionSubject.value?.idToken;
  }

  /**
   * Returns a valid ID token, refreshing if needed.
   */
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

  /**
   * Refreshes the session using the stored refresh token.
   */
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

  /**
   * Builds and persists a session from the auth response.
   */
  private persistSession(
    response: AuthResponse,
    meta: { email?: string; name?: string; refreshToken?: string }
  ) {
    const expiresAt = getExpiresAt(response.idToken, response.expiresIn);
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
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return session;
  }

  /**
   * Loads any persisted session from local storage.
   */
  private loadSession(): AuthSession | null {
    const raw = sessionStorage.getItem(STORAGE_KEY);
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
