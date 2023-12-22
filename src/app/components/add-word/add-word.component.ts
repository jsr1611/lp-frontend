import { Component } from '@angular/core';
import { catchError, of } from 'rxjs';
import { DictionaryService } from 'src/app/services/DictionaryService';

@Component({
  selector: 'app-add-word',
  templateUrl: './add-word.component.html',
  styleUrls: ['./add-word.component.css']
})
export class AddWordComponent {
  dict:any[] = [];

  word = "";
  arabic = "";
  meaning = "";
  wordType = "";

  constructor(private http: DictionaryService){}

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
      }
    });
  };
}
}
