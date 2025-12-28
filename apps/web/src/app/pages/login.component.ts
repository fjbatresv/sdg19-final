import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

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
          <button class="primary" type="submit" [disabled]="form.invalid || busy()">
            {{ busy() ? 'Ingresando...' : 'Ingresar' }}
          </button>
        </form>
        <p class="inline-link">
          No tienes cuenta? <a routerLink="/register">Crear cuenta</a>
        </p>
        <p class="error" *ngIf="error()">{{ error() }}</p>
      </div>
    </section>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  busy = signal(false);
  error = signal('');

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

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
