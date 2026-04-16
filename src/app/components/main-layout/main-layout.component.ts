import { afterNextRender, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ReadingProgressService } from '../../services/reading-progress.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslocoPipe],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly readingProgress = inject(ReadingProgressService);

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
