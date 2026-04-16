import { APP_INITIALIZER, ApplicationConfig, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { appLanguageInitializer } from './core/i18n/app-language.initializer';
import { LanguageService } from './core/i18n/language.service';
import { AppTranslocoLoader } from './core/i18n/transloco-app.loader';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideTransloco({
      config: {
        availableLangs: ['pt-BR', 'en', 'es'],
        defaultLang: 'pt-BR',
        fallbackLang: 'pt-BR',
        reRenderOnLangChange: true,
      },
      loader: AppTranslocoLoader,
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: appLanguageInitializer,
      deps: [TranslocoService, LanguageService],
      multi: true,
    },
    { provide: LOCALE_ID, useValue: 'pt-BR' },
  ],
};
