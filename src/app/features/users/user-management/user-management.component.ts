import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { CheckboxModule } from 'primeng/checkbox';
import { MenuModule } from 'primeng/menu';
import { DialogModule } from 'primeng/dialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { ApiService } from '../../../core/api/api.service';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'admin' | 'moderator' | 'user' | 'premium';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  problemsSolved: number;
  contestsJoined: number;
  lastActive: string;
  createdAt: string;
  country: string;
  selected?: boolean;
}

interface UserStats {
  totalUsers: number;
  activeToday: number;
  newThisWeek: number;
  premiumUsers: number;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    TagModule,
    InputTextModule,
    TooltipModule,
    AvatarModule,
    BadgeModule,
    CheckboxModule,
    MenuModule,
    DialogModule,
    ProgressBarModule
  ],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit {
  private apiService = inject(ApiService);

  stats = signal<UserStats>({
    totalUsers: 0,
    activeToday: 0,
    newThisWeek: 0,
    premiumUsers: 0
  });

  users = signal<User[]>([]);
  filteredUsers = signal<User[]>([]);
  searchQuery = signal('');
  selectedRole = signal<string>('all');
  selectedStatus = signal<string>('all');
  selectedUsers = computed(() => this.users().filter(u => u.selected));
  allSelected = signal(false);
  showUserDialog = signal(false);
  selectedUser = signal<User | null>(null);

  bulkActions = [
    { label: 'Send Email', icon: 'pi pi-envelope', command: () => this.bulkEmail() },
    { label: 'Export Selected', icon: 'pi pi-download', command: () => this.exportSelected() },
    { separator: true },
    { label: 'Suspend Users', icon: 'pi pi-ban', command: () => this.bulkSuspend() },
    { label: 'Delete Users', icon: 'pi pi-trash', command: () => this.bulkDelete() }
  ];

  roles = ['all', 'admin', 'moderator', 'user', 'premium'];
  statuses = ['all', 'active', 'inactive', 'suspended', 'pending'];

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.apiService.getUsers().pipe(
      map(res => {
        const data = res?.data ?? res;
        const list: any[] = Array.isArray(data) ? data : (data?.users ?? []);
        return list.map((u: any) => ({
          id: u.id ?? u.userId ?? '',
          name: u.name ?? u.displayName ?? u.username ?? '',
          email: u.email ?? '',
          avatar: (u.name ?? u.displayName ?? '').split(' ').map((n: string) => n[0]).join('').toUpperCase(),
          role: u.role ?? 'user',
          status: u.status ?? 'active',
          problemsSolved: u.problemsSolved ?? u.solvedCount ?? 0,
          contestsJoined: u.contestsJoined ?? u.contestCount ?? 0,
          lastActive: u.lastActive ?? u.lastLoginAt ?? 'N/A',
          createdAt: u.createdAt ?? '',
          country: u.country ?? ''
        })) as User[];
      }),
      catchError(() => of([] as User[]))
    ).subscribe(users => {
      this.users.set(users);
      this.filteredUsers.set(users);
      this.deriveStats(users);
    });
  }

  private deriveStats(users: User[]) {
    this.stats.set({
      totalUsers: users.length,
      activeToday: users.filter(u => u.status === 'active').length,
      newThisWeek: users.filter(u => u.createdAt?.includes('2025')).length,
      premiumUsers: users.filter(u => u.role === 'premium').length
    });
  }

  filterUsers() {
    let filtered = this.users();
    const query = this.searchQuery().toLowerCase();
    if (query) {
      filtered = filtered.filter(u => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query) || u.id.toLowerCase().includes(query));
    }
    if (this.selectedRole() !== 'all') {
      filtered = filtered.filter(u => u.role === this.selectedRole());
    }
    if (this.selectedStatus() !== 'all') {
      filtered = filtered.filter(u => u.status === this.selectedStatus());
    }
    this.filteredUsers.set(filtered);
  }

  onSearchChange(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.filterUsers();
  }

  onRoleFilter(role: string) {
    this.selectedRole.set(role);
    this.filterUsers();
  }

  onStatusFilter(status: string) {
    this.selectedStatus.set(status);
    this.filterUsers();
  }

  toggleSelectAll() {
    const newValue = !this.allSelected();
    this.allSelected.set(newValue);
    this.users.update(users => users.map(u => ({ ...u, selected: newValue })));
    this.filteredUsers.update(users => users.map(u => ({ ...u, selected: newValue })));
  }

  toggleUserSelection(user: User) {
    this.users.update(users => users.map(u => u.id === user.id ? { ...u, selected: !u.selected } : u));
    this.filteredUsers.update(users => users.map(u => u.id === user.id ? { ...u, selected: !u.selected } : u));
  }

  viewUser(user: User) {
    this.selectedUser.set(user);
    this.showUserDialog.set(true);
  }

  editUser(user: User) {
    this.apiService.updateUser(user.id, user).pipe(
      map(res => res?.data ?? res),
      catchError(() => of(null))
    ).subscribe(result => {
      if (result) this.loadUsers();
    });
  }

  suspendUser(user: User) {
    this.apiService.updateUser(user.id, { status: 'suspended' }).pipe(
      map(res => res?.data ?? res),
      catchError(() => of(null))
    ).subscribe(result => {
      if (result) this.loadUsers();
    });
  }

  deleteUser(user: User) {
    this.apiService.deleteUser(user.id).pipe(
      map(res => res?.data ?? res),
      catchError(() => of(null))
    ).subscribe(result => {
      if (result !== null) this.loadUsers();
    });
  }
  bulkEmail() { console.log('Bulk email to:', this.selectedUsers()); }
  exportSelected() { console.log('Export selected:', this.selectedUsers()); }
  bulkSuspend() { console.log('Bulk suspend:', this.selectedUsers()); }
  bulkDelete() { console.log('Bulk delete:', this.selectedUsers()); }
  addNewUser() { console.log('Add new user'); }
  exportAll() { console.log('Export all users'); }

  getRoleSeverity(role: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (role) {
      case 'admin': return 'danger';
      case 'moderator': return 'warn';
      case 'premium': return 'success';
      default: return 'info';
    }
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'secondary';
      case 'suspended': return 'danger';
      case 'pending': return 'warn';
      default: return 'info';
    }
  }

  getAvatarColor(name: string): string {
    const colors = ['#0d59f2', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    return colors[name.charCodeAt(0) % colors.length];
  }
}
