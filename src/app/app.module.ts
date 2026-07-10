import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { DictionaryService } from './services/DictionaryService';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { WordsComponent } from './components/words/words.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { TestsComponent } from './components/tests/tests.component';
import { HomeComponent } from './components/home/home.component';
import { AddWordComponent } from './components/add-word/add-word.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { NavBarService } from './components/navbar/navbar.service';
import { WordComponent } from './components/word/word.component';
import { UserService } from './services/UserService';
import { LoginComponent } from './components/login/login.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { authGuard } from './config/AuthGuard';
import { AuthInterceptor } from './config/AuthInterceptor';
import { SignupComponent } from './components/signup/signup.component';
import { UserPageComponent } from './components/user-page/user-page.component';
import { AuthService } from './services/AuthService';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { SecureService } from './services/SercureService';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { GithubRepoManagerComponent } from './components/github-repo-manager/github-repo-manager.component';
import { GithubService } from './services/GithubService';
import { DownloaderComponent } from './components/downloader/downloader.component';
import { LoanTrackerComponent } from './components/loan-tracker/loan-tracker.component';


@NgModule({
    declarations: [
        AppComponent,
        WordsComponent,
        NotFoundComponent,
        TestsComponent,
        HomeComponent,
        AddWordComponent,
        NavbarComponent,
        FooterComponent,
        WordComponent,
        LoginComponent,
        SignupComponent,
        ResetPasswordComponent,
        UserPageComponent,
        DashboardComponent,
        GithubRepoManagerComponent,
        DownloaderComponent,
        LoanTrackerComponent
    ],
    bootstrap: [AppComponent],
    imports: [
        BrowserModule,
        FormsModule,
        ReactiveFormsModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatInputModule,
        MatFormFieldModule,
        MatSelectModule,
        // provideClientHydration(),
        // TransferHttpCacheModule,
        RouterModule.forRoot([
            { path: '', component: HomeComponent },
            { path: 'login', component: LoginComponent },
            { path: 'signup', component: SignupComponent },
            { path: 'reset-password', component: ResetPasswordComponent },
            { path: 'profile', component: UserPageComponent, canActivate: [authGuard] },
            { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
            { path: 'loans', component: LoanTrackerComponent, canActivate: [authGuard] },
            { path: 'home', component: HomeComponent },
            { path: 'add-word', component: AddWordComponent },
            { path: 'words', component: WordsComponent },
            { path: 'words/:searchKey', component: WordComponent },
            { path: 'tests', component: TestsComponent },
            { path: 'downloader', component: DownloaderComponent },
            { path: 'search/:searchKey', component: WordComponent },
            { path: '**', component: NotFoundComponent },
        ])
    ],
    providers: [
        DictionaryService, NavBarService, UserService, AuthService, SecureService, GithubService, DatePipe, CurrencyPipe,
        {
            provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true
        },
        provideHttpClient(withInterceptorsFromDi()), provideAnimationsAsync(),
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule { }
