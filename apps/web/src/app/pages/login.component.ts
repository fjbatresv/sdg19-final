import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/;

/**
 * Login screen for existing users.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="auth-shell">
      <div class="auth-card">
        <div class="auth-header">
          <p class="eyebrow">Bienvenido de nuevo</p>
          <h1>Inicia sesion</h1>
          <p class="subtle">Accede para crear ordenes y ver tu historial.</p>
        </div>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <label>
            Correo
            <input
              type="email"
              formControlName="email"
              placeholder="correo@sdg19final.link"
            />
          </label>
          <label>
            Password
            <input type="password" formControlName="password" />
          </label>
          <button
            class="primary"
            type="submit"
            [disabled]="form.invalid || busy()"
          >
            {{ busy() ? 'Ingresando...' : 'Ingresar' }}
          </button>
        </form>
        <p class="inline-link">
          No tienes cuenta? <a routerLink="/register">Crear cuenta</a>
        </p>
        @if (error()) {
        <p class="error">{{ error() }}</p>
        }
      </div>
    </section>
  `,
})
export class LoginComponent {
  /**
   * Form builder for the login form.
   */
  private readonly fb = inject(FormBuilder);
  /**
   * Auth service used to authenticate the user.
   */
  private readonly auth = inject(AuthService);
  /**
   * Router used for navigation after login.
   */
  private readonly router = inject(Router);

  /**
   * Loading state while submitting the login form.
   */
  busy = signal(false);
  /**
   * Error message to display on failed login.
   */
  error = signal('');

  /**
   * Login form controls.
   */
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(10),
        Validators.pattern(PASSWORD_POLICY),
      ],
    ],
  });

  /**
   * Submit the login form and redirect on success.
   */
  submit() {
    if (this.form.invalid || this.busy()) {
      return;
    }
    this.error.set('');
    this.busy.set(true);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email ?? '', password ?? '').subscribe({
      next: () => {
        this.busy.set(false);
        this.router.navigateByUrl('/shop');
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message ?? 'No pudimos iniciar sesion.');
      },
    });
  }
}
