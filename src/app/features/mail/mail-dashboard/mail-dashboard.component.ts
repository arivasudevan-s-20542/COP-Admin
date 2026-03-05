import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { MultiSelect } from 'primeng/multiselect';
import { EditorModule } from 'primeng/editor';
import { TabsModule } from 'primeng/tabs';
import { BadgeModule } from 'primeng/badge';
import { ProgressBarModule } from 'primeng/progressbar';
import { ChipModule } from 'primeng/chip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ApiService } from '../../../core/api/api.service';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

// ===== INTERFACES =====
interface MailGroup {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface MailGroupMember {
  id: number;
  email: string;
  name: string;
  isActive: boolean;
  metadata: Record<string, string>;
  addedAt: string;
}

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  recipients: number;
  opened: number;
  clicked: number;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  trackingId?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: string;
  content?: string;
}

interface MailServiceHealth {
  status: string;
  provider: string;
  uptime: number;
  totalSent: number;
  successRate: number;
  avgDeliveryTime: number;
  queueSize: number;
}

@Component({
  selector: 'app-mail-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CardModule, ButtonModule, InputTextModule, 
    Select, TagModule, TableModule, TooltipModule, DialogModule, 
    TextareaModule, MultiSelect, EditorModule, TabsModule, BadgeModule,
    ProgressBarModule, ChipModule, ConfirmDialogModule, ToastModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './mail-dashboard.component.html',
  styleUrls: ['./mail-dashboard.component.scss']
})
export class MailDashboardComponent implements OnInit {
  private apiService = inject(ApiService);

  // State
  activeTab = signal(0);
  loading = signal(false);
  
  // Mail Groups
  mailGroups = signal<MailGroup[]>([]);
  selectedGroup = signal<MailGroup | null>(null);
  groupMembers = signal<MailGroupMember[]>([]);
  showGroupDialog = signal(false);
  showMemberDialog = signal(false);
  showSendToGroupDialog = signal(false);
  editingGroup = signal<MailGroup | null>(null);
  
  // Group form
  groupForm = {
    name: '',
    description: ''
  };
  
  // Member form
  memberForm = {
    email: '',
    name: '',
    metadata: ''
  };
  
  // Send to group form
  sendToGroupForm = {
    subject: '',
    htmlContent: ''
  };
  
  // Campaigns
  campaigns = signal<EmailCampaign[]>([]);
  templates = signal<EmailTemplate[]>([]);
  showComposeDialog = signal(false);
  showPreviewDialog = signal(false);
  showStatusDialog = signal(false);
  showTemplateEditDialog = signal(false);
  selectedCampaign = signal<EmailCampaign | null>(null);
  selectedTemplate = signal<EmailTemplate | null>(null);
  
  // Template edit form
  templateEditForm = {
    id: '',
    name: '',
    subject: '',
    category: '',
    content: ''
  };
  
  // Template categories
  templateCategories = [
    { label: 'Onboarding', value: 'Onboarding' },
    { label: 'Contest', value: 'Contest' },
    { label: 'Marketing', value: 'Marketing' },
    { label: 'Engagement', value: 'Engagement' },
    { label: 'Newsletter', value: 'Newsletter' },
    { label: 'Transactional', value: 'Transactional' }
  ];
  
  // Compose form
  composeForm = {
    name: '',
    subject: '',
    content: '',
    templateId: '',
    recipients: [] as string[],
    groupIds: [] as number[],
    scheduledTime: ''
  };
  
  // Preview
  previewContent = signal('');
  previewSubject = signal('');
  
  // Filters
  filterStatus = '';
  
  // Service health
  serviceHealth = signal<MailServiceHealth | null>(null);
  
  // Stats
  stats = signal({
    totalSent: 0,
    avgOpenRate: 0,
    avgClickRate: 0,
    activeCampaigns: 0,
    totalGroups: 0,
    totalMembers: 0
  });

