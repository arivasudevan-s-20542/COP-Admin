import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// PrimeNG
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';

import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    CheckboxModule,
    MessageModule
  ],
  template: `
    <div class="login-container">
      <div class="login-card">
        <!-- Logo -->
        <div class="login-header">
          <div class="logo">
            <i class="pi pi-code"></i>
          </div>
          <h1>ZCOP Admin</h1>
          <p>Sign in to your admin account</p>
        </div>

        <!-- Login Form -->
        <form (ngSubmit)="onSubmit()" class="login-form">
          @if (errorMessage()) {
            <p-message severity="error" [text]="errorMessage()" styleClass="w-full mb-4" />
          }

          <div class="form-field">
            <label for="email">Email</label>
            <input 
              pInputText 
              id="email"
              type="email" 
              [(ngModel)]="email"
              name="email"
              placeholder="admin@cruscible.com"
              class="w-full"
              [disabled]="isLoading()"
            />
          </div>

          <div class="form-field">
            <label for="password">Password</label>
            <p-password 
              id="password"
              [(ngModel)]="password"
              name="password"
              placeholder="Enter your password"
              [feedback]="false"
              [toggleMask]="true"
              styleClass="w-full"
              inputStyleClass="w-full"
              [disabled]="isLoading()"
            />
          </div>

          <div class="form-options">
            <div class="remember-me">
              <p-checkbox 
                [(ngModel)]="rememberMe" 
                name="rememberMe"
                [binary]="true" 
                inputId="remember"
                [disabled]="isLoading()"
              />
              <label for="remember">Remember me</label>
            </div>
            <a href="#" class="forgot-link">Forgot password?</a>
          </div>

          <button 
            pButton 
            type="submit" 
            label="Sign In" 
            icon="pi pi-sign-in"
            class="w-full"
            [loading]="isLoading()"
            [disabled]="isLoading()"
          ></button>
        </form>

        <!-- Footer -->
        <div class="login-footer">
          <p>© 2025 ZCOP Platform. All rights reserved.</p>
        </div>
      </div>

      <!-- Background decoration -->
      <div class="bg-decoration">
        <div class="circle circle-1"></div>
        <div class="circle circle-2"></div>
        <div class="circle circle-3"></div>
      </div>
    </div>
  `,
  styles: [`
    @use 'sass:color';
    $primary-color: #0d59f2;
    $dark-bg: #0f172a;
    $card-bg: #1e293b;
    $border-color: #334155;
    $text-primary: #f8fafc;
    $text-secondary: #94a3b8;

    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: $dark-bg;
      padding: 1rem;
      position: relative;
      overflow: hidden;
    }

    .login-card {
      width: 100%;
      max-width: 420px;
      background: $card-bg;
      border-radius: 16px;
      padding: 2.5rem;
      border: 1px solid $border-color;
      position: relative;
      z-index: 10;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }

    .login-header {
      text-align: center;
      margin-bottom: 2rem;

      .logo {
        width: 64px;
        height: 64px;
        background: linear-gradient(135deg, $primary-color, color.adjust($primary-color, $lightness: 15%));
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1rem;
        box-shadow: 0 10px 30px rgba($primary-color, 0.3);

        i {
          font-size: 1.75rem;
          color: white;
        }
      }

      h1 {
        font-size: 1.5rem;
        font-weight: 700;
        color: $text-primary;
        margin: 0 0 0.5rem;
      }

      p {
        color: $text-secondary;
        font-size: 0.875rem;
        margin: 0;
      }
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      label {
        font-size: 0.875rem;
        font-weight: 500;
        color: $text-secondary;
      }

      :host ::ng-deep {
        .p-inputtext {
          background: rgba(0, 0, 0, 0.2);
          border-color: $border-color;
          color: $text-primary;

          &:focus {
            border-color: $primary-color;
            box-shadow: 0 0 0 2px rgba($primary-color, 0.2);
          }

          &::placeholder {
            color: rgba($text-secondary, 0.6);
          }
        }

        .p-password {
          width: 100%;
        }
      }
    }

    .form-options {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .remember-me {
        display: flex;
        align-items: center;
        gap: 0.5rem;

        label {
          font-size: 0.875rem;
          color: $text-secondary;
          cursor: pointer;
        }
      }

      .forgot-link {
        font-size: 0.875rem;
        color: $primary-color;
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }
    }

    .login-footer {
      margin-top: 2rem;
      text-align: center;

      p {
        font-size: 0.75rem;
        color: rgba($text-secondary, 0.6);
        margin: 0;
      }
    }

    .bg-decoration {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;

      .circle {
        position: absolute;
        border-radius: 50%;
        background: linear-gradient(135deg, rgba($primary-color, 0.1), rgba($primary-color, 0.05));

        &.circle-1 {
          width: 600px;
          height: 600px;
          top: -200px;
          right: -200px;
        }

        &.circle-2 {
          width: 400px;
          height: 400px;
          bottom: -100px;
          left: -100px;
        }

        &.circle-3 {
          width: 300px;
          height: 300px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.3;
        }
      }
    }

    :host ::ng-deep {
      .p-button {
        background: $primary-color;
        border-color: $primary-color;
        font-weight: 600;

        &:hover {
          background: color.adjust($primary-color, $lightness: -5%);
          border-color: color.adjust($primary-color, $lightness: -5%);
        }
      }

      .p-checkbox .p-checkbox-box {
        background: rgba(0, 0, 0, 0.2);
        border-color: $border-color;

        &.p-highlight {
          background: $primary-color;
          border-color: $primary-color;
        }
      }

      .p-message {
        background: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.3);
      }
    }
  `]
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  email = '';
  password = '';
  rememberMe = false;

  isLoading = signal(false);
  errorMessage = signal('');

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.errorMessage.set('Please enter your email and password');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.loginWithCredentials(this.email, this.password, this.rememberMe).subscribe({
      next: (success) => {
        this.isLoading.set(false);
        if (success) {
          this.toast.success('Welcome back!', 'Login successful');
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage.set('Invalid email or password');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || err?.message || 'Login failed. Please check your credentials.');
      }
    });
  }
}
