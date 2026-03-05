import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { AccordionModule } from 'primeng/accordion';
import { ApiService } from '../../../core/api/api.service';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  usersCount: number;
  isSystem: boolean;
  createdAt: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  resource: string;
  actions: string[];
}

interface PermissionCategory {
  name: string;
  icon: string;
  permissions: Permission[];
}

@Component({
  selector: 'app-rbac',
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
    CheckboxModule,
    AccordionModule
  ],
  templateUrl: './rbac.component.html',
  styleUrls: ['./rbac.component.scss']
})
export class RbacComponent implements OnInit {
  private readonly apiService = inject(ApiService);

  roles = signal<Role[]>([]);
  permissionCategories = signal<PermissionCategory[]>([]);
  selectedRole = signal<Role | null>(null);
  showRoleDialog = signal(false);
  editingRole = signal<Role | null>(null);
  
  newRole: Partial<Role> = this.getEmptyRole();
  selectedPermissions: Set<string> = new Set();

  ngOnInit() {
    this.loadRoles();
    this.loadPermissions();
  }

  loadRoles() {
    this.apiService.getRoles().pipe(
      map(res => {
        const items = res?.data ?? res ?? [];
        if (!Array.isArray(items)) return [];
        return items.map((r: any, i: number) => ({
          id: r.id ?? `R${String(i + 1).padStart(3, '0')}`,
          name: r.name ?? '',
          description: r.description ?? '',
          permissions: r.permissions ?? [],
          usersCount: r.usersCount ?? r.userCount ?? 0,
          isSystem: r.isSystem ?? r.system ?? false,
          createdAt: r.createdAt ?? ''
        })) as Role[];
      }),
      catchError(() => of([] as Role[]))
    ).subscribe(roles => {
      this.roles.set(roles);
      if (roles.length > 0) {
        this.selectRole(roles[0]);
      }
    });
  }

  loadPermissions() {
    this.apiService.getPermissions().pipe(
      map(res => {
        const items = res?.data ?? res ?? [];
        if (!Array.isArray(items)) return [];
        return items.map((cat: any) => ({
          name: cat.name ?? cat.category ?? '',
          icon: cat.icon ?? 'pi-circle',
          permissions: (cat.permissions ?? []).map((p: any) => ({
            id: p.id ?? '',
            name: p.name ?? '',
            description: p.description ?? '',
            category: p.category ?? '',
            resource: p.resource ?? '',
            actions: p.actions ?? []
          }))
        })) as PermissionCategory[];
      }),
      catchError(() => of([] as PermissionCategory[]))
    ).subscribe(categories => {
      this.permissionCategories.set(categories);
    });
  }

  selectRole(role: Role) {
    this.selectedRole.set(role);
    this.selectedPermissions = new Set(role.permissions);
  }

  openRoleDialog(role?: Role) {
    if (role) {
      this.editingRole.set(role);
      this.newRole = { ...role };
      this.selectedPermissions = new Set(role.permissions);
    } else {
      this.editingRole.set(null);
      this.newRole = this.getEmptyRole();
      this.selectedPermissions = new Set();
    }
    this.showRoleDialog.set(true);
  }

  saveRole() {
    const roleData = {
      ...this.newRole,
      permissions: Array.from(this.selectedPermissions)
    };
    this.apiService.createRole(roleData).pipe(
      map(res => res?.data ?? res),
      catchError(() => of(null))
    ).subscribe(result => {
      if (result) {
        this.loadRoles();
      }
      this.showRoleDialog.set(false);
    });
  }

  deleteRole(role: Role) {
    const roles = this.roles().filter(r => r.id !== role.id);
    this.roles.set(roles);
    if (this.selectedRole()?.id === role.id) {
      this.selectedRole.set(roles[0] || null);
    }
  }

  togglePermission(permissionId: string) {
    if (this.selectedPermissions.has(permissionId)) {
      this.selectedPermissions.delete(permissionId);
    } else {
      this.selectedPermissions.add(permissionId);
    }
  }

  hasPermission(permissionId: string): boolean {
    return this.selectedPermissions.has(permissionId) || this.selectedPermissions.has('*');
  }

  toggleCategoryPermissions(category: PermissionCategory) {
    const allSelected = category.permissions.every(p => this.hasPermission(p.id));
    if (allSelected) {
      category.permissions.forEach(p => this.selectedPermissions.delete(p.id));
    } else {
      category.permissions.forEach(p => this.selectedPermissions.add(p.id));
    }
  }

  isCategoryFullySelected(category: PermissionCategory): boolean {
    return category.permissions.every(p => this.hasPermission(p.id));
  }

  isCategoryPartiallySelected(category: PermissionCategory): boolean {
    const selectedCount = category.permissions.filter(p => this.hasPermission(p.id)).length;
    return selectedCount > 0 && selectedCount < category.permissions.length;
  }

  getCategoryGrantedCount(category: PermissionCategory): number {
    return category.permissions.filter(p => this.hasPermission(p.id)).length;
  }

  getEmptyRole(): Partial<Role> {
    return {
      name: '',
      description: '',
      permissions: [],
      isSystem: false
    };
  }

  getRoleSeverity(role: Role): 'success' | 'warn' | 'info' | 'danger' {
    if (role.name === 'Super Admin') return 'danger';
    if (role.name === 'Admin') return 'warn';
    if (role.isSystem) return 'info';
    return 'success';
  }
}
