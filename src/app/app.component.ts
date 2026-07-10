import { Component, OnInit } from '@angular/core';
import { UserService } from './services/UserService';
import { Visit } from './models/visit';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    standalone: false
})
export class AppComponent implements OnInit {
  title = 'Arabic Course';
  dailyVisitData!: Visit;
  dailyVisitCount: number = 0;
  UNIQUE_VISITORS: string = "uniqueVisitors";
  CURRENT_DATE: string = "currentDate";


  constructor(
    private userService: UserService
  ) { }
  
  ngOnInit(): void {
    let storedCount = localStorage.getItem(this.UNIQUE_VISITORS);
    let storedDate = localStorage.getItem(this.CURRENT_DATE);

    const now = new Date();
    const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (storedDate && storedDate == this.dateFormatter(utcDate)) {
      this.dailyVisitCount = Number(storedCount);
    } else {
      localStorage.removeItem(this.UNIQUE_VISITORS);
    }

    this.userService.recordVisit().subscribe({
      next: () => console.log('Tashrif muvaffaqiyatli qayd etildi. Tashrifingiz uchun rahmat!'),
      error: error => console.error('Tashrif qayd etishda xatolik bo`ldi', error)
    });

    setTimeout(() => {
      this.userService.getVisitsCount().subscribe({
        next: (visitData: Visit) => {
          this.dailyVisitData = visitData;
          if (storedDate != this.dateFormatter(visitData.date)) {
            this.dailyVisitCount = visitData.uniqueVisitors;
            localStorage.setItem(this.UNIQUE_VISITORS, `${this.dailyVisitCount}`);
            localStorage.setItem(this.CURRENT_DATE, `${this.dateFormatter(visitData.date)}`);
          } else {
            if (this.dailyVisitCount < visitData.uniqueVisitors) {
              this.dailyVisitCount = visitData.uniqueVisitors;
              localStorage.setItem(this.UNIQUE_VISITORS, `${this.dailyVisitCount}`);
            }
          }
        },
        error: (error: any) => console.error('Tashriflar ma`lumotini yuklashda xatolik bo`ldi', error)
      });
    }, 1000);
  }

  dateFormatter = (date: Date): string => {
    date = new Date(date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

}
