import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  inject,
  NgZone,
  signal
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { LocaleDatePipe } from '../../core/i18n/locale-date.pipe';
import { BookLoadingSpinnerComponent } from '../book-loading-spinner/book-loading-spinner.component';
import { LanguageMenuComponent } from '../language-menu/language-menu.component';
import {
  CatchUpDateRangeRequest,
  ReadingProgressService,
  ReadingStatistics
} from '../../services/reading-progress.service';
import {
  inclusiveDayCount,
  MAX_CATCH_UP_RANGE_DAYS,
  parseIsoLocal
} from '../../utils/date-range-validate';

function toIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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

const MAX_RANGE_DAYS = MAX_CATCH_UP_RANGE_DAYS;

export type StatisticsPreset = 'default' | 'last30' | 'month' | 'year';

/** Estados do heatmap alinhados à API (no prazo / atraso / não lido / fora do plano no intervalo). */
export type HeatmapCellKind = 'onTime' | 'delayed' | 'missed' | 'neutral';

export interface HeatmapDay {
  date: string;
  kind: HeatmapCellKind;
}

/** API com listas discriminadas para o período (heatmap não-binário). */
function hasDiscriminatedHeatmap(s: ReadingStatistics): boolean {
  return (
    s.readOnTimeDatesInPeriod != null ||
    s.readWithDelayDatesInPeriod != null ||
    s.missedScheduledDatesInPeriod != null
  );
}

/** Resumo em três faixas (cards) quando a API expõe contagens ou listas novas. */
function hasPeriodBreakdown(s: ReadingStatistics): boolean {
  return (
    s.daysReadOnTimeInPeriod != null ||
    s.daysReadWithDelayInPeriod != null ||
    s.readOnTimeDatesInPeriod != null ||
    s.missedScheduledDatesInPeriod != null
  );
}

@Component({
  selector: 'app-statistics-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslocoPipe,
    LocaleDatePipe,
    LanguageMenuComponent,
    BookLoadingSpinnerComponent,
  ],
  templateUrl: './statistics-page.component.html',
  styleUrl: './statistics-page.component.scss'
})
export class StatisticsPageComponent {
  private readonly readingProgress = inject(ReadingProgressService);
  private readonly ngZone = inject(NgZone);
  private readonly transloco = inject(TranslocoService);

  readonly maxRangeDays = MAX_RANGE_DAYS;

  readonly stats = signal<ReadingStatistics | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly preset = signal<StatisticsPreset>('default');
  readonly customFrom = signal('');
  readonly customTo = signal('');
  readonly clientRangeError = signal<'bothRequired' | 'order' | 'maxDays' | null>(null);

  readonly catchUpRanges = signal<{ from: string; to: string }[]>([{ from: '', to: '' }]);
  readonly catchUpSubmitting = signal(false);
  readonly catchUpError = signal<string | null>(null);
  readonly catchUpSuccess = signal(false);

  /** Fluxo estendido de recuperação: dias perdidos no período (API nova ou fallback). */
  readonly showExtendedCatchUp = computed(() => {
    const s = this.stats();
    if (s == null) {
      return false;
    }
    return s.hasMissedDaysInPeriod ?? s.daysMissedInPeriod > 0;
  });

  readonly hasPeriodBreakdownCards = computed(() => {
    const s = this.stats();
    return s != null && hasPeriodBreakdown(s);
  });

