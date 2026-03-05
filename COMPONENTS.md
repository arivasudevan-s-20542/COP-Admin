# ZCOP Admin - Components & Architecture

> Angular 19 Admin Panel with PrimeNG v19 (Aura Theme)

## 📁 Project Structure

```
src/app/
├── core/                    # Core functionality (singleton services)
├── features/                # Feature modules (lazy-loaded)
├── layout/                  # Layout components
└── shared/                  # Shared components, services, pipes
```

---

## 🏗️ Layout Components

| Component | Path | Description |
|-----------|------|-------------|
| `MainLayoutComponent` | `layout/main-layout/` | Root layout with sidebar + header + content area |
| `SidebarComponent` | `layout/sidebar/` | Navigation sidebar with collapsible menu |
| `HeaderComponent` | `layout/header/` | Top header with user profile, search, notifications |

---

## 🎯 Feature Components

### 📊 Dashboard
| Component | Path | Description |
|-----------|------|-------------|
| `DashboardComponent` | `features/dashboard/` | Main dashboard with analytics widgets |

### 🔐 Authentication
| Component | Path | Description |
|-----------|------|-------------|
| `LoginComponent` | `features/auth/login/` | Admin login page |

### 👥 Admin Management
| Component | Path | Description |
|-----------|------|-------------|
| `ProfileComponent` | `features/admin/profile/` | Admin profile management |
| `RbacComponent` | `features/admin/rbac/` | Role-based access control |
| `AuditLogsComponent` | `features/admin/audit-logs/` | System audit logs viewer |

### 📝 Content Management
| Component | Path | Description |
|-----------|------|-------------|
| `ProblemsComponent` | `features/content/problems/` | Problem listing & management |
| `ProblemEditorComponent` | `features/content/problem-editor/` | Rich problem editor with markdown support |
| `ContestsComponent` | `features/content/contests/` | Contest management |
| `BlogComponent` | `features/content/blog/` | Blog posts listing |
| `BlogEditorComponent` | `features/content/blog-editor/` | Blog post editor |

### 👤 User Management
| Component | Path | Description |
|-----------|------|-------------|
| `UserManagementComponent` | `features/users/user-management/` | User CRUD operations |
| `CommunicationComponent` | `features/users/communication/` | User communication tools |
| `BulkEmailComponent` | `features/users/bulk-email/` | Bulk email sender |
| `SupportTicketsComponent` | `features/users/support-tickets/` | Support ticket management |

### 📊 Monitoring
| Component | Path | Description |
|-----------|------|-------------|
| `SystemHealthComponent` | `features/monitoring/system-health/` | System health dashboard |
| `CacheComponent` | `features/monitoring/cache/` | Cache monitoring & management |
| `DatabaseComponent` | `features/monitoring/database/` | Database metrics & status |
| `JobsComponent` | `features/monitoring/jobs/` | Background jobs monitoring |
| `NetworkComponent` | `features/monitoring/network/` | Network traffic monitoring |

### 📋 Logs
| Component | Path | Description |
|-----------|------|-------------|
| `LogsViewerComponent` | `features/logs/logs-viewer/` | Log search & viewer |
| `AnomalyDetectionComponent` | `features/logs/anomaly-detection/` | AI-powered anomaly detection |

### 🔔 Alerts
| Component | Path | Description |
|-----------|------|-------------|
| `AlertRulesComponent` | `features/alerts/alert-rules/` | Alert rule configuration |
| `NotificationsComponent` | `features/alerts/notifications/` | Notification management |

### 📧 Mail
| Component | Path | Description |
|-----------|------|-------------|
| `MailDashboardComponent` | `features/mail/mail-dashboard/` | Email dashboard & analytics |

### 🔍 Search
| Component | Path | Description |
|-----------|------|-------------|
| `GlobalSearchComponent` | `features/search/global-search/` | Global search functionality |

### 🧪 Demo Components
| Component | Path | Description |
|-----------|------|-------------|
| `MarkdownDemoComponent` | `features/demo/markdown-demo/` | Markdown editor demo |
| `MarkdownRenderDemoComponent` | `features/demo/markdown-render-demo/` | **NEW** Markdown render service demo with toolbar |

---

## 🔧 Shared Components

| Component | Path | Description |
|-----------|------|-------------|
| `MarkdownEditorComponent` | `shared/components/markdown-editor/` | Basic markdown editor (PrimeNG p-editor based) |
| `MarkdownEditorV2Component` | `shared/components/markdown-editor-v2/` | **NEW** Advanced markdown editor with smart lists, multi-tab code blocks |

