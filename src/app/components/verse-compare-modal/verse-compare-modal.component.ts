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
import { TranslocoPipe } from '@jsverse/transloco';
import { finalize } from 'rxjs/operators';
import { BibleService, VerseCompareResult } from '../../services/bible.service';
import { BookLoadingSpinnerComponent } from '../book-loading-spinner/book-loading-spinner.component';

@Component({
  selector: 'app-verse-compare-modal',
  standalone: true,
  imports: [CommonModule, TranslocoPipe, BookLoadingSpinnerComponent],
  templateUrl: './verse-compare-modal.component.html',
  styleUrl: './verse-compare-modal.component.scss'
})
export class VerseCompareModalComponent implements OnChanges {
  private readonly bible = inject(BibleService);
  private readonly ngZone = inject(NgZone);

  @Input() open = false;
  @Input() book = 0;
  @Input() chapter = 0;
  @Input() verse = 0;

  @Output() openChange = new EventEmitter<boolean>();

  readonly data = signal<VerseCompareResult | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.open) {
      this.data.set(null);
      this.errorMessage.set(null);
      return;
    }
    if (changes['open'] || changes['book'] || changes['chapter'] || changes['verse']) {
      if (this.book > 0 && this.chapter > 0 && this.verse > 0) {
        this.fetch();
      }
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

  close(): void {
    this.openChange.emit(false);
  }

  private fetch(): void {
    if (this.book < 1 || this.chapter < 1 || this.verse < 1) {
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    this.data.set(null);
    this.bible
      .compareVerse(this.book, this.chapter, this.verse)
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
            this.data.set(row);
          });
        },
        error: (err: Error) => {
          this.ngZone.run(() => {
            this.errorMessage.set(err.message);
          });
        }
      });
  }
}
