import {
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LanguageService, type AppLang } from '../../core/i18n/language.service';

let langMenuIdSeq = 0;

@Component({
  selector: 'app-language-menu',
  standalone: true,
  imports: [TranslocoPipe],
  templateUrl: './language-menu.component.html',
  styleUrl: './language-menu.component.scss',
})
export class LanguageMenuComponent {
  private readonly language = inject(LanguageService);
  private readonly transloco = inject(TranslocoService);

  readonly activeLang = this.transloco.activeLang;
  readonly langMenuOpen = signal(false);
  readonly langMenuPanelId = `app-lang-menu-panel-${++langMenuIdSeq}`;

  private readonly langMenuHost = viewChild<ElementRef<HTMLElement>>('langMenuHost');

  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent): void {
    if (!this.langMenuOpen()) {
      return;
    }
    const host = this.langMenuHost()?.nativeElement;
    const target = ev.target as Node | null;
    if (target && host && !host.contains(target)) {
      this.langMenuOpen.set(false);
    }
  }

  toggleLangMenu(): void {
    this.langMenuOpen.update((v) => !v);
  }

  pickLang(code: string): void {
    if (code === 'pt-BR' || code === 'en' || code === 'es') {
      this.language.setLanguage(code as AppLang);
    }
    this.langMenuOpen.set(false);
  }
}
