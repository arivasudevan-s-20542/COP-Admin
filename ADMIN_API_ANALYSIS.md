# ZCOP Admin Panel — API & Workflow Analysis

> Generated: 2026-03-02 | Framework: Angular 21 + PrimeNG 21 | Backend Target: `http://localhost:8080/api`

---

## Executive Summary

The ZCOP Admin Panel has **24 feature components** across 10 feature areas. **Every single component currently runs on in-memory mock data** — there are zero real backend API calls in production use. The `ApiService` has generic HTTP methods wired up but only the Dashboard component even references it, and those calls return `of(...).pipe(delay(...))` (RxJS mock observables).

An `API_SPECIFICATION.md` exists defining the intended backend contract, but it covers only **~60%** of what the UI actually needs. Below is a full gap analysis.

---

## Current State: Mock Data Inventory

| Component | Mock Location | How Mocked |
|-----------|--------------|------------|
| **Dashboard** | `api.service.ts` | `of({...}).pipe(delay())` — 8 methods |
| **Login** | `auth.service.ts` | `mockLogin()` — accepts any credentials |
| **Problems** | `problems.component.ts` | Inline arrays: `stats`, `submissionOutcomes`, `problems` |
| **Problem Editor** | `problem-editor.component.ts` | Local object in `ngOnInit` |
| **Contests** | `contests.component.ts` | `loadContests()` / `loadAvailableProblems()` — local arrays |
| **Blog** | `blog.component.ts` | Inline `posts` array and `stats` object |
| **Blog Editor** | `blog-editor.component.ts` | Local object |
| **User Management** | `user-management.component.ts` | `loadUsers()` — inline user array |
| **Support Tickets** | `support-tickets.component.ts` | `loadTickets()` — inline array |
| **Communication** | `communication.component.ts` | `loadMessages()` / `loadTemplates()` — local |
| **Bulk Email** | `bulk-email.component.ts` | Campaigns + templates — local |
| **Mail Dashboard** | `mail-dashboard.component.ts` | `loadMailGroups()`, `loadCampaigns()`, `loadTemplates()`, `loadServiceHealth()` |
| **RBAC** | `rbac.component.ts` | `loadRoles()`, `loadPermissions()` — local |
| **Audit Logs** | `audit-logs.component.ts` | Inline audit log array |
| **Profile** | `profile.component.ts` | Local profile object |
| **Global Search** | `global-search.component.ts` | `setTimeout` + mock results |
| **System Health** | `system-health.component.ts` | `refreshStats()` with simulated random updates |
| **Cache** | `cache.component.ts` | Local Redis stats object |
| **Database** | `database.component.ts` | Local DB stats |
| **Jobs** | `jobs.component.ts` | Local job stats |
| **Network** | `network.component.ts` | Local network stats |
| **Logs Viewer** | `logs-viewer.component.ts` | Local log entries |
| **Anomaly Detection** | `anomaly-detection.component.ts` | Local anomaly array |
| **Alert Rules** | `alert-rules.component.ts` | Local rules array |
| **Notifications** | `notifications.component.ts` | Local notifications array |

---

## Component-by-Component API Requirements

### 1. Authentication

| API Endpoint | Method | Purpose | UI Component | Spec Status |
|-------------|--------|---------|-------------|-------------|
| `POST /auth/login` | POST | Admin login | LoginComponent | ✅ In spec |
| `POST /auth/refresh` | POST | Refresh JWT | AuthService | ✅ In spec |
| `POST /auth/logout` | POST | Logout | HeaderComponent | ✅ In spec |
| `GET /auth/me` | GET | Current user info | HeaderComponent, Sidebar | ✅ In spec |
| `PUT /auth/profile` | PUT | Update profile | ProfileComponent | ✅ In spec |
| `PUT /auth/password` | PUT | Change password | ProfileComponent | ✅ In spec |

**Request/Response:**

```
POST /auth/login
Request:  { email, password, rememberMe? }
Response: { token, refreshToken, expiresIn, user: { id, email, name, role, avatar, permissions[] } }

GET /auth/me
Response: { id, email, name, role, avatar, permissions[], department, phone, timezone,
            joinedDate, lastLogin, twoFactorEnabled }
```

---

### 2. Dashboard

| API Endpoint | Method | Purpose | Spec Status |
|-------------|--------|---------|-------------|
| `GET /dashboard/stats` | GET | KPI cards (users, problems, submissions, etc.) | ✅ In spec |
| `GET /dashboard/activity` | GET | Recent activity feed | ✅ In spec |
| `GET /dashboard/charts?type=submissions&period=7d` | GET | Submission trend line chart | ✅ In spec |
| `GET /dashboard/charts?type=problems&period=7d` | GET | Problem distribution chart | ✅ In spec |
| `GET /dashboard/charts?type=users&period=30d` | GET | User growth chart | ✅ In spec |
| `GET /dashboard/health` | GET | System health panel | ✅ In spec |
| `GET /dashboard/top-performers` | GET | Top performers widget | ✅ In spec |
| `GET /monitoring/cache/stats` | GET | Cache summary widget | ✅ In spec |
| `GET /monitoring/jobs?status=running` | GET | Jobs summary widget | ✅ In spec |

**Request/Response:**

```
GET /dashboard/stats
Response: {
  totalUsers, activeUsers, totalProblems, totalSubmissions,
  successRate, activeContests, pendingTickets, systemHealth,
  growth: { users: %, submissions: %, revenue: % }
}

GET /dashboard/charts?type=submissions&period=7d
Response: {
  labels: string[],
  datasets: [{ label, data: number[], backgroundColor?, borderColor?, fill?, tension? }]
}

GET /dashboard/activity?limit=10&offset=0
Response: {
  activities: [{ id, type, message, user?, metadata?, timestamp, severity? }],
  total, hasMore
}
```

