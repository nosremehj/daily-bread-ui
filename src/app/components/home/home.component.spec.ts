import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';

registerLocaleData(localePt);

describe('HomeComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent]
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

  it('should show dashboard sections', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('#progress-heading')).not.toBeNull();
    expect(root.textContent).toContain('Leitura de Hoje');
    expect(root.textContent).toContain('Essa Semana');
  });

  it('should format header date in Portuguese', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const sub = fixture.nativeElement.querySelector('.user-info p') as HTMLElement | null;
    expect(sub?.textContent?.length).toBeGreaterThan(3);
  });
});
