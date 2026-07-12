import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { Word } from '../models/word';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DictionaryService {
  
  // readonly API_Url_Server = "http://127.0.0.1:3000/api/dict";
  readonly API_Url_Server =  environment.baseUrl +  "/api/words";
  // readonly API_Url_Server = "http://api.jumanazar.uz/dict";

  
  constructor(private httpClient: HttpClient) {}

  private localDict: Word[] = [];
  
  getHeaders(){
    const token = localStorage.getItem("token");
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return headers;
  }
    updateWord(updatedWord: Word) {
      return this.httpClient.put(this.API_Url_Server + "/" + updatedWord._id, updatedWord, {headers: this.getHeaders()});
  }
  
  getDictionary() {
    return this.httpClient.get<Word[]>(this.API_Url_Server);
  }

  async getDictionaryLocal(){
    return this.httpClient.get<Word[]>('/assets/data/dict.json');
  }

  findWordByUzbek(uzbek: string){
    return this.httpClient.get<Word>(this.API_Url_Server + '/' + uzbek);
  }

  createDictEntry(word:Word){
    console.log("Sending...", word);
    return this.httpClient.post<Word>(this.API_Url_Server, word);
  }

  findWord(params:any){
    return this.httpClient.get<Word>(this.API_Url_Server, params);
  }

  findWordById(id:number){
    return this.httpClient.get<Word>(this.API_Url_Server + "/" + id);
  }

  fileExists(url: string): Observable<boolean>{
    return this.httpClient.get(url, { observe: 'response' })
      .pipe(
        map(() => true),
        catchError((error) => {
          const status = (error as HttpErrorResponse).status;
          if(status === 404) console.log("File not found");
          return status === 200 || status === 304 ? of(true) : of(false);
        })
      );
  }
}
