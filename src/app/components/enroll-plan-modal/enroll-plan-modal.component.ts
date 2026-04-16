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
import { Router } from '@angular/router';
import { finalize, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import {
  ReadingProgressService,
  CatchUpDateRangeRequest
} from '../../services/reading-progress.service';

@Component({
  selector: 'app-enroll-plan-modal',
  standalone: true,
  imports: [CommonModule, TranslocoPipe],
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
  readonly catchUpFrom = signal('');
  readonly catchUpTo = signal('');
  readonly showAdvanced = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.errorMessage.set(null);
      this.submitting.set(false);
      this.showAdvanced.set(false);
      this.catchUpThroughDate.set('');
      this.catchUpFrom.set('');
      this.catchUpTo.set('');
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
    this.showAdvanced.update((v) => !v);
  }

  submit(): void {
    const id = this.planId;
    const start = this.planStartDate().trim();
    if (id == null || !start) {
      this.errorMessage.set(this.transloco.translate('modals.enroll.errors.startRequired'));
      return;
    }

    const catchThrough = this.catchUpThroughDate().trim();
    const from = this.catchUpFrom().trim();
    const to = this.catchUpTo().trim();

    if (this.showAdvanced() && (from || to) && (!from || !to)) {
      this.errorMessage.set(this.transloco.translate('modals.enroll.errors.advancedPartial'));
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const rangeBody: CatchUpDateRangeRequest | null =
      this.showAdvanced() && from && to ? { fromInclusive: from, toInclusive: to } : null;

    this.readingProgress
      .enroll({
        planId: id,
        planStartDate: start,
        catchUpThroughDate: catchThrough || null
      })
      .pipe(
        switchMap(() => {
          if (rangeBody) {
            return this.readingProgress.catchUpDateRange(rangeBody);
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

  close(): void {
    this.openChange.emit(false);
  }
}