  // Options
  audienceOptions = [
    { label: 'All Users', value: 'all' },
    { label: 'Premium Users', value: 'premium' },
    { label: 'Free Users', value: 'free' },
    { label: 'Contest Participants', value: 'contest' },
    { label: 'Inactive Users (30+ days)', value: 'inactive' },
    { label: 'New Users (Last 7 days)', value: 'new' }
  ];
  
  statusOptions = [
    { label: 'All', value: '' },
    { label: 'Draft', value: 'draft' },
    { label: 'Scheduled', value: 'scheduled' },
    { label: 'Sending', value: 'sending' },
    { label: 'Sent', value: 'sent' },
    { label: 'Failed', value: 'failed' }
  ];

  constructor(
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loadMailGroups();
    this.loadCampaigns();
    this.loadTemplates();
    this.loadServiceHealth();
    this.updateStats();
  }

  // ===== MAIL GROUPS =====
  
  loadMailGroups() {
    this.apiService.getMailGroups().pipe(
      map(res => {
        const data = res?.data ?? res;
        const list: any[] = Array.isArray(data) ? data : (data?.groups ?? []);
        return list.map((g: any) => ({
          id: g.id ?? 0,
          name: g.name ?? '',
          description: g.description ?? '',
          memberCount: g.memberCount ?? 0,
          isActive: g.isActive ?? true,
          createdBy: g.createdBy ?? '',
          createdAt: g.createdAt ?? '',
          updatedAt: g.updatedAt ?? ''
        })) as MailGroup[];
      }),
      catchError(() => of([] as MailGroup[]))
    ).subscribe(groups => this.mailGroups.set(groups));
  }

  selectGroup(group: MailGroup) {
    this.selectedGroup.set(group);
    this.loadGroupMembers(group.id);
  }

  loadGroupMembers(groupId: number) {
    this.apiService.getMailGroupMembers(groupId).pipe(
      map(res => {
        const data = res?.data ?? res;
        const list: any[] = Array.isArray(data) ? data : (data?.members ?? []);
        return list.map((m: any) => ({
          id: m.id ?? 0,
          email: m.email ?? '',
          name: m.name ?? '',
          isActive: m.isActive ?? true,
          metadata: m.metadata ?? {},
          addedAt: m.addedAt ?? ''
        })) as MailGroupMember[];
      }),
      catchError(() => of([] as MailGroupMember[]))
    ).subscribe(members => this.groupMembers.set(members));
  }

  openGroupDialog(group?: MailGroup) {
    if (group) {
      this.editingGroup.set(group);
      this.groupForm.name = group.name;
      this.groupForm.description = group.description;
    } else {
      this.editingGroup.set(null);
      this.groupForm.name = '';
      this.groupForm.description = '';
    }
    this.showGroupDialog.set(true);
  }

  saveGroup() {
    const isEdit = this.editingGroup() !== null;
    const payload = { name: this.groupForm.name, description: this.groupForm.description };

    const req$ = isEdit
      ? this.apiService.createMailGroup({ ...payload, id: this.editingGroup()!.id })
      : this.apiService.createMailGroup(payload);

    req$.pipe(
      map(res => res?.data ?? res),
      catchError(() => of(null))
    ).subscribe(result => {
      this.messageService.add({
        severity: result ? 'success' : 'error',
        summary: result ? (isEdit ? 'Group Updated' : 'Group Created') : 'Error',
        detail: result
          ? `Mail group "${this.groupForm.name}" has been ${isEdit ? 'updated' : 'created'}.`
          : 'Failed to save mail group.'
      });
      this.showGroupDialog.set(false);
      if (result) this.loadMailGroups();
    });
  }

