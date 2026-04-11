import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomeComponent } from './home.component';

registerLocaleData(localePt, 'pt-BR');

describe('HomeComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should greet with configured user name', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    const { userName } = fixture.componentInstance;
    fixture.detectChanges();
    const h1 = fixture.nativeElement.querySelector('h1') as HTMLElement | null;
    expect(h1?.textContent).toContain('Olá');
    expect(h1?.textContent).toContain(userName);
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
