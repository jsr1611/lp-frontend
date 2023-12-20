import { Component, OnInit } from '@angular/core';
import { DictionaryService } from './services/DictionaryService';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Arabic Course';
  dict:any[] = [];

  word = "";
  arabic = "";
  meaning = "";
  wordType = "";

  constructor(private http: DictionaryService){}
  ngOnInit(): void {
    this.refresh();
  }

  refresh(){
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

  addWord(){
    console.log("New word");
    
    const newWord = {
      word: this.word,
      arabic: this.arabic,
      meaning: this.meaning,
      type: this.wordType
    }
    if(!newWord.arabic || !newWord.meaning) {
      console.log("Word is missing");
      return;
    }
    else{     
    this.http.createDictEntry(newWord).pipe(
        catchError((error) => {
          console.log(error);
          return of(null);
        })
    )
    .subscribe((data)=>{
      if(data){
        console.log("Server response: ", data);
        this.word = "";
        this.arabic = "";
        this.meaning = "";
        this.wordType = "";

        this.refresh();
      }
    });
  };
}
}
