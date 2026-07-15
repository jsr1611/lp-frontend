import { AfterViewInit, Component, Inject, OnInit, ChangeDetectionStrategy, LOCALE_ID, inject } from "@angular/core";
import { SecureService } from "src/app/services/SercureService";
import { Chart, registerables } from "chart.js";
import { User } from "src/app/models/user";
import { AuthService } from "src/app/services/AuthService";
import { HttpErrorResponse } from "@angular/common/http";
import { Router } from "@angular/router";
import { DatePipe } from "@angular/common";
import { TranslateService } from "@ngx-translate/core";
Chart.register(...registerables)
@Component({
    selector: "app-dashboard",
    templateUrl: "./dashboard.component.html",
    styleUrls: ["./dashboard.component.css"],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class DashboardComponent implements OnInit, AfterViewInit {
  numWeeks: number = 2;
  visitData: any[] = [];
  visitsByCountry: { [key: string]: number } = {};
  visitsOverTime: { [key: string]: number } = {};
  visitsOverTime2: { [key: string]: number } = {};
  visitsOverTimeColor: { [key: string]: string } = {};
  deviceInfo: { [key: string]: number } = {};
  haveAdminRight: boolean = false;

  protected users!: User[];
  protected token: string | null = null;

  private readonly translate = inject(TranslateService);
  private readonly datePipe = inject(DatePipe);
  /** The language the UI is running in — chart axis labels must follow it, not the machine's locale. */
  private readonly locale = inject(LOCALE_ID);

  constructor(
    private authService: AuthService,
    @Inject(Router) private router: Router,
    private secureService: SecureService
  ) {}

  ngAfterViewInit() {
    this.fetchVisitData();
  }

  changeStatus(index: number, userId: string|undefined, userStatus: boolean|undefined) {
    this.authService.changeUserStatus(userId, !userStatus).subscribe({
      next: (data: any) => {
        console.log(data);
        this.users[index].is_activated = !userStatus;
      },
      error: (err: HttpErrorResponse) => {
        console.log('Error fetching user profile', (err.error ? err.error.message : err.message));
        if (err.status === 401) {
          localStorage.removeItem('token');
          this.router.navigate(['/login']);
        }
      }
    })    
  }

  convertImage(img: any) {
    return img && btoa(String.fromCharCode(...new Uint8Array(img)));
  }

  displayDate(data: string|undefined) {
    return data && new Date(data);
  }

  ngOnInit(): void {
    this.token = this.authService.getToken();
    try {
      this.authService.getUserProfile('one').subscribe({
        next: (data) =>{
          this.haveAdminRight = data?.user.is_superuser ?? false;
          if(this.haveAdminRight){
            this.authService.getUserProfile('all').subscribe({
              next: (data: any) => {
                this.users = data.users;
              },
              error: (err: HttpErrorResponse) => {
                console.log('Error fetching user profile', (err.error ? err.error.message : err.message));
                if (err.status === 401) {
                  localStorage.removeItem('token');
                  this.router.navigate(['/login']);
                }
              }
            });
          }
        },
        error: (err: HttpErrorResponse) => {
          console.log('Error fetching user profile', (err.error ? err.error.message : err.message));
        }
      });
    } catch (err) {
      console.error(err);
    }
  }

  async fetchVisitData() {
    this.secureService.getVisits(this.numWeeks)
      .subscribe((data) => {
        this.visitData = Array.isArray(data) ? data : [data];
        this.processData();
      });
  }

  getRandomInt(min: number, max:number) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return "#" + Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled);
  }

  processData() {
    const countryCounts: { [key: string]: number } = {};
    const deviceCounts: { [key: string]: number } = {};
    this.visitsOverTime = {};
    
    const unknown = this.translate.instant('dashboard.unknown');

    this.visitData.forEach(day => {
      // These become chart axis labels, so they have to be formatted in the app's
      // language rather than whatever locale the browser happens to be set to.
      const date = this.datePipe.transform(day.date, 'shortDate', undefined, this.locale) ?? String(day.date);

      let rand = this.getRandomInt(0, 999);

      if (!this.visitsOverTime[date]) {
        this.visitsOverTime[date] = 0;
        this.visitsOverTime2[date] = 0;
        this.visitsOverTimeColor[date] = rand;
      }

      this.visitsOverTime[date] += day.count;
      this.visitsOverTime2[date] += new Set(day.uniqueVisitors).size;
      day.visits.forEach((visit: { location: { country: string; }; device: { type: string; }; }) => {
        // Country and device names come from the backend and stay as-is; only our
        // own fallback is translated.
        const country = visit.location.country || unknown;
        countryCounts[country] = (countryCounts[country] || 0) + 1;
        const device = visit.device.type || unknown;
        deviceCounts[device] = (deviceCounts[device] || 0) + 1;
      });
    });

    this.visitsByCountry = countryCounts;    
    this.deviceInfo = deviceCounts;
    this.drawCharts();
  }

  drawCharts() {
    this.drawPieChart('pieChart1', this.visitsByCountry, this.translate.instant('dashboard.chart.visitsByCountry'));
    this.drawBarChart('barChart1', this.visitsOverTime, this.translate.instant('dashboard.chart.totalVisitsOverTime'));
    this.drawBarChart('barChart2', this.visitsOverTime2, this.translate.instant('dashboard.chart.uniqueVisitsOverTime'));
    this.drawPieChart('deviceChart', this.deviceInfo, this.translate.instant('dashboard.chart.deviceInfo'));
  }


  drawPieChart(element: string, data: any, title: string){
    const chart = new Chart(element, {
      type: 'pie',
      data:{
        labels: Object.keys(data),
        datasets: [
          {
            label: title,
            data: Object.values(data) ,
            backgroundColor: Object.values(this.visitsOverTimeColor),
          }
        ]
      }
    })
  }

  drawBarChart(element: string, data: { [key: string]: number }, title: string){
    const chart = new Chart(element, {
      type: 'bar',
      data:{
        labels: Object.keys(data),
        datasets: [
          {
            label: title,
            data: Object.values(data),
            backgroundColor:  Object.values(this.visitsOverTimeColor),
          }
        ]
      }
    })
  }

}
