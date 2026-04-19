import { Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * Spinner leve: anel CSS + ícone de livro (Unicons), sem dependências extras.
 * `labelKey` aponta para chave i18n (padrão: texto genérico “Carregando…”).
 */
@Component({
  selector: 'app-book-loading-spinner',
  standalone: true,
  imports: [TranslocoPipe],
  templateUrl: './book-loading-spinner.component.html',
  styleUrl: './book-loading-spinner.component.scss',
})
export class BookLoadingSpinnerComponent {
  /** Chave de tradução para o texto (ex.: `common.actions.loading`). */
  readonly labelKey = input<string>('common.actions.loading');

  /** `sm`: botões / linhas compactas; `md`: padrão; `lg`: destaque em página. */
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  /** Ícone à esquerda do texto (útil em barras de ação). */
  readonly inline = input(false);

  readonly showLabel = input(true);
}
