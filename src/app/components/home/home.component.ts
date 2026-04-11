import { Component } from '@angular/core';
import { formatDate } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  readonly userName = 'João';
  readonly headerDate = formatDate(new Date(), "d 'de' MMMM, EEEE", 'pt-BR');
}
