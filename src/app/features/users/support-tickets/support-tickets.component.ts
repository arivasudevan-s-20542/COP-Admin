import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { AvatarModule } from 'primeng/avatar';
import { ApiService } from '../../../core/api/api.service';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  category: 'bug' | 'feature' | 'account' | 'billing' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'waiting' | 'resolved' | 'closed';
  user: { name: string; email: string; avatar: string; };
  assignee: string | null;
  createdAt: string;
  updatedAt: string;
  messages: number;
}

interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  avgResponseTime: string;
}

@Component({
  selector: 'app-support-tickets',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CardModule, ButtonModule, TableModule,
    TagModule, InputTextModule, Select, TooltipModule, DialogModule,
    TextareaModule, AvatarModule
  ],
  templateUrl: './support-tickets.component.html',
  styleUrls: ['./support-tickets.component.scss']
})
export class SupportTicketsComponent implements OnInit {
  private apiService = inject(ApiService);

  stats = signal<TicketStats>({ total: 0, open: 0, inProgress: 0, resolved: 0, avgResponseTime: 'N/A' });
  tickets = signal<Ticket[]>([]);
  filteredTickets: Ticket[] = [];
  selectedStatus = signal('all');
  searchQuery = signal('');
  showTicketDialog = signal(false);
  selectedTicket = signal<Ticket | null>(null);
  replyMessage = '';

  statusOptions = [
    { label: 'All Tickets', value: 'all' },
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in-progress' },
    { label: 'Waiting', value: 'waiting' },
    { label: 'Resolved', value: 'resolved' },
    { label: 'Closed', value: 'closed' }
  ];

  assignees = ['John Admin', 'Jane Support', 'Mike Tech', 'Sarah Manager'];

  ngOnInit() { this.loadTickets(); this.loadStats(); }

  loadTickets() {
    this.apiService.getSupportTickets().pipe(
      map(res => {
        const data = res?.data ?? res;
        const list: any[] = Array.isArray(data) ? data : (data?.tickets ?? []);
        return list.map((t: any) => ({
          id: t.id ?? '',
          subject: t.subject ?? t.title ?? '',
          description: t.description ?? '',
          category: t.category ?? 'other',
          priority: t.priority ?? 'medium',
          status: t.status ?? 'open',
          user: {
            name: t.user?.name ?? t.userName ?? '',
            email: t.user?.email ?? t.userEmail ?? '',
            avatar: t.user?.avatar ?? ''
          },
          assignee: t.assignee ?? t.assignedTo ?? null,
          createdAt: t.createdAt ?? '',
          updatedAt: t.updatedAt ?? '',
          messages: t.messages ?? t.messageCount ?? 0
        })) as Ticket[];
      }),
      catchError(() => of([] as Ticket[]))
    ).subscribe(tickets => {
      this.tickets.set(tickets);
      this.applyFilters();
    });
  }

  loadStats() {
    this.apiService.getSupportStats().pipe(
      map(res => {
        const d = res?.data ?? res;
        return {
          total: d.total ?? 0,
          open: d.open ?? 0,
          inProgress: d.inProgress ?? 0,
          resolved: d.resolved ?? 0,
          avgResponseTime: d.avgResponseTime ?? 'N/A'
        } as TicketStats;
      }),
      catchError(() => of({ total: 0, open: 0, inProgress: 0, resolved: 0, avgResponseTime: 'N/A' } as TicketStats))
    ).subscribe(stats => this.stats.set(stats));
  }

  applyFilters() {
    let filtered = this.tickets();
    if (this.selectedStatus() !== 'all') filtered = filtered.filter(t => t.status === this.selectedStatus());
    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      filtered = filtered.filter(t => t.subject.toLowerCase().includes(q) || t.user.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
    }
    this.filteredTickets = filtered;
  }

  onStatusChange(event: any) { this.selectedStatus.set(event.value); this.applyFilters(); }
  onSearchChange(event: Event) { this.searchQuery.set((event.target as HTMLInputElement).value); this.applyFilters(); }

  viewTicket(ticket: Ticket) { this.selectedTicket.set(ticket); this.showTicketDialog.set(true); }

  updateStatus(ticket: Ticket, status: string) {
    this.apiService.updateSupportTicket(ticket.id, { status }).pipe(
      map(res => res?.data ?? res),
      catchError(() => of(null))
    ).subscribe(result => {
      if (result) {
        this.tickets.update(tickets => tickets.map(t => t.id === ticket.id ? { ...t, status: status as Ticket['status'], updatedAt: new Date().toISOString() } : t));
        this.applyFilters();
      }
    });
  }

  assignTicket(ticket: Ticket, assignee: string) {
    this.apiService.assignSupportTicket(ticket.id, { assignee }).pipe(
      map(res => res?.data ?? res),
      catchError(() => of(null))
    ).subscribe(result => {
      if (result) {
        this.tickets.update(tickets => tickets.map(t => t.id === ticket.id ? { ...t, assignee, status: 'in-progress' as const, updatedAt: new Date().toISOString() } : t));
        this.applyFilters();
      }
    });
  }

  sendReply() {
    if (!this.replyMessage.trim() || !this.selectedTicket()) return;
    const ticketId = this.selectedTicket()!.id;
    this.apiService.addTicketNote(ticketId, { message: this.replyMessage }).pipe(
      map(res => res?.data ?? res),
      catchError(() => of(null))
    ).subscribe(result => {
      if (result) {
        this.tickets.update(tickets => tickets.map(t => t.id === ticketId ? { ...t, messages: t.messages + 1, updatedAt: new Date().toISOString() } : t));
      }
      this.replyMessage = '';
    });
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (status) { case 'open': return 'danger'; case 'in-progress': return 'info'; case 'waiting': return 'warn'; case 'resolved': return 'success'; default: return 'info'; }
  }

  getPrioritySeverity(priority: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (priority) { case 'urgent': return 'danger'; case 'high': return 'warn'; case 'medium': return 'info'; default: return 'success'; }
  }

  getCategoryIcon(category: string): string {
    switch (category) { case 'bug': return 'pi-bug'; case 'feature': return 'pi-star'; case 'account': return 'pi-user'; case 'billing': return 'pi-credit-card'; default: return 'pi-question-circle'; }
  }

  getInitials(name: string): string { return name.split(' ').map(n => n[0]).join('').toUpperCase(); }
}
