import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/;

/**
 * Registration screen for new users.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="auth-shell">
      <div class="auth-card">
        <div class="auth-header">
          <p class="eyebrow">Nuevo registro</p>
          <h1>Crea tu cuenta</h1>
          <p class="subtle">Tu cuenta se activa al instante.</p>
        </div>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <label>
            Nombre
            <input type="text" formControlName="name" placeholder="Tu nombre" />
          </label>
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
          <button class="primary" type="submit" [disabled]="form.invalid || busy()">
            {{ busy() ? 'Creando...' : 'Crear cuenta' }}
          </button>
        </form>
        <p class="inline-link">
          Ya tienes cuenta? <a routerLink="/login">Inicia sesion</a>
        </p>
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
      </div>
    </section>
  `,
})
export class RegisterComponent {
  /**
   * Form builder for the registration form.
   */
  private readonly fb = inject(FormBuilder);
  /**
   * Auth service used to create the user.
   */
  private readonly auth = inject(AuthService);
  /**
   * Router used to navigate after registration.
   */
  private readonly router = inject(Router);

  /**
   * Loading state while submitting the registration form.
   */
  busy = signal(false);
  /**
   * Error message to display on failed registration.
   */
  error = signal('');

  /**
   * Registration form controls.
   */
  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
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
   * Submit registration and navigate to the shop on success.
   */
  submit() {
    if (this.form.invalid || this.busy()) {
      return;
    }
    this.error.set('');
    this.busy.set(true);
    const { name, email, password } = this.form.getRawValue();
    this.auth.register(name ?? '', email ?? '', password ?? '').subscribe({
      next: () => {
        this.busy.set(false);
        this.router.navigateByUrl('/shop');
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message ?? 'No pudimos crear la cuenta.');
      },
    });
  }
}
