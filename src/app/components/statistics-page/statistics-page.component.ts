import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  inject,
  NgZone,
  signal
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { LocaleDatePipe } from '../../core/i18n/locale-date.pipe';
import { LanguageMenuComponent } from '../language-menu/language-menu.component';
import {
  ReadingProgressService,
  ReadingStatistics
} from '../../services/reading-progress.service';

function toIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseIsoLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function inclusiveDayCount(fromIso: string, toIso: string): number {
  const a = parseIsoLocal(fromIso);
  const b = parseIsoLocal(toIso);
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
}

function eachDayInRange(fromIso: string, toIso: string): string[] {
  const out: string[] = [];
  let cur = parseIsoLocal(fromIso);
  const end = parseIsoLocal(toIso);
  while (cur <= end) {
    out.push(toIsoLocal(cur));
    cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
  }
  return out;
}

const MAX_RANGE_DAYS = 366;

export type StatisticsPreset = 'default' | 'last30' | 'month' | 'year';

@Component({
  selector: 'app-statistics-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslocoPipe, LocaleDatePipe, LanguageMenuComponent],
  templateUrl: './statistics-page.component.html',
  styleUrl: './statistics-page.component.scss'
})
export class StatisticsPageComponent {
  private readonly readingProgress = inject(ReadingProgressService);
  private readonly ngZone = inject(NgZone);

  readonly maxRangeDays = MAX_RANGE_DAYS;

  readonly stats = signal<ReadingStatistics | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly preset = signal<StatisticsPreset>('default');
  readonly customFrom = signal('');
  readonly customTo = signal('');
  readonly clientRangeError = signal<'bothRequired' | 'order' | 'maxDays' | null>(null);

  readonly heatmapDays = computed(() => {
    const s = this.stats();
    if (s == null) {
      return [] as { date: string; read: boolean }[];
    }
    const read = new Set(s.readDatesInPeriod);
    return eachDayInRange(s.periodFrom, s.periodTo).map((date) => ({
      date,
      read: read.has(date)
    }));
  });

  constructor() {
    afterNextRender(() => {
      this.readingProgress.loadEnrollmentSummary();
      this.loadStatistics();
    });
  }

  applyPreset(p: StatisticsPreset): void {
    this.preset.set(p);
    this.clientRangeError.set(null);
    const today = new Date();
    const todayIso = toIsoLocal(today);

    if (p === 'default') {
      this.customFrom.set('');
      this.customTo.set('');
      this.loadStatistics();
      return;
    }

    if (p === 'last30') {
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29);
      this.loadStatistics(toIsoLocal(start), todayIso);
      return;
    }

    if (p === 'month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      this.loadStatistics(toIsoLocal(start), toIsoLocal(end));
      return;
    }

    if (p === 'year') {
      const y = today.getFullYear();
      this.loadStatistics(`${y}-01-01`, `${y}-12-31`);
    }
  }

  applyCustomRange(): void {
    const from = this.customFrom().trim();
    const to = this.customTo().trim();
    this.clientRangeError.set(null);
    if (!from || !to) {
      this.clientRangeError.set('bothRequired');
      return;
    }
    if (parseIsoLocal(from) > parseIsoLocal(to)) {
      this.clientRangeError.set('order');
      return;
    }
    const n = inclusiveDayCount(from, to);
    if (n > MAX_RANGE_DAYS) {
      this.clientRangeError.set('maxDays');
      return;
    }
    this.preset.set('default');
    this.loadStatistics(from, to);
  }

  private loadStatistics(from?: string, to?: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.readingProgress
      .getStatisticsOrNull(from, to)
      .pipe(
        finalize(() =>
          this.ngZone.run(() => {
            this.loading.set(false);
          })
        )
      )
      .subscribe({
        next: (row) => {
          this.ngZone.run(() => {
            this.stats.set(row);
            if (row) {
              this.customFrom.set(row.periodFrom);
              this.customTo.set(row.periodTo);
            }
          });
        },
        error: (err: Error) => {
          this.ngZone.run(() => {
            this.stats.set(null);
            this.errorMessage.set(err.message);
          });
        }
      });
  }
}
