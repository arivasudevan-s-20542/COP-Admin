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
import { ApiService } from '../../../core/api/api.service';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

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
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: string;
}

@Component({
  selector: 'app-bulk-email',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, ButtonModule, InputTextModule, Select, TagModule, TableModule, TooltipModule, DialogModule, TextareaModule, MultiSelect, EditorModule],
  templateUrl: './bulk-email.component.html',
  styleUrls: ['./bulk-email.component.scss']
})
export class BulkEmailComponent implements OnInit {
  private apiService = inject(ApiService);

  campaigns = signal<EmailCampaign[]>([]);
  templates = signal<EmailTemplate[]>([]);
  showComposeDialog = signal(false);

  // Compose form
  campaignName = '';
  emailSubject = '';
  emailContent = '';
  selectedAudience: string[] = [];
  selectedTemplate = '';
  scheduledDate: Date | null = null;

  audienceOptions = [
    { label: 'All Users', value: 'all' },
    { label: 'Premium Users', value: 'premium' },
    { label: 'Free Users', value: 'free' },
    { label: 'Contest Participants', value: 'contest' },
    { label: 'Inactive Users (30+ days)', value: 'inactive' },
    { label: 'New Users (Last 7 days)', value: 'new' }
  ];

  stats = signal({
    totalSent: 0,
    avgOpenRate: 0,
    avgClickRate: 0,
    activeCampaigns: 0
  });

  ngOnInit() { this.loadCampaigns(); this.loadTemplates(); }

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
          createdAt: c.createdAt ?? ''
        })) as EmailCampaign[];
      }),
      catchError(() => of([] as EmailCampaign[]))
    ).subscribe(campaigns => {
      this.campaigns.set(campaigns);
      this.deriveStats(campaigns);
    });
  }

  private deriveStats(campaigns: EmailCampaign[]) {
    const sentCampaigns = campaigns.filter(c => c.status === 'sent' && c.recipients > 0);
    const totalSent = campaigns.reduce((sum, c) => sum + c.recipients, 0);
    const avgOpenRate = sentCampaigns.length > 0
      ? Math.round(sentCampaigns.reduce((sum, c) => sum + (c.opened / c.recipients) * 100, 0) / sentCampaigns.length * 10) / 10
      : 0;
    const avgClickRate = sentCampaigns.length > 0
      ? Math.round(sentCampaigns.reduce((sum, c) => sum + (c.clicked / c.recipients) * 100, 0) / sentCampaigns.length * 10) / 10
      : 0;
    this.stats.set({
      totalSent,
      avgOpenRate,
      avgClickRate,
      activeCampaigns: campaigns.filter(c => c.status === 'sending' || c.status === 'scheduled').length
    });
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
          category: t.category ?? ''
        })) as EmailTemplate[];
      }),
      catchError(() => of([] as EmailTemplate[]))
    ).subscribe(templates => this.templates.set(templates));
  }

  openComposeDialog() { this.resetComposeForm(); this.showComposeDialog.set(true); }

  resetComposeForm() {
    this.campaignName = '';
    this.emailSubject = '';
    this.emailContent = '';
    this.selectedAudience = [];
    this.selectedTemplate = '';
    this.scheduledDate = null;
  }

  applyTemplate(templateId: string) {
    const template = this.templates().find(t => t.id === templateId);
    if (template) {
      this.emailSubject = template.subject;
      this.campaignName = template.name;
    }
  }

  saveDraft() {
    this.showComposeDialog.set(false);
  }

  scheduleCampaign() {
    this.apiService.scheduleEmail({
      name: this.campaignName,
      subject: this.emailSubject,
      content: this.emailContent,
      audience: this.selectedAudience,
      scheduledAt: this.scheduledDate
    }).pipe(
      map(res => res?.data ?? res),
      catchError(() => of(null))
    ).subscribe(result => {
      this.showComposeDialog.set(false);
      if (result) this.loadCampaigns();
    });
  }

  sendNow() {
    this.apiService.sendEmail({
      name: this.campaignName,
      subject: this.emailSubject,
      content: this.emailContent,
      audience: this.selectedAudience
    }).pipe(
      map(res => res?.data ?? res),
      catchError(() => of(null))
    ).subscribe(result => {
      this.showComposeDialog.set(false);
      if (result) this.loadCampaigns();
    });
  }

  duplicateCampaign(campaign: EmailCampaign) {
    this.campaignName = campaign.name + ' (Copy)';
    this.emailSubject = campaign.subject;
    this.showComposeDialog.set(true);
  }

  deleteCampaign(campaign: EmailCampaign) {
    this.campaigns.update(c => c.filter(x => x.id !== campaign.id));
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (status) { case 'sent': return 'success'; case 'scheduled': return 'info'; case 'sending': return 'warn'; case 'draft': return 'info'; default: return 'danger'; }
  }

  getOpenRate(campaign: EmailCampaign): number {
    return campaign.recipients > 0 ? Math.round((campaign.opened / campaign.recipients) * 100) : 0;
  }

  getClickRate(campaign: EmailCampaign): number {
    return campaign.recipients > 0 ? Math.round((campaign.clicked / campaign.recipients) * 100) : 0;
  }

  getEstimatedRecipients(): number {
    let count = 0;
    if (this.selectedAudience.includes('all')) return 45000;
    if (this.selectedAudience.includes('premium')) count += 12500;
    if (this.selectedAudience.includes('free')) count += 32500;
    if (this.selectedAudience.includes('contest')) count += 8500;
    if (this.selectedAudience.includes('inactive')) count += 5400;
    if (this.selectedAudience.includes('new')) count += 1200;
    return count;
  }
}
