import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const baseUrl = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/";

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
    query = encodeURIComponent(query);
    this.findUrl = baseUrl + "esearch.fcgi?db=" + this.db + "&term=" + query + "&retmode=" + this.retmode + "&retmax=" + retmax;
    //console.log("Search Database Url: ", this.findUrl);
    return this.http.get(this.findUrl)
  }

  public getBasicDataByID(id): Observable<any> {
    this.db = "pubmed";
    this.findUrl = baseUrl + "esummary.fcgi?db=" + this.db + "&id=" + id + "&retmode=" + this.retmode;
    //console.log("Get Basic Data Url: ", this.findUrl);
    return this.http.get(this.findUrl);
  }

  public getAbstractByID(id): Observable<any> {
    this.db = "pubmed";
    this.findUrl = baseUrl + "efetch.fcgi?db=" + this.db + "&id=" + id + "&rettype=abstract&retmode=json";
    //console.log("Get Abstract Url: ", this.findUrl);
    return this.http.get(this.findUrl, {responseType: 'text'});
  }

}
