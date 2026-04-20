import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  EventEmitter,
  HostListener,
  inject,
  Input,
  NgZone,
  OnChanges,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { finalize } from 'rxjs/operators';
import { LocaleDatePipe } from '../../core/i18n/locale-date.pipe';
import { BookLoadingSpinnerComponent } from '../book-loading-spinner/book-loading-spinner.component';
import { ReadingPlanDetail, ReadingPlanService } from '../../services/reading-plan.service';
import { ReadingProgressService } from '../../services/reading-progress.service';

@Component({
  selector: 'app-plan-detail-modal',
  standalone: true,
  imports: [CommonModule, TranslocoPipe, LocaleDatePipe, BookLoadingSpinnerComponent],
  templateUrl: './plan-detail-modal.component.html',
  styleUrl: './plan-detail-modal.component.scss',
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
  readonly leaveConfirmOpen = signal(false);
  readonly leaveLoading = signal(false);
  readonly leaveError = signal<string | null>(null);

  readonly followingThisPlan = computed(() => {
    const d = this.detail();
    const e = this.readingProgress.enrollmentSummary();
    if (d == null || e == null) {
      return false;
    }
    return e.planId === d.id;
  });

  ngOnChanges(_changes: SimpleChanges): void {
    if (!this.open) {
      this.detail.set(null);
      this.errorMessage.set(null);
      this.loading.set(false);
      this.leaveConfirmOpen.set(false);
      this.leaveLoading.set(false);
      this.leaveError.set(null);
      return;
    }
    if (this.planId != null) {
      this.fetchPlan(this.planId);
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

  private fetchPlan(id: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.detail.set(null);
    this.readingPlanService
      .getById(id)
      .pipe(
        finalize(() =>
          this.ngZone.run(() => {
            this.loading.set(false);
          }),
        ),
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
        },
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

  openLeaveConfirm(): void {
    this.leaveError.set(null);
    this.leaveConfirmOpen.set(true);
  }

  cancelLeaveConfirm(): void {
    if (this.leaveLoading()) {
      return;
    }
    this.leaveConfirmOpen.set(false);
    this.leaveError.set(null);
  }

  confirmLeavePlan(): void {
    this.leaveLoading.set(true);
    this.leaveError.set(null);
    this.readingProgress
      .deleteEnrollment()
      .pipe(
        finalize(() =>
          this.ngZone.run(() => {
            this.leaveLoading.set(false);
          }),
        ),
      )
      .subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.leaveConfirmOpen.set(false);
            this.close();
          });
        },
        error: (err: Error) => {
          this.ngZone.run(() => {
            this.leaveError.set(err.message);
          });
        },
      });
  }
}
