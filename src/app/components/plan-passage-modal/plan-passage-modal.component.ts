import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  inject,
  Input,
  NgZone,
  OnChanges,
  Output,
  signal,
  SimpleChanges
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { finalize } from 'rxjs/operators';
import { BibleService, BibleChapter } from '../../services/bible.service';
import {
  BiblePreferencesService,
  normalizeBibleVersion,
  type BibleVersionCode
} from '../../services/bible-preferences.service';
import { resolveBookNumberFromLabel } from '../../utils/bible-resolve-book';
import type { MarkDayReadRequest, TodayReadingBlock } from '../../services/reading-progress.service';
import { ReadingProgressService } from '../../services/reading-progress.service';
import { VerseFavoritesService } from '../../services/verse-favorites.service';
import { BookLoadingSpinnerComponent } from '../book-loading-spinner/book-loading-spinner.component';
import { VerseCompareModalComponent } from '../verse-compare-modal/verse-compare-modal.component';

@Component({
  selector: 'app-plan-passage-modal',
  standalone: true,
  imports: [CommonModule, BookLoadingSpinnerComponent, VerseCompareModalComponent, TranslocoPipe],
  templateUrl: './plan-passage-modal.component.html',
  styleUrl: './plan-passage-modal.component.scss'
})
export class PlanPassageModalComponent implements OnChanges {
  private readonly bible = inject(BibleService);
  private readonly prefs = inject(BiblePreferencesService);
  private readonly readingProgress = inject(ReadingProgressService);
  private readonly verseFavorites = inject(VerseFavoritesService);
  private readonly ngZone = inject(NgZone);
  private readonly transloco = inject(TranslocoService);

  @Input() open = false;
  @Input() block: TodayReadingBlock | null = null;
  /** Data civil do dia no plano (ISO YYYY-MM-DD), para `POST .../days/read`. */
  @Input() referenceDate: string | null = null;

  @Output() openChange = new EventEmitter<boolean>();
  @Output() readingConfirmed = new EventEmitter<void>();

  readonly version = signal<BibleVersionCode>('nvi');
  readonly bookNumber = signal<number | null>(null);
  readonly currentChapter = signal(1);
  readonly chapterStart = signal(1);
  readonly chapterEnd = signal(1);
  readonly chapter = signal<BibleChapter | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly compareOpen = signal(false);
  readonly compareBook = signal(0);
  readonly compareChapter = signal(0);
  readonly compareVerse = signal(0);

  readonly confirmLoading = signal(false);
  readonly confirmError = signal<string | null>(null);
  readonly confirmSuccess = signal(false);
  readonly confirmModalOpen = signal(false);

