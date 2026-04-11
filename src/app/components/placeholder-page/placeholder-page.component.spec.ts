import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { PlaceholderPageComponent } from './placeholder-page.component';

describe('PlaceholderPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlaceholderPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { title: 'Bíblia' } }
          }
        }
      ]
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(PlaceholderPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show title from route data', () => {
    const fixture = TestBed.createComponent(PlaceholderPageComponent);
    fixture.detectChanges();
    const h1 = fixture.nativeElement.querySelector('h1') as HTMLElement | null;
    expect(h1?.textContent?.trim()).toBe('Bíblia');
  });
});
