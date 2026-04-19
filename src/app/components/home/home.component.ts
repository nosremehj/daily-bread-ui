import { CommonModule, formatDate } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  inject,
  NgZone,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { finalize } from 'rxjs/operators';
import {
  longWeekdayDateFormat,
  translocoToAngularLocale,
} from '../../core/i18n/angular-locale';
import { AuthService } from '../../services/auth.service';
import { BiblePreferencesService } from '../../services/bible-preferences.service';
import {
  ReadingProgressDashboard,
  ReadingProgressService,
  TodayBibleReading,
  TodayReadingBlock,
} from '../../services/reading-progress.service';
import { BookLoadingSpinnerComponent } from '../book-loading-spinner/book-loading-spinner.component';
import { LanguageMenuComponent } from '../language-menu/language-menu.component';
import { PlanPassageModalComponent } from '../plan-passage-modal/plan-passage-modal.component';
import { ReadingCalendarModalComponent } from '../reading-calendar-modal/reading-calendar-modal.component';

function toIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

interface TodayReadingNav {
  commands: (string | number)[];
  queryParams: { verse: string };
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LanguageMenuComponent,
    BookLoadingSpinnerComponent,
    ReadingCalendarModalComponent,
    PlanPassageModalComponent,
    TranslocoPipe,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly auth = inject(AuthService);
  private readonly readingProgress = inject(ReadingProgressService);
  private readonly biblePrefs = inject(BiblePreferencesService);
  private readonly ngZone = inject(NgZone);
  private readonly transloco = inject(TranslocoService);

  readonly userName = computed(() => this.auth.getFirstName());

  readonly dashboard = signal<ReadingProgressDashboard | null>(null);
  readonly todayBible = signal<TodayBibleReading | null>(null);
  readonly bibleTodayLoading = signal(false);
  readonly bibleTodayError = signal<string | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly loading = signal(true);
  readonly calendarOpen = signal(false);

  readonly planPassageOpen = signal(false);
  readonly planPassageBlock = signal<TodayReadingBlock | null>(null);

  readonly ringCircumference = 2 * Math.PI * 48;

  readonly displayBlocks = computed(
    () => this.todayBible()?.blocks ?? this.dashboard()?.today.blocks ?? [],
  );

  /** Primeiro bloco do dia: usado para o dia “ativo” na semana. */
  readonly todayReadingNav = computed((): TodayReadingNav | null => {
    const blocks = this.displayBlocks();
    const b = blocks[0];
    if (b == null || b.bookNumber == null) {
      return null;
    }
    return {
      commands: ['/bible', this.biblePrefs.version(), b.bookNumber],
      queryParams: { verse: String(this.firstVerseForBlock(b)) },
    };
  });

  readonly headerDate = computed(() => {
    this.transloco.activeLang();
    const locale = translocoToAngularLocale(this.transloco.getActiveLang());
    const pattern = longWeekdayDateFormat(this.transloco.getActiveLang());
    const raw =
      this.todayBible()?.referenceDate ??
      this.dashboard()?.today?.referenceDate;
    if (raw) {
      const [y, m, day] = raw.split('-').map(Number);
      const dt = new Date(y, m - 1, day);
      return formatDate(dt, pattern, locale);
    }
    return formatDate(new Date(), pattern, locale);
  });

  /** Data civil usada pelo plano (para registrar leitura no modal). */
  readonly readingReferenceDate = computed(
    () =>
      this.todayBible()?.referenceDate ??
      this.dashboard()?.today.referenceDate ??
      null,
  );

  readonly ringDashOffset = computed(() => {
    const p = this.dashboard()?.annualProgressPercent ?? 0;
    const clamped = Math.min(100, Math.max(0, p));
    return this.ringCircumference * (1 - clamped / 100);
  });

  readonly progressPercentRounded = computed(() =>
    Math.round(this.dashboard()?.annualProgressPercent ?? 0),
  );

  constructor() {
    afterNextRender(() => {
      this.refreshDashboard();
      this.readingProgress.loadEnrollmentSummary();
    });
  }

  firstVerseForBlock(block: TodayReadingBlock): number {
    const chs = block.chapters;
    if (chs?.length && chs[0].verses?.length) {
      return chs[0].verses[0].verse;
    }
    return 1;
  }

  refreshDashboard(): void {
    const ref = toIsoLocal(new Date());
    this.loading.set(true);
    this.loadError.set(null);
    this.readingProgress
      .getDashboardOrNull(ref)
      .pipe(
        finalize(() =>
          this.ngZone.run(() => {
            this.loading.set(false);
          }),
        ),
      )
      .subscribe({
        next: (row) => {
          this.ngZone.run(() => {
            this.dashboard.set(row);
            this.loadError.set(null);
            if (row) {
              this.refreshTodayBible();
            } else {
              this.todayBible.set(null);
              this.bibleTodayError.set(null);
            }
          });
        },
        error: (err: Error) => {
          this.ngZone.run(() => {
            this.loadError.set(err.message);
            this.dashboard.set(null);
            this.todayBible.set(null);
          });
        },
      });
  }

  refreshTodayBible(): void {
    const dash = this.dashboard();
    if (!dash) {
      return;
    }
    const date = dash.today.referenceDate;
    const version = this.biblePrefs.version();
    this.bibleTodayLoading.set(true);
    this.bibleTodayError.set(null);
    this.readingProgress
      .getTodayBibleOrNull(version, date)
      .pipe(
        finalize(() =>
          this.ngZone.run(() => {
            this.bibleTodayLoading.set(false);
          }),
        ),
      )
      .subscribe({
        next: (row) => {
          this.ngZone.run(() => {
            this.todayBible.set(row);
            this.bibleTodayError.set(null);
          });
        },
        error: (err: Error) => {
          this.ngZone.run(() => {
            this.bibleTodayError.set(err.message);
            this.todayBible.set(null);
          });
        },
      });
  }

  openCalendar(): void {
    this.calendarOpen.set(true);
  }

  onCalendarOpenChange(open: boolean): void {
    this.calendarOpen.set(open);
    if (!open) {
      this.refreshDashboard();
    }
  }

  openPlanPassageModal(block: TodayReadingBlock): void {
    this.planPassageBlock.set(block);
    this.planPassageOpen.set(true);
  }

  onPlanPassageOpenChange(open: boolean): void {
    this.planPassageOpen.set(open);
    if (!open) {
      this.planPassageBlock.set(null);
    }
  }

  onPlanReadingConfirmed(): void {
    this.refreshDashboard();
  }
}
