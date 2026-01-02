import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../services/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  it('submits credentials and navigates on success', () => {
    const auth = { login: vi.fn(() => of({})) };

    TestBed.configureTestingModule({
      imports: [LoginComponent, RouterTestingModule.withRoutes([])],
      providers: [{ provide: AuthService, useValue: auth }],
    });
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');

    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    component.form.setValue({
      email: 'user@test.com',
      password: 'Password!123',
    });

    component.submit();

    expect(auth.login).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith('/shop');
  });

  it('shows error on failed login', () => {
    const auth = {
      login: vi.fn(() =>
        throwError(() => ({ error: { message: 'bad' } }))
      ),
    };
    TestBed.configureTestingModule({
      imports: [LoginComponent, RouterTestingModule.withRoutes([])],
      providers: [{ provide: AuthService, useValue: auth }],
    });

    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    component.form.setValue({
      email: 'user@test.com',
      password: 'Password!123',
    });

    component.submit();

    expect(component.error()).toBe('bad');
  });

  it('does not submit when form is invalid', () => {
    const auth = { login: vi.fn(() => of({})) };

    TestBed.configureTestingModule({
      imports: [LoginComponent, RouterTestingModule.withRoutes([])],
      providers: [{ provide: AuthService, useValue: auth }],
    });

    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    component.form.setValue({ email: '', password: '' });

    component.submit();

    expect(auth.login).not.toHaveBeenCalled();
  });

  it('uses default error message when missing', () => {
    const auth = { login: vi.fn(() => throwError(() => ({}))) };

    TestBed.configureTestingModule({
      imports: [LoginComponent, RouterTestingModule.withRoutes([])],
      providers: [{ provide: AuthService, useValue: auth }],
    });

    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    component.form.setValue({
      email: 'user@test.com',
      password: 'Password!123',
    });

    component.submit();

    expect(component.error()).toBe('No pudimos iniciar sesion.');
  });
});
