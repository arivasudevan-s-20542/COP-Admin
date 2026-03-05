import { Component, OnInit, signal, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { ApiService } from '../../../core/api/api.service';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE';
  source: string;
  message: string;
  metadata?: Record<string, any>;
  traceId?: string;
}

@Component({
  selector: 'app-logs-viewer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TagModule,
    InputTextModule,
    TooltipModule,
    CheckboxModule
  ],
  templateUrl: './logs-viewer.component.html',
  styleUrls: ['./logs-viewer.component.scss']
})
export class LogsViewerComponent implements OnInit, OnDestroy {
  private readonly apiService = inject(ApiService);

  logs = signal<LogEntry[]>([]);
  filteredLogs = signal<LogEntry[]>([]);
  searchQuery = signal('');
  selectedLevels = signal<Set<string>>(new Set(['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE']));
  autoScroll = signal(true);
  isPaused = signal(false);
  
  // For checkbox binding
  autoScrollEnabled = true;
  
  levels = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'];
  
  private logInterval: any;
  private logIdCounter = 1;

  ngOnInit() {
    this.loadInitialLogs();
    this.startLogStream();
  }

  ngOnDestroy() {
    if (this.logInterval) {
      clearInterval(this.logInterval);
    }
  }
  
  toggleAutoScroll() {
    this.autoScroll.set(this.autoScrollEnabled);
  }

  loadInitialLogs() {
    this.apiService.getMetricsErrorsAnalysis().pipe(
      map(res => {
        const items = res?.data?.errors ?? res?.data ?? res ?? [];
        if (!Array.isArray(items)) return [];
        return items.map((log: any, i: number) => ({
          id: log.id ?? `L${String(i + 1).padStart(3, '0')}`,
          timestamp: log.timestamp ?? new Date().toISOString().replace('T', ' ').substring(0, 23),
          level: (log.level ?? log.severity ?? 'INFO').toUpperCase() as LogEntry['level'],
          source: log.source ?? log.service ?? log.component ?? 'System',
          message: log.message ?? log.error ?? '',
          metadata: log.metadata ?? log.details,
          traceId: log.traceId ?? log.trace_id
        })) as LogEntry[];
      }),
      catchError(() => of([] as LogEntry[]))
    ).subscribe(logs => {
      this.logIdCounter = logs.length + 1;
      this.logs.set(logs);
      this.applyFilters();
    });
  }

  startLogStream() {
    this.logInterval = setInterval(() => {
      if (!this.isPaused()) {
        this.apiService.getMetricsErrorsAnalysis().pipe(
          map(res => {
            const items = res?.data?.errors ?? res?.data ?? res ?? [];
            if (!Array.isArray(items)) return [];
            return items.slice(0, 3).map((log: any, i: number) => ({
              id: `L${String(this.logIdCounter++).padStart(6, '0')}`,
              timestamp: log.timestamp ?? new Date().toISOString().replace('T', ' ').substring(0, 23),
              level: (log.level ?? log.severity ?? 'INFO').toUpperCase() as LogEntry['level'],
              source: log.source ?? log.service ?? log.component ?? 'System',
              message: log.message ?? log.error ?? '',
              metadata: log.metadata ?? log.details,
              traceId: log.traceId ?? log.trace_id
            })) as LogEntry[];
          }),
          catchError(() => of([] as LogEntry[]))
        ).subscribe(newLogs => {
          if (newLogs.length > 0) {
            this.logs.update(existing => [...existing.slice(-(999 - newLogs.length)), ...newLogs]);
            this.applyFilters();
          }
        });
      }
    }, 5000);
  }

  applyFilters() {
    let filtered = this.logs();
    
    // Level filter
    filtered = filtered.filter(log => this.selectedLevels().has(log.level));
    
    // Search filter
    const query = this.searchQuery().toLowerCase();
    if (query) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(query) ||
        log.source.toLowerCase().includes(query) ||
        log.traceId?.toLowerCase().includes(query)
      );
    }
    
    this.filteredLogs.set(filtered);
  }

  toggleLevel(level: string) {
    this.selectedLevels.update(levels => {
      const newLevels = new Set(levels);
      if (newLevels.has(level)) {
        newLevels.delete(level);
      } else {
        newLevels.add(level);
      }
      return newLevels;
    });
    this.applyFilters();
  }

  onSearchChange(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.applyFilters();
  }

  togglePause() {
    this.isPaused.update(v => !v);
  }

  clearLogs() {
    this.logs.set([]);
    this.filteredLogs.set([]);
  }

  exportLogs() {
    const logsText = this.filteredLogs().map(log => 
      `[${log.timestamp}] [${log.level}] [${log.source}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  }

  getLevelClass(level: string): string {
    return level.toLowerCase();
  }

  copyLog(log: LogEntry) {
    const text = `[${log.timestamp}] [${log.level}] [${log.source}] ${log.message}`;
    navigator.clipboard.writeText(text);
  }
}
