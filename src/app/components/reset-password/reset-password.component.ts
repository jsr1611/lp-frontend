import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'src/app/services/AuthService';

@Component({
    selector: 'app-reset-password',
    templateUrl: './reset-password.component.html',
    styleUrls: ['./reset-password.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ResetPasswordComponent {
  email: string = '';
  successMessage: string = '';
  errorMessage: string = '';

  private readonly translate = inject(TranslateService);

  constructor(private authService: AuthService) {}

  resetPassword(): void {
    this.authService.resetPassword(this.email).subscribe({
      next: () => {
        this.successMessage = this.translate.instant('auth.resetPasswordSent');
      },
      error: (err) => {
        this.errorMessage = this.translate.instant('auth.errors.resetPasswordFailed');
      },
    });
  }
}
