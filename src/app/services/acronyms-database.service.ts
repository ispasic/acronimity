import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from './../../environments/environment';

const baseUrl = environment.baseApiUrl;
//const baseUrl = '/';

@Injectable({
  providedIn: 'root'
})
export class AcronymsDatabaseService {

  constructor(private http: HttpClient) { }

  APIURL = "";

  getAllAcronyms() {
    this.APIURL = baseUrl + "getAllAcronyms";
    return this.http.get(this.APIURL);
  }

  insertAcronym(shortform: string, longform: string) {
    let reqBody = {
      "shortform": shortform,
      "longform": longform
    }
    let headers = {
      "Content-Type": "application/json"
    }
    this.APIURL = baseUrl + "insertAcronym";
    return this.http.post(this.APIURL, reqBody, {headers});
  }

}
