import { HttpErrorResponse } from "@angular/common/http";
import { AfterViewInit, Component, EventEmitter, Inject, Input, OnInit, Output, ChangeDetectionStrategy } from "@angular/core";
import { Currency, User } from "src/app/models/user";
import { AuthService } from "src/app/services/AuthService";
import { DatePipe } from "@angular/common";
import { Expense } from "src/app/models/expense";
import { Chart } from "chart.js";
import { SecureService } from "src/app/services/SercureService";
import { MatDatepickerInputEvent } from "@angular/material/datepicker";
import { DateAdapter, MAT_DATE_LOCALE } from "@angular/material/core";
import { MonthpickerDateAdapter } from "src/app/mappings/monthdatepicker-date-adapter";
import { Platform } from "@angular/cdk/platform";
import { Router } from "@angular/router";


interface GroupedExpense {
  [category: string]: { amount: number };
}


@Component({
    selector: "app-user-page",
    templateUrl: "./user-page.component.html",
    styleUrls: ["./user-page.component.css"],
    providers: [
        {
            provide: DateAdapter,
            useClass: MonthpickerDateAdapter,
            deps: [MAT_DATE_LOCALE, Platform],
        },
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class UserPageComponent implements OnInit, AfterViewInit {
  private USER_CONST = {
    EXPENSE: "expense",
    USER: "user",
  }
  protected user: User = {
    username: "",
    email: "",
    password: "",
    firstname: "",
    lastname: "",
    is_activated: false,
    is_superuser: false,
    currency: {
      code: "UZS", name: "",
      symbol: ""
    },
  };
  protected userInfo!: User;
  protected monthlyExpensesChart: any;
  protected detailedExpenseChart: any;
  protected token: string | null = null;
  @Input()
  protected monthAndYear: Date = new Date();
  @Output()
  protected monthAndYearChange = new EventEmitter<Date | null>();
  selectedFile: File | null = null;
  maxSizeInMB = 2;
  displayInput: boolean = false;
  displayUpdateInput: boolean = false;
  displayUserModal: boolean = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;
  selectedMonthStr!: string;
  selectedYear: number = new Date().getFullYear();
  today: Date = new Date();
  monthlyTotal = 0;
  protected readonly ONE: string = 'one';
  protected readonly ALL: string = 'all';
  todaysExpense: Expense = {
    date: new Date().toISOString().split('T')[0],
    category: '',
    amount: 0,
    description: ''
  };
  monthlyExpenses: {
    month: string,
    total: string,
  }[] = [];
  currentMonthExpenses: Expense[] = [];

  isEditModalOpen = false;
  editExpense: Expense = this.todaysExpense;

  popularCurrencies: Currency[] = [
    { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
    { code: 'UZS', name: 'Uzbek Som', symbol: 'soʻm' },
    { code: 'KZT', name: 'Kazakh Tenge', symbol: '₸' },
    { code: 'TJS', name: 'Tajik Somoni', symbol: 'SM' },
    { code: 'KGS', name: 'Kyrgyz Som', symbol: 'с' },
    { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
    { code: 'EGP', name: 'Egyptian Pound', symbol: 'ج.م' },
    { code: 'AED', name: 'United Arab Emirates Dirham', symbol: 'د.إ' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    // Add more currencies as needed
  ];

  selectedCurrency: string = 'UZS';


  constructor(
    private authService: AuthService,
    @Inject(Router) private router: Router,
    @Inject(DatePipe) private datePipe: DatePipe,
    private secureService: SecureService,
  ) { }

  ngAfterViewInit(): void {
    this.viewExpenses(this.ONE);
    this.viewExpenses(this.ALL);
  }

  ngOnInit(): void {
    let savedCurrency = localStorage.getItem('currency');
    if (savedCurrency) {
      this.selectedCurrency = savedCurrency;
    }
    this.selectedMonthStr = this.datePipe.transform(new Date(this.monthAndYear), "MMMM yyyy")!;
    this.token = this.authService.getToken();
    this.getUser();
  }


  getUser() {
    try {
      this.authService.getUserProfile(this.ONE).subscribe({
        next: (data: any) => {
          this.user = data.user;
          console.log('user info from db: ', this.user);
          if (this.user.currency == null) {
            this.user.currency = this.popularCurrencies[1];
          }
          this.selectedCurrency = this.user.currency.code;
        },
        error: (err: HttpErrorResponse) => {
          console.log(
            "Error fetching user profile",
            err.error ? err.error.message : err.message
          );
          if (err.status === 401) {
            localStorage.removeItem("token");
            this.router.navigate(["/login"]);
          }
        },
      });
    } catch (err) {
      console.error(err);
    }
  }

  onAmountChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/[^0-9.-]+/g, '');
    this.todaysExpense.amount = value ? parseFloat(value) : 0;
  }

  onCurrencyChange(currencyCode: string) {
    localStorage.setItem('currency', currencyCode);
    if (this.monthlyExpensesChart && this.monthlyExpensesChart.data && this.monthlyExpensesChart.data.datasets) {
      const dataset = this.monthlyExpensesChart.data.datasets[0];
      dataset.label = `Total monthly expenses for ${this.selectedYear} in ${this.selectedCurrency}`;
      this.monthlyExpensesChart.update();
    }
    this.popularCurrencies.forEach((currency) => {
      if (currency.code === currencyCode) {
        console.log(`this.userInfo.currency = currency;`, this.userInfo?.currency);
        this.user.currency = currency;
        this.userInfo = this.user;
        this.userInfo.profilePicture = "";
      }
    });
    console.log("updating user currency:", this.userInfo);
    this.updateUserInfo(event, true);
  }

  calculateMonthlyTotal() {
    this.monthlyTotal = 0;
    this.currentMonthExpenses.map(item => {
      this.monthlyTotal += item.amount;
    });
  }


  createMonthlyExpensesChart() {
    if (this.monthlyExpensesChart) {
      this.monthlyExpensesChart.destroy();
    }
    const ctx = document.getElementById('monthlyExpensesChart') as HTMLCanvasElement;
    this.monthlyExpensesChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.monthlyExpenses.map(expense => expense.month),
        datasets: [
          {
            label: `Total monthly expenses for ${this.selectedYear} in ${this.selectedCurrency}`,
            data: this.monthlyExpenses.map(expense => expense.total),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  createDetailedExpenseChart() {
    const ctx = document.getElementById('detailedExpenseChart') as HTMLCanvasElement;
    const groupedExpenses = this.currentMonthExpenses.reduce<GroupedExpense>((acc, category) => {
      if (!acc[category.category]) {
        acc[category.category] = { amount: 0 };
      }
      acc[category.category].amount += category.amount;
      return acc;
    }, {});

    // Step 2: Extract labels and data
    const labels = Object.keys(groupedExpenses);
    const data = Object.values(groupedExpenses).map(expense => expense.amount);
    const backgroundColors = labels.map(() => this.getRandomColor());

    // Now you can use labels and data to create your chart
    const totalAmount = data.reduce((acc, amount) => acc + amount, 0);

    if (this.detailedExpenseChart) {
      this.detailedExpenseChart.destroy();
    }

    this.detailedExpenseChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColors,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number; // Cast to number
                const percentage = ((value / totalAmount) * 100).toFixed(2);
                return `${context.label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  private getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  public emitDateChange(event: MatDatepickerInputEvent<Date | null, unknown>): void {
    this.monthAndYearChange.emit(event.value);
  }
  public monthChanged(value: any, widget: any): void {
    this.monthAndYear = value;
    this.selectedYear = value.getFullYear();
    let currentYear = new Date().getFullYear()

    this.selectedMonthStr = this.datePipe.transform(new Date(value), "MMMM yyyy")!;
    this.viewExpenses(this.ONE);
    if (currentYear !== this.selectedYear) {
      this.viewExpenses(this.ALL);
    }
    widget.close();
  }

  viewExpenses(all: string): void {
    try {
      const monthYearStr = `${this.monthAndYear.getMonth()},${this.monthAndYear.getFullYear()}`;
      this.secureService.getExpense(monthYearStr, all).subscribe({
        next: (data: any) => {
          if (all === 'all') {
            this.monthlyExpenses = data.expenses;
            this.createMonthlyExpensesChart();
          } else {
            this.currentMonthExpenses = data.expenses;
            this.currentMonthExpenses.sort((a, b) => new Date(a.date) < new Date(b.date) ? 1 : (new Date(a.date) == new Date(b.date) ? 0 : -1));
            this.calculateMonthlyTotal();
            this.createDetailedExpenseChart();
          }
        },
        error: (err: HttpErrorResponse) => {
          console.log('Error fetching expense data', (err.error ? err.error.message : err.message));
          if (err.status === 401) {
            localStorage.removeItem('token');
            this.router.navigate(['/login']);
          }
        }
      });
    } catch (err) {
      console.error(err);
    }
  }
  showAddNewExpense(action: string) {
    document.addEventListener('keydown', this.handleEscapePress.bind(this));
    if (action === 'update') {
      this.displayUpdateInput = true;
      this.displayInput = true;
    } else {
      this.displayUpdateInput = false;
      this.displayInput = !this.displayInput;
    }
  }

  openUserModal() {
    this.userInfo = {
      _id: "",
      username: "",
      password: "",
      firstname: this.user.firstname,
      lastname: this.user.lastname,
      email: this.user.email
    };
    this.displayUserModal = !this.displayUserModal;
  }

  addExpense(): void {
    this.secureService.saveExpense(this.todaysExpense).subscribe({
      next: (response: any) => {
        // Handle success
        console.log(response);
        let currentMonth = new Date().getMonth();
        let selectedMonth = new Date(this.todaysExpense.date).getMonth();
        this.todaysExpense = response.data;
        console.log(currentMonth + " , ", selectedMonth, ", ", currentMonth === selectedMonth);
        if (currentMonth == selectedMonth) {
          this.currentMonthExpenses.push(this.todaysExpense);
          this.monthlyTotal += this.todaysExpense.amount;
          this.currentMonthExpenses.sort((a, b) => new Date(a.date) < new Date(b.date) ? 1 : (new Date(a.date) == new Date(b.date) ? 0 : -1));
        }
        this.closeEditModal(event, "expense");
        if (currentMonth == selectedMonth && this.detailedExpenseChart) {
          this.createDetailedExpenseChart();
        }
        this.viewExpenses(this.ALL);
      },
      error: (error: any) => {
        console.error("Error saving expense data:", error);
      },
    });
  }
  openEditModal(expense: Expense) {
    this.todaysExpense = {
      _id: expense._id,
      date: expense.date,
      category: expense.category,
      amount: expense.amount,
      description: expense.description,
      userId: expense.userId
    };
    this.todaysExpense.date = new Date(expense.date).toISOString().split('T')[0];
    this.showAddNewExpense('update');
  }
  cleanEditor() {
    this.todaysExpense = {
      amount: 0,
      category: '',
      date: new Date().toISOString().split('T')[0],
    };
  }
  // Close the modal
  closeEditModal(evt: any, modalName: string) {
    evt.preventDefault();
    document.removeEventListener('keydown', this.handleEscapePress.bind(this));
    if (modalName === this.USER_CONST.EXPENSE) {
      this.cleanEditor();
      this.showAddNewExpense('close');
    } else if (modalName === this.USER_CONST.USER) {
      this.openUserModal();
      this.successMessage = null;
      this.errorMessage = null;
    }
  }

  handleEscapePress(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeEditModal(event, this.USER_CONST.EXPENSE);
    }
  }

  onBackgroundClick(event: MouseEvent, modalName: string): void {
    const modalContent = document.querySelector('.modal-content') as HTMLElement;
    if (modalContent && !modalContent.contains(event.target as Node)) {
      this.closeEditModal(event, modalName);
    }
  }

  // Update user info
  updateUserInfo(evt: any, isInternal: boolean) {
    evt.preventDefault();
    this.authService.updateUserInfo(this.user._id, this.userInfo).subscribe({
      next: (data: any) => {
        console.log(data);
        this.getUser();
        if (!isInternal) {
          this.successMessage = data.message;
          setTimeout(() => {
            this.closeEditModal(evt, this.USER_CONST.USER);
          }, 1000);
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error(err);
        this.errorMessage = `${err.error ? err.error.message : err.message}`;
      },
    })
  }

  // Update the expense
  updateExpense(expense: Expense, evt: any) {
    evt.preventDefault();
    this.secureService.updatedExpense(expense).subscribe({
      next: (data) => {
        console.log(data);
        this.closeEditModal(event, this.USER_CONST.EXPENSE);
        this.viewExpenses(this.ONE);
        this.viewExpenses(this.ALL);
      },
      error: (error: any) => {
        console.error("Error updating expense data:", error);
      },
    });
  }

  // Delete the expense
  deleteExpense(expenseId: string | undefined, evt: any) {
    evt.preventDefault();
    if (expenseId) {
      this.secureService.deleteExpense(expenseId).subscribe({
        next: (data) => {
          console.log(data);
          this.closeEditModal(event, this.USER_CONST.EXPENSE);
          this.viewExpenses(this.ONE);
          this.viewExpenses(this.ALL);
        },
        error: (error: any) => {
          console.error("Error deleting expense data:", error);
        },
      });
    }
  }

  convertImage(img: any) {
    return img && btoa(String.fromCharCode(...new Uint8Array(img)));
  }

  onFileChange(event: any) {
    this.selectedFile = event.target.files[0];
  }

  onFileSelected(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files.length > 0) {
      this.selectedFile = fileInput.files[0];

      // Convert the max size from MB to bytes
      const maxSizeInBytes = this.maxSizeInMB * 1024 * 1024;

      if (this.selectedFile.size > maxSizeInBytes) {
        alert(
          `File is too large. Maximum allowed size is ${this.maxSizeInMB} MB.`
        );
        this.selectedFile = null; // Clear the selected file
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        this.user.profilePicture = (reader.result as string).split(",")[1];
      };
      reader.readAsDataURL(this.selectedFile);
      this.uploadProfilePicture();
    }
  }

  uploadProfilePicture(): void {
    if (this.selectedFile) {
      const formData = new FormData();
      formData.append("profilePicture", this.selectedFile);

      this.authService.uploadPicture(formData).subscribe({
        next: (response: any) => {
          // Handle success
          console.log("Profile picture uploaded successfully");
          console.log(response);
        },
        error: (error: any) => {
          console.error("Error uploading profile picture:", error);
        },
      });
    }
  }
}
