import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { EditorModule } from 'primeng/editor';
import { TabsModule } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ChipModule } from 'primeng/chip';
import { DividerModule } from 'primeng/divider';
import { ToggleSwitch } from 'primeng/toggleswitch';

interface Problem {
  id: string;
  title: string;
  slug: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  tags: string[];
  description: string;
  constraints: string;
  examples: Example[];
  testCases: TestCase[];
  codeTemplates: CodeTemplate[];
  hints: string[];
  editorial: Editorial;
  timeLimit: number;
  memoryLimit: number;
  status: 'draft' | 'review' | 'published';
  isPremium: boolean;
  companies: string[];
  createdAt: string;
  updatedAt: string;
}

interface Editorial {
  approach: string;
  intuition: string;
  algorithm: string;
  complexity: { time: string; space: string };
  solutionCode: SolutionCode[];
}

interface SolutionCode {
  language: string;
  code: string;
  explanation: string;
}

interface Example {
  id: string;
  input: string;
  output: string;
  explanation: string;
}

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  weight: number;
}

interface CodeTemplate {
  language: string;
  template: string;
}

@Component({
  selector: 'app-problem-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    Select,
    TagModule,
    TooltipModule,
    DialogModule,
    TableModule,
    InputNumberModule,
    CheckboxModule,
    EditorModule,
    TabsModule,
    ToastModule,
    ConfirmDialogModule,
    ChipModule,
    DividerModule,
    ToggleSwitch
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './problem-editor.component.html',
  styleUrls: ['./problem-editor.component.scss']
})
export class ProblemEditorComponent implements OnInit {
  problemId = signal<string | null>(null);
  isEditMode = computed(() => this.problemId() !== null && this.problemId() !== 'new');
  currentProblem = signal<Problem | null>(null);
  activeTab = signal<'description' | 'testcases' | 'templates' | 'editorial' | 'settings'>('description');
  
  // UI State
  showPreviewMode = signal(false);
  showTestCaseDialog = signal(false);
  showExampleDialog = signal(false);
  showSolutionDialog = signal(false);
  editingTestCase = signal<TestCase | null>(null);
  editingExample = signal<Example | null>(null);
  editingSolution = signal<SolutionCode | null>(null);
  isSaving = signal(false);
  hasUnsavedChanges = signal(false);
  selectedTemplateLanguage = signal('java');
  
  difficulties = [
    { label: 'Easy', value: 'easy' },
    { label: 'Medium', value: 'medium' },
    { label: 'Hard', value: 'hard' }
  ];
  
  categories = [
    { label: 'Arrays', value: 'arrays' },
    { label: 'Strings', value: 'strings' },
    { label: 'Linked Lists', value: 'linked-lists' },
    { label: 'Trees', value: 'trees' },
    { label: 'Graphs', value: 'graphs' },
    { label: 'Dynamic Programming', value: 'dynamic-programming' },
    { label: 'Hash Table', value: 'hash-table' },
    { label: 'Math', value: 'math' },
    { label: 'Sorting', value: 'sorting' },
    { label: 'Binary Search', value: 'binary-search' },
    { label: 'Two Pointers', value: 'two-pointers' },
    { label: 'Sliding Window', value: 'sliding-window' },
    { label: 'Stack', value: 'stack' },
    { label: 'Heap', value: 'heap' },
    { label: 'Greedy', value: 'greedy' },
    { label: 'Backtracking', value: 'backtracking' },
    { label: 'Recursion', value: 'recursion' }
  ];
  
  languages = [
    { label: 'Java', value: 'java' },
    { label: 'Python', value: 'python' },
    { label: 'JavaScript', value: 'javascript' },
    { label: 'TypeScript', value: 'typescript' },
    { label: 'C++', value: 'cpp' },
    { label: 'Go', value: 'go' },
    { label: 'Rust', value: 'rust' },
    { label: 'C#', value: 'csharp' }
  ];
  
  statusOptions = [
    { label: 'Draft', value: 'draft' },
    { label: 'Under Review', value: 'review' },
    { label: 'Published', value: 'published' }
  ];

  companies = [
    'Google', 'Amazon', 'Meta', 'Apple', 'Microsoft', 'Netflix', 'Uber', 
    'LinkedIn', 'Twitter', 'Airbnb', 'Stripe', 'Salesforce', 'Adobe'
  ];

  // Form fields
  newTag = '';
  newHint = '';
  newCompany = '';
  newTestCase: TestCase = this.getEmptyTestCase();
  newExample: Example = this.getEmptyExample();
  newSolution: SolutionCode = this.getEmptySolution();

