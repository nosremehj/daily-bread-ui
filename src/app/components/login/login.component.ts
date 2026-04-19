import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { BookLoadingSpinnerComponent } from '../book-loading-spinner/book-loading-spinner.component';
import { LanguageMenuComponent } from '../language-menu/language-menu.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslocoPipe,
    LanguageMenuComponent,
    BookLoadingSpinnerComponent,
  ],
  templateUrl: './login.component.html',
  styleUrl: '../auth-form.scss'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  toggleShowPassword(): void {
    this.showPassword.update((v) => !v);
  }

  submit(): void {
    this.serverError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { username, password } = this.form.getRawValue();
    this.submitting.set(true);
    this.auth
      .login(username.trim(), password)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl('/home'),
        error: () =>
          this.serverError.set(this.transloco.translate('auth.login.invalidCredentials'))
      });
  }
}
