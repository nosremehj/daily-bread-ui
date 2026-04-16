import { Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { Observable, of } from 'rxjs';
import { TRANSLATIONS_BY_LANG } from './translations-bundled';

@Injectable({ providedIn: 'root' })
export class AppTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string): Observable<Translation> {
    const merged = TRANSLATIONS_BY_LANG[lang] ?? TRANSLATIONS_BY_LANG['pt-BR'];
    return of(merged);
  }
}