---

### 3. Problems Management

| API Endpoint | Method | Purpose | UI Component | Spec Status |
|-------------|--------|---------|-------------|-------------|
| `GET /problems` | GET | Problems list with filters | ProblemsComponent | ✅ In spec |
| `GET /problems/:id` | GET | Full problem detail for editor | ProblemEditorComponent | ✅ In spec |
| `POST /problems` | POST | Create problem | ProblemEditorComponent | ✅ In spec |
| `PUT /problems/:id` | PUT | Update problem | ProblemEditorComponent | ✅ In spec |
| `DELETE /problems/:id` | DELETE | Delete problem | ProblemsComponent | ✅ In spec |
| `PUT /problems/:id/status` | PUT | Publish/unpublish | ProblemsComponent | ✅ In spec |
| `POST /problems/:id/duplicate` | POST | Duplicate problem | ProblemsComponent | ✅ In spec |
| `GET /problems/:id/test-cases` | GET | Test cases for editor | ProblemEditorComponent | ✅ In spec |
| `PUT /problems/:id/test-cases` | PUT | Update test cases | ProblemEditorComponent | ✅ In spec |
| `POST /problems/:id/test-cases/import` | POST | Bulk import test cases | ProblemEditorComponent | ✅ In spec |
| `GET /problems/categories` | GET | Category dropdown | ProblemsComponent | ✅ In spec |
| `GET /problems/tags` | GET | Tags autocomplete | ProblemEditorComponent | ✅ In spec |
| `GET /problems/stats` | GET | Problems page stats cards | ProblemsComponent | ❌ **MISSING** |
| `GET /problems/submission-outcomes` | GET | Submission outcome chart | ProblemsComponent | ❌ **MISSING** |
| `GET /problems/execution-time-distribution` | GET | Execution time histogram | ProblemsComponent | ❌ **MISSING** |

**UI Data Requirements (ProblemsComponent):**

```
GET /problems/stats
Response: {
  stats: [
    { label: "Total Submissions (24h)", value: "1.2M", trend: "+12%", trendUp: true },
    { label: "Avg Acceptance Rate", value: "47.3%", trend: "-2.1%", trendUp: false },
    { label: "95th %ile Runtime", value: "245ms", trend: "-18ms", trendUp: true }
  ]
}

GET /problems?page=1&limit=20&difficulty=&category=&status=&search=&sortBy=&sortOrder=
Response: {
  problems: [{
    id, title, difficulty, volume24h, acceptance, sparklineData: number[]
  }],
  pagination: { page, limit, total, totalPages }
}
```

**UI Data Requirements (ProblemEditorComponent):**

```
GET /problems/:id (full)
Response: {
  id, title, slug, difficulty, category, tags[],
  description (markdown/html), constraints (markdown/html),
  examples: [{ input, output, explanation }],
  hints: string[],
  testCases: [{ id, input, expectedOutput, isSample, isHidden, order, weight }],
  codeTemplates: { java, python, javascript, cpp, ... },
  editorial: {
    approach, intuition, algorithm,
    complexity: { time, space },
    solutions: [{ language, code, explanation }]
  },
  timeLimit, memoryLimit, status, isPremium,
  companies: string[], points,
  createdAt, updatedAt
}
```

---

### 4. Contests Management

| API Endpoint | Method | Purpose | UI Component | Spec Status |
|-------------|--------|---------|-------------|-------------|
| `GET /contests` | GET | Contest list | ContestsComponent | ✅ In spec |
| `GET /contests/:id` | GET | Contest detail | ContestsComponent | ✅ In spec |
| `POST /contests` | POST | Create contest | ContestsComponent | ✅ In spec |
| `PUT /contests/:id` | PUT | Update contest | ContestsComponent | ✅ In spec |
| `DELETE /contests/:id` | DELETE | Delete contest | ContestsComponent | ✅ In spec |
| `PUT /contests/:id/publish` | PUT | Publish contest | ContestsComponent | ✅ In spec |
| `PUT /contests/:id/problems` | PUT | Update contest problems | ContestsComponent | ✅ In spec |
| `GET /contests/available-problems` | GET | Problem picker autocomplete | ContestsComponent | ✅ In spec |
| `POST /contests/:id/duplicate` | POST | Duplicate contest | ContestsComponent | ✅ In spec |
| `GET /contests/:id/participants` | GET | Participant list | ContestsComponent | ✅ In spec |
| `GET /contests/:id/leaderboard` | GET | Leaderboard | ContestsComponent | ✅ In spec |
| `GET /contests/:id/statistics` | GET | Contest statistics | ContestsComponent | ✅ In spec |
| `GET /contests/stats` | GET | Contest stats cards (total, live, upcoming, participants) | ContestsComponent | ❌ **MISSING** |

**UI Data Requirements (stats cards):**

```
GET /contests/stats
Response: {
  totalContests, liveNow, upcoming, totalParticipants
}
```

---

### 5. Blog Management

| API Endpoint | Method | Purpose | UI Component | Spec Status |
|-------------|--------|---------|-------------|-------------|
| `GET /blog/posts` | GET | Blog post list | BlogComponent | ✅ In spec |
| `GET /blog/posts/:id` | GET | Post detail for editor | BlogEditorComponent | ✅ In spec |
| `POST /blog/posts` | POST | Create post | BlogEditorComponent | ✅ In spec |
| `PUT /blog/posts/:id` | PUT | Update post | BlogEditorComponent | ✅ In spec |
| `DELETE /blog/posts/:id` | DELETE | Delete post | BlogComponent | ✅ In spec |
| `PUT /blog/posts/:id/status` | PUT | Publish/unpublish | BlogComponent | ✅ In spec |
| `POST /blog/upload` | POST | Image upload | BlogEditorComponent | ✅ In spec |
| `GET /blog/categories` | GET | Category filter/dropdown | BlogComponent | ✅ In spec |
| `GET /blog/posts/:id/comments` | GET | Post comments | BlogComponent | ✅ In spec |
| `DELETE /blog/comments/:id` | DELETE | Delete comment | BlogComponent | ✅ In spec |
| `GET /blog/stats` | GET | Blog stats cards | BlogComponent | ❌ **MISSING** |
| `POST /blog/posts/:id/duplicate` | POST | Duplicate post | BlogComponent | ❌ **MISSING** |