  private apiService = inject(ApiService);

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.problemId.set(id);
        this.loadProblem(id);
      } else {
        this.loadDefaultProblem();
      }
    });
  }

  loadProblem(id: string) {
    this.apiService.getProblemById(id).pipe(
      map(res => res?.data ?? res),
      catchError(() => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load problem' });
        return of(null);
      })
    ).subscribe(data => {
      if (data) {
        this.loadDefaultProblem();
        const base = this.currentProblem()!;
        this.currentProblem.set({
          ...base,
          id: data.id ?? id,
          title: data.title ?? '',
          slug: data.slug ?? '',
          description: data.description ?? '',
          constraints: data.constraints ?? '',
          difficulty: data.difficulty ?? 'medium',
          category: data.category ?? base.category,
          tags: data.tags ?? [],
          companies: data.companies ?? [],
          examples: Array.isArray(data.examples) ? data.examples : [],
          testCases: Array.isArray(data.testCases) ? data.testCases : [],
          codeTemplates: Array.isArray(data.codeTemplates) ? data.codeTemplates : base.codeTemplates,
          hints: Array.isArray(data.hints) ? data.hints : [],
          editorial: data.editorial ?? base.editorial,
          timeLimit: data.timeLimit ?? base.timeLimit,
          memoryLimit: data.memoryLimit ?? base.memoryLimit,
          status: data.status ?? 'draft',
          isPremium: data.isPremium ?? false,
          createdAt: data.createdAt ?? base.createdAt,
          updatedAt: data.updatedAt ?? base.updatedAt
        });
      } else {
        this.loadDefaultProblem();
      }
    });
  }

  loadDefaultProblem() {
    const defaultProblem: Problem = {
      id: 'new',
      title: '',
      slug: '',
      difficulty: 'medium',
      category: 'arrays',
      tags: [],
      description: '',
      constraints: '',
      examples: [],
      testCases: [],
      codeTemplates: [
        { language: 'java', template: 'class Solution {\n    public int[] solve(int[] nums, int target) {\n        // Write your solution here\n        \n    }\n}' },
        { language: 'python', template: 'class Solution:\n    def solve(self, nums: List[int], target: int) -> List[int]:\n        # Write your solution here\n        pass' },
        { language: 'javascript', template: '/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nvar solve = function(nums, target) {\n    // Write your solution here\n    \n};' },
        { language: 'cpp', template: 'class Solution {\npublic:\n    vector<int> solve(vector<int>& nums, int target) {\n        // Write your solution here\n        \n    }\n};' }
      ],
      hints: [],
      editorial: {
        approach: '',
        intuition: '',
        algorithm: '',
        complexity: { time: '', space: '' },
        solutionCode: []
      },
      timeLimit: 2000,
      memoryLimit: 256,
      status: 'draft',
      isPremium: false,
      companies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.currentProblem.set(defaultProblem);
  }

  setActiveTab(tab: 'description' | 'testcases' | 'templates' | 'editorial' | 'settings') {
    this.activeTab.set(tab);
  }

  // Field update with unsaved changes tracking
  updateField(field: keyof Problem, value: any) {
    const problem = this.currentProblem();
    if (problem) {
      this.currentProblem.set({ ...problem, [field]: value });
      this.hasUnsavedChanges.set(true);
      
      // Auto-generate slug from title
      if (field === 'title') {
        const slug = value.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').trim();
        this.currentProblem.set({ ...this.currentProblem()!, slug });
      }
    }
  }

  updateEditorial(field: keyof Editorial, value: any) {
    const problem = this.currentProblem();
    if (problem) {
      this.currentProblem.set({
        ...problem,
        editorial: { ...problem.editorial, [field]: value }
      });
      this.hasUnsavedChanges.set(true);
    }
  }

  updateComplexity(field: 'time' | 'space', value: string) {
    const problem = this.currentProblem();
    if (problem) {
      this.currentProblem.set({
        ...problem,
        editorial: {
          ...problem.editorial,
          complexity: { ...problem.editorial.complexity, [field]: value }
        }
      });
      this.hasUnsavedChanges.set(true);
    }
  }

  addTag() {
    const problem = this.currentProblem();
    if (problem && this.newTag.trim() && !problem.tags.includes(this.newTag.trim())) {
      this.currentProblem.set({ ...problem, tags: [...problem.tags, this.newTag.trim()] });
      this.newTag = '';
      this.hasUnsavedChanges.set(true);
    }
  }

  removeTag(index: number) {
    const problem = this.currentProblem();
    if (problem) {
      const tags = problem.tags.filter((_, i) => i !== index);
      this.currentProblem.set({ ...problem, tags });
    }
  }

  addHint() {
    const problem = this.currentProblem();
    if (problem && this.newHint.trim()) {
      const hints = [...problem.hints, this.newHint.trim()];
      this.currentProblem.set({ ...problem, hints });
      this.newHint = '';
    }
  }

  removeHint(index: number) {
    const problem = this.currentProblem();
    if (problem) {
      const hints = problem.hints.filter((_, i) => i !== index);
      this.currentProblem.set({ ...problem, hints });
    }
  }

  openTestCaseDialog(testCase?: TestCase) {
    if (testCase) {
      this.editingTestCase.set(testCase);
      this.newTestCase = { ...testCase };
    } else {
      this.editingTestCase.set(null);
      this.newTestCase = this.getEmptyTestCase();
    }
    this.showTestCaseDialog.set(true);
  }

  saveTestCase() {
    const problem = this.currentProblem();
    if (!problem) return;
    
    if (this.editingTestCase()) {
      const testCases = problem.testCases.map(tc => 
        tc.id === this.editingTestCase()?.id ? { ...this.newTestCase } : tc
      );
      this.currentProblem.set({ ...problem, testCases });
    } else {
      this.newTestCase.id = `TC${Date.now()}`;
      const testCases = [...problem.testCases, { ...this.newTestCase }];
      this.currentProblem.set({ ...problem, testCases });
    }
    this.showTestCaseDialog.set(false);
  }

  deleteTestCase(id: string) {
    const problem = this.currentProblem();
    if (problem) {
      const testCases = problem.testCases.filter(tc => tc.id !== id);
      this.currentProblem.set({ ...problem, testCases });
    }
  }

  openExampleDialog(example?: Example) {
    if (example) {
      this.editingExample.set(example);
      this.newExample = { ...example };
    } else {
      this.editingExample.set(null);
      this.newExample = this.getEmptyExample();
    }
    this.showExampleDialog.set(true);
  }

  saveExample() {
    const problem = this.currentProblem();
    if (!problem) return;
    
    if (this.editingExample()) {
      const examples = problem.examples.map(ex => 
        ex.id === this.editingExample()?.id ? { ...this.newExample } : ex
      );
      this.currentProblem.set({ ...problem, examples });
    } else {
      this.newExample.id = `EX${Date.now()}`;
      this.currentProblem.set({ ...problem, examples: [...problem.examples, { ...this.newExample }] });
    }
    this.showExampleDialog.set(false);
    this.hasUnsavedChanges.set(true);
  }

  deleteExample(id: string) {
    const problem = this.currentProblem();
    if (problem) {
      this.currentProblem.set({ ...problem, examples: problem.examples.filter(ex => ex.id !== id) });
      this.hasUnsavedChanges.set(true);
    }
  }

  // Companies
  addCompany() {
    const problem = this.currentProblem();
    if (problem && this.newCompany.trim() && !problem.companies.includes(this.newCompany.trim())) {
      this.currentProblem.set({ ...problem, companies: [...problem.companies, this.newCompany.trim()] });
      this.newCompany = '';
      this.hasUnsavedChanges.set(true);
    }
  }

  removeCompany(index: number) {
    const problem = this.currentProblem();
    if (problem) {
      this.currentProblem.set({ ...problem, companies: problem.companies.filter((_, i) => i !== index) });
      this.hasUnsavedChanges.set(true);
    }
  }

  // Editorial Solutions
  openSolutionDialog(solution?: SolutionCode) {
    if (solution) {
      this.editingSolution.set(solution);
      this.newSolution = { ...solution };
    } else {
      this.editingSolution.set(null);
      this.newSolution = this.getEmptySolution();
    }
    this.showSolutionDialog.set(true);
  }

  saveSolution() {
    const problem = this.currentProblem();
    if (!problem) return;
    
    const existing = problem.editorial.solutionCode.find(s => s.language === this.newSolution.language);
    let solutionCode: SolutionCode[];
    
    if (this.editingSolution()) {
      solutionCode = problem.editorial.solutionCode.map(s => 
        s.language === this.editingSolution()?.language ? { ...this.newSolution } : s
      );
    } else if (existing) {
      solutionCode = problem.editorial.solutionCode.map(s => 
        s.language === this.newSolution.language ? { ...this.newSolution } : s
      );
    } else {
      solutionCode = [...problem.editorial.solutionCode, { ...this.newSolution }];
    }
    
    this.currentProblem.set({
      ...problem,
      editorial: { ...problem.editorial, solutionCode }
    });
    this.showSolutionDialog.set(false);
    this.hasUnsavedChanges.set(true);
  }

  deleteSolution(language: string) {
    const problem = this.currentProblem();
    if (problem) {
      const solutionCode = problem.editorial.solutionCode.filter(s => s.language !== language);
      this.currentProblem.set({
        ...problem,
        editorial: { ...problem.editorial, solutionCode }
      });
      this.hasUnsavedChanges.set(true);
    }
  }

  updateTemplate(language: string, template: string) {
    const problem = this.currentProblem();
    if (problem) {
      const codeTemplates = problem.codeTemplates.map(ct => 
        ct.language === language ? { ...ct, template } : ct
      );
      this.currentProblem.set({ ...problem, codeTemplates });
      this.hasUnsavedChanges.set(true);
    }
  }

  getTemplateForLanguage(language: string): CodeTemplate | undefined {
    return this.currentProblem()?.codeTemplates.find(t => t.language === language);
  }

  // Actions
  saveDraft() {
    const problem = this.currentProblem();
    if (!problem) return;

    this.isSaving.set(true);
    const isNew = !this.isEditMode();
    const request$ = isNew
      ? this.apiService.createProblem(problem)
      : this.apiService.updateProblem(problem.id, problem);

    request$.pipe(
      map(res => res?.data ?? res),
      catchError(() => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save problem' });
        return of(null);
      })
    ).subscribe(result => {
      this.isSaving.set(false);
      if (result) {
        this.hasUnsavedChanges.set(false);
        if (isNew && result.id) {
          this.problemId.set(result.id);
          this.currentProblem.set({ ...problem, id: result.id });
        }
        this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Problem saved as draft' });
      }
    });
  }

  submitForReview() {
    const problem = this.currentProblem();
    if (problem) {
      if (!problem.title.trim()) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Title is required' });
        return;
      }
      if (!problem.description.trim()) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Description is required' });
        return;
      }
      if (problem.testCases.length < 2) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'At least 2 test cases required' });
        return;
      }
      
      this.currentProblem.set({ ...problem, status: 'review' });
      this.saveDraft();
    }
  }

  publish() {
    this.confirmationService.confirm({
      message: 'Are you sure you want to publish this problem?',
      header: 'Confirm Publish',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        const problem = this.currentProblem();
        if (problem) {
          this.currentProblem.set({ ...problem, status: 'published' });
          this.saveDraft();
        }
      }
    });
  }

  preview() {
    this.showPreviewMode.set(!this.showPreviewMode());
  }

  goBack() {
    if (this.hasUnsavedChanges()) {
      this.confirmationService.confirm({
        message: 'You have unsaved changes. Discard?',
        header: 'Unsaved Changes',
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
          this.router.navigate(['/content/problems']);
        }
      });
    } else {
      this.router.navigate(['/content/problems']);
    }
  }

  getEmptyTestCase(): TestCase {
    return { id: '', input: '', expectedOutput: '', isHidden: false, weight: 1 };
  }

  getEmptyExample(): Example {
    return { id: '', input: '', output: '', explanation: '' };
  }

  getEmptySolution(): SolutionCode {
    return { language: 'java', code: '', explanation: '' };
  }

  getDifficultyClass(difficulty: string): string {
    return `difficulty-${difficulty}`;
  }

  getStatusSeverity(status: string): 'success' | 'warn' | 'info' | 'secondary' {
    switch (status) {
      case 'published': return 'success';
      case 'review': return 'warn';
      default: return 'secondary';
    }
  }

  getLanguageLabel(value: string): string {
    return this.languages.find(l => l.value === value)?.label || value;
  }

  getVisibleTestCasesCount(): number {
    return this.currentProblem()?.testCases.filter(tc => !tc.isHidden).length || 0;
  }

  getHiddenTestCasesCount(): number {
    return this.currentProblem()?.testCases.filter(tc => tc.isHidden).length || 0;
  }

  getDifficultySeverity(): 'success' | 'warn' | 'danger' | 'secondary' {
    const difficulty = this.currentProblem()?.difficulty;
    switch (difficulty) {
      case 'easy': return 'success';
      case 'medium': return 'warn';
      case 'hard': return 'danger';
      default: return 'secondary';
    }
  }
}
