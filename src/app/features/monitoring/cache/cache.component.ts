import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { ChartModule } from 'primeng/chart';
import { BadgeModule } from 'primeng/badge';
import { SkeletonModule } from 'primeng/skeleton';
import { SelectModule } from 'primeng/select';
import { ApiService } from '../../../core/api/api.service';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

interface RedisStats {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  uptime: string;
  memoryUsed: number;
  memoryMax: number;
  hitRatio: number;
  connectedClients: number;
  clientChange: number;
  opsPerSecond: number;
  latencyMs: number;
}

interface SlowLogEntry {
  id: number;
  timestamp: string;
  command: string;
  duration: number;
  clientIp: string;
}

interface ReplicaNode {
  name: string;
  role: 'master' | 'replica';
  ip: string;
  zone: string;
  status: 'healthy' | 'syncing' | 'error';
  syncProgress?: number;
  offset?: number;
}

interface TTLBucket {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

@Component({
  selector: 'app-cache',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    ProgressBarModule,
    TooltipModule,
    ChartModule,
    BadgeModule,
    SkeletonModule,
    SelectModule
  ],
  templateUrl: './cache.component.html',
  styleUrl: './cache.component.scss'
})
export class CacheComponent implements OnInit, OnDestroy {
  private readonly apiService = inject(ApiService);

  // State signals
  isLoading = signal(true);
  isLive = signal(true);
  refreshInterval = signal(1000);
  
  // Data signals
  stats = signal<RedisStats | null>(null);
  slowLogs = signal<SlowLogEntry[]>([]);
  replicas = signal<ReplicaNode[]>([]);
  ttlDistribution = signal<TTLBucket[]>([]);
  
  // Chart data
  memoryChartData = signal<any>(null);
  throughputChartData = signal<any>(null);
  
  // Computed values
  memoryPercentage = computed(() => {
    const s = this.stats();
    return s ? Math.round((s.memoryUsed / s.memoryMax) * 100) : 0;
  });
  
  memoryStatus = computed(() => {
    const pct = this.memoryPercentage();
    if (pct >= 90) return 'danger';
    if (pct >= 75) return 'warn';
    return 'success';
  });
  
