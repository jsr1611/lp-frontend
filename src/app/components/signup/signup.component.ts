import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/AuthService';

@Component({
    selector: 'app-signup',
    templateUrl: './signup.component.html',
    styleUrls: ['./signup.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class SignupComponent {
  
  protected user: User = {
    username: '',
    email: '',
    password: '',
    firstname: '',
    lastname: '',
  }
 
  errorMessage: string = '';
  successMessage: string = '';

  constructor(private authService: AuthService, @Inject(Router) private router: Router) {}

  signup(): void {
    if (this.user.username === '') return;
    this.authService.signup(this.user).subscribe({
      next: (data) => {
        console.log(data);
        this.successMessage = data.message;
        this.errorMessage = "";
        setTimeout(()=>{
          this.successMessage = '';
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err: HttpErrorResponse) => {
        console.error(err);
        this.errorMessage = `${err.error ? err.error.message : err.message}`;
      },
    });
  }
}