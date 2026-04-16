import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TranslocoService } from '@jsverse/transloco';

export type AppLang = 'pt-BR' | 'en' | 'es';

const STORAGE_KEY = 'daily-bread-lang';
const COOKIE = 'daily-bread-lang';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);

  /** Call after Transloco is configured; restores saved language. */
  initFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === 'en' || raw === 'es' || raw === 'pt-BR') {
        this.transloco.setActiveLang(raw);
      }
    }
    this.applyDocumentLang();
  }

  setLanguage(code: AppLang): void {
    this.transloco.setActiveLang(code);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, code);
    }
    this.document.cookie = `${COOKIE}=${encodeURIComponent(code)};path=/;max-age=31536000;SameSite=Lax`;
    this.applyDocumentLang();
    this.applyDocumentTitle();
  }

  /** Run after translations for the active language are loaded. */
  applyDocumentTitle(): void {
    this.title.setTitle(this.transloco.translate('common.site.title'));
  }

  private applyDocumentLang(): void {
    const lang = this.transloco.getActiveLang();
    const htmlLang = lang === 'en' ? 'en' : lang === 'es' ? 'es' : 'pt-BR';
    this.document.documentElement.lang = htmlLang;
  }
}
