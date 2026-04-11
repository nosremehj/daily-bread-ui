import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HomeComponent } from './home.component';

registerLocaleData(localePt, 'pt-BR');

describe('HomeComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            user: signal({
              id: 1,
              name: 'João Silva',
              email: 'j@x.com',
              username: 'joao'
            }),
            getFirstName: () => 'João'
          }
        }
      ]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should greet with configured user name', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const h1 = fixture.nativeElement.querySelector('h1') as HTMLElement | null;
    expect(h1?.textContent).toContain('Olá');
    expect(h1?.textContent).toContain('João');
  });

  it('should show empty state and link to reading plans', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('#home-empty-heading')).not.toBeNull();
    expect(root.textContent).toContain('Plano de leitura');
    const cta = root.querySelector('a.home-cta') as HTMLAnchorElement | null;
    expect(cta?.getAttribute('href')).toBe('/reading-plans');
  });

  it('should format header date in Portuguese', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const sub = fixture.nativeElement.querySelector('.user-info p') as HTMLElement | null;
    expect(sub?.textContent?.length).toBeGreaterThan(3);
  });
});
