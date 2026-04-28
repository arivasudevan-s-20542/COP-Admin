# ZCOP Admin - API Specification

This document maps every admin panel component to the **actual backend endpoints**.
URL paths reflect the real Spring Boot controllers in the `zcop` backend.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Dashboard](#2-dashboard)
3. [Problems Management](#3-problems-management)
4. [Contests Management](#4-contests-management)
5. [Users Management](#5-users-management)
6. [Blog Management](#6-blog-management)
7. [Mail System](#7-mail-system)
8. [Monitoring](#8-monitoring)
9. [Admin Settings](#9-admin-settings)
10. [Support Tickets](#10-support-tickets)
11. [Communication](#11-communication)
12. [Logs & Anomaly Detection](#12-logs--anomaly-detection)
13. [Alert Rules & Notifications](#13-alert-rules--notifications)
14. [Global Search](#14-global-search)
15. [Analytics Registry](#15-analytics-registry)
16. [Achievements](#16-achievements)
17. [Ranking](#17-ranking)
18. [RealWorld Problems](#18-realworld-problems)
19. [Webhooks](#19-webhooks)

---

## Base URL

```
Production: https://cruscible.com         (environment.apiUrl = '')
Development: http://localhost:8080   (environment.apiUrl = 'http://localhost:8080')
```

All endpoint paths below are **absolute from host root** (e.g., `/api/auth/login` means `http://localhost:8080/api/auth/login`).

## Common Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

## Standard Response Format

```json
{
  "success": true,
  "data": { },
  "message": "Operation successful",
  "timestamp": "2026-01-31T14:00:00Z"
}
```

## Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERR_001",
    "message": "Error description",
    "details": { }
  },
  "timestamp": "2026-01-31T14:00:00Z"
}
```

---

## 1. Authentication

**Backend Controllers:** `JwtAuthController`, `IAMController`, `PublicAuthController`

| # | Method | Actual Backend Path | Purpose | Admin Component |
|---|--------|-------------------|---------|-----------------|
| 1.1 | POST | `/api/auth/login` | Admin login | LoginComponent |
| 1.2 | POST | `/api/auth/refresh` | Refresh JWT token | AuthService |
| 1.3 | POST | `/api/auth/logout` | Logout | HeaderComponent |
| 1.4 | GET | `/api/auth/me` | Get current admin user | HeaderComponent, Sidebar |
| 1.5 | GET | `/api/auth/validate` | Validate token | AuthGuard |
| 1.6 | POST | `/api/auth/forgot-password` | Password reset request | LoginComponent |
| 1.7 | POST | `/api/auth/reset-password` | Password reset confirm | LoginComponent |

**Alternative IAM-based auth (admin-privileged flows):**

| # | Method | Actual Backend Path | Purpose |
|---|--------|-------------------|---------|
| 1.8 | POST | `/api/iam/auth/login` | IAM admin login |
| 1.9 | POST | `/api/iam/auth/logout` | IAM admin logout |
| 1.10 | POST | `/api/iam/auth/refresh` | IAM token refresh |
| 1.11 | GET | `/api/iam/auth/validate` | IAM token validate |

**TFA (Two-Factor Authentication):**

| # | Method | Actual Backend Path | Purpose |
|---|--------|-------------------|---------|
| 1.12 | POST | `/api/v1/tfa/setup` | Setup TFA |
| 1.13 | POST | `/api/v1/tfa/setup/confirm` | Confirm TFA setup |
| 1.14 | POST | `/api/v1/tfa/verify` | Verify TFA code |
| 1.15 | DELETE | `/api/v1/tfa/disable` | Disable TFA |
| 1.16 | GET | `/api/v1/tfa/status/{userId}` | TFA status |
| 1.17 | POST | `/api/v1/tfa/login/init` | Init TFA login flow |
| 1.18 | POST | `/api/v1/tfa/login/complete` | Complete TFA login |
| 1.19 | POST | `/api/v1/tfa/backup/verify` | Use backup code |
| 1.20 | POST | `/api/v1/tfa/backup/regenerate` | Regenerate backup codes |

**Admin Token Management:**

| # | Method | Actual Backend Path | Purpose |
|---|--------|-------------------|---------|
| 1.21 | GET | `/api/auth/admin/tokens/list` | List admin tokens |
| 1.22 | POST | `/api/auth/admin/tokens/expire` | Expire specific token |
| 1.23 | POST | `/api/auth/admin/tokens/expire-all` | Expire all tokens |

### 1.1 Admin Login

```
POST /api/auth/login
```

**Request:**
```json
{
  "email": "admin@cruscible.com",
  "password": "string",
  "rememberMe": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600,
    "user": {
      "id": "usr_123",
      "email": "admin@cruscible.com",
      "name": "Admin User",
      "role": "SUPER_ADMIN",
      "avatar": "https://...",
      "permissions": ["users.read", "users.write", "contests.manage"]
    }
  }
}
```

### 1.2 Refresh Token

```
POST /api/auth/refresh
```

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 1.3 Logout

```
POST /api/auth/logout
```

### 1.4 Get Current User

```
GET /api/auth/me
```

---

## 2. Dashboard

**Backend Controller:** `DashboardApiController`

The admin dashboard aggregates data from multiple backend endpoints. There is no single `/dashboard/stats` endpoint — the frontend must compose from several calls.

| # | Method | Actual Backend Path | Purpose | Admin Component |
|---|--------|-------------------|---------|-----------------|
| 2.1 | GET | `/api/dashboard/submissions` | Submission stats | DashboardComponent |
| 2.2 | GET | `/api/dashboard/scores` | Score stats | DashboardComponent |
| 2.3 | GET | `/api/dashboard/problems/active-users` | Active users per problem | DashboardComponent |
| 2.4 | GET | `/api/dashboard/realtime` | Real-time platform stats | DashboardComponent |
| 2.5 | GET | `/api/dashboard/performance` | Performance metrics | DashboardComponent |
| 2.6 | GET | `/api/dashboard/ai-insights` | AI-powered insights | DashboardComponent |
| 2.7 | GET | `/api/metrics/dashboard` | Metrics dashboard data | DashboardComponent |
| 2.8 | GET | `/api/metrics/trends/24h` | 24-hour trend data | DashboardComponent |
| 2.9 | GET | `/api/metrics/health` | System health | DashboardComponent |
| 2.10 | GET | `/api/metrics/anomalies` | Anomaly detection | DashboardComponent |

**Analytics-powered dashboard data (from Analytics Registry):**

| # | Method | Actual Backend Path | Purpose |
|---|--------|-------------------|---------|
| 2.11 | GET | `/zcop/api/analytics/query/feature/system/summary?date={date}&hour={hour}` | System health summary |
| 2.12 | GET | `/zcop/api/analytics/query/feature/user/key/active_users_daily?date={date}` | DAU |
| 2.13 | GET | `/zcop/api/analytics/query/feature/user/key/active_users_current` | Real-time active users |
| 2.14 | GET | `/zcop/api/analytics/query/feature/problem/key/problem_submissions_daily?date={date}` | Daily submissions |
| 2.15 | GET | `/zcop/api/analytics/query/feature/user/key/user_logins_daily?date={date}` | Daily logins |

**Submission analytics for dashboard charts:**

| # | Method | Actual Backend Path | Purpose |
|---|--------|-------------------|---------|
| 2.16 | GET | `/zcop/api/submission/analytics/dashboard` | Platform analytics dashboard |
| 2.17 | GET | `/zcop/api/submission/analytics/leaderboard/global` | Global leaderboard |

---

## 3. Problems Management

**Backend Controllers:** `ProblemMetaController` (public/read), `ProblemController` (admin CRUD)

| # | Method | Actual Backend Path | Purpose | Admin Component |
|---|--------|-------------------|---------|-----------------|
| 3.1 | GET | `/api/problems` | List problems (public, filtered) | ProblemsComponent |
| 3.2 | GET | `/api/problems/list/simple` | Simple problem list | ProblemsComponent |
| 3.3 | GET | `/api/problems/search` | Search problems | ProblemsComponent |
| 3.4 | GET | `/api/problems/stats` | Problem statistics | ProblemsComponent |
| 3.5 | GET | `/api/problems/{slug}` | Get problem by slug | ProblemEditorComponent |
| 3.6 | GET | `/api/problems/id/{problemId}` | Get problem by ID | ProblemEditorComponent |
| 3.7 | GET | `/api/problems/desc/{problemSlug}` | Get problem description | ProblemEditorComponent |
| 3.8 | GET | `/api/problems/languages` | Supported languages | ProblemEditorComponent |
| 3.9 | POST | `/api/admin/problems` | Create problem | ProblemEditorComponent |
| 3.10 | GET | `/api/admin/problems/{problemId}` | Get problem (admin detail) | ProblemEditorComponent |
| 3.11 | PUT | `/api/admin/problems/{problemId}` | Update problem | ProblemEditorComponent |
| 3.12 | DELETE | `/api/admin/problems/{problemId}` | Delete problem | ProblemsComponent |

**Problem analytics (from Analytics Registry):**

| # | Method | Actual Backend Path | Purpose |
|---|--------|-------------------|---------|
| 3.13 | GET | `/zcop/api/submission/analytics/problem/{problemId}/engagement` | Problem engagement stats |
| 3.14 | GET | `/zcop/api/analytics/query/feature/problem/key/problem_submissions_daily?date={date}` | Daily submissions |
| 3.15 | GET | `/zcop/api/analytics/query/feature/problem/key/accepted_submissions_daily?date={date}` | Accepted submissions |
| 3.16 | GET | `/zcop/api/analytics/query/feature/problem/key/language_usage?language={lang}&date={date}` | Language breakdown |
| 3.17 | GET | `/zcop/api/analytics/query/feature/problem/key/execution_results?result={result}&date={date}` | Execution outcomes |

**Notes:**
- Test cases are part of the problem payload in create/update, not separate sub-resource endpoints
- Publish/archive: use `PUT /api/admin/problems/{problemId}` with `status` field
- Problem ID is numeric; slug is string — admin should prefer `problemId`

### 3.9 Create Problem

```
POST /api/admin/problems
```

**Request:**
```json
{
  "title": "Two Sum",
  "slug": "two-sum",
  "difficulty": "easy",
  "category": "Array",
  "tags": ["array", "hash-table"],
  "description": "<p>HTML content...</p>",
  "constraints": "<ul>...</ul>",
  "examples": [
    {
      "input": "nums = [2,7,11,15], target = 9",
      "output": "[0,1]",
      "explanation": "Because nums[0] + nums[1] == 9"
    }
  ],
  "hints": ["Hint 1", "Hint 2"],
  "starterCode": {
    "java": "class Solution {...}",
    "python": "class Solution:..."
  },
  "isPremium": false,
  "points": 100,
  "companies": ["Google", "Amazon"],
  "status": "draft"
}
```

---

## 4. Contests Management

**Backend Controller:** `ContestApiController`, `ContestViolationController`

| # | Method | Actual Backend Path | Purpose | Admin Component |
|---|--------|-------------------|---------|-----------------|
| 4.1 | GET | `/api/contest/list` | List all contests | ContestsComponent |
| 4.2 | GET | `/api/contest/search` | Search contests | ContestsComponent |
| 4.3 | GET | `/api/contest/{contestId}` | Get contest by ID | ContestsComponent |
| 4.4 | GET | `/api/contest/slug/{contestSlug}` | Get contest by slug | ContestsComponent |
| 4.5 | POST | `/api/contest/register` | Create/register contest | ContestsComponent |
| 4.6 | POST | `/api/contest/update/{contestId}` | Update contest (**POST**, not PUT) | ContestsComponent |
| 4.7 | GET | `/api/contest/{contestSlug}/rankings` | Contest leaderboard/rankings | ContestsComponent |
| 4.8 | GET | `/api/contest/violations/{contestId}` | Contest violations | ContestsComponent |

**Notes:**
- `POST /api/contest/update/{contestId}` uses POST (not PUT) — this is a backend convention
- Rankings endpoint uses `contestSlug`, not `contestId`
- **Missing from backend**: `DELETE /api/contest/{contestId}` (contest delete), contest problem sub-resource management, participants listing, publish/end actions
- For problem selection in contest creation, use `GET /api/problems/list/simple`

---

## 5. Users Management

**Backend Controller:** `IAMController`

| # | Method | Actual Backend Path | Purpose | Admin Component |
|---|--------|-------------------|---------|-----------------|
| 5.1 | GET | `/api/iam/users` | List all users | UserManagementComponent |
| 5.2 | GET | `/api/iam/users/{userId}` | Get user by ID | UserManagementComponent |
| 5.3 | POST | `/api/iam/users` | Create user | UserManagementComponent |
| 5.4 | PUT | `/api/iam/users/{userId}` | Update user | UserManagementComponent |
| 5.5 | DELETE | `/api/iam/users/{userId}` | Delete user | UserManagementComponent |
| 5.6 | POST | `/api/iam/users/{userId}/password` | Reset/change password | UserManagementComponent |
| 5.7 | GET | `/api/iam/users/{userId}/audit` | User activity/audit log | UserManagementComponent |
| 5.8 | GET | `/api/iam/users/{userId}/sessions` | User sessions | UserManagementComponent |
| 5.9 | DELETE | `/api/iam/users/{userId}/sessions` | Revoke user sessions | UserManagementComponent |
| 5.10 | GET | `/api/iam/users/{userId}/security` | User security info | UserManagementComponent |
| 5.11 | GET | `/api/iam/users/{userId}/permissions` | User permissions | UserManagementComponent |
| 5.12 | POST | `/api/iam/users/{userId}/roles/{roleId}` | Assign role to user | UserManagementComponent |
| 5.13 | DELETE | `/api/iam/users/{userId}/roles/{roleId}` | Remove role from user | UserManagementComponent |
| 5.14 | POST | `/api/iam/users/{userId}/api-keys` | Create API key | UserManagementComponent |
| 5.15 | GET | `/api/iam/users/{userId}/api-keys` | List API keys | UserManagementComponent |
| 5.16 | DELETE | `/api/iam/api-keys/{apiKeyId}` | Delete API key | UserManagementComponent |

**User submissions (from Submission Analytics):**

| # | Method | Actual Backend Path | Purpose |
|---|--------|-------------------|---------|
| 5.17 | GET | `/zcop/api/submission/analytics/user/{userId}/statistics` | User stats |
| 5.18 | GET | `/zcop/api/submission/analytics/user/{userId}/streak` | User streak |
| 5.19 | GET | `/zcop/api/submission/analytics/user/{userId}/submissions` | Submission history |
| 5.20 | GET | `/zcop/api/submission/analytics/user/{userId}/ranking` | User rank |

**Notes:**
- Suspend/ban: use `PUT /api/iam/users/{userId}` with `status` field in body
- No dedicated user stats endpoint — compose from user list count + analytics
- User export: not available as dedicated endpoint yet

---

## 6. Blog Management

**Backend Controller:** `BlogController` — **FULLY IMPLEMENTED**

### Admin Endpoints (`/api/admin/blog/*`)

| # | Method | Actual Backend Path | Purpose | Admin Component |
|---|--------|-------------------|---------|-----------------|
| 6.1 | GET | `/api/admin/blog/posts` | List posts (with status filter + stats) | BlogComponent |
| 6.2 | GET | `/api/admin/blog/posts/{postId}` | Get post by ID | BlogEditorComponent |
| 6.3 | POST | `/api/admin/blog/posts` | Create post | BlogEditorComponent |
| 6.4 | PUT | `/api/admin/blog/posts/{postId}` | Update post (partial) | BlogEditorComponent |
| 6.5 | DELETE | `/api/admin/blog/posts/{postId}` | Delete post | BlogComponent |
| 6.6 | POST | `/api/admin/blog/posts/{postId}/publish` | Publish post | BlogComponent |
| 6.7 | GET | `/api/admin/blog/categories` | List categories | BlogComponent |
| 6.8 | POST | `/api/admin/blog/categories` | Create category | BlogComponent |
| 6.9 | PUT | `/api/admin/blog/categories/{categoryId}` | Update category | BlogComponent |
| 6.10 | DELETE | `/api/admin/blog/categories/{categoryId}` | Delete category | BlogComponent |
| 6.11 | GET | `/api/admin/blog/tags` | List all tags | BlogEditorComponent |

### Public Endpoints (`/api/blog/*`)

| # | Method | Actual Backend Path | Purpose |
|---|--------|-------------------|---------|
| 6.12 | GET | `/api/blog/posts` | Published posts (optional categoryId filter) |
| 6.13 | GET | `/api/blog/posts/{slug}` | Published post by slug (increments views) |
| 6.14 | GET | `/api/blog/categories` | Public categories |
| 6.15 | GET | `/api/blog/tags` | Public tags |

---

## 7. Mail System

**Backend Controllers:** `MailController`, `MailGroupController`, `MailWebhookController`

### Mail Sending (`/api/mail/*`)

| # | Method | Actual Backend Path | Purpose | Admin Component |
|---|--------|-------------------|---------|-----------------|
| 7.1 | POST | `/api/mail/send` | Send email | MailDashboardComponent |
| 7.2 | POST | `/api/mail/send/simple` | Send simple email | MailDashboardComponent |
| 7.3 | POST | `/api/mail/send/template` | Send template email | MailDashboardComponent |
| 7.4 | POST | `/api/mail/send/template/simple` | Send simple template email | MailDashboardComponent |
| 7.5 | POST | `/api/mail/queue` | Queue email for sending | MailDashboardComponent |
| 7.6 | POST | `/api/mail/queue/template` | Queue template email | MailDashboardComponent |
| 7.7 | POST | `/api/mail/schedule` | Schedule email | MailDashboardComponent |
| 7.8 | DELETE | `/api/mail/schedule/{scheduleId}` | Cancel scheduled email | MailDashboardComponent |
| 7.9 | GET | `/api/mail/status/{trackingId}` | Email delivery status | MailDashboardComponent |
| 7.10 | POST | `/api/mail/preview/template` | Preview email template | MailDashboardComponent |
| 7.11 | POST | `/api/mail/validate/emails` | Validate email addresses | MailDashboardComponent |
| 7.12 | GET | `/api/mail/health` | Mail service health | MailDashboardComponent |
| 7.13 | GET | `/api/mail/info` | Mail service info | MailDashboardComponent |

### Mail Groups (`/api/admin/mail/groups/*`)

| # | Method | Actual Backend Path | Purpose | Admin Component |
|---|--------|-------------------|---------|-----------------|
| 7.14 | GET | `/api/admin/mail/groups` | List mail groups | MailDashboardComponent |
| 7.15 | POST | `/api/admin/mail/groups` | Create mail group | MailDashboardComponent |
| 7.16 | DELETE | `/api/admin/mail/groups/{groupId}` | Delete mail group | MailDashboardComponent |
| 7.17 | GET | `/api/admin/mail/groups/{groupId}/members` | List group members | MailDashboardComponent |
| 7.18 | POST | `/api/admin/mail/groups/{groupId}/members` | Add member to group | MailDashboardComponent |
| 7.19 | POST | `/api/admin/mail/groups/{groupId}/members/bulk` | Bulk add members | MailDashboardComponent |
| 7.20 | DELETE | `/api/admin/mail/groups/{groupId}/members/{email}` | Remove member | MailDashboardComponent |
| 7.21 | PATCH | `/api/admin/mail/groups/{groupId}/members/{email}` | Update member | MailDashboardComponent |
| 7.22 | POST | `/api/admin/mail/groups/{groupId}/send` | Send to group | MailDashboardComponent |

### Mail Webhooks (`/api/mail/webhooks/*`)

| # | Method | Actual Backend Path | Purpose | Admin Component |
|---|--------|-------------------|---------|-----------------|
| 7.23 | GET | `/api/mail/webhooks/stats` | Delivery webhook stats | MailDashboardComponent |
| 7.24 | POST | `/api/mail/webhooks/zeptomail` | ZeptoMail webhook | (internal) |

**Notes:**
- **Missing from backend**: Email template CRUD (`GET/POST/PUT/DELETE /api/mail/templates`) — templates exist but are not managed via REST
- **Missing from backend**: Email delivery log listing (only per-email status via tracking ID)
- Campaigns are composed client-side from template + group + schedule

---

## 8. Monitoring

### 8.1 System Metrics (`/api/metrics/*`)

**Backend Controller:** `EnhancedMetricsController`

| # | Method | Actual Backend Path | Purpose | Admin Component |
|---|--------|-------------------|---------|-----------------|
| 8.1 | GET | `/api/metrics/current-hour` | Hourly request metrics | SystemHealthComponent |
| 8.2 | GET | `/api/metrics/current-day` | Daily metrics | SystemHealthComponent |
| 8.3 | GET | `/api/metrics/errors/hour/{hour}` | Errors by hour | SystemHealthComponent |
| 8.4 | GET | `/api/metrics/errors/day/{day}` | Errors by day | SystemHealthComponent |
| 8.5 | GET | `/api/metrics/endpoint/{method}/{endpoint}/error-rate` | Per-endpoint error rate | SystemHealthComponent |
| 8.6 | GET | `/api/metrics/endpoint/{method}/{endpoint}/analysis` | Per-endpoint analysis | SystemHealthComponent |
| 8.7 | GET | `/api/metrics/health` | Metrics health check | SystemHealthComponent |
| 8.8 | GET | `/api/metrics/health/analysis` | Health analysis | SystemHealthComponent |
| 8.9 | GET | `/api/metrics/dashboard` | Metrics dashboard data | SystemHealthComponent |
| 8.10 | GET | `/api/metrics/trends/24h` | 24-hour trend data | SystemHealthComponent |
| 8.11 | GET | `/api/metrics/anomalies` | Anomaly detection | SystemHealthComponent |
| 8.12 | GET | `/api/metrics/errors/analysis` | Error analysis | SystemHealthComponent |
| 8.13 | GET | `/api/metrics/custom` | Custom metric queries | SystemHealthComponent |
| 8.14 | GET | `/api/metrics/analysis/hourly-volume` | Hourly volume analysis | SystemHealthComponent |

### 8.2 Kafka Monitoring (`/api/kafka/*`)

**Backend Controllers:** Kafka Health, Kafka Lag

| # | Method | Actual Backend Path | Purpose | Admin Component |
|---|--------|-------------------|---------|-----------------|
| 8.15 | GET | `/api/kafka/health` | Kafka health | JobsComponent |
| 8.16 | POST | `/api/kafka/health/check` | Force health check | JobsComponent |
| 8.17 | GET | `/api/kafka/config` | Kafka config | JobsComponent |
| 8.18 | GET | `/api/kafka/circuit-breaker` | Circuit breaker state | JobsComponent |
| 8.19 | POST | `/api/kafka/circuit-breaker/reset` | Reset circuit breaker | JobsComponent |
| 8.20 | GET | `/api/kafka/lag/summary` | Lag summary | JobsComponent |
| 8.21 | GET | `/api/kafka/lag/current` | Current lag | JobsComponent |
| 8.22 | GET | `/api/kafka/lag/current/group/{consumerGroup}` | Lag by consumer group | JobsComponent |
| 8.23 | GET | `/api/kafka/lag/current/feature/{featureName}` | Lag by feature | JobsComponent |
| 8.24 | GET | `/api/kafka/lag/history` | Lag history | JobsComponent |
| 8.25 | GET | `/api/kafka/lag/alerts` | Lag alerts | JobsComponent |
| 8.26 | POST | `/api/kafka/lag/collect` | Trigger lag collection | JobsComponent |
| 8.27 | PUT | `/api/kafka/lag/config` | Update lag config | JobsComponent |
| 8.28 | POST | `/api/kafka/lag/enable` | Enable lag monitoring | JobsComponent |
| 8.29 | POST | `/api/kafka/lag/disable` | Disable lag monitoring | JobsComponent |

### 8.3 Interceptor / Rate Limiting (`/api/internal/interceptor/*`)

| # | Method | Actual Backend Path | Purpose | Admin Component |
|---|--------|-------------------|---------|-----------------|
| 8.30 | GET | `/api/internal/interceptor/status` | Interceptor status | NetworkComponent |
| 8.31 | GET | `/api/internal/interceptor/policies` | Rate limit policies | NetworkComponent |
| 8.32 | GET | `/api/internal/interceptor/policies/lookup` | Policy lookup | NetworkComponent |
| 8.33 | POST | `/api/internal/interceptor/policies/reload` | Reload policies | NetworkComponent |
| 8.34 | POST | `/api/internal/interceptor/engine/toggle` | Toggle engine | NetworkComponent |
| 8.35 | POST | `/api/internal/interceptor/stats/reset` | Reset stats | NetworkComponent |
| 8.36 | POST | `/api/internal/interceptor/abuse/block` | Block IP | NetworkComponent |
| 8.37 | POST | `/api/internal/interceptor/abuse/unblock` | Unblock IP | NetworkComponent |
| 8.38 | POST | `/api/internal/interceptor/abuse/whitelist` | Whitelist IP | NetworkComponent |
| 8.39 | GET | `/api/internal/interceptor/health` | Interceptor health | NetworkComponent |

### 8.4 Cache Monitoring

**Analytics-powered cache data:**

| # | Method | Actual Backend Path | Purpose | Admin Component |
|---|--------|-------------------|---------|-----------------|
| 8.40 | GET | `/zcop/api/analytics/query/feature/performance/summary?hour={hour}&date={date}` | Cache performance summary | CacheComponent |
| 8.41 | GET | `/zcop/api/analytics/query/feature/performance/key/cache_operation_hourly?operation={op}&hour={hour}` | Cache ops per hour | CacheComponent |
| 8.42 | GET | `/zcop/api/analytics/query/feature/performance/key/cache_operation_times?hour={hour}` | Cache latency | CacheComponent |

**Notes:**
- **Missing from backend**: Dedicated `GET /api/monitoring/cache/stats` REST endpoint (Redis stats not exposed via REST)
- **Missing from backend**: `POST /api/monitoring/cache/clear` (cache clear)
- **Missing from backend**: Scheduler/Jobs REST management API (no job list, trigger, history endpoints)
- **Missing from backend**: `GET /api/monitoring/database/stats` (HikariCP pool stats)
- Cache and DB data can be partially composed from analytics registry keys

### 8.5 Configuration Management (`/api/config/*`)

**Backend Controller:** `ConfigurationController`

| # | Method | Actual Backend Path | Purpose | Admin Component |
|---|--------|-------------------|---------|-----------------|
| 8.43 | GET | `/api/config` | All config values | (Settings) |
| 8.44 | GET | `/api/config/{key}` | Single config value | (Settings) |
| 8.45 | GET | `/api/config/prefix/{prefix}` | Config by prefix | (Settings) |
| 8.46 | POST | `/api/config/reload` | Reload from files | (Settings) |
| 8.47 | POST | `/api/config/hot-reload` | Hot reload | (Settings) |
| 8.48 | GET | `/api/config/sources` | Config sources | (Settings) |
| 8.49 | GET | `/api/config/listeners` | Change listeners | (Settings) |
| 8.50 | GET | `/api/config/statistics` | Config statistics | (Settings) |

---

## 9. Admin Settings

### 9.1 RBAC (Role-Based Access Control)

**Backend Controller:** `IAMController`

| # | Method | Actual Backend Path | Purpose | Admin Component |
|---|--------|-------------------|---------|-----------------|
| 9.1 | GET | `/api/iam/roles` | List roles | RbacComponent |
| 9.2 | POST | `/api/iam/roles` | Create role | RbacComponent |
| 9.3 | GET | `/api/iam/permissions` | List all permissions | RbacComponent |

**Notes:**
- **Missing from backend**: `PUT /api/iam/roles/{roleId}` (update role)
- **Missing from backend**: `DELETE /api/iam/roles/{roleId}` (delete role)

### 9.2 Audit Logs

| # | Method | Actual Backend Path | Purpose | Admin Component |
|---|--------|-------------------|---------|-----------------|
| 9.4 | GET | `/api/iam/users/{userId}/audit` | Per-user audit log | AuditLogsComponent |

**Notes:**
- **Missing from backend**: `GET /api/iam/audit-logs` (global audit log across all users)
- Currently only per-user audit is available; admin must iterate users or build a global view

### 9.3 Admin Profile

| # | Method | Actual Backend Path | Purpose | Admin Component |
|---|--------|-------------------|---------|-----------------|
| 9.5 | GET | `/api/auth/me` | Get admin profile | ProfileComponent |
| 9.6 | GET | `/api/iam/users/{userId}/sessions` | Active sessions | ProfileComponent |
| 9.7 | DELETE | `/api/iam/users/{userId}/sessions` | Revoke sessions | ProfileComponent |
| 9.8 | GET | `/api/iam/users/{userId}/security` | Security info | ProfileComponent |
| 9.9 | POST | `/api/iam/users/{userId}/password` | Change password | ProfileComponent |
| 9.10 | GET | `/api/v1/tfa/status/{userId}` | TFA status | ProfileComponent |
| 9.11 | POST | `/api/v1/tfa/setup` | Setup TFA | ProfileComponent |
| 9.12 | DELETE | `/api/v1/tfa/disable` | Disable TFA | ProfileComponent |

---

## 10. Support Tickets

**Backend Controller:** `SupportTicketController` — **FULLY IMPLEMENTED**

### Admin Endpoints (`/api/admin/support/*`)

| # | Method | Actual Backend Path | Purpose | Admin Component |
|---|--------|-------------------|---------|-----------------|
| 10.1 | GET | `/api/admin/support/tickets` | List tickets (status/priority filters + stats) | SupportTicketsComponent |
| 10.2 | GET | `/api/admin/support/tickets/{ticketId}` | Get ticket with all replies | SupportTicketsComponent |
| 10.3 | PUT | `/api/admin/support/tickets/{ticketId}` | Update ticket (partial) | SupportTicketsComponent |
| 10.4 | POST | `/api/admin/support/tickets/{ticketId}/assign` | Assign to agent | SupportTicketsComponent |
| 10.5 | POST | `/api/admin/support/tickets/{ticketId}/resolve` | Resolve ticket | SupportTicketsComponent |
| 10.6 | POST | `/api/admin/support/tickets/{ticketId}/close` | Close ticket | SupportTicketsComponent |
| 10.7 | POST | `/api/admin/support/tickets/{ticketId}/reopen` | Reopen ticket | SupportTicketsComponent |
| 10.8 | DELETE | `/api/admin/support/tickets/{ticketId}` | Delete ticket | SupportTicketsComponent |
| 10.9 | POST | `/api/admin/support/tickets/{ticketId}/notes` | Add internal note | SupportTicketsComponent |
| 10.10 | GET | `/api/admin/support/stats` | Ticket statistics | SupportTicketsComponent |
| 10.11 | GET | `/api/admin/support/categories` | List categories | SupportTicketsComponent |
| 10.12 | POST | `/api/admin/support/categories` | Create category | SupportTicketsComponent |
| 10.13 | PUT | `/api/admin/support/categories/{categoryId}` | Update category | SupportTicketsComponent |
| 10.14 | DELETE | `/api/admin/support/categories/{categoryId}` | Delete category | SupportTicketsComponent |

### User Endpoints (`/api/support/*`)

| # | Method | Actual Backend Path | Purpose |
|---|--------|-------------------|---------|
| 10.15 | POST | `/api/support/tickets` | Submit ticket |
| 10.16 | GET | `/api/support/tickets` | List own tickets |
| 10.17 | GET | `/api/support/tickets/{ticketId}` | Get own ticket |
| 10.18 | POST | `/api/support/tickets/{ticketId}/replies` | Add reply |
| 10.19 | GET | `/api/support/categories` | List categories |

---

## 11. Communication

### Contest Chat (`/api/contest/chat/*`)

**Backend Controller:** `ContestApiController`, `AdminChatController`

| # | Method | Actual Backend Path | Purpose | Admin Component |
|---|--------|-------------------|---------|-----------------|
| 11.1 | GET | `/api/contest/chat/{contestId}/history` | Chat history | CommunicationComponent |
| 11.2 | POST | `/api/contest/chat/{contestId}/announcement` | Post announcement | CommunicationComponent |
| 11.3 | GET | `/api/contest/chat/{contestId}/statistics` | Chat stats | CommunicationComponent |
| 11.4 | GET | `/api/contest/chat/{contestId}/search` | Search messages | CommunicationComponent |
| 11.5 | DELETE | `/api/contest/chat/{contestId}/messages/{messageId}` | Delete message | CommunicationComponent |
| 11.6 | GET | `/api/contest/chat/{contestId}/recent` | Recent messages | CommunicationComponent |

### Admin Chat Panel (`/admin/contest-chat/*`)

| # | Method | Actual Backend Path | Purpose | Admin Component |
|---|--------|-------------------|---------|-----------------|
| 11.7 | GET | `/admin/contest-chat/api/contests` | List chat-enabled contests | CommunicationComponent |
| 11.8 | GET | `/admin/contest-chat/api/{contestId}/participants` | Contest participants | CommunicationComponent |
| 11.9 | POST | `/admin/contest-chat/api/{contestId}/message` | Send message | CommunicationComponent |
| 11.10 | POST | `/admin/contest-chat/api/{contestId}/broadcast` | Broadcast message | CommunicationComponent |
| 11.11 | POST | `/admin/contest-chat/api/{contestId}/moderate` | Moderate chat | CommunicationComponent |
| 11.12 | GET | `/admin/contest-chat/api/{contestId}/analytics` | Chat analytics | CommunicationComponent |
| 11.13 | GET | `/admin/contest-chat/api/{contestId}/export` | Export chat | CommunicationComponent |
| 11.14 | DELETE | `/admin/contest-chat/api/{contestId}/clear` | Clear chat | CommunicationComponent |

### WebSocket Management (`/api/websocket/*`)

| # | Method | Actual Backend Path | Purpose | Admin Component |
|---|--------|-------------------|---------|-----------------|
| 11.15 | GET | `/api/websocket/stats` | WebSocket stats | CommunicationComponent |
| 11.16 | POST | `/api/websocket/send-message` | Send WS message | CommunicationComponent |
| 11.17 | POST | `/api/websocket/broadcast` | Broadcast WS | CommunicationComponent |
| 11.18 | GET | `/api/websocket/temp-tokens` | Temp tokens | CommunicationComponent |
| 11.19 | POST | `/api/websocket/expire-temp-token` | Expire temp token | CommunicationComponent |
| 11.20 | POST | `/api/websocket/expire-all-temp-tokens` | Expire all | CommunicationComponent |
| 11.21 | GET | `/api/websocket/health` | WS health | CommunicationComponent |

---

## 12. Logs & Anomaly Detection

**Notes:** These admin components currently have no backend endpoints. Data should be sourced from:

### Logs Viewer

| # | Method | Actual Backend Path | Purpose | Admin Component |
|---|--------|-------------------|---------|-----------------|
| 12.1 | GET | `/api/metrics/errors/hour/{hour}` | Errors by hour | LogsViewerComponent |
| 12.2 | GET | `/api/metrics/errors/day/{day}` | Errors by day | LogsViewerComponent |
| 12.3 | GET | `/api/metrics/errors/analysis` | Error analysis | LogsViewerComponent |
| 12.4 | GET | `/zcop/api/analytics/query/feature/system/key/system_errors?hour={hour}` | System error count | LogsViewerComponent |
| 12.5 | GET | `/zcop/api/analytics/query/feature/system/key/error_types?errorType={type}&date={date}` | Errors by type | LogsViewerComponent |
| 12.6 | GET | `/zcop/api/analytics/query/feature/performance/key/slow_query_log?date={date}` | Slow query log | LogsViewerComponent |

### Anomaly Detection

| # | Method | Actual Backend Path | Purpose | Admin Component |
|---|--------|-------------------|---------|-----------------|
| 12.7 | GET | `/api/metrics/anomalies` | Detected anomalies | AnomalyDetectionComponent |
| 12.8 | GET | `/api/metrics/health/analysis` | Health analysis | AnomalyDetectionComponent |
| 12.9 | GET | `/zcop/api/analytics/query/feature/internal/key/analytics_errors?date={date}` | Analytics errors | AnomalyDetectionComponent |

**Missing from backend:**
- Dedicated log streaming endpoint (WebSocket or SSE)
- Anomaly acknowledge/resolve endpoints
- Log export endpoint

---

## 13. Alert Rules & Notifications

**Notes:** No dedicated alert management backend exists. Partial data from:

### Alert Rules

| # | Method | Actual Backend Path | Purpose | Admin Component |
|---|--------|-------------------|---------|-----------------|
| 13.1 | GET | `/api/kafka/lag/alerts` | Kafka lag alerts | AlertRulesComponent |
| 13.2 | GET | `/api/metrics/anomalies` | Metric anomalies | AlertRulesComponent |

### Notifications

Currently no backend notification endpoints. Admin notifications should be sourced from:
- Kafka lag alerts (`/api/kafka/lag/alerts`)
- Metric anomalies (`/api/metrics/anomalies`)
- Interceptor status changes (`/api/internal/interceptor/status`)

**Missing from backend:**
- Alert rule CRUD (`GET/POST/PUT/DELETE /api/alerts/rules`)
- Notification management (`GET/PUT/DELETE /api/notifications`)
- Notification preferences

---

## 14. Global Search

**Notes:** No global search backend endpoint exists.

Suggested approach for admin search:
- Users: `GET /api/iam/users?search={query}`
- Problems: `GET /api/problems/search?q={query}`
- Contests: `GET /api/contest/search?q={query}`
- Blog: `GET /api/admin/blog/posts?search={query}`
- Tickets: `GET /api/admin/support/tickets?search={query}`
- Analytics keys: `GET /zcop/api/analytics/registry/keys/search?q={query}`

The frontend `GlobalSearchComponent` should fan out to multiple endpoints and merge results.

---

## 15. Analytics Registry

**Backend Controller:** `AnalyticsRegistryController`

Base: `/zcop/api/analytics`

### Discovery Endpoints

| # | Method | Actual Backend Path | Purpose |
|---|--------|-------------------|---------|
| 15.1 | GET | `/zcop/api/analytics/registry/features` | List all features + key names |
| 15.2 | GET | `/zcop/api/analytics/registry/features/{feature}/keys` | Key definitions for feature |
| 15.3 | GET | `/zcop/api/analytics/registry/keys` | All keys (optional `?type=counter`) |
| 15.4 | GET | `/zcop/api/analytics/registry/keys/search?q={query}` | Search keys |
| 15.5 | POST | `/zcop/api/analytics/registry/reload` | Hot-reload registry |

### Data Query Endpoints

| # | Method | Actual Backend Path | Purpose |
|---|--------|-------------------|---------|
| 15.6 | GET | `/zcop/api/analytics/query/feature/{feature}/summary?var=val` | Feature summary |
| 15.7 | GET | `/zcop/api/analytics/query/feature/{feature}/key/{keyName}?var=val` | Single key query |

### Submission Analytics

| # | Method | Actual Backend Path | Purpose |
|---|--------|-------------------|---------|
| 15.8 | GET | `/zcop/api/submission/analytics/dashboard` | Platform analytics dashboard |
| 15.9 | GET | `/zcop/api/submission/analytics/user/{userId}/statistics` | Per-user stats |
| 15.10 | GET | `/zcop/api/submission/analytics/user/{userId}/streak` | User streak |
| 15.11 | GET | `/zcop/api/submission/analytics/leaderboard/global` | Global leaderboard |
| 15.12 | GET | `/zcop/api/submission/analytics/leaderboard/difficulty/{difficulty}` | By difficulty |
| 15.13 | GET | `/zcop/api/submission/analytics/user/{userId}/ranking` | User rank |
| 15.14 | GET | `/zcop/api/submission/analytics/user/{userId}/submissions` | Submission history |
| 15.15 | GET | `/zcop/api/submission/analytics/problem/{problemId}/engagement` | Problem engagement |
| 15.16 | GET | `/zcop/api/submission/analytics/language/{language}` | Language stats |
| 15.17 | GET | `/zcop/api/submission/analytics/performance/{language}` | Language performance |

---

## 16. Achievements

**Backend Controllers:** `AchievementController`, `UserAchievementController`, `LeaderboardController`

| # | Method | Actual Backend Path | Purpose |
|---|--------|-------------------|---------|
| 16.1 | GET | `/api/achievements` | List achievements |
| 16.2 | POST | `/api/achievements` | Create achievement |
| 16.3 | GET | `/api/achievements/{id}` | Get achievement |
| 16.4 | PUT | `/api/achievements/{id}` | Update achievement |
| 16.5 | DELETE | `/api/achievements/{id}` | Delete achievement |
| 16.6 | GET | `/api/achievements/code/{code}` | Get by code |
| 16.7 | GET | `/api/achievements/category/{categoryId}` | By category |
| 16.8 | GET | `/api/achievements/tier/{tierId}` | By tier |
| 16.9 | GET | `/api/achievements/event/{eventType}` | By event type |
| 16.10 | POST | `/api/achievements/import` | Import achievements |
| 16.11 | GET | `/api/achievements/export` | Export achievements |
| 16.12 | GET | `/api/user-achievements/user/{userId}` | User achievements |
| 16.13 | GET | `/api/user-achievements/user/{userId}/unlocked` | Unlocked achievements |
| 16.14 | GET | `/api/user-achievements/user/{userId}/stats` | Achievement stats |
| 16.15 | GET | `/api/user-achievements/user/{userId}/progress` | Progress tracker |
| 16.16 | GET | `/api/leaderboard/global` | Global achievement leaderboard |
| 16.17 | GET | `/api/leaderboard/achievements/rare` | Rarest achievements |
| 16.18 | GET | `/api/leaderboard/achievements/popular` | Most popular achievements |

---

## 17. Ranking

**Backend Controller:** Ranking API

| # | Method | Actual Backend Path | Purpose |
|---|--------|-------------------|---------|
| 17.1 | GET | `/api/ranking/global` | Global leaderboard |
| 17.2 | GET | `/api/ranking/global/top/{n}` | Top N users |
| 17.3 | GET | `/api/ranking/user/{userId}` | User rank |
| 17.4 | GET | `/api/ranking/user/{userId}/nearby` | Nearby users |
| 17.5 | GET | `/api/ranking/monthly` | Monthly leaderboard |
| 17.6 | GET | `/api/ranking/difficulty/{difficulty}` | By difficulty |
| 17.7 | GET | `/api/ranking/regional/{region}` | Regional |
| 17.8 | GET | `/api/ranking/stats` | Platform ranking stats |
| 17.9 | GET | `/api/ranking/search` | Search rankings |

---

## 18. RealWorld Problems

**Backend Controllers:** Admin + Public RealWorld

| # | Method | Actual Backend Path | Purpose |
|---|--------|-------------------|---------|
| 18.1 | POST | `/api/admin/realworld-problems` | Create RW problem |
| 18.2 | GET | `/api/admin/realworld-problems` | List all RW problems |
| 18.3 | GET | `/api/admin/realworld-problems/{slug}` | Get by slug |
| 18.4 | PUT | `/api/admin/realworld-problems/{slug}` | Update |
| 18.5 | DELETE | `/api/admin/realworld-problems/{slug}` | Delete |
| 18.6 | PATCH | `/api/admin/realworld-problems/{slug}/active` | Toggle active |
| 18.7 | POST | `/api/admin/realworld/recalculate-percentiles` | Recalculate scores |
| 18.8 | GET | `/api/realworld/problems` | Public listing |
| 18.9 | GET | `/api/realworld/problems/{slug}` | Get by slug |
| 18.10 | GET | `/api/realworld/statistics` | Platform stats |
| 18.11 | GET | `/api/realworld/leaderboard/problem/{slug}` | Problem leaderboard |
| 18.12 | GET | `/api/realworld/leaderboard/global` | Global RW leaderboard |

---

## 19. Webhooks

**Backend Controller:** `WebhookController`

| # | Method | Actual Backend Path | Purpose |
|---|--------|-------------------|---------|
| 19.1 | POST | `/api/webhooks/trigger` | Trigger event |
| 19.2 | POST | `/api/webhooks/trigger-async` | Async trigger |
| 19.3 | POST | `/api/webhooks/trigger-all` | Trigger all listeners |
| 19.4 | POST | `/api/webhooks/trigger-external` | External trigger |
| 19.5 | GET | `/api/webhooks/listeners/{eventType}` | Listeners for event |
| 19.6 | POST | `/api/webhooks/endpoints` | Create endpoint |
| 19.7 | GET | `/api/webhooks/endpoints` | List endpoints |
| 19.8 | GET | `/api/webhooks/endpoints/{endpointId}` | Get endpoint |
| 19.9 | DELETE | `/api/webhooks/endpoints/{endpointId}` | Delete endpoint |
| 19.10 | PATCH | `/api/webhooks/endpoints/{endpointId}/status` | Toggle endpoint |

---

## Summary: Component → API Mapping

| Admin Component | Backend Path Prefix | Status |
|----------------|--------------------|---------| 
| LoginComponent | `/api/auth/login` | ✅ Ready |
| DashboardComponent | `/api/dashboard/*`, `/api/metrics/*`, `/zcop/api/analytics/*` | ⚠️ Compose from multiple |
| ProblemsComponent | `/api/problems/*`, `/api/admin/problems/*` | ✅ Ready |
| ProblemEditorComponent | `/api/admin/problems/*` | ✅ Ready |
| ContestsComponent | `/api/contest/*` | ⚠️ Partial (no delete, non-REST update) |
| BlogComponent | `/api/admin/blog/*` | ✅ Fully implemented |
| BlogEditorComponent | `/api/admin/blog/*` | ✅ Fully implemented |
| UserManagementComponent | `/api/iam/users/*` | ✅ Ready |
| SupportTicketsComponent | `/api/admin/support/*` | ✅ Fully implemented |
| CommunicationComponent | `/api/contest/chat/*`, `/admin/contest-chat/*`, `/api/websocket/*` | ⚠️ Contest-scoped only |
| BulkEmailComponent | `/api/mail/*`, `/api/admin/mail/groups/*` | ⚠️ No template CRUD |
| MailDashboardComponent | `/api/mail/*`, `/api/admin/mail/groups/*` | ⚠️ No template CRUD |
| RbacComponent | `/api/iam/roles`, `/api/iam/permissions` | ⚠️ No role update/delete |
| AuditLogsComponent | `/api/iam/users/{id}/audit` | ⚠️ Per-user only |
| ProfileComponent | `/api/auth/me`, `/api/iam/users/{id}/*`, `/api/v1/tfa/*` | ✅ Ready |
| GlobalSearchComponent | Fan-out to multiple endpoints | ⚠️ No unified search |
| SystemHealthComponent | `/api/metrics/*` | ✅ Ready |
| CacheComponent | `/zcop/api/analytics/query/feature/performance/*` | ⚠️ No REST cache stats |
| DatabaseComponent | (none) | ❌ Missing backend |
| JobsComponent | `/api/kafka/*` | ⚠️ Kafka only, no scheduler |
| NetworkComponent | `/api/internal/interceptor/*` | ✅ Ready |
| LogsViewerComponent | `/api/metrics/errors/*`, analytics | ⚠️ No streaming |
| AnomalyDetectionComponent | `/api/metrics/anomalies` | ⚠️ Partial |
| AlertRulesComponent | (none) | ❌ Missing backend |
| NotificationsComponent | (none) | ❌ Missing backend |

---

## Endpoints Missing from Backend (Need to Build)

| Priority | Endpoint | Purpose |
|----------|---------|---------|
| HIGH | `DELETE /api/contest/{contestId}` | Contest delete |
| HIGH | `PUT /api/iam/roles/{roleId}` | Role update |
| HIGH | `DELETE /api/iam/roles/{roleId}` | Role delete |
| HIGH | `GET /api/iam/audit-logs` | Global audit log |
| MEDIUM | `GET /api/monitoring/cache/stats` | Redis stats via REST |
| MEDIUM | `POST /api/monitoring/cache/clear` | Cache clear |
| MEDIUM | `GET /api/monitoring/database/stats` | DB pool stats |
| MEDIUM | `GET /api/monitoring/jobs` | Scheduler job list |
| MEDIUM | `POST /api/monitoring/jobs/{id}/trigger` | Manual job trigger |
| MEDIUM | Email template CRUD | `/api/mail/templates/*` |
| MEDIUM | `GET /api/mail/logs` | Email delivery log |
| LOW | Alert rule CRUD | `/api/alerts/rules/*` |
| LOW | Notification management | `/api/notifications/*` |
| LOW | Global search aggregator | `/api/admin/search` |
| LOW | Log streaming | WebSocket/SSE |

---

## Rate Limiting

| Endpoint Category | Rate Limit |
|-------------------|------------|
| Authentication | 10 requests/minute |
| Read Operations | 100 requests/minute |
| Write Operations | 30 requests/minute |
| File Upload | 10 requests/minute |
| Export | 5 requests/hour |

---

## Error Codes

| Code | Description |
|------|-------------|
| ERR_001 | Invalid request parameters |
| ERR_002 | Authentication required |
| ERR_003 | Insufficient permissions |
| ERR_004 | Resource not found |
| ERR_005 | Resource already exists |
| ERR_006 | Validation failed |
| ERR_007 | Rate limit exceeded |
| ERR_008 | Service unavailable |
| ERR_009 | Internal server error |

---

## Changelog

### v2.0.0 (2026-03-02)
- **BREAKING**: Updated all endpoint URLs to match actual backend controllers
- **BREAKING**: Changed base URL from `/admin/v1` to bare host (no prefix)
- Added 8 new modules: Analytics Registry, Achievements, Ranking, RealWorld Problems, Webhooks, Kafka Monitoring, Interceptor Management, Configuration
- Documented all 65 backend controllers
- Mapped every admin component to exact backend path
- Added "Missing from Backend" tracking section

### v1.0.0 (2026-01-31)
- Initial API specification
