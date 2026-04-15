import { CommonModule } from '@angular/common';
import { afterNextRender, Component, inject, NgZone, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { ReadingPlanService, ReadingPlanSummary } from '../../services/reading-plan.service';
import { ReadingProgressService } from '../../services/reading-progress.service';
import { EnrollPlanModalComponent } from '../enroll-plan-modal/enroll-plan-modal.component';
import { PlanDetailModalComponent } from '../plan-detail-modal/plan-detail-modal.component';
import { UploadPlanModalComponent } from '../upload-plan-modal/upload-plan-modal.component';

@Component({
  selector: 'app-reading-plans-page',
  standalone: true,
  imports: [CommonModule, UploadPlanModalComponent, PlanDetailModalComponent, EnrollPlanModalComponent],
  templateUrl: './reading-plans-page.component.html',
  styleUrl: './reading-plans-page.component.scss'
})
export class ReadingPlansPageComponent {
  private readonly readingPlanService = inject(ReadingPlanService);
  private readonly readingProgress = inject(ReadingProgressService);
  private readonly ngZone = inject(NgZone);

  readonly plans = signal<ReadingPlanSummary[] | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly loading = signal(false);
  readonly uploadModalOpen = signal(false);
  readonly detailModalOpen = signal(false);
  readonly detailPlanId = signal<number | null>(null);
  readonly enrollModalOpen = signal(false);
  readonly enrollPlanId = signal<number | null>(null);
  readonly enrollPlanName = signal('');

  constructor() {
    afterNextRender(() => {
      this.readingProgress.loadEnrollmentSummary();
      this.refreshPlans();
    });
  }

  isFollowingPlan(planId: number): boolean {
    const e = this.readingProgress.enrollmentSummary();
    return e != null && e.planId === planId;
  }

  refreshPlans(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.readingPlanService
      .list()
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
            this.plans.set(rows);
            this.loadError.set(null);
          });
        },
        error: (err: Error) => {
          this.ngZone.run(() => {
            this.loadError.set(err.message);
            this.plans.set(null);
          });
        }
      });
  }

  openUploadModal(): void {
    this.uploadModalOpen.set(true);
  }

  onUploadModalChange(open: boolean): void {
    this.uploadModalOpen.set(open);
  }

  onUploaded(): void {
    this.refreshPlans();
  }

  openPlanDetail(planId: number): void {
    this.detailPlanId.set(planId);
    this.detailModalOpen.set(true);
  }

  onDetailModalChange(open: boolean): void {
    this.detailModalOpen.set(open);
    if (!open) {
      this.detailPlanId.set(null);
    }
  }

  openEnrollFromSummary(plan: ReadingPlanSummary): void {
    this.enrollPlanId.set(plan.id);
    this.enrollPlanName.set(plan.originalFilename);
    this.enrollModalOpen.set(true);
  }

  onEnrollRequest(payload: { id: number; filename: string }): void {
    this.enrollPlanId.set(payload.id);
    this.enrollPlanName.set(payload.filename);
    this.detailModalOpen.set(false);
    this.detailPlanId.set(null);
    this.enrollModalOpen.set(true);
  }

  onEnrollModalChange(open: boolean): void {
    this.enrollModalOpen.set(open);
    if (!open) {
      this.enrollPlanId.set(null);
      this.enrollPlanName.set('');
    }
  }
}
