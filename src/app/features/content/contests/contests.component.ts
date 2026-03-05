import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { ProgressBarModule } from 'primeng/progressbar';
import { ChipModule } from 'primeng/chip';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { OrderListModule } from 'primeng/orderlist';
import { DividerModule } from 'primeng/divider';
import { TabsModule } from 'primeng/tabs';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

interface Problem {
  id: string;
  title: string;
  slug: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  acceptanceRate: number;
  points: number;
}

interface Contest {
  id: string;
  title: string;
  description: string;
  type: 'weekly' | 'biweekly' | 'special' | 'practice';
  status: 'draft' | 'scheduled' | 'live' | 'ended';
  startTime: Date;
  endTime: Date;
  duration: number;
  registeredUsers: number;
  maxParticipants: number;
  problems: number;
  problemList: Problem[];
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  prizes: string[];
  createdBy: string;
  createdAt: string;
}

interface ContestStats {
  totalContests: number;
  liveNow: number;
  upcoming: number;
  totalParticipants: number;
}

@Component({
  selector: 'app-contests',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    InputTextModule,
    TooltipModule,
    DialogModule,
    Select,
    DatePicker,
    InputNumberModule,
    ProgressBarModule,
    ChipModule,
    AutoCompleteModule,
    OrderListModule,
    DividerModule,
    TabsModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './contests.component.html',
  styleUrls: ['./contests.component.scss']
})
export class ContestsComponent implements OnInit {
  stats = signal<ContestStats>({
    totalContests: 156,
    liveNow: 2,
    upcoming: 8,
    totalParticipants: 45780
  });

  contests = signal<Contest[]>([]);
  filteredContests: Contest[] = [];
  selectedStatus = signal<string>('all');
  searchQuery = signal('');
  showContestDialog = signal(false);
  editingContest = signal<Contest | null>(null);

  statusFilters = ['all', 'live', 'scheduled', 'ended', 'draft'];
  
  contestTypes = [
    { label: 'Weekly Contest', value: 'weekly' },
    { label: 'Bi-weekly Contest', value: 'biweekly' },
    { label: 'Special Event', value: 'special' },
    { label: 'Practice Contest', value: 'practice' }
  ];

  difficulties = [
    { label: 'Easy', value: 'easy' },
    { label: 'Medium', value: 'medium' },
    { label: 'Hard', value: 'hard' },
    { label: 'Mixed', value: 'mixed' }
  ];

  newContest: Partial<Contest> = this.getEmptyContest();
  
  // Problem selection
  availableProblems = signal<Problem[]>([]);
  filteredProblems = signal<Problem[]>([]);
  selectedProblems = signal<Problem[]>([]);
  problemSearchQuery = '';
  activeDialogTab = signal(0);
  newPrize = '';

  private apiService = inject(ApiService);

  constructor(private messageService: MessageService) {}

  ngOnInit() {
    this.loadContests();
    this.loadAvailableProblems();
  }

  loadAvailableProblems() {
    this.apiService.getProblems({ limit: 50 }).pipe(
      map(res => {
        const items = res?.data?.problems ?? res?.data ?? res ?? [];
        if (!Array.isArray(items)) return [] as Problem[];
        return items.map((p: any) => ({
          id: p.id ?? '',
          title: p.title ?? '',
          slug: p.slug ?? '',
          difficulty: p.difficulty ?? 'easy',
          category: p.category ?? '',
          acceptanceRate: p.acceptanceRate ?? p.acceptance ?? 0,
          points: p.points ?? 100
        })) as Problem[];
      }),
      catchError(() => of([] as Problem[]))
    ).subscribe(problems => {
      this.availableProblems.set(problems);
    });
  }

  loadContests() {
    this.apiService.getContests().pipe(
      map(res => {
        const items = res?.data?.contests ?? res?.data ?? res ?? [];
        if (!Array.isArray(items)) return [] as Contest[];
        return items.map((c: any) => ({
          id: c.id ?? '',
          title: c.title ?? '',
          description: c.description ?? '',
          type: c.type ?? 'weekly',
          status: c.status ?? 'draft',
          startTime: c.startTime ? new Date(c.startTime) : new Date(),
          endTime: c.endTime ? new Date(c.endTime) : new Date(),
          duration: c.duration ?? 90,
          registeredUsers: c.registeredUsers ?? 0,
          maxParticipants: c.maxParticipants ?? 20000,
          problems: c.problems ?? 0,
          problemList: Array.isArray(c.problemList) ? c.problemList : [],
          difficulty: c.difficulty ?? 'mixed',
          prizes: Array.isArray(c.prizes) ? c.prizes : [],
          createdBy: c.createdBy ?? '',
          createdAt: c.createdAt ?? ''
        })) as Contest[];
      }),
      catchError(() => of([] as Contest[]))
    ).subscribe(contests => {
      this.contests.set(contests);
      this.applyFilters();
    });
  }

