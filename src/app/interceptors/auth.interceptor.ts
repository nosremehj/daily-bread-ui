import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, defer, finalize, share, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * O backend troca o refresh token a cada `/auth/refresh` (o antigo é apagado).
 * Várias requisições em paralelo com access expirado disparariam vários refreshes;
 * só o primeiro teria sucesso — os outros receberiam 401 no refresh e derrubariam a sessão.
 */
let refreshInFlight: Observable<string> | null = null;

function coalescedRefresh(auth: AuthService): Observable<string> {
  if (!refreshInFlight) {
    refreshInFlight = defer(() => auth.refreshSession()).pipe(
      share(),
      finalize(() => {
        refreshInFlight = null;
      }),
    );
  }
  return refreshInFlight;
}

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
      setHeaders: { Authorization: `Bearer ${token}` },
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
      return coalescedRefresh(auth).pipe(
        switchMap((newAccess) =>
          next(
            req.clone({
              setHeaders: {
                Authorization: `Bearer ${newAccess}`,
                'X-Auth-Retry': '1',
              },
            }),
          ),
        ),
        catchError((refreshErr) => {
          auth.logout();
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};
