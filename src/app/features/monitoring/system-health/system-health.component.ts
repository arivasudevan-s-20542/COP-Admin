import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ChartModule } from 'primeng/chart';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/api/api.service';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

interface KpiStat {
  label: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: string;
  progress?: number;
}

interface ClusterResource {
  name: string;
  type: string;
  location: string;
  status: 'healthy' | 'warning' | 'critical';
  cpuUsage: number;
  memoryUsage: number;
  icon: string;
}

interface EndpointStat {
  endpoint: string;
  avgLatency: string;
  p99Latency: string;
  p99Critical: boolean;
  status2xx: number;
  status4xx: number;
  status5xx: number;
}

interface LiveError {
  timestamp: string;
  level: 'fatal' | 'error' | 'warn';
  message: string;
}

@Component({
  selector: 'app-system-health',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    TableModule,
    ChartModule,
    TagModule,
    ProgressBarModule,
    ButtonModule,
    TooltipModule,
    FormsModule
  ],
  templateUrl: './system-health.component.html',
  styleUrl: './system-health.component.scss'
})
export class SystemHealthComponent implements OnInit, OnDestroy {
  private readonly apiService = inject(ApiService);

  // State signals
  clusterName = signal('US-East-1 Cluster Health');
  systemStatus = signal<'operational' | 'degraded' | 'down'>('operational');
  autoRefresh = signal(true);
  selectedTimeRange = signal('1h');

  // Time range options
  timeRangeOptions = [
    { label: 'Last 1h', value: '1h' },
    { label: 'Last 6h', value: '6h' },
    { label: 'Last 24h', value: '24h' },
    { label: 'Custom', value: 'custom' }
  ];

  // KPI Stats
  kpiStats = signal<KpiStat[]>([]);

  // Cluster resources
  clusterResources = signal<ClusterResource[]>([
    {
      name: 'Evaluation Workers',
      type: 'us-east-1a',
      location: 'AWS',
      status: 'healthy',
      cpuUsage: 78,
      memoryUsage: 42,
      icon: 'pi pi-microchip'
    },
    {
      name: 'Primary Database',
      type: 'Postgres Cluster',
      location: 'AWS',
      status: 'healthy',
      cpuUsage: 35,
      memoryUsage: 62,
      icon: 'pi pi-database'
    }
  ]);

  // Endpoint statistics
  endpoints = signal<EndpointStat[]>([]);

  // Live errors
  liveErrors = signal<LiveError[]>([]);

  // Chart data
  latencyChartData = signal<any>(null);
  latencyChartOptions = signal<any>(null);

  // Computed status label
  statusLabel = computed(() => {
    const status = this.systemStatus();
    switch (status) {
      case 'operational': return 'All Systems Operational';
      case 'degraded': return 'Performance Degraded';
      case 'down': return 'Service Outage';
    }
  });

  statusSeverity = computed(() => {
    const status = this.systemStatus();
    switch (status) {
      case 'operational': return 'success';
      case 'degraded': return 'warn';
      case 'down': return 'danger';
    }
  });

  private refreshInterval: any;
  private errorStreamInterval: any;

  ngOnInit(): void {
    this.loadKpiStats();
    this.loadEndpoints();
    this.loadLiveErrors();
    this.initCharts();
    this.startAutoRefresh();
    this.startErrorStream();
  }

  private loadKpiStats(): void {
    this.apiService.getMetricsDashboard().pipe(
      map(res => {
        const d = res?.data ?? res;
        return [
          {
            label: 'Total Throughput (RPS)',
            value: d?.throughput ?? d?.totalRps ?? '0',
            change: d?.throughputChange ?? '+0%',
            changeType: (d?.throughputChange ?? '').startsWith('-') ? 'negative' as const : 'positive' as const,
            icon: 'pi pi-server'
          },
          {
            label: 'Global Error Rate',
            value: d?.errorRate ?? '0%',
            change: d?.errorRateChange ?? '0%',
            changeType: 'positive' as const,
            icon: 'pi pi-exclamation-circle',
            progress: parseFloat(d?.errorRate ?? '0')
          },
          {
            label: 'Avg Execution Time',
            value: d?.avgResponseTime ?? d?.avgLatency ?? '0ms',
            change: d?.latencyChange ?? '+0ms',
            changeType: (d?.latencyChange ?? '').startsWith('+') ? 'negative' as const : 'positive' as const,
            icon: 'pi pi-clock'
          },
          {
            label: 'Active Websockets',
            value: d?.activeWebsockets ?? d?.activeSessions ?? '0',
            change: d?.websocketChange ?? '+0%',
            changeType: 'positive' as const,
            icon: 'pi pi-sitemap'
          }
        ] as KpiStat[];
      }),
      catchError(() => of([] as KpiStat[]))
    ).subscribe(stats => {
      if (stats.length > 0) this.kpiStats.set(stats);
    });
  }

