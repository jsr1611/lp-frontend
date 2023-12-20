import { Component, OnInit } from '@angular/core';
import { DictionaryService } from './services/DictionaryService';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'angular-course';
  dict:any[] = [];

  constructor(private http: DictionaryService){}
  ngOnInit(): void {
    this.http
    .getDictionary()
    .pipe(
      catchError((error) => {
      console.log(error);
      return of(null);
    }))
    .subscribe((data) =>{
      if(data)
        this.dict = data;
      else
        this.dict = [];
    })
  }

}
