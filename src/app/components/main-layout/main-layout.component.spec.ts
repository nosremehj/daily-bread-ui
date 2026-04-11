import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { routes } from '../../app.routes';
import { AuthService } from '../../services/auth.service';
import { MainLayoutComponent } from './main-layout.component';

describe('MainLayoutComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
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
