import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ChartModule } from 'primeng/chart';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ApiService } from '../../../core/api/api.service';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

interface DbKpi {
  label: string;
  value: string;
  subValue?: string;
  icon: string;
  iconColor: string;
  trend?: { value: string; direction: 'up' | 'down'; positive: boolean };
  progress?: number;
  progressColor?: string;
}

interface SlowQuery {
  id: string;
  sql: string;
  duration: number;
  rows: number;
  timestamp: string;
  type: 'SELECT' | 'UPDATE' | 'INSERT' | 'DELETE';
}

interface DbLock {
  sourcePid: string;
  targetPid: string;
  table: string;
  waitTime: number;
  severity: 'critical' | 'warning';
}

interface StorageUsage {
  table: string;
  size: string;
  percentage: number;
  color: string;
}

@Component({
  selector: 'app-database',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TableModule,
    ChartModule,
    TagModule,
    ProgressBarModule,
    ButtonModule,
    TooltipModule
  ],
  templateUrl: './database.component.html',
  styleUrl: './database.component.scss'
})
export class DatabaseComponent implements OnInit, OnDestroy {
  private readonly apiService = inject(ApiService);
  private refreshInterval: any;

  // State
  selectedTimeRange = signal<string>('1h');
  clusterName = signal('Primary-01');
  clusterStatus = signal<'active' | 'degraded' | 'down'>('active');
  region = signal('us-east-1');
  dbVersion = signal('PostgreSQL 14');

  // KPIs
  kpis = signal<DbKpi[]>([]);

  // Latency chart
  latencyChartData = signal<any>(null);
  latencyChartOptions = signal<any>(null);

  // Throughput chart
  throughputChartData = signal<any>(null);
  throughputChartOptions = signal<any>(null);

  // Current throughput
  currentThroughput = signal<number>(5200);

  // Slow queries
  slowQueries = signal<SlowQuery[]>([]);

  // Active locks
  activeLocks = signal<DbLock[]>([
    {
      sourcePid: 'PID 4920',
      targetPid: 'PID 5102',
      table: 'submissions',
      waitTime: 14,
      severity: 'critical'
    },
    {
      sourcePid: 'PID 3301',
      targetPid: 'PID 8812',
      table: 'users',
      waitTime: 2,
      severity: 'warning'
    }
  ]);

  // Storage usage
  storageUsage = signal<StorageUsage[]>([
    { table: 'submissions', size: '450 GB', percentage: 75, color: 'bg-primary' },
    { table: 'test_cases', size: '120 GB', percentage: 30, color: 'bg-blue-400' },
    { table: 'problems', size: '45 GB', percentage: 12, color: 'bg-purple-400' },
    { table: 'users', size: '12 GB', percentage: 5, color: 'bg-green-400' }
  ]);

  // Time ranges
  timeRanges = ['1h', '6h', '24h', '7d'];

  ngOnInit() {
    this.loadKpis();
    this.loadSlowQueries();
    this.initCharts();
    this.startDataRefresh();
  }

  private loadKpis(): void {
    this.apiService.getMetricsDashboard().pipe(
      map(res => {
        const d = res?.data ?? res;
        return [
          {
            label: 'DB Health',
            value: d?.dbHealth ?? d?.databaseStatus ?? 'Healthy',
            icon: 'pi pi-check-circle',
            iconColor: 'text-green-500',
            progress: d?.dbHealthScore ?? 100,
            progressColor: 'bg-green-500'
          },
          {
            label: 'Avg Query Latency',
            value: d?.avgQueryLatency ?? d?.dbLatency ?? '0ms',
            icon: 'pi pi-clock',
            iconColor: 'text-yellow-500',
            trend: { value: d?.latencyChange ?? '+0%', direction: (d?.latencyChange ?? '').startsWith('-') ? 'down' as const : 'up' as const, positive: (d?.latencyChange ?? '').startsWith('-') }
          },
          {
            label: 'Connection Pool',
            value: d?.connectionPoolUsage ?? d?.poolUsage ?? '0%',
            subValue: d?.poolStatus ?? '',
            icon: 'pi pi-sitemap',
            iconColor: 'text-orange-500',
            progress: parseInt(d?.connectionPoolUsage ?? d?.poolUsage ?? '0'),
            progressColor: 'bg-orange-500'
          },
          {
            label: 'Replication Lag',
            value: d?.replicationLag ?? '0s',
            subValue: d?.replicationStatus ?? '',
            icon: 'pi pi-sync',
            iconColor: 'text-blue-500',
            progress: Math.min(100, parseFloat(d?.replicationLag ?? '0') * 100),
            progressColor: 'bg-blue-500'
          }
        ] as DbKpi[];
      }),
      catchError(() => of([] as DbKpi[]))
    ).subscribe(kpis => {
      if (kpis.length > 0) this.kpis.set(kpis);
    });
  }

