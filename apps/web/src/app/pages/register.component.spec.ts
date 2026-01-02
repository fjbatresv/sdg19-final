import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { setupAuthComponentTest } from '../testing/auth-test-utils';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  it('submits registration and navigates on success', () => {
    const auth = { register: vi.fn(() => of({})) };

    setupAuthComponentTest(RegisterComponent, auth);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');

    const fixture = TestBed.createComponent(RegisterComponent);
    const component = fixture.componentInstance;
    component.form.setValue({
      name: 'User',
      email: 'user@test.com',
      password: 'Password!123',
    });

    component.submit();

    expect(auth.register).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith('/shop');
  });

  it('shows error on failed registration', () => {
    const auth = {
      register: vi.fn(() =>
        throwError(() => ({ error: { message: 'bad' } }))
      ),
    };
    setupAuthComponentTest(RegisterComponent, auth);

    const fixture = TestBed.createComponent(RegisterComponent);
    const component = fixture.componentInstance;
    component.form.setValue({
      name: 'User',
      email: 'user@test.com',
      password: 'Password!123',
    });

    component.submit();

    expect(component.error()).toBe('bad');
  });

  it('does not submit when form is invalid', () => {
    const auth = { register: vi.fn(() => of({})) };

    setupAuthComponentTest(RegisterComponent, auth);

    const fixture = TestBed.createComponent(RegisterComponent);
    const component = fixture.componentInstance;
    component.form.setValue({ name: '', email: '', password: '' });

    component.submit();

    expect(auth.register).not.toHaveBeenCalled();
  });

  it('uses default error message when missing', () => {
    const auth = { register: vi.fn(() => throwError(() => ({}))) };

    setupAuthComponentTest(RegisterComponent, auth);

    const fixture = TestBed.createComponent(RegisterComponent);
    const component = fixture.componentInstance;
    component.form.setValue({
      name: 'User',
      email: 'user@test.com',
      password: 'Password!123',
    });

    component.submit();

    expect(component.error()).toBe('No pudimos crear la cuenta.');
  });
});
