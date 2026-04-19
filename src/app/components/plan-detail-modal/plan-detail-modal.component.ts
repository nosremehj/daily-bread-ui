import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  EventEmitter,
  HostListener,
  inject,
  Input,
  NgZone,
  OnChanges,
  Output,
  signal,
  SimpleChanges,
  untracked
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { finalize } from 'rxjs/operators';
import { LocaleDatePipe } from '../../core/i18n/locale-date.pipe';
import { BookLoadingSpinnerComponent } from '../book-loading-spinner/book-loading-spinner.component';
import { ReadingPlanDetail, ReadingDay, ReadingPlanService } from '../../services/reading-plan.service';
import { ReadingProgressService } from '../../services/reading-progress.service';

function addDaysToIsoDate(iso: string, daysToAdd: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + daysToAdd);
  const yy = dt.getFullYear();
  const mm = dt.getMonth() + 1;
  const dd = dt.getDate();
  return `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

@Component({
  selector: 'app-plan-detail-modal',
  standalone: true,
  imports: [CommonModule, TranslocoPipe, LocaleDatePipe, BookLoadingSpinnerComponent],
  templateUrl: './plan-detail-modal.component.html',
  styleUrl: './plan-detail-modal.component.scss'
})
export class PlanDetailModalComponent implements OnChanges {
  private readonly readingPlanService = inject(ReadingPlanService);
  private readonly readingProgress = inject(ReadingProgressService);
  private readonly ngZone = inject(NgZone);

  @Input() open = false;
  @Input() planId: number | null = null;

  @Output() openChange = new EventEmitter<boolean>();
  @Output() enrollRequest = new EventEmitter<{ id: number; filename: string }>();

  readonly detail = signal<ReadingPlanDetail | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly calendarReadByDate = signal<Map<string, boolean> | null>(null);
  private calendarFetchKey = '';
  /** Espelha `open` para o `effect` reagir a abrir/fechar. */
  private readonly openState = signal(false);

  readonly followingThisPlan = computed(() => {
    const d = this.detail();
    const e = this.readingProgress.enrollmentSummary();
    if (d == null || e == null) {
      return false;
    }
    return e.planId === d.id;
  });

  constructor() {
    effect(() => {
      const open = this.openState();
      const d = this.detail();
      const e = this.readingProgress.enrollmentSummary();
      if (!open || d == null) {
        return;
      }
      if (e == null || e.planId !== d.id || d.days.length === 0) {
        untracked(() => this.calendarReadByDate.set(null));
        return;
      }
      const key = `${d.id}|${e.planStartDate}|${d.days.length}`;
      untracked(() => {
        if (this.calendarFetchKey === key) {
          return;
        }
        this.calendarFetchKey = key;
        this.loadCalendarForPlan(e.planStartDate, d.days.length);
      });
    });
  }

  ngOnChanges(_changes: SimpleChanges): void {
    this.openState.set(this.open);
    if (!this.open) {
      this.detail.set(null);
      this.errorMessage.set(null);
      this.loading.set(false);
      this.calendarReadByDate.set(null);
      this.calendarFetchKey = '';
      return;
    }
    if (this.planId != null) {
      this.fetchPlan(this.planId);
    }
  }

  dayDone(day: ReadingDay): boolean {
    const map = this.calendarReadByDate();
    const e = this.readingProgress.enrollmentSummary();
    const d = this.detail();
    if (map != null && e != null && d != null && e.planId === d.id) {
      const iso = addDaysToIsoDate(e.planStartDate, day.dayNumber - 1);
      return map.get(iso) ?? false;
    }
    return day.completed;
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

  private loadCalendarForPlan(planStartDate: string, dayCount: number): void {
    const from = planStartDate;
    const to = addDaysToIsoDate(planStartDate, dayCount - 1);
    const expectedKey = this.calendarFetchKey;
    this.readingProgress.getCalendar(from, to).subscribe({
      next: (rows) => {
        this.ngZone.run(() => {
          if (!this.openState() || this.calendarFetchKey !== expectedKey) {
            return;
          }
          const map = new Map<string, boolean>();
          for (const r of rows) {
            map.set(r.date, r.read);
          }
          this.calendarReadByDate.set(map);
        });
      },
      error: () => {
        this.ngZone.run(() => {
          if (!this.openState() || this.calendarFetchKey !== expectedKey) {
            return;
          }
          this.calendarReadByDate.set(new Map());
        });
      }
    });
  }

  private fetchPlan(id: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.detail.set(null);
    this.calendarReadByDate.set(null);
    this.calendarFetchKey = '';
    this.readingPlanService
      .getById(id)
      .pipe(
        finalize(() =>
          this.ngZone.run(() => {
            this.loading.set(false);
          })
        )
      )
      .subscribe({
        next: (data) => {
          this.ngZone.run(() => {
            this.detail.set(data);
          });
        },
        error: (err: Error) => {
          this.ngZone.run(() => {
            this.errorMessage.set(err.message);
          });
        }
      });
  }

  close(): void {
    this.openChange.emit(false);
  }

  requestEnroll(): void {
    const id = this.planId;
    const d = this.detail();
    if (id != null && d) {
      this.enrollRequest.emit({ id, filename: d.originalFilename });
    }
  }
}