  // Chart options
  lineChartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { size: 10 } },
        grid: { color: '#1e293b' }
      },
      y: {
        ticks: { color: '#64748b', font: { size: 10 } },
        grid: { color: '#1e293b' }
      }
    }
  };
  
  barChartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' as const, labels: { color: '#94a3b8', boxWidth: 12 } }
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { size: 10 } },
        grid: { display: false }
      },
      y: {
        ticks: { color: '#64748b', font: { size: 10 } },
        grid: { color: '#1e293b' }
      },
      y1: {
        position: 'right' as const,
        ticks: { color: '#f59e0b', font: { size: 10 } },
        grid: { display: false }
      }
    }
  };
  
  refreshOptions = [
    { label: '1 second', value: 1000 },
    { label: '5 seconds', value: 5000 },
    { label: '10 seconds', value: 10000 },
    { label: '30 seconds', value: 30000 }
  ];

  private refreshTimer: any;

  ngOnInit(): void {
    this.loadInitialData();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  private loadInitialData(): void {
    this.isLoading.set(true);
    this.updateStats();
    this.loadSlowLogs();
    this.loadReplicas();
    this.loadTTLDistribution();
    this.updateCharts();
  }

  private getAnalyticsDateParams(): { hour: string; date: string } {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const hour = `${date}_${pad(now.getHours())}`;
    return { hour, date };
  }

  private updateStats(): void {
    const { hour, date } = this.getAnalyticsDateParams();
    this.apiService.queryAnalyticsFeatureSummary('performance', { hour, date }).pipe(
      map(res => {
        const d = res?.data ?? res;
        return {
          status: d?.status ?? d?.redisStatus ?? 'UP',
          uptime: d?.uptime ?? '0d 0h 0m',
          memoryUsed: d?.memoryUsed ?? d?.usedMemory ?? 0,
          memoryMax: d?.memoryMax ?? d?.totalMemory ?? 16,
          hitRatio: d?.hitRatio ?? d?.cacheHitRate ?? 0,
          connectedClients: d?.connectedClients ?? d?.clients ?? 0,
          clientChange: d?.clientChange ?? 0,
          opsPerSecond: d?.opsPerSecond ?? d?.ops ?? 0,
          latencyMs: d?.latencyMs ?? d?.avgLatency ?? 0
        } as RedisStats;
      }),
      catchError(() => of({
        status: 'DOWN' as const,
        uptime: 'N/A',
        memoryUsed: 0,
        memoryMax: 16,
        hitRatio: 0,
        connectedClients: 0,
        clientChange: 0,
        opsPerSecond: 0,
        latencyMs: 0
      } as RedisStats))
    ).subscribe(stats => {
      this.stats.set(stats);
      this.isLoading.set(false);
    });
  }

  private loadSlowLogs(): void {
    const { date } = this.getAnalyticsDateParams();
    this.apiService.queryAnalyticsKey('performance', 'slow_query_log', { date }).pipe(
      map(res => {
        const items = res?.data ?? res ?? [];
        if (!Array.isArray(items)) return [];
        return items.map((log: any, i: number) => ({
          id: log.id ?? i + 1,
          timestamp: log.timestamp ?? '',
          command: log.command ?? log.query ?? '',
          duration: log.duration ?? log.durationMs ?? 0,
          clientIp: log.clientIp ?? log.ip ?? ''
        })) as SlowLogEntry[];
      }),
      catchError(() => of([] as SlowLogEntry[]))
    ).subscribe(logs => {
      this.slowLogs.set(logs);
    });
  }

  private loadReplicas(): void {
    this.replicas.set([
      { name: 'Master', role: 'master', ip: '10.0.1.5', zone: 'us-east-1a', status: 'healthy' },
      { name: 'Replica 01', role: 'replica', ip: '10.0.2.8', zone: 'us-east-1b', status: 'healthy', offset: 0 },
      { name: 'Replica 02', role: 'replica', ip: '10.0.3.12', zone: 'us-east-1c', status: 'syncing', syncProgress: 84 }
    ]);
  }

  private loadTTLDistribution(): void {
    this.ttlDistribution.set([
      { label: '< 1 Hour', count: 45201, percentage: 65, color: 'primary' },
      { label: '1 - 24 Hours', count: 128400, percentage: 40, color: 'info' },
      { label: '> 24 Hours', count: 30000, percentage: 15, color: 'secondary' },
      { label: 'No Expiry', count: 852110, percentage: 90, color: 'contrast' }
    ]);
  }

  private updateCharts(): void {
    const labels = ['10:00', '10:10', '10:20', '10:30', '10:40', '10:50', '11:00'];
    
    // Memory Usage Chart
    this.memoryChartData.set({
      labels,
      datasets: [
        {
          label: 'Memory (GB)',
          data: [13.8, 14.0, 14.1, 13.9, 14.2, 14.3, 14.2],
          borderColor: '#0d59f2',
          backgroundColor: 'rgba(13, 89, 242, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    });
    
    // Throughput vs Latency Chart
    this.throughputChartData.set({
      labels,
      datasets: [
        {
          type: 'bar',
          label: 'Ops/sec (k)',
          data: [22, 25, 23, 28, 24, 26, 25],
          backgroundColor: '#334155',
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'Latency (ms)',
          data: [0.9, 0.7, 0.8, 1.2, 0.8, 0.9, 0.8],
          borderColor: '#f59e0b',
          backgroundColor: 'transparent',
          yAxisID: 'y1',
          tension: 0.3
        }
      ]
    });
  }

  private startAutoRefresh(): void {
    this.refreshTimer = setInterval(() => {
      if (this.isLive()) {
        this.updateStats();
        // Randomly update charts occasionally
        if (Math.random() > 0.7) {
          this.updateCharts();
        }
      }
    }, this.refreshInterval());
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  toggleLive(): void {
    this.isLive.update(v => !v);
  }

  onRefreshIntervalChange(event: any): void {
    this.refreshInterval.set(event.value);
    this.stopAutoRefresh();
    this.startAutoRefresh();
  }

  manualRefresh(): void {
    this.updateStats();
    this.updateCharts();
  }

  getDurationSeverity(duration: number): 'success' | 'warn' | 'danger' {
    if (duration >= 100) return 'danger';
    if (duration >= 50) return 'warn';
    return 'success';
  }

  formatDuration(duration: number): string {
    return duration.toFixed(1) + ' ms';
  }

  formatNumber(num: number): string {
    return num.toLocaleString();
  }

  exportCsv(): void {
    const data = this.slowLogs();
    const csv = [
      ['Timestamp', 'Command', 'Duration (ms)', 'Client IP'],
      ...data.map(log => [log.timestamp, log.command, log.duration.toString(), log.clientIp])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'redis-slowlog.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  runDefrag(): void {
    // Simulate defrag action
    console.log('Running memory defragmentation...');
  }
}
