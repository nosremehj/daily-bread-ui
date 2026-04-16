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
import { ReadingProgressService } from '../../services/reading-progress.service';

export interface CalendarCell {
  date: string;
  dayNum: number;
  inMonth: boolean;
  read: boolean | null;
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
  imports: [CommonModule, TranslocoPipe],
  templateUrl: './reading-calendar-modal.component.html',
  styleUrl: './reading-calendar-modal.component.scss'
})
export class ReadingCalendarModalComponent implements OnChanges {
  private readonly readingProgress = inject(ReadingProgressService);
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

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly viewYear = signal(new Date().getFullYear());
  readonly viewMonth = signal(new Date().getMonth());
  readonly cells = signal<CalendarCell[]>([]);
  readonly monthTitle = signal('');

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      const now = new Date();
      this.viewYear.set(now.getFullYear());
      this.viewMonth.set(now.getMonth());
      this.errorMessage.set(null);
      this.fetchMonth();
    }
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
            const map = new Map<string, boolean>();
            for (const r of rows) {
              map.set(r.date, r.read);
            }
            this.cells.set(this.buildGrid(y, m, map));
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

  private buildGrid(year: number, month: number, readByDate: Map<string, boolean>): CalendarCell[] {
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid: CalendarCell[] = [];

    for (let i = 0; i < startPad; i++) {
      const d = new Date(year, month, -startPad + 1 + i);
      const iso = toIsoLocal(d);
      grid.push({
        date: iso,
        dayNum: d.getDate(),
        inMonth: false,
        read: readByDate.has(iso) ? readByDate.get(iso)! : null
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const iso = toIsoLocal(d);
      grid.push({
        date: iso,
        dayNum: day,
        inMonth: true,
        read: readByDate.has(iso) ? readByDate.get(iso)! : null
      });
    }

    let tail = 0;
    while (grid.length % 7 !== 0) {
      tail += 1;
      const d = new Date(year, month, daysInMonth + tail);
      const iso = toIsoLocal(d);
      grid.push({
        date: iso,
        dayNum: d.getDate(),
        inMonth: false,
        read: readByDate.has(iso) ? readByDate.get(iso)! : null
      });
    }

    return grid;
  }
}
