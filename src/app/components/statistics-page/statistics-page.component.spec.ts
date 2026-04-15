import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ReadingProgressService } from '../../services/reading-progress.service';
import { StatisticsPageComponent } from './statistics-page.component';

describe('StatisticsPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatisticsPageComponent],
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
