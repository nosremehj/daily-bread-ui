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
import { finalize } from 'rxjs/operators';
import { ReadingPlanDetail, ReadingPlanService } from '../../services/reading-plan.service';

@Component({
  selector: 'app-plan-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './plan-detail-modal.component.html',
  styleUrl: './plan-detail-modal.component.scss'
})
export class PlanDetailModalComponent implements OnChanges {
  private readonly readingPlanService = inject(ReadingPlanService);
  private readonly ngZone = inject(NgZone);

  @Input() open = false;
  @Input() planId: number | null = null;

  @Output() openChange = new EventEmitter<boolean>();
  @Output() enrollRequest = new EventEmitter<{ id: number; filename: string }>();

  readonly detail = signal<ReadingPlanDetail | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnChanges(_changes: SimpleChanges): void {
    if (!this.open) {
      this.detail.set(null);
      this.errorMessage.set(null);
      this.loading.set(false);
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
