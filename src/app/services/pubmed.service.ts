import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './../../environments/environment';

const baseUrl = environment.pubmedBaseUrl;
const apiKey = environment.pubmedApiKey; 

@Injectable({
  providedIn: 'root'
})
export class PubmedService {

  constructor(private http: HttpClient) { }

  findUrl = "";
  db = "";
  retmode = "json";

  public searchDatabase(query, retmax): Observable<any> {
    this.db = "pubmed";
    //query = encodeURIComponent(query);
    this.findUrl = baseUrl + "esearch.fcgi";
    let headers = new HttpHeaders();
    let params = new HttpParams();
    params = params.set('db', this.db);
    params = params.set('term', query);
    params = params.set('retmode', this.retmode);
    params = params.set('retmax', retmax);
    params = params.set('api_key', apiKey);
    //console.log("Search Database Url: ", this.findUrl);
    return this.http.get(this.findUrl, {headers: headers, params: params});
  }

  public getBasicDataByID(id, start): Observable<any> {
    this.db = "pubmed";
    this.findUrl = baseUrl + "esummary.fcgi";
    let headers = new HttpHeaders();
    let params = new HttpParams();
    params = params.set('db', this.db);
    params = params.set('id', id);
    params = params.set('retmode', this.retmode);
    params = params.set('retstart', start);
    params = params.set('api_key', apiKey);
    //console.log("Get Basic Data Url: ", this.findUrl);
    return this.http.post(this.findUrl, null, {headers: headers, params: params});
  }

  public getAbstractByID(id, start): Observable<any> {
    this.db = "pubmed";
    //console.log("Get Abstract Url: ", this.findUrl);
    this.findUrl = baseUrl + "efetch.fcgi";
    let headers = new HttpHeaders();
    let params = new HttpParams();
    params = params.set('db', this.db);
    params = params.set('id', id);
    params = params.set('rettype', 'medline')
    params = params.set('retmode', 'text');
    params = params.set('retstart', start);
    params = params.set('api_key', apiKey);
    return this.http.post(this.findUrl, null, {headers: headers, params: params, responseType: 'text'});

  }

}