**UI Data Requirements (stats):**

```
GET /blog/stats
Response: {
  totalPosts, publishedPosts, totalViews, totalComments
}
```

---

### 6. User Management

| API Endpoint | Method | Purpose | UI Component | Spec Status |
|-------------|--------|---------|-------------|-------------|
| `GET /users` | GET | User list with filters | UserManagementComponent | ✅ In spec |
| `GET /users/:id` | GET | User detail panel | UserManagementComponent | ✅ In spec |
| `POST /users` | POST | Create user | UserManagementComponent | ✅ In spec |
| `PUT /users/:id` | PUT | Update user | UserManagementComponent | ✅ In spec |
| `DELETE /users/:id` | DELETE | Delete user | UserManagementComponent | ✅ In spec |
| `PUT /users/:id/status` | PUT | Suspend/ban user | UserManagementComponent | ✅ In spec |
| `POST /users/:id/reset-password` | POST | Reset password | UserManagementComponent | ✅ In spec |
| `GET /users/:id/activity` | GET | User activity tab | UserManagementComponent | ✅ In spec |
| `GET /users/:id/submissions` | GET | User submissions tab | UserManagementComponent | ✅ In spec |
| `POST /users/:id/premium` | POST | Upgrade to premium | UserManagementComponent | ✅ In spec |
| `GET /users/export` | GET | Export users CSV | UserManagementComponent | ✅ In spec |
| `POST /users/bulk` | POST | Bulk actions | UserManagementComponent | ✅ In spec |
| `GET /users/stats` | GET | User stats cards | UserManagementComponent | ❌ **MISSING** |

**UI Data Requirements (stats):**

```
GET /users/stats
Response: {
  totalUsers, activeToday, newThisWeek, premiumUsers
}
```

---

### 7. Support Tickets

| API Endpoint | Method | Purpose | UI Component | Spec Status |
|-------------|--------|---------|-------------|-------------|
| `GET /support/tickets` | GET | Ticket list | SupportTicketsComponent | ✅ In spec |
| `GET /support/tickets/:id` | GET | Ticket detail | SupportTicketsComponent | ✅ In spec |
| `PUT /support/tickets/:id` | PUT | Update ticket | SupportTicketsComponent | ✅ In spec |
| `POST /support/tickets/:id/replies` | POST | Reply to ticket | SupportTicketsComponent | ✅ In spec |
| `PUT /support/tickets/:id/close` | PUT | Close ticket | SupportTicketsComponent | ✅ In spec |
| `GET /support/tickets/stats` | GET | Ticket stats cards | SupportTicketsComponent | ❌ **MISSING** |
| `GET /support/tickets/assignees` | GET | Assignee dropdown | SupportTicketsComponent | ❌ **MISSING** |

**UI Data Requirements (stats):**

```
GET /support/tickets/stats
Response: {
  total, open, inProgress, avgResponseTime: "2.4h"
}
```

---

### 8. Communication

| API Endpoint | Method | Purpose | UI Component | Spec Status |
|-------------|--------|---------|-------------|-------------|
| `GET /communication/messages` | GET | Message list | CommunicationComponent | ⚠️ Partial (spec has announcements, not messages) |
| `POST /communication/messages` | POST | Send message | CommunicationComponent | ✅ In spec |
| `DELETE /communication/messages/:id` | DELETE | Delete message | CommunicationComponent | ❌ **MISSING** |
| `GET /communication/templates` | GET | Template list | CommunicationComponent | ❌ **MISSING** |
| `POST /communication/templates` | POST | Create template | CommunicationComponent | ❌ **MISSING** |
| `PUT /communication/templates/:id` | PUT | Update template | CommunicationComponent | ❌ **MISSING** |
| `DELETE /communication/templates/:id` | DELETE | Delete template | CommunicationComponent | ❌ **MISSING** |
| `GET /communication/stats` | GET | Communication stats | CommunicationComponent | ❌ **MISSING** |
| `POST /communication/notifications/send` | POST | Push notification | CommunicationComponent | ✅ In spec |

**UI Data Requirements:**

```
GET /communication/messages?page=1&limit=20&type=&status=
Response: {
  messages: [{
    id, subject, recipients, type (email|push|in-app),
    status (sent|scheduled|draft|failed), sentAt, scheduledAt,
    openRate, clickRate
  }],
  pagination: { ... }
}

GET /communication/templates
Response: {
  templates: [{ id, name, subject, type, body, variables[], usageCount, createdAt }]
}

GET /communication/stats
Response: {
  totalSent, scheduledMessages, avgOpenRate, avgClickRate
}
```

---

### 9. Bulk Email / Mail Dashboard

