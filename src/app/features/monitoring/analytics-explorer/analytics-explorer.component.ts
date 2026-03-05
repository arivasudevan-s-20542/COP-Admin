import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ChartModule } from 'primeng/chart';
import { TabsModule } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { ProgressBarModule } from 'primeng/progressbar';
import { DialogModule } from 'primeng/dialog';
import { BadgeModule } from 'primeng/badge';
import { ApiService } from '../../../core/api/api.service';
import { catchError, map, forkJoin } from 'rxjs';
import { of } from 'rxjs';

interface KeyDefinition {
  feature: string;
  name: string;
  pattern: string;
  type: 'counter' | 'set' | 'sorted_set' | 'hash' | 'list' | 'value';
  ttlDays: number;
  ttlSeconds: number;
  description: string;
}

interface FeatureInfo {
  name: string;
  keyCount: number;
  keys: string[];
  description?: string;
}

interface KeyQueryResult {
  keyName: string;
  resolvedKey: string;
  type: string;
  value: any;
  description: string;
}

interface TimeSeriesPoint {
  date: string;
  value: number;
}

@Component({
  selector: 'app-analytics-explorer',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CardModule, ButtonModule, TableModule, TagModule,
    SelectModule, InputTextModule, ChartModule, TabsModule, TooltipModule,
    SkeletonModule, ProgressBarModule, DialogModule, BadgeModule
  ],
  templateUrl: './analytics-explorer.component.html',
  styleUrl: './analytics-explorer.component.scss'
})
export class AnalyticsExplorerComponent implements OnInit {
  private apiService = inject(ApiService);

  loading = signal(true);
  features = signal<FeatureInfo[]>([]);
  selectedFeature = signal<string>('');
  featureKeys = signal<KeyDefinition[]>([]);
  keysLoading = signal(false);
  summaryData = signal<Record<string, any>>({});
  summaryLoading = signal(false);
  searchQuery = signal('');
  searchResults = signal<KeyDefinition[]>([]);

  // Key detail drill-down
  selectedKey = signal<KeyDefinition | null>(null);
  keyDetailVisible = signal(false);
  keyDetailLoading = signal(false);
  keyDetailResult = signal<KeyQueryResult | null>(null);
  variableInputs = signal<Record<string, string>>({});

  // Time-series chart for counters
  timeSeriesData = signal<any>(null);
  timeSeriesLoading = signal(false);

  // Summary chart for current feature
  featureSummaryChart = signal<any>(null);

  // Registry stats
  totalFeatures = signal(0);
  totalKeys = signal(0);

  chartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#9ca6ba' } }
    },
    scales: {
      x: { ticks: { color: '#586174' }, grid: { color: '#282e39' } },
      y: { ticks: { color: '#586174' }, grid: { color: '#282e39' } }
    }
  };

  doughnutOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { color: '#9ca6ba', padding: 16 } }
    }
  };

  barOptions = {
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: { ticks: { color: '#586174' }, grid: { color: '#282e39' } },
      y: { ticks: { color: '#9ca6ba' }, grid: { display: false } }
    }
  };

  typeColors: Record<string, string> = {
    counter: '#3b82f6',
    set: '#10b981',
    sorted_set: '#a855f7',
    hash: '#f59e0b',
    list: '#ef4444',
    value: '#6366f1'
  };

  filteredKeys = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const keys = this.featureKeys();
    if (!q) return keys;
    return keys.filter(k =>
      k.name.toLowerCase().includes(q) ||
      k.description?.toLowerCase().includes(q) ||
      k.pattern.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.loadRegistry();
  }

  loadRegistry(): void {
    this.loading.set(true);
    this.apiService.getAnalyticsFeatures().pipe(
      map(res => res?.data ?? res),
      catchError(() => of({ features: {}, totalFeatures: 0, totalKeys: 0 }))
    ).subscribe(data => {
      const featuresMap = data.features ?? data;
      this.totalFeatures.set(data.totalFeatures ?? Object.keys(featuresMap).length);
      this.totalKeys.set(data.totalKeys ?? 0);

      const featureList: FeatureInfo[] = Object.entries(featuresMap).map(([name, keys]: [string, any]) => ({
        name,
        keyCount: Array.isArray(keys) ? keys.length : 0,
        keys: Array.isArray(keys) ? keys : []
      }));

      this.features.set(featureList);
      this.loading.set(false);

      this.buildRegistryOverviewChart(featureList);

      if (featureList.length > 0) {
        this.selectFeature(featureList[0].name);
      }
    });
  }

  selectFeature(feature: string): void {
    this.selectedFeature.set(feature);
    this.keysLoading.set(true);
    this.summaryLoading.set(true);

    this.apiService.get<any>(`/zcop/api/analytics/registry/features/${feature}/keys`).pipe(
      map(res => (res?.keys ?? []) as KeyDefinition[]),
      catchError(() => of([]))
    ).subscribe(keys => {
      this.featureKeys.set(keys);
      this.keysLoading.set(false);
      this.buildKeyTypeChart(keys);
    });

    const vars = this.getAutoVariables();
    this.apiService.queryAnalyticsFeatureSummary(feature, vars).pipe(
      map(res => res?.data ?? {}),
      catchError(() => of({}))
    ).subscribe(summary => {
      this.summaryData.set(summary);
      this.summaryLoading.set(false);
      this.buildSummaryBarChart(summary);
    });
  }

  openKeyDetail(key: KeyDefinition): void {
    this.selectedKey.set(key);
    this.keyDetailVisible.set(true);
    this.keyDetailResult.set(null);
    this.timeSeriesData.set(null);

    const requiredVars = this.extractVariables(key.pattern);
    const autoVars = this.getAutoVariables();
    const inputs: Record<string, string> = {};
    requiredVars.forEach(v => { inputs[v] = autoVars[v] ?? ''; });
    this.variableInputs.set(inputs);

    if (requiredVars.every(v => !!inputs[v])) {
      this.queryKey(key);
    }
  }

  queryKey(key?: KeyDefinition): void {
    const k = key ?? this.selectedKey();
    if (!k) return;

    this.keyDetailLoading.set(true);
    const vars = this.variableInputs();

    this.apiService.queryAnalyticsKey(k.feature, k.name, vars).pipe(
      map(res => res?.data ?? res),
      catchError(() => of(null))
    ).subscribe(result => {
      if (result) {
        this.keyDetailResult.set({
          keyName: result.keyName ?? k.name,
          resolvedKey: result.resolvedKey ?? '',
          type: result.type ?? k.type,
          value: result.value,
          description: result.description ?? k.description
        });
      }
      this.keyDetailLoading.set(false);
    });

    if (k.type === 'counter' && this.hasDateVariable(k.pattern)) {
      this.loadTimeSeries(k);
    }
  }

  loadTimeSeries(key: KeyDefinition, days = 7): void {
    this.timeSeriesLoading.set(true);
    const requests: Record<string, any> = {};

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const vars = { ...this.variableInputs(), date: dateStr };
      requests[dateStr] = this.apiService.queryAnalyticsKey(key.feature, key.name, vars).pipe(
        map(res => {
          const val = res?.value ?? res?.data?.value ?? 0;
          return typeof val === 'number' ? val : ((val?.size ?? parseInt(val, 10)) || 0);
        }),
        catchError(() => of(0))
      );
    }

    forkJoin(requests).subscribe((results: Record<string, unknown>) => {
      const typedResults = results as Record<string, number>;
      const labels = Object.keys(typedResults);
      const data = Object.values(typedResults);
      this.timeSeriesData.set({
        labels: labels.map(d => { const p = d.split('-'); return `${p[1]}/${p[2]}`; }),
        datasets: [{
          label: key.name.replace(/_/g, ' '),
          data,
          borderColor: this.typeColors[key.type] ?? '#3b82f6',
          backgroundColor: (this.typeColors[key.type] ?? '#3b82f6') + '22',
          fill: true,
          tension: 0.4
        }]
      });
      this.timeSeriesLoading.set(false);
    });
  }

  reloadRegistry(): void {
    this.apiService.post('/zcop/api/analytics/registry/reload').pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      this.loadRegistry();
    });
  }

  globalSearch(): void {
    const q = this.searchQuery();
    if (!q || q.length < 2) return;

    this.apiService.get<any>(`/zcop/api/analytics/registry/keys/search`, { params: { q } }).pipe(
      map(res => (res?.keys ?? []) as KeyDefinition[]),
      catchError(() => of([]))
    ).subscribe(results => {
      this.searchResults.set(results);
    });
  }

  // --- Chart builders ---

  private buildRegistryOverviewChart(features: FeatureInfo[]): void {
    // built in template as needed
  }

  private buildKeyTypeChart(keys: KeyDefinition[]): void {
    const typeCounts: Record<string, number> = {};
    keys.forEach(k => { typeCounts[k.type] = (typeCounts[k.type] ?? 0) + 1; });

    this.featureSummaryChart.set({
      labels: Object.keys(typeCounts),
      datasets: [{
        data: Object.values(typeCounts),
        backgroundColor: Object.keys(typeCounts).map(t => this.typeColors[t] ?? '#64748b')
      }]
    });
  }

  private buildSummaryBarChart(summary: Record<string, any>): void {
    const entries = Object.entries(summary).filter(([, v]) => typeof v === 'number').slice(0, 15);
    if (entries.length === 0) return;

    this.featureSummaryChart.set({
      labels: entries.map(([k]) => k.replace(/_/g, ' ').substring(0, 30)),
      datasets: [{
        label: 'Value',
        data: entries.map(([, v]) => v),
        backgroundColor: '#3b82f6',
        borderRadius: 4
      }]
    });
  }

  // --- Helpers ---

  extractVariables(pattern: string): string[] {
    const matches = pattern.match(/\{(\w+)\}/g);
    return matches ? matches.map(m => m.slice(1, -1)) : [];
  }

  private hasDateVariable(pattern: string): boolean {
    return pattern.includes('{date}');
  }

  getAutoVariables(): Record<string, string> {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const hour = `${date}_${pad(now.getHours())}`;
    const jan4 = new Date(now.getFullYear(), 0, 4);
    const weekNum = Math.ceil(((now.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);
    const yearWeek = `${now.getFullYear()}-W${pad(weekNum)}`;
    const yearMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    return { date, hour, yearWeek, yearMonth, month: yearMonth };
  }

  getTypeSeverity(type: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const map: Record<string, any> = {
      counter: 'info', set: 'success', sorted_set: 'contrast',
      hash: 'warn', list: 'danger', value: 'secondary'
    };
    return map[type] ?? 'secondary';
  }

  formatValue(value: any, type: string): string {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') {
      return value >= 1000000 ? (value / 1000000).toFixed(1) + 'M' :
             value >= 1000 ? (value / 1000).toFixed(1) + 'K' : value.toLocaleString();
    }
    if (typeof value === 'object') {
      if (value.size !== undefined) return `${value.size} members`;
      if (value.length !== undefined) return `${value.length} items`;
      if (value.fieldCount !== undefined) return `${value.fieldCount} fields`;
    }
    return String(value);
  }

  getVariableKeys(): string[] {
    return Object.keys(this.variableInputs());
  }

  updateVariableInput(varName: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.variableInputs.update(v => ({ ...v, [varName]: value }));
  }

  getSummaryEntries(): [string, any][] {
    return Object.entries(this.summaryData());
  }

  getTop50Entries(): [string, number][] {
    const result = this.keyDetailResult();
    if (!result?.value?.top50) return [];
    return Object.entries(result.value.top50) as [string, number][];
  }

  getHashFields(): [string, any][] {
    const result = this.keyDetailResult();
    if (!result?.value?.fields) return [];
    return Object.entries(result.value.fields);
  }

  getFeatureIcon(feature: string): string {
    const icons: Record<string, string> = {
      user: 'pi-users',
      problem: 'pi-code',
      system: 'pi-server',
      engagement: 'pi-heart',
      performance: 'pi-gauge',
      kafka: 'pi-bolt',
      internal: 'pi-cog',
      ranking: 'pi-trophy'
    };
    return icons[feature] ?? 'pi-chart-bar';
  }
}
