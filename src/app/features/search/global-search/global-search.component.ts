import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Select } from 'primeng/select';
import { AvatarModule } from 'primeng/avatar';
import { ApiService } from '../../../core/api/api.service';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

interface SearchResult {
  id: string;
  type: 'user' | 'problem' | 'contest' | 'submission' | 'setting';
  title: string;
  description: string;
  metadata: string;
  icon: string;
  link: string;
}

interface RecentSearch {
  query: string;
  timestamp: string;
  resultCount: number;
}

@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    TooltipModule,
    Select,
    AvatarModule
  ],
  templateUrl: './global-search.component.html',
  styleUrls: ['./global-search.component.scss']
})
export class GlobalSearchComponent implements OnInit {
  private readonly apiService = inject(ApiService);

  searchQuery = signal('');
  selectedFilter = signal('all');
  isSearching = signal(false);
  searchResults = signal<SearchResult[]>([]);
  
  recentSearches = signal<RecentSearch[]>([
    { query: 'binary search', timestamp: '5 minutes ago', resultCount: 24 },
    { query: 'john_doe@example.com', timestamp: '1 hour ago', resultCount: 1 },
    { query: 'weekly contest 347', timestamp: '3 hours ago', resultCount: 5 },
    { query: 'premium users', timestamp: '1 day ago', resultCount: 156 },
  ]);

  quickLinks = [
    { icon: 'pi-users', label: 'Users', count: '12.4k', link: '/users' },
    { icon: 'pi-code', label: 'Problems', count: '2,847', link: '/content/problems' },
    { icon: 'pi-trophy', label: 'Contests', count: '347', link: '/content/contests' },
    { icon: 'pi-file', label: 'Submissions', count: '5.2M', link: '/submissions' },
  ];

  filters = [
    { label: 'All Results', value: 'all' },
    { label: 'Users', value: 'user' },
    { label: 'Problems', value: 'problem' },
    { label: 'Contests', value: 'contest' },
    { label: 'Submissions', value: 'submission' },
    { label: 'Settings', value: 'setting' },
  ];

  ngOnInit() {}

  onSearch(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery.set(query);
    
    if (query.length >= 2) {
      this.performSearch(query);
    } else {
      this.searchResults.set([]);
    }
  }

  performSearch(query: string) {
    this.isSearching.set(true);

    this.apiService.globalSearch(query).pipe(
      map((results: any[]) => {
        return results.map((item: any, i: number) => {
          const type = item._type ?? 'problem';
          const iconMap: Record<string, string> = { problem: 'pi-code', user: 'pi-user', contest: 'pi-trophy', submission: 'pi-file', setting: 'pi-cog' };
          return {
            id: item.id ?? String(i + 1),
            type: type as SearchResult['type'],
            title: item.title ?? item.name ?? item.username ?? '',
            description: item.description ?? item.email ?? item.difficulty ?? '',
            metadata: item.metadata ?? '',
            icon: iconMap[type] ?? 'pi-circle',
            link: item.link ?? item.url ?? `/${type}s/${item.id ?? item.slug ?? ''}`
          } as SearchResult;
        });
      }),
      catchError(() => of([] as SearchResult[]))
    ).subscribe(results => {
      let filtered = results;
      if (this.selectedFilter() !== 'all') {
        filtered = results.filter(r => r.type === this.selectedFilter());
      }
      this.searchResults.set(filtered);
      this.isSearching.set(false);
    });
  }

  useRecentSearch(search: RecentSearch) {
    this.searchQuery.set(search.query);
    this.performSearch(search.query);
  }

  clearRecentSearches() {
    this.recentSearches.set([]);
  }

  onFilterChange(event: any) {
    this.selectedFilter.set(event.value);
    if (this.searchQuery()) {
      this.performSearch(this.searchQuery());
    }
  }

  getTypeSeverity(type: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (type) {
      case 'user': return 'info';
      case 'problem': return 'success';
      case 'contest': return 'warn';
      case 'submission': return 'info';
      case 'setting': return 'danger';
      default: return 'info';
    }
  }

  getTypeLabel(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
}
