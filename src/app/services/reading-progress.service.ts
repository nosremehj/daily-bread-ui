import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
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
  /** Leitura na data civil, mas não o dia do plano previsto para essa data (atraso). */
  readWithDelay?: boolean;
}

export interface TodayReadingBlock {
  planDayId: number;
  /** Índice do bloco quando há vários trechos com o mesmo `planDayId` (texto legado). */
  segmentIndex?: number;
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
  /** ISO dates (dom–sáb da semana de referência) com leitura apenas com atraso. */
  readWithDelayDatesInReferenceWeek?: string[];
  today: TodayReadingSection;
}

export interface CalendarDayRead {
  date: string;
  read: boolean;
  /** `true` quando houve registro na data, mas não a leitura agendada para esse dia (atraso). */
  readWithDelay?: boolean;
}

/** Resposta de `GET /reading-progress/calendar/day?date=`. */
export interface CalendarDayDetailResponse {
  date: string;
  read: boolean;
  readWithDelay?: boolean;
  scheduledDayNumber: number | null;
  scheduledDate: string | null;
  dayCompleted: boolean;
  blocks: TodayReadingBlock[];
}

export interface MarkDayReadRequest {
  dayNumber: number;
  readDate: string | null;
  /** Se enviado, marca só este trecho; omitir marca o dia inteiro (catch-up / legado). */
  readingPlanDayId?: number;
  segmentIndex?: number;
  /**
   * `true` = recuperação/atraso (calendário e streak tratam como fora do prazo mesmo com `readDate` no slot).
   * Omitir = backend infere por `readDate` ≠ data agendada do dia.
   */
  readWithDelay?: boolean;
}

export interface CatchUpDateRangeRequest {
  fromInclusive: string;
  toInclusive: string;
}

export interface CatchUpDateRangesRequest {
  ranges: CatchUpDateRangeRequest[];
}

/** Resposta de `GET /reading-progress/statistics`. */
export interface ReadingStatistics {
  planId: number;
  planFilename: string;
  planStartDate: string;
  periodFrom: string;
  periodTo: string;
  totalPlanDays: number;
  completedDaysInPlan: number;
  daysReadInPeriod: number;
  daysMissedInPeriod: number;
  /** Quando ausente (API antiga), o front pode usar `daysMissedInPeriod > 0`. */
  hasMissedDaysInPeriod?: boolean;
  currentStreakDays: number;
  longestStreakDays: number;
  annualProgressPercent: number;
  readDatesInPeriod: string[];
  /** ISO dates no período com leitura registrada apenas com atraso. */
  readWithDelayDatesInPeriod?: string[];
  /** Contagens alinhadas ao calendário (API nova); opcional para compatibilidade. */
  daysReadOnTimeInPeriod?: number;
  daysReadWithDelayInPeriod?: number;
  /** ISO — dias lidos no prazo (heatmap / tooltips). */
  readOnTimeDatesInPeriod?: string[];
  /** ISO — dias agendados sem leitura na data (alinhado a `daysMissedInPeriod`). */
  missedScheduledDatesInPeriod?: string[];
  nextMilestonePercent: number | null;
  daysUntilNextMilestone: number | null;
}

