import { Component } from '@angular/core';
import { AuthService } from 'src/app/services/AuthService';

@Component({
    selector: 'app-reset-password',
    templateUrl: './reset-password.component.html',
    styleUrls: ['./reset-password.component.css'],
    standalone: false
})
export class ResetPasswordComponent {
  email: string = '';
  successMessage: string = '';
  errorMessage: string = '';

  constructor(private authService: AuthService) {}

  resetPassword(): void {
    this.authService.resetPassword(this.email).subscribe({
      next: () => {
        this.successMessage = 'Password reset instructions sent to your email';
      },
      error: (err) => {
        this.errorMessage = 'Failed to reset password';
      },
    });
  }
}