  private loadSlowQueries(): void {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    this.apiService.queryAnalyticsKey('performance', 'slow_queries', { queryType: 'all', date }).pipe(
      map(res => {
        const items = res?.data ?? res ?? [];
        if (!Array.isArray(items)) return [];
        return items.map((q: any, i: number) => ({
          id: q.id ?? `#${i}`,
          sql: q.sql ?? q.query ?? '',
          duration: q.duration ?? q.durationMs ?? 0,
          rows: q.rows ?? q.rowCount ?? 0,
          timestamp: q.timestamp ?? '',
          type: (q.type ?? q.queryType ?? 'SELECT').toUpperCase()
        })) as SlowQuery[];
      }),
      catchError(() => of([] as SlowQuery[]))
    ).subscribe(queries => {
      this.slowQueries.set(queries);
    });
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  private initCharts() {
    // Latency distribution chart
    const latencyLabels = ['10:00', '10:15', '10:30', '10:45', '11:00'];
    this.latencyChartData.set({
      labels: latencyLabels,
      datasets: [
        {
          label: 'p50',
          data: [2.1, 2.3, 2.0, 2.2, 2.1],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: false
        },
        {
          label: 'p90',
          data: [4.5, 5.2, 6.0, 7.5, 6.8],
          borderColor: '#eab308',
          backgroundColor: 'rgba(234, 179, 8, 0.1)',
          tension: 0.4,
          fill: false
        },
        {
          label: 'p99',
          data: [8.5, 12.0, 15.0, 18.0, 14.5],
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
          fill: false
        }
      ]
    });

    this.latencyChartOptions.set({
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: { color: '#94a3b8', usePointStyle: true, pointStyle: 'line' }
        }
      },
      scales: {
        x: {
          ticks: { color: '#64748b' },
          grid: { color: '#1e293b' }
        },
        y: {
          ticks: { color: '#64748b', callback: (v: number) => v + 'ms' },
          grid: { color: '#1e293b' }
        }
      }
    });

    // Throughput bar chart
    this.throughputChartData.set({
      labels: Array.from({ length: 14 }, (_, i) => ''),
      datasets: [
        {
          data: [40, 55, 45, 60, 75, 80, 65, 50, 55, 70, 85, 90, 75, 60],
          backgroundColor: 'rgba(13, 89, 242, 0.3)',
          hoverBackgroundColor: 'rgba(13, 89, 242, 0.5)',
          borderRadius: 2
        }
      ]
    });

    this.throughputChartOptions.set({
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          display: false,
          grid: { display: false }
        },
        y: {
          display: false,
          grid: { display: false }
        }
      }
    });
  }

  private startDataRefresh() {
    this.refreshInterval = setInterval(() => {
      this.simulateDataUpdate();
    }, 5000);
  }

  private simulateDataUpdate() {
    // Update throughput
    this.currentThroughput.set(5000 + Math.floor(Math.random() * 500));

    // Update latency
    const currentKpis = this.kpis();
    const latencyKpi = currentKpis.find(k => k.label === 'Avg Query Latency');
    if (latencyKpi) {
      latencyKpi.value = (3.5 + Math.random() * 2).toFixed(1) + 'ms';
    }
    this.kpis.set([...currentKpis]);
  }

  setTimeRange(range: string) {
    this.selectedTimeRange.set(range);
  }

  getDurationSeverity(duration: number): 'danger' | 'warn' | 'secondary' {
    if (duration > 1000) return 'danger';
    if (duration > 200) return 'warn';
    return 'secondary';
  }

  formatDuration(ms: number): string {
    if (ms >= 1000) {
      return (ms / 1000).toFixed(1) + 's';
    }
    return ms + 'ms';
  }

  formatRows(rows: number): string {
    if (rows >= 1000) {
      return (rows / 1000).toFixed(0) + 'k';
    }
    return rows.toString();
  }

  getSqlTypeColor(type: string): string {
    switch (type) {
      case 'SELECT': return 'text-purple-400';
      case 'UPDATE': return 'text-blue-400';
      case 'INSERT': return 'text-green-400';
      case 'DELETE': return 'text-red-400';
      default: return 'text-gray-400';
    }
  }
}
