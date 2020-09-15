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

  insertAcronym(acronym) {
    let reqBody = {
      "shortform": acronym.shortform,
      "longform": acronym.longform,
      "text": acronym.text,
      "swapText": acronym.swapText,
      "tagText": acronym.tagText,
      "pubMedId": acronym.pubMedId,
      "title": acronym.title,
      "journal": acronym.journal,
      "authors": acronym.authors,
      "pubdate": acronym.pubdate
    }
    let headers = {
      "Content-Type": "application/json"
    }

    this.APIURL = baseUrl + "insertAcronym";
    return this.http.post(this.APIURL, reqBody, {headers});
  }

}