  private loadEndpoints(): void {
    this.apiService.getMetricsHourlyVolume().pipe(
      map(res => {
        const items = res?.data ?? res ?? [];
        if (!Array.isArray(items)) return [];
        return items.map((ep: any) => ({
          endpoint: ep.endpoint ?? ep.path ?? '',
          avgLatency: ep.avgLatency ?? '0ms',
          p99Latency: ep.p99Latency ?? ep.p99 ?? '0ms',
          p99Critical: ep.p99Critical ?? (parseFloat(ep.p99Latency ?? '0') > 1000),
          status2xx: ep.status2xx ?? ep.successRate ?? 0,
          status4xx: ep.status4xx ?? 0,
          status5xx: ep.status5xx ?? 0
        })) as EndpointStat[];
      }),
      catchError(() => of([] as EndpointStat[]))
    ).subscribe(endpoints => {
      this.endpoints.set(endpoints);
    });
  }

  private loadLiveErrors(): void {
    this.apiService.getMetricsErrorsAnalysis().pipe(
      map(res => {
        const items = res?.data?.errors ?? res?.data ?? res ?? [];
        if (!Array.isArray(items)) return [];
        return items.slice(0, 5).map((e: any) => ({
          timestamp: e.timestamp ?? this.getCurrentTime(),
          level: e.level ?? e.severity ?? 'error',
          message: e.message ?? e.error ?? ''
        })) as LiveError[];
      }),
      catchError(() => of([] as LiveError[]))
    ).subscribe(errors => {
      this.liveErrors.set(errors);
    });
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
    this.stopErrorStream();
  }