| API Endpoint | Method | Purpose | UI Component | Spec Status |
|-------------|--------|---------|-------------|-------------|
| `GET /mail/stats` | GET | Mail dashboard stats | MailDashboardComponent | ✅ In spec |
| `GET /mail/templates` | GET | Email templates | MailDashboardComponent | ✅ In spec |
| `POST /mail/templates` | POST | Create template | MailDashboardComponent | ✅ In spec |
| `PUT /mail/templates/:id` | PUT | Update template | MailDashboardComponent | ❌ **MISSING** |
| `DELETE /mail/templates/:id` | DELETE | Delete template | MailDashboardComponent | ❌ **MISSING** |
| `POST /mail/send` | POST | Send email | MailDashboardComponent | ✅ In spec |
| `POST /mail/send-bulk` | POST | Send bulk email | BulkEmailComponent | ✅ In spec |
| `GET /mail/logs` | GET | Email logs | MailDashboardComponent | ✅ In spec |
| `GET /mail/campaigns` | GET | Campaign list | MailDashboardComponent, BulkEmailComponent | ❌ **MISSING** |
| `POST /mail/campaigns` | POST | Create campaign | BulkEmailComponent | ❌ **MISSING** |
| `PUT /mail/campaigns/:id` | PUT | Update campaign | BulkEmailComponent | ❌ **MISSING** |
| `DELETE /mail/campaigns/:id` | DELETE | Delete campaign | BulkEmailComponent | ❌ **MISSING** |
| `POST /mail/campaigns/:id/duplicate` | POST | Duplicate campaign | BulkEmailComponent | ❌ **MISSING** |
| `GET /mail/groups` | GET | Mail groups | MailDashboardComponent | ❌ **MISSING** |
| `POST /mail/groups` | POST | Create mail group | MailDashboardComponent | ❌ **MISSING** |
| `PUT /mail/groups/:id` | PUT | Update mail group | MailDashboardComponent | ❌ **MISSING** |
| `DELETE /mail/groups/:id` | DELETE | Delete mail group | MailDashboardComponent | ❌ **MISSING** |
| `GET /mail/groups/:id/members` | GET | Group members | MailDashboardComponent | ❌ **MISSING** |
| `POST /mail/groups/:id/members` | POST | Add member | MailDashboardComponent | ❌ **MISSING** |
| `DELETE /mail/groups/:id/members/:memberId` | DELETE | Remove member | MailDashboardComponent | ❌ **MISSING** |
| `GET /mail/health` | GET | Mail service health | MailDashboardComponent | ❌ **MISSING** |

**UI Data Requirements:**

```
GET /mail/campaigns?page=1&limit=20&status=
Response: {
  campaigns: [{
    id, name, subject, template, status (draft|scheduled|sending|sent|failed),
    recipients, opened, clicked, scheduledAt, sentAt, createdAt
  }],
  pagination: { ... }
}

GET /mail/groups
Response: {
  groups: [{
    id, name, description, memberCount, isActive, createdBy, createdAt, updatedAt
  }]
}

GET /mail/groups/:id/members?page=1&limit=50
Response: {
  members: [{ id, email, name, isActive, metadata, addedAt }],
  pagination: { ... }
}

GET /mail/health
Response: {
  status: "operational" | "degraded" | "down",
  deliveryRate, bounceRate, avgDeliveryTime,
  providers: [{ name, status, latency }]
}
```

---

### 10. RBAC (Role-Based Access Control)

| API Endpoint | Method | Purpose | UI Component | Spec Status |
|-------------|--------|---------|-------------|-------------|
| `GET /admin/roles` | GET | Role list | RbacComponent | ✅ In spec |
| `POST /admin/roles` | POST | Create role | RbacComponent | ✅ In spec |
| `PUT /admin/roles/:id` | PUT | Update role | RbacComponent | ✅ In spec |
| `DELETE /admin/roles/:id` | DELETE | Delete role | RbacComponent | ✅ In spec |
| `GET /admin/permissions` | GET | Permission categories | RbacComponent | ✅ In spec |

---

### 11. Audit Logs

| API Endpoint | Method | Purpose | UI Component | Spec Status |
|-------------|--------|---------|-------------|-------------|
| `GET /admin/audit-logs` | GET | Audit log list | AuditLogsComponent | ✅ In spec |
| `GET /admin/audit-logs/export` | GET | Export CSV | AuditLogsComponent | ✅ In spec |
| `GET /admin/audit-logs/stats` | GET | Audit stats cards | AuditLogsComponent | ❌ **MISSING** |

**UI Data Requirements (stats):**

```
GET /admin/audit-logs/stats
Response: {
  totalEvents, todayEvents, failedEvents, uniqueUsers
}
```

---

### 12. Admin Profile

| API Endpoint | Method | Purpose | UI Component | Spec Status |
|-------------|--------|---------|-------------|-------------|
| `GET /auth/me` | GET | Profile data | ProfileComponent | ✅ In spec |
| `PUT /auth/profile` | PUT | Update profile | ProfileComponent | ✅ In spec |
| `PUT /auth/password` | PUT | Change password | ProfileComponent | ✅ In spec |
| `GET /admin/profile/sessions` | GET | Active sessions | ProfileComponent | ❌ **MISSING** |
| `DELETE /admin/profile/sessions/:id` | DELETE | Revoke session | ProfileComponent | ❌ **MISSING** |
| `GET /admin/profile/activity` | GET | Admin's own activity | ProfileComponent | ❌ **MISSING** |
| `PUT /admin/profile/2fa` | PUT | Toggle 2FA | ProfileComponent | ❌ **MISSING** |
| `PUT /admin/profile/notifications` | PUT | Notification prefs | ProfileComponent | ❌ **MISSING** |

**UI Data Requirements:**

```
GET /admin/profile/sessions
Response: {
  sessions: [{
    id, device, browser, os, ipAddress, location, lastActive, isCurrent
  }]
}

GET /admin/profile/activity?limit=20
Response: {
  activities: [{
    id, action, resource, timestamp, ipAddress, status
  }]
}
```

---

### 13. Global Search

