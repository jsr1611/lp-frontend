import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DictionaryService {
  // readonly API_Url_Server = "http://127.0.0.1:3000/api/dict";
  // readonly API_Url_Server = "https://lp-backend-t6jz.onrender.com/api/arabic/dict";
  readonly API_Url_Server = "http://api.jumanazar.uz/dict";
  constructor(private httpClient: HttpClient) {}
  getDictionary() {
    return this.httpClient.get<any[]>(this.API_Url_Server);
  }

  getDictionaryLocal(){
    return this.httpClient.get<any[]>('/assets/data/dict.json');
  }

  createDictEntry(word:any){
    console.log("Sending...", word);
    return this.httpClient.post<any>(this.API_Url_Server, word);
  }

  findWord(params:any){
    return this.httpClient.get<any>(this.API_Url_Server, params);
  }


  findWordById(id:number){
    return this.httpClient.get<any>(this.API_Url_Server + "/" + id);
  }

  fileExists(url: string): Observable<boolean>{
    return this.httpClient.get(url, { observe: 'response' })
      .pipe(
        map(() => true),
        catchError((error) => {
          const status = (error as HttpErrorResponse).status;
          if(status === 404) console.log("File not found");
          return status === (200 || 304) ? of(true) : of(false);
        })
      );
  }
}
