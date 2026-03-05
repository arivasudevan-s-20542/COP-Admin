import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, map } from 'rxjs/operators';
import { of, forkJoin } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';

// PrimeNG
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { MenuModule } from 'primeng/menu';
import { ProgressBarModule } from 'primeng/progressbar';

interface ProblemStat {
  label: string;
  value: string;
  trend: { value: string; positive: boolean };
}

interface SubmissionOutcome {
  label: string;
  percentage: number;
  color: string;
}

interface Problem {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  volume24h: number;
  volumeDisplay: string;
  acceptance: number;
  sparklineData: number[];
}

@Component({
  selector: 'app-problems',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TableModule,
    TagModule,
    ButtonModule,
    InputTextModule,
    TooltipModule,
    MenuModule,
    ProgressBarModule
  ],
  templateUrl: './problems.component.html',
  styleUrl: './problems.component.scss'
})
export class ProblemsComponent implements OnInit {
  private apiService = inject(ApiService);

  // Stats
  stats = signal<ProblemStat[]>([]);

  // Submission outcomes
  submissionOutcomes = signal<SubmissionOutcome[]>([]);

  // Execution time distribution
  executionTimeBuckets = signal<{ range: string; percentage: number }[]>([]);

  avgExecutionTime = signal(0);

  // Problems list
  problems = signal<Problem[]>([]);

  // Filters
  searchQuery = '';
  selectedDifficulty = '';
  selectedLanguage = '';

  difficulties = ['All Difficulties', 'Easy', 'Medium', 'Hard'];
  languages = ['All Languages', 'Python', 'C++', 'Java', 'JavaScript'];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    forkJoin({
      stats: this.apiService.getProblemStats().pipe(
        map(res => {
          const d = res?.data ?? res;
          return [
            { label: 'Total Submissions (24h)', value: d?.totalSubmissions24h ?? '0', trend: { value: d?.submissionsTrend ?? '+0%', positive: (d?.submissionsTrend ?? '').startsWith('+') } },
            { label: 'Avg. Acceptance Rate', value: d?.avgAcceptanceRate ?? '0%', trend: { value: d?.acceptanceTrend ?? '+0%', positive: (d?.acceptanceTrend ?? '').startsWith('+') } },
            { label: '95th %ile Runtime', value: d?.p95Runtime ?? '0ms', trend: { value: d?.runtimeTrend ?? '0ms', positive: (d?.runtimeTrend ?? '').startsWith('-') } }
          ] as ProblemStat[];
        }),
        catchError(() => of([] as ProblemStat[]))
      ),
      outcomes: this.apiService.getProblemStats().pipe(
        map(res => {
          const d = res?.data ?? res;
          const outcomes = d?.submissionOutcomes;
          if (Array.isArray(outcomes)) {
            return outcomes.map((o: any) => ({
              label: o.label ?? '',
              percentage: o.percentage ?? 0,
              color: o.color ?? 'bg-gray-500'
            })) as SubmissionOutcome[];
          }
          return [] as SubmissionOutcome[];
        }),
        catchError(() => of([] as SubmissionOutcome[]))
      ),
      problems: this.apiService.getProblems().pipe(
        map(res => {
          const items = res?.data?.problems ?? res?.data ?? res ?? [];
          if (!Array.isArray(items)) return [] as Problem[];
          return items.map((p: any) => ({
            id: p.id ?? 0,
            title: p.title ?? '',
            difficulty: p.difficulty ?? 'Easy',
            volume24h: p.volume24h ?? p.submissions24h ?? 0,
            volumeDisplay: p.volumeDisplay ?? this.formatVolume(p.volume24h ?? p.submissions24h ?? 0),
            acceptance: p.acceptance ?? p.acceptanceRate ?? 0,
            sparklineData: p.sparklineData ?? []
          })) as Problem[];
        }),
        catchError(() => of([] as Problem[]))
      )
    }).subscribe(({ stats, outcomes, problems }) => {
      this.stats.set(stats);
      this.submissionOutcomes.set(outcomes);
      this.problems.set(problems);
    });
  }

  private formatVolume(num: number): string {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  }

  getDifficultyClass(difficulty: string): string {
    switch (difficulty) {
      case 'Easy': return 'difficulty-easy';
      case 'Medium': return 'difficulty-medium';
      case 'Hard': return 'difficulty-hard';
      default: return '';
    }
  }

  getAcceptanceColor(rate: number): string {
    if (rate >= 50) return 'bg-emerald-400';
    if (rate >= 35) return 'bg-orange-400';
    return 'bg-amber-500';
  }

  constructor(private router: Router) {}

  openProblem(problem: Problem) {
    // Navigate to problem preview/view
    window.open(`/problems/${problem.id}`, '_blank');
  }

  editProblem(problem: Problem) {
    this.router.navigate(['/content/problems', problem.id, 'edit']);
  }

  createNewProblem() {
    this.router.navigate(['/content/problems/create']);
  }

  exportProblems() {
    console.log('Exporting problems');
  }
}