| API Endpoint | Method | Purpose | UI Component | Spec Status |
|-------------|--------|---------|-------------|-------------|
| `GET /search?q=&type=&limit=` | GET | Global search | GlobalSearchComponent | ❌ **MISSING** |
| `GET /search/recent` | GET | Recent searches | GlobalSearchComponent | ❌ **MISSING** |
| `DELETE /search/recent` | DELETE | Clear recent | GlobalSearchComponent | ❌ **MISSING** |

**UI Data Requirements:**

```
GET /search?q=keyword&type=all|users|problems|contests|submissions&limit=20
Response: {
  results: [{
    id, type (user|problem|contest|submission|setting),
    title, description, metadata, icon, link
  }],
  total, facets: { users: 5, problems: 12, contests: 3 }
}
```

---

### 14. System Health Monitoring

| API Endpoint | Method | Purpose | UI Component | Spec Status |
|-------------|--------|---------|-------------|-------------|
| `GET /monitoring/health` | GET | System KPIs | SystemHealthComponent | ⚠️ Partial (spec has `/dashboard/health`) |
| `GET /monitoring/health/cluster` | GET | Cluster resources | SystemHealthComponent | ❌ **MISSING** |
| `GET /monitoring/health/endpoints` | GET | Endpoint stats & latency | SystemHealthComponent | ❌ **MISSING** |
| `GET /monitoring/health/errors` | GET | Live error stream | SystemHealthComponent | ❌ **MISSING** |
| `WS /monitoring/health/stream` | WebSocket | Real-time metrics | SystemHealthComponent | ❌ **MISSING** |

**UI Data Requirements:**

```
GET /monitoring/health
Response: {
  kpis: [{
    label, value, unit, trend, trendUp, sparkline: number[]
  }],
  status: "healthy" | "degraded" | "critical"
}

GET /monitoring/health/cluster
Response: {
  resources: [{
    name, role (api|worker|scheduler), status, cpu, memory, disk,
    requests, uptime, version
  }]
}

GET /monitoring/health/endpoints
Response: {
  endpoints: [{
    method, path, p50, p95, p99, rpm, errorRate, status
  }]
}

GET /monitoring/health/errors (or WebSocket)
Response: {
  errors: [{
    id, timestamp, level, message, service, traceId, count
  }]
}
```

---

### 15. Cache Monitoring

| API Endpoint | Method | Purpose | UI Component | Spec Status |
|-------------|--------|---------|-------------|-------------|
| `GET /monitoring/cache/stats` | GET | Redis stats | CacheComponent | ✅ In spec |
| `POST /monitoring/cache/clear` | POST | Clear cache | CacheComponent | ✅ In spec |
| `GET /monitoring/cache/keys` | GET | Browse keys | CacheComponent | ✅ In spec |
| `GET /monitoring/cache/slow-log` | GET | Slow log entries | CacheComponent | ❌ **MISSING** |
| `GET /monitoring/cache/replicas` | GET | Replica nodes | CacheComponent | ❌ **MISSING** |
| `GET /monitoring/cache/ttl-distribution` | GET | TTL bucket chart | CacheComponent | ❌ **MISSING** |
| `GET /monitoring/cache/charts` | GET | Memory/ops time series | CacheComponent | ❌ **MISSING** |

**UI Data Requirements:**

```
GET /monitoring/cache/stats
Response: {
  status: "Connected" | "Disconnected",
  usedMemory, maxMemory, hitRatio, connectedClients,
  opsPerSec, avgLatency, totalKeys, expiredKeys,
  keyspaceHits, keyspaceMisses, evictions,
  segments: [{ name, keys, memory, ttl }]
}

GET /monitoring/cache/slow-log?limit=50
Response: {
  entries: [{ id, timestamp, duration, command, key }]
}

GET /monitoring/cache/replicas
Response: {
  nodes: [{ id, role, host, status, lag, memory, clients }]
}

GET /monitoring/cache/ttl-distribution
Response: {
  buckets: [{ range: "<1m" | "1-5m" | "5-30m" | "30m-1h" | ">1h" | "no-ttl", count }]
}
```

---

### 16. Database Monitoring

| API Endpoint | Method | Purpose | UI Component | Spec Status |
|-------------|--------|---------|-------------|-------------|
| `GET /monitoring/database/stats` | GET | DB KPIs | DatabaseComponent | ✅ In spec |
| `GET /monitoring/database/slow-queries` | GET | Slow queries | DatabaseComponent | ✅ In spec |
| `GET /monitoring/database/locks` | GET | Active locks | DatabaseComponent | ❌ **MISSING** |
| `GET /monitoring/database/storage` | GET | Storage usage | DatabaseComponent | ❌ **MISSING** |
| `GET /monitoring/database/charts` | GET | Latency/throughput charts | DatabaseComponent | ❌ **MISSING** |

**UI Data Requirements:**

```
GET /monitoring/database/stats
Response: {
  kpis: [
    { label: "Active Connections", value, max, trend },
    { label: "Avg Query Time", value, unit: "ms", trend },
    { label: "Replication Lag", value, unit: "ms", trend },
    { label: "Connection Pool", value: "25/100" }
  ],
  connections: { active, idle, max },
  replication: { status, lag }
}

GET /monitoring/database/locks
Response: {
  locks: [{
    pid, query, duration, waitType, database, user, blocked
  }]
}

GET /monitoring/database/storage
Response: {
  tables: [{ name, rows, dataSize, indexSize, totalSize }],
  totalSize, usedPercent
}
```

---

### 17. Jobs Monitoring

