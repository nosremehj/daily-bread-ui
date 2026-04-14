import { afterNextRender, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ReadingProgressService } from '../../services/reading-progress.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent {
  readonly auth = inject(AuthService);
  private readonly readingProgress = inject(ReadingProgressService);

  readonly sidebarPlanLabel = computed(() => {
    const e = this.readingProgress.enrollmentSummary();
    if (e === undefined) {
      return 'Carregando…';
    }
    if (e === null) {
      return 'Plano não definido';
    }
    return e.planFilename;
  });

  constructor() {
    afterNextRender(() => {
      if (this.auth.isAuthenticated()) {
        this.auth.fetchProfile().subscribe();
        this.readingProgress.loadEnrollmentSummary();
      }
    });
  }

  logout(): void {
    this.auth.logout();
  }
}
