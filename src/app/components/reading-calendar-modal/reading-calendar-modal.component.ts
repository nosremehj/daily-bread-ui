import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  NgZone,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { finalize } from 'rxjs/operators';
import { translocoToAngularLocale } from '../../core/i18n/angular-locale';
import { BookLoadingSpinnerComponent } from '../book-loading-spinner/book-loading-spinner.component';
import {
  CalendarDayDetailResponse,
  ReadingProgressService,
  TodayReadingBlock,
} from '../../services/reading-progress.service';
import { VerseFavorite, VerseFavoritesService } from '../../services/verse-favorites.service';

export interface CalendarCell {
  date: string;
  dayNum: number;
  inMonth: boolean;
  read: boolean | null;
  /** Leitura na data, mas com atraso em relação ao dia do plano. */
  readWithDelay: boolean;
}

function toIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

@Component({
  selector: 'app-reading-calendar-modal',
  standalone: true,
  imports: [CommonModule, TranslocoPipe, BookLoadingSpinnerComponent],
  templateUrl: './reading-calendar-modal.component.html',
  styleUrl: './reading-calendar-modal.component.scss'
})
export class ReadingCalendarModalComponent implements OnChanges {
  private readonly readingProgress = inject(ReadingProgressService);
  private readonly verseFavorites = inject(VerseFavoritesService);
  private readonly ngZone = inject(NgZone);
  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly weekdayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

