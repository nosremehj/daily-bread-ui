/** Maps Transloco language codes to Angular `formatDate` / `DatePipe` locale ids. */
export function translocoToAngularLocale(lang: string): string {
  switch (lang) {
    case 'en':
      return 'en-US';
    case 'es':
      return 'es';
    default:
      return 'pt-BR';
  }
}

/** Long date with weekday for dashboard header (Transloco lang codes). */
export function longWeekdayDateFormat(translocoLang: string): string {
  switch (translocoLang) {
    case 'pt-BR':
      return "d 'de' MMMM, EEEE";
    case 'es':
      return "EEEE, d 'de' MMMM";
    default:
      return 'EEEE, MMMM d, y';
  }
}
