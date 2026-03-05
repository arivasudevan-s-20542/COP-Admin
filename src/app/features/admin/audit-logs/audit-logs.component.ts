import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { ApiService } from '../../../core/api/api.service';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  category: 'auth' | 'user' | 'content' | 'system' | 'security';
  resource: string;
  resourceId: string;
  actor: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure' | 'warning';
  details: Record<string, any>;
}

interface AuditStats {
  totalEvents: number;
  todayEvents: number;
  failedEvents: number;
  uniqueUsers: number;
}

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    InputTextModule,
    TooltipModule,
    Select,
    DatePicker,
    DialogModule
  ],
  templateUrl: './audit-logs.component.html',
  styleUrls: ['./audit-logs.component.scss']
})
export class AuditLogsComponent implements OnInit {
  private readonly apiService = inject(ApiService);

  stats = signal<AuditStats>({
    totalEvents: 0,
    todayEvents: 0,
    failedEvents: 0,
    uniqueUsers: 0
  });

  auditLogs = signal<AuditLog[]>([]);
  filteredLogs: AuditLog[] = [];
  selectedCategory = signal<string>('all');
  searchQuery = signal('');
  dateRange = signal<Date[] | null>(null);
  showDetailDialog = signal(false);
  selectedLog = signal<AuditLog | null>(null);

  categories = [
    { label: 'All Categories', value: 'all' },
    { label: 'Authentication', value: 'auth' },
    { label: 'User Management', value: 'user' },
    { label: 'Content', value: 'content' },
    { label: 'System', value: 'system' },
    { label: 'Security', value: 'security' }
  ];

  ngOnInit() {
    this.loadAuditLogs();
  }

  loadAuditLogs() {
    this.apiService.getUserAudit('all').pipe(
      map(res => {
        const items = res?.data ?? res ?? [];
        if (!Array.isArray(items)) return [];
        return items.map((log: any, i: number) => ({
          id: log.id ?? `AL${String(i + 1).padStart(3, '0')}`,
          timestamp: log.timestamp ?? '',
          action: log.action ?? '',
          category: log.category ?? 'system',
          resource: log.resource ?? '',
          resourceId: log.resourceId ?? '',
          actor: {
            id: log.actor?.id ?? log.actorId ?? '',
            name: log.actor?.name ?? log.actorName ?? '',
            email: log.actor?.email ?? log.actorEmail ?? '',
            role: log.actor?.role ?? log.actorRole ?? ''
          },
          ipAddress: log.ipAddress ?? log.ip ?? '',
          userAgent: log.userAgent ?? '',
          status: log.status ?? 'success',
          details: log.details ?? {}
        })) as AuditLog[];
      }),
      catchError(() => of([] as AuditLog[]))
    ).subscribe(logs => {
      this.auditLogs.set(logs);
      this.deriveStats(logs);
      this.applyFilters();
    });
  }

  private deriveStats(logs: AuditLog[]) {
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = logs.filter(l => l.timestamp.startsWith(today));
    const failed = logs.filter(l => l.status === 'failure');
    const uniqueActors = new Set(logs.map(l => l.actor.id));
    this.stats.set({
      totalEvents: logs.length,
      todayEvents: todayLogs.length,
      failedEvents: failed.length,
      uniqueUsers: uniqueActors.size
    });
  }

  applyFilters() {
    let filtered = this.auditLogs();
    
    if (this.selectedCategory() !== 'all') {
      filtered = filtered.filter(log => log.category === this.selectedCategory());
    }
    
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(query) ||
        log.actor.name.toLowerCase().includes(query) ||
        log.actor.email.toLowerCase().includes(query) ||
        log.resource.toLowerCase().includes(query)
      );
    }
    
    this.filteredLogs = filtered;
  }

  onCategoryChange(event: any) {
    this.selectedCategory.set(event.value);
    this.applyFilters();
  }

  onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.applyFilters();
  }

  viewDetails(log: AuditLog) {
    this.selectedLog.set(log);
    this.showDetailDialog.set(true);
  }

  exportLogs() {
    console.log('Exporting logs:', this.filteredLogs);
  }

  getCategorySeverity(category: string): 'success' | 'warn' | 'info' | 'danger' {
    switch (category) {
      case 'auth': return 'info';
      case 'security': return 'danger';
      case 'content': return 'success';
      case 'system': return 'warn';
      default: return 'info';
    }
  }

  getStatusSeverity(status: string): 'success' | 'warn' | 'danger' {
    switch (status) {
      case 'success': return 'success';
      case 'warning': return 'warn';
      case 'failure': return 'danger';
      default: return 'success';
    }
  }

  getActionIcon(action: string): string {
    if (action.includes('login')) return 'pi-sign-in';
    if (action.includes('logout')) return 'pi-sign-out';
    if (action.includes('create')) return 'pi-plus';
    if (action.includes('update')) return 'pi-pencil';
    if (action.includes('delete')) return 'pi-trash';
    if (action.includes('publish')) return 'pi-send';
    if (action.includes('config')) return 'pi-cog';
    if (action.includes('rate_limit')) return 'pi-exclamation-triangle';
    return 'pi-circle';
  }

  formatJson(obj: any): string {
    return JSON.stringify(obj, null, 2);
  }
}
