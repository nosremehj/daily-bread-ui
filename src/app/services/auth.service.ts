import { isPlatformBrowser } from '@angular/common';
import { HttpBackend, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  AuthResponse,
  ChangePasswordBody,
  ProfileUpdateResponse,
  UpdateProfileBody,
  UserResponse
} from '../models/auth.model';

const STORAGE_ACCESS = 'daily_access_token';
const STORAGE_REFRESH = 'daily_refresh_token';
const STORAGE_USER = 'daily_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly rawHttp = new HttpClient(inject(HttpBackend));
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  private readonly baseUrl = `${environment.apiUrl}/api/v1`;

  readonly user = signal<UserResponse | null>(null);

  private accessTokenValue: string | null = null;
  private refreshTokenValue: string | null = null;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.hydrateFromStorage();
    }
  }

  getAccessToken(): string | null {
    return this.accessTokenValue;
  }

  getRefreshToken(): string | null {
    return this.refreshTokenValue;
  }

  isAuthenticated(): boolean {
    return this.accessTokenValue != null || this.refreshTokenValue != null;
  }

  hydrateFromStorage(): void {
    try {
      const access = localStorage.getItem(STORAGE_ACCESS);
      const refresh = localStorage.getItem(STORAGE_REFRESH);
      const userJson = localStorage.getItem(STORAGE_USER);
      this.accessTokenValue = access;
      this.refreshTokenValue = refresh;
      if (userJson) {
        this.user.set(JSON.parse(userJson) as UserResponse);
      }
    } catch {
      this.clearSession();
    }
  }

  getFirstName(): string {
    const name = this.user()?.name?.trim();
    if (!name) return 'Visitante';
    return name.split(/\s+/)[0] ?? 'Visitante';
  }

  private syncUser(u: UserResponse): void {
    this.user.set(u);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_USER, JSON.stringify(u));
    }
  }

  persistSession(res: AuthResponse): void {
    this.accessTokenValue = res.accessToken;
    this.refreshTokenValue = res.refreshToken;
    this.syncUser(res.user);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_ACCESS, res.accessToken);
      localStorage.setItem(STORAGE_REFRESH, res.refreshToken);
    }
  }

  clearSession(): void {
    this.accessTokenValue = null;
    this.refreshTokenValue = null;
    this.user.set(null);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(STORAGE_ACCESS);
      localStorage.removeItem(STORAGE_REFRESH);
      localStorage.removeItem(STORAGE_USER);
    }
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/login`, { username, password })
      .pipe(tap((res) => this.persistSession(res)));
  }

  register(body: {
    name: string;
    email: string;
    username: string;
    password: string;
  }): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/register`, body)
      .pipe(tap((res) => this.persistSession(res)));
  }

  /** Sem interceptors — usado pelo interceptor e internamente. */
  refreshSession(): Observable<string> {
    const rt = this.refreshTokenValue;
    if (!rt) {
      return throwError(() => new Error('Sem refresh token'));
    }
    return this.rawHttp
      .post<AuthResponse>(`${this.baseUrl}/auth/refresh`, { refreshToken: rt })
      .pipe(
        tap((res) => this.persistSession(res)),
        map((res) => res.accessToken),
        catchError((err: HttpErrorResponse) => {
          this.clearSession();
          return throwError(() => err);
        })
      );
  }

  fetchProfile(): Observable<UserResponse | null> {
    if (!this.isAuthenticated()) {
      return of(null);
    }
    return this.http.get<UserResponse>(`${this.baseUrl}/auth/me`).pipe(
      tap((u) => this.syncUser(u)),
      catchError(() => of(null))
    );
  }

  /**
   * Atualiza perfil (`PATCH /api/v1/auth/me`).
   * Persiste `user`; se vier `newSession` (username alterado), renova tokens como no login.
   */
  updateProfile(body: UpdateProfileBody): Observable<ProfileUpdateResponse> {
    return this.http
      .patch<ProfileUpdateResponse>(`${this.baseUrl}/auth/me`, body)
      .pipe(
        tap((res) => {
          this.syncUser(res.user);
          if (res.newSession) {
            this.persistSession(res.newSession);
          }
        }),
        catchError((err: HttpErrorResponse) => this.mapApiError(err))
      );
  }

  /**
   * Troca a senha; resposta é `AuthResponse` — substitui sessão no storage.
   */
  changePassword(body: ChangePasswordBody): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/change-password`, body)
      .pipe(
        tap((res) => this.persistSession(res)),
        catchError((err: HttpErrorResponse) => this.mapApiError(err))
      );
  }

  private mapApiError(err: HttpErrorResponse): Observable<never> {
    const body = err.error as { error?: string } | undefined;
    const message =
      typeof body?.error === 'string' && body.error.length > 0
        ? body.error
        : this.transloco.translate('common.errors.generic');
    return throwError(() => new Error(message));
  }

  logout(): void {
    this.clearSession();
    void this.router.navigate(['/login']);
  }
}