  readonly favoritesLoading = signal(false);
  readonly favoriteIdByKey = signal<Map<string, number>>(new Map());
  readonly favoriteToggleBusy = signal(false);
  readonly unmarkLoading = signal(false);
  readonly unmarkError = signal<string | null>(null);
  readonly favoriteError = signal<string | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && !this.open) {
      this.chapter.set(null);
      this.errorMessage.set(null);
      this.bookNumber.set(null);
      this.confirmModalOpen.set(false);
      this.resetConfirmState();
      return;
    }

    const openedNow =
      changes['open']?.currentValue === true && changes['open']?.previousValue === false;
    const prevBlock = changes['block']?.previousValue as TodayReadingBlock | null | undefined;
    const prevSeg = prevBlock?.segmentIndex ?? 0;
    const currSeg = this.block?.segmentIndex ?? 0;
    const blockIdChanged =
      !!changes['block'] &&
      this.block != null &&
      (prevBlock?.planDayId !== this.block.planDayId || prevSeg !== currSeg);

    if (this.open && this.block && (openedNow || blockIdChanged)) {
      this.resetConfirmState();
      this.favoriteError.set(null);
      this.bootstrapFromBlock();
      this.reloadFavoritesForDate();
    }
  }

  private resetConfirmState(): void {
    this.confirmLoading.set(false);
    this.confirmError.set(null);
    this.confirmSuccess.set(false);
    this.unmarkError.set(null);
  }

  private reloadFavoritesForDate(): void {
    const ref = this.referenceDate?.trim() ?? '';
    if (!ref) {
      this.favoriteIdByKey.set(new Map());
      return;
    }
    this.favoritesLoading.set(true);
    this.verseFavorites.listByReadingDate(ref).subscribe({
      next: (rows) => {
        this.ngZone.run(() => {
          const m = new Map<string, number>();
          for (const f of rows) {
            m.set(this.favoriteLookupKey(f.versionId, f.bookNumber, f.chapterNumber, f.verseNumber), f.id);
          }
          this.favoriteIdByKey.set(m);
          this.favoritesLoading.set(false);
        });
      },
      error: () => {
        this.ngZone.run(() => {
          this.favoriteIdByKey.set(new Map());
          this.favoritesLoading.set(false);
        });
      }
    });
  }

  private favoriteLookupKey(versionId: string, book: number, chapter: number, verse: number): string {
    return `${versionId}:${book}:${chapter}:${verse}`;
  }

  favoriteIdForVerse(bookNum: number, chapterNum: number, verseNum: number): number | undefined {
    const vid = this.version();
    return this.favoriteIdByKey().get(this.favoriteLookupKey(vid, bookNum, chapterNum, verseNum));
  }

  toggleFavoriteVerse(verseNum: number): void {
    const ch = this.chapter();
    const b = this.block;
    const ref = this.referenceDate?.trim() ?? '';
    if (!ch || !b || !ref || this.favoriteToggleBusy()) {
      return;
    }
    this.favoriteError.set(null);
    const bookNum = ch.bookNumber;
    const vid = this.version();
    const key = this.favoriteLookupKey(vid, bookNum, ch.chapter, verseNum);
    const existing = this.favoriteIdByKey().get(key);
    this.favoriteToggleBusy.set(true);
    if (existing != null) {
      this.verseFavorites.delete(existing).subscribe({
        next: () => {
          this.ngZone.run(() => {
            const next = new Map(this.favoriteIdByKey());
            next.delete(key);
            this.favoriteIdByKey.set(next);
            this.favoriteToggleBusy.set(false);
          });
        },
        error: (err: Error) => {
          this.ngZone.run(() => {
            this.favoriteToggleBusy.set(false);
            this.favoriteError.set(err.message);
          });
        }
      });
      return;
    }
    this.verseFavorites
      .create({
        versionId: vid,
        bookNumber: bookNum,
        chapterNumber: ch.chapter,
        verseNumber: verseNum,
        readingDate: ref
      })
      .subscribe({
        next: (created) => {
          this.ngZone.run(() => {
            const next = new Map(this.favoriteIdByKey());
            next.set(key, created.id);
            this.favoriteIdByKey.set(next);
            this.favoriteToggleBusy.set(false);
          });
        },
        error: (err: Error) => {
          this.ngZone.run(() => {
            this.favoriteToggleBusy.set(false);
            this.favoriteError.set(err.message);
          });
        }
      });
  }

  unmarkDayReading(): void {
    const b = this.block;
    if (!b || this.unmarkLoading()) {
      return;
    }
    this.unmarkLoading.set(true);
    this.unmarkError.set(null);
    this.readingProgress
      .unmarkPlanDayRead(b.planDayId, b.segmentIndex ?? 0)
      .pipe(
        finalize(() =>
          this.ngZone.run(() => {
            this.unmarkLoading.set(false);
          })
        )
      )
      .subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.readingConfirmed.emit();
            this.close();
          });
        },
        error: (err: Error) => {
          this.ngZone.run(() => {
            this.unmarkError.set(err.message);
          });
        }
      });
  }

  /** Rodapé com confirmação: só no último capítulo da faixa, com texto carregado. */
  isLastChapterFooter(): boolean {
    if (this.bookNumber() == null || this.chapter() == null || this.loading() || this.errorMessage()) {
      return false;
    }
    return this.currentChapter() === this.chapterEnd();
  }

  /** Botão “Confirmar leitura” ao lado de Fechar: último capítulo e ainda não registrado nesta sessão/plano. */
  showConfirmReadingEntry(): boolean {
    const b = this.block;
    if (!b || !this.isLastChapterFooter()) {
      return false;
    }
    return !b.completed && !this.confirmSuccess();
  }

  openConfirmModal(): void {
    this.confirmError.set(null);
    this.confirmModalOpen.set(true);
  }

  closeConfirmModal(): void {
    this.confirmModalOpen.set(false);
  }

  confirmDailyReading(): void {
    const b = this.block;
    const ref = this.referenceDate?.trim() ?? '';
    if (!b || !ref) {
      this.confirmError.set(this.transloco.translate('modals.planPassage.errors.noReference'));
      return;
    }
    this.confirmLoading.set(true);
    this.confirmError.set(null);
    const body: MarkDayReadRequest = {
      dayNumber: b.dayNumber,
      readDate: ref,
      readingPlanDayId: b.planDayId
    };
    const seg = b.segmentIndex;
    if (seg != null && seg !== 0) {
      body.segmentIndex = seg;
    }
    this.readingProgress
      .markDayRead(body)
      .pipe(
        finalize(() =>
          this.ngZone.run(() => {
            this.confirmLoading.set(false);
          })
        )
      )
      .subscribe({
        next: () => {
          this.ngZone.run(() => {
            this.confirmSuccess.set(true);
            this.readingConfirmed.emit();
          });
        },
        error: (err: Error) => {
          this.ngZone.run(() => {
            this.confirmError.set(err.message);
          });
        }
      });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.open) {
      return;
    }
    if (this.compareOpen()) {
      return;
    }
    if (this.confirmModalOpen()) {
      this.closeConfirmModal();
      return;
    }
    this.close();
  }

  onOverlayClick(): void {
    if (this.compareOpen()) {
      return;
    }
    if (this.confirmModalOpen()) {
      return;
    }
    this.close();
  }

  close(): void {
    this.confirmModalOpen.set(false);
    this.openChange.emit(false);
  }

  onVersionSelect(ev: Event): void {
    const v = normalizeBibleVersion((ev.target as HTMLSelectElement).value);
    this.version.set(v);
    this.prefs.setVersion(v);
    const n = this.bookNumber();
    const b = this.block;
    if (n != null) {
      this.loadChapter(n, this.currentChapter());
      return;
    }
    if (b != null && b.bookNumber == null) {
      this.resolveBookAndLoadChapter(v, b);
    }
  }

  goPrev(): void {
    const n = this.bookNumber();
    const ch = this.currentChapter();
    const lo = this.chapterStart();
    if (n == null || ch <= lo) {
      return;
    }
    this.confirmSuccess.set(false);
    this.confirmError.set(null);
    this.confirmModalOpen.set(false);
    this.currentChapter.set(ch - 1);
    this.loadChapter(n, ch - 1);
  }

  goNext(): void {
    const n = this.bookNumber();
    const ch = this.currentChapter();
    const hi = this.chapterEnd();
    if (n == null || ch >= hi) {
      return;
    }
    this.confirmSuccess.set(false);
    this.confirmError.set(null);
    this.confirmModalOpen.set(false);
    this.currentChapter.set(ch + 1);
    this.loadChapter(n, ch + 1);
  }

  openCompare(bookNum: number, chapterNum: number, verseNum: number): void {
    this.compareBook.set(bookNum);
    this.compareChapter.set(chapterNum);
    this.compareVerse.set(verseNum);
    this.compareOpen.set(true);
  }

  onCompareOpenChange(open: boolean): void {
    this.compareOpen.set(open);
  }

  private bootstrapFromBlock(): void {
    const b = this.block;
    if (!b) {
      return;
    }
    const lo = Math.min(b.startChapter, b.endChapter);
    const hi = Math.max(b.startChapter, b.endChapter);
    this.chapterStart.set(lo);
    this.chapterEnd.set(hi);
    this.currentChapter.set(lo);
    this.chapter.set(null);
    this.errorMessage.set(null);

    const v = this.prefs.version();
    this.version.set(v);

    if (b.bookNumber != null) {
      this.bookNumber.set(b.bookNumber);
      this.loadChapter(b.bookNumber, lo);
      return;
    }

    this.bookNumber.set(null);
    this.resolveBookAndLoadChapter(v, b);
  }

  private resolveBookAndLoadChapter(v: BibleVersionCode, b: TodayReadingBlock): void {
    const lo = this.currentChapter();
    this.loading.set(true);
    this.errorMessage.set(null);
    this.chapter.set(null);
    this.bible
      .getBooks(v)
      .pipe(
        finalize(() =>
          this.ngZone.run(() => {
            this.loading.set(false);
          })
        )
      )
      .subscribe({
        next: (books) => {
          this.ngZone.run(() => {
            const num = resolveBookNumberFromLabel(books, b.bookName);
            if (num == null) {
              this.errorMessage.set(
                `Não foi possível localizar o livro “${b.bookName}” nesta versão. Tente outra tradução ou abra a Bíblia pelo menu.`
              );
              return;
            }
            this.bookNumber.set(num);
            this.loadChapter(num, lo);
          });
        },
        error: (err: Error) => {
          this.ngZone.run(() => {
            this.errorMessage.set(err.message);
          });
        }
      });
  }

  private loadChapter(bookNum: number, chapterNum: number): void {
    const v = this.version();
    this.loading.set(true);
    this.errorMessage.set(null);
    this.bible
      .getChapter(v, bookNum, chapterNum)
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
            this.chapter.set(row);
          });
        },
        error: (err: Error) => {
          this.ngZone.run(() => {
            this.errorMessage.set(err.message);
            this.chapter.set(null);
          });
        }
      });
  }
}
