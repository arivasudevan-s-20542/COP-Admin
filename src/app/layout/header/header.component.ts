import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { BadgeModule } from 'primeng/badge';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { MenuItem } from 'primeng/api';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule, 
    ButtonModule, 
    InputTextModule, 
    BadgeModule, 
    AvatarModule, 
    MenuModule,
    TooltipModule
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  private authService = inject(AuthService);

  user = this.authService.user;
  searchQuery = signal('');
  notificationCount = signal(5);
  toggleSidebar = output<void>();

  userMenuItems: MenuItem[] = [
    { label: 'Profile', icon: 'pi pi-user', routerLink: ['/admin/profile'] },
    { label: 'Settings', icon: 'pi pi-cog', routerLink: ['/settings'] },
    { separator: true },
    { label: 'Logout', icon: 'pi pi-sign-out', command: () => this.logout() }
  ];

  onSearch(): void {
    if (this.searchQuery().trim()) {
      // Navigate to search results
      console.log('Searching for:', this.searchQuery());
    }
  }

  logout(): void {
    this.authService.logout();
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }
}
