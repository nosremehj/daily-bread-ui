import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  inject,
  NgZone,
  signal
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { BookLoadingSpinnerComponent } from '../book-loading-spinner/book-loading-spinner.component';
import { ReadingPlanService } from '../../services/reading-plan.service';

@Component({
  selector: 'app-upload-plan-modal',
  standalone: true,
  imports: [CommonModule, TranslocoPipe, BookLoadingSpinnerComponent],
  templateUrl: './upload-plan-modal.component.html',
  styleUrl: './upload-plan-modal.component.scss'
})
export class UploadPlanModalComponent {
  private readonly readingPlanService = inject(ReadingPlanService);
  private readonly ngZone = inject(NgZone);
  private readonly transloco = inject(TranslocoService);

  @Input() set open(value: boolean) {
    this._open = value;
    if (value) {
      this.errorMessage.set(null);
      this.selectedFile.set(null);
      this.uploading.set(false);
      queueMicrotask(() => this.fileInput?.nativeElement?.focus());
    }
  }
  get open(): boolean {
    return this._open;
  }
  private _open = false;

  @Output() openChange = new EventEmitter<boolean>();
  @Output() uploaded = new EventEmitter<void>();

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  readonly selectedFile = signal<File | null>(null);
  readonly uploading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this._open && !this.uploading()) {
      this.close();
    }
  }

  onOverlayClick(): void {
    if (!this.uploading()) {
      this.close();
    }
  }

  onFilePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.errorMessage.set(null);
    if (!file) {
      this.selectedFile.set(null);
      return;
    }
    const name = file.name.toLowerCase();
    if (!name.endsWith('.pdf')) {
      this.selectedFile.set(null);
      this.errorMessage.set(this.transloco.translate('modals.upload.errorNoFile'));
      input.value = '';
      return;
    }
    this.selectedFile.set(file);
  }

  submit(): void {
    const file = this.selectedFile();
    if (!file || this.uploading()) {
      return;
    }
    this.uploading.set(true);
    this.errorMessage.set(null);
    this.readingPlanService.uploadPdf(file).subscribe({
      next: () => {
        this.ngZone.run(() => {
          this.uploading.set(false);
          this.selectedFile.set(null);
          if (this.fileInput) {
            this.fileInput.nativeElement.value = '';
          }
          this.close();
          this.uploaded.emit();
        });
      },
      error: (err: Error) => {
        this.ngZone.run(() => {
          this.uploading.set(false);
          this.errorMessage.set(err.message);
        });
      }
    });
  }

  close(): void {
    if (this.uploading()) {
      return;
    }
    this.openChange.emit(false);
  }
}
