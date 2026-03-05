import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { EditorModule } from 'primeng/editor';
import { BadgeModule } from 'primeng/badge';
import { ApiService } from '../../../core/api/api.service';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

interface Message {
  id: string;
  subject: string;
  recipients: string[];
  type: 'email' | 'notification' | 'sms';
  status: 'sent' | 'draft' | 'scheduled' | 'failed';
  sentAt: Date | null;
  scheduledAt: Date | null;
  openRate: number;
  clickRate: number;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: 'email' | 'notification' | 'sms';
  usageCount: number;
}

@Component({
  selector: 'app-communication',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    Select,
    TableModule,
    TagModule,
    TooltipModule,
    DialogModule,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    EditorModule,
    BadgeModule
  ],
  templateUrl: './communication.component.html',
  styleUrls: ['./communication.component.scss']
})
export class CommunicationComponent implements OnInit {
  private apiService = inject(ApiService);

  activeTab = signal(0);
  showComposeDialog = signal(false);
  showTemplateDialog = signal(false);

  // Stats
  stats = signal({
    totalSent: 0,
    openRate: 0,
    clickRate: 0,
    pending: 0
  });

  // Compose form
  composeForm = signal({
    type: 'email' as 'email' | 'notification' | 'sms',
    subject: '',
    content: '',
    recipients: 'all',
    scheduledAt: null as Date | null
  });

  // Message history
  messages = signal<Message[]>([]);

  // Templates
  templates = signal<Template[]>([]);

  // Options
  messageTypes = [
    { label: 'Email', value: 'email' },
    { label: 'Push Notification', value: 'notification' },
    { label: 'SMS', value: 'sms' }
  ];

  recipientGroups = [
    { label: 'All Users', value: 'all' },
    { label: 'Active Users (30 days)', value: 'active' },
    { label: 'Premium Users', value: 'premium' },
    { label: 'Contest Participants', value: 'contest' },
    { label: 'New Users (7 days)', value: 'new' }
  ];

  ngOnInit() {
    this.loadMessages();
    this.loadTemplates();
    this.loadStats();
  }

  loadMessages() {
    this.apiService.getMailWebhookStats().pipe(
      map(res => {
        const data = res?.data ?? res;
        const list: any[] = Array.isArray(data) ? data : (data?.messages ?? data?.campaigns ?? []);
        return list.map((m: any, i: number) => ({
          id: m.id ?? String(i + 1),
          subject: m.subject ?? m.name ?? '',
          recipients: m.recipients ?? [],
          type: m.type ?? 'email',
          status: m.status ?? 'sent',
          sentAt: m.sentAt ? new Date(m.sentAt) : null,
          scheduledAt: m.scheduledAt ? new Date(m.scheduledAt) : null,
          openRate: m.openRate ?? 0,
          clickRate: m.clickRate ?? 0
        })) as Message[];
      }),
      catchError(() => of([] as Message[]))
    ).subscribe(msgs => this.messages.set(msgs));
  }

  loadTemplates() {
    this.apiService.getMailInfo().pipe(
      map(res => {
        const data = res?.data ?? res;
        const list: any[] = Array.isArray(data) ? data : (data?.templates ?? []);
        return list.map((t: any, i: number) => ({
          id: t.id ?? String(i + 1),
          name: t.name ?? '',
          subject: t.subject ?? '',
          content: t.content ?? '',
          type: t.type ?? 'email',
          usageCount: t.usageCount ?? 0
        })) as Template[];
      }),
      catchError(() => of([] as Template[]))
    ).subscribe(tpls => this.templates.set(tpls));
  }

  loadStats() {
    this.apiService.getMailWebhookStats().pipe(
      map(res => {
        const d = res?.data ?? res;
        return {
          totalSent: d.totalSent ?? d.total ?? 0,
          openRate: d.openRate ?? 0,
          clickRate: d.clickRate ?? 0,
          pending: d.pending ?? d.queueSize ?? 0
        };
      }),
      catchError(() => of({ totalSent: 0, openRate: 0, clickRate: 0, pending: 0 }))
    ).subscribe(s => this.stats.set(s));
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
      sent: 'success',
      draft: 'secondary',
      scheduled: 'info',
      failed: 'danger'
    };
    return map[status] || 'info';
  }

  getTypeSeverity(type: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
      email: 'info',
      notification: 'warn',
      sms: 'success'
    };
    return map[type] || 'info';
  }

  openCompose(): void {
    this.composeForm.set({
      type: 'email',
      subject: '',
      content: '',
      recipients: 'all',
      scheduledAt: null
    });
    this.showComposeDialog.set(true);
  }

  useTemplate(template: Template): void {
    this.composeForm.update(f => ({
      ...f,
      type: template.type,
      subject: template.subject,
      content: template.content
    }));
    this.showComposeDialog.set(true);
  }

  sendMessage(): void {
    const form = this.composeForm();
    this.apiService.sendEmail({
      subject: form.subject,
      content: form.content,
      recipients: form.recipients,
      type: form.type
    }).pipe(
      map(res => res?.data ?? res),
      catchError(() => of(null))
    ).subscribe(result => {
      this.showComposeDialog.set(false);
      if (result) this.loadMessages();
    });
  }

  saveDraft(): void {
    this.showComposeDialog.set(false);
  }

  deleteMessage(id: string): void {
    this.messages.update(msgs => msgs.filter(m => m.id !== id));
  }

  duplicateMessage(message: Message): void {
    this.composeForm.set({
      type: message.type,
      subject: `Copy of ${message.subject}`,
      content: '',
      recipients: 'all',
      scheduledAt: null
    });
    this.showComposeDialog.set(true);
  }
}
