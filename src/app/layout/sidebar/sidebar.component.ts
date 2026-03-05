import { Component, signal, computed, inject, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PanelMenuModule } from 'primeng/panelmenu';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';
import { AuthService } from '../../core/auth/auth.service';

// Extended MenuItem with badge support
interface ExtendedMenuItem extends MenuItem {
  badge?: string;
  badgeSeverity?: 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, PanelMenuModule, BadgeModule, TooltipModule, ButtonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  private authService = inject(AuthService);

  isCollapsed = input(false);
  user = this.authService.user;

  menuItems = computed<ExtendedMenuItem[]>(() => [
    {
      label: 'Dashboard',
      icon: 'pi pi-home',
      routerLink: ['/dashboard'],
      expanded: true
    },
    {
      label: 'Monitoring',
      icon: 'pi pi-chart-line',
      items: [
        { label: 'System Health', icon: 'pi pi-heart', routerLink: ['/monitoring/system-health'] },
        { label: 'Jobs', icon: 'pi pi-cog', routerLink: ['/monitoring/jobs'] },
        { label: 'Cache', icon: 'pi pi-database', routerLink: ['/monitoring/cache'] },
        { label: 'Database', icon: 'pi pi-server', routerLink: ['/monitoring/database'] },
        { label: 'Network', icon: 'pi pi-wifi', routerLink: ['/monitoring/network'] },
        { label: 'Analytics Explorer', icon: 'pi pi-chart-bar', routerLink: ['/monitoring/analytics'] }
      ]
    },
    {
      label: 'Logs',
      icon: 'pi pi-file',
      routerLink: ['/logs']
    },
    {
      label: 'Alerts',
      icon: 'pi pi-bell',
      badge: '3',
      badgeSeverity: 'danger',
      items: [
        { label: 'Alert Rules', icon: 'pi pi-sliders-h', routerLink: ['/alerts/rules'] },
        { label: 'Notifications', icon: 'pi pi-inbox', routerLink: ['/alerts/notifications'] }
      ]
    },
    {
      label: 'Content',
      icon: 'pi pi-book',
      items: [
        { label: 'Problems', icon: 'pi pi-code', routerLink: ['/content/problems'] },
        { label: 'Create Problem', icon: 'pi pi-plus', routerLink: ['/content/problems/create'] },
        { label: 'Contests', icon: 'pi pi-trophy', routerLink: ['/content/contests'] },
        { label: 'Blog Posts', icon: 'pi pi-file-edit', routerLink: ['/content/blog'] },
        { label: 'Create Blog', icon: 'pi pi-plus-circle', routerLink: ['/content/blog/create'] }
      ]
    },
    {
      label: 'Users',
      icon: 'pi pi-users',
      items: [
        { label: 'Management', icon: 'pi pi-user-edit', routerLink: ['/users/management'] },
        { label: 'Communication', icon: 'pi pi-envelope', routerLink: ['/users/communication'] },
        { label: 'Support', icon: 'pi pi-ticket', routerLink: ['/users/support'] }
      ]
    },
    {
      label: 'Admin',
      icon: 'pi pi-shield',
      items: [
        { label: 'Profile', icon: 'pi pi-user', routerLink: ['/admin/profile'] },
        { label: 'RBAC', icon: 'pi pi-lock', routerLink: ['/admin/rbac'] },
        { label: 'Audit Logs', icon: 'pi pi-history', routerLink: ['/admin/audit'] }
      ]
    },
    {
      label: 'Mail',
      icon: 'pi pi-envelope',
      routerLink: ['/mail']
    },
    {
      label: 'Search',
      icon: 'pi pi-search',
      routerLink: ['/search']
    }
  ]);

  toggleSidebars = output<void>();

  onToggleSidebar(): void {
    this.toggleSidebars.emit();
  }
}
