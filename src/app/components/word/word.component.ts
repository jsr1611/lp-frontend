import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, of } from 'rxjs';
import { DictionaryService } from 'src/app/services/DictionaryService';

@Component({
  selector: 'app-word',
  templateUrl: './word.component.html',
  styleUrls: ['./word.component.css']
})
export class WordComponent implements OnInit{

  constructor(private dictService: DictionaryService, private route: ActivatedRoute) { }
  word:any = "";
  ngOnInit(): void {
    let id = Number(this.route.snapshot.paramMap.get('id'));
    console.log("id: ", id);
    this.dictService.findWordById(id)
    .pipe(catchError((error)=>{
      console.log(error);
      return of(null);
    }))
    .subscribe((data) =>{
      if(data)
        this.word = data;
    })
  }


}