  constructor() {
    this.transloco.langChanges$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.open) {
        this.fetchMonth();
      }
    });
  }

  @Input() open = false;

  @Output() openChange = new EventEmitter<boolean>();

  /** Abrir leitura do plano com `readDate` = data civil selecionada no calendário. */
  @Output() openPlanReading = new EventEmitter<{
    block: TodayReadingBlock;
    referenceDate: string;
    /** Recuperação a partir do calendário: enviar `readWithDelay` ao marcar leitura. */
    readWithDelay: boolean;
  }>();

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly viewYear = signal(new Date().getFullYear());
  readonly viewMonth = signal(new Date().getMonth());
  readonly cells = signal<CalendarCell[]>([]);
  readonly monthTitle = signal('');

  readonly selectedDate = signal<string | null>(null);
  readonly dayFavorites = signal<VerseFavorite[]>([]);
  readonly dayFavoritesLoading = signal(false);
  readonly dayFavoritesError = signal<string | null>(null);

  readonly dayDetail = signal<CalendarDayDetailResponse | null>(null);
  readonly dayDetailLoading = signal(false);
  readonly dayDetailError = signal<string | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      const now = new Date();
      this.viewYear.set(now.getFullYear());
      this.viewMonth.set(now.getMonth());
      this.errorMessage.set(null);
      this.selectedDate.set(null);
      this.dayFavorites.set([]);
      this.dayFavoritesError.set(null);
      this.dayDetail.set(null);
      this.dayDetailError.set(null);
      this.dayDetailLoading.set(false);
      this.fetchMonth();
    }
  }

  /** Chamado após registrar leitura no modal do plano para atualizar grade e detalhe do dia. */
  refreshAfterProgressUpdate(): void {
    if (!this.open) {
      return;
    }
    this.fetchMonth();
  }

  selectDay(date: string, inMonth: boolean, read: boolean | null): void {
    if (!inMonth) {
      return;
    }
    this.selectedDate.set(date);
    this.dayFavoritesLoading.set(true);
    this.dayFavoritesError.set(null);
    this.dayDetailError.set(null);

    if (read === true) {
      this.dayDetail.set(null);
      this.dayDetailLoading.set(false);
    } else {
      this.fetchDayDetail(date);
    }

    this.verseFavorites.listByReadingDate(date).subscribe({
      next: (rows) => {
        this.ngZone.run(() => {
          this.dayFavorites.set(rows);
          this.dayFavoritesLoading.set(false);
        });
      },
      error: (err: Error) => {
        this.ngZone.run(() => {
          this.dayFavorites.set([]);
          this.dayFavoritesError.set(err.message);
          this.dayFavoritesLoading.set(false);
        });
      }
    });
  }

  goToBlockReading(block: TodayReadingBlock, referenceDate: string): void {
    this.openPlanReading.emit({ block, referenceDate, readWithDelay: true });
  }

  private fetchDayDetail(date: string): void {
    this.dayDetailLoading.set(true);
    this.dayDetail.set(null);
    this.readingProgress
      .getCalendarDay(date)
      .pipe(
        finalize(() =>
          this.ngZone.run(() => {
            this.dayDetailLoading.set(false);
          })
        )
      )
      .subscribe({
        next: (row) => {
          this.ngZone.run(() => {
            this.dayDetail.set(row);
            this.dayDetailError.set(null);
          });
        },
        error: (err: Error) => {
          this.ngZone.run(() => {
            this.dayDetailError.set(err.message);
            this.dayDetail.set(null);
          });
        }
      });
  }

  private refreshSelectedDayDetailIfNeeded(): void {
    const sd = this.selectedDate();
    if (!sd) {
      return;
    }
    const cell = this.cells().find((c) => c.date === sd && c.inMonth);
    if (cell?.read === true) {
      this.dayDetail.set(null);
      this.dayDetailLoading.set(false);
      this.dayDetailError.set(null);
      return;
    }
    this.fetchDayDetail(sd);
  }

  blockTrackKey(block: TodayReadingBlock): string {
    const seg = block.segmentIndex ?? 0;
    return `${block.planDayId}:${seg}:${block.dayNumber}:${block.startChapter}:${block.endChapter}`;
  }

  cellForSelectedDate(): CalendarCell | null {
    const sd = this.selectedDate();
    if (!sd) {
      return null;
    }
    return this.cells().find((c) => c.date === sd && c.inMonth) ?? null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.close();
    }
  }

  onOverlayClick(): void {
    this.close();
  }

  prevMonth(): void {
    let m = this.viewMonth() - 1;
    let y = this.viewYear();
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    this.viewMonth.set(m);
    this.viewYear.set(y);
    this.fetchMonth();
  }

  nextMonth(): void {
    let m = this.viewMonth() + 1;
    let y = this.viewYear();
    if (m > 11) {
      m = 0;
      y += 1;
    }
    this.viewMonth.set(m);
    this.viewYear.set(y);
    this.fetchMonth();
  }

  close(): void {
    this.openChange.emit(false);
  }

  private fetchMonth(): void {
    const y = this.viewYear();
    const m = this.viewMonth();
    const fromD = new Date(y, m, 1);
    const toD = new Date(y, m + 1, 0);
    const from = toIsoLocal(fromD);
    const to = toIsoLocal(toD);

    const loc = translocoToAngularLocale(this.transloco.getActiveLang());
    this.monthTitle.set(
      new Intl.DateTimeFormat(loc, { month: 'long', year: 'numeric' }).format(fromD),
    );

    this.loading.set(true);
    this.errorMessage.set(null);

    this.readingProgress
      .getCalendar(from, to)
      .pipe(
        finalize(() =>
          this.ngZone.run(() => {
            this.loading.set(false);
          })
        )
      )
      .subscribe({
        next: (rows) => {
          this.ngZone.run(() => {
            const map = new Map<string, { read: boolean; readWithDelay: boolean }>();
            for (const r of rows) {
              map.set(r.date, { read: r.read, readWithDelay: r.readWithDelay ?? false });
            }
            this.cells.set(this.buildGrid(y, m, map));
            this.refreshSelectedDayDetailIfNeeded();
          });
        },
        error: (err: Error) => {
          this.ngZone.run(() => {
            this.errorMessage.set(err.message);
            this.cells.set([]);
          });
        }
      });
  }

  private buildGrid(
    year: number,
    month: number,
    byDate: Map<string, { read: boolean; readWithDelay: boolean }>,
  ): CalendarCell[] {
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid: CalendarCell[] = [];

    const pushCell = (iso: string, dayNum: number, inMonth: boolean) => {
      const st = byDate.get(iso);
      grid.push({
        date: iso,
        dayNum,
        inMonth,
        read: st !== undefined ? st.read : null,
        readWithDelay: st?.readWithDelay ?? false,
      });
    };

    for (let i = 0; i < startPad; i++) {
      const d = new Date(year, month, -startPad + 1 + i);
      pushCell(toIsoLocal(d), d.getDate(), false);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      pushCell(toIsoLocal(d), day, true);
    }

    let tail = 0;
    while (grid.length % 7 !== 0) {
      tail += 1;
      const d = new Date(year, month, daysInMonth + tail);
      pushCell(toIsoLocal(d), d.getDate(), false);
    }

    return grid;
  }
}
