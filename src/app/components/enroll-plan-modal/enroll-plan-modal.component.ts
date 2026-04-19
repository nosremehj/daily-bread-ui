import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  NgZone,
  signal
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { BookLoadingSpinnerComponent } from '../book-loading-spinner/book-loading-spinner.component';
import { Router } from '@angular/router';
import { finalize, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import {
  CatchUpDateRangeRequest,
  ReadingProgressService
} from '../../services/reading-progress.service';
import {
  inclusiveDayCount,
  MAX_CATCH_UP_RANGE_DAYS,
  parseIsoLocal
} from '../../utils/date-range-validate';

export interface DateRangeRow {
  from: string;
  to: string;
}

@Component({
  selector: 'app-enroll-plan-modal',
  standalone: true,
  imports: [CommonModule, TranslocoPipe, BookLoadingSpinnerComponent],
  templateUrl: './enroll-plan-modal.component.html',
  styleUrl: './enroll-plan-modal.component.scss'
})
export class EnrollPlanModalComponent implements OnChanges {
  private readonly readingProgress = inject(ReadingProgressService);
  private readonly ngZone = inject(NgZone);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  @Input() open = false;
  @Input() planId: number | null = null;
  @Input() planFilename = '';

  @Output() openChange = new EventEmitter<boolean>();

  readonly planStartDate = signal('');
  readonly catchUpThroughDate = signal('');
  readonly catchUpRanges = signal<DateRangeRow[]>([{ from: '', to: '' }]);
  readonly showAdvanced = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly maxRangeDays = MAX_CATCH_UP_RANGE_DAYS;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.errorMessage.set(null);
      this.submitting.set(false);
      this.showAdvanced.set(false);
      this.catchUpThroughDate.set('');
      this.catchUpRanges.set([{ from: '', to: '' }]);
      const y = new Date().getFullYear();
      this.planStartDate.set(`${y}-01-01`);
    }
    if (changes['open'] && !this.open) {
      this.errorMessage.set(null);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open && !this.submitting()) {
      this.close();
    }
  }

  onOverlayClick(): void {
    if (!this.submitting()) {
      this.close();
    }
  }

  toggleAdvanced(): void {
    const next = !this.showAdvanced();
    this.showAdvanced.set(next);
    if (next && this.catchUpRanges().length === 0) {
      this.catchUpRanges.set([{ from: '', to: '' }]);
    }
  }

  addRangeRow(): void {
    this.catchUpRanges.update((rows) => [...rows, { from: '', to: '' }]);
  }

  removeRangeRow(index: number): void {
    this.catchUpRanges.update((rows) => {
      if (rows.length <= 1) {
        return [{ from: '', to: '' }];
      }
      return rows.filter((_, i) => i !== index);
    });
  }

  updateRangeFrom(index: number, value: string): void {
    this.catchUpRanges.update((rows) => {
      const next = rows.slice();
      if (next[index]) {
        next[index] = { ...next[index], from: value };
      }
      return next;
    });
  }

  updateRangeTo(index: number, value: string): void {
    this.catchUpRanges.update((rows) => {
      const next = rows.slice();
      if (next[index]) {
        next[index] = { ...next[index], to: value };
      }
      return next;
    });
  }

  submit(): void {
    const id = this.planId;
    const start = this.planStartDate().trim();
    if (id == null || !start) {
      this.errorMessage.set(this.transloco.translate('modals.enroll.errors.startRequired'));
      return;
    }

    let rangesPayload: CatchUpDateRangeRequest[] | null = null;
    if (this.showAdvanced()) {
      const parsed = this.parseCatchUpRanges();
      if (parsed === 'partial') {
        this.errorMessage.set(this.transloco.translate('modals.enroll.errors.advancedPartial'));
        return;
      }
      if (parsed === 'order') {
        this.errorMessage.set(this.transloco.translate('modals.enroll.errors.rangeOrder'));
        return;
      }
      if (parsed === 'max') {
        this.errorMessage.set(
          this.transloco.translate('modals.enroll.errors.rangeMaxDays', { max: MAX_CATCH_UP_RANGE_DAYS })
        );
        return;
      }
      rangesPayload = parsed.length > 0 ? parsed : null;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.readingProgress
      .enroll({
        planId: id,
        planStartDate: start,
        catchUpThroughDate: this.catchUpThroughDate().trim() || null
      })
      .pipe(
        switchMap(() => {
          if (rangesPayload && rangesPayload.length > 0) {
            return this.readingProgress.catchUpDateRanges({ ranges: rangesPayload });
          }
          return of(undefined);
        }),
        finalize(() =>
          this.ngZone.run(() => {
            this.submitting.set(false);
          })
        )
      )
      .subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.readingProgress.loadEnrollmentSummary();
            this.openChange.emit(false);
            void this.router.navigate(['/home']);
          });
        },
        error: (err: Error) => {
          this.ngZone.run(() => {
            this.errorMessage.set(err.message);
          });
        }
      });
  }

  private parseCatchUpRanges():
    | CatchUpDateRangeRequest[]
    | 'partial'
    | 'order'
    | 'max' {
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
      if (inclusiveDayCount(a, b) > MAX_CATCH_UP_RANGE_DAYS) {
        return 'max';
      }
      out.push({ fromInclusive: a, toInclusive: b });
    }
    return out;
  }

  close(): void {
    this.openChange.emit(false);
  }
}
