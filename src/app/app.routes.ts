import { Routes } from '@angular/router';
import { authGuard, permissionGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
        title: 'Dashboard - ZCOP Admin'
      },
      // Monitoring
      {
        path: 'monitoring',
        children: [
          { path: '', redirectTo: 'system-health', pathMatch: 'full' },
          {
            path: 'system-health',
            loadComponent: () => import('./features/monitoring/system-health/system-health.component').then(m => m.SystemHealthComponent),
            title: 'System Health - ZCOP Admin'
          },
          {
            path: 'jobs',
            loadComponent: () => import('./features/monitoring/jobs/jobs.component').then(m => m.JobsComponent),
            title: 'Jobs Monitoring - ZCOP Admin'
          },
          {
            path: 'cache',
            loadComponent: () => import('./features/monitoring/cache/cache.component').then(m => m.CacheComponent),
            title: 'Cache Monitoring - ZCOP Admin'
          },
          {
            path: 'database',
            loadComponent: () => import('./features/monitoring/database/database.component').then(m => m.DatabaseComponent),
            title: 'Database Monitoring - ZCOP Admin'
          },
          {
            path: 'network',
            loadComponent: () => import('./features/monitoring/network/network.component').then(m => m.NetworkComponent),
            title: 'Network Traffic - ZCOP Admin'
          },
          {
            path: 'analytics',
            loadComponent: () => import('./features/monitoring/analytics-explorer/analytics-explorer.component').then(m => m.AnalyticsExplorerComponent),
            title: 'Analytics Explorer - ZCOP Admin'
          }
        ]
      },
      // Logs
      {
        path: 'logs',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/logs/logs-viewer/logs-viewer.component').then(m => m.LogsViewerComponent),
            title: 'Logs - ZCOP Admin'
          },
          {
            path: 'anomaly',
            loadComponent: () => import('./features/logs/anomaly-detection/anomaly-detection.component').then(m => m.AnomalyDetectionComponent),
            title: 'Anomaly Detection - ZCOP Admin'
          }
        ]
      },
      // Alerts
      {
        path: 'alerts',
        children: [
          { path: '', redirectTo: 'rules', pathMatch: 'full' },
          {
            path: 'rules',
            loadComponent: () => import('./features/alerts/alert-rules/alert-rules.component').then(m => m.AlertRulesComponent),
            title: 'Alert Rules - ZCOP Admin'
          },
          {
            path: 'notifications',
            loadComponent: () => import('./features/alerts/notifications/notifications.component').then(m => m.NotificationsComponent),
            title: 'Notifications - ZCOP Admin'
          }
        ]
      },
      // Content Management
      {
        path: 'content',
        children: [
          { path: '', redirectTo: 'problems', pathMatch: 'full' },
          {
            path: 'problems',
            loadComponent: () => import('./features/content/problems/problems.component').then(m => m.ProblemsComponent),
            title: 'Problems - ZCOP Admin'
          },
          {
            path: 'problems/create',
            loadComponent: () => import('./features/content/problem-editor/problem-editor.component').then(m => m.ProblemEditorComponent),
            title: 'Create Problem - ZCOP Admin'
          },
          {
            path: 'problems/:id/edit',
            loadComponent: () => import('./features/content/problem-editor/problem-editor.component').then(m => m.ProblemEditorComponent),
            title: 'Edit Problem - ZCOP Admin'
          },
          {
            path: 'contests',
            loadComponent: () => import('./features/content/contests/contests.component').then(m => m.ContestsComponent),
            title: 'Contests - ZCOP Admin'
          },
          {
            path: 'blog',
            loadComponent: () => import('./features/content/blog/blog.component').then(m => m.BlogComponent),
            title: 'Blog Posts - ZCOP Admin'
          },
          {
            path: 'blog/create',
            loadComponent: () => import('./features/content/blog-editor/blog-editor.component').then(m => m.BlogEditorComponent),
            title: 'Create Blog Post - ZCOP Admin'
          },
          {
            path: 'blog/:id/edit',
            loadComponent: () => import('./features/content/blog-editor/blog-editor.component').then(m => m.BlogEditorComponent),
            title: 'Edit Blog Post - ZCOP Admin'
          }
        ]
      },
      // Users
      {
        path: 'users',
        children: [
          { path: '', redirectTo: 'management', pathMatch: 'full' },
          {
            path: 'management',
            loadComponent: () => import('./features/users/user-management/user-management.component').then(m => m.UserManagementComponent),
            title: 'User Management - ZCOP Admin'
          },
          {
            path: 'communication',
            loadComponent: () => import('./features/users/communication/communication.component').then(m => m.CommunicationComponent),
            title: 'Communication - ZCOP Admin'
          },
          {
            path: 'support',
            loadComponent: () => import('./features/users/support-tickets/support-tickets.component').then(m => m.SupportTicketsComponent),
            title: 'Support Tickets - ZCOP Admin'
          }
        ]
      },
      // Admin
      {
        path: 'admin',
        canActivate: [permissionGuard(['admin:manage'])],
        children: [
          { path: '', redirectTo: 'profile', pathMatch: 'full' },
          {
            path: 'profile',
            loadComponent: () => import('./features/admin/profile/profile.component').then(m => m.ProfileComponent),
            title: 'Admin Profile - ZCOP Admin'
          },
          {
            path: 'rbac',
            loadComponent: () => import('./features/admin/rbac/rbac.component').then(m => m.RbacComponent),
            title: 'RBAC Management - ZCOP Admin'
          },
          {
            path: 'audit',
            loadComponent: () => import('./features/admin/audit-logs/audit-logs.component').then(m => m.AuditLogsComponent),
            title: 'Audit Logs - ZCOP Admin'
          }
        ]
      },
      // Mail Management
      {
        path: 'mail',
        children: [
          {
            path: '',
            loadComponent: () => import('./features/mail/mail-dashboard/mail-dashboard.component').then(m => m.MailDashboardComponent),
            title: 'Mail Management - ZCOP Admin'
          }
        ]
      },
      // Search
      {
        path: 'search',
        loadComponent: () => import('./features/search/global-search/global-search.component').then(m => m.GlobalSearchComponent),
        title: 'Search - ZCOP Admin'
      },
      // Demo/Testing
      {
        path: 'demo',
        children: [
          {
            path: 'markdown-render',
            loadComponent: () => import('./features/demo/markdown-render-demo/markdown-render-demo.component').then(m => m.MarkdownRenderDemoComponent),
            title: 'Markdown Editor Demo - ZCOP Admin'
          }
        ]
      }
    ]
  },
  // Auth routes (outside main layout)
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
    title: 'Login - ZCOP Admin'
  },
  // Fallback
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
