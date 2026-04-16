import { CommonModule } from '@angular/common';
import { afterNextRender, Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { ChangePasswordModalComponent } from '../change-password-modal/change-password-modal.component';
import { LanguageMenuComponent } from '../language-menu/language-menu.component';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslocoPipe,
    LanguageMenuComponent,
    ChangePasswordModalComponent,
  ],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss'
})
export class ProfilePageComponent {
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  private readonly transloco = inject(TranslocoService);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(256)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(320)]],
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(64)
      ]
    ]
  });

  readonly saving = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly passwordModalOpen = signal(false);

  constructor() {
    const u = this.auth.user();
    if (u) {
      this.form.patchValue({
        name: u.name,
        email: u.email,
        username: u.username
      });
    }
    afterNextRender(() => {
      this.auth.fetchProfile().subscribe((profile) => {
        if (profile) {
          this.form.patchValue({
            name: profile.name,
            email: profile.email,
            username: profile.username
          });
        }
      });
    });
  }

  openPasswordModal(): void {
    this.successMessage.set(null);
    this.passwordModalOpen.set(true);
  }

  closePasswordModal(): void {
    this.passwordModalOpen.set(false);
  }

  onPasswordChanged(): void {
    this.successMessage.set(this.transloco.translate('profile.successPassword'));
  }

  submit(): void {
    this.serverError.set(null);
    this.successMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, email, username } = this.form.getRawValue();
    this.saving.set(true);
    this.auth
      .updateProfile({
        name: name.trim(),
        email: email.trim(),
        username: username.trim()
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
               next: (res) => {
          if (res.newSession) {
            this.successMessage.set(this.transloco.translate('profile.successRenamed'));
          } else {
            this.successMessage.set(this.transloco.translate('profile.successProfile'));
          }
        },
        error: (err: Error) => this.serverError.set(err.message)
      });
  }
}
