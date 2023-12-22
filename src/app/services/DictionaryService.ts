import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class DictionaryService {
  readonly API_Url_Local = "http://localhost:5038/api/arabic/dict";
  readonly API_Url_Server = "https://lp-backend-t6jz.onrender.com/api/arabic/dict";
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
}
