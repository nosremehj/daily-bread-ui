import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { of } from 'rxjs';
import { TRANSLATIONS_BY_LANG } from '../../core/i18n/translations-bundled';
import { routes } from '../../app.routes';
import { AuthService } from '../../services/auth.service';
import { ReadingProgressService } from '../../services/reading-progress.service';
import { MainLayoutComponent } from './main-layout.component';

describe('MainLayoutComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MainLayoutComponent,
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
        provideRouter(routes),
        {
          provide: AuthService,
          useValue: {
            user: signal({
              id: 1,
              name: 'João Silva',
              email: 'j@x.com',
              username: 'joao'
            }),
            isAuthenticated: () => true,
            fetchProfile: () => of(null),
            logout: () => {
              /* noop */
            }
          }
        },
        {
          provide: ReadingProgressService,
          useValue: {
            enrollmentSummary: signal(null),
            loadEnrollmentSummary: () => {
              /* noop */
            }
          }
        }
      ]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(MainLayoutComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render primary navigation and child outlet', () => {
    const fixture = TestBed.createComponent(MainLayoutComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('nav[aria-label="Navegação principal"]')).not.toBeNull();
    expect(el.querySelector('main.main-content router-outlet')).not.toBeNull();
  });

  it('should show app brand name', () => {
    const fixture = TestBed.createComponent(MainLayoutComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Pão diário');
  });
});
