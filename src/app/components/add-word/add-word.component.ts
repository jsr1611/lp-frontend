import { Component, ChangeDetectionStrategy } from '@angular/core';
import { catchError, of } from 'rxjs';
import { Category, Word } from 'src/app/models/word';
import { CategoryMapping } from 'src/app/mappings/category-mapping';
import { DictionaryService } from 'src/app/services/DictionaryService';

@Component({
    selector: 'app-add-word',
    templateUrl: './add-word.component.html',
    styleUrls: ['./add-word.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class AddWordComponent {
  public newWord: Word = {
    _id: '',
    arabic: '',
    pronunciation: '',
    uzbek: '',
    english: '',
    category: Category.Noun,
    remark: '',
  };

  categories: Category[] = Object.values(Category); // Enum values
  categoryLabels = CategoryMapping; // Uzbek labels
  successMsg = "";

  constructor(
    private dictionaryService: DictionaryService,
  ) {}

  addWord(): void {
    // Validate required fields
    if (!this.isFormValid()) {
      console.log('Please fill out all required fields for a new word');
      return;
    }
    this.newWord.pronunciation = this.newWord.pronunciation.toLowerCase();
    this.newWord.uzbek = this.newWord.uzbek.toLowerCase();
    this.newWord.english = this.newWord.english?.toLowerCase();
    this.dictionaryService.createDictEntry(this.newWord).pipe(
      catchError((error) => {
        console.error('Error creating word entry:', error.error);
        this.successMsg = "So'zni saqlashda muammoga duch kelindi.";
        let errMsg = error.error ? error.error.message : error.message;
        alert(errMsg);
        return of(null);
      })
    ).subscribe((data) => {
      if (data) {
        console.log('Server response:', data);
        this.resetForm();
        this.successMsg = "So'z muvaffaqiyatli saqlandi...";
        setTimeout(() => {
          this.successMsg = "";
        }, 2000)

      }
    });
  }

  private isFormValid(): boolean {
    return !!(this.newWord.arabic && this.newWord.uzbek && this.newWord.category && this.newWord.pronunciation);
  }

  private resetForm(): void {
    this.newWord = {
      _id: '',
      arabic: '',
      pronunciation: '',
      uzbek: '',
      english: '',
      category: Category.Noun,
      remark: '',
    };
  }
}
