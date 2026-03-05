import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { MenuModule } from 'primeng/menu';
import { AvatarModule } from 'primeng/avatar';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MenuItem } from 'primeng/api';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar: string;
  };
  category: string;
  tags: string[];
  status: 'draft' | 'review' | 'published' | 'archived';
  featuredImage: string;
  views: number;
  likes: number;
  comments: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BlogStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalViews: number;
  totalComments: number;
  avgReadTime: string;
}

@Component({
  selector: 'app-blog',
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
    MenuModule,
    AvatarModule,
    DialogModule,
    ConfirmDialogModule
  ],
  providers: [ConfirmationService],
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.scss']
})
export class BlogComponent implements OnInit {
  private apiService = inject(ApiService);

  constructor(
    private router: Router,
    private confirmationService: ConfirmationService
  ) {}

  stats = signal<BlogStats>({
    totalPosts: 156,
    publishedPosts: 124,
    draftPosts: 32,
    totalViews: 458920,
    totalComments: 3456,
    avgReadTime: '4.5 min'
  });

  posts = signal<BlogPost[]>([]);
  filteredPosts: BlogPost[] = [];
  searchQuery = signal('');
  selectedStatus = signal<string>('all');
  selectedCategory = signal<string>('all');
  showPreviewDialog = signal(false);
  previewPost = signal<BlogPost | null>(null);

  categories = [
    { label: 'All Categories', value: 'all' },
    { label: 'Tutorials', value: 'tutorials' },
    { label: 'Tips & Tricks', value: 'tips' },
    { label: 'Interview Prep', value: 'interview' },
    { label: 'Company News', value: 'news' },
    { label: 'Community', value: 'community' },
    { label: 'System Design', value: 'system-design' }
  ];

  statuses = [
    { label: 'All Status', value: 'all' },
    { label: 'Published', value: 'published' },
    { label: 'Draft', value: 'draft' },
    { label: 'In Review', value: 'review' },
    { label: 'Archived', value: 'archived' }
  ];

  ngOnInit(): void {
    this.loadPosts();
  }

  loadPosts(): void {
    this.apiService.getBlogPosts().pipe(
      map(res => {
        const items = res?.data?.posts ?? res?.data ?? res ?? [];
        if (!Array.isArray(items)) return [] as BlogPost[];
        return items.map((p: any) => ({
          id: p.id ?? '',
          title: p.title ?? '',
          slug: p.slug ?? '',
          excerpt: p.excerpt ?? '',
          content: p.content ?? '',
          author: p.author ?? { id: '', name: 'Unknown', avatar: '' },
          category: p.category ?? '',
          tags: Array.isArray(p.tags) ? p.tags : [],
          status: p.status ?? 'draft',
          featuredImage: p.featuredImage ?? '',
          views: p.views ?? 0,
          likes: p.likes ?? 0,
          comments: p.comments ?? 0,
          publishedAt: p.publishedAt ?? null,
          createdAt: p.createdAt ?? '',
          updatedAt: p.updatedAt ?? ''
        })) as BlogPost[];
      }),
      catchError(() => of([] as BlogPost[]))
    ).subscribe(posts => {
      this.posts.set(posts);
      this.filteredPosts = posts;
    });
  }

  filterPosts(): void {
    let filtered = this.posts();

    // Filter by search query
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(query) ||
        post.excerpt.toLowerCase().includes(query) ||
        post.author.name.toLowerCase().includes(query) ||
        post.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by status
    if (this.selectedStatus() !== 'all') {
      filtered = filtered.filter(post => post.status === this.selectedStatus());
    }

    // Filter by category
    if (this.selectedCategory() !== 'all') {
      filtered = filtered.filter(post => post.category === this.selectedCategory());
    }

    this.filteredPosts = filtered;
  }

  onSearchChange(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.filterPosts();
  }

  onStatusChange(status: string): void {
    this.selectedStatus.set(status);
    this.filterPosts();
  }

  onCategoryChange(category: string): void {
    this.selectedCategory.set(category);
    this.filterPosts();
  }

  createPost(): void {
    this.router.navigate(['/content/blog/create']);
  }

  editPost(post: BlogPost): void {
    this.router.navigate(['/content/blog', post.id, 'edit']);
  }

  previewPostDialog(post: BlogPost): void {
    this.previewPost.set(post);
    this.showPreviewDialog.set(true);
  }

  duplicatePost(post: BlogPost): void {
    console.log('Duplicating post:', post.id);
    // API call to duplicate post
  }

  deletePost(post: BlogPost): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${post.title}"?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.apiService.deleteBlogPost(post.id).pipe(
          catchError(() => of(null))
        ).subscribe(() => {
          const posts = this.posts().filter(p => p.id !== post.id);
          this.posts.set(posts);
          this.filterPosts();
        });
      }
    });
  }

  publishPost(post: BlogPost): void {
    this.apiService.publishBlogPost(post.id).pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      const posts = this.posts().map(p => {
        if (p.id === post.id) {
          return { ...p, status: 'published' as const, publishedAt: new Date().toISOString() };
        }
        return p;
      });
      this.posts.set(posts);
      this.filterPosts();
    });
  }

  unpublishPost(post: BlogPost): void {
    const posts = this.posts().map(p => {
      if (p.id === post.id) {
        return { ...p, status: 'draft' as const };
      }
      return p;
    });
    this.posts.set(posts);
    this.filterPosts();
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

  getCategoryLabel(category: string): string {
    const found = this.categories.find(c => c.value === category);
    return found?.label || category;
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Not published';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getPostActions(post: BlogPost): MenuItem[] {
    const actions: MenuItem[] = [
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => this.editPost(post)
      },
      {
        label: 'Preview',
        icon: 'pi pi-eye',
        command: () => this.previewPostDialog(post)
      },
      {
        label: 'Duplicate',
        icon: 'pi pi-copy',
        command: () => this.duplicatePost(post)
      },
      { separator: true }
    ];

    if (post.status === 'published') {
      actions.push({
        label: 'Unpublish',
        icon: 'pi pi-eye-slash',
        command: () => this.unpublishPost(post)
      });
    } else {
      actions.push({
        label: 'Publish',
        icon: 'pi pi-check',
        command: () => this.publishPost(post)
      });
    }

    actions.push(
      { separator: true },
      {
        label: 'Delete',
        icon: 'pi pi-trash',
        command: () => this.deletePost(post)
      }
    );

    return actions;
  }
}
