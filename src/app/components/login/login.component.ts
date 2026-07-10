import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/AuthService';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css'],
    standalone: false
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  errorMessage: string = '';

  constructor(private authService: AuthService, @Inject(Router) private router: Router) {}

  login(): void {
    this.authService.login(this.username, this.password).subscribe({
      next: (response) => {
        this.authService.setToken(response.token);
        this.router.navigate(['/profile']);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = `${err.error ? err.error.message : err.message}`;
      },
    });
  }
}