| API Endpoint | Method | Purpose | UI Component | Spec Status |
|-------------|--------|---------|-------------|-------------|
| `GET /monitoring/jobs` | GET | Job list | JobsComponent | ✅ In spec |
| `POST /monitoring/jobs/:id/trigger` | POST | Manual trigger | JobsComponent | ✅ In spec |
| `PUT /monitoring/jobs/:id/status` | PUT | Pause/resume | JobsComponent | ✅ In spec |
| `GET /monitoring/jobs/:id/logs` | GET | Job execution logs | JobsComponent | ✅ In spec |
| `GET /monitoring/jobs/stats` | GET | Job summary stats | JobsComponent | ❌ **MISSING** |
| `GET /monitoring/jobs/workers` | GET | Worker node list | JobsComponent | ❌ **MISSING** |
| `GET /monitoring/jobs/anomalies` | GET | Anomaly feed | JobsComponent | ❌ **MISSING** |

**UI Data Requirements:**

```
GET /monitoring/jobs/stats
Response: {
  running, queued, failed24h, completed24h,
  avgExecutionTime, successRate
}

GET /monitoring/jobs/workers
Response: {
  workers: [{
    id, name, status (active|idle|offline), cpu, memory,
    currentJob, jobsProcessed, uptime
  }]
}
```

---

### 18. Network Monitoring

| API Endpoint | Method | Purpose | UI Component | Spec Status |
|-------------|--------|---------|-------------|-------------|
| `GET /monitoring/network/stats` | GET | Network KPIs | NetworkComponent | ✅ In spec |
| `GET /monitoring/network/traffic` | GET | Traffic time series | NetworkComponent | ❌ **MISSING** |
| `GET /monitoring/network/anomalous-ips` | GET | Anomalous IPs | NetworkComponent | ❌ **MISSING** |
| `GET /monitoring/network/attacks` | GET | Attack origins | NetworkComponent | ❌ **MISSING** |
| `GET /monitoring/network/rate-limits` | GET | Rate limit config | NetworkComponent | ❌ **MISSING** |
| `PUT /monitoring/network/rate-limits` | PUT | Update rate limits | NetworkComponent | ❌ **MISSING** |
| `POST /monitoring/network/block-ip` | POST | Block IP | NetworkComponent | ❌ **MISSING** |

**UI Data Requirements:**

```
GET /monitoring/network/anomalous-ips
Response: {
  ips: [{
    ip, country, requestCount, blockedCount, reason, firstSeen, lastSeen, status
  }]
}

GET /monitoring/network/attacks
Response: {
  origins: [{
    country, countryCode, attacks, percentage, topVector
  }]
}
```

---

### 19. Logs Viewer

| API Endpoint | Method | Purpose | UI Component | Spec Status |
|-------------|--------|---------|-------------|-------------|
| `GET /logs` | GET | Log entries (polling) | LogsViewerComponent | ❌ **MISSING** |
| `WS /logs/stream` | WebSocket | Live log stream | LogsViewerComponent | ❌ **MISSING** |
| `GET /logs/download` | GET | Export logs | LogsViewerComponent | ❌ **MISSING** |

**UI Data Requirements:**

```
GET /logs?level=ERROR&source=&search=&from=&to=&limit=100&offset=0
Response: {
  logs: [{
    id, timestamp, level (INFO|WARN|ERROR|DEBUG|FATAL),
    source, message, metadata?, traceId?
  }],
  total
}
```

---

### 20. Anomaly Detection

| API Endpoint | Method | Purpose | UI Component | Spec Status |
|-------------|--------|---------|-------------|-------------|
| `GET /monitoring/anomalies` | GET | Anomaly list | AnomalyDetectionComponent | ❌ **MISSING** |
| `GET /monitoring/anomalies/stats` | GET | Anomaly stats | AnomalyDetectionComponent | ❌ **MISSING** |
| `GET /monitoring/anomalies/charts` | GET | Trend/distribution charts | AnomalyDetectionComponent | ❌ **MISSING** |
| `PUT /monitoring/anomalies/:id/acknowledge` | PUT | Acknowledge anomaly | AnomalyDetectionComponent | ❌ **MISSING** |

**UI Data Requirements:**

```
GET /monitoring/anomalies/stats
Response: {
  total, critical, warning, resolved, detectionRate
}

GET /monitoring/anomalies?severity=&source=&status=&page=1&limit=20
Response: {
  anomalies: [{
    id, timestamp, severity (critical|warning|info),
    source, metric, expected, actual, deviation,
    status (active|acknowledged|resolved), description
  }],
  pagination: { ... }
}
```

---

### 21. Alert Rules

| API Endpoint | Method | Purpose | UI Component | Spec Status |
|-------------|--------|---------|-------------|-------------|
| `GET /monitoring/alerts/rules` | GET | Alert rule list | AlertRulesComponent | ✅ In spec |
| `POST /monitoring/alerts/rules` | POST | Create rule | AlertRulesComponent | ✅ In spec |
| `PUT /monitoring/alerts/rules/:id` | PUT | Update rule | AlertRulesComponent | ❌ **MISSING** |
| `DELETE /monitoring/alerts/rules/:id` | DELETE | Delete rule | AlertRulesComponent | ❌ **MISSING** |
| `PUT /monitoring/alerts/rules/:id/toggle` | PUT | Enable/disable rule | AlertRulesComponent | ❌ **MISSING** |
| `GET /monitoring/alerts/rules/stats` | GET | Rule stats cards | AlertRulesComponent | ❌ **MISSING** |
| `GET /monitoring/alerts/history` | GET | Alert history | AlertRulesComponent | ✅ In spec |

**UI Data Requirements (stats):**

```
GET /monitoring/alerts/rules/stats
Response: {
  totalRules, activeRules, triggeredToday, criticalAlerts
}
```

---

### 22. Notifications

