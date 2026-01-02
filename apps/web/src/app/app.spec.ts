import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { App } from './app';
import { API_BASE_URL } from './app.tokens';
import { AuthService } from './services/auth.service';
import { of } from 'rxjs';

describe('App', () => {
  beforeEach(async () => {
    const storage: Storage = {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    };
    globalThis.localStorage = storage;

    await TestBed.configureTestingModule({
      imports: [App, HttpClientTestingModule, RouterTestingModule.withRoutes([])],
      providers: [
        {
          provide: API_BASE_URL,
          useValue: 'http://localhost',
        },
      ],
    }).compileComponents();
  });

  it('should render brand', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.brand')?.textContent).toContain(
      'SDG19 Final'
    );
  });

  it('logs out and redirects', async () => {
    const auth = { logout: vi.fn(), session$: of(null) };
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [App, HttpClientTestingModule, RouterTestingModule.withRoutes([])],
      providers: [
        { provide: API_BASE_URL, useValue: 'http://localhost' },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    fixture.componentInstance.logout();

    expect(auth.logout).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });
});
