import { Component } from '@angular/core';

@Component({
  selector: 'app-tests',
  templateUrl: './tests.component.html',
  styleUrls: ['./tests.component.css']
})
export class TestsComponent {

  testWord:any = "saljun";
  answers:any = ['a', 'b', 'c', 'd'];
  correctAnswer:number = 2;

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
