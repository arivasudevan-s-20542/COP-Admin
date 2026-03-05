import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';

interface AlertRule {
  id: string;
  name: string;
  description: string;
  category: 'system' | 'security' | 'performance' | 'business';
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  unit: string;
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
  channels: string[];
  lastTriggered: string | null;
  triggerCount: number;
}

interface RuleStats {
  totalRules: number;
  activeRules: number;
  triggeredToday: number;
  criticalAlerts: number;
}

@Component({
  selector: 'app-alert-rules',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    TagModule,
    InputTextModule,
    CheckboxModule,
    TooltipModule,
    DialogModule,
    InputNumberModule
  ],
  templateUrl: './alert-rules.component.html',
  styleUrls: ['./alert-rules.component.scss']
})
export class AlertRulesComponent implements OnInit {
  private readonly apiService = inject(ApiService);

  stats = signal<RuleStats>({
    totalRules: 0,
    activeRules: 0,
    triggeredToday: 0,
    criticalAlerts: 0
  });

  rules = signal<AlertRule[]>([]);
  selectedCategory = signal<string>('all');
  showRuleDialog = signal(false);
  editingRule = signal<AlertRule | null>(null);

  categories = ['all', 'system', 'security', 'performance', 'business'];

  ngOnInit() {
    this.loadRules();
  }

  loadRules() {
    this.apiService.getKafkaLagAlerts().pipe(
      map(res => res?.data ?? res),
      map((items: any) => {
        if (!Array.isArray(items)) return [];
        return items.map((item: any, i: number) => ({
          id: item.id ?? `ALR${String(i + 1).padStart(3, '0')}`,
          name: item.name ?? item.alertName ?? item.topic ?? 'Unnamed Rule',
          description: item.description ?? item.message ?? '',
          category: item.category ?? this.inferCategory(item),
          metric: item.metric ?? item.metricName ?? item.topic ?? '',
          condition: item.condition ?? 'gt',
          threshold: item.threshold ?? item.lagThreshold ?? 0,
          unit: item.unit ?? '',
          severity: item.severity ?? (item.lag > (item.lagThreshold ?? 1000) ? 'critical' : 'warning'),
          enabled: item.enabled ?? item.active ?? true,
          channels: item.channels ?? ['slack'],
          lastTriggered: item.lastTriggered ?? item.lastAlertTime ?? null,
          triggerCount: item.triggerCount ?? item.alertCount ?? 0
        } as AlertRule));
      }),
      catchError(() => of([] as AlertRule[]))
    ).subscribe(rules => {
      this.rules.set(rules);
      this.deriveStats(rules);
    });
  }

  private deriveStats(rules: AlertRule[]) {
    const active = rules.filter(r => r.enabled).length;
    const critical = rules.filter(r => r.severity === 'critical').length;
    const triggered = rules.filter(r => r.lastTriggered !== null).length;
    this.stats.set({
      totalRules: rules.length,
      activeRules: active,
      triggeredToday: triggered,
      criticalAlerts: critical
    });
  }

  private inferCategory(item: any): 'system' | 'security' | 'performance' | 'business' {
    const name = (item.name ?? item.topic ?? '').toLowerCase();
    if (name.includes('cpu') || name.includes('memory') || name.includes('disk')) return 'system';
    if (name.includes('auth') || name.includes('login') || name.includes('ssl')) return 'security';
    if (name.includes('latency') || name.includes('error') || name.includes('queue') || name.includes('lag')) return 'performance';
    return 'system';
  }

  get filteredRules() {
    if (this.selectedCategory() === 'all') return this.rules();
    return this.rules().filter(r => r.category === this.selectedCategory());
  }

  onCategoryFilter(category: string) {
    this.selectedCategory.set(category);
  }

  toggleRule(rule: AlertRule) {
    console.log('Toggle rule (no CRUD backend):', rule.id, !rule.enabled);
    this.rules.update(rules => rules.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r));
    this.deriveStats(this.rules());
  }

  editRule(rule: AlertRule) {
    this.editingRule.set({ ...rule });
    this.showRuleDialog.set(true);
  }

  deleteRule(rule: AlertRule) {
    console.log('Delete rule (no CRUD backend):', rule.id);
    this.rules.update(rules => rules.filter(r => r.id !== rule.id));
    this.deriveStats(this.rules());
  }

  addNewRule() {
    this.editingRule.set({
      id: '',
      name: '',
      description: '',
      category: 'system',
      metric: '',
      condition: 'gt',
      threshold: 0,
      unit: '',
      severity: 'warning',
      enabled: true,
      channels: [],
      lastTriggered: null,
      triggerCount: 0
    });
    this.showRuleDialog.set(true);
  }

  saveRule() {
    const rule = this.editingRule();
    console.log('Save rule (no CRUD backend):', rule);
    if (rule) {
      if (rule.id) {
        this.rules.update(rules => rules.map(r => r.id === rule.id ? { ...rule } : r));
      } else {
        const newRule = { ...rule, id: `ALR${String(this.rules().length + 1).padStart(3, '0')}` };
        this.rules.update(rules => [...rules, newRule]);
      }
      this.deriveStats(this.rules());
    }
    this.showRuleDialog.set(false);
  }

  getSeveritySeverity(severity: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (severity) {
      case 'critical': return 'danger';
      case 'warning': return 'warn';
      case 'info': return 'info';
      default: return 'secondary';
    }
  }

  getCategorySeverity(category: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (category) {
      case 'system': return 'info';
      case 'security': return 'danger';
      case 'performance': return 'warn';
      case 'business': return 'success';
      default: return 'secondary';
    }
  }

  getConditionLabel(condition: string): string {
    switch (condition) {
      case 'gt': return '>';
      case 'lt': return '<';
      case 'eq': return '=';
      case 'gte': return '≥';
      case 'lte': return '≤';
      default: return condition;
    }
  }
}
