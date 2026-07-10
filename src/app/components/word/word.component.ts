import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, of, Subscription } from 'rxjs';
import { Word } from 'src/app/models/word';
import { DictionaryService } from 'src/app/services/DictionaryService';

@Component({
    selector: 'app-word',
    templateUrl: './word.component.html',
    styleUrls: ['./word.component.css'],
    standalone: false
})
export class WordComponent implements OnInit {

  fileExists: boolean = false;
  word!: Word | null;
  searchKey: string = "";
  private routeParamsSub: Subscription | undefined;

  constructor(
    private dictService: DictionaryService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.routeParamsSub = this.route.params.subscribe(params => {
      this.searchKey = params['searchKey'].toLowerCase();
      this.performSearch(this.searchKey);
    });
  }

  private performSearch(searchKey: string): void {
    this.dictService.findWordByUzbek(searchKey)
      .pipe(
        catchError((error) => {
          console.log(`Xatolik: ${error.error ? error.error.message : error.message}`);
          this.word = null;
          return of(null);
        })
      )
      .subscribe((data) => {
        this.word = data;
      });
  }

  ngOnDestroy(): void {
    // Clean up route params subscription to avoid memory leaks
    if (this.routeParamsSub) {
      this.routeParamsSub.unsubscribe();
    }
  }
}
