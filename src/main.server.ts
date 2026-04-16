import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localeEs from '@angular/common/locales/es';
import localePt from '@angular/common/locales/pt';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';

registerLocaleData(localePt, 'pt-BR');
registerLocaleData(localeEn, 'en-US');
registerLocaleData(localeEs, 'es');

const bootstrap = () => bootstrapApplication(AppComponent, config);

export default bootstrap;
