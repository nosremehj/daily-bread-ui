import { CommonModule, formatDate } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  inject,
  NgZone,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import {
  ReadingProgressDashboard,
  ReadingProgressService,
  TodayReadingBlock
} from '../../services/reading-progress.service';
import { ReadingCalendarModalComponent } from '../reading-calendar-modal/reading-calendar-modal.component';

function toIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, ReadingCalendarModalComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  private readonly auth = inject(AuthService);
  private readonly readingProgress = inject(ReadingProgressService);
  private readonly ngZone = inject(NgZone);

  readonly userName = computed(() => this.auth.getFirstName());

  readonly dashboard = signal<ReadingProgressDashboard | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly loading = signal(true);
  readonly calendarOpen = signal(false);
  readonly markBusy = signal(false);

  readonly ringCircumference = 2 * Math.PI * 48;

  readonly headerDate = computed(() => {
    const raw = this.dashboard()?.today?.referenceDate;
    if (raw) {
      const [y, m, day] = raw.split('-').map(Number);
      const dt = new Date(y, m - 1, day);
      return formatDate(dt, "d 'de' MMMM, EEEE", 'pt-BR');
    }
    return formatDate(new Date(), "d 'de' MMMM, EEEE", 'pt-BR');
  });

  readonly ringDashOffset = computed(() => {
    const p = this.dashboard()?.annualProgressPercent ?? 0;
    const clamped = Math.min(100, Math.max(0, p));
    return this.ringCircumference * (1 - clamped / 100);
  });

  readonly progressPercentRounded = computed(() =>
    Math.round(this.dashboard()?.annualProgressPercent ?? 0)
  );

  constructor() {
    afterNextRender(() => {
      this.refreshDashboard();
      this.readingProgress.loadEnrollmentSummary();
    });
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
          })
        )
      )
      .subscribe({
        next: (row) => {
          this.ngZone.run(() => {
            this.dashboard.set(row);
            this.loadError.set(null);
          });
        },
        error: (err: Error) => {
          this.ngZone.run(() => {
            this.loadError.set(err.message);
            this.dashboard.set(null);
          });
        }
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

  onReadCheckbox(block: TodayReadingBlock, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (block.completed) {
      input.checked = true;
      return;
    }
    if (!input.checked) {
      return;
    }
    const ref = this.dashboard()?.today.referenceDate ?? toIsoLocal(new Date());
    this.markBusy.set(true);
    this.readingProgress
      .markDayRead({ dayNumber: block.dayNumber, readDate: ref })
      .pipe(
        finalize(() =>
          this.ngZone.run(() => {
            this.markBusy.set(false);
          })
        )
      )
      .subscribe({
        next: () => {
          this.ngZone.run(() => this.refreshDashboard());
        },
        error: (err: Error) => {
          this.ngZone.run(() => {
            this.loadError.set(err.message);
            input.checked = false;
          });
        }
      });
  }
}
