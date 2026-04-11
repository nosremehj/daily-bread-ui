import { formatDate } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  private readonly auth = inject(AuthService);

  readonly userName = computed(() => this.auth.getFirstName());
  readonly headerDate = formatDate(new Date(), "d 'de' MMMM, EEEE", 'pt-BR');
}
