import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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

interface JobStat {
  label: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: string;
  iconColor: string;
  progress: number;
  progressColor: string;
}

interface WorkerNode {
  id: string;
  nodeId: string;
  version: string;
  uptime: string;
  status: 'active' | 'high-load' | 'idle' | 'offline';
  cpuUsage: number;
}

interface RedisStats {
  hitRate: number;
  hitsPerSec: string;
  missesPerSec: string;
  memoryUsage: number;
  memoryUsed: string;
  evictionRate: number;
  avgLatency: string;
}

interface AnomalyEntry {
  timestamp: string;
  severity: 'critical' | 'warning' | 'info';
  service: string;
  message: string;
}

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    TableModule,
    ChartModule,
    TagModule,
    ProgressBarModule,
    ButtonModule,
    TooltipModule
  ],
  templateUrl: './jobs.component.html',
  styleUrl: './jobs.component.scss'
})
export class JobsComponent implements OnInit, OnDestroy {
  private readonly apiService = inject(ApiService);

  // State
  systemHealthy = signal(true);
  lastUpdated = signal('Just now');
  environment = signal('Production');
  region = signal('us-east-1');

  // Job Stats
  jobStats = signal<JobStat[]>([]);

  // Worker Nodes
  workers = signal<WorkerNode[]>([]);

  // Redis Stats
  redisStats = signal<RedisStats>({
    hitRate: 0,
    hitsPerSec: '0/s',
    missesPerSec: '0/s',
    memoryUsage: 0,
    memoryUsed: '0 GB',
    evictionRate: 0,
    avgLatency: '0ms'
  });

  // Latency spikes for chart
  latencySpikes = signal<number[]>([]);

  // Anomaly Feed
  anomalies = signal<AnomalyEntry[]>([]);

  // Filter
  selectedFilter = signal<'all' | 'critical' | 'warning' | 'info'>('all');

  // Computed
  newAnomaliesCount = computed(() => 
    this.anomalies().filter(a => a.severity === 'critical').length
  );

  filteredAnomalies = computed(() => {
    const filter = this.selectedFilter();
    if (filter === 'all') return this.anomalies();
    return this.anomalies().filter(a => a.severity === filter);
  });

  private refreshInterval: any;

  ngOnInit(): void {
    this.loadAllData();
    this.startRefresh();
  }

  private loadAllData(): void {
    this.loadJobStats();
    this.loadWorkers();
    this.loadRedisStats();
    this.loadAnomalies();
  }

  private loadJobStats(): void {
    this.apiService.getKafkaLagSummary().pipe(
      map(res => {
        const d = res?.data ?? res;
        return [
          {
            label: 'Running Jobs',
            value: (d?.running ?? d?.activeConsumers ?? 0).toLocaleString(),
            change: d?.runningChange ?? '+0%',
            changeType: 'positive' as const,
            icon: 'pi pi-microchip',
            iconColor: 'primary',
            progress: d?.runningProgress ?? 75,
            progressColor: 'primary'
          },
          {
            label: 'Queued Jobs',
            value: (d?.pending ?? d?.totalLag ?? 0).toLocaleString(),
            change: d?.pendingChange ?? '0%',
            changeType: 'neutral' as const,
            icon: 'pi pi-hourglass',
            iconColor: 'warning',
            progress: d?.pendingProgress ?? 5,
            progressColor: 'warning'
          },
          {
            label: 'Failed Jobs',
            value: (d?.failed ?? 0).toLocaleString(),
            change: d?.failedChange ?? '0%',
            changeType: 'negative' as const,
            icon: 'pi pi-times-circle',
            iconColor: 'danger',
            progress: d?.failedProgress ?? 0,
            progressColor: 'danger'
          }
        ] as JobStat[];
      }),
      catchError(() => of([] as JobStat[]))
    ).subscribe(stats => {
      if (stats.length > 0) this.jobStats.set(stats);
    });
  }

