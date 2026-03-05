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
import { InputNumberModule } from 'primeng/inputnumber';
import { ApiService } from '../../../core/api/api.service';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

interface NetworkStat {
  label: string;
  value: string;
  trend: { value: string; direction: 'up' | 'down'; positive: boolean };
  progress: number;
  progressColor: string;
  icon: string;
  iconColor: string;
}

interface AnomalousIP {
  ip: string;
  userAgent: string;
  velocity: string;
  riskScore: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
}

interface AttackOrigin {
  country: string;
  code: string;
  attacks: number;
}

@Component({
  selector: 'app-network',
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
    TooltipModule,
    InputNumberModule
  ],
  templateUrl: './network.component.html',
  styleUrl: './network.component.scss'
})
export class NetworkComponent implements OnInit, OnDestroy {
  private readonly apiService = inject(ApiService);
  private refreshInterval: any;

  // System status
  systemStatus = signal<'nominal' | 'degraded' | 'critical'>('nominal');

  // Stats
  stats = signal<NetworkStat[]>([]);

  // Traffic chart
  trafficChartData = signal<any>(null);
  trafficChartOptions = signal<any>(null);

  // Anomalous IPs
  anomalousIPs = signal<AnomalousIP[]>([]);

  // Attack origins
  attackOrigins = signal<AttackOrigin[]>([]);

  // Rate limit config
  freeTierLimit = signal(60);
  premiumTierLimit = signal(600);
  globalBurstCap = signal(1000);

  ngOnInit() {
    this.loadInterceptorData();
    this.loadAttackOrigins();
    this.initCharts();
    this.startDataRefresh();
  }

  private loadInterceptorData(): void {
    this.apiService.getInterceptorStatus().pipe(
      map(res => {
        const d = res?.data ?? res;
        const statsArr: NetworkStat[] = [
          {
            label: 'Total Req/s',
            value: d?.totalRequestsPerSec ?? d?.rps ?? '0',
            trend: { value: d?.rpsChange ?? '0%', direction: (d?.rpsChange ?? '').startsWith('-') ? 'down' as const : 'up' as const, positive: true },
            progress: d?.rpsProgress ?? 0,
            progressColor: 'bg-primary',
            icon: 'pi pi-chart-line',
            iconColor: 'text-primary'
          },
          {
            label: 'Active Connections',
            value: (d?.activeConnections ?? 0).toLocaleString(),
            trend: { value: d?.connectionsChange ?? '0%', direction: 'up' as const, positive: true },
            progress: d?.connectionsProgress ?? 0,
            progressColor: 'bg-blue-500',
            icon: 'pi pi-sitemap',
            iconColor: 'text-blue-400'
          },
          {
            label: 'Error Rate (5xx)',
            value: d?.errorRate ?? '0%',
            trend: { value: d?.errorRateChange ?? '0%', direction: 'down' as const, positive: true },
            progress: parseFloat(d?.errorRate ?? '0'),
            progressColor: 'bg-orange-500',
            icon: 'pi pi-exclamation-triangle',
            iconColor: 'text-orange-500'
          },
          {
            label: 'WAF Blocks/min',
            value: d?.blockedPerMin ?? d?.wafBlocks ?? '0',
            trend: { value: d?.blockedChange ?? '0%', direction: 'up' as const, positive: false },
            progress: d?.blockedProgress ?? 0,
            progressColor: 'bg-red-500',
            icon: 'pi pi-shield',
            iconColor: 'text-red-500'
          }
        ];
        this.stats.set(statsArr);

        const ips = d?.anomalousIPs ?? d?.suspiciousIPs ?? d?.flaggedIPs ?? [];
        if (Array.isArray(ips)) {
          this.anomalousIPs.set(ips.map((ip: any) => ({
            ip: ip.ip ?? ip.address ?? '',
            userAgent: ip.userAgent ?? '',
            velocity: ip.velocity ?? ip.requestRate ?? '0 r/s',
            riskScore: ip.riskScore ?? ip.score ?? 0,
            riskLevel: ip.riskLevel ?? ip.risk ?? 'low'
          })));
        }
      }),
      catchError(() => of(undefined))
    ).subscribe();
  }

  private loadAttackOrigins(): void {
    this.apiService.getInterceptorPolicies().pipe(
      map(res => {
        const d = res?.data ?? res;
        const origins = d?.attackOrigins ?? d?.blockedCountries ?? d?.geoBlocks ?? [];
        if (!Array.isArray(origins)) return [];
        return origins.map((o: any) => ({
          country: o.country ?? '',
          code: o.code ?? o.countryCode ?? '',
          attacks: o.attacks ?? o.count ?? 0
        })) as AttackOrigin[];
      }),
      catchError(() => of([] as AttackOrigin[]))
    ).subscribe(origins => {
      this.attackOrigins.set(origins);
    });
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  private initCharts() {
    this.trafficChartData.set({
      labels: ['14:00', '14:10', '14:20', '14:30', '14:40', '14:50'],
      datasets: [{
        data: [30, 45, 35, 50, 60, 55, 70, 80, 65, 75, 90, 85, 70, 60, 65],
        backgroundColor: 'rgba(13, 89, 242, 0.3)',
        hoverBackgroundColor: 'rgba(13, 89, 242, 0.5)',
        borderRadius: 2
      }]
    });

    this.trafficChartOptions.set({
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: { color: '#64748b' },
          grid: { color: '#1e293b' }
        },
        y: {
          ticks: { color: '#64748b', callback: (v: number) => v + 'k' },
          grid: { color: '#1e293b' }
        }
      }
    });
  }

  private startDataRefresh() {
    this.refreshInterval = setInterval(() => {
      this.simulateDataUpdate();
    }, 3000);
  }

  private simulateDataUpdate() {
    this.loadInterceptorData();
  }

  getRiskSeverity(level: string): 'danger' | 'warn' | 'info' | 'secondary' {
    switch (level) {
      case 'critical': return 'danger';
      case 'high': return 'warn';
      case 'medium': return 'info';
      default: return 'secondary';
    }
  }

  getRiskColor(level: string): string {
    switch (level) {
      case 'critical': return 'bg-red-400/10 text-red-400 border-red-400/20';
      case 'high': return 'bg-orange-400/10 text-orange-400 border-orange-400/20';
      case 'medium': return 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20';
      default: return 'bg-slate-400/10 text-slate-400 border-slate-400/20';
    }
  }

  throttleIP(ip: string) {
    console.log('Throttling IP:', ip);
  }

  blockIP(ip: string) {
    console.log('Blocking IP:', ip);
  }

  applyRateLimits() {
    console.log('Applying rate limits:', {
      freeTier: this.freeTierLimit(),
      premiumTier: this.premiumTierLimit(),
      globalBurst: this.globalBurstCap()
    });
  }

  resetRateLimits() {
    this.freeTierLimit.set(60);
    this.premiumTierLimit.set(600);
    this.globalBurstCap.set(1000);
  }
}
