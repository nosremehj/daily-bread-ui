import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localeEs from '@angular/common/locales/es';
import localePt from '@angular/common/locales/pt';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

registerLocaleData(localePt, 'pt-BR');
registerLocaleData(localeEn, 'en-US');
registerLocaleData(localeEs, 'es');

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
