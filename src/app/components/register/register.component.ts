import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { BookLoadingSpinnerComponent } from '../book-loading-spinner/book-loading-spinner.component';
import { LanguageMenuComponent } from '../language-menu/language-menu.component';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  if (password == null || confirm == null || confirm === '') return null;
  if (password !== confirm) return { passwordMismatch: true };
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslocoPipe,
    LanguageMenuComponent,
    BookLoadingSpinnerComponent,
  ],
  templateUrl: './register.component.html',
  styleUrl: '../auth-form.scss'
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.maxLength(256)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(320)]],
      username: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(64)
        ]
      ],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(128)
        ]
      ],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: [passwordsMatch] }
  );

  submit(): void {
    this.serverError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, email, username, password } = this.form.getRawValue();
    this.submitting.set(true);
    this.auth
      .register({
        name: name.trim(),
        email: email.trim(),
        username: username.trim(),
        password
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl('/home'),
        error: (err: unknown) => this.serverError.set(this.parseApiError(err))
      });
  }

  private parseApiError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { error?: string } | undefined;
      if (typeof body?.error === 'string' && body.error.length > 0) {
        return body.error;
      }
    }
    return this.transloco.translate('auth.register.genericError');
  }
}
