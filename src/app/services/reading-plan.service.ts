import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ReadingPlanSummary {
  id: number;
  originalFilename: string;
  importedAt: string;
  dayCount: number;
}

export interface ReadingPlanCreated {
  id: number;
  originalFilename: string;
  importedAt: string;
  daysImported: number;
}

export interface ReadingDay {
  id: number;
  dayNumber: number;
  bookName: string;
  startChapter: number;
  endChapter: number;
  readingText: string;
  completed: boolean;
}

export interface ReadingPlanDetail {
  id: number;
  originalFilename: string;
  importedAt: string;
  days: ReadingDay[];
}

interface ApiErrorBody {
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class ReadingPlanService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/reading-plans`;

  list(): Observable<ReadingPlanSummary[]> {
    return this.http.get<ReadingPlanSummary[]>(this.baseUrl).pipe(
      catchError((err) => {
        const message = err?.message ?? 'Não foi possível carregar os planos.';
        return throwError(() => new Error(message));
      })
    );
  }

  getById(id: number): Observable<ReadingPlanDetail> {
    return this.http.get<ReadingPlanDetail>(`${this.baseUrl}/${id}`).pipe(
      catchError((err) => {
        const body = err?.error as ApiErrorBody | undefined;
        const message =
          typeof body?.error === 'string'
            ? body.error
            : err?.message ?? 'Não foi possível carregar o plano.';
        return throwError(() => new Error(message));
      })
    );
  }

  uploadPdf(file: File): Observable<ReadingPlanCreated> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<ReadingPlanCreated>(this.baseUrl, formData).pipe(
      catchError((err) => {
        const body = err?.error as ApiErrorBody | undefined;
        const message =
          typeof body?.error === 'string'
            ? body.error
            : err?.message ?? 'Não foi possível importar o PDF.';
        return throwError(() => new Error(message));
      })
    );
  }
}
