import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './../../environments/environment';

const baseSearchUrl = "https://uts-ws.nlm.nih.gov/rest/search/current";
const apiKey = environment.umlsApiKey;

@Injectable({
  providedIn: 'root'
})
export class UmlsService {

  private findUrl = "";

  constructor(private http: HttpClient) { }

  // search umls for CUI with new API
  public findCUI(query) {
    this.findUrl = baseSearchUrl
    let headers = new HttpHeaders();
    let params = new HttpParams();
    params = params.set('string', query); // query. i.e. acronym longform
    params = params.set('apiKey', apiKey); // apiKey
    return this.http.get(this.findUrl, { headers: headers, params: params } );
  }
}
