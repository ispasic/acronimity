import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { environment } from './../../environments/environment';

const baseUrl = environment.baseApiUrl;

@Injectable({
  providedIn: 'root'
})
export class MongodbService {

  constructor(private http: HttpClient) { }

  private findUrl = "";

  //Abstracts
  public findAbstractById(pubmed_id) {
    this.findUrl = baseUrl + "abstracts/findById";
    let headers = new HttpHeaders();
    let params = new HttpParams();
    params = params.set('pubmed_id', pubmed_id);
    return this.http.get(this.findUrl, {headers: headers, params: params});
  }

  public findAllAbstracts() {
    this.findUrl = baseUrl + "abstracts/findAll";
    let headers = new HttpHeaders();
    let params = new HttpParams();
    return this.http.get(this.findUrl, {headers: headers, params: params});
  }

  public countAbstract() {
    this.findUrl = baseUrl + "abstracts/count";
    let headers = new HttpHeaders();
    let params = new HttpParams();
    return this.http.get(this.findUrl, {headers: headers, params: params});
  }

  public addOneAbstract(abstract: any) {
    this.findUrl = baseUrl + "abstracts/addOne";
    let headers = new HttpHeaders();
    let params = new HttpParams();
    return this.http.post(this.findUrl, abstract, {headers: headers, params: params});
  }

  public addMultipleAbstracts(abstracts: any) {
    this.findUrl = baseUrl + "abstracts/addMultiple";
    let headers = new HttpHeaders();
    let params = new HttpParams();
    return this.http.post(this.findUrl, abstracts, {headers: headers, params: params});
  }

  public deleteAbstractById(pubmed_id) {
    this.findUrl = baseUrl + "abstracts/deleteById";
    let headers = new HttpHeaders();
    let params = new HttpParams();
    params = params.set('pubmed_id', pubmed_id);
    return this.http.delete(this.findUrl, {headers: headers, params: params})
      .pipe(
        map((data: Response) => {
          return data;
        }
      )
    );
  }
}
