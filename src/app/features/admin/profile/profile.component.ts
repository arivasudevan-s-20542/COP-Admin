import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ApiService } from '../../../core/api/api.service';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  phone: string;
  timezone: string;
  avatar: string;
  joinedDate: string;
  lastLogin: string;
  twoFactorEnabled: boolean;
  emailNotifications: boolean;
  slackNotifications: boolean;
}

interface ActivityLog {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  ipAddress: string;
}

interface SessionInfo {
  id: string;
  device: string;
  browser: string;
  location: string;
  ipAddress: string;
  lastActive: string;
  current: boolean;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    AvatarModule,
    TagModule,
    DividerModule,
    TooltipModule,
    DialogModule
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  private readonly apiService = inject(ApiService);

  profile = signal<AdminProfile>({
    id: '',
    name: '',
    email: '',
    role: '',
    department: '',
    phone: '',
    timezone: '',
    avatar: '',
    joinedDate: '',
    lastLogin: '',
    twoFactorEnabled: false,
    emailNotifications: false,
    slackNotifications: false
  });

  recentActivity = signal<ActivityLog[]>([]);

  activeSessions = signal<SessionInfo[]>([]);

  isEditing = signal(false);
  showPasswordDialog = signal(false);
  
  editName = '';
  editEmail = '';
  editPhone = '';
  editDepartment = '';

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  ngOnInit() {
    this.loadProfile();
  }

  private loadProfile() {
    this.apiService.getAdminProfile().pipe(
      map(res => res?.data ?? res),
      catchError(() => of(null))
    ).subscribe(data => {
      if (data) {
        this.profile.set({
          id: data.id ?? '',
          name: data.name ?? data.username ?? '',
          email: data.email ?? '',
          role: data.role ?? data.roles?.[0] ?? '',
          department: data.department ?? '',
          phone: data.phone ?? '',
          timezone: data.timezone ?? '',
          avatar: data.avatar ?? data.profileImage ?? '',
          joinedDate: data.joinedDate ?? data.createdAt ?? '',
          lastLogin: data.lastLogin ?? '',
          twoFactorEnabled: data.twoFactorEnabled ?? data.mfaEnabled ?? false,
          emailNotifications: data.emailNotifications ?? false,
          slackNotifications: data.slackNotifications ?? false
        });
        this.resetEditForm();
        this.loadSessions(data.id);
      }
    });
  }

  private loadSessions(userId: string) {
    if (!userId) return;
    this.apiService.getUserSessions(userId).pipe(
      map(res => {
        const items = res?.data ?? res ?? [];
        if (!Array.isArray(items)) return [];
        return items.map((s: any, i: number) => ({
          id: s.id ?? `sess_${i + 1}`,
          device: s.device ?? s.deviceName ?? 'Unknown',
          browser: s.browser ?? s.userAgent ?? '',
          location: s.location ?? '',
          ipAddress: s.ipAddress ?? s.ip ?? '',
          lastActive: s.lastActive ?? s.lastAccessed ?? '',
          current: s.current ?? s.isCurrent ?? false
        })) as SessionInfo[];
      }),
      catchError(() => of([] as SessionInfo[]))
    ).subscribe(sessions => {
      this.activeSessions.set(sessions);
    });
  }

  resetEditForm() {
    this.editName = this.profile().name;
    this.editEmail = this.profile().email;
    this.editPhone = this.profile().phone;
    this.editDepartment = this.profile().department;
  }

  startEditing() {
    this.resetEditForm();
    this.isEditing.set(true);
  }

  cancelEditing() {
    this.resetEditForm();
    this.isEditing.set(false);
  }

  saveProfile() {
    this.profile.update(p => ({
      ...p,
      name: this.editName,
      email: this.editEmail,
      phone: this.editPhone,
      department: this.editDepartment
    }));
    this.isEditing.set(false);
  }

  changePassword() {
    if (this.newPassword !== this.confirmPassword) {
      return;
    }
    this.showPasswordDialog.set(false);
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
  }

  toggleTwoFactor() {
    this.profile.update(p => ({ ...p, twoFactorEnabled: !p.twoFactorEnabled }));
  }

  toggleEmailNotifications() {
    this.profile.update(p => ({ ...p, emailNotifications: !p.emailNotifications }));
  }

  toggleSlackNotifications() {
    this.profile.update(p => ({ ...p, slackNotifications: !p.slackNotifications }));
  }

  revokeSession(sessionId: string) {
    this.activeSessions.update(sessions => sessions.filter(s => s.id !== sessionId));
  }

  revokeAllOtherSessions() {
    this.activeSessions.update(sessions => sessions.filter(s => s.current));
  }

  getActionIcon(action: string): string {
    if (action.includes('Login')) return 'pi-sign-in';
    if (action.includes('Settings')) return 'pi-cog';
    if (action.includes('Problem')) return 'pi-code';
    if (action.includes('User')) return 'pi-user';
    if (action.includes('Contest')) return 'pi-trophy';
    return 'pi-circle';
  }

  getDeviceIcon(device: string): string {
    if (device.includes('MacBook') || device.includes('Windows')) return 'pi-desktop';
    if (device.includes('iPhone') || device.includes('Android')) return 'pi-mobile';
    return 'pi-globe';
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }
}
