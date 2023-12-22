import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class DictionaryService {
  readonly API_Url = "http://localhost:5038/api/arabic/dict";
  constructor(private httpClient: HttpClient) {}
  getDictionary() {
    return this.httpClient.get<any[]>(this.API_Url);
  }

  getDictionaryLocal(){
    return this.httpClient.get<any[]>('/assets/data/dict.json');
  }

  createDictEntry(word:any){
    console.log("Sending...", word);
    return this.httpClient.post<any>(this.API_Url, word);
  }
}