| API Endpoint | Method | Purpose | UI Component | Spec Status |
|-------------|--------|---------|-------------|-------------|
| `GET /notifications` | GET | Notification list | NotificationsComponent | ❌ **MISSING** |
| `PUT /notifications/:id/read` | PUT | Mark as read | NotificationsComponent | ❌ **MISSING** |
| `PUT /notifications/read-all` | PUT | Mark all read | NotificationsComponent | ❌ **MISSING** |
| `DELETE /notifications/:id` | DELETE | Delete notification | NotificationsComponent | ❌ **MISSING** |
| `GET /notifications/stats` | GET | Notification stats | NotificationsComponent | ❌ **MISSING** |

**UI Data Requirements:**

```
GET /notifications?page=1&limit=20&type=&read=
Response: {
  notifications: [{
    id, type (alert|system|update|security),
    title, message, source, severity, isRead,
    metadata?, link?, timestamp
  }],
  pagination: { ... }
}

GET /notifications/stats
Response: {
  total, unread, critical, today
}
```

---

### 23. System Settings

| API Endpoint | Method | Purpose | UI Component | Spec Status |
|-------------|--------|---------|-------------|-------------|
| `GET /admin/settings` | GET | All settings | (no dedicated component yet) | ✅ In spec |
| `PUT /admin/settings` | PUT | Update settings | (no dedicated component yet) | ✅ In spec |

---

## Gap Summary

### APIs in Spec but NOT wired to UI (0% implemented)

All APIs in the spec exist only on paper. **Zero endpoints are actually called from the frontend.** Every component uses inline mock data.

### APIs the UI Needs but NOT in Spec

| # | Missing API | Used By |
|---|------------|---------|
| 1 | `GET /problems/stats` | ProblemsComponent stats cards |
| 2 | `GET /problems/submission-outcomes` | ProblemsComponent chart |
| 3 | `GET /problems/execution-time-distribution` | ProblemsComponent chart |
| 4 | `GET /contests/stats` | ContestsComponent stats cards |
| 5 | `GET /blog/stats` | BlogComponent stats cards |
| 6 | `POST /blog/posts/:id/duplicate` | BlogComponent |
| 7 | `GET /users/stats` | UserManagementComponent stats cards |
| 8 | `GET /support/tickets/stats` | SupportTicketsComponent stats cards |
| 9 | `GET /support/tickets/assignees` | SupportTicketsComponent dropdown |
| 10 | `GET /communication/messages` | CommunicationComponent list |
| 11 | `DELETE /communication/messages/:id` | CommunicationComponent |
| 12 | `GET /communication/templates` | CommunicationComponent |
| 13 | `POST /communication/templates` | CommunicationComponent |
| 14 | `PUT /communication/templates/:id` | CommunicationComponent |
| 15 | `DELETE /communication/templates/:id` | CommunicationComponent |
| 16 | `GET /communication/stats` | CommunicationComponent |
| 17 | `PUT /mail/templates/:id` | MailDashboardComponent |
| 18 | `DELETE /mail/templates/:id` | MailDashboardComponent |
| 19 | `GET /mail/campaigns` | MailDashboardComponent, BulkEmailComponent |
| 20 | `POST /mail/campaigns` | BulkEmailComponent |
| 21 | `PUT /mail/campaigns/:id` | BulkEmailComponent |
| 22 | `DELETE /mail/campaigns/:id` | BulkEmailComponent |
| 23 | `POST /mail/campaigns/:id/duplicate` | BulkEmailComponent |
| 24 | `GET /mail/groups` | MailDashboardComponent |
| 25 | `POST /mail/groups` | MailDashboardComponent |
| 26 | `PUT /mail/groups/:id` | MailDashboardComponent |
| 27 | `DELETE /mail/groups/:id` | MailDashboardComponent |
| 28 | `GET /mail/groups/:id/members` | MailDashboardComponent |
| 29 | `POST /mail/groups/:id/members` | MailDashboardComponent |
| 30 | `DELETE /mail/groups/:id/members/:memberId` | MailDashboardComponent |
| 31 | `GET /mail/health` | MailDashboardComponent |
| 32 | `GET /admin/audit-logs/stats` | AuditLogsComponent |
| 33 | `GET /admin/profile/sessions` | ProfileComponent |
| 34 | `DELETE /admin/profile/sessions/:id` | ProfileComponent |
| 35 | `GET /admin/profile/activity` | ProfileComponent |
| 36 | `PUT /admin/profile/2fa` | ProfileComponent |
| 37 | `PUT /admin/profile/notifications` | ProfileComponent |
| 38 | `GET /search` | GlobalSearchComponent |
| 39 | `GET /search/recent` | GlobalSearchComponent |
| 40 | `DELETE /search/recent` | GlobalSearchComponent |
| 41 | `GET /monitoring/health/cluster` | SystemHealthComponent |
| 42 | `GET /monitoring/health/endpoints` | SystemHealthComponent |
| 43 | `GET /monitoring/health/errors` | SystemHealthComponent |
| 44 | `WS /monitoring/health/stream` | SystemHealthComponent |
| 45 | `GET /monitoring/cache/slow-log` | CacheComponent |
| 46 | `GET /monitoring/cache/replicas` | CacheComponent |
| 47 | `GET /monitoring/cache/ttl-distribution` | CacheComponent |
| 48 | `GET /monitoring/cache/charts` | CacheComponent |
| 49 | `GET /monitoring/database/locks` | DatabaseComponent |
| 50 | `GET /monitoring/database/storage` | DatabaseComponent |
| 51 | `GET /monitoring/database/charts` | DatabaseComponent |
| 52 | `GET /monitoring/jobs/stats` | JobsComponent |
| 53 | `GET /monitoring/jobs/workers` | JobsComponent |
| 54 | `GET /monitoring/jobs/anomalies` | JobsComponent |
| 55 | `GET /monitoring/network/traffic` | NetworkComponent |
| 56 | `GET /monitoring/network/anomalous-ips` | NetworkComponent |
| 57 | `GET /monitoring/network/attacks` | NetworkComponent |
| 58 | `GET /monitoring/network/rate-limits` | NetworkComponent |
| 59 | `PUT /monitoring/network/rate-limits` | NetworkComponent |
| 60 | `POST /monitoring/network/block-ip` | NetworkComponent |
| 61 | `GET /logs` | LogsViewerComponent |
| 62 | `WS /logs/stream` | LogsViewerComponent |
| 63 | `GET /logs/download` | LogsViewerComponent |
| 64 | `GET /monitoring/anomalies` | AnomalyDetectionComponent |
| 65 | `GET /monitoring/anomalies/stats` | AnomalyDetectionComponent |
| 66 | `GET /monitoring/anomalies/charts` | AnomalyDetectionComponent |
| 67 | `PUT /monitoring/anomalies/:id/acknowledge` | AnomalyDetectionComponent |
| 68 | `PUT /monitoring/alerts/rules/:id` | AlertRulesComponent |
| 69 | `DELETE /monitoring/alerts/rules/:id` | AlertRulesComponent |
| 70 | `PUT /monitoring/alerts/rules/:id/toggle` | AlertRulesComponent |
| 71 | `GET /monitoring/alerts/rules/stats` | AlertRulesComponent |
| 72 | `GET /notifications` | NotificationsComponent |
| 73 | `PUT /notifications/:id/read` | NotificationsComponent |
| 74 | `PUT /notifications/read-all` | NotificationsComponent |
| 75 | `DELETE /notifications/:id` | NotificationsComponent |
| 76 | `GET /notifications/stats` | NotificationsComponent |

