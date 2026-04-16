import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { of } from 'rxjs';
import { TRANSLATIONS_BY_LANG } from '../../core/i18n/translations-bundled';
import { ReadingProgressService } from '../../services/reading-progress.service';
import { StatisticsPageComponent } from './statistics-page.component';

describe('StatisticsPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        StatisticsPageComponent,
        TranslocoTestingModule.forRoot({
          langs: {
            'pt-BR': TRANSLATIONS_BY_LANG['pt-BR'],
            en: TRANSLATIONS_BY_LANG['en'],
            es: TRANSLATIONS_BY_LANG['es'],
          },
          translocoConfig: {
            availableLangs: ['pt-BR', 'en', 'es'],
            defaultLang: 'pt-BR',
          },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideRouter([]),
        {
          provide: ReadingProgressService,
          useValue: {
            enrollmentSummary: signal(null),
            loadEnrollmentSummary: () => {
              /* noop */
            },
            getStatisticsOrNull: () => of(null)
          }
        }
      ]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(StatisticsPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show empty state when statistics is null and no error', () => {
    const fixture = TestBed.createComponent(StatisticsPageComponent);
    fixture.componentInstance.loading.set(false);
    fixture.componentInstance.stats.set(null);
    fixture.componentInstance.errorMessage.set(null);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#stats-empty-heading')).not.toBeNull();
  });
});
