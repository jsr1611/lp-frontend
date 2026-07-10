import { Component, Inject, OnChanges, SimpleChanges } from '@angular/core';
import { NavBarService } from './navbar.service';
import { AuthService } from 'src/app/services/AuthService';
import { Router } from '@angular/router';

@Component({
    selector: 'app-navbar',
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.css'],
    standalone: false
})
export class NavbarComponent implements OnChanges{
  constructor(
    private navbarService: NavBarService,
    @Inject(Router) private router: Router,
    public authService: AuthService,
  ){ }

  ngOnChanges(changes: SimpleChanges): void {
  }

  searchKey:string = "";


  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  search() {
    console.log("search() called searchKey: ", this.searchKey);
    
    if (this.searchKey) {
      this.router.navigate(['/search', this.searchKey]);
    }
  }

  changeThem(){
    let btnChangeTheme = document.getElementById("theme-changer");
    let iTag = btnChangeTheme?.querySelector('i');
    if(iTag){
      if(iTag.classList.contains('bi-sun-fill')){
        iTag.className = '';
        iTag.classList.add('bi', 'bi-moon-stars');
      }else{
        iTag.className = '';
        iTag.classList.add('bi', 'bi-sun-fill');
      }
    }
  }

  useLocalDB(){
    let btn = document.getElementById("localdb");
    let iTag = btn?.querySelector('i');
    if(iTag){
      if(iTag.classList.contains('bi-sun')){
        iTag.className = '';
        iTag.classList.add('bi', 'bi-sun-fill');
        this.navbarService.updateDbState(true);
      }else{
        iTag.className = '';
        iTag.classList.add('bi', 'bi-sun');
        this.navbarService.updateDbState(false);
      }
    }
  }
}
