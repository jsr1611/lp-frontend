import { Component, OnInit } from '@angular/core';
import { catchError, of } from 'rxjs';
import { DictionaryService } from 'src/app/services/DictionaryService';

@Component({
  selector: 'app-words',
  templateUrl: './words.component.html',
  styleUrls: ['./words.component.css']
})
export class WordsComponent implements OnInit{

  constructor(private dictService: DictionaryService) { }
  
  ngOnInit(): void {
  this.refresh();
  }
  dict:any[] = [];

  refresh(){
    this.dictService
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
