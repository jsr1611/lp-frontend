import { Component, OnInit } from '@angular/core';
import { catchError, of } from 'rxjs';
import { Category, Word } from 'src/app/models/word';
import { DictionaryService } from 'src/app/services/DictionaryService';

@Component({
    selector: 'app-words',
    templateUrl: './words.component.html',
    styleUrls: ['./words.component.css'],
    standalone: false
})
export class WordsComponent implements OnInit{
  dict:Word[] = [];
  token: string | null = null;
  
  constructor(private dictService: DictionaryService) { }

  ngOnInit(): void {
  this.refresh();
  this.token = localStorage.getItem("token");
  }


  updateWord(index: number, id: string, category: Category){
    console.log("index of the word: ", index, id);
    const updatedWord: Word = {
      _id: id,
      arabic: (document.getElementById(index+"_arabic") as HTMLInputElement).value,
      pronunciation: (document.getElementById(index+"_pronunciation") as HTMLInputElement).value,
      uzbek: (document.getElementById(index+"_uzbek") as HTMLInputElement).value,
      english: (document.getElementById(index+"_english") as HTMLInputElement).value,
      category: category,
      __v: 0
    };
    
    console.log("word to update: ", updatedWord);
    this.dictService.updateWord(updatedWord).subscribe({
      next: (response => console.log(response)),
      error: (error => console.error(error))
    });
  }

  async refresh(){
    try{
      (await this.dictService
        .getDictionary())
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
    catch(e){
      (await this.dictService
        .getDictionaryLocal())
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

}