  deleteGroup(group: MailGroup) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${group.name}"? This will remove all ${group.memberCount} members.`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.apiService.deleteMailGroup(group.id).pipe(
          map(res => res?.data ?? res),
          catchError(() => of(null))
        ).subscribe(result => {
          if (result !== null) {
            this.mailGroups.update(groups => groups.filter(g => g.id !== group.id));
          }
          this.messageService.add({
            severity: result !== null ? 'success' : 'error',
            summary: result !== null ? 'Group Deleted' : 'Error',
            detail: result !== null
              ? `Mail group "${group.name}" has been deleted.`
              : 'Failed to delete mail group.'
          });
        });
      }
    });
  }

  openMemberDialog() {
    this.memberForm = { email: '', name: '', metadata: '' };
    this.showMemberDialog.set(true);
  }

  addMember() {
    const group = this.selectedGroup();
    if (!group) return;

    const payload = {
      email: this.memberForm.email,
      name: this.memberForm.name,
      metadata: this.memberForm.metadata ? JSON.parse(this.memberForm.metadata) : {}
    };

    this.apiService.addMailGroupMember(group.id, payload).pipe(
      map(res => res?.data ?? res),
      catchError(() => of(null))
    ).subscribe(result => {
      if (result) {
        const newMember: MailGroupMember = {
          id: result.id ?? Date.now(),
          email: this.memberForm.email,
          name: this.memberForm.name,
          isActive: true,
          metadata: payload.metadata,
          addedAt: new Date().toISOString().split('T')[0]
        };
        this.groupMembers.update(members => [...members, newMember]);
      }
      this.showMemberDialog.set(false);
      this.messageService.add({
        severity: result ? 'success' : 'error',
        summary: result ? 'Member Added' : 'Error',
        detail: result
          ? `${this.memberForm.email} has been added to the group.`
          : 'Failed to add member.'
      });
    });
  }

  removeMember(member: MailGroupMember) {
    const group = this.selectedGroup();
    if (!group) return;

    this.confirmationService.confirm({
      message: `Remove ${member.email} from this group?`,
      header: 'Confirm Remove',
      icon: 'pi pi-user-minus',
      accept: () => {
        this.apiService.removeMailGroupMember(group.id, member.email).pipe(
          map(res => res?.data ?? res),
          catchError(() => of(null))
        ).subscribe(result => {
          if (result !== null) {
            this.groupMembers.update(members => members.filter(m => m.id !== member.id));
          }
          this.messageService.add({
            severity: result !== null ? 'success' : 'error',
            summary: result !== null ? 'Member Removed' : 'Error',
            detail: result !== null
              ? `${member.email} has been removed from the group.`
              : 'Failed to remove member.'
          });
        });
      }
    });
  }

  toggleMemberStatus(member: MailGroupMember) {
    // API call: PATCH /api/admin/mail/groups/{id}/members/{email}?active={status}
    member.isActive = !member.isActive;
    this.messageService.add({
      severity: 'info',
      summary: member.isActive ? 'Member Activated' : 'Member Deactivated',
      detail: `${member.email} is now ${member.isActive ? 'active' : 'inactive'}.`
    });
  }

  openSendToGroupDialog() {
    this.sendToGroupForm = { subject: '', htmlContent: '' };
    this.showSendToGroupDialog.set(true);
  }

  sendToGroup() {
    const group = this.selectedGroup();
    if (!group) return;

    this.loading.set(true);
    this.apiService.sendToMailGroup(group.id, {
      subject: this.sendToGroupForm.subject,
      htmlContent: this.sendToGroupForm.htmlContent
    }).pipe(
      map(res => res?.data ?? res),
      catchError(() => of(null))
    ).subscribe(result => {
      this.loading.set(false);
      this.showSendToGroupDialog.set(false);
      this.messageService.add({
        severity: result ? 'success' : 'error',
        summary: result ? 'Email Sent' : 'Error',
        detail: result
          ? `Email sent to ${group.memberCount} members in "${group.name}".`
          : 'Failed to send email to group.'
      });
    });
  }

  // ===== CAMPAIGNS =====
  
  loadCampaigns() {
    this.apiService.getMailWebhookStats().pipe(
      map(res => {
        const data = res?.data ?? res;
        const list: any[] = Array.isArray(data) ? data : (data?.campaigns ?? []);
        return list.map((c: any, i: number) => ({
          id: c.id ?? `camp_${i + 1}`,
          name: c.name ?? '',
          subject: c.subject ?? '',
          status: c.status ?? 'draft',
          recipients: c.recipients ?? 0,
          opened: c.opened ?? 0,
          clicked: c.clicked ?? 0,
          scheduledAt: c.scheduledAt ?? null,
          sentAt: c.sentAt ?? null,
          createdAt: c.createdAt ?? '',
          trackingId: c.trackingId ?? undefined
        })) as EmailCampaign[];
      }),
      catchError(() => of([] as EmailCampaign[]))
    ).subscribe(campaigns => this.campaigns.set(campaigns));
  }

  loadTemplates() {
    this.apiService.getMailInfo().pipe(
      map(res => {
        const data = res?.data ?? res;
        const list: any[] = Array.isArray(data) ? data : (data?.templates ?? []);
        return list.map((t: any, i: number) => ({
          id: t.id ?? `tpl_${i + 1}`,
          name: t.name ?? '',
          subject: t.subject ?? '',
          category: t.category ?? '',
          content: t.content ?? ''
        })) as EmailTemplate[];
      }),
      catchError(() => of([] as EmailTemplate[]))
    ).subscribe(templates => this.templates.set(templates));
  }

  loadServiceHealth() {
    this.apiService.getMailHealth().pipe(
      map(res => {
        const d = res?.data ?? res;
        return {
          status: d.status ?? 'unknown',
          provider: d.provider ?? '',
          uptime: d.uptime ?? 0,
          totalSent: d.totalSent ?? 0,
          successRate: d.successRate ?? 0,
          avgDeliveryTime: d.avgDeliveryTime ?? 0,
          queueSize: d.queueSize ?? 0
        } as MailServiceHealth;
      }),
      catchError(() => of(null))
    ).subscribe(health => this.serviceHealth.set(health));
  }

  updateStats() {
    const groups = this.mailGroups();
    const campaigns = this.campaigns();
    
    this.stats.set({
      totalSent: campaigns.reduce((sum, c) => sum + c.recipients, 0),
      avgOpenRate: this.calculateAvgOpenRate(campaigns),
      avgClickRate: this.calculateAvgClickRate(campaigns),
      activeCampaigns: campaigns.filter(c => c.status === 'sending' || c.status === 'scheduled').length,
      totalGroups: groups.filter(g => g.isActive).length,
      totalMembers: groups.reduce((sum, g) => sum + g.memberCount, 0)
    });
  }

  calculateAvgOpenRate(campaigns: EmailCampaign[]): number {
    const sentCampaigns = campaigns.filter(c => c.status === 'sent' && c.recipients > 0);
    if (sentCampaigns.length === 0) return 0;
    const totalRate = sentCampaigns.reduce((sum, c) => sum + (c.opened / c.recipients), 0);
    return Math.round((totalRate / sentCampaigns.length) * 1000) / 10;
  }

  calculateAvgClickRate(campaigns: EmailCampaign[]): number {
    const sentCampaigns = campaigns.filter(c => c.status === 'sent' && c.recipients > 0);
    if (sentCampaigns.length === 0) return 0;
    const totalRate = sentCampaigns.reduce((sum, c) => sum + (c.clicked / c.recipients), 0);
    return Math.round((totalRate / sentCampaigns.length) * 1000) / 10;
  }

  openComposeDialog() {
    this.composeForm = {
      name: '',
      subject: '',
      content: '',
      templateId: '',
      recipients: [],
      groupIds: [],
      scheduledTime: ''
    };
    this.showComposeDialog.set(true);
  }

  applyTemplate(templateId: string) {
    const template = this.templates().find(t => t.id === templateId);
    if (template) {
      this.composeForm.subject = template.subject;
      this.composeForm.content = template.content || '';
      this.composeForm.name = template.name + ' Campaign';
    }
  }

  previewEmail() {
    // API call: POST /api/mail/preview/template
    const template = this.templates().find(t => t.id === this.composeForm.templateId);
    if (template) {
      let content = template.content || this.composeForm.content;
      // Replace placeholders with sample data
      content = content.replace(/\{\{name\}\}/g, 'John Doe');
      content = content.replace(/\{\{contest_name\}\}/g, 'Weekly Contest 348');
      content = content.replace(/\{\{discount\}\}/g, '30');
      content = content.replace(/\{\{badge\}\}/g, '100 Problems Solved');
      this.previewContent.set(content);
      this.showPreviewDialog.set(true);
    }
  }

  saveDraft() {
    // Would save to local storage or backend
    this.showComposeDialog.set(false);
    this.messageService.add({
      severity: 'info',
      summary: 'Draft Saved',
      detail: 'Campaign draft has been saved.'
    });
  }

  scheduleCampaign() {
    if (!this.composeForm.scheduledTime) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Schedule Required',
        detail: 'Please select a scheduled date and time.'
      });
      return;
    }

    this.apiService.scheduleEmail({
      name: this.composeForm.name,
      subject: this.composeForm.subject,
      content: this.composeForm.content,
      recipients: this.composeForm.recipients,
      groupIds: this.composeForm.groupIds,
      scheduledAt: this.composeForm.scheduledTime
    }).pipe(
      map(res => res?.data ?? res),
      catchError(() => of(null))
    ).subscribe(result => {
      this.showComposeDialog.set(false);
      this.messageService.add({
        severity: result ? 'success' : 'error',
        summary: result ? 'Campaign Scheduled' : 'Error',
        detail: result
          ? `Campaign scheduled for ${this.composeForm.scheduledTime}.`
          : 'Failed to schedule campaign.'
      });
      if (result) this.loadCampaigns();
    });
  }

  sendNow() {
    this.confirmationService.confirm({
      message: 'Send this campaign immediately?',
      header: 'Confirm Send',
      icon: 'pi pi-send',
      accept: () => {
        this.apiService.sendEmail({
          name: this.composeForm.name,
          subject: this.composeForm.subject,
          content: this.composeForm.content,
          recipients: this.composeForm.recipients,
          groupIds: this.composeForm.groupIds
        }).pipe(
          map(res => res?.data ?? res),
          catchError(() => of(null))
        ).subscribe(result => {
          this.showComposeDialog.set(false);
          this.messageService.add({
            severity: result ? 'success' : 'error',
            summary: result ? 'Campaign Sent' : 'Error',
            detail: result
              ? 'Campaign has been queued for immediate delivery.'
              : 'Failed to send campaign.'
          });
          if (result) this.loadCampaigns();
        });
      }
    });
  }

  viewCampaignStatus(campaign: EmailCampaign) {
    this.selectedCampaign.set(campaign);
    this.showStatusDialog.set(true);
  }

  duplicateCampaign(campaign: EmailCampaign) {
    this.composeForm = {
      name: campaign.name + ' (Copy)',
      subject: campaign.subject,
      content: '',
      templateId: '',
      recipients: [],
      groupIds: [],
      scheduledTime: ''
    };
    this.showComposeDialog.set(true);
  }

  cancelScheduled(campaign: EmailCampaign) {
    this.confirmationService.confirm({
      message: `Cancel scheduled campaign "${campaign.name}"?`,
      header: 'Cancel Campaign',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        // API call: DELETE /api/mail/schedule/{scheduleId}
        this.campaigns.update(c => c.map(camp => 
          camp.id === campaign.id ? { ...camp, status: 'draft' as const, scheduledAt: null } : camp
        ));
        this.messageService.add({
          severity: 'success',
          summary: 'Campaign Cancelled',
          detail: 'Scheduled campaign has been cancelled.'
        });
      }
    });
  }

  deleteCampaign(campaign: EmailCampaign) {
    this.confirmationService.confirm({
      message: `Delete campaign "${campaign.name}"?`,
      header: 'Delete Campaign',
      icon: 'pi pi-trash',
      accept: () => {
        this.campaigns.update(c => c.filter(camp => camp.id !== campaign.id));
        this.messageService.add({
          severity: 'success',
          summary: 'Campaign Deleted',
          detail: 'Campaign has been deleted.'
        });
      }
    });
  }

  // ===== TEMPLATES =====

  previewTemplate(template: EmailTemplate) {
    let content = template.content || '';
    // Replace placeholders with sample data
    content = content.replace(/\{\{name\}\}/g, 'John Doe');
    content = content.replace(/\{\{contest_name\}\}/g, 'Weekly Contest 348');
    content = content.replace(/\{\{start_time\}\}/g, '10:00 AM UTC');
    content = content.replace(/\{\{discount\}\}/g, '30');
    content = content.replace(/\{\{badge\}\}/g, '100 Problems Solved');
    content = content.replace(/\{\{problems_count\}\}/g, '25');
    
    this.previewSubject.set(template.subject.replace(/\{\{name\}\}/g, 'John Doe').replace(/\{\{badge\}\}/g, '100 Problems Solved').replace(/\{\{contest_name\}\}/g, 'Weekly Contest 348'));
    this.previewContent.set(content);
    this.showPreviewDialog.set(true);
  }

  editTemplate(template: EmailTemplate) {
    this.selectedTemplate.set(template);
    this.templateEditForm = {
      id: template.id,
      name: template.name,
      subject: template.subject,
      category: template.category,
      content: template.content || ''
    };
    this.showTemplateEditDialog.set(true);
  }

  duplicateTemplate(template: EmailTemplate) {
    const newTemplate: EmailTemplate = {
      id: 'tpl_' + Date.now(),
      name: template.name + ' (Copy)',
      subject: template.subject,
      category: template.category,
      content: template.content
    };
    this.templates.update(templates => [...templates, newTemplate]);
    this.messageService.add({
      severity: 'success',
      summary: 'Template Duplicated',
      detail: `Template "${template.name}" has been duplicated.`
    });
  }

  saveTemplate() {
    const templateId = this.templateEditForm.id;
    this.templates.update(templates => 
      templates.map(t => t.id === templateId ? {
        ...t,
        name: this.templateEditForm.name,
        subject: this.templateEditForm.subject,
        category: this.templateEditForm.category,
        content: this.templateEditForm.content
      } : t)
    );
    this.showTemplateEditDialog.set(false);
    this.messageService.add({
      severity: 'success',
      summary: 'Template Saved',
      detail: `Template "${this.templateEditForm.name}" has been updated.`
    });
  }

  // ===== UTILITIES =====
  
  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'sent': return 'success';
      case 'scheduled': return 'info';
      case 'sending': return 'warn';
      case 'draft': return 'secondary';
      case 'failed': return 'danger';
      default: return 'info';
    }
  }

  getHealthSeverity(status: string): 'success' | 'warn' | 'danger' {
    switch (status) {
      case 'healthy': return 'success';
      case 'degraded': return 'warn';
      default: return 'danger';
    }
  }

  getOpenRate(campaign: EmailCampaign): number {
    return campaign.recipients > 0 ? Math.round((campaign.opened / campaign.recipients) * 100) : 0;
  }

  getClickRate(campaign: EmailCampaign): number {
    return campaign.recipients > 0 ? Math.round((campaign.clicked / campaign.recipients) * 100) : 0;
  }

  getGroupOptions() {
    return this.mailGroups()
      .filter(g => g.isActive)
      .map(g => ({ label: `${g.name} (${g.memberCount})`, value: g.id }));
  }

  refreshData() {
    this.loading.set(true);
    this.loadData();
    this.loading.set(false);
    this.messageService.add({
      severity: 'success',
      summary: 'Refreshed',
      detail: 'Data has been refreshed.'
    });
  }
}
