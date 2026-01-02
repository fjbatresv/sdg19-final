import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

/**
 * Enforces the frontend password complexity requirements.
 */
const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/;

/**
 * Registration screen for new users.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
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
   * Domain used in email placeholders.
   */
  readonly frontendDomain = environment.frontendDomain;

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
