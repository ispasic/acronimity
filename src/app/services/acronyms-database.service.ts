import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from './../../environments/environment';

//const baseUrl = 'http://localhost:8083/';
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
    //console.log("Get All Acronyms Url: ", this.APIURL);
    return this.http.get(this.APIURL);
  }

  insertAcronym(shortform: string, longform: string) {
    this.APIURL = baseUrl + "insertAcronym?shortform=" + shortform + "&longform=" + longform;
    //console.log("Insert Acronym Url: ", this.APIURL);
    return this.http.post(this.APIURL, null);
  }

}
