import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

export type ToastSeverity = 'success' | 'info' | 'warning' | 'error';
export type ToastPosition = 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center';

export interface Toast {
  id: string;
  severity: ToastSeverity;
  summary: string;
  detail?: string;
  life?: number;
  closable?: boolean;
  icon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new Subject<Toast>();
  public toast$ = this.toastSubject.asObservable();
  
  // Signals for reactive state
  public toasts = signal<Toast[]>([]);
  public position = signal<ToastPosition>('top-right');

  private defaultLife = 5000; // 5 seconds

  /**
   * Show a success toast notification
   */
  success(summary: string, detail?: string, life?: number): void {
    this.show({
      severity: 'success',
      summary,
      detail,
      life: life || this.defaultLife,
      closable: true,
      icon: 'pi pi-check-circle'
    });
  }

  /**
   * Show an info toast notification
   */
  info(summary: string, detail?: string, life?: number): void {
    this.show({
      severity: 'info',
      summary,
      detail,
      life: life || this.defaultLife,
      closable: true,
      icon: 'pi pi-info-circle'
    });
  }

  /**
   * Show a warning toast notification
   */
  warning(summary: string, detail?: string, life?: number): void {
    this.show({
      severity: 'warning',
      summary,
      detail,
      life: life || this.defaultLife,
      closable: true,
      icon: 'pi pi-exclamation-triangle'
    });
  }

  /**
   * Show an error toast notification
   */
  error(summary: string, detail?: string, life?: number): void {
    this.show({
      severity: 'error',
      summary,
      detail,
      life: life || this.defaultLife,
      closable: true,
      icon: 'pi pi-times-circle'
    });
  }

  /**
   * Show a custom toast notification
   */
  show(toast: Omit<Toast, 'id'>): void {
    const newToast: Toast = {
      ...toast,
      id: this.generateId(),
      life: toast.life || this.defaultLife,
      closable: toast.closable !== false
    };

    // Add new toast at the beginning
    this.toasts.update(toasts => [newToast, ...toasts]);
    this.toastSubject.next(newToast);

    // Auto remove after life duration
    if (newToast.life && newToast.life > 0) {
      setTimeout(() => {
        this.remove(newToast.id);
      }, newToast.life);
    }
  }

  /**
   * Remove a specific toast by ID
   */
  remove(id: string): void {
    this.toasts.update(toasts => toasts.filter(t => t.id !== id));
  }

  /**
   * Clear all toasts
   */
  clear(): void {
    this.toasts.set([]);
  }

  /**
   * Set toast position
   */
  setPosition(position: ToastPosition): void {
    this.position.set(position);
  }

  /**
   * Generate unique ID for toast
   */
  private generateId(): string {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
