import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { DictionaryService } from './services/DictionaryService';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { WordsComponent } from './components/words/words.component';
import { RouterModule } from '@angular/router';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { TestsComponent } from './components/tests/tests.component';
import { HomeComponent } from './components/home/home.component';
import { AddWordComponent } from './components/add-word/add-word.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { NavBarService } from './components/navbar/navbar.service';

@NgModule({
  declarations: [
    AppComponent,
    WordsComponent,
    NotFoundComponent,
    TestsComponent,
    HomeComponent,
    AddWordComponent,
    NavbarComponent,
    FooterComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    RouterModule.forRoot([
      {path:'', component:HomeComponent},
      {path:'home', component:HomeComponent},
      {path:'add-word', component:AddWordComponent},
      {path:'words', component:WordsComponent},
      {path:'tests', component:TestsComponent},
      //404 Not Found
      {path:'**', component:NotFoundComponent}
    ])
  ],
  providers: [DictionaryService, NavBarService],
  bootstrap: [AppComponent]
})
export class AppModule { }
