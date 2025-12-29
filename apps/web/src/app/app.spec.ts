import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { API_BASE_URL } from './app.tokens';

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
      imports: [App, HttpClientTestingModule],
      providers: [
        provideRouter([]),
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
});
