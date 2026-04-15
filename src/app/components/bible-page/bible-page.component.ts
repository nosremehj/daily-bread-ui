import { CommonModule } from '@angular/common';
import {
  afterNextRender,
  Component,
  inject,
  NgZone,
  signal,
  DestroyRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import {
  BibleBookMeta,
  BibleChapter,
  BibleService,
  BibleVersionMeta
} from '../../services/bible.service';
import {
  BiblePreferencesService,
  normalizeBibleVersion,
  type BibleVersionCode
} from '../../services/bible-preferences.service';
import { VerseCompareModalComponent } from '../verse-compare-modal/verse-compare-modal.component';

@Component({
  selector: 'app-bible-page',
  standalone: true,
  imports: [CommonModule, RouterLink, VerseCompareModalComponent],
  templateUrl: './bible-page.component.html',
  styleUrl: './bible-page.component.scss'
})
export class BiblePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bible = inject(BibleService);
  private readonly prefs = inject(BiblePreferencesService);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  readonly versions = signal<BibleVersionMeta[]>([]);
  readonly books = signal<BibleBookMeta[] | null>(null);
  readonly chapter = signal<BibleChapter | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly currentVersion = signal<BibleVersionCode>('nvi');
  readonly currentBook = signal<number | null>(null);
  readonly currentChapter = signal<number | null>(null);

  readonly compareOpen = signal(false);
  readonly compareBook = signal(0);
  readonly compareChapter = signal(0);
  readonly compareVerse = signal(0);

  constructor() {
    afterNextRender(() => {
      this.bible.getVersions().subscribe({
        next: (rows) => this.versions.set(rows),
        error: () => this.versions.set([])
      });

      this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.scheduleScrollToVerse();
      });

      this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pm) => {
        const vRaw = pm.get('version');
        const bRaw = pm.get('book');
        const cRaw = pm.get('chapter');
        const version = normalizeBibleVersion(vRaw);
        this.prefs.setVersion(version);
        this.currentVersion.set(version);

        if (bRaw != null && cRaw != null) {
          const book = Number(bRaw);
          const chapter = Number(cRaw);
          if (Number.isFinite(book) && Number.isFinite(chapter) && book >= 1 && chapter >= 1) {
            this.currentBook.set(book);
            this.currentChapter.set(chapter);
            this.loadChapter(version, book, chapter);
            this.books.set(null);
            return;
          }
        }

        this.currentBook.set(null);
        this.currentChapter.set(null);
        this.chapter.set(null);
        this.loadBooks(version);
      });

    });
  }

  onVersionSelect(event: Event): void {
    const sel = event.target as HTMLSelectElement;
    const next = normalizeBibleVersion(sel.value);
    const book = this.currentBook();
    const ch = this.currentChapter();
    const verse = this.route.snapshot.queryParamMap.get('verse');
    if (book != null && ch != null) {
      void this.router.navigate(['/bible', next, book, ch], {
        queryParams: verse ? { verse } : {}
      });
    } else {
      void this.router.navigate(['/bible', next]);
    }
  }

  goPrevChapter(): void {
    const v = this.currentVersion();
    const book = this.currentBook();
    const ch = this.currentChapter();
    if (book == null || ch == null || ch <= 1) {
      return;
    }
    void this.router.navigate(['/bible', v, book, ch - 1]);
  }

  goNextChapter(): void {
    const v = this.currentVersion();
    const book = this.currentBook();
    const ch = this.currentChapter();
    if (book == null || ch == null) {
      return;
    }
    void this.router.navigate(['/bible', v, book, ch + 1]);
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

  attributionForVersion(versionId: string): string {
    const v = this.versions().find((x) => x.versionId === versionId);
    if (!v) {
      return '';
    }
    return [v.attribution, v.licenseNote].filter(Boolean).join(' — ');
  }

  private loadBooks(version: BibleVersionCode): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.bible
      .getBooks(version)
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
            this.books.set(rows);
            this.errorMessage.set(null);
          });
        },
        error: (err: Error) => {
          this.ngZone.run(() => {
            this.errorMessage.set(err.message);
            this.books.set(null);
          });
        }
      });
  }

  private scheduleScrollToVerse(): void {
    if (!this.chapter()) {
      return;
    }
    const raw = this.route.snapshot.queryParamMap.get('verse');
    const n = raw ? Number(raw) : NaN;
    if (!Number.isFinite(n) || n < 1) {
      return;
    }
    requestAnimationFrame(() => {
      document.getElementById(`v-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  private loadChapter(version: BibleVersionCode, book: number, chapter: number): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.bible
      .getChapter(version, book, chapter)
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
            this.errorMessage.set(null);
            this.scheduleScrollToVerse();
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
