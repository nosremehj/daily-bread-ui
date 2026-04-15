import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import type { BibleChapter } from './bible.service';
import type { BibleVersionCode } from './bible-preferences.service';

export type WeekDayStatus = 'COMPLETED' | 'ACTIVE' | 'UPCOMING' | 'MISSED';

export interface EnrollmentSummary {
  enrollmentId: number;
  planId: number;
  planFilename: string;
  planStartDate: string;
  enrolledAt: string;
}

export interface EnrollRequest {
  planId: number;
  planStartDate: string;
  catchUpThroughDate: string | null;
}

export interface WeekStripDay {
  date: string;
  dayOfMonth: number;
  weekdayLabel: string;
  status: WeekDayStatus;
}

export interface TodayReadingBlock {
  planDayId: number;
  dayNumber: number;
  bookName: string;
  startChapter: number;
  endChapter: number;
  readingText: string;
  completed: boolean;
  bookNumber?: number | null;
  bookAbbrev?: string | null;
  /** Preenchido em `GET today/bible` com o texto integral dos capítulos na versão pedida. */
  chapters?: BibleChapter[];
}

export interface TodayBibleReading {
  referenceDate: string;
  scheduledDayNumber: number | null;
  scheduledDate: string | null;
  versionId: string;
  dayCompleted: boolean;
  blocks: TodayReadingBlock[];
}

export interface TodayReadingSection {
  referenceDate: string;
  scheduledDayNumber: number | null;
  scheduledDate: string | null;
  blocks: TodayReadingBlock[];
}

export interface ReadingProgressDashboard {
  planId: number;
  planFilename: string;
  totalPlanDays: number;
  completedDays: number;
  annualProgressPercent: number;
  currentStreakDays: number;
  daysRemainingInYear: number;
  weekStrip: WeekStripDay[];
  today: TodayReadingSection;
}

export interface CalendarDayRead {
  date: string;
  read: boolean;
}

export interface MarkDayReadRequest {
  dayNumber: number;
  readDate: string | null;
}

export interface CatchUpDateRangeRequest {
  fromInclusive: string;
  toInclusive: string;
}

interface ApiErrorBody {
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class ReadingProgressService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/reading-progress`;

  /** Carregado pelo layout e após matrícula; `null` = sem matrícula ativa. */
  readonly enrollmentSummary = signal<EnrollmentSummary | null | undefined>(undefined);

  loadEnrollmentSummary(): void {
    this.http.get<EnrollmentSummary>(`${this.baseUrl}/enrollment`).subscribe({
      next: (row) => this.enrollmentSummary.set(row),
      error: (err: HttpErrorResponse) => {
        if (err.status === 404) {
          this.enrollmentSummary.set(null);
        }
      }
    });
  }

  getEnrollment(): Observable<EnrollmentSummary | null> {
    return this.http.get<EnrollmentSummary>(`${this.baseUrl}/enrollment`).pipe(
      map((row) => row),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) {
          return of(null);
        }
        return throwError(() => this.toError(err, 'Não foi possível carregar a matrícula.'));
      })
    );
  }

  enroll(body: EnrollRequest): Observable<EnrollmentSummary> {
    return this.http.post<EnrollmentSummary>(`${this.baseUrl}/enrollment`, body).pipe(
      tap((row) => this.enrollmentSummary.set(row)),
      catchError((err) => throwError(() => this.toError(err, 'Não foi possível concluir a matrícula.')))
    );
  }

  deleteEnrollment(): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/enrollment`).pipe(
      tap(() => this.enrollmentSummary.set(null)),
      catchError((err) => throwError(() => this.toError(err, 'Não foi possível encerrar a matrícula.')))
    );
  }

  getDashboard(referenceDate: string): Observable<ReadingProgressDashboard> {
    return this.http
      .get<ReadingProgressDashboard>(`${this.baseUrl}/dashboard`, {
        params: { date: referenceDate }
      })
      .pipe(
        catchError((err) =>
          throwError(() => this.toError(err, 'Não foi possível carregar o painel de leitura.'))
        )
      );
  }

  /** `null` quando não há matrícula ativa (404). */
  getDashboardOrNull(referenceDate: string): Observable<ReadingProgressDashboard | null> {
    return this.http
      .get<ReadingProgressDashboard>(`${this.baseUrl}/dashboard`, {
        params: { date: referenceDate }
      })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status === 404) {
            return of(null);
          }
          return throwError(() => this.toError(err, 'Não foi possível carregar o painel de leitura.'));
        })
      );
  }

  getTodayBible(version: BibleVersionCode, date: string): Observable<TodayBibleReading> {
    return this.http
      .get<TodayBibleReading>(`${this.baseUrl}/today/bible`, {
        params: { version, date }
      })
      .pipe(
        catchError((err) =>
          throwError(() => this.toError(err, 'Não foi possível carregar a leitura bíblica do dia.'))
        )
      );
  }

  getTodayBibleOrNull(version: BibleVersionCode, date: string): Observable<TodayBibleReading | null> {
    return this.http
      .get<TodayBibleReading>(`${this.baseUrl}/today/bible`, {
        params: { version, date }
      })
      .pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status === 404) {
            return of(null);
          }
          return throwError(() =>
            this.toError(err, 'Não foi possível carregar a leitura bíblica do dia.')
          );
        })
      );
  }

  getCalendar(from: string, to: string): Observable<CalendarDayRead[]> {
    return this.http
      .get<CalendarDayRead[]>(`${this.baseUrl}/calendar`, {
        params: { from, to }
      })
      .pipe(
        catchError((err) =>
          throwError(() => this.toError(err, 'Não foi possível carregar o calendário.'))
        )
      );
  }

  markDayRead(body: MarkDayReadRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/days/read`, body).pipe(
      catchError((err) => throwError(() => this.toError(err, 'Não foi possível registrar a leitura.')))
    );
  }

  catchUpDateRange(body: CatchUpDateRangeRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/catch-up/date-range`, body).pipe(
      catchError((err) =>
        throwError(() => this.toError(err, 'Não foi possível aplicar o período de leituras.'))
      )
    );
  }

  private toError(err: unknown, fallback: string): Error {
    const httpErr = err as HttpErrorResponse;
    const body = httpErr?.error as ApiErrorBody | undefined;
    const message =
      typeof body?.error === 'string'
        ? body.error
        : typeof httpErr?.message === 'string'
          ? httpErr.message
          : fallback;
    return new Error(message);
  }
}
