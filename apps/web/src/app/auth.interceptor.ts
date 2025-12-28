import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { switchMap } from 'rxjs';
import { AuthService } from './services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  return auth.getValidIdToken$().pipe(
    switchMap((token) => {
      if (!token || req.headers.has('authorization')) {
        return next(req);
      }
      return next(
        req.clone({
          setHeaders: {
            authorization: `Bearer ${token}`,
          },
        })
      );
    })
  );
};