---

## 🛠️ Services

### Core Services
| Service | Path | Description |
|---------|------|-------------|
| `ApiService` | `core/api/` | HTTP API client with interceptors |
| `AuthService` | `core/auth/` | Authentication & token management |
| `ToastService` | `core/services/` | Toast notification service |

### Shared Services
| Service | Path | Description |
|---------|------|-------------|
| `MarkdownRenderService` | `shared/services/` | **NEW** Pure TypeScript markdown renderer with multi-tab code blocks |

---

## 🔒 Guards & Interceptors

| Item | Path | Type | Description |
|------|------|------|-------------|
| `AuthGuard` | `core/guards/` | Guard | Route protection for authenticated users |
| `AuthInterceptor` | `core/interceptors/` | Interceptor | JWT token injection |

---

## 📦 Pipes

| Pipe | Path | Description |
|------|------|-------------|
| `MarkdownPipe` | `shared/pipes/` | **NEW** Transform markdown to HTML using MarkdownRenderService |

---

## 🎨 Shared Styles

| File | Path | Description |
|------|------|-------------|
| `markdown-render.scss` | `shared/styles/` | **NEW** Comprehensive markdown rendering styles |

---

## 🆕 Recently Created (Markdown Rendering System)

### MarkdownRenderService
**Location:** `shared/services/markdown-render.service.ts`

A lightweight, pure TypeScript markdown renderer (no external dependencies like marked.js).

**Features:**
- ✅ Headings (H1-H6)
- ✅ Bold & Italic text
- ✅ Inline code & fenced code blocks
- ✅ **Multi-tab code blocks** (LeetCode-style with `[]` marker)
- ✅ Syntax highlighting for 10+ languages
- ✅ Math expressions (`$$O(n)$$`)
- ✅ Blockquotes
- ✅ Ordered & unordered lists
- ✅ Links & images
- ✅ Horizontal rules

**Usage:**
```typescript
// In component
import { MarkdownRenderService } from '../shared/services/markdown-render.service';

constructor(private markdownService: MarkdownRenderService) {}

render() {
  const html = this.markdownService.renderToString(markdownText);
}

// In template with pipe
import { MarkdownPipe } from '../shared/pipes/markdown.pipe';

// Template
<div [innerHTML]="content | markdown"></div>
```

### Multi-Tab Code Block Syntax
```markdown
\`\`\`javascript []
console.log('JavaScript');
\`\`\`
\`\`\`python []
print('Python')
\`\`\`
\`\`\`java []
System.out.println("Java");
\`\`\`
```

---

## 📍 Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `DashboardComponent` | Dashboard |
| `/login` | `LoginComponent` | Login page |
| `/problems` | `ProblemsComponent` | Problem list |
| `/problems/editor` | `ProblemEditorComponent` | Problem editor |
| `/contests` | `ContestsComponent` | Contest management |
| `/users` | `UserManagementComponent` | User management |
| `/monitoring/health` | `SystemHealthComponent` | System health |
| `/monitoring/cache` | `CacheComponent` | Cache monitoring |
| `/monitoring/database` | `DatabaseComponent` | Database monitoring |
| `/monitoring/jobs` | `JobsComponent` | Jobs monitoring |
| `/logs` | `LogsViewerComponent` | Log viewer |
| `/alerts/rules` | `AlertRulesComponent` | Alert rules |
| `/admin/rbac` | `RbacComponent` | RBAC management |
| `/admin/audit` | `AuditLogsComponent` | Audit logs |
| `/demo/markdown-render` | `MarkdownRenderDemoComponent` | Markdown render demo |

---

## 🎨 Tech Stack

- **Framework:** Angular 19 (Standalone Components)
- **UI Library:** PrimeNG v19 with Aura Theme
- **State Management:** Angular Signals
- **Styling:** SCSS with CSS Variables
- **Icons:** PrimeIcons
- **Dev Server:** Port 4300

---

## 📊 Statistics

| Metric | Count |
|--------|-------|
| Feature Components | 24 |
| Layout Components | 3 |
| Shared Components | 1 |
| Services | 4 |
| Pipes | 1 |
| Guards | 1 |
| Interceptors | 1 |
| **Total** | **35** |

---

*Last updated: January 2026*
