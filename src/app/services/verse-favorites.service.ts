import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface VerseFavoriteCreateRequest {
  versionId: string;
  bookNumber: number;
  chapterNumber: number;
  verseNumber: number;
  readingDate: string;
}

/** Resposta de listagem/criação — campos extras dependem da API. */
export interface VerseFavorite {
  id: number;
  versionId: string;
  bookNumber: number;
  chapterNumber: number;
  verseNumber: number;
  readingDate: string;
  bookName?: string;
  verseText?: string;
  abbrev?: string;
}

interface ApiErrorBody {
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class VerseFavoritesService {
  private readonly http = inject(HttpClient);
  private readonly transloco = inject(TranslocoService);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/verse-favorites`;

  listByReadingDate(readingDate: string): Observable<VerseFavorite[]> {
    const params = new HttpParams().set('readingDate', readingDate);
    return this.http.get<VerseFavorite[] | { items?: VerseFavorite[] }>(this.baseUrl, { params }).pipe(
      map((raw) => (Array.isArray(raw) ? raw : raw.items ?? [])),
      catchError((err) => throwError(() => this.toError(err, 'common.errors.loadVerseFavorites')))
    );
  }

  create(body: VerseFavoriteCreateRequest): Observable<VerseFavorite> {
    return this.http.post<VerseFavorite>(this.baseUrl, body).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 409) {
          return throwError(
            () => new Error(this.transloco.translate('common.errors.verseFavoriteDuplicate'))
          );
        }
        return throwError(() => this.toError(err, 'common.errors.saveVerseFavorite'));
      })
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      catchError((err) => throwError(() => this.toError(err, 'common.errors.removeVerseFavorite')))
    );
  }

  private toError(err: unknown, fallbackKey: string): Error {
    const httpErr = err as HttpErrorResponse;
    const body = httpErr?.error as ApiErrorBody | undefined;
    const message =
      typeof body?.error === 'string'
        ? body.error
        : typeof httpErr?.message === 'string'
          ? httpErr.message
          : this.transloco.translate(fallbackKey);
    return new Error(message);
  }
}
