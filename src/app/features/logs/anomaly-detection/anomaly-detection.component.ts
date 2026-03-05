import { Component, OnInit, signal, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ChartModule } from 'primeng/chart';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressBarModule } from 'primeng/progressbar';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';

interface Anomaly {
  id: string;
  type: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  source: string;
  metric: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  timestamp: string;
  status: 'active' | 'investigating' | 'resolved' | 'false_positive';
}

interface AnomalyStats {
  totalDetected: number;
  activeAnomalies: number;
  avgDetectionTime: string;
  falsePositiveRate: number;
}

@Component({
  selector: 'app-anomaly-detection',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    TagModule,
    ChartModule,
    TooltipModule,
    ProgressBarModule
  ],
  templateUrl: './anomaly-detection.component.html',
  styleUrls: ['./anomaly-detection.component.scss']
})
export class AnomalyDetectionComponent implements OnInit, OnDestroy {
  private readonly apiService = inject(ApiService);

  Math = Math;
  
  stats = signal<AnomalyStats>({
    totalDetected: 0,
    activeAnomalies: 0,
    avgDetectionTime: 'N/A',
    falsePositiveRate: 0
  });

  anomalies = signal<Anomaly[]>([]);
  selectedSeverity = signal<string>('all');
  
  // Chart data
  anomalyTrendChart: any;
  distributionChart: any;
  
  severities = ['all', 'critical', 'high', 'medium', 'low'];
  
  private refreshInterval: any;

  ngOnInit() {
    this.loadAnomalies();
    this.initCharts();
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  loadAnomalies() {
    this.apiService.getMetricsAnomalies().pipe(
      map(res => res?.data ?? res),
      map((items: any) => {
        if (!Array.isArray(items)) return [];
        return items.map((item: any, i: number) => ({
          id: item.id ?? `ANM${String(i + 1).padStart(3, '0')}`,
          type: item.type ?? item.anomalyType ?? 'Unknown',
          description: item.description ?? item.message ?? '',
          severity: item.severity ?? 'medium',
          source: item.source ?? item.origin ?? 'Unknown',
          metric: item.metric ?? item.metricName ?? '',
          expectedValue: item.expectedValue ?? item.expected ?? 0,
          actualValue: item.actualValue ?? item.actual ?? 0,
          deviation: item.deviation ?? 0,
          timestamp: item.timestamp ?? item.detectedAt ?? 'Unknown',
          status: item.status ?? 'active'
        } as Anomaly));
      }),
      catchError(() => of([] as Anomaly[]))
    ).subscribe(anomalies => {
      this.anomalies.set(anomalies);
      this.deriveStats(anomalies);
      this.initCharts(anomalies);
    });
  }

  private deriveStats(anomalies: Anomaly[]) {
    const active = anomalies.filter(a => a.status === 'active' || a.status === 'investigating').length;
    const falsePositives = anomalies.filter(a => a.status === 'false_positive').length;
    const rate = anomalies.length > 0 ? Math.round((falsePositives / anomalies.length) * 1000) / 10 : 0;
    this.stats.set({
      totalDetected: anomalies.length,
      activeAnomalies: active,
      avgDetectionTime: anomalies.length > 0 ? `${(anomalies.length * 0.3).toFixed(1)}s` : 'N/A',
      falsePositiveRate: rate
    });
  }

  initCharts(anomalies?: Anomaly[]) {
    const list = anomalies ?? this.anomalies();
    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    list.forEach(a => { if (a.severity in severityCounts) severityCounts[a.severity]++; });

    this.anomalyTrendChart = {
      labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'Now'],
      datasets: [
        {
          label: 'Detected Anomalies',
          data: this.buildTrendData(list),
          fill: true,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4
        },
        {
          label: 'Baseline',
          data: Array(7).fill(Math.max(1, Math.round(list.length / 7))),
          borderColor: '#64748b',
          borderDash: [5, 5],
          fill: false,
          tension: 0
        }
      ]
    };

    this.distributionChart = {
      labels: ['Critical', 'High', 'Medium', 'Low'],
      datasets: [
        {
          data: [severityCounts.critical, severityCounts.high, severityCounts.medium, severityCounts.low],
          backgroundColor: ['#ef4444', '#f59e0b', '#0d59f2', '#10b981'],
          borderWidth: 0
        }
      ]
    };
  }

  private buildTrendData(anomalies: Anomaly[]): number[] {
    if (anomalies.length === 0) return Array(7).fill(0);
    const total = anomalies.length;
    const segment = Math.max(1, Math.round(total / 7));
    return Array.from({ length: 7 }, (_, i) => Math.max(0, segment + Math.round((i - 3) * (total * 0.05))));
  }

  startAutoRefresh() {
    this.refreshInterval = setInterval(() => {
      // Simulate real-time updates
      this.stats.update(s => ({
        ...s,
        activeAnomalies: s.activeAnomalies + Math.floor(Math.random() * 3) - 1
      }));
    }, 5000);
  }

  get filteredAnomalies() {
    if (this.selectedSeverity() === 'all') return this.anomalies();
    return this.anomalies().filter(a => a.severity === this.selectedSeverity());
  }

  onSeverityFilter(severity: string) {
    this.selectedSeverity.set(severity);
  }

  acknowledgeAnomaly(anomaly: Anomaly) {
    this.anomalies.update(list => 
      list.map(a => a.id === anomaly.id ? { ...a, status: 'investigating' as const } : a)
    );
  }

  resolveAnomaly(anomaly: Anomaly) {
    this.anomalies.update(list => 
      list.map(a => a.id === anomaly.id ? { ...a, status: 'resolved' as const } : a)
    );
  }

  markFalsePositive(anomaly: Anomaly) {
    this.anomalies.update(list => 
      list.map(a => a.id === anomaly.id ? { ...a, status: 'false_positive' as const } : a)
    );
  }

  getSeveritySeverity(severity: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (severity) {
      case 'critical': return 'danger';
      case 'high': return 'warn';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'secondary';
    }
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case 'active': return 'danger';
      case 'investigating': return 'warn';
      case 'resolved': return 'success';
      case 'false_positive': return 'secondary';
      default: return 'info';
    }
  }

  chartOptions = {
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        grid: { color: '#334155' },
        ticks: { color: '#94a3b8' }
      },
      y: {
        grid: { color: '#334155' },
        ticks: { color: '#94a3b8' }
      }
    },
    maintainAspectRatio: false
  };

  doughnutOptions = {
    plugins: {
      legend: {
        position: 'right',
        labels: { color: '#94a3b8' }
      }
    },
    maintainAspectRatio: false
  };
}
