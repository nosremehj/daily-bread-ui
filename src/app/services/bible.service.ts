import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import type { BibleVersionCode } from './bible-preferences.service';

export interface BibleVerse {
  verse: number;
  text: string;
}

export interface BibleChapter {
  versionId: string;
  bookNumber: number;
  abbrev: string;
  bookName: string;
  chapter: number;
  verses: BibleVerse[];
}

export interface BibleSingleVerse {
  versionId: string;
  bookNumber: number;
  abbrev: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleBookMeta {
  number: number;
  abbrev: string;
  name: string;
}

export interface BibleVersionMeta {
  versionId: string;
  title: string;
  attribution?: string;
  licenseNote?: string;
}

export interface VerseCompareResult {
  bookNumber: number;
  abbrev: string;
  bookName: string;
  chapter: number;
  verse: number;
  versions: Array<{ versionId: string; title: string; text: string }>;
}

interface ApiErrorBody {
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class BibleService {
  private readonly http = inject(HttpClient);
  private readonly transloco = inject(TranslocoService);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/bible`;

  getVersions(): Observable<BibleVersionMeta[]> {
    return this.http.get<BibleVersionMeta[] | { versions: BibleVersionMeta[] }>(`${this.baseUrl}/versions`).pipe(
      map((raw) => (Array.isArray(raw) ? raw : raw.versions ?? [])),
      catchError((err) => throwError(() => this.toError(err, 'common.errors.loadVersions')))
    );
  }

  getBooks(version: BibleVersionCode): Observable<BibleBookMeta[]> {
    return this.http.get<BibleBookMeta[]>(`${this.baseUrl}/${version}/books`).pipe(
      catchError((err) => throwError(() => this.toError(err, 'common.errors.loadBooks')))
    );
  }

  getChapter(version: BibleVersionCode, book: number, chapter: number): Observable<BibleChapter> {
    return this.http
      .get<BibleChapter>(`${this.baseUrl}/${version}/books/${book}/chapters/${chapter}`)
      .pipe(
        catchError((err) => throwError(() => this.toError(err, 'common.errors.loadChapter')))
      );
  }

  getVerse(
    version: BibleVersionCode,
    book: number,
    chapter: number,
    verse: number
  ): Observable<BibleSingleVerse> {
    return this.http
      .get<BibleSingleVerse>(
        `${this.baseUrl}/${version}/books/${book}/chapters/${chapter}/verses/${verse}`
      )
      .pipe(
        catchError((err) => throwError(() => this.toError(err, 'common.errors.loadVerse')))
      );
  }

  compareVerse(book: number, chapter: number, verse: number): Observable<VerseCompareResult> {
    return this.http
      .get<VerseCompareResult>(`${this.baseUrl}/verse/compare`, {
        params: {
          book: String(book),
          chapter: String(chapter),
          verse: String(verse)
        }
      })
      .pipe(
        catchError((err) =>
          throwError(() => this.toError(err, 'common.errors.compareVerse'))
        )
      );
  }

  private toError(err: unknown, fallbackKey: string): Error {
    const httpErr = err as HttpErrorResponse;
    const body = httpErr?.error as ApiErrorBody | undefined;
    const message =
      typeof body?.error === 'string'
        ? body.error
        : typeof httpErr?.message === 'string'
          ? httpErr.message
          : this.transloco.translate(fallbackKey);
    return new Error(message);
  }
}
