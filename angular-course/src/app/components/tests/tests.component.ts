import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { DictionaryService } from "src/app/services/DictionaryService";

@Component({
  selector: "app-tests",
  templateUrl: "./tests.component.html",
  styleUrls: ["./tests.component.css"],
})
export class TestsComponent implements OnInit {
  constructor(private dictService: DictionaryService, private router: Router) {}
  dict: any = [];
  testNumber: number = 0;
  testWord: any = "";
  answers: any = [];
  tmpAnswerNumbers: number[] = [];
  correctAnswer: number = 2;
  totalTestNumbers: number[] = [];
  prevAnsKey: number = 0;
  userAnsers: boolean[] = [];
  userCorrectTimes: number = 0;
  userFalseTimes: number = 0;

  ngOnInit(): void {
    this.dict = this.dictService.getDictionary().subscribe((data) => {
      this.dict = data;
      this.generateTest();
    });
  }

  generateRandomNumber(max: number): number {
    return Math.floor(Math.random() * max);
  }

  generateTest() {
    let btns = document.getElementsByClassName("ans-btn");
    for (let index = 0; index < btns.length; index++) {
      const btn = btns[index];
      btn.className = '';
      btn.classList.add('ans-btn', 'btn', 'btn-light');
    }

    this.answers = [];
    this.testNumber = this.generateRandomNumber(this.dict.length);
    if (this.totalTestNumbers.length > 0) {
      if (this.totalTestNumbers.length === this.dict.length) {
        alert("Siz " + this.totalTestNumbers.length +" ta testdan "+ this.userCorrectTimes+" tasini to'g'ri yechdingiz. Yana urinib ko'ring!");
        this.totalTestNumbers = [];
        this.userAnsers = [];
        this.userCorrectTimes = 0;
        this.userFalseTimes = 0;
      }
      while (this.totalTestNumbers.includes(this.testNumber)) {
        this.testNumber = this.generateRandomNumber(this.dict.length);
      }
    }
    this.totalTestNumbers.push(this.testNumber);
    console.log("test number generated: ", this.testNumber);
    this.testWord = this.dict[this.testNumber].arabic;

    this.tmpAnswerNumbers = [];
    let randNumber = 0;
    this.correctAnswer = this.generateRandomNumber(4);

    this.tmpAnswerNumbers.push(this.testNumber);
    for (let i = 0; i < 4; i++) {
      if (i === this.correctAnswer) {
        this.answers.push(this.dict[this.testNumber]);
      } else {
        randNumber = this.generateRandomNumber(this.dict.length);
        while (this.tmpAnswerNumbers.includes(randNumber)) {
          randNumber = this.generateRandomNumber(this.dict.length);
        }
        this.answers.push(this.dict[randNumber]);
        this.tmpAnswerNumbers.push(randNumber);
      }
    }
  }

  submitAnswer(key: number) {
    let btn = document.getElementById("ans" + key);
    btn?.classList.remove("btn-light");
    this.prevAnsKey = key;
    if (key === this.correctAnswer) {
      btn?.classList.add("btn-success");
      if (this.totalTestNumbers.length > this.userAnsers.length) {
        this.userAnsers.push(true);
        this.userCorrectTimes += 1;
      }
    } else {
      btn?.classList.add("btn-danger");
      if (this.totalTestNumbers.length > this.userAnsers.length) {
        this.userAnsers.push(false);
        this.userFalseTimes += 1;
      }
    }
  }
}
