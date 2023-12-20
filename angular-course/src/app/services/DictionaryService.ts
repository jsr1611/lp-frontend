import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class DictionaryService {
  constructor(private httpClient: HttpClient) {}
  getDictionary() {
    return this.httpClient.get<any[]>('assets/data/dict.json');
  }
}
