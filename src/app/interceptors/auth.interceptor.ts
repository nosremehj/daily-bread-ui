import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Rotas em que 401 não deve disparar refresh+retry (credenciais incorretas, etc.). */
function isAuthUrlExemptFromRefresh(url: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/change-password')
  );
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  const token = auth.getAccessToken();
  let outgoing = req;
  if (token && !req.headers.has('Authorization')) {
    outgoing = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(outgoing).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || isAuthUrlExemptFromRefresh(req.url)) {
        return throwError(() => err);
      }
      if (req.headers.get('X-Auth-Retry')) {
        auth.logout();
        return throwError(() => err);
      }
      return auth.refreshSession().pipe(
        switchMap((newAccess) =>
          next(
            req.clone({
              setHeaders: {
                Authorization: `Bearer ${newAccess}`,
                'X-Auth-Retry': '1'
              }
            })
          )
        ),
        catchError((refreshErr) => {
          auth.logout();
          return throwError(() => refreshErr);
        })
      );
    })
  );
};
