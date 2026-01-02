import { provideLocationMocks } from '@angular/common/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Configure TestBed for auth-related standalone components.
 */
export const setupAuthComponentTest = <T>(
  component: Type<T>,
  authServiceMock: Partial<AuthService>
) => {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [
      { provide: AuthService, useValue: authServiceMock },
      provideRouter([]),
      provideLocationMocks(),
    ],
  });

  return TestBed;
};
