import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

@Injectable({
    providedIn: 'root',
  })
  export class NavBarService {
    
    localDbState:boolean = false;

    private _dbState = new BehaviorSubject<boolean>(false);

    get dbState(){
        return this._dbState.asObservable();
    }
    updateDbState(newState: boolean){
        this._dbState.next(newState);
    }
}