  readonly heatmapDays = computed((): HeatmapDay[] => {
    const s = this.stats();
    if (s == null) {
      return [];
    }
    const range = eachDayInRange(s.periodFrom, s.periodTo);
    if (hasDiscriminatedHeatmap(s)) {
      const onTime = new Set(s.readOnTimeDatesInPeriod ?? []);
      const delayed = new Set(s.readWithDelayDatesInPeriod ?? []);
      const missed = new Set(s.missedScheduledDatesInPeriod ?? []);
      // Ordem fixa se houver sobreposição indevida na API: no prazo → atraso → não lido → neutro.
      return range.map((date) => {
        let kind: HeatmapCellKind;
        if (onTime.has(date)) {
          kind = 'onTime';
        } else if (delayed.has(date)) {
          kind = 'delayed';
        } else if (missed.has(date)) {
          kind = 'missed';
        } else {
          kind = 'neutral';
        }
        return { date, kind };
      });
    }
    const read = new Set(s.readDatesInPeriod);
    return range.map((date) => ({
      date,
      kind: read.has(date) ? 'onTime' : 'missed',
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

  addCatchUpRow(): void {
    this.catchUpRanges.update((rows) => [...rows, { from: '', to: '' }]);
  }

  removeCatchUpRow(index: number): void {
    this.catchUpRanges.update((rows) => {
      if (rows.length <= 1) {
        return [{ from: '', to: '' }];
      }
      return rows.filter((_, i) => i !== index);
    });
  }

  updateCatchUpFrom(index: number, value: string): void {
    this.catchUpRanges.update((rows) => {
      const next = rows.slice();
      if (next[index]) {
        next[index] = { ...next[index], from: value };
      }
      return next;
    });
  }

  updateCatchUpTo(index: number, value: string): void {
    this.catchUpRanges.update((rows) => {
      const next = rows.slice();
      if (next[index]) {
        next[index] = { ...next[index], to: value };
      }
      return next;
    });
  }

  submitCatchUpRanges(): void {
    this.catchUpError.set(null);
    this.catchUpSuccess.set(false);
    const parsed = this.parseCatchUpRanges();
    if (parsed === 'partial') {
      this.catchUpError.set(this.transloco.translate('statistics.catchUp.errors.partial'));
      return;
    }
    if (parsed === 'order') {
      this.catchUpError.set(this.transloco.translate('statistics.catchUp.errors.order'));
      return;
    }
    if (parsed === 'max') {
      this.catchUpError.set(
        this.transloco.translate('statistics.catchUp.errors.maxDays', { max: MAX_RANGE_DAYS })
      );
      return;
    }
    if (parsed.length === 0) {
      this.catchUpError.set(this.transloco.translate('statistics.catchUp.errors.empty'));
      return;
    }
    this.catchUpSubmitting.set(true);
    this.readingProgress
      .catchUpDateRanges({ ranges: parsed })
      .pipe(
        finalize(() =>
          this.ngZone.run(() => {
            this.catchUpSubmitting.set(false);
          })
        )
      )
      .subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.catchUpSuccess.set(true);
            this.catchUpRanges.set([{ from: '', to: '' }]);
            this.loadStatistics(this.stats()?.periodFrom, this.stats()?.periodTo);
          });
        },
        error: (err: Error) => {
          this.ngZone.run(() => {
            this.catchUpError.set(err.message);
          });
        }
      });
  }

  private parseCatchUpRanges(): CatchUpDateRangeRequest[] | 'partial' | 'order' | 'max' {
    const out: CatchUpDateRangeRequest[] = [];
    for (const r of this.catchUpRanges()) {
      const a = r.from.trim();
      const b = r.to.trim();
      if (!a && !b) {
        continue;
      }
      if (!a || !b) {
        return 'partial';
      }
      if (parseIsoLocal(a) > parseIsoLocal(b)) {
        return 'order';
      }
      if (inclusiveDayCount(a, b) > MAX_RANGE_DAYS) {
        return 'max';
      }
      out.push({ fromInclusive: a, toInclusive: b });
    }
    return out;
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

  heatmapTooltip(cell: HeatmapDay): string {
    const key =
      cell.kind === 'onTime'
        ? 'statistics.heatmap.cellOnTime'
        : cell.kind === 'delayed'
          ? 'statistics.heatmap.cellDelayed'
          : cell.kind === 'missed'
            ? 'statistics.heatmap.cellMissed'
            : 'statistics.heatmap.cellNeutral';
    return this.transloco.translate(key, { date: cell.date });
  }

  periodOnTimeCount(s: ReadingStatistics): number {
    if (s.daysReadOnTimeInPeriod != null) {
      return s.daysReadOnTimeInPeriod;
    }
    if (s.readOnTimeDatesInPeriod != null) {
      return s.readOnTimeDatesInPeriod.length;
    }
    return 0;
  }

  periodDelayedCount(s: ReadingStatistics): number {
    if (s.daysReadWithDelayInPeriod != null) {
      return s.daysReadWithDelayInPeriod;
    }
    if (s.readWithDelayDatesInPeriod != null) {
      return s.readWithDelayDatesInPeriod.length;
    }
    return 0;
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
