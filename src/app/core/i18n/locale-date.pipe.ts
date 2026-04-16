import { formatDate } from '@angular/common';
import { inject, Pipe, PipeTransform } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { translocoToAngularLocale } from './angular-locale';

/** Like `DatePipe` but follows the active Transloco language. Impure so it updates on language change. */
@Pipe({
  name: 'localeDate',
  standalone: true,
  pure: false,
})
export class LocaleDatePipe implements PipeTransform {
  private readonly transloco = inject(TranslocoService);

  transform(value: string | number | Date | null | undefined, format: string): string | null {
    if (value == null || value === '') {
      return null;
    }
    this.transloco.activeLang();
    const locale = translocoToAngularLocale(this.transloco.getActiveLang());
    try {
      return formatDate(value, format, locale);
    } catch {
      return String(value);
    }
  }
}
