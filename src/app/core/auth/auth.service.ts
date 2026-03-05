import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'operator' | 'viewer';
  avatar?: string;
  permissions: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly TOKEN_KEY = 'zcop_admin_token';
  private readonly USER_KEY = 'zcop_admin_user';
  private readonly baseUrl = environment.apiUrl;

  private _user = signal<User | null>(this.loadUserFromStorage());
  private _isAuthenticated = signal<boolean>(this.hasValidToken());

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  readonly isAdmin = computed(() => this._user()?.role === 'admin');
  readonly userPermissions = computed(() => this._user()?.permissions ?? []);

  constructor(private router: Router) {
    this.checkAuthStatus();
  }

  private loadUserFromStorage(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  private hasValidToken(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  private checkAuthStatus(): void {
    if (this.hasValidToken()) {
      this._isAuthenticated.set(true);
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  setAuth(token: string, user: User): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this._user.set(user);
    this._isAuthenticated.set(true);
  }

  /** @deprecated use setAuth + real loginWithCredentials instead */
  login(token: string, user: User): void {
    this.setAuth(token, user);
  }

  loginWithCredentials(usernameOrEmail: string, password: string, rememberMe = false): Observable<boolean> {
    return this.http.post<any>(`${this.baseUrl}/api/auth/login`, { usernameOrEmail, password, rememberMe }).pipe(
      map(res => {
        const data = res?.data ?? res;
        const token = data?.token ?? data?.accessToken;
        const userData = data?.user ?? data;
        if (token) {
          const user: User = {
            id: userData?.id ?? '',
            email: userData?.email ?? usernameOrEmail,
            name: userData?.name ?? userData?.displayName ?? usernameOrEmail,
            role: (userData?.role ?? 'admin').toLowerCase() as any,
            avatar: userData?.avatar ?? userData?.profileImage,
            permissions: userData?.permissions ?? []
          };
          this.setAuth(token, user);
          return true;
        }
        return false;
      }),
      catchError(() => of(false))
    );
  }

  logout(): void {
    const token = this.getToken();
    if (token) {
      this.http.post(`${this.baseUrl}/api/auth/logout`, {}).pipe(catchError(() => of(null))).subscribe();
    }
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._user.set(null);
    this._isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  validateToken(): Observable<boolean> {
    return this.http.get<any>(`${this.baseUrl}/api/auth/validate`).pipe(
      map(res => res?.success !== false),
      catchError(() => of(false))
    );
  }

  fetchCurrentUser(): Observable<User | null> {
    return this.http.get<any>(`${this.baseUrl}/api/auth/me`).pipe(
      map(res => {
        const d = res?.data ?? res;
        if (!d) return null;
        const user: User = {
          id: d.id ?? '',
          email: d.email ?? '',
          name: d.name ?? d.displayName ?? '',
          role: (d.role ?? 'viewer').toLowerCase() as any,
          avatar: d.avatar ?? d.profileImage,
          permissions: d.permissions ?? []
        };
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        this._user.set(user);
        return user;
      }),
      catchError(() => of(null))
    );
  }

  hasPermission(permission: string): boolean {
    return this._user()?.permissions.includes(permission) ?? false;
  }

  hasAnyPermission(permissions: string[]): boolean {
    const userPerms = this._user()?.permissions ?? [];
    return permissions.some(p => userPerms.includes(p));
  }
}
