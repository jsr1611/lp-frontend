import { Component, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, of } from 'rxjs';
import { DictionaryService } from 'src/app/services/DictionaryService';

@Component({
  selector: 'app-word',
  templateUrl: './word.component.html',
  styleUrls: ['./word.component.css']
})
export class WordComponent implements OnInit, OnChanges{
  word:any = "";
  constructor(private dictService: DictionaryService, private route: ActivatedRoute) { }

  ngOnChanges(changes: SimpleChanges): void {
    console.log(changes['word']);
  }
  ngOnInit(): void {

    let id = Number(this.route.snapshot.paramMap.get('id'));
    let keyWord = this.route.snapshot.paramMap.get('searchKey');
    console.log("id: ", id);
    id!=0 && this.dictService.findWordById(id)
    .pipe(catchError((error)=>{
      console.log(error);
      return of(null);
    }))
    .subscribe((data) =>{
      if(data)
        this.word = data;
    })
    this.dictService.getDictionaryLocal()
    .pipe(catchError(error => {
      console.log(error);
      return of(null);
    }))
    .subscribe(data =>{
      data?.forEach(w =>{
        if(keyWord && (w.word + "").startsWith(keyWord)){
          this.word = w;
          return;
        }
      })
    })
  }


}
