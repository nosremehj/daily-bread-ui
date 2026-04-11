import { afterNextRender, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent {
  readonly auth = inject(AuthService);

  constructor() {
    afterNextRender(() => {
      if (this.auth.isAuthenticated()) {
        this.auth.fetchProfile().subscribe();
      }
    });
  }

  logout(): void {
    this.auth.logout();
  }
}