  private loadWorkers(): void {
    this.apiService.getKafkaHealth().pipe(
      map(res => {
        const d = res?.data ?? res;
        const nodes = d?.nodes ?? d?.brokers ?? d?.workers ?? [];
        if (!Array.isArray(nodes)) return [];
        return nodes.map((n: any, i: number) => ({
          id: String(i + 1),
          nodeId: n.nodeId ?? n.id ?? `worker-${i}`,
          version: n.version ?? '',
          uptime: n.uptime ?? '',
          status: n.status ?? 'active',
          cpuUsage: n.cpuUsage ?? n.cpu ?? 0
        })) as WorkerNode[];
      }),
      catchError(() => of([] as WorkerNode[]))
    ).subscribe(workers => {
      this.workers.set(workers);
    });
  }

  private loadRedisStats(): void {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const hour = `${date}_${pad(now.getHours())}`;
    this.apiService.queryAnalyticsFeatureSummary('performance', { hour, date }).pipe(
      map(res => {
        const d = res?.data ?? res;
        return {
          hitRate: d?.hitRate ?? d?.cacheHitRate ?? 0,
          hitsPerSec: d?.hitsPerSec ?? '0/s',
          missesPerSec: d?.missesPerSec ?? '0/s',
          memoryUsage: d?.memoryUsage ?? 0,
          memoryUsed: d?.memoryUsed ?? '0 GB',
          evictionRate: d?.evictionRate ?? 0,
          avgLatency: d?.avgLatency ?? '0ms'
        } as RedisStats;
      }),
      catchError(() => of({
        hitRate: 0, hitsPerSec: '0/s', missesPerSec: '0/s',
        memoryUsage: 0, memoryUsed: '0 GB', evictionRate: 0, avgLatency: '0ms'
      } as RedisStats))
    ).subscribe(stats => {
      this.redisStats.set(stats);
    });
  }

  private loadAnomalies(): void {
    this.apiService.getKafkaLagAlerts().pipe(
      map(res => {
        const items = res?.data ?? res ?? [];
        if (!Array.isArray(items)) return [];
        return items.map((a: any) => ({
          timestamp: a.timestamp ?? '',
          severity: a.severity ?? a.level ?? 'warning',
          service: a.service ?? a.topic ?? a.consumerGroup ?? '',
          message: a.message ?? a.description ?? ''
        })) as AnomalyEntry[];
      }),
      catchError(() => of([] as AnomalyEntry[]))
    ).subscribe(anomalies => {
      this.anomalies.set(anomalies);
    });
  }

  ngOnDestroy(): void {
    this.stopRefresh();
  }

  startRefresh(): void {
    this.refreshInterval = setInterval(() => {
      this.updateStats();
    }, 5000);
  }

  stopRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  updateStats(): void {
    this.loadJobStats();
    this.loadWorkers();
    this.lastUpdated.set('Just now');
  }

  refreshWorkers(): void {
    this.updateStats();
  }

  setFilter(filter: 'all' | 'critical' | 'warning' | 'info'): void {
    this.selectedFilter.set(filter);
  }

  getWorkerStatusSeverity(status: string): 'success' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'active': return 'success';
      case 'high-load': return 'warn';
      case 'idle': return 'secondary';
      case 'offline': return 'danger';
      default: return 'secondary';
    }
  }

  getWorkerStatusLabel(status: string): string {
    switch (status) {
      case 'active': return 'Active';
      case 'high-load': return 'High Load';
      case 'idle': return 'Idle';
      case 'offline': return 'Offline';
      default: return status;
    }
  }

  getCpuBarClass(usage: number): string {
    if (usage >= 80) return 'cpu-critical';
    if (usage >= 60) return 'cpu-warning';
    return 'cpu-normal';
  }

  getSeverityClass(severity: string): string {
    return `severity-${severity}`;
  }

  viewWorkerLogs(worker: WorkerNode): void {
    console.log('Viewing logs for:', worker.nodeId);
  }

  restartWorker(worker: WorkerNode): void {
    console.log('Restarting:', worker.nodeId);
  }

  terminateWorker(worker: WorkerNode): void {
    console.log('Terminating:', worker.nodeId);
  }

  traceAnomaly(anomaly: AnomalyEntry): void {
    console.log('Tracing anomaly:', anomaly);
  }

  viewAllNodes(): void {
    console.log('Viewing all nodes');
  }

  viewAllLogs(): void {
    console.log('Viewing all logs');
  }

  configure(): void {
    console.log('Opening configuration');
  }

  manageAlerts(): void {
    console.log('Managing alerts');
  }
}
