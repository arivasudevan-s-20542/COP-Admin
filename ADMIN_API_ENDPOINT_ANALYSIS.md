# Admin API Endpoint Analysis
## zcop-admin vs zcop Backend — Gap Analysis & Restructuring Guide

> **Purpose**: Document all endpoint mismatches, missing implementations, and suggested URL changes
> needed to align the `zcop-admin` Angular frontend with the actual `zcop` Spring Boot backend.
>
> **Scope**: Documentation only — no code changes.
>
> **Admin Spec Source**: `zcop-admin/API_SPECIFICATION.md` (1,870 lines, 11 modules)
> **Backend Source**: All 65 production controllers in `zcop/src/main/java/com/zcop/`

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Critical Base URL Mismatch](#critical-base-url-mismatch)
3. [Module Analysis](#module-analysis)
   - [Authentication](#1-authentication)
   - [Dashboard](#2-dashboard)
   - [Problems Management](#3-problems-management)
   - [Contests Management](#4-contests-management)
   - [Users Management](#5-users-management)
   - [Mail System](#6-mail-system)
   - [Monitoring](#7-monitoring)
   - [Admin Settings (RBAC)](#8-admin-settings-rbac)
   - [Blog Management](#9-blog-management)
   - [Support Tickets](#10-support-tickets)
   - [Communication](#11-communication)
4. [Backend Endpoints Uncovered by Admin Spec](#backend-endpoints-uncovered-by-admin-spec)
5. [Summary Tables](#summary-tables)
6. [Recommended Restructuring Strategy](#recommended-restructuring-strategy)

---

## Executive Summary

| Category | Count |
|---|---|
| Admin spec modules | 11 |
| Backend controllers analyzed | 65 |
| Admin spec endpoints that exist on backend (path change only) | ~45 |
| Admin spec endpoints that are partially implemented | ~12 |
| Admin spec endpoints completely missing from backend | ~18 |
| Backend endpoint groups with zero admin coverage | 14 |

**Root Cause of Most Mismatches**: The zcop-admin spec assumes a single unified base path `/admin/v1/` for all resources. The actual zcop backend uses scattered, feature-specific base paths: `/api/iam/`, `/api/contest/`, `/zcop/api/submission/`, `/api/admin/problems/`, etc. The URL changes required are almost entirely structural prefixes — the actual operations exist.

---

## Critical Base URL Mismatch

**Admin spec `environment.apiUrl`**: `http://localhost:8080/admin/v1`

**Actual backend**: No `/admin/v1` prefix exists anywhere in the backend. All endpoints are directly under `http://localhost:8080`.

| Admin Spec Pattern | Actual Backend Pattern |
|---|---|
| `/admin/v1/auth/*` | `/api/auth/*` or `/api/iam/auth/*` |
| `/admin/v1/users/*` | `/api/iam/users/*` |
| `/admin/v1/problems/*` | `/api/problems/*` or `/api/admin/problems/*` |
| `/admin/v1/contests/*` | `/api/contest/*` |
| `/admin/v1/dashboard/*` | `/api/dashboard/*` |
| `/admin/v1/mail/*` | `/api/admin/mail/groups/*` or `/api/mail/*` |
| `/admin/v1/monitoring/*` | Spread across `/api/metrics/*`, `/api/kafka/*`, `/api/config/*` |
| `/admin/v1/admin/*` | `/api/iam/*` + `/api/config/*` |

**Suggestion**: Either (a) add a Spring reverse-proxy layer that maps `/admin/v1/` → actual paths, (b) update `environment.apiUrl` to `http://localhost:8080` and fix all service files to use correct paths, or (c) add an `AdminFacadeController` that aggregates calls under the `/admin/v1/` namespace.

---

## Module Analysis

---

### 1. Authentication

#### Admin Spec Expects
| Method | Admin Spec Path | Purpose |
|---|---|---|
| POST | `/auth/login` | Admin login |
| POST | `/auth/logout` | Admin logout |
| GET | `/auth/me` | Get current admin profile |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/forgot-password` | Password reset request |
| POST | `/auth/reset-password` | Password reset confirm |

#### Actual Backend
| Method | Actual Path | Controller | Status |
|---|---|---|---|
| POST | `/api/auth/login` | `JwtAuthController` | ✅ Exists |
| POST | `/api/iam/auth/login` | `IAMController` | ✅ Exists (IAM variant) |
| POST | `/api/auth/logout` | `JwtAuthController` | ✅ Exists |
| POST | `/api/iam/auth/logout` | `IAMController` | ✅ Exists (IAM variant) |
| GET | `/api/auth/me` | `JwtAuthController` | ✅ Exists |
| POST | `/api/auth/refresh` | `JwtAuthController` | ✅ Exists |
| POST | `/api/iam/auth/refresh` | `IAMController` | ✅ Exists (IAM variant) |
| POST | `/api/auth/forgot-password` | `PublicAuthController` | ✅ Exists |
| POST | `/api/auth/reset-password` | `PublicAuthController` | ✅ Exists |
| GET | `/api/auth/validate` | `JwtAuthController` | ✅ Extra (not in spec) |
| GET | `/api/iam/auth/validate` | `IAMController` | ✅ Extra |

#### Additional Auth Endpoints Not in Admin Spec
- `POST /api/auth/register` — user registration
- `GET /api/auth/check-username`, `GET /api/auth/check-email` — availability checks
- `POST /api/auth/verify-otp`, `GET /api/auth/verify-email` — email verification
- `POST /api/auth/resend-verification` — resend email
- `POST /api/auth/tfa/complete` — TFA completion
- Full TFA management: `POST /api/v1/tfa/setup`, `/setup/confirm`, `/verify`, `/backup/verify`, `/backup/regenerate`, `DELETE /api/v1/tfa/disable`
- TFA login flow: `POST /api/v1/tfa/login/init`, `/login/complete`
- TFA status: `GET /api/v1/tfa/status/{userId}`, `/check/{userId}`
- OAuth flows: `/auth/google/**`, `/auth/github/**`, `/auth/zoho/**`
- Admin token management: `POST /api/auth/admin/tokens/expire`, `/expire-all`, `GET /api/auth/admin/tokens/list`
- SysAdmin credentials: `GET /api/internal/sysadmin/credentials`, `POST .../rotate`, `.../reset`

#### Required Changes
1. Change `environment.apiUrl` from `http://localhost:8080/admin/v1` to `http://localhost:8080`
2. Update all auth service calls from `/auth/login` → `/api/auth/login`
3. Consider using `/api/iam/auth/*` variants for admin-privileged login flows

---

### 2. Dashboard

#### Admin Spec Expects
| Method | Admin Spec Path | Purpose |
|---|---|---|
| GET | `/dashboard/stats` | Aggregate platform overview stats |
| GET | `/dashboard/recent-activity` | Recent platform events |
| GET | `/dashboard/charts/submissions` | Submission chart data |
| GET | `/dashboard/charts/users` | User growth chart data |
| GET | `/dashboard/alerts` | Active system alerts |

#### Actual Backend
| Method | Actual Path | Controller | Status |
|---|---|---|---|
| GET | `/api/dashboard/submissions` | `DashboardApiController` | ⚠️ Partial (only submissions) |
| GET | `/api/dashboard/scores` | `DashboardApiController` | ⚠️ Partial (scores) |
| GET | `/api/dashboard/problems/active-users` | `DashboardApiController` | ⚠️ Partial |
| GET | `/api/dashboard/ai-insights` | `DashboardApiController` | ⚠️ Extra |
| GET | `/api/dashboard/realtime` | `DashboardApiController` | ⚠️ Extra |
| GET | `/api/dashboard/performance` | `DashboardApiController` | ⚠️ Extra |
| GET | `/api/dashboard/blockchain/achievements/{userId}` | `DashboardApiController` | ⚠️ Extra |

#### Gap Analysis
- **Missing**: `GET /dashboard/stats` — no single aggregate stats endpoint; backend splits stats across multiple endpoints
- **Missing**: `GET /dashboard/recent-activity` — no recent activity feed endpoint
- **Missing**: `GET /dashboard/charts/submissions` — backend has `/api/metrics/trends/24h` which covers this partially; no chart-optimized format
- **Missing**: `GET /dashboard/charts/users` — no user growth chart endpoint
- **Missing**: `GET /dashboard/alerts` — no alerts endpoint (alerts module in admin spec is separate)

#### Required Changes
1. Update paths from `/dashboard/*` → `/api/dashboard/*`
2. Replace single `GET /dashboard/stats` admin call with multiple calls to `/api/dashboard/submissions`, `/scores`, `/problems/active-users` and merge results in Angular service
3. Consider adding `GET /api/dashboard/aggregate` to the backend as a facade endpoint

---

### 3. Problems Management

#### Admin Spec Expects
| Method | Admin Spec Path | Purpose |
|---|---|---|
| GET | `/problems` | List all problems |
| GET | `/problems/:id` | Get problem by ID |
| POST | `/problems` | Create new problem |
| PUT | `/problems/:id` | Update problem |
| DELETE | `/problems/:id` | Delete problem |
| GET | `/problems/:id/test-cases` | Get test cases |
| POST | `/problems/:id/test-cases` | Add test cases |
| PUT | `/problems/:id/test-cases/:id` | Update test case |
| DELETE | `/problems/:id/test-cases/:id` | Delete test case |
| GET | `/problems/categories` | List categories |
| GET | `/problems/tags` | List tags |
| POST | `/problems/:id/publish` | Publish problem |
| POST | `/problems/:id/archive` | Archive problem |

#### Actual Backend
| Method | Actual Path | Controller | Status |
|---|---|---|---|
| GET | `/api/problems` | `ProblemMetaController` | ✅ Exists |
| GET | `/api/problems/list/simple` | `ProblemMetaController` | ✅ Exists |
| GET | `/api/problems/search` | `ProblemMetaController` | ✅ Exists |
| GET | `/api/problems/stats` | `ProblemMetaController` | ✅ Exists |
| GET | `/api/problems/{slug}` | `ProblemMetaController` | ✅ Exists (by slug) |
| GET | `/api/problems/id/{problemId}` | `ProblemMetaController` | ✅ Exists (by ID) |
| GET | `/api/problems/desc/{problemSlug}` | `ProblemMetaController` | ✅ Exists |
| GET | `/api/problems/languages` | `ProblemMetaController` | ✅ Exists |
| POST | `/api/admin/problems` | `ProblemController` | ✅ Exists |
| GET | `/api/admin/problems/{problemId}` | `ProblemController` | ✅ Exists |
| PUT | `/api/admin/problems/{problemId}` | `ProblemController` | ✅ Exists |
| DELETE | `/api/admin/problems/{problemId}` | `ProblemController` | ✅ Exists |

#### Gap Analysis
- **Path Mismatch**: Admin uses `/problems`, backend splits between `/api/problems` (public) and `/api/admin/problems` (admin CRUD)
- **Missing**: No dedicated test-cases sub-resource endpoints (`/problems/:id/test-cases`) — test cases appear to be part of the problem payload in create/update
- **Missing**: `GET /problems/categories` — no categories endpoint (categories likely filters on problem list)
- **Missing**: `GET /problems/tags` — no tags endpoint
- **Missing**: `POST /problems/:id/publish` — no explicit publish action; likely managed via `PUT /api/admin/problems/{id}` with status field
- **Missing**: `POST /problems/:id/archive` — same as above; no archive action endpoint
- **ID vs Slug**: Backend uses both `/{problemId}` (numeric) and `/{slug}` (string) — admin spec uses `:id` uniformly

#### Required Changes
1. For list/get: update paths from `/problems` → `/api/problems`
2. For admin CRUD: update paths from `/problems` → `/api/admin/problems`
3. For test cases: use the included payload in PUT `/api/admin/problems/{problemId}` instead of sub-resource endpoints
4. For publish/archive: use `PUT /api/admin/problems/{problemId}` with a `status` field in the body
5. Decide on ID vs slug consistently for admin use (recommend `problemId` numeric for admin)

---

### 4. Contests Management

#### Admin Spec Expects
| Method | Admin Spec Path | Purpose |
|---|---|---|
| GET | `/contests` | List all contests |
| GET | `/contests/:id` | Get contest by ID |
| POST | `/contests` | Create contest |
| PUT | `/contests/:id` | Update contest |
| DELETE | `/contests/:id` | Delete contest |
| GET | `/contests/:id/problems` | Get contest problems |
| POST | `/contests/:id/problems` | Add problem to contest |
| DELETE | `/contests/:id/problems/:problemId` | Remove problem from contest |
| GET | `/contests/:id/participants` | Get participants |
| GET | `/contests/:id/leaderboard` | Get leaderboard |
| POST | `/contests/:id/publish` | Publish contest |
| POST | `/contests/:id/end` | End contest |

#### Actual Backend
| Method | Actual Path | Controller | Status |
|---|---|---|---|
| GET | `/api/contest/list` | `ContestApiController` | ✅ Exists |
| GET | `/api/contest/search` | `ContestApiController` | ✅ Exists |
| GET | `/api/contest/{contestId}` | `ContestApiController` | ✅ Exists |
| GET | `/api/contest/slug/{contestSlug}` | `ContestApiController` | ✅ Exists |
| POST | `/api/contest/register` | `ContestApiController` | ✅ Exists (different action name) |
| POST | `/api/contest/update/{contestId}` | `ContestApiController` | ⚠️ Exists but wrong HTTP method (POST not PUT) |
| GET | `/api/contest/{contestSlug}/rankings` | `ContestApiController` | ✅ Exists |
| GET | `/api/contest/violations/{contestId}` | `ContestViolationController` | ✅ Extra |

#### Gap Analysis
- **Method Mismatch**: Admin uses `PUT /contests/:id` but backend uses `POST /api/contest/update/{contestId}`
- **Path Mismatch**: Backend uses action-based names (`/register`, `/update/{id}`) instead of REST conventions
- **Missing**: `DELETE /contests/:id` — no contest delete endpoint exists on the backend
- **Missing**: `/contests/:id/problems` sub-resource — no endpoint to list/add/remove problems from a contest directly
- **Missing**: `/contests/:id/participants` — no dedicated participants listing endpoint (participants found via submission queries)
- **Missing**: `POST /contests/:id/publish` — no publish action endpoint, handled via update
- **Missing**: `POST /contests/:id/end` — no end action endpoint
- **Naming**: Backend uses `rankings` while admin spec uses `leaderboard` for the same concept
- **ID type**: Backend `rankings` endpoint uses `contestSlug`, not `contestId`

#### Required Changes
1. Rename: `/contests` → `/api/contest/list` (for list), `/api/contest/{id}` (for single)
2. Rename: `POST /contests` → `POST /api/contest/register`
3. Method fix needed on backend: `POST /api/contest/update/{id}` should ideally be `PUT /api/contest/{id}`; until then admin must use `POST` with the action path
4. Add `DELETE /api/contest/{contestId}` endpoint to backend
5. Add `/api/contest/{contestId}/problems` management endpoints to backend
6. Rename: `/contests/:id/leaderboard` → `/api/contest/{slug}/rankings`

---

### 5. Users Management

#### Admin Spec Expects
| Method | Admin Spec Path | Purpose |
|---|---|---|
| GET | `/users` | List all users |
| GET | `/users/:id` | Get user |
| POST | `/users` | Create user |
| PUT | `/users/:id` | Update user |
| DELETE | `/users/:id` | Delete user |
| PUT | `/users/:id/status` | Suspend / ban user |
| GET | `/users/:id/activity` | User activity log |
| POST | `/users/:id/reset-password` | Force password reset |
| GET | `/users/:id/submissions` | User submission history |
| GET | `/users/:id/contests` | User contest history |

#### Actual Backend
| Method | Actual Path | Controller | Status |
|---|---|---|---|
| GET | `/api/iam/users` | `IAMController` | ✅ Exists |
| GET | `/api/iam/users/{userId}` | `IAMController` | ✅ Exists |
| POST | `/api/iam/users` | `IAMController` | ✅ Exists |
| PUT | `/api/iam/users/{userId}` | `IAMController` | ✅ Exists |
| DELETE | `/api/iam/users/{userId}` | `IAMController` | ✅ Exists |
| GET | `/api/iam/users/{userId}/audit` | `IAMController` | ⚠️ Close match (per-user audit) |
| POST | `/api/iam/users/{userId}/password` | `IAMController` | ✅ Exists |
| GET | `/api/iam/users/{userId}/sessions` | `IAMController` | ✅ Exists |
| DELETE | `/api/iam/users/{userId}/sessions` | `IAMController` | ✅ Exists |
| GET | `/api/iam/users/{userId}/security` | `IAMController` | ✅ Exists |
| GET | `/api/iam/users/{userId}/permissions` | `IAMController` | ✅ Exists |
| POST | `/api/iam/users/{userId}/roles/{roleId}` | `IAMController` | ✅ Exists |
| DELETE | `/api/iam/users/{userId}/roles/{roleId}` | `IAMController` | ✅ Exists |
| POST | `/api/iam/users/{userId}/api-keys` | `IAMController` | ✅ Exists |
| GET | `/api/iam/users/{userId}/api-keys` | `IAMController` | ✅ Exists |
| DELETE | `/api/iam/api-keys/{apiKeyId}` | `IAMController` | ✅ Exists |

#### Gap Analysis
- **Path Prefix**: All backend paths are under `/api/iam/`; admin spec uses `/users/`
- **Missing**: `PUT /users/:id/status` — no dedicated status endpoint; user status likely part of `PUT /api/iam/users/{userId}` body; needs confirmation
- **Missing**: `GET /users/:id/activity` — `/api/iam/users/{userId}/audit` covers this but only per-user; parameter naming differs
- **Missing**: `GET /users/:id/submissions` — must call `/zcop/api/submission/status/all` filtered by userId or use analytics endpoint
- **Missing**: `GET /users/:id/contests` — no direct "contests this user participated in" endpoint
- **Extra on Backend (not in spec)**: Sessions, API keys, per-user security, per-user permissions, role assignment — all very useful for an admin tool and should be added to the spec

#### Required Changes
1. Update all paths from `/users/*` → `/api/iam/users/*`
2. For user status (ban/suspend): use `PUT /api/iam/users/{userId}` with status field; add dedicated `PATCH /api/iam/users/{userId}/status` if needed
3. For user activity: map to `/api/iam/users/{userId}/audit`
4. For user submissions: call `/zcop/api/submission/analytics/user/{userId}/submissions`
5. Expand admin spec to include session management, API key management, role assignment

---

### 6. Mail System

#### Admin Spec Expects
| Method | Admin Spec Path | Purpose |
|---|---|---|
| GET | `/mail/templates` | List email templates |
| POST | `/mail/templates` | Create template |
| PUT | `/mail/templates/:id` | Update template |
| DELETE | `/mail/templates/:id` | Delete template |
| POST | `/mail/send` | Send email |
| POST | `/mail/send/bulk` | Bulk send |
| GET | `/mail/logs` | Email delivery logs |
| GET | `/mail/stats` | Email statistics |
| GET | `/mail/groups` | List mail groups |
| POST | `/mail/groups` | Create mail group |
| DELETE | `/mail/groups/:id` | Delete group |

#### Actual Backend

**MailController** (`/api/mail`):
| Method | Actual Path | Status |
|---|---|---|
| POST | `/api/mail/send` | ✅ Exists |
| POST | `/api/mail/send/simple` | ✅ Exists |
| POST | `/api/mail/send/template` | ✅ Exists |
| POST | `/api/mail/send/template/simple` | ✅ Exists |
| POST | `/api/mail/queue` | ✅ Exists |
| POST | `/api/mail/queue/template` | ✅ Exists |
| POST | `/api/mail/schedule` | ✅ Exists |
| DELETE | `/api/mail/schedule/{scheduleId}` | ✅ Exists |
| GET | `/api/mail/status/{trackingId}` | ✅ Exists |
| POST | `/api/mail/preview/template` | ✅ Exists |
| POST | `/api/mail/validate/emails` | ✅ Exists |
| GET | `/api/mail/health` | ✅ Exists |
| GET | `/api/mail/info` | ✅ Exists |

**MailGroupController** (`/api/admin/mail/groups`):
| Method | Actual Path | Status |
|---|---|---|
| GET | `/api/admin/mail/groups` | ✅ Exists |
| POST | `/api/admin/mail/groups` | ✅ Exists |
| DELETE | `/api/admin/mail/groups/{groupId}` | ✅ Exists |
| GET | `/api/admin/mail/groups/{groupId}/members` | ✅ Exists |
| POST | `/api/admin/mail/groups/{groupId}/members` | ✅ Exists |
| POST | `/api/admin/mail/groups/{groupId}/members/bulk` | ✅ Exists |
| DELETE | `/api/admin/mail/groups/{groupId}/members/{email}` | ✅ Exists |
| PATCH | `/api/admin/mail/groups/{groupId}/members/{email}` | ✅ Exists |
| POST | `/api/admin/mail/groups/{groupId}/send` | ✅ Exists |

**MailWebhookController** (`/api/mail/webhooks`):
| Method | Actual Path | Status |
|---|---|---|
| POST | `/api/mail/webhooks/zeptomail` | ✅ Exists |
| GET | `/api/mail/webhooks/zeptomail` | ✅ Exists |
| GET | `/api/mail/webhooks/stats` | ✅ Exists |

#### Gap Analysis
- **Missing**: `GET /mail/templates` — **no email templates CRUD on the backend**; `MailController` uses template by name but no management API for templates
- **Missing**: `GET /mail/logs` — no delivery log listing endpoint; only `GET /api/mail/status/{trackingId}` (per-email status)
- **Missing**: `GET /mail/stats` — admin spec expects a stats endpoint; `/api/mail/webhooks/stats` covers delivery webhook stats, not send stats
- **Path Mismatch**: Admin `/mail/groups` → backend `/api/admin/mail/groups`
- **Path Mismatch**: Admin `/mail/send` → backend `/api/mail/send`

#### Required Changes
1. Update `/mail/groups*` → `/api/admin/mail/groups*`
2. Update `/mail/send` → `/api/mail/send`
3. Add email template management to backend (or remove from admin spec if not needed)
4. Add `GET /api/mail/logs` or `GET /api/mail/deliveries` aggregate endpoint to backend

---

### 7. Monitoring

#### Admin Spec Expects
| Method | Admin Spec Path | Purpose |
|---|---|---|
| GET | `/monitoring/cache/stats` | Cache statistics |
| POST | `/monitoring/cache/clear` | Clear cache segment |
| GET | `/monitoring/jobs` | List scheduled jobs |
| POST | `/monitoring/jobs/:id/trigger` | Trigger a job manually |
| GET | `/monitoring/jobs/:id/history` | Job execution history |
| GET | `/monitoring/database/stats` | Database connection pool stats |
| GET | `/monitoring/database/queries` | Slow query log |
| GET | `/monitoring/network/stats` | Network/API performance |
| GET | `/monitoring/alerts` | Active system alerts |
| POST | `/monitoring/alerts/:id/acknowledge` | Acknowledge alert |

#### Actual Backend

**EnhancedMetricsController** (`/api/metrics`):
| Method | Actual Path | Notes |
|---|---|---|
| GET | `/api/metrics/current-hour` | Hourly request metrics |
| GET | `/api/metrics/current-day` | Daily metrics |
| GET | `/api/metrics/errors/hour/{hour}` | Errors by hour |
| GET | `/api/metrics/errors/day/{day}` | Errors by day |
| GET | `/api/metrics/endpoint/{method}/{endpoint}/error-rate` | Per-endpoint error rate |
| GET | `/api/metrics/endpoint/{method}/{endpoint}/analysis` | Per-endpoint analysis |
| GET | `/api/metrics/health` | Metrics health check |
| GET | `/api/metrics/health/analysis` | Health analysis |
| GET | `/api/metrics/dashboard` | Metrics dashboard data |
| GET | `/api/metrics/trends/24h` | 24-hour trend data |
| GET | `/api/metrics/anomalies` | Anomaly detection |
| GET | `/api/metrics/errors/analysis` | Error analysis |
| GET | `/api/metrics/custom` | Custom metric queries |
| GET | `/api/metrics/analysis/hourly-volume` | Hourly volume analysis |

**Kafka Monitoring** (`/api/kafka`, `/api/kafka/lag`):
| Method | Actual Path |
|---|---|
| GET | `/api/kafka/health` |
| POST | `/api/kafka/health/check` |
| GET | `/api/kafka/config` |
| GET | `/api/kafka/circuit-breaker` |
| POST | `/api/kafka/circuit-breaker/reset` |
| GET | `/api/kafka/lag/summary` |
| GET | `/api/kafka/lag/current` |
| GET | `/api/kafka/lag/current/group/{consumerGroup}` |
| GET | `/api/kafka/lag/current/feature/{featureName}` |
| GET | `/api/kafka/lag/history` |
| GET | `/api/kafka/lag/alerts` |
| POST | `/api/kafka/lag/collect` |
| PUT | `/api/kafka/lag/config` |
| POST | `/api/kafka/lag/enable` |
| POST | `/api/kafka/lag/disable` |

**Interceptor/Rate Limiting** (`/api/internal/interceptor`):
| Method | Actual Path |
|---|---|
| GET | `/api/internal/interceptor/status` |
| GET | `/api/internal/interceptor/policies` |
| GET | `/api/internal/interceptor/policies/lookup` |
| POST | `/api/internal/interceptor/policies/reload` |
| POST | `/api/internal/interceptor/engine/toggle` |
| POST | `/api/internal/interceptor/stats/reset` |
| POST | `/api/internal/interceptor/abuse/block` |
| POST | `/api/internal/interceptor/abuse/unblock` |
| POST | `/api/internal/interceptor/abuse/whitelist` |
| GET | `/api/internal/interceptor/health` |

#### Gap Analysis
- **Missing**: `GET /monitoring/cache/stats` — **no dedicated cache stats REST endpoint**; Redis/JVM cache metrics are not exposed via REST; needs new endpoint
- **Missing**: `POST /monitoring/cache/clear` — **no cache clear endpoint**; needs new endpoint
- **Missing**: `GET /monitoring/jobs` — **no scheduler job listing REST endpoint**; `SchedulerExamples.java` shows a commented-out controller that was never deployed
- **Missing**: `POST /monitoring/jobs/:id/trigger` — same, no scheduler management API exists
- **Missing**: `GET /monitoring/jobs/:id/history` — same
- **Missing**: `GET /monitoring/database/stats` — no HikariCP stats endpoint; needs new endpoint
- **Missing**: `GET /monitoring/database/queries` — no slow query log endpoint
- **Missing**: `GET /monitoring/alerts` — no alerts listing; `/api/kafka/lag/alerts` exists but is Kafka-specific
- **Missing**: `POST /monitoring/alerts/:id/acknowledge` — no alert acknowledgement system
- **Existing but not in spec**: All Kafka lag monitoring, interceptor management, metrics trends/anomalies

#### Required Changes
1. Update `/monitoring/network/stats` → compose from `/api/metrics/dashboard` + `/api/metrics/trends/24h`
2. Add to backend: `GET /api/monitoring/cache/stats`, `POST /api/monitoring/cache/clear`
3. Add to backend: Scheduler REST management API (endpoints for job list, trigger, history)
4. Add to backend: `GET /api/monitoring/database/stats` (HikariCP pool stats)
5. Expand admin spec to include Kafka monitoring section mapping to `/api/kafka/lag/*`
6. Expand admin spec to include interceptor/rate-limit monitoring at `/api/internal/interceptor/*`

---

### 8. Admin Settings (RBAC)

#### Admin Spec Expects
| Method | Admin Spec Path | Purpose |
|---|---|---|
| GET | `/admin/roles` | List roles |
| POST | `/admin/roles` | Create role |
| PUT | `/admin/roles/:id` | Update role |
| DELETE | `/admin/roles/:id` | Delete role |
| GET | `/admin/permissions` | List all permissions |
| GET | `/admin/audit-logs` | Global audit log |
| GET | `/admin/system-settings` | System settings |
| PUT | `/admin/system-settings` | Update system settings |
| POST | `/admin/system-settings/cache/clear` | Clear config cache |

#### Actual Backend
| Method | Actual Path | Controller | Status |
|---|---|---|---|
| GET | `/api/iam/roles` | `IAMController` | ✅ Exists |
| POST | `/api/iam/roles` | `IAMController` | ✅ Exists |
| GET | `/api/iam/permissions` | `IAMController` | ✅ Exists |
| GET | `/api/iam/users/{userId}/permissions` | `IAMController` | ✅ Exists (per-user) |
| GET | `/api/iam/users/{userId}/audit` | `IAMController` | ⚠️ Per-user only, no global |
| GET | `/api/config` | `ConfigurationController` | ⚠️ System config, not admin "settings" |
| GET | `/api/config/{key}` | `ConfigurationController` | ✅ Exists |
| GET | `/api/config/prefix/{prefix}` | `ConfigurationController` | ✅ Exists |
| POST | `/api/config/reload` | `ConfigurationController` | ✅ Exists |
| POST | `/api/config/hot-reload` | `ConfigurationController` | ✅ Exists |
| GET | `/api/config/sources` | `ConfigurationController` | ✅ Exists |
| GET | `/api/config/listeners` | `ConfigurationController` | ✅ Exists |
| GET | `/api/config/statistics` | `ConfigurationController` | ✅ Exists |

#### Gap Analysis
- **Path Mismatch**: Admin `/admin/roles` → backend `/api/iam/roles`
- **Path Mismatch**: Admin `/admin/permissions` → backend `/api/iam/permissions`
- **Missing**: `PUT /admin/roles/:id` — no update role endpoint
- **Missing**: `DELETE /admin/roles/:id` — no delete role endpoint
- **Missing**: `GET /admin/audit-logs` (global) — backend only has per-user audit; no global audit log endpoint
- **Missing**: `PUT /admin/system-settings` — configuration is read-only via REST, managed via files; no write endpoint exists
- **Path Mismatch**: Admin `/admin/system-settings` → backend `/api/config` (different concept)
- **Path Mismatch**: Admin `POST /admin/system-settings/cache/clear` → backend `POST /api/config/reload` or `POST /api/config/hot-reload`

#### Required Changes
1. Update `/admin/roles` → `/api/iam/roles`
2. Update `/admin/permissions` → `/api/iam/permissions`
3. Add update/delete role endpoints to backend IAM
4. Add global audit log endpoint to backend: `GET /api/iam/audit-logs`
5. Update `/admin/system-settings` → `/api/config` (read-only until write support is added)
6. Update cache clear → `POST /api/config/reload`

---

### 9. Blog Management

#### Admin Spec Expects
Blog Management is a first-class module with the following endpoints:
- `GET /blog/posts` — List posts
- `GET /blog/posts/:id` — Get post
- `POST /blog/posts` — Create post
- `PUT /blog/posts/:id` — Update post
- `DELETE /blog/posts/:id` — Delete post
- `POST /blog/posts/:id/publish` — Publish post
- `GET /blog/categories` — List categories
- `POST /blog/categories` — Create category
- `GET /blog/tags` — List tags

#### Actual Backend

**✅ FULLY IMPLEMENTED** (June 2025)

Full blog system created in `com.zcop.platform.blog` package:

| Component | File | Description |
|---|---|---|
| Model | `BlogPost.java` | Domain model with BlogStatus enum, JSON tags |
| Model | `BlogCategory.java` | Category POJO |
| Data Handler | `BlogDataHandler.java` | Full CRUD for posts + categories (DataAccess fluent API) |
| Service | `BlogService.java` | Interface with 15 methods |
| Service Impl | `BlogServiceImpl.java` | Slug generation, excerpt auto-gen, category enrichment |
| Controller | `BlogController.java` | Admin + public REST endpoints |

**Admin Endpoints** (`/api/admin/blog/*`):
- `GET /api/admin/blog/posts` — List posts with status filter + stats
- `GET /api/admin/blog/posts/{postId}` — Get post by ID
- `POST /api/admin/blog/posts` — Create post (auto-sets author from session)
- `PUT /api/admin/blog/posts/{postId}` — Update post (partial update)
- `DELETE /api/admin/blog/posts/{postId}` — Delete post
- `POST /api/admin/blog/posts/{postId}/publish` — Publish post
- `GET /api/admin/blog/categories` — List categories
- `POST /api/admin/blog/categories` — Create category
- `PUT /api/admin/blog/categories/{categoryId}` — Update category
- `DELETE /api/admin/blog/categories/{categoryId}` — Delete category
- `GET /api/admin/blog/tags` — List all tags

**Public Endpoints** (`/api/blog/*`):
- `GET /api/blog/posts` — Published posts (optional categoryId filter)
- `GET /api/blog/posts/{slug}` — Published post by slug (increments view count)
- `GET /api/blog/categories` — Public categories
- `GET /api/blog/tags` — Public tags

**DB Tables**: `blog_posts`, `blog_categories` (defined in `blog-data-dictionary.xml`)
**Security Config**: All endpoints registered in `security-api-config.xml` with rate limits and RBAC

#### Required Changes
~~Option A: Remove the Blog Management module from the admin spec until backend is built~~
~~Option B: Plan and implement a BlogController, BlogService, BlogRepository on the backend~~
**DONE** — All 9 spec endpoints implemented plus 6 additional admin endpoints and 4 public endpoints.

---

### 10. Support Tickets

#### Admin Spec Expects
Support Tickets is a first-class module with the following endpoints:
- `GET /support/tickets` — List tickets
- `GET /support/tickets/:id` — Get ticket
- `PUT /support/tickets/:id` — Update ticket status
- `DELETE /support/tickets/:id` — Delete ticket
- `POST /support/tickets/:id/replies` — Admin reply to ticket
- `GET /support/tickets/:id/replies` — Get ticket replies
- `PUT /support/tickets/:id/assign` — Assign to admin
- `GET /support/categories` — List categories
- `GET /support/stats` — Ticket stats

#### Actual Backend

**✅ FULLY IMPLEMENTED** (June 2025)

Full support ticket system created in `com.zcop.platform.support` package:

| Component | File | Description |
|---|---|---|
| Model | `SupportTicket.java` | Domain model with TicketStatus/TicketPriority enums, JSON helpers |
| Model | `TicketReply.java` | Reply/note model with internal flag |
| Model | `TicketCategory.java` | Category POJO |
| Data Handler | `SupportTicketDataHandler.java` | Full CRUD for tickets, replies, categories |
| Service | `SupportTicketService.java` | Interface with 17 methods |
| Service Impl | `SupportTicketServiceImpl.java` | Category enrichment, cascade delete |
| Controller | `SupportTicketController.java` | Admin + user REST endpoints |

**Admin Endpoints** (`/api/admin/support/*`):
- `GET /api/admin/support/tickets` — List tickets with status/priority filters + stats
- `GET /api/admin/support/tickets/{ticketId}` — Get ticket with all replies
- `PUT /api/admin/support/tickets/{ticketId}` — Update ticket (partial update)
- `POST /api/admin/support/tickets/{ticketId}/assign` — Assign to agent
- `POST /api/admin/support/tickets/{ticketId}/resolve` — Resolve ticket
- `POST /api/admin/support/tickets/{ticketId}/close` — Close ticket
- `POST /api/admin/support/tickets/{ticketId}/reopen` — Reopen ticket
- `DELETE /api/admin/support/tickets/{ticketId}` — Delete ticket (cascade deletes replies)
- `POST /api/admin/support/tickets/{ticketId}/notes` — Add internal note
- `GET /api/admin/support/stats` — Ticket statistics by status
- `GET /api/admin/support/categories` — List categories
- `POST /api/admin/support/categories` — Create category
- `PUT /api/admin/support/categories/{categoryId}` — Update category
- `DELETE /api/admin/support/categories/{categoryId}` — Delete category

**User Endpoints** (`/api/support/*`):
- `POST /api/support/tickets` — Submit ticket (auto-sets user from session)
- `GET /api/support/tickets` — List own tickets
- `GET /api/support/tickets/{ticketId}` — Get own ticket (excludes internal notes)
- `POST /api/support/tickets/{ticketId}/replies` — Add reply
- `GET /api/support/categories` — List categories for submission form

**DB Tables**: `support_tickets`, `ticket_replies`, `ticket_categories` (defined in `support-data-dictionary.xml`)
**Security Config**: All endpoints registered in `security-api-config.xml` with rate limits and RBAC

#### Required Changes
~~Option A: Remove the Support Tickets module from the admin spec until backend is built~~
~~Option B: Plan and implement a SupportTicketController, SupportTicketService on the backend~~
**DONE** — All 9 spec endpoints implemented plus 10 additional admin endpoints and 5 user-facing endpoints.

---

### 11. Communication

#### Admin Spec Expects
| Method | Admin Spec Path | Purpose |
|---|---|---|
| GET | `/communication/announcements` | List announcements |
| POST | `/communication/announcements` | Create announcement |
| PUT | `/communication/announcements/:id` | Update announcement |
| DELETE | `/communication/announcements/:id` | Delete announcement |
| GET | `/communication/notifications/templates` | Notification templates |
| POST | `/communication/notifications/send` | Send notification |
| GET | `/communication/websocket/stats` | WebSocket statistics |
| POST | `/communication/websocket/broadcast` | Broadcast message |

#### Actual Backend

**Contest Chat** (`/api/contest/chat`):
| Method | Actual Path | Status |
|---|---|---|
| GET | `/api/contest/chat/{contestId}/history` | ✅ Exists |
| POST | `/api/contest/chat/{contestId}/announcement` | ✅ Exists |
| GET | `/api/contest/chat/{contestId}/statistics` | ✅ Exists |
| GET | `/api/contest/chat/{contestId}/search` | ✅ Exists |
| DELETE | `/api/contest/chat/{contestId}/messages/{messageId}` | ✅ Exists |
| GET | `/api/contest/chat/{contestId}/recent` | ✅ Exists |

**AdminChatController** (`/admin/contest-chat`):
| Method | Actual Path | Status |
|---|---|---|
| GET | `/admin/contest-chat` | ✅ Exists |
| GET | `/admin/contest-chat/api/contests` | ✅ Exists |
| GET | `/admin/contest-chat/api/{contestId}/participants` | ✅ Exists |
| POST | `/admin/contest-chat/api/{contestId}/message` | ✅ Exists |
| POST | `/admin/contest-chat/api/{contestId}/broadcast` | ✅ Exists |
| POST | `/admin/contest-chat/api/{contestId}/moderate` | ✅ Exists |
| GET | `/admin/contest-chat/api/{contestId}/analytics` | ✅ Exists |
| GET | `/admin/contest-chat/api/{contestId}/export` | ✅ Exists |
| DELETE | `/admin/contest-chat/api/{contestId}/clear` | ✅ Exists |

**WebSocketController** (`/api/websocket`):
| Method | Actual Path | Status |
|---|---|---|
| GET | `/api/websocket/stats` | ✅ Exists |
| POST | `/api/websocket/send-message` | ✅ Exists |
| POST | `/api/websocket/broadcast` | ✅ Exists |
| GET | `/api/websocket/temp-tokens` | ✅ Exists |
| POST | `/api/websocket/expire-temp-token` | ✅ Exists |
| POST | `/api/websocket/expire-all-temp-tokens` | ✅ Exists |
| GET | `/api/websocket/health` | ✅ Exists |

#### Gap Analysis
- **Missing concept match**: Admin spec has generic "announcements" but backend has contest-scoped announcements only
- **Missing**: No global announcement system (non-contest) exists on the backend
- **Missing**: Notification templates management — no notification template CRUD
- **Path Mismatch**: Admin `/communication/websocket/stats` → backend `/api/websocket/stats`
- **Path Mismatch**: Admin `/communication/websocket/broadcast` → backend `/api/websocket/broadcast`
- **Extra on Backend**: Full contest chat admin panel at `/admin/contest-chat/**` not mentioned in admin spec

#### Required Changes
1. Update WebSocket paths: `/communication/websocket/stats` → `/api/websocket/stats`
2. Update broadcast: `/communication/websocket/broadcast` → `/api/websocket/broadcast`
3. Map announcements to contest-specific: `POST /api/contest/chat/{contestId}/announcement`
4. Add global notification system if truly needed; currently only contest-scoped chat exists
5. Add Contest Chat admin section to the admin spec pointing to `/admin/contest-chat/**`

---

## Backend Endpoints Uncovered by Admin Spec

The following major backend feature groups have **zero coverage** in the current admin spec and should be added as new modules:

---

### A. Analytics (Rich — Fully Implemented)

**Base**: `/zcop/api/submission/analytics` and `/zcop/api/analytics`

| Method | Path | Purpose |
|---|---|---|
| GET | `/zcop/api/submission/analytics/dashboard` | Platform analytics dashboard |
| GET | `/zcop/api/submission/analytics/user/{userId}/statistics` | Per-user stats |
| GET | `/zcop/api/submission/analytics/user/{userId}/streak` | User streak |
| GET | `/zcop/api/submission/analytics/leaderboard/global` | Global leaderboard |
| GET | `/zcop/api/submission/analytics/leaderboard/difficulty/{difficulty}` | By difficulty |
| GET | `/zcop/api/submission/analytics/user/{userId}/ranking` | User rank |
| GET | `/zcop/api/submission/analytics/user/{userId}/submissions` | Submission history |
| GET | `/zcop/api/submission/analytics/user/{userId}/problem/{problemId}/performance` | Problem perf |
| GET | `/zcop/api/submission/analytics/problem/{problemId}/engagement` | Problem engagement |
| GET | `/zcop/api/submission/analytics/language/{language}` | Language stats |
| GET | `/zcop/api/submission/analytics/performance/{language}` | Language performance |
| GET | `/zcop/api/analytics/registry/features` | Analytics registry |
| POST | `/zcop/api/analytics/registry/reload` | Reload analytics config |

**Suggestion**: Add an **Analytics** module to the admin spec covering platform-wide analytics, leaderboards, and user performance metrics.

---

### B. Achievements System (Fully Implemented)

**Base**: `/api/achievements`, `/api/user-achievements`, `/api/leaderboard`

| Method | Path | Purpose |
|---|---|---|
| GET / POST / PUT / DELETE | `/api/achievements` / `/{id}` | Full CRUD for achievements |
| GET | `/api/achievements/code/{code}` | Get by code |
| GET | `/api/achievements/category/{categoryId}` | By category |
| GET | `/api/achievements/tier/{tierId}` | By tier |
| GET | `/api/achievements/event/{eventType}` | By event type |
| POST | `/api/achievements/import` | Import achievements |
| GET | `/api/achievements/export` | Export achievements |
| GET | `/api/user-achievements/user/{userId}` | User achievements |
| GET | `/api/user-achievements/user/{userId}/unlocked` | Unlocked achievements |
| GET | `/api/user-achievements/user/{userId}/stats` | Achievement stats |
| GET | `/api/user-achievements/user/{userId}/progress` | Progress tracker |
| PUT | `/api/user-achievements/user/{userId}/featured` | Set featured |
| PUT | `/api/user-achievements/user/{userId}/showcased` | Set showcased |
| POST | `/api/user-achievements/user/{userId}/claim/{achievementId}` | Claim achievement |
| GET | `/api/leaderboard/global` | Global achievement leaderboard |
| GET | `/api/leaderboard/category/{categoryId}` | By category |
| GET | `/api/leaderboard/tier/{tierId}` | By tier |
| GET | `/api/leaderboard/user/{userId}/rank` | User rank |
| GET | `/api/leaderboard/nearby/{userId}` | Nearby users |
| GET | `/api/leaderboard/achievements/rare` | Rarest achievements |
| GET | `/api/leaderboard/achievements/popular` | Most popular achievements |

**Suggestion**: Add an **Achievements** module to the admin spec.

---

### C. Ranking System (Fully Implemented)

**Base**: `/api/ranking`

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/ranking/global` | Global leaderboard |
| GET | `/api/ranking/global/top/{n}` | Top N users |
| GET | `/api/ranking/user/{userId}` | User rank |
| GET | `/api/ranking/user/{userId}/nearby` | Nearby users |
| GET | `/api/ranking/monthly` | Monthly leaderboard |
| GET | `/api/ranking/difficulty/{difficulty}` | By difficulty |
| GET | `/api/ranking/regional/{region}` | Regional |
| GET | `/api/ranking/stats` | Platform ranking stats |
| GET | `/api/ranking/search` | Search rankings |

**Suggestion**: Add a **Rankings** module to the admin spec.

---

### D. RealWorld Problems (Fully Implemented)

**Base**: `/api/admin/realworld-problems`, `/api/realworld`

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/admin/realworld-problems` | Create RW problem |
| GET | `/api/admin/realworld-problems` | List all RW problems |
| GET/PUT/DELETE | `/api/admin/realworld-problems/{slug}` | CRUD by slug |
| PATCH | `/api/admin/realworld-problems/{slug}/active` | Toggle active |
| GET | `/api/realworld/problems` | Public listing |
| GET | `/api/realworld/problems/{slug}` | Get by slug |
| POST | `/api/realworld/submit` | Submit solution |
| GET | `/api/realworld/status/{executionId}` | Execution status |
| GET | `/api/realworld/statistics` | Platform stats |
| GET | `/api/realworld/leaderboard/problem/{slug}` | Problem leaderboard |
| GET | `/api/realworld/leaderboard/global` | Global RW leaderboard |
| GET | `/api/realworld/leaderboard/user/{userId}` | User leaderboard |
| POST | `/api/admin/realworld/recalculate-percentiles` | Recalculate scores |

**Suggestion**: Add a **RealWorld Problems** module to the admin spec.

---

### E. Webhook Management (Fully Implemented)

**Base**: `/api/webhooks`

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/webhooks/trigger` | Trigger event |
| POST | `/api/webhooks/trigger-async` | Async trigger |
| POST | `/api/webhooks/trigger-all` | Trigger all listeners |
| POST | `/api/webhooks/trigger-external` | External trigger |
| GET | `/api/webhooks/listeners/{eventType}` | Get listeners for event |
| POST | `/api/webhooks/endpoints` | Create endpoint |
| GET | `/api/webhooks/endpoints` | List endpoints |
| GET | `/api/webhooks/endpoints/{endpointId}` | Get endpoint |
| DELETE | `/api/webhooks/endpoints/{endpointId}` | Delete endpoint |
| PATCH | `/api/webhooks/endpoints/{endpointId}/status` | Toggle endpoint |

**Suggestion**: Add a **Webhooks** module to the admin spec.

---

### F. Domain & SSL Management (Fully Implemented)

**Base**: `/api/v1/domains`, `/api/v1/ssl`

| Method | Path | Purpose |
|---|---|---|
| GET/POST/PUT/DELETE | `/api/v1/domains` / `/{domainId}` | Domain CRUD |
| POST | `/api/v1/domains/{domainId}/verify` | Verify domain |
| POST | `/api/v1/ssl/request` | Request SSL cert |
| GET | `/api/v1/ssl/{domain}/status` | Cert status |
| POST | `/api/v1/ssl/{domain}/renew` | Renew cert |
| DELETE | `/api/v1/ssl/{domain}/revoke` | Revoke cert |
| GET | `/api/v1/ssl/list` | List all certs |
| GET | `/api/v1/ssl/renewal-alerts` | Renewal alerts |

**Suggestion**: Add a **Domain & SSL** module to the admin spec.

---

### G. Video / Calling System (Fully Implemented)

**Base**: `/api/video`

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/video/rooms` | Create room |
| GET | `/api/video/rooms/{roomId}` | Get room |
| POST | `/api/video/rooms/{roomId}/screen-share/start` | Start screen share |
| POST | `/api/video/rooms/{roomId}/screen-share/stop` | Stop screen share |
| GET | `/api/video/rooms/user/{userId}` | User's rooms |
| GET | `/api/video/rooms/active` | Active rooms |
| GET | `/api/video/stats` | Video stats |
| GET | `/api/video/webrtc-config` | WebRTC configuration |
| GET | `/api/video/users/online` | Online users |
| POST | `/api/video/calls/direct` | Direct call |
| GET | `/api/video/chat/history/{roomId}` | Chat history |
| POST | `/api/video/chat/sessions` | Create chat session |
| POST | `/api/video/chat/send` | Send chat message |
| GET | `/api/video/health` | Health check |

**Suggestion**: Add a **Video/Calling** module to the admin spec.

---

### H. Two-Factor Authentication Management

**Base**: `/api/v1/tfa`

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/tfa/setup` | Setup TFA |
| POST | `/api/v1/tfa/setup/confirm` | Confirm setup |
| POST | `/api/v1/tfa/verify` | Verify TFA code |
| DELETE | `/api/v1/tfa/disable` | Disable TFA |
| POST | `/api/v1/tfa/backup/verify` | Use backup code |
| POST | `/api/v1/tfa/backup/regenerate` | Regenerate backups |
| GET | `/api/v1/tfa/status/{userId}` | TFA status |
| GET | `/api/v1/tfa/check/{userId}` | Quick TFA check |
| POST | `/api/v1/tfa/login/init` | Init TFA login |
| POST | `/api/v1/tfa/login/complete` | Complete TFA login |

**Suggestion**: Integrate TFA management into the Users Management module.

---

### I. Configuration Management

**Base**: `/api/config`

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/config` | All config values |
| GET | `/api/config/{key}` | Single config value |
| GET | `/api/config/prefix/{prefix}` | Config by prefix |
| POST | `/api/config/reload` | Reload from files |
| POST | `/api/config/hot-reload` | Hot reload |
| GET | `/api/config/sources` | Config sources |
| GET | `/api/config/listeners` | Change listeners |
| GET | `/api/config/statistics` | Config stats |

**Suggestion**: Expand the Admin Settings module to fully cover `/api/config/*`.

---

### J. Kafka Monitoring (14 endpoints — see Monitoring section above)

Not in admin spec. Should be added to the Monitoring module as a "Message Queue" sub-section.

---

### K. Interceptor / Rate Limiting (10 endpoints — see Monitoring section above)

Not in admin spec. Should be added to the Monitoring module as a "Security / Rate Limiting" sub-section.

---

### L. Code Submission & Execution

| Method | Path | Purpose |
|---|---|---|
| POST | `/zcop/api/submission/submit` | Submit code |
| GET | `/zcop/api/submission/status/{executionId}` | Execution status |
| GET | `/zcop/api/submission/status/all` | All statuses |
| GET | `/zcop/api/submission/history/{slug}` | History by problem |
| GET | `/zcop/api/submission/stats/{slug}` | Stats by problem |
| POST | `/zcop/api/code/execute` | Run code |
| POST | `/zcop/api/compiler/execute` | Compiler execute |

**Suggestion**: Add a **Submissions** admin view (read-only overview, filter by user/problem).

---

### M. OAuth Providers

| Method | Path | Purpose |
|---|---|---|
| GET | `/auth/google` | Google OAuth redirect |
| POST | `/auth/google/login` | Google login |
| GET | `/auth/google/callback` | OAuth callback |
| GET | `/auth/github` | GitHub OAuth redirect |
| POST | `/auth/github/login` | GitHub login |
| POST | `/auth/zoho/login` | Zoho login |

**Suggestion**: Add OAuth provider configuration to the Admin Settings module.

---

## Summary Tables

### Admin Spec Endpoints — Status Overview

| Module | Total Spec Endpoints | Exist on Backend | Need Path Change | Partially Covered | Missing from Backend |
|---|---|---|---|---|---|
| Authentication | 6 | 6 | 6 (all need prefix) | 0 | 0 |
| Dashboard | 5 | 2 | 2 | 1 | 2 |
| Problems | 13 | 8 | 8 | 3 | 2 |
| Contests | 12 | 5 | 5 | 2 | 5 |
| Users | 10 | 8 | 8 | 1 | 1 |
| Mail | 11 | 6 | 6 | 1 | 4 |
| Monitoring | 10 | 2 | 2 | 3 | 5 |
| Admin Settings | 9 | 5 | 5 | 1 | 3 |
| Blog | 9 | 9 (15 total) | 0 | 0 | **0 — ✅ FULLY IMPLEMENTED** |
| Support Tickets | 9 | 9 (19 total) | 0 | 0 | **0 — ✅ FULLY IMPLEMENTED** |
| Communication | 8 | 4 | 4 | 1 | 3 |
| **TOTAL** | **102** | **46** | **46** | **13** | **43** |

### Missing Backend Endpoint Groups (Need New Admin Spec Modules)

| Group | Endpoints | Priority | Notes |
|---|---|---|---|
| Analytics | 15 | HIGH | Rich data, very useful for admin |
| Achievements | 20+ | MEDIUM | Full CRUD + user management |
| Ranking | 9 | MEDIUM | Leaderboard management |
| RealWorld Problems | 14 | HIGH | Admin CRUD + leaderboard |
| Webhooks | 10 | MEDIUM | Operational management |
| Domain & SSL | 10 | LOW | Infra management |
| Video/Calling | 14 | LOW | Operational stats |
| TFA Management | 10 | MEDIUM | Tie into Users module |
| Configuration | 8 | HIGH | Already partly in Admin Settings |
| Kafka Monitoring | 14 | HIGH | Operational visibility |
| Interceptor/Rate Limiting | 10 | HIGH | Security management |
| Code Execution/Submissions | 7 | MEDIUM | Platform overview |

---

## Recommended Restructuring Strategy

### Step 1: Fix Base URL

Change `environment.apiUrl` from:
```
http://localhost:8080/admin/v1
```
to:
```
http://localhost:8080
```

Then update each Angular service to use the full correct path per endpoint group.

### Step 2: Module-Level Path Corrections

| Angular Service | Current Base | Correct Base |
|---|---|---|
| `auth.service.ts` | `/auth/*` | `/api/auth/*` or `/api/iam/auth/*` |
| `users.service.ts` | `/users/*` | `/api/iam/users/*` |
| `problems.service.ts` | `/problems/*` | `/api/problems/*` (read) + `/api/admin/problems/*` (write) |
| `contests.service.ts` | `/contests/*` | `/api/contest/*` |
| `dashboard.service.ts` | `/dashboard/*` | `/api/dashboard/*` |
| `mail.service.ts` | `/mail/*` | `/api/mail/*` and `/api/admin/mail/groups/*` |
| `monitoring.service.ts` | `/monitoring/*` | `/api/metrics/*` + `/api/kafka/*` |
| `admin-settings.service.ts` | `/admin/*` | `/api/iam/*` + `/api/config/*` |

### Step 3: Backend Fixes Required

The following **backend changes** are needed (no admin frontend changes can compensate):

1. **Add** `DELETE /api/contest/{contestId}` — contest delete
2. **Change** `POST /api/contest/update/{id}` to `PUT /api/contest/{id}` — RESTful method
3. **Add** `PUT /api/iam/roles/{roleId}` — role update
4. **Add** `DELETE /api/iam/roles/{roleId}` — role delete
5. **Add** `GET /api/iam/audit-logs` — global audit log (currently only per-user)
6. **Add** `GET /api/monitoring/cache/stats` — cache statistics endpoint
7. **Add** `POST /api/monitoring/cache/clear` — cache reset endpoint
8. **Add** Scheduler REST management API — job list, manual trigger, history
9. **Add** `GET /api/monitoring/database/stats` — HikariCP pool stats
10. **Add** Email template management CRUD (`GET/POST/PUT/DELETE /api/mail/templates`)
11. **Add** `GET /api/mail/logs` — email delivery history
12. **Add** `GET /api/iam/audit-logs` — global platform audit log

### Step 4: New Admin Spec Modules to Add

High priority additions to `API_SPECIFICATION.md`:

1. **Analytics** — map to `/zcop/api/submission/analytics/*`
2. **RealWorld Problems** — map to `/api/admin/realworld-problems/*`
3. **Configuration** — expand existing Admin Settings to cover `/api/config/*`
4. **Kafka Monitoring** — add to Monitoring module, map to `/api/kafka/lag/*`
5. **Rate Limiting / Interceptor** — add to Monitoring, map to `/api/internal/interceptor/*`
6. **Achievements** — optional but fully implemented backend
7. **Webhooks** — map to `/api/webhooks/*`

### Step 5: Admin Spec Modules to Defer or Remove

- ~~**Blog Management** — fully unimplemented on backend; remove from spec until backend built~~ **✅ IMPLEMENTED** (June 2025)
- ~~**Support Tickets** — fully unimplemented on backend; remove from spec until backend built~~ **✅ IMPLEMENTED** (June 2025)

### Step 6: Implementation Summary (June 2025)

**Blog Management** — New `com.zcop.platform.blog` package:
- 6 files: `BlogPost.java`, `BlogCategory.java`, `BlogDataHandler.java`, `BlogService.java`, `BlogServiceImpl.java`, `BlogController.java`
- 15 REST endpoints (11 admin + 4 public)
- 2 DB tables: `blog_posts`, `blog_categories` (defined in `blog-data-dictionary.xml`)
- Security config: All endpoints in `security-api-config.xml` with RBAC (ADMIN, CONTENT_MANAGER)

**Support Tickets** — New `com.zcop.platform.support` package:
- 7 files: `SupportTicket.java`, `TicketReply.java`, `TicketCategory.java`, `SupportTicketDataHandler.java`, `SupportTicketService.java`, `SupportTicketServiceImpl.java`, `SupportTicketController.java`
- 19 REST endpoints (14 admin + 5 user)
- 3 DB tables: `support_tickets`, `ticket_replies`, `ticket_categories` (defined in `support-data-dictionary.xml`)
- Security config: All endpoints in `security-api-config.xml` with RBAC (ADMIN, SUPPORT_AGENT)

---

*Generated: Based on full analysis of 65 backend controllers in `zcop/` and the 1,870-line `API_SPECIFICATION.md` in `zcop-admin/`.*
*Last updated: June 2025 — Blog Management and Support Tickets fully implemented*
*Document author: GitHub Copilot analysis*
