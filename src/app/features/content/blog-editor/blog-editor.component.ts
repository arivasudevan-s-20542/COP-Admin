import { Component, OnInit, signal, inject } from '@angular/core';
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
import { EditorModule } from 'primeng/editor';
import { FileUploadModule } from 'primeng/fileupload';
import { AutoComplete } from 'primeng/autocomplete';
import { DialogModule } from 'primeng/dialog';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { DatePicker } from 'primeng/datepicker';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  status: 'draft' | 'review' | 'published' | 'archived';
  featuredImage: string;
  metaTitle: string;
  metaDescription: string;
  scheduledAt: Date | null;
  allowComments: boolean;
  featured: boolean;
}

@Component({
  selector: 'app-blog-editor',
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
    EditorModule,
    FileUploadModule,
    AutoComplete,
    DialogModule,
    ToggleSwitch,
    DatePicker
  ],
  templateUrl: './blog-editor.component.html',
  styleUrls: ['./blog-editor.component.scss']
})
export class BlogEditorComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private apiService = inject(ApiService);

  isEditMode = signal(false);
  postId = signal<string | null>(null);
  isSaving = signal(false);
  showPreview = signal(false);
  showScheduleDialog = signal(false);
  autoSaveEnabled = signal(true);
  lastSaved = signal<Date | null>(null);
  minScheduleDate = new Date();

  post = signal<BlogPost>({
    id: '',
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    category: '',
    tags: [],
    status: 'draft',
    featuredImage: '',
    metaTitle: '',
    metaDescription: '',
    scheduledAt: null,
    allowComments: true,
    featured: false
  });

  categories = [
    { label: 'Tutorials', value: 'tutorials' },
    { label: 'Tips & Tricks', value: 'tips' },
    { label: 'Interview Prep', value: 'interview' },
    { label: 'Company News', value: 'news' },
    { label: 'Community', value: 'community' },
    { label: 'System Design', value: 'system-design' },
    { label: 'Data Structures', value: 'data-structures' },
    { label: 'Algorithms', value: 'algorithms' }
  ];

  statuses = [
    { label: 'Draft', value: 'draft' },
    { label: 'In Review', value: 'review' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' }
  ];

  // Tag suggestions
  suggestedTags = [
    'javascript', 'typescript', 'python', 'java', 'cpp',
    'algorithms', 'data-structures', 'dynamic-programming',
    'interview-prep', 'system-design', 'web-development',
    'machine-learning', 'database', 'leetcode', 'beginner',
    'advanced', 'tutorial', 'tips', 'best-practices'
  ];

  filteredTags: string[] = [];

  // Editor modules/toolbar configuration
  editorModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'header': 1 }, { 'header': 2 }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'script': 'sub' }, { 'script': 'super' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'font': [] }],
      [{ 'align': [] }],
      ['clean'],
      ['link', 'image', 'video']
    ]
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.postId.set(id);
      this.loadPost(id);
    }
  }

  loadPost(id: string): void {
    this.apiService.getBlogPostById(id).pipe(
      map(res => res?.data ?? res),
      catchError(() => of(null))
    ).subscribe(data => {
      if (data) {
        this.post.set({
          id: data.id ?? id,
          title: data.title ?? '',
          slug: data.slug ?? '',
          excerpt: data.excerpt ?? '',
          content: data.content ?? '',
          category: data.category ?? '',
          tags: Array.isArray(data.tags) ? data.tags : [],
          status: data.status ?? 'draft',
          featuredImage: data.featuredImage ?? '',
          metaTitle: data.metaTitle ?? '',
          metaDescription: data.metaDescription ?? '',
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
          allowComments: data.allowComments ?? true,
          featured: data.featured ?? false
        });
      }
    });
  }

  generateSlug(): void {
    const title = this.post().title;
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    this.updatePost('slug', slug);
  }

  updatePost<K extends keyof BlogPost>(field: K, value: BlogPost[K]): void {
    this.post.update(p => ({ ...p, [field]: value }));
    
    // Auto-save after changes
    if (this.autoSaveEnabled()) {
      this.autoSave();
    }
  }

  private autoSaveTimeout: any;
  autoSave(): void {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    this.autoSaveTimeout = setTimeout(() => {
      this.saveDraft();
    }, 2000);
  }

  saveDraft(): void {
    this.isSaving.set(true);
    this.updatePost('status', 'draft');

    const currentPost = this.post();
    const isNew = !this.isEditMode();
    const request$ = isNew
      ? this.apiService.createBlogPost(currentPost)
      : this.apiService.updateBlogPost(currentPost.id, currentPost);

    request$.pipe(
      map(res => res?.data ?? res),
      catchError(() => of(null))
    ).subscribe(result => {
      this.isSaving.set(false);
      if (result) {
        this.lastSaved.set(new Date());
        if (isNew && result.id) {
          this.postId.set(result.id);
          this.isEditMode.set(true);
          this.post.update(p => ({ ...p, id: result.id }));
        }
      }
    });
  }

  filterTags(event: any): void {
    const query = (event.query || '').toLowerCase();
    this.filteredTags = this.suggestedTags.filter(
      tag => tag.toLowerCase().includes(query) && !this.post().tags.includes(tag)
    );
  }

  submitForReview(): void {
    this.isSaving.set(true);
    this.updatePost('status', 'review');

    const currentPost = this.post();
    this.apiService.updateBlogPost(currentPost.id, currentPost).pipe(
      map(res => res?.data ?? res),
      catchError(() => of(null))
    ).subscribe(() => {
      this.isSaving.set(false);
      this.lastSaved.set(new Date());
    });
  }

  publish(): void {
    this.isSaving.set(true);
    const currentPost = this.post();

    this.apiService.publishBlogPost(currentPost.id).pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      this.updatePost('status', 'published');
      this.isSaving.set(false);
      this.lastSaved.set(new Date());
    });
  }

  schedulePublish(): void {
    this.showScheduleDialog.set(true);
  }

  confirmSchedule(): void {
    console.log('Scheduled for:', this.post().scheduledAt);
    this.showScheduleDialog.set(false);
    this.saveDraft();
  }

  togglePreview(): void {
    this.showPreview.update(v => !v);
  }

  onImageUpload(event: any): void {
    // Handle image upload
    const file = event.files[0];
    if (file) {
      // Mock upload - replace with real service
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.updatePost('featuredImage', e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.updatePost('featuredImage', '');
  }

  goBack(): void {
    this.router.navigate(['/content/blog']);
  }

  getStatusSeverity(status: string): 'success' | 'warn' | 'info' | 'danger' | 'secondary' {
    switch (status) {
      case 'published': return 'success';
      case 'draft': return 'secondary';
      case 'review': return 'warn';
      case 'archived': return 'danger';
      default: return 'info';
    }
  }

  formatLastSaved(): string {
    const lastSaved = this.lastSaved();
    if (!lastSaved) return '';
    return `Last saved at ${lastSaved.toLocaleTimeString()}`;
  }

  get wordCount(): number {
    const text = this.post().content.replace(/<[^>]*>/g, '');
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  get readTime(): string {
    const wordsPerMinute = 200;
    const minutes = Math.ceil(this.wordCount / wordsPerMinute);
    return `${minutes} min read`;
  }
}
