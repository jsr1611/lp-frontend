import { Component, OnInit } from '@angular/core';
import { DictionaryService } from 'src/app/services/DictionaryService';

@Component({
  selector: 'app-tests',
  templateUrl: './tests.component.html',
  styleUrls: ['./tests.component.css']
})
export class TestsComponent implements OnInit{

  constructor(private dictService: DictionaryService){ }
  dict:any = [];
  testNumber:number = 0;
  testWord:any = "";
  answers:any = [];
  tmpAnswerNumbers:number[] = [];
  correctAnswer:number = 2;

  ngOnInit(): void {
    this.dict = this.dictService.getDictionary()
    .subscribe(data => {
      this.dict = data;
      this.generateTest();
    });
    
  }

  generateRandomNumber(max:number):number{
    return Math.floor(Math.random() * max);    
  }

  generateTest(){
    this.testNumber = this.generateRandomNumber(this.dict.length);
    console.log("test number generated: ", this.testNumber);
    this.testWord = this.dict[this.testNumber].arabic;
    this.answers = [];
    this.tmpAnswerNumbers = [];
    let randNumber = 0;
    this.correctAnswer = this.generateRandomNumber(4);
    this.tmpAnswerNumbers.push(this.correctAnswer);
    for (let i = 0; i <  4; i++)   {
      if(i==this.correctAnswer){
        this.answers.push(this.dict[this.testNumber]);
      }else{
        randNumber = this.dict[this.generateRandomNumber(this.dict.length)];
        while(this.tmpAnswerNumbers.includes(randNumber)){
          randNumber = this.dict[this.generateRandomNumber(this.dict.length)];
        }
        this.answers.push(randNumber);
      }
    }
  }
  

  submitAnswer(key: number){
    let btn = document.getElementById('ans'+key);
    btn?.classList.remove('btn-light');
    if(key === this.correctAnswer){
      btn?.classList.add('btn-success');
    }else{
      btn?.classList.add('btn-danger');
    }
  }
}