interface ApiErrorBody {
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class ReadingProgressService {
  private readonly http = inject(HttpClient);
  private readonly transloco = inject(TranslocoService);
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
        return throwError(() => this.toError(err, 'common.errors.loadEnrollment'));
      })
    );
  }

  enroll(body: EnrollRequest): Observable<EnrollmentSummary> {
    return this.http.post<EnrollmentSummary>(`${this.baseUrl}/enrollment`, body).pipe(
      tap((row) => this.enrollmentSummary.set(row)),
      catchError((err) => throwError(() => this.toError(err, 'common.errors.completeEnrollment')))
    );
  }

  deleteEnrollment(): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/enrollment`).pipe(
      tap(() => this.enrollmentSummary.set(null)),
      catchError((err) => throwError(() => this.toError(err, 'common.errors.endEnrollment')))
    );
  }

  getDashboard(referenceDate: string): Observable<ReadingProgressDashboard> {
    return this.http
      .get<ReadingProgressDashboard>(`${this.baseUrl}/dashboard`, {
        params: { date: referenceDate }
      })
      .pipe(
        catchError((err) =>
          throwError(() => this.toError(err, 'common.errors.loadDashboard'))
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
          return throwError(() => this.toError(err, 'common.errors.loadDashboard'));
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
          throwError(() => this.toError(err, 'common.errors.loadTodayReading'))
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
            this.toError(err, 'common.errors.loadTodayReading')
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
          throwError(() => this.toError(err, 'common.errors.loadCalendar'))
        )
      );
  }

  /** Detalhe de um dia civil para o painel do calendário (trechos agendados, flags). */
  getCalendarDay(date: string): Observable<CalendarDayDetailResponse> {
    return this.http
      .get<CalendarDayDetailResponse>(`${this.baseUrl}/calendar/day`, {
        params: { date }
      })
      .pipe(
        catchError((err) =>
          throwError(() => this.toError(err, 'common.errors.loadCalendar'))
        )
      );
  }

  /** Calendário de leitura para todos os dias de um ano civil (heatmap anual). */
  getCalendarYear(year: number): Observable<CalendarDayRead[]> {
    return this.http
      .get<CalendarDayRead[]>(`${this.baseUrl}/calendar/year`, {
        params: { year: String(year) }
      })
      .pipe(
        catchError((err) =>
          throwError(() => this.toError(err, 'common.errors.loadYearCalendar'))
        )
      );
  }

  getStatistics(from?: string, to?: string): Observable<ReadingStatistics> {
    let params = new HttpParams();
    if (from) {
      params = params.set('from', from);
    }
    if (to) {
      params = params.set('to', to);
    }
    return this.http.get<ReadingStatistics>(`${this.baseUrl}/statistics`, { params }).pipe(
      catchError((err) =>
        throwError(() => this.toError(err, 'common.errors.loadStatistics'))
      )
    );
  }

  /** `null` quando não há matrícula ativa (404). */
  getStatisticsOrNull(from?: string, to?: string): Observable<ReadingStatistics | null> {
    let params = new HttpParams();
    if (from) {
      params = params.set('from', from);
    }
    if (to) {
      params = params.set('to', to);
    }
    return this.http.get<ReadingStatistics>(`${this.baseUrl}/statistics`, { params }).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) {
          return of(null);
        }
        return throwError(() => this.toError(err, 'common.errors.loadStatistics'));
      })
    );
  }

  markDayRead(body: MarkDayReadRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/days/read`, body).pipe(
      catchError((err) => throwError(() => this.toError(err, 'common.errors.recordReading')))
    );
  }

  catchUpDateRange(body: CatchUpDateRangeRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/catch-up/date-range`, body).pipe(
      catchError((err) =>
        throwError(() => this.toError(err, 'common.errors.applyReadingPeriod'))
      )
    );
  }

  catchUpDateRanges(body: CatchUpDateRangesRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/catch-up/date-ranges`, body).pipe(
      catchError((err) =>
        throwError(() => this.toError(err, 'common.errors.applyReadingPeriod'))
      )
    );
  }

  /** Remove marcação de leitura do dia do plano (idempotente). */
  unmarkDayRead(dayNumber: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/days/${dayNumber}/read`).pipe(
      catchError((err) => throwError(() => this.toError(err, 'common.errors.unmarkReading')))
    );
  }

  /** Remove a conclusão de um trecho (`segmentIndex` omitido ou 0 = primeiro bloco). */
  unmarkPlanDayRead(planDayId: number, segmentIndex = 0): Observable<void> {
    let params = new HttpParams();
    if (segmentIndex !== 0) {
      params = params.set('segmentIndex', String(segmentIndex));
    }
    return this.http
      .delete<void>(`${this.baseUrl}/plan-days/${planDayId}/read`, { params })
      .pipe(
        catchError((err) => throwError(() => this.toError(err, 'common.errors.unmarkReading')))
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
