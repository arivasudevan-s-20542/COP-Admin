import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { BadgeModule } from 'primeng/badge';

import { ApiService, DashboardStats, SystemMetrics, RecentActivity, ChartData } from '../../core/api/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CardModule,
    ChartModule,
    TableModule,
    TagModule,
    ButtonModule,
    ProgressBarModule,
    TooltipModule,
    SkeletonModule,
    BadgeModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private apiService = inject(ApiService);

  // Loading states
  isLoading = signal(true);
  statsLoading = signal(true);
  metricsLoading = signal(true);
  activityLoading = signal(true);
  chartsLoading = signal(true);

  // Data signals
  stats = signal<DashboardStats | null>(null);
  metrics = signal<SystemMetrics | null>(null);
  recentActivity = signal<RecentActivity[]>([]);
  submissionTrends = signal<ChartData | null>(null);
  problemDistribution = signal<ChartData | null>(null);
  userGrowth = signal<ChartData | null>(null);
  cacheStats = signal<any>(null);
  jobsStats = signal<any>(null);

  // Chart options
  lineChartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#94a3b8' }
      }
    },
    scales: {
      x: {
        ticks: { color: '#64748b' },
        grid: { color: '#1e293b' }
      },
      y: {
        ticks: { color: '#64748b' },
        grid: { color: '#1e293b' }
      }
    }
  };

  doughnutChartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#94a3b8', padding: 20 }
      }
    }
  };

  // Computed values
  systemHealthColor = computed(() => {
    const health = this.stats()?.systemHealth;
    switch (health) {
      case 'healthy': return 'success';
      case 'warning': return 'warn';
      case 'critical': return 'danger';
      default: return 'info';
    }
  });

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading.set(true);

    // Load stats
    this.apiService.getDashboardStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.statsLoading.set(false);
      },
      error: () => this.statsLoading.set(false)
    });

    // Load metrics
    this.apiService.getSystemMetrics().subscribe({
      next: (data) => {
        this.metrics.set(data);
        this.metricsLoading.set(false);
      },
      error: () => this.metricsLoading.set(false)
    });

    // Load recent activity
    this.apiService.getRecentActivity().subscribe({
      next: (data) => {
        this.recentActivity.set(data);
        this.activityLoading.set(false);
      },
      error: () => this.activityLoading.set(false)
    });

    // Load charts
    this.apiService.getSubmissionTrends().subscribe({
      next: (data) => this.submissionTrends.set(data)
    });

    this.apiService.getProblemDistribution().subscribe({
      next: (data) => this.problemDistribution.set(data)
    });

    this.apiService.getUserGrowth().subscribe({
      next: (data) => {
        this.userGrowth.set(data);
        this.chartsLoading.set(false);
      }
    });

    // Load cache stats
    this.apiService.getCacheStats().subscribe({
      next: (data) => this.cacheStats.set(data)
    });

    // Load jobs stats
    this.apiService.getJobsStats().subscribe({
      next: (data) => {
        this.jobsStats.set(data);
        this.isLoading.set(false);
      }
    });
  }

  refreshData(): void {
    this.loadDashboardData();
  }

  getActivityIcon(type: string): string {
    const icons: Record<string, string> = {
      submission: 'pi pi-code',
      user: 'pi pi-user',
      problem: 'pi pi-book',
      contest: 'pi pi-trophy',
      alert: 'pi pi-exclamation-triangle'
    };
    return icons[type] || 'pi pi-info-circle';
  }

  getActivitySeverity(severity?: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    const severities: Record<string, 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'> = {
      success: 'success',
      info: 'info',
      warning: 'warn',
      error: 'danger'
    };
    return severities[severity || 'info'] || 'info';
  }

  formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    return Math.floor(seconds / 86400) + 'd ago';
  }
}
