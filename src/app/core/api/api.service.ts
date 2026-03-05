import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, forkJoin, of } from 'rxjs';
import { timeout, retry, catchError, finalize, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ============================================
// Interfaces & Types
// ============================================

export interface ApiRequestOptions {
  headers?: HttpHeaders | { [header: string]: string | string[] };
  params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> };
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
  withCredentials?: boolean;
  timeout?: number;
  retries?: number;
  showLoader?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: any;
  statusCode?: number;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalProblems: number;
  totalSubmissions: number;
  successRate: number;
  activeContests: number;
  pendingTickets: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  uptime: string;
  lastUpdated: Date;
}

export interface RecentActivity {
  id: string;
  type: 'submission' | 'user' | 'problem' | 'contest' | 'alert' | 'error' | 'system';
  message: string;
  timestamp: Date;
  severity?: 'info' | 'warning' | 'error' | 'success';
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    fill?: boolean;
    tension?: number;
  }[];
}

// ============================================
// Service
// ============================================

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;
  
  // Loading state management
  private loadingSubject = new BehaviorSubject<boolean>(false);
  public loading$ = this.loadingSubject.asObservable();
  private requestCount = 0;

  // Signals for reactive state
  readonly isLoading = signal(false);

  // Default configuration
  private defaultOptions: ApiRequestOptions = {
    timeout: 30000,
    retries: 1,
    showLoader: true,
    responseType: 'json',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  // ============================================
  // Generic HTTP Methods
  // ============================================

  get<T = any>(endpoint: string, options?: ApiRequestOptions): Observable<T> {
    return this.makeRequest<T>('GET', endpoint, null, options);
  }

  post<T = any>(endpoint: string, data?: any, options?: ApiRequestOptions): Observable<T> {
    return this.makeRequest<T>('POST', endpoint, data, options);
  }

  put<T = any>(endpoint: string, data?: any, options?: ApiRequestOptions): Observable<T> {
    return this.makeRequest<T>('PUT', endpoint, data, options);
  }

  patch<T = any>(endpoint: string, data?: any, options?: ApiRequestOptions): Observable<T> {
    return this.makeRequest<T>('PATCH', endpoint, data, options);
  }

  delete<T = any>(endpoint: string, options?: ApiRequestOptions): Observable<T> {
    return this.makeRequest<T>('DELETE', endpoint, null, options);
  }

  upload<T = any>(endpoint: string, file: File, additionalData?: any, options?: ApiRequestOptions): Observable<T> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });
    }

    const uploadOptions = {
      ...options,
      headers: { 'Accept': 'application/json' }
    };

    return this.makeRequest<T>('POST', endpoint, formData, uploadOptions);
  }

  download(endpoint: string, filename?: string, options?: ApiRequestOptions): Observable<Blob> {
    return this.makeRequest<Blob>('GET', endpoint, null, { ...options, responseType: 'blob' as const });
  }

  getPaginated<T = any>(
    endpoint: string, 
    page: number = 1, 
    limit: number = 10, 
    filters?: any, 
    options?: ApiRequestOptions
  ): Observable<PaginatedResponse<T>> {
    const params = { page: page.toString(), limit: limit.toString(), ...filters };
    return this.makeRequest<PaginatedResponse<T>>('GET', endpoint, null, { ...options, params });
  }

  // ============================================
  // Private Request Handler
  // ============================================

  private makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    data?: any,
    options?: ApiRequestOptions
  ): Observable<T> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const url = this.buildUrl(endpoint);
    
    if (mergedOptions.showLoader) this.showLoader();

    // Use 'any' to avoid strict typing issues with responseType overloads
    // Build HTTP options
    const httpOptions: {
      headers: HttpHeaders;
      params?: HttpParams;
      responseType?: any;
      withCredentials?: boolean;
      observe?: any;
    } = {
      headers: this.buildHeaders(mergedOptions.headers),
      observe: 'body' as const
    };


    if (mergedOptions.params) httpOptions.params = this.buildParams(mergedOptions.params);
    if (mergedOptions.responseType) httpOptions.responseType = mergedOptions.responseType;
    if (mergedOptions.withCredentials) httpOptions.withCredentials = true;

    let request$: Observable<T>;
    switch (method) {
      case 'GET': request$ = this.http.get<T>(url, httpOptions) ; break;
      case 'POST': request$ = this.http.post<T>(url, data, httpOptions); break;
      case 'PUT': request$ = this.http.put<T>(url, data, httpOptions); break;
      case 'PATCH': request$ = this.http.patch<T>(url, data, httpOptions); break;
      case 'DELETE': request$ = this.http.delete<T>(url, httpOptions); break;
      default: throw new Error(`Unsupported HTTP method: ${method}`);
    }

    return request$.pipe(
      timeout(mergedOptions.timeout!),
      retry(mergedOptions.retries!),
      catchError((error: HttpErrorResponse) => this.handleError(error, endpoint, method)),
      finalize(() => { if (mergedOptions.showLoader) this.hideLoader(); })
    );
  }

  private buildUrl(endpoint: string): string {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) return endpoint;
    if (endpoint.startsWith('/')) return `${this.baseUrl}${endpoint}`;
    return `${this.baseUrl}/${endpoint}`;
  }

  private buildHeaders(headers?: HttpHeaders | { [header: string]: string | string[] }): HttpHeaders {
    let httpHeaders = new HttpHeaders();
    Object.entries(this.defaultOptions.headers!).forEach(([key, value]) => {
      httpHeaders = httpHeaders.set(key, value as string);
    });

    const token = this.getAuthToken();
    if (token) httpHeaders = httpHeaders.set('Authorization', `Bearer ${token}`);

    if (headers) {
      if (headers instanceof HttpHeaders) {
        headers.keys().forEach(key => {
          const value = headers.get(key);
          if (value) httpHeaders = httpHeaders.set(key, value);
        });
      } else {
        Object.entries(headers).forEach(([key, value]) => {
          httpHeaders = httpHeaders.set(key, value as string);
        });
      }
    }
    return httpHeaders;
  }

  private buildParams(params?: HttpParams | { [param: string]: any }): HttpParams {
    let httpParams = new HttpParams();
    if (params) {
      if (params instanceof HttpParams) return params;
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => httpParams = httpParams.append(key, v.toString()));
          } else {
            httpParams = httpParams.set(key, value.toString());
          }
        }
      });
    }
    return httpParams;
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('zcop_admin_token') || null;
  }

  private handleError(error: HttpErrorResponse, endpoint: string, method: string): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    let errorCode = 'UNKNOWN_ERROR';

    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
      errorCode = 'CLIENT_ERROR';
    } else {
      errorCode = `HTTP_${error.status}`;
      switch (error.status) {
        case 0: errorMessage = 'Network error. Please check your connection.'; errorCode = 'NETWORK_ERROR'; break;
        case 400: errorMessage = error.error?.message || 'Bad request.'; break;
        case 401: errorMessage = 'Unauthorized. Please login again.'; this.handleUnauthorized(); break;
        case 403: errorMessage = 'Forbidden. Access denied.'; break;
        case 404: errorMessage = 'Resource not found.'; break;
        case 422: errorMessage = error.error?.message || 'Validation error.'; break;
        case 429: errorMessage = 'Too many requests. Slow down.'; break;
        case 500: errorMessage = 'Server error. Please try again.'; break;
        case 502: errorMessage = 'Bad gateway.'; break;
        case 503: errorMessage = 'Service unavailable.'; break;
        default: errorMessage = error.error?.message || `HTTP Error ${error.status}`;
      }
    }

    console.error(`API Error [${method} ${endpoint}]:`, { status: error.status, message: errorMessage });
    return throwError(() => ({ success: false, error: { code: errorCode, message: errorMessage, status: error.status } }));
  }

  private handleUnauthorized(): void {
    localStorage.removeItem('zcop_admin_token');
    localStorage.removeItem('zcop_admin_user');
    if (!window.location.pathname.includes('login')) {
      window.location.href = '/login';
    }
  }

  private showLoader(): void {
    this.requestCount++;
    if (this.requestCount === 1) {
      this.loadingSubject.next(true);
      this.isLoading.set(true);
    }
  }

  private hideLoader(): void {
    this.requestCount--;
    if (this.requestCount <= 0) {
      this.requestCount = 0;
      this.loadingSubject.next(false);
      this.isLoading.set(false);
    }
  }

  // ============================================
  // Dashboard APIs — Real backend calls
  // ============================================

  getDashboardStats(): Observable<DashboardStats> {
    return this.get<any>('/zcop/api/submission/analytics/dashboard').pipe(
      map(res => {
        const d = res?.data ?? res;
        return {
          totalUsers: d.totalUsers ?? 0,
          activeUsers: d.activeUsers ?? 0,
          totalProblems: d.totalProblems ?? 0,
          totalSubmissions: d.totalSubmissions ?? 0,
          successRate: d.successRate ?? d.acceptanceRate ?? 0,
          activeContests: d.activeContests ?? 0,
          pendingTickets: d.pendingTickets ?? 0,
          systemHealth: d.systemHealth ?? 'healthy'
        } as DashboardStats;
      }),
      catchError(() => of({
        totalUsers: 0, activeUsers: 0, totalProblems: 0, totalSubmissions: 0,
        successRate: 0, activeContests: 0, pendingTickets: 0, systemHealth: 'healthy' as const
      }))
    );
  }

  getSystemMetrics(): Observable<SystemMetrics> {
    return this.get<any>('/api/metrics/dashboard').pipe(
      map(res => {
        const d = res?.data ?? res;
        return {
          cpu: d.cpu ?? d.cpuUsage ?? 0,
          memory: d.memory ?? d.memoryUsage ?? 0,
          disk: d.disk ?? d.diskUsage ?? 0,
          network: d.network ?? 0,
          uptime: d.uptime ?? '0d 0h 0m',
          lastUpdated: new Date()
        } as SystemMetrics;
      }),
      catchError(() => of({ cpu: 0, memory: 0, disk: 0, network: 0, uptime: 'N/A', lastUpdated: new Date() }))
    );
  }

  getRecentActivity(): Observable<RecentActivity[]> {
    return this.get<any>('/api/metrics/trends/24h').pipe(
      map(res => {
        const items = res?.data?.activities ?? res?.data ?? res ?? [];
        if (!Array.isArray(items)) return [];
        return items.slice(0, 10).map((item: any, i: number) => ({
          id: item.id ?? String(i),
          type: item.type ?? 'system',
          message: item.message ?? item.description ?? '',
          timestamp: new Date(item.timestamp ?? Date.now()),
          severity: item.severity ?? 'info'
        })) as RecentActivity[];
      }),
      catchError(() => of([]))
    );
  }

  getSubmissionTrends(): Observable<ChartData> {
    return this.get<any>('/api/metrics/trends/24h').pipe(
      map(res => {
        const d = res?.data ?? res;
        if (d?.labels && d?.datasets) return d as ChartData;
        return { labels: [], datasets: [] } as ChartData;
      }),
      catchError(() => of({ labels: [], datasets: [] }))
    );
  }

  getProblemDistribution(): Observable<ChartData> {
    return this.get<any>('/api/problems/stats').pipe(
      map(res => {
        const d = res?.data ?? res;
        if (d?.labels && d?.datasets) return d as ChartData;
        const easy = d?.easy ?? d?.easyCount ?? 0;
        const medium = d?.medium ?? d?.mediumCount ?? 0;
        const hard = d?.hard ?? d?.hardCount ?? 0;
        return {
          labels: ['Easy', 'Medium', 'Hard'],
          datasets: [{ label: 'Problems by Difficulty', data: [easy, medium, hard], backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'] }]
        } as ChartData;
      }),
      catchError(() => of({ labels: ['Easy', 'Medium', 'Hard'], datasets: [{ label: 'Problems by Difficulty', data: [0, 0, 0], backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'] }] }))
    );
  }

  getUserGrowth(): Observable<ChartData> {
    return this.get<any>('/api/dashboard/realtime').pipe(
      map(res => {
        const d = res?.data ?? res;
        if (d?.labels && d?.datasets) return d as ChartData;
        return { labels: [], datasets: [] } as ChartData;
      }),
      catchError(() => of({ labels: [], datasets: [] }))
    );
  }

  getCacheStats(): Observable<any> {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const hour = `${date}_${pad(now.getHours())}`;
    return this.get<any>(`/zcop/api/analytics/query/feature/performance/summary`, {
      params: { hour, date }
    }).pipe(
      map(res => res?.data ?? res),
      catchError(() => of({ segments: [], totalMemory: 0, usedMemory: 0, freeMemoryPercent: 0 }))
    );
  }

  getJobsStats(): Observable<any> {
    return this.get<any>('/api/kafka/lag/summary').pipe(
      map(res => res?.data ?? res),
      catchError(() => of({ running: 0, pending: 0, completed: 0, failed: 0, scheduled: 0, recentJobs: [] }))
    );
  }

  // ============================================
  // Content APIs
  // ============================================

  getProblems(params?: any): Observable<any> {
    return this.get<any>('/api/problems', { params });
  }

  getProblemStats(): Observable<any> {
    return this.get<any>('/api/problems/stats');
  }

  getProblemById(id: string | number): Observable<any> {
    return this.get<any>(`/api/admin/problems/${id}`);
  }

  createProblem(data: any): Observable<any> {
    return this.post<any>('/api/admin/problems', data);
  }

  updateProblem(id: string | number, data: any): Observable<any> {
    return this.put<any>(`/api/admin/problems/${id}`, data);
  }

  deleteProblem(id: string | number): Observable<any> {
    return this.delete<any>(`/api/admin/problems/${id}`);
  }

  getContests(params?: any): Observable<any> {
    return this.get<any>('/api/contest/list', { params });
  }

  getContestById(id: string | number): Observable<any> {
    return this.get<any>(`/api/contest/${id}`);
  }

  createContest(data: any): Observable<any> {
    return this.post<any>('/api/contest/register', data);
  }

  updateContest(id: string | number, data: any): Observable<any> {
    return this.post<any>(`/api/contest/update/${id}`, data);
  }

  deleteContest(id: string | number): Observable<any> {
    return this.delete<any>(`/api/contest/${id}`);
  }

  getContestRankings(slug: string): Observable<any> {
    return this.get<any>(`/api/contest/${slug}/rankings`);
  }

  // Blog
  getBlogPosts(params?: any): Observable<any> {
    return this.get<any>('/api/admin/blog/posts', { params });
  }

  getBlogPostById(id: string | number): Observable<any> {
    return this.get<any>(`/api/admin/blog/posts/${id}`);
  }

  createBlogPost(data: any): Observable<any> {
    return this.post<any>('/api/admin/blog/posts', data);
  }

  updateBlogPost(id: string | number, data: any): Observable<any> {
    return this.put<any>(`/api/admin/blog/posts/${id}`, data);
  }

  deleteBlogPost(id: string | number): Observable<any> {
    return this.delete<any>(`/api/admin/blog/posts/${id}`);
  }

  publishBlogPost(id: string | number): Observable<any> {
    return this.post<any>(`/api/admin/blog/posts/${id}/publish`);
  }

  getBlogCategories(): Observable<any> {
    return this.get<any>('/api/admin/blog/categories');
  }

  getBlogTags(): Observable<any> {
    return this.get<any>('/api/admin/blog/tags');
  }

  // ============================================
  // Users APIs
  // ============================================

  getUsers(params?: any): Observable<any> {
    return this.get<any>('/api/iam/users', { params });
  }

  getUserById(id: string | number): Observable<any> {
    return this.get<any>(`/api/iam/users/${id}`);
  }

  createUser(data: any): Observable<any> {
    return this.post<any>('/api/iam/users', data);
  }

  updateUser(id: string | number, data: any): Observable<any> {
    return this.put<any>(`/api/iam/users/${id}`, data);
  }

  deleteUser(id: string | number): Observable<any> {
    return this.delete<any>(`/api/iam/users/${id}`);
  }

  getUserAudit(userId: string | number): Observable<any> {
    return this.get<any>(`/api/iam/users/${userId}/audit`);
  }

  getUserSessions(userId: string | number): Observable<any> {
    return this.get<any>(`/api/iam/users/${userId}/sessions`);
  }

  getUserSubmissions(userId: string | number): Observable<any> {
    return this.get<any>(`/zcop/api/submission/analytics/user/${userId}/submissions`);
  }

  getUserStatistics(userId: string | number): Observable<any> {
    return this.get<any>(`/zcop/api/submission/analytics/user/${userId}/statistics`);
  }

  // ============================================
  // Support Tickets APIs
  // ============================================

  getSupportTickets(params?: any): Observable<any> {
    return this.get<any>('/api/admin/support/tickets', { params });
  }

  getSupportTicketById(id: string | number): Observable<any> {
    return this.get<any>(`/api/admin/support/tickets/${id}`);
  }

  updateSupportTicket(id: string | number, data: any): Observable<any> {
    return this.put<any>(`/api/admin/support/tickets/${id}`, data);
  }

  assignSupportTicket(id: string | number, data: any): Observable<any> {
    return this.post<any>(`/api/admin/support/tickets/${id}/assign`, data);
  }

  closeSupportTicket(id: string | number): Observable<any> {
    return this.post<any>(`/api/admin/support/tickets/${id}/close`);
  }

  addTicketNote(id: string | number, data: any): Observable<any> {
    return this.post<any>(`/api/admin/support/tickets/${id}/notes`, data);
  }

  getSupportStats(): Observable<any> {
    return this.get<any>('/api/admin/support/stats');
  }

  getSupportCategories(): Observable<any> {
    return this.get<any>('/api/admin/support/categories');
  }

  // ============================================
  // Mail APIs
  // ============================================

  getMailGroups(): Observable<any> {
    return this.get<any>('/api/admin/mail/groups');
  }

  createMailGroup(data: any): Observable<any> {
    return this.post<any>('/api/admin/mail/groups', data);
  }

  deleteMailGroup(id: string | number): Observable<any> {
    return this.delete<any>(`/api/admin/mail/groups/${id}`);
  }

  getMailGroupMembers(groupId: string | number): Observable<any> {
    return this.get<any>(`/api/admin/mail/groups/${groupId}/members`);
  }

  addMailGroupMember(groupId: string | number, data: any): Observable<any> {
    return this.post<any>(`/api/admin/mail/groups/${groupId}/members`, data);
  }

  removeMailGroupMember(groupId: string | number, email: string): Observable<any> {
    return this.delete<any>(`/api/admin/mail/groups/${groupId}/members/${email}`);
  }

  sendToMailGroup(groupId: string | number, data: any): Observable<any> {
    return this.post<any>(`/api/admin/mail/groups/${groupId}/send`, data);
  }

  sendEmail(data: any): Observable<any> {
    return this.post<any>('/api/mail/send', data);
  }

  sendTemplateEmail(data: any): Observable<any> {
    return this.post<any>('/api/mail/send/template', data);
  }

  scheduleEmail(data: any): Observable<any> {
    return this.post<any>('/api/mail/schedule', data);
  }

  getMailHealth(): Observable<any> {
    return this.get<any>('/api/mail/health');
  }

  getMailInfo(): Observable<any> {
    return this.get<any>('/api/mail/info');
  }

  getMailWebhookStats(): Observable<any> {
    return this.get<any>('/api/mail/webhooks/stats');
  }

  // ============================================
  // RBAC / Admin APIs
  // ============================================

  getRoles(): Observable<any> {
    return this.get<any>('/api/iam/roles');
  }

  createRole(data: any): Observable<any> {
    return this.post<any>('/api/iam/roles', data);
  }

  getPermissions(): Observable<any> {
    return this.get<any>('/api/iam/permissions');
  }

  getAuditLogs(params?: any): Observable<any> {
    return this.get<any>('/api/iam/users', { params });
  }

  getAdminProfile(): Observable<any> {
    return this.get<any>('/api/auth/me');
  }

  // ============================================
  // Monitoring APIs
  // ============================================

  getMetricsDashboard(): Observable<any> {
    return this.get<any>('/api/metrics/dashboard');
  }

  getMetricsCurrentHour(): Observable<any> {
    return this.get<any>('/api/metrics/current-hour');
  }

  getMetricsCurrentDay(): Observable<any> {
    return this.get<any>('/api/metrics/current-day');
  }

  getMetricsHealth(): Observable<any> {
    return this.get<any>('/api/metrics/health');
  }

  getMetricsHealthAnalysis(): Observable<any> {
    return this.get<any>('/api/metrics/health/analysis');
  }

  getMetricsTrends24h(): Observable<any> {
    return this.get<any>('/api/metrics/trends/24h');
  }

  getMetricsAnomalies(): Observable<any> {
    return this.get<any>('/api/metrics/anomalies');
  }

  getMetricsErrorsAnalysis(): Observable<any> {
    return this.get<any>('/api/metrics/errors/analysis');
  }

  getMetricsHourlyVolume(): Observable<any> {
    return this.get<any>('/api/metrics/analysis/hourly-volume');
  }

  // Kafka
  getKafkaHealth(): Observable<any> {
    return this.get<any>('/api/kafka/health');
  }

  getKafkaLagSummary(): Observable<any> {
    return this.get<any>('/api/kafka/lag/summary');
  }

  getKafkaLagCurrent(): Observable<any> {
    return this.get<any>('/api/kafka/lag/current');
  }

  getKafkaLagAlerts(): Observable<any> {
    return this.get<any>('/api/kafka/lag/alerts');
  }

  getKafkaConfig(): Observable<any> {
    return this.get<any>('/api/kafka/config');
  }

  // Interceptor / Network
  getInterceptorStatus(): Observable<any> {
    return this.get<any>('/api/internal/interceptor/status');
  }

  getInterceptorPolicies(): Observable<any> {
    return this.get<any>('/api/internal/interceptor/policies');
  }

  getInterceptorHealth(): Observable<any> {
    return this.get<any>('/api/internal/interceptor/health');
  }

  blockIP(data: any): Observable<any> {
    return this.post<any>('/api/internal/interceptor/abuse/block', data);
  }

  unblockIP(data: any): Observable<any> {
    return this.post<any>('/api/internal/interceptor/abuse/unblock', data);
  }

  // Config
  getConfig(): Observable<any> {
    return this.get<any>('/api/config');
  }

  getConfigStatistics(): Observable<any> {
    return this.get<any>('/api/config/statistics');
  }

  reloadConfig(): Observable<any> {
    return this.post<any>('/api/config/hot-reload');
  }

  // Analytics Registry
  getAnalyticsFeatures(): Observable<any> {
    return this.get<any>('/zcop/api/analytics/registry/features');
  }

  queryAnalyticsKey(feature: string, keyName: string, variables?: any): Observable<any> {
    return this.get<any>(`/zcop/api/analytics/query/feature/${feature}/key/${keyName}`, { params: variables });
  }

  queryAnalyticsFeatureSummary(feature: string, variables?: any): Observable<any> {
    return this.get<any>(`/zcop/api/analytics/query/feature/${feature}/summary`, { params: variables });
  }

  // WebSocket stats
  getWebSocketStats(): Observable<any> {
    return this.get<any>('/api/websocket/stats');
  }

  // Global search (fan-out)
  globalSearch(query: string): Observable<any[]> {
    return forkJoin([
      this.get<any>('/api/problems/search', { params: { q: query } }).pipe(catchError(() => of({ data: [] }))),
      this.get<any>('/api/iam/users', { params: { search: query } }).pipe(catchError(() => of({ data: [] }))),
      this.get<any>('/api/contest/search', { params: { q: query } }).pipe(catchError(() => of({ data: [] })))
    ]).pipe(
      map(([problems, users, contests]) => {
        const results: any[] = [];
        const pList = problems?.data?.problems ?? problems?.data ?? [];
        const uList = users?.data?.users ?? users?.data ?? [];
        const cList = contests?.data?.contests ?? contests?.data ?? [];
        if (Array.isArray(pList)) pList.slice(0, 5).forEach((p: any) => results.push({ ...p, _type: 'problem' }));
        if (Array.isArray(uList)) uList.slice(0, 5).forEach((u: any) => results.push({ ...u, _type: 'user' }));
        if (Array.isArray(cList)) cList.slice(0, 5).forEach((c: any) => results.push({ ...c, _type: 'contest' }));
        return results;
      })
    );
  }

  // Communication
  getContestChatHistory(contestId: string | number): Observable<any> {
    return this.get<any>(`/api/contest/chat/${contestId}/history`);
  }

  getContestChatStats(contestId: string | number): Observable<any> {
    return this.get<any>(`/api/contest/chat/${contestId}/statistics`);
  }

  getAdminContests(): Observable<any> {
    return this.get<any>('/admin/contest-chat/api/contests');
  }

  broadcastMessage(contestId: string | number, data: any): Observable<any> {
    return this.post<any>(`/admin/contest-chat/api/${contestId}/broadcast`, data);
  }
}
