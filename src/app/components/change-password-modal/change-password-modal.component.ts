import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const a = group.get('newPassword')?.value;
  const b = group.get('confirmPassword')?.value;
  if (a == null || b == null || b === '') return null;
  if (a !== b) return { passwordMismatch: true };
  return null;
}

@Component({
  selector: 'app-change-password-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './change-password-modal.component.html',
  styleUrl: './change-password-modal.component.scss'
})
export class ChangePasswordModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  @Input() set open(value: boolean) {
    this._open = value;
    if (value) {
      this.form.reset();
      this.serverError.set(null);
      this.submitting.set(false);
    }
  }
  get open(): boolean {
    return this._open;
  }
  private _open = false;

  @Output() readonly dismiss = new EventEmitter<void>();
  @Output() readonly passwordChanged = new EventEmitter<void>();

  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: [
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

  onOverlayClick(): void {
    if (!this.submitting()) {
      this.close();
    }
  }

  close(): void {
    this.dismiss.emit();
  }

  submit(): void {
    this.serverError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { currentPassword, newPassword } = this.form.getRawValue();
    this.submitting.set(true);
    this.auth
      .changePassword({ currentPassword, newPassword })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.passwordChanged.emit();
          this.close();
        },
        error: (err: Error) => this.serverError.set(err.message)
      });
  }
}
