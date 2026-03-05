import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../../core/api/api.service';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'warning' | 'info' | 'success';
  source: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

interface NotificationStats {
  total: number;
  unread: number;
  critical: number;
  today: number;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    BadgeModule
  ],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit {
  private readonly apiService = inject(ApiService);

  stats = signal<NotificationStats>({
    total: 0,
    unread: 0,
    critical: 0,
    today: 0
  });

  notifications = signal<Notification[]>([]);
  selectedFilter = signal<string>('all');
  
  filters = [
    { label: 'All', value: 'all', count: 0 },
    { label: 'Unread', value: 'unread', count: 0 },
    { label: 'Alerts', value: 'alert', count: 0 },
    { label: 'Warnings', value: 'warning', count: 0 },
    { label: 'Info', value: 'info', count: 0 }
  ];

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications() {
    forkJoin({
      kafkaAlerts: this.apiService.getKafkaLagAlerts().pipe(
        map(res => res?.data ?? res),
        catchError(() => of([]))
      ),
      anomalies: this.apiService.getMetricsAnomalies().pipe(
        map(res => res?.data ?? res),
        catchError(() => of([]))
      )
    }).subscribe(({ kafkaAlerts, anomalies }) => {
      const notifications: Notification[] = [];
      let idx = 0;

      const kafkaList = Array.isArray(kafkaAlerts) ? kafkaAlerts : [];
      kafkaList.forEach((item: any) => {
        idx++;
        notifications.push({
          id: item.id ?? `N${String(idx).padStart(3, '0')}`,
          title: item.name ?? item.alertName ?? item.topic ?? 'Kafka Alert',
          message: item.description ?? item.message ?? `Lag: ${item.lag ?? 'unknown'}`,
          type: this.mapSeverityToType(item.severity),
          source: item.source ?? 'Kafka Monitor',
          timestamp: item.timestamp ?? item.lastAlertTime ?? 'Unknown',
          read: item.read ?? false,
          metadata: item.metadata ?? (item.lag != null ? { lag: item.lag, topic: item.topic } : undefined)
        });
      });

      const anomalyList = Array.isArray(anomalies) ? anomalies : [];
      anomalyList.forEach((item: any) => {
        idx++;
        notifications.push({
          id: item.id ?? `N${String(idx).padStart(3, '0')}`,
          title: item.type ?? item.anomalyType ?? 'Anomaly Detected',
          message: item.description ?? item.message ?? '',
          type: this.mapSeverityToType(item.severity),
          source: item.source ?? item.origin ?? 'Anomaly Detection',
          timestamp: item.timestamp ?? item.detectedAt ?? 'Unknown',
          read: item.read ?? false,
          metadata: item.metadata
        });
      });

      this.notifications.set(notifications);
      this.deriveStats(notifications);
      this.updateFilterCounts(notifications);
    });
  }

  private mapSeverityToType(severity: string | undefined): 'alert' | 'warning' | 'info' | 'success' {
    switch (severity) {
      case 'critical': return 'alert';
      case 'high': return 'alert';
      case 'warning': case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'info';
    }
  }

  private deriveStats(notifications: Notification[]) {
    const unread = notifications.filter(n => !n.read).length;
    const critical = notifications.filter(n => n.type === 'alert').length;
    this.stats.set({
      total: notifications.length,
      unread,
      critical,
      today: notifications.length
    });
  }

  private updateFilterCounts(notifications: Notification[]) {
    this.filters = [
      { label: 'All', value: 'all', count: notifications.length },
      { label: 'Unread', value: 'unread', count: notifications.filter(n => !n.read).length },
      { label: 'Alerts', value: 'alert', count: notifications.filter(n => n.type === 'alert').length },
      { label: 'Warnings', value: 'warning', count: notifications.filter(n => n.type === 'warning').length },
      { label: 'Info', value: 'info', count: notifications.filter(n => n.type === 'info').length }
    ];
  }

  get filteredNotifications() {
    const filter = this.selectedFilter();
    if (filter === 'all') return this.notifications();
    if (filter === 'unread') return this.notifications().filter(n => !n.read);
    return this.notifications().filter(n => n.type === filter);
  }

  selectFilter(value: string) {
    this.selectedFilter.set(value);
  }

  markAsRead(notification: Notification) {
    this.notifications.update(list => 
      list.map(n => n.id === notification.id ? { ...n, read: true } : n)
    );
    this.stats.update(s => ({ ...s, unread: s.unread - 1 }));
  }

  markAllAsRead() {
    this.notifications.update(list => list.map(n => ({ ...n, read: true })));
    this.stats.update(s => ({ ...s, unread: 0 }));
  }

  deleteNotification(notification: Notification) {
    this.notifications.update(list => list.filter(n => n.id !== notification.id));
    this.stats.update(s => ({ 
      ...s, 
      total: s.total - 1,
      unread: notification.read ? s.unread : s.unread - 1
    }));
  }

  clearAll() {
    this.notifications.set([]);
    this.stats.set({ total: 0, unread: 0, critical: 0, today: 0 });
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'alert': return 'pi pi-exclamation-triangle';
      case 'warning': return 'pi pi-exclamation-circle';
      case 'success': return 'pi pi-check-circle';
      case 'info': return 'pi pi-info-circle';
      default: return 'pi pi-bell';
    }
  }

  getTypeSeverity(type: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (type) {
      case 'alert': return 'danger';
      case 'warning': return 'warn';
      case 'success': return 'success';
      case 'info': return 'info';
      default: return 'secondary';
    }
  }
}
