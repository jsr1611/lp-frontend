import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class DictionaryService {
  // readonly API_Url_Server = "http://127.0.0.1:3000/api/dict";
  // readonly API_Url_Server = "https://lp-backend-t6jz.onrender.com/api/arabic/dict";
  readonly API_Url_Server = "https://jumanazar.uz/arabic/api/dict";
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
}
