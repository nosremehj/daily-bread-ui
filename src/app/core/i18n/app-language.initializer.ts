import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from './language.service';

export function appLanguageInitializer(
  transloco: TranslocoService,
  language: LanguageService,
): () => Promise<void> {
  return () => {
    language.initFromStorage();
    return firstValueFrom(transloco.load(transloco.getActiveLang())).then(() => {
      language.applyDocumentTitle();
    });
  };
}