---

## Total API Endpoint Count

| Category | In Spec | Missing from Spec | Total Needed |
|----------|---------|-------------------|-------------|
| Authentication | 6 | 0 | 6 |
| Dashboard | 5 | 0 | 5 |
| Problems | 12 | 3 | 15 |
| Contests | 12 | 1 | 13 |
| Blog | 9 | 2 | 11 |
| Users | 12 | 1 | 13 |
| Support Tickets | 5 | 2 | 7 |
| Communication | 3 | 7 | 10 |
| Mail/Email | 6 | 15 | 21 |
| RBAC | 5 | 0 | 5 |
| Audit Logs | 2 | 1 | 3 |
| Admin Profile | 3 | 5 | 8 |
| Global Search | 0 | 3 | 3 |
| System Health | 1 | 4 | 5 |
| Cache Monitoring | 3 | 4 | 7 |
| Database Monitoring | 2 | 3 | 5 |
| Jobs Monitoring | 4 | 3 | 7 |
| Network Monitoring | 1 | 6 | 7 |
| Logs | 0 | 3 | 3 |
| Anomaly Detection | 0 | 4 | 4 |
| Alert Rules | 3 | 4 | 7 |
| Notifications | 0 | 5 | 5 |
| System Settings | 2 | 0 | 2 |
| **TOTAL** | **96** | **76** | **172** |

---

## Recommended Implementation Priority

### Phase 1: Core Platform (High Priority)
1. **Authentication** — Real login/logout/refresh flow (6 APIs)
2. **Problems Management** — Core platform feature (15 APIs)
3. **Contests Management** — Core platform feature (13 APIs)
4. **Users Management** — Essential for admin (13 APIs)
5. **Dashboard** — Landing page, needs all aggregation APIs (5 APIs)

### Phase 2: Content & Support (Medium Priority)
6. **Blog Management** — Content creation (11 APIs)
7. **Support Tickets** — User support (7 APIs)
8. **RBAC** — Access control (5 APIs)
9. **Audit Logs** — Compliance & tracking (3 APIs)
10. **Admin Profile** — Admin settings (8 APIs)

### Phase 3: Communication & Mail (Medium Priority)
11. **Communication** — User messaging (10 APIs)
12. **Mail System** — Email campaigns (21 APIs)

### Phase 4: Monitoring & Ops (Lower Priority for MVP)
13. **System Health** — Infrastructure monitoring (5 APIs)
14. **Cache Monitoring** — Redis management (7 APIs)
15. **Database Monitoring** — DB health (5 APIs)
16. **Jobs Monitoring** — Scheduled jobs (7 APIs)
17. **Network Monitoring** — Traffic & security (7 APIs)
18. **Logs Viewer** — Log management (3 APIs)
19. **Anomaly Detection** — ML-based anomalies (4 APIs)
20. **Alert Rules** — Alerting system (7 APIs)
21. **Notifications** — Admin notifications (5 APIs)
22. **Global Search** — Cross-entity search (3 APIs)

---

## WebSocket Requirements

| Endpoint | Purpose | Component |
|----------|---------|-----------|
| `WS /monitoring/health/stream` | Real-time system metrics | SystemHealthComponent |
| `WS /logs/stream` | Live log streaming | LogsViewerComponent |
| `WS /notifications/stream` | Real-time admin notifications | NotificationsComponent, HeaderComponent |

---

## Architecture Notes

1. **ApiService** already has generic `get`, `post`, `put`, `patch`, `delete`, `upload`, `download`, and `getPaginated` methods — these just need real endpoints passed to them.
2. **Auth interceptor** is already wired to attach `Bearer` tokens.
3. **Environment config** already points to `http://localhost:8080/api` (dev) and `/api` (prod).
4. **WebSocket URL** is configured as `ws://localhost:8080/ws`.
5. The existing `API_SPECIFICATION.md` uses base path `/admin/v1` but the environment uses `/api`. These need alignment.