  applyFilters() {
    let filtered = this.contests();
    
    if (this.selectedStatus() !== 'all') {
      filtered = filtered.filter(c => c.status === this.selectedStatus());
    }
    
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      filtered = filtered.filter(c => 
        c.title.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query)
      );
    }
    
    this.filteredContests = filtered;
  }

  onStatusFilter(status: string) {
    this.selectedStatus.set(status);
    this.applyFilters();
  }

  onSearchChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.applyFilters();
  }

  openContestDialog(contest?: Contest) {
    if (contest) {
      this.editingContest.set(contest);
      this.newContest = { ...contest };
      this.selectedProblems.set([...(contest.problemList || [])]);
    } else {
      this.editingContest.set(null);
      this.newContest = this.getEmptyContest();
      this.selectedProblems.set([]);
    }
    this.activeDialogTab.set(0);
    this.showContestDialog.set(true);
  }

  saveContest() {
    this.newContest.problemList = this.selectedProblems();
    this.newContest.problems = this.selectedProblems().length;

    const editing = this.editingContest();
    const request$ = editing
      ? this.apiService.updateContest(editing.id, this.newContest)
      : this.apiService.createContest(this.newContest);

    request$.pipe(
      map(res => res?.data ?? res),
      catchError(() => of(null))
    ).subscribe(result => {
      if (result) {
        if (editing) {
          const contests = this.contests().map(c =>
            c.id === editing.id ? { ...c, ...this.newContest } as Contest : c
          );
          this.contests.set(contests);
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Contest updated successfully' });
        } else {
          const contest: Contest = {
            ...this.newContest as Contest,
            id: result.id ?? `C${Date.now()}`,
            registeredUsers: 0,
            createdAt: new Date().toISOString().split('T')[0]
          };
          this.contests.set([contest, ...this.contests()]);
          this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Contest created successfully' });
        }
        this.applyFilters();
        this.showContestDialog.set(false);
      } else {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save contest' });
      }
    });
  }

  deleteContest(id: string) {
    this.apiService.deleteContest(id).pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      const contests = this.contests().filter(c => c.id !== id);
      this.contests.set(contests);
      this.applyFilters();
      this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Contest deleted' });
    });
  }

  duplicateContest(contest: Contest) {
    const newContest = {
      ...contest,
      id: `C${Date.now()}`,
      title: `${contest.title} (Copy)`,
      status: 'draft' as const,
      registeredUsers: 0
    };
    this.contests.set([newContest, ...this.contests()]);
    this.applyFilters();
  }

  viewResults(contest: Contest) {
    console.log('Viewing results for:', contest.id);
  }

  getEmptyContest(): Partial<Contest> {
    return {
      title: '',
      description: '',
      type: 'weekly',
      status: 'draft',
      startTime: new Date(),
      duration: 90,
      maxParticipants: 20000,
      problems: 0,
      problemList: [],
      difficulty: 'mixed',
      prizes: [],
      createdBy: 'Admin'
    };
  }

  // Problem search and selection methods
  searchProblems(event: AutoCompleteCompleteEvent) {
    const query = event.query.toLowerCase();
    const selectedIds = this.selectedProblems().map(p => p.id);
    
    this.filteredProblems.set(
      this.availableProblems().filter(p => 
        !selectedIds.includes(p.id) && 
        (p.title.toLowerCase().includes(query) || 
         p.category.toLowerCase().includes(query) ||
         p.difficulty.toLowerCase().includes(query))
      )
    );
  }

  addProblem(problem: Problem) {
    if (!this.selectedProblems().find(p => p.id === problem.id)) {
      this.selectedProblems.set([...this.selectedProblems(), problem]);
      this.problemSearchQuery = '';
    }
  }

  removeProblem(problem: Problem) {
    this.selectedProblems.set(this.selectedProblems().filter(p => p.id !== problem.id));
  }

  moveProblemUp(index: number) {
    if (index > 0) {
      const problems = [...this.selectedProblems()];
      [problems[index - 1], problems[index]] = [problems[index], problems[index - 1]];
      this.selectedProblems.set(problems);
    }
  }

  moveProblemDown(index: number) {
    const problems = this.selectedProblems();
    if (index < problems.length - 1) {
      const updated = [...problems];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      this.selectedProblems.set(updated);
    }
  }

  getTotalPoints(): number {
    return this.selectedProblems().reduce((sum, p) => sum + p.points, 0);
  }

  getProblemDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case 'easy': return 'var(--success-color)';
      case 'medium': return 'var(--warning-color)';
      case 'hard': return 'var(--danger-color)';
      default: return 'var(--text-secondary)';
    }
  }

  // Prize management
  addPrize() {
    if (this.newPrize.trim()) {
      this.newContest.prizes = [...(this.newContest.prizes || []), this.newPrize.trim()];
      this.newPrize = '';
    }
  }

  removePrize(index: number) {
    const prizes = [...(this.newContest.prizes || [])];
    prizes.splice(index, 1);
    this.newContest.prizes = prizes;
  }

  getStatusSeverity(status: string): 'success' | 'warn' | 'info' | 'danger' {
    switch (status) {
      case 'live': return 'success';
      case 'scheduled': return 'info';
      case 'ended': return 'warn';
      default: return 'info';
    }
  }

  getTypeSeverity(type: string): 'success' | 'warn' | 'info' | 'danger' {
    switch (type) {
      case 'weekly': return 'info';
      case 'biweekly': return 'warn';
      case 'special': return 'success';
      default: return 'info';
    }
  }

  getDifficultySeverity(difficulty: string): 'success' | 'warn' | 'danger' | 'info' {
    switch (difficulty) {
      case 'easy': return 'success';
      case 'medium': return 'warn';
      case 'hard': return 'danger';
      default: return 'info';
    }
  }

  getTimeRemaining(contest: Contest): string {
    if (contest.status === 'live') {
      const remaining = contest.endTime.getTime() - Date.now();
      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      return `${hours}h ${minutes}m remaining`;
    }
    if (contest.status === 'scheduled') {
      const until = contest.startTime.getTime() - Date.now();
      const days = Math.floor(until / 86400000);
      if (days > 0) return `Starts in ${days} days`;
      const hours = Math.floor(until / 3600000);
      return `Starts in ${hours}h`;
    }
    return '';
  }

  getRegistrationProgress(contest: Contest): number {
    return (contest.registeredUsers / contest.maxParticipants) * 100;
  }

  formatNumber(num: number): string {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  }
}
