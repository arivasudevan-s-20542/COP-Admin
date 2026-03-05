# Analytics Registry — Frontend Integration Guide

> **Audience:** Frontend (Angular) developers building admin dashboards & analytics widgets.
> **Backend base URL:** `/zcop/api/analytics`
> **Auth required:** `ADMIN` or `ANALYTICS` role (cookie-based session).
> **Source of truth:** `analytics-keys.json` (backend) — all keys auto-discoverable via registry endpoints.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [API Reference](#2-api-reference)
3. [Feature & Key Catalog](#3-feature--key-catalog)
4. [Variable Resolution](#4-variable-resolution)
5. [Response Value Formats by Type](#5-response-value-formats-by-type)
6. [Angular Integration Pattern](#6-angular-integration-pattern)
7. [Widget Rendering Guide](#7-widget-rendering-guide)
8. [Dashboard Layout Suggestions](#8-dashboard-layout-suggestions)
9. [Error Handling](#9-error-handling)

---

## 1. Architecture Overview

```
┌─────────────────┐      GET /registry/features       ┌─────────────────────────┐
│  Angular App    │ ────────────────────────────────▸  │  AnalyticsRegistry      │
│                 │      (one-time, cached)             │  Controller             │
│  BehaviorSubject│ ◂──── { features, keys metadata }  │  /zcop/api/analytics    │
│  (registry      │                                    │                         │
│   cache)        │      GET /query/feature/.../key/...│                         │
│                 │ ────────────────────────────────▸  │  AnalyticsOperations    │
│  Dashboard      │ ◂──── { type, value, ... }         │         ↓               │
│  Widgets        │                                    │  AnalyticsDataHandler   │
└─────────────────┘                                    │         ↓               │
                                                       │      Redis              │
                                                       └─────────────────────────┘
```

**Key principle:** The frontend **never** hardcodes key names or patterns.
1. Call `/registry/features` once → cache the metadata
2. Use cached metadata to know what keys exist and what variables each needs
3. Call `/query/feature/{feature}/key/{keyName}?var=val` to fetch live data
4. Render based on `type` field (counter → number, set → member list, etc.)

---

## 2. API Reference

All endpoints return JSON with envelope: `{ success: boolean, ..., timestamp: number }`.

### 2.1 Discovery Endpoints

#### `GET /registry/features`

List all features and their key names (metadata only — no Redis reads).

**Response:**
```json
{
  "success": true,
  "totalFeatures": 8,
  "totalKeys": 105,
  "features": {
    "user": ["user_logins_hourly", "user_logins_daily", "active_users_daily", ...],
    "problem": ["problem_views_daily", "problem_attempts_daily", ...],
    "system": ["system_errors", "rate_limit_hits", ...],
    "engagement": ["page_views", "feature_usage", ...],
    "performance": ["db_query_times", "slow_queries", ...],
    "kafka": ["messages_consumed", "messages_produced", ...],
    "internal": ["analytics_errors", "realtime_events", ...],
    "ranking": ["global_leaderboard", "monthly_leaderboard", ...]
  },
  "timestamp": 1740000000000
}
```

**Usage:** Call once at app init. Cache the result. This tells your app what analytics exist.

---

#### `GET /registry/features/{feature}/keys`

Get full key definitions for a feature (patterns, types, TTLs, descriptions).

**Path param:** `feature` — e.g., `user`, `problem`, `system`

**Response:**
```json
{
  "success": true,
  "feature": "user",
  "totalKeys": 28,
  "keys": [
    {
      "feature": "user",
      "name": "active_users_daily",
      "pattern": "active_users_daily_{date}",
      "type": "set",
      "ttlDays": 90,
      "ttlSeconds": -1,
      "description": "Unique active users per day (DAU)"
    },
    {
      "feature": "user",
      "name": "user_total_solved",
      "pattern": "user_total_solved_{userId}",
      "type": "counter",
      "ttlDays": -1,
      "ttlSeconds": -1,
      "description": "Lifetime solved count per user"
    }
  ],
  "timestamp": 1740000000000
}
```

**Usage:** Call when a feature section is opened for the first time. Cache per feature.

---

#### `GET /registry/keys?type={type}`

Get all keys across all features. Optional filter by `type`.

| Param   | Required | Values                                          |
|---------|----------|------------------------------------------------|
| `type`  | No       | `counter`, `set`, `sorted_set`, `hash`, `list`, `value` |

**Response:** Same `keys` array format as above, but spanning all features.

---

#### `GET /registry/keys/search?q={query}`

Search keys by substring match (case-insensitive) against name, pattern, and description.

| Param | Required | Example            |
|-------|----------|--------------------|
| `q`   | Yes      | `login`, `cache`, `leaderboard` |

**Response:**
```json
{
  "success": true,
  "query": "login",
  "totalMatches": 3,
  "keys": [
    { "name": "user_logins_hourly", "pattern": "user_logins_hourly_{hour}", "type": "counter", ... },
    { "name": "user_logins_daily", "pattern": "user_logins_daily_{date}", "type": "counter", ... },
    { "name": "failed_login_ip", "pattern": "failed_login_{ip}_{hour}", "type": "counter", ... }
  ],
  "timestamp": 1740000000000
}
```

**Usage:** For admin search UI — type-ahead search across all analytics keys.

---

### 2.2 Data Query Endpoints

#### `GET /query/feature/{feature}/summary?var1=val1&var2=val2`

Read current values for **all resolvable keys** in a feature. Keys with unresolved `{variables}` are skipped unless you supply them as query params.

**Path param:** `feature` — e.g., `system`, `user`

**Query params:** Any variable from key patterns (e.g., `date=2026-03-02`, `userId=123`, `hour=2026-03-02_11`)

**Response:**
```json
{
  "success": true,
  "feature": "system",
  "resolvedKeys": 5,
  "variables": { "hour": "2026-03-02_11", "date": "2026-03-02" },
  "data": {
    "system_errors": 42,
    "system_startups": 3,
    "system_shutdowns": 2,
    "last_startup_time": "1740000123456",
    "status_checks_hourly": 1847
  },
  "timestamp": 1740000000000
}
```

**Usage:** Quick dashboard overview — get a snapshot of all keys in a feature.

---

#### `GET /query/feature/{feature}/key/{keyName}?var1=val1`

Read a single key's full value with metadata.

**Path params:** `feature` + `keyName` — e.g., `user` / `active_users_daily`

**Query params:** Variables from the key's pattern (e.g., `date=2026-03-02`)

**Success response:**
```json
{
  "success": true,
  "feature": "user",
  "keyName": "active_users_daily",
  "resolvedKey": "zcop:analytics:active_users_daily_2026-03-02",
  "type": "set",
  "value": {
    "size": 347,
    "members": ["user_1", "user_2", "user_3", "..."]
  },
  "description": "Unique active users per day (DAU)",
  "ttlDays": 90,
  "ttlSeconds": -1,
  "timestamp": 1740000000000
}
```

**Error — unresolved variables:**
```json
{
  "success": false,
  "error": "Unresolved variables in key pattern",
  "resolvedSoFar": "zcop:analytics:active_users_daily_{date}",
  "pattern": "active_users_daily_{date}",
  "hint": "Supply missing variables as query parameters"
}
```

**Usage:** Drill-down into a specific metric. This is the primary data endpoint.

---

### 2.3 Admin Endpoint

#### `POST /registry/reload`

Hot-reload `analytics-keys.json` from disk. Use after backend deploys add new keys.

**Response:**
```json
{
  "success": true,
  "message": "Analytics key registry reloaded",
  "keysBefore": 103,
  "keysAfter": 105,
  "delta": 2,
  "features": ["user", "problem", "system", "engagement", "performance", "kafka", "internal", "ranking"],
  "timestamp": 1740000000000
}
```

**Frontend action:** After calling reload, invalidate your registry cache and re-fetch `/registry/features`.

---

## 3. Feature & Key Catalog

### 3.1 `user` — User Activity (28 keys)

| Key Name | Pattern | Type | TTL | Description |
|----------|---------|------|-----|-------------|
| `user_logins_hourly` | `user_logins_hourly_{hour}` | counter | 2d | Login count per hour |
| `user_logins_daily` | `user_logins_daily_{date}` | counter | 90d | Login count per day |
| `active_users_hourly` | `active_users_hourly_{hour}` | set | 2d | Unique active users per hour |
| `active_users_daily` | `active_users_daily_{date}` | set | 90d | **DAU** — unique active users per day |
| `active_users_weekly` | `active_users_wau_{yearWeek}` | set | 30d | **WAU** — weekly active users |
| `active_users_monthly` | `active_users_mau_{yearMonth}` | set | 400d | **MAU** — monthly active users |
| `active_users_current` | `active_users_current` | set | 300s | Real-time active users (5-min window) |
| `login_methods` | `login_methods_{date}_{method}` | counter | 30d | Login count by method (google, email, etc.) |
| `device_types` | `device_types_{date}_{device}` | counter | 30d | Login count by device type |
| `user_session` | `user_session_{userId}` | hash | 86400s | Current session data (fields: ip, device, loginTime, etc.) |
| `session_durations` | `session_durations_{date}` | sorted_set | 30d | Session durations (member=userId, score=ms) |
| `user_logouts` | `user_logouts_{date}` | counter | 30d | Logout count per day |
| `profile_updates` | `profile_updates_{date}` | counter | 30d | Profile update count per day |
| `user_last_activity` | `user_last_activity_{userId}` | value | ∞ | Last activity epoch millis |
| `user_hourly_activity` | `user_hourly_activity_{hour}` | set | 2d | Active users per hour |
| `user_sessions` | `user_sessions_{userId}` | list | ∞ | Session history entries |
| `user_properties` | `user_properties_{userId}` | hash | ∞ | User metadata (browser, os, timezone, etc.) |
| `user_total_submissions` | `user_total_submissions_{userId}` | counter | ∞ | Lifetime submission count |
| `user_language_submissions` | `user_language_submissions_{userId}_{language}` | counter | ∞ | Submissions by language |
| `user_total_solved` | `user_total_solved_{userId}` | counter | ∞ | Lifetime solved count |
| `user_solved_difficulty` | `user_solved_difficulty_{userId}_{difficulty}` | counter | ∞ | Solved by difficulty |
| `user_language_solved` | `user_language_solved_{userId}_{language}` | counter | ∞ | Solved by language |
| `user_active_days` | `user_active_days_{userId}` | set | ∞ | Set of dates user was active |
| `user_solved_problems` | `user_solved_problems_{userId}` | set | ∞ | Set of solved problem IDs |
| `user_current_streak` | `user_current_streak_{userId}` | counter | ∞ | Current consecutive-day streak |
| `user_max_streak` | `user_max_streak_{userId}` | counter | ∞ | All-time max streak |
| `user_streak_history` | `user_streak_history_{userId}` | list | ∞ | Streak history entries |
| `user_monthly_solved` | `user_monthly_solved_{month}_{userId}` | counter | ∞ | Problems solved in a month |

### 3.2 `problem` — Problem Interactions (29 keys)

| Key Name | Pattern | Type | TTL | Description |
|----------|---------|------|-----|-------------|
| `problem_views_daily` | `problem_views_{date}` | counter | 90d | Total views per day |
| `problem_views_per_problem` | `problem_views_{problemId}_{date}` | counter | 90d | Views per problem per day |
| `problem_viewers` | `problem_viewers_{problemId}_{date}` | set | 30d | Unique viewers per problem per day |
| `difficulty_views` | `difficulty_views_{difficulty}_{date}` | counter | 30d | Views by difficulty |
| `problem_attempts_daily` | `problem_attempts_{date}` | counter | 90d | Attempt starts per day |
| `problem_attempts_per_problem` | `problem_attempts_{problemId}_{date}` | counter | 90d | Attempts per problem per day |
| `active_problem_solvers` | `active_problem_solvers_{problemId}` | set | 30min | Users currently solving (live) |
| `user_total_attempts` | `user_total_attempts_{userId}` | counter | ∞ | Lifetime attempts per user |
| `language_usage` | `language_usage_{language}_{date}` | counter | 30d | Language usage per day |
| `attempt_start` | `attempt_{userId}_{problemId}_{sessionId}_start` | value | 1h | Attempt start timestamp |
| `user_problem` | `user_problem_{userId}_{problemId}` | hash | ∞ | Per-user per-problem data |
| `user_attempts_history` | `user_attempts_{userId}_{problemId}` | list | ∞ | Attempt history entries |
| `code_executions_daily` | `code_executions_{date}` | counter | 30d | Executions per day |
| `code_executions_per_problem` | `code_executions_{problemId}_{date}` | counter | 30d | Executions per problem per day |
| `execution_results` | `execution_results_{result}_{date}` | counter | 30d | Results by outcome (success/failure) |
| `execution_times` | `execution_times_{language}_{date}` | sorted_set | 7d | Execution times by language |
| `problem_submissions_daily` | `problem_submissions_{date}` | counter | 90d | Submissions per day |
| `problem_submissions_per_problem` | `problem_submissions_{problemId}_{date}` | counter | 90d | Submissions per problem per day |
| `accepted_submissions_daily` | `accepted_submissions_{date}` | counter | 90d | Accepted submissions per day |
| `accepted_submissions_per_problem` | `accepted_submissions_{problemId}_{date}` | counter | 90d | Accepted per problem per day |
| `problem_solvers` | `problem_solvers_{problemId}_{date}` | set | 30d | Unique solvers per problem per day |
| `solved_difficulty` | `solved_difficulty_{difficulty}_{date}` | counter | 30d | Solved by difficulty per day |
| `attempt_durations` | `attempt_durations_{problemId}_{date}` | sorted_set | 7d | Time to solve (member=userId, score=ms) |
| `submission_starts_daily` | `submission_starts_daily_{date}` | counter | 90d | Submission starts per day |
| `submission_starts_per_problem` | `submission_starts_per_problem_{problemId}_{date}` | counter | 30d | Submission starts per problem |
| `submission_type` | `submission_type_{type}_{date}` | counter | 30d | Submissions by type (contest/regular) |
| `code_lengths` | `code_lengths_{problemId}_{date}` | sorted_set | 7d | Code length distribution |
| `problem_acceptance_rate_daily` | `problem_acceptance_rate_{problemId}_{date}` | value | 90d | Daily acceptance rate % |
| `plagiarism_hash` | `plagiarism_{problemId}_{contestId}_{hash}` | sorted_set | 7d | Plagiarism detection (3+ = suspected) |

### 3.3 `system` — System Health (13 keys)

| Key Name | Pattern | Type | TTL | Description |
|----------|---------|------|-----|-------------|
| `system_errors` | `system_errors_{hour}` | counter | 7d | Error count per hour |
| `error_types` | `error_types_{errorType}_{date}` | counter | 30d | Errors by type per day |
| `health_checks` | `health_checks_{status}_{hour}` | counter | 2d | Health checks by status per hour |
| `cpu_usage` | `cpu_usage_{hour}` | sorted_set | 2d | CPU samples (score=%) |
| `memory_usage` | `memory_usage_{hour}` | sorted_set | 2d | Memory samples (score=%) |
| `system_startups` | `system_startups_{date}` | counter | 90d | Startup count per day |
| `system_shutdowns` | `system_shutdowns_{date}` | counter | 90d | Shutdown count per day |
| `last_startup_time` | `last_startup_time` | value | ∞ | Last startup epoch millis |
| `status_checks_hourly` | `status_checks_hourly_{hour}` | counter | 2d | Status poll count per hour |
| `status_checks_by_status` | `status_checks_by_status_{status}_{hour}` | counter | 2d | Status polls by exec status |
| `status_checks_per_execution` | `status_checks_per_execution_{executionId}` | counter | 1d | Polls per execution ID |
| `rate_limit_hits` | `rate_limit_hits_{date}_{method}_{path}` | counter | 7d | Rate-limited requests per endpoint |
| `failed_login_ip` | `failed_login_{ip}_{hour}` | counter | 3d | Failed logins per IP per hour |

### 3.4 `engagement` — User Engagement (5 keys)

| Key Name | Pattern | Type | TTL | Description |
|----------|---------|------|-----|-------------|
| `page_views` | `page_views_{page}_{date}` | counter | 30d | Page views by page per day |
| `page_time` | `page_time_{page}_{date}` | sorted_set | 7d | Time on page (score=ms) |
| `feature_usage` | `feature_usage_{feature}_{action}_{date}` | counter | 30d | Feature usage by action per day |
| `feature_users` | `feature_users_{feature}_{date}` | set | 30d | Unique feature users per day |
| `interactions` | `interactions_{element}_{type}_{date}` | counter | 7d | UI interactions by element |

### 3.5 `performance` — Performance Metrics (12 keys)

| Key Name | Pattern | Type | TTL | Description |
|----------|---------|------|-----|-------------|
| `db_query_times` | `db_query_times_{queryType}_{hour}` | sorted_set | 2d | DB query latency |
| `slow_queries` | `slow_queries_{queryType}_{date}` | counter | 7d | Queries > 1000ms |
| `slow_query_log` | `slow_query_log_{date}` | list | 7d | Slow query log entries |
| `cache_operation_hourly` | `cache_{operation}_{hour}` | counter | 2d | Cache ops per hour |
| `cache_operation_daily` | `cache_{operation}_{date}` | counter | 30d | Cache ops per day |
| `cache_typed_operation` | `cache_{cacheType}_{operation}_{hour}` | counter | 2d | Cache ops by cache type |
| `cache_operation_times` | `cache_operation_times_{hour}` | sorted_set | 2d | Cache op latencies |
| `cache_avg_time_total` | `cache_avg_time_{operation}_{hour}_total` | counter | 2d | Running time total |
| `cache_avg_time_count` | `cache_avg_time_{operation}_{hour}_count` | counter | 2d | Running op count |
| `cache_operation_status` | `cache_{operation}_{status}_{hour}` | counter | 2d | Cache ops by success/failure |
| `cache_invalidation_reason` | `cache_invalidation_reason_{reason}_{date}` | counter | 7d | Invalidation reasons |
| `eval_latency_realworld` | `zcop:metrics:timings:/realworld/evaluate:ASYNC:{hour}` | sorted_set | 7d | Real-world eval P95 latency |

### 3.6 `kafka` — Kafka Infrastructure (6 keys)

| Key Name | Pattern | Type | TTL | Description |
|----------|---------|------|-----|-------------|
| `messages_consumed` | `kafka:metrics:consumed:{date}` | counter | 7d | Messages consumed |
| `messages_produced` | `kafka:metrics:produced:{date}` | counter | 7d | Messages produced |
| `processing_errors` | `kafka:metrics:errors:{date}` | counter | 7d | Processing errors |
| `backpressure_events` | `kafka:metrics:backpressure:{date}` | counter | 7d | Backpressure triggers |
| `retry_attempts` | `kafka:metrics:retries:{date}` | counter | 7d | Retry attempts |
| `dlq_messages` | `kafka:metrics:dlq:{date}` | counter | 7d | Dead letter queue messages |

### 3.7 `internal` — Analytics Subsystem (11 keys)

| Key Name | Pattern | Type | TTL | Description |
|----------|---------|------|-----|-------------|
| `analytics_errors` | `analytics_errors_{date}` | counter | 7d | Analytics processing errors |
| `custom_events` | `custom_events_{eventType}_{action}_{date}` | counter | 7d | Custom events |
| `custom_event_users` | `custom_event_users_{eventType}_{action}_{date}` | set | 7d | Unique custom event users |
| `unhandled_actions` | `unhandled_actions_{category}_{action}_{date}` | counter | 7d | Unhandled event types |
| `realtime_events` | `realtime_events_{category}` | counter | 5min | Real-time event count |
| `realtime_actions` | `realtime_actions_{action}` | counter | 5min | Real-time action count |
| `realtime_active_users` | `realtime_active_users` | set | 5min | Currently active users |
| `total_events_hourly` | `total_events_{hour}` | counter | 2d | Total events per hour |
| `total_events_daily` | `total_events_{date}` | counter | 90d | Total events per day |
| `category_events_hourly` | `category_{category}_{hour}` | counter | 2d | Events by category per hour |
| `category_events_daily` | `category_{category}_{date}` | counter | 30d | Events by category per day |

### 3.8 `ranking` — Leaderboards (4 keys)

| Key Name | Pattern | Type | TTL | Description |
|----------|---------|------|-----|-------------|
| `global_leaderboard` | `global_leaderboard` | sorted_set | ∞ | Global leaderboard (score=weighted pts) |
| `monthly_leaderboard` | `monthly_leaderboard_{month}` | sorted_set | ∞ | Monthly leaderboard |
| `difficulty_leaderboard` | `difficulty_leaderboard_{difficulty}` | sorted_set | ∞ | By difficulty |
| `regional_leaderboard` | `regional_leaderboard_{region}` | sorted_set | ∞ | By region |

---

## 4. Variable Resolution

Key patterns contain `{variable}` placeholders. You must supply them as query params when calling data endpoints.

### Common Variable Formats

| Variable | Format | Example |
|----------|--------|---------|
| `{date}` | `yyyy-MM-dd` | `2026-03-02` |
| `{hour}` | `yyyy-MM-dd_HH` | `2026-03-02_14` |
| `{yearWeek}` | `yyyy-Www` | `2026-W09` |
| `{yearMonth}` | `yyyy-MM` | `2026-03` |
| `{month}` | `yyyy-MM` | `2026-03` |
| `{userId}` | numeric string | `12345` |
| `{problemId}` | numeric string | `42` |
| `{language}` | lowercase | `java`, `python`, `cpp` |
| `{difficulty}` | uppercase | `EASY`, `MEDIUM`, `HARD` |
| `{method}` | HTTP method | `GET`, `POST` |
| `{path}` | URL path | `/api/submit` |
| `{ip}` | IP address | `192.168.1.1` |
| `{operation}` | cache op | `hit`, `miss`, `evict` |
| `{status}` | status string | `healthy`, `running`, `completed` |
| `{page}` | page identifier | `problems`, `contests` |
| `{feature}` | feature name | `code-editor`, `ranking` |
| `{region}` | region code | `US`, `IN`, `EU` |

### Auto-fill Strategy

For date/time variables, the frontend should auto-fill current values:

```typescript
function getAutoVariables(): Record<string, string> {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const hour = `${date}_${pad(now.getHours())}`;
  // ISO week calculation
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const weekNum = Math.ceil(((now.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);
  const yearWeek = `${now.getFullYear()}-W${pad(weekNum)}`;
  const yearMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;

  return { date, hour, yearWeek, yearMonth, month: yearMonth };
}
```

### Extracting Required Variables from Pattern

```typescript
function extractVariables(pattern: string): string[] {
  const matches = pattern.match(/\{(\w+)\}/g);
  return matches ? matches.map(m => m.slice(1, -1)) : [];
}

// Example:
extractVariables('active_users_daily_{date}')
// → ['date']

extractVariables('user_language_submissions_{userId}_{language}')
// → ['userId', 'language']
```

---

## 5. Response Value Formats by Type

The `value` field in single-key responses varies by `type`:

### `counter`
```json
{ "value": 42 }
```
A numeric count. Render as a **number card** or feed into a **line chart** (time series).

### `value`
```json
{ "value": "1740000123456" }
```
A raw string value. Interpret based on context (epoch millis → format as date, percentage → format as %).

### `set`
```json
{
  "value": {
    "size": 347,
    "members": ["user_1", "user_2", "user_3"]
  }
}
```
Unique member collection. If >100 members, `members` is replaced with a string `"(347 members, truncated)"`. Use `size` as the primary metric (e.g., DAU = set size). Display members in a scrollable list if needed.

### `sorted_set`
```json
{
  "value": {
    "size": 1200,
    "top50": {
      "user_42": 98.5,
      "user_17": 95.2,
      "user_89": 91.0
    }
  }
}
```
Ranked members with scores. `top50` returns up to 50 highest-score entries. Render as a **leaderboard table** (rank, member, score) or **bar chart**.

### `list`
```json
{
  "value": {
    "length": 250,
    "items": ["entry_1", "entry_2", "...max 100"],
    "truncated": true
  }
}
```
Ordered entries (latest first typically). Render as a **scrollable log/table**. `truncated: true` if >100 items.

### `hash`
```json
{
  "value": {
    "fieldCount": 5,
    "fields": {
      "ip": "192.168.1.1",
      "device": "Chrome/Mac",
      "loginTime": "1740000000000",
      "lastAction": "submit",
      "attempts": "12"
    }
  }
}
```
Key-value pairs. Render as a **detail card** (key-value rows) or **property table**.

---

## 6. Angular Integration Pattern

### 6.1 Service: `AnalyticsRegistryService`

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of, tap, map, catchError } from 'rxjs';

export interface KeyDefinition {
  feature: string;
  name: string;
  pattern: string;
  type: 'counter' | 'set' | 'sorted_set' | 'hash' | 'list' | 'value';
  ttlDays: number;
  ttlSeconds: number;
  description: string;
}

export interface RegistryCache {
  features: Record<string, string[]>;
  totalFeatures: number;
  totalKeys: number;
  loadedAt: number;
}

export interface KeyQueryResult {
  success: boolean;
  feature: string;
  keyName: string;
  resolvedKey: string;
  type: string;
  value: any;
  description: string;
  ttlDays: number;
  ttlSeconds: number;
  timestamp: number;
}

export interface FeatureSummary {
  success: boolean;
  feature: string;
  resolvedKeys: number;
  data: Record<string, any>;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsRegistryService {
  private readonly BASE = '/zcop/api/analytics';
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  private registryCache$ = new BehaviorSubject<RegistryCache | null>(null);
  private featureKeysCache = new Map<string, { keys: KeyDefinition[]; loadedAt: number }>();

  constructor(private http: HttpClient) {}

  // ─── Registry Discovery ───

  /**
   * Load feature list from cache or API. Call this at app init.
   */
  loadRegistry(forceRefresh = false): Observable<RegistryCache> {
    const cached = this.registryCache$.value;
    if (!forceRefresh && cached && Date.now() - cached.loadedAt < this.CACHE_TTL_MS) {
      return of(cached);
    }

    return this.http.get<any>(`${this.BASE}/registry/features`).pipe(
      map(res => ({
        features: res.features,
        totalFeatures: res.totalFeatures,
        totalKeys: res.totalKeys,
        loadedAt: Date.now()
      } as RegistryCache)),
      tap(cache => this.registryCache$.next(cache)),
      catchError(err => {
        console.error('Failed to load analytics registry', err);
        throw err;
      })
    );
  }

  /** Observable of cached registry state */
  get registry$(): Observable<RegistryCache | null> {
    return this.registryCache$.asObservable();
  }

  /** Get feature names from cache (synchronous) */
  getFeatureNames(): string[] {
    return this.registryCache$.value
      ? Object.keys(this.registryCache$.value.features)
      : [];
  }

  /** Get key names for a feature from cache */
  getKeyNamesForFeature(feature: string): string[] {
    return this.registryCache$.value?.features[feature] ?? [];
  }

  // ─── Key Definitions ───

  /**
   * Load full key definitions for a feature (with patterns, types, descriptions).
   */
  loadFeatureKeys(feature: string, forceRefresh = false): Observable<KeyDefinition[]> {
    const cached = this.featureKeysCache.get(feature);
    if (!forceRefresh && cached && Date.now() - cached.loadedAt < this.CACHE_TTL_MS) {
      return of(cached.keys);
    }

    return this.http.get<any>(`${this.BASE}/registry/features/${feature}/keys`).pipe(
      map(res => res.keys as KeyDefinition[]),
      tap(keys => this.featureKeysCache.set(feature, { keys, loadedAt: Date.now() })),
      catchError(err => {
        console.error(`Failed to load keys for feature: ${feature}`, err);
        throw err;
      })
    );
  }

  /** Search keys across all features */
  searchKeys(query: string): Observable<KeyDefinition[]> {
    return this.http.get<any>(`${this.BASE}/registry/keys/search`, {
      params: { q: query }
    }).pipe(map(res => res.keys as KeyDefinition[]));
  }

  /** Get all keys, optionally filtered by type */
  getAllKeys(type?: string): Observable<KeyDefinition[]> {
    const params: any = {};
    if (type) params.type = type;
    return this.http.get<any>(`${this.BASE}/registry/keys`, { params }).pipe(
      map(res => res.keys as KeyDefinition[])
    );
  }

  // ─── Data Queries ───

  /**
   * Query a single key's live value.
   * @param feature  Feature name (e.g., 'user')
   * @param keyName  Key name (e.g., 'active_users_daily')
   * @param variables  Variables to resolve the pattern (e.g., { date: '2026-03-02' })
   */
  queryKey(feature: string, keyName: string, variables: Record<string, string> = {}): Observable<KeyQueryResult> {
    let params = new HttpParams();
    Object.entries(variables).forEach(([k, v]) => params = params.set(k, v));

    return this.http.get<KeyQueryResult>(
      `${this.BASE}/query/feature/${feature}/key/${keyName}`,
      { params }
    );
  }

  /**
   * Get summary of all resolvable keys in a feature.
   * @param feature Feature name
   * @param variables Variables to resolve patterns
   */
  queryFeatureSummary(feature: string, variables: Record<string, string> = {}): Observable<FeatureSummary> {
    let params = new HttpParams();
    Object.entries(variables).forEach(([k, v]) => params = params.set(k, v));

    return this.http.get<FeatureSummary>(
      `${this.BASE}/query/feature/${feature}/summary`,
      { params }
    );
  }

  // ─── Admin ───

  /** Hot-reload the backend registry. Invalidates local cache. */
  reloadRegistry(): Observable<any> {
    return this.http.post<any>(`${this.BASE}/registry/reload`, {}).pipe(
      tap(() => {
        this.registryCache$.next(null);
        this.featureKeysCache.clear();
      })
    );
  }

  // ─── Helpers ───

  /**
   * Parse variables from a key pattern.
   * e.g., 'active_users_daily_{date}' → ['date']
   */
  extractVariables(pattern: string): string[] {
    const matches = pattern.match(/\{(\w+)\}/g);
    return matches ? matches.map(m => m.slice(1, -1)) : [];
  }

  /** Check if all required variables are provided */
  hasAllVariables(pattern: string, variables: Record<string, string>): boolean {
    return this.extractVariables(pattern).every(v => v in variables);
  }

  /** Get auto-fill values for common date/time variables */
  getAutoVariables(): Record<string, string> {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const hour = `${date}_${pad(now.getHours())}`;
    const jan4 = new Date(now.getFullYear(), 0, 4);
    const weekNum = Math.ceil(((now.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);
    const yearWeek = `${now.getFullYear()}-W${pad(weekNum)}`;
    const yearMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;

    return { date, hour, yearWeek, yearMonth, month: yearMonth };
  }

  /** Invalidate all caches */
  clearCache(): void {
    this.registryCache$.next(null);
    this.featureKeysCache.clear();
  }
}
```

### 6.2 Initialization (AppComponent or Core Module)

```typescript
// In AppComponent or a route guard for admin area:
constructor(private analyticsRegistry: AnalyticsRegistryService) {}

ngOnInit() {
  // Pre-load registry on app start (admin users only)
  this.analyticsRegistry.loadRegistry().subscribe();
}
```

### 6.3 Usage in a Component

```typescript
@Component({ ... })
export class AdminAnalyticsComponent implements OnInit {
  features: string[] = [];
  selectedFeature = '';
  keys: KeyDefinition[] = [];
  summary: Record<string, any> = {};

  constructor(private registry: AnalyticsRegistryService) {}

  ngOnInit() {
    this.registry.loadRegistry().subscribe(cache => {
      this.features = Object.keys(cache.features);
    });
  }

  onFeatureSelected(feature: string) {
    this.selectedFeature = feature;
    const autoVars = this.registry.getAutoVariables();

    // Load key definitions (for type info & descriptions)
    this.registry.loadFeatureKeys(feature).subscribe(keys => {
      this.keys = keys;
    });

    // Load live data summary
    this.registry.queryFeatureSummary(feature, autoVars).subscribe(res => {
      this.summary = res.data;
    });
  }

  querySpecificKey(keyDef: KeyDefinition) {
    const vars = this.registry.getAutoVariables();
    // Add entity-specific vars from user input if needed
    const requiredVars = this.registry.extractVariables(keyDef.pattern);
    const missingVars = requiredVars.filter(v => !(v in vars));

    if (missingVars.length > 0) {
      // Prompt user for missing variables (userId, problemId, etc.)
      // ... show input dialog ...
      return;
    }

    this.registry.queryKey(this.selectedFeature, keyDef.name, vars).subscribe(result => {
      // Render based on result.type — see Widget Rendering Guide
    });
  }
}
```

---

## 7. Widget Rendering Guide

### By Redis Type → UI Widget

| Type | Primary Widget | Secondary Widget | Data Point |
|------|---------------|-----------------|------------|
| `counter` | **Number Card** (big number) | Line chart (time series) | `value` → direct number |
| `value` | **Text Card** / **Timestamp** | — | `value` → string, interpret contextually |
| `set` | **Number Card** (size as DAU/WAU/MAU) | Member list (expandable) | `value.size` → count, `value.members` → list |
| `sorted_set` | **Leaderboard Table** (rank/member/score) | Bar chart | `value.top50` → entries, `value.size` → total |
| `list` | **Log Table** (scrollable) | — | `value.items` → rows, `value.length` → total |
| `hash` | **Detail Card** (key-value rows) | — | `value.fields` → property table |

### Rendering Logic (Template Snippet)

```typescript
// In component:
getWidgetType(type: string): string {
  switch (type) {
    case 'counter': return 'number-card';
    case 'value': return 'text-card';
    case 'set': return 'count-with-members';
    case 'sorted_set': return 'leaderboard';
    case 'list': return 'log-table';
    case 'hash': return 'detail-card';
    default: return 'text-card';
  }
}
```

```html
<!-- Template -->
<ng-container [ngSwitch]="getWidgetType(result.type)">

  <!-- Counter: big number -->
  <div *ngSwitchCase="'number-card'" class="stat-card">
    <h3>{{ result.description }}</h3>
    <span class="big-number">{{ result.value | number }}</span>
  </div>

  <!-- Set: DAU/WAU/MAU count -->
  <div *ngSwitchCase="'count-with-members'" class="stat-card">
    <h3>{{ result.description }}</h3>
    <span class="big-number">{{ result.value?.size | number }}</span>
    <small>unique members</small>
  </div>

  <!-- Sorted Set: leaderboard -->
  <table *ngSwitchCase="'leaderboard'" class="leaderboard">
    <thead><tr><th>#</th><th>Member</th><th>Score</th></tr></thead>
    <tbody>
      <tr *ngFor="let entry of result.value?.top50 | keyvalue; let i = index">
        <td>{{ i + 1 }}</td>
        <td>{{ entry.key }}</td>
        <td>{{ entry.value | number:'1.1-1' }}</td>
      </tr>
    </tbody>
    <tfoot><tr><td colspan="3">Total: {{ result.value?.size }}</td></tr></tfoot>
  </table>

  <!-- Hash: property table -->
  <table *ngSwitchCase="'detail-card'" class="detail-table">
    <tr *ngFor="let field of result.value?.fields | keyvalue">
      <th>{{ field.key }}</th>
      <td>{{ field.value }}</td>
    </tr>
  </table>

  <!-- List: log -->
  <div *ngSwitchCase="'log-table'" class="log-panel">
    <h3>{{ result.description }} ({{ result.value?.length }} entries)</h3>
    <ul><li *ngFor="let item of result.value?.items">{{ item }}</li></ul>
    <small *ngIf="result.value?.truncated">Showing first 100 of {{ result.value?.length }}</small>
  </div>

  <!-- Value: text -->
  <div *ngSwitchDefault class="stat-card">
    <h3>{{ result.description }}</h3>
    <span>{{ result.value }}</span>
  </div>

</ng-container>
```

---

## 8. Dashboard Layout Suggestions

### Overview Dashboard (System Health)

Use `queryFeatureSummary('system', autoVars)` for a single-call overview:

| Widget | Source Key | Type | Notes |
|--------|-----------|------|-------|
| Error Rate | `system_errors` | counter | Compare with previous hour |
| CPU Gauge | `cpu_usage` | sorted_set | Latest sample from top50 |
| Memory Gauge | `memory_usage` | sorted_set | Latest sample from top50 |
| Uptime | `last_startup_time` | value | `Date.now() - value` |
| Rate Limit Alerts | `rate_limit_hits` | counter | Per endpoint breakdown |
| Failed Logins | `failed_login_ip` | counter | Per IP breakdown |

### User Analytics Dashboard

| Widget | Source Key | Type | Notes |
|--------|-----------|------|-------|
| DAU | `active_users_daily` | set | `value.size` |
| WAU | `active_users_weekly` | set | `value.size` |
| MAU | `active_users_monthly` | set | `value.size` |
| Real-time Users | `active_users_current` | set | `value.size` (auto-refresh 30s) |
| Login Trend | `user_logins_daily` | counter | Last 7/30 days line chart |
| Session Duration | `session_durations` | sorted_set | Avg from top50 scores |
| Login Methods | `login_methods` | counter | Pie chart (query each method) |

### Problem Analytics Dashboard

| Widget | Source Key | Type | Notes |
|--------|-----------|------|-------|
| Daily Submissions | `problem_submissions_daily` | counter | Line chart over days |
| Acceptance Rate | `accepted_submissions_daily` / `problem_submissions_daily` | counter | Compute % client-side |
| Language Breakdown | `language_usage` | counter | Bar chart per language |
| Execution Results | `execution_results` | counter | success vs failure pie |
| Top Solvers | `attempt_durations` | sorted_set | Fastest solve times |
| Active Solvers | `active_problem_solvers` | set | Live count per problem |

### Kafka & Infrastructure

| Widget | Source Key | Type | Notes |
|--------|-----------|------|-------|
| Throughput | `messages_consumed` / `messages_produced` | counter | Side-by-side cards |
| Error Rate | `processing_errors` | counter | Alert if > threshold |
| DLQ Count | `dlq_messages` | counter | Red alert if > 0 |
| Backpressure | `backpressure_events` | counter | Warning indicator |

### Time-Series Pattern (Last N Days)

To build a line chart for daily counters (e.g., submissions over 7 days):

```typescript
async loadTimeSeriesData(feature: string, keyName: string, days: number): Promise<{date: string, value: number}[]> {
  const results: {date: string, value: number}[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10); // yyyy-MM-dd

    const res = await firstValueFrom(
      this.registry.queryKey(feature, keyName, { date: dateStr })
    );

    results.push({
      date: dateStr,
      value: res.success ? (typeof res.value === 'number' ? res.value : res.value?.size ?? 0) : 0
    });
  }
  return results;
}
```

> **Performance tip:** For 7-30 day ranges, batch these calls with `forkJoin()`. Each call is a simple Redis read (~1ms backend), so 30 parallel calls complete in ~50ms total.

---

## 9. Error Handling

### Response Envelope

All responses include `success: boolean`. Always check it:

```typescript
this.registry.queryKey('user', 'active_users_daily', { date: '2026-03-02' })
  .subscribe({
    next: (res) => {
      if (!res.success) {
        // Handle: feature not found, key not found, unresolved variables
        if (res.error?.includes('Unresolved variables')) {
          // Show variable input dialog with hint from res.hint
        }
        return;
      }
      // Use res.value
    },
    error: (httpErr) => {
      // 401 → not authenticated
      // 403 → not ADMIN/ANALYTICS role
      // 404 → feature or key not found (body has availableFeatures/availableKeys)
      // 500 → server error
    }
  });
```

### Common Error Scenarios

| HTTP Status | Cause | Frontend Action |
|-------------|-------|-----------------|
| 400 | Missing required variables | Show input prompt with `hint` from response |
| 401 | Not authenticated | Redirect to login |
| 403 | Insufficient role | Show "Admin access required" |
| 404 | Feature/key not found | Show available options from `availableFeatures`/`availableKeys` |
| 500 | Redis down or backend error | Show retry button, check system health |

### Null/Empty Data

Keys that have expired or were never written return:
- **counter** → `0`
- **value** → `null`
- **set** → `{ size: 0, members: [] }`
- **sorted_set** → `{ size: 0, top50: {} }`
- **list** → `{ length: 0, items: [] }`
- **hash** → `{ fieldCount: 0, fields: null }`

Always handle `null` and `0` gracefully — show "No data" rather than broken widgets.

---

## Appendix: Quick Reference Card

```
BASE: /zcop/api/analytics

DISCOVERY (cache these):
  GET /registry/features                          → feature list + key names
  GET /registry/features/{feature}/keys           → key definitions (patterns, types)
  GET /registry/keys?type=counter                 → all keys, optional type filter
  GET /registry/keys/search?q=login               → search by substring

DATA (call per widget):
  GET /query/feature/{feature}/summary?date=...   → all resolvable keys in feature
  GET /query/feature/{feature}/key/{keyName}?...  → single key's full value

ADMIN:
  POST /registry/reload                           → hot-reload + invalidate cache

FEATURES: user | problem | system | engagement | performance | kafka | internal | ranking
TYPES:    counter | value | set | sorted_set | list | hash
```

---

*Last updated: July 2025*