  initCharts(): void {
    // Latency chart data
    this.latencyChartData.set({
      labels: ['10:00', '10:15', '10:30', '10:45', '11:00'],
      datasets: [
        {
          label: 'p50',
          data: [150, 148, 145, 142, 148],
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: false,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4
        },
        {
          label: 'p90',
          data: [420, 415, 410, 405, 420],
          borderColor: '#a855f7',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          tension: 0.4,
          fill: false,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4
        },
        {
          label: 'p99',
          data: [840, 750, 920, 680, 780],
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
          fill: true,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4
        }
      ]
    });

    this.latencyChartOptions.set({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: '#1a1d24',
          borderColor: '#282e39',
          borderWidth: 1,
          titleColor: '#9ca6ba',
          bodyColor: '#fff',
          padding: 12,
          callbacks: {
            label: (context: any) => `${context.dataset.label}: ${context.raw}ms`
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(40, 46, 57, 0.5)',
            drawBorder: false
          },
          ticks: {
            color: '#586174',
            font: { size: 10 }
          }
        },
        y: {
          min: 0,
          max: 1000,
          grid: {
            color: 'rgba(40, 46, 57, 0.5)',
            drawBorder: false
          },
          ticks: {
            color: '#586174',
            font: { size: 10 },
            callback: (value: number) => `${value}`
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    });
  }

  startAutoRefresh(): void {
    this.refreshInterval = setInterval(() => {
      if (this.autoRefresh()) {
        this.refreshStats();
      }
    }, 5000);
  }

  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  startErrorStream(): void {
    this.errorStreamInterval = setInterval(() => {
      this.loadLiveErrors();
    }, 8000);
  }

  stopErrorStream(): void {
    if (this.errorStreamInterval) {
      clearInterval(this.errorStreamInterval);
    }
  }

  toggleAutoRefresh(): void {
    this.autoRefresh.update(v => !v);
  }

  setTimeRange(range: string): void {
    this.selectedTimeRange.set(range);
    this.refreshStats();
  }

  refreshStats(): void {
    this.apiService.getMetricsCurrentHour().pipe(
      map(res => {
        const d = res?.data ?? res;
        if (!d) return null;
        return [
          {
            label: 'Total Throughput (RPS)',
            value: d?.throughput ?? d?.totalRps ?? '0',
            change: d?.throughputChange ?? '+0%',
            changeType: (d?.throughputChange ?? '').startsWith('-') ? 'negative' as const : 'positive' as const,
            icon: 'pi pi-server'
          },
          {
            label: 'Global Error Rate',
            value: d?.errorRate ?? '0%',
            change: d?.errorRateChange ?? '0%',
            changeType: 'positive' as const,
            icon: 'pi pi-exclamation-circle',
            progress: parseFloat(d?.errorRate ?? '0')
          },
          {
            label: 'Avg Execution Time',
            value: d?.avgResponseTime ?? d?.avgLatency ?? '0ms',
            change: d?.latencyChange ?? '+0ms',
            changeType: (d?.latencyChange ?? '').startsWith('+') ? 'negative' as const : 'positive' as const,
            icon: 'pi pi-clock'
          },
          {
            label: 'Active Websockets',
            value: d?.activeWebsockets ?? d?.activeSessions ?? '0',
            change: d?.websocketChange ?? '+0%',
            changeType: 'positive' as const,
            icon: 'pi pi-sitemap'
          }
        ] as KpiStat[];
      }),
      catchError(() => of(null))
    ).subscribe(stats => {
      if (stats) this.kpiStats.set(stats);
    });

    this.updateLatencyChart();
  }

  private simulateValue(current: string): string {
    if (current.includes('k')) {
      const num = parseFloat(current.replace('k', ''));
      const newNum = num + (Math.random() - 0.5) * 0.5;
      return `${newNum.toFixed(1)}k`;
    }
    if (current.includes('%')) {
      return current;
    }
    if (current.includes('ms')) {
      const num = parseInt(current.replace('ms', ''));
      const newNum = num + Math.floor((Math.random() - 0.5) * 20);
      return `${newNum}ms`;
    }
    if (current.includes(',')) {
      const num = parseInt(current.replace(',', ''));
      const newNum = num + Math.floor((Math.random() - 0.5) * 500);
      return newNum.toLocaleString();
    }
    return current;
  }

  private updateLatencyChart(): void {
    const data = this.latencyChartData();
    if (!data) return;

    const newData = {
      ...data,
      datasets: data.datasets.map((ds: any) => ({
        ...ds,
        data: ds.data.map((v: number) => Math.max(50, v + Math.floor((Math.random() - 0.5) * 50)))
      }))
    };
    this.latencyChartData.set(newData);
  }

  private addRandomError(): void {
    const errorTypes: LiveError[] = [
      { timestamp: this.getCurrentTime(), level: 'error', message: `Database connection pool exhausted on db-${Math.floor(Math.random() * 10)}` },
      { timestamp: this.getCurrentTime(), level: 'warn', message: `CPU spike detected on worker-${Math.floor(Math.random() * 20)}` },
      { timestamp: this.getCurrentTime(), level: 'fatal', message: `Redis cluster partition detected` },
      { timestamp: this.getCurrentTime(), level: 'error', message: `Failed to execute submission ID: ${Math.floor(Math.random() * 10000)}` },
      { timestamp: this.getCurrentTime(), level: 'warn', message: `Memory threshold exceeded on eval-pod-${Math.floor(Math.random() * 100)}` }
    ];

    const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    const errors = [randomError, ...this.liveErrors().slice(0, 4)];
    this.liveErrors.set(errors);
  }

  private getCurrentTime(): string {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }).slice(0, 8);
  }

  getResourceStatusSeverity(status: string): 'success' | 'warn' | 'danger' {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warn';
      case 'critical': return 'danger';
      default: return 'success';
    }
  }

  getErrorLevelClass(level: string): string {
    switch (level) {
      case 'fatal': return 'error-fatal';
      case 'error': return 'error-error';
      case 'warn': return 'error-warn';
      default: return '';
    }
  }

  getCpuBarClass(usage: number): string {
    if (usage >= 80) return 'usage-critical';
    if (usage >= 60) return 'usage-warning';
    return 'usage-normal';
  }

  viewAllEndpoints(): void {
    console.log('Navigating to all endpoints view');
  }
}
