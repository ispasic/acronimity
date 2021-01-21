import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './../../environments/environment';

const baseUrl = environment.baseApiUrl;
const baseTicketUrl = environment.umlsBaseTicketUrl;
const baseSearchUrl = environment.umlsBaseUrl;
const apiKey = environment.umlsApiKey; 

@Injectable({
  providedIn: 'root'
})
export class UmlsService {

  findUrl = "";

  constructor(private http: HttpClient) { }

  // acquire ticket granting tickets from database
  private getTgtFromDatabase(): Observable<any> {
    this.findUrl = baseUrl + "umls/getTgt";
    let headers = new HttpHeaders();
    let params = new HttpParams();
    return this.http.get(this.findUrl, {headers: headers, params: params});
  }

  // add ticket granting ticket to the database
  private addTgtToDatabase(tgt): Observable<any> {
    this.findUrl = baseUrl + "umls/addTgt";
    let headers = new HttpHeaders();
    let params = new HttpParams();
    let body = {
      "tgt": tgt
    };
    return this.http.post(this.findUrl, body, {headers: headers, params: params});
  }

  // get ticket granting ticket from umls
  private getTgtFromUmls(): Observable<any> {
    this.findUrl = baseTicketUrl + "api-key";
    let headers = new HttpHeaders({
      'content-type':  'application/x-www-form-urlencoded'
    });
    let params = new HttpParams();
    params = params.set("apikey", apiKey);
    return this.http.post(this.findUrl, null, { headers: headers, params: params, responseType: 'text' });
  }

  // get service ticket from umls
  private getStFromUmls(tgt): Observable<any> {
    this.findUrl = baseTicketUrl + "tickets/" + tgt;
    let headers = new HttpHeaders({
      'content-type': 'application/x-www-form-urlencoded'
    });
    let params = new HttpParams();
    params = params.set('service', 'http://umlsks.nlm.nih.gov');
    return this.http.post(this.findUrl, null, { headers: headers, params: params, responseType: 'text' });
  }

  // search umls for CUI
  private searchUmls(query, ticket): Observable<any> {
    this.findUrl = baseSearchUrl
    let headers = new HttpHeaders();
    let params = new HttpParams();
    params = params.set('string', query);
    params = params.set('ticket', ticket);
    return this.http.get(this.findUrl, { headers: headers, params: params } );
  }

  // search umls for CUI
  public async findCUI(query) {
    // get tgt
    let tgt = await this.getTgt();
    console.log(tgt);
    // get st
    let st = await this.getStFromUmls(tgt).toPromise().catch(error => console.log(error));
    console.log(st);
    let result = await this.searchUmls(query, st).toPromise().catch(error => console.log(error));
    return result;
  }


  // get tgt checking the database
  private async getTgt() {
    let result = '';
    // get from Database first
    let tgtRes = await this.getTgtFromDatabase().toPromise().catch(error => console.log(error));
    // check if  in database
    let tgtResJson = JSON.parse(JSON.stringify(tgtRes));
    // if in database return it
    if (tgtResJson.length != 0) {
      return tgtRes[0].tgt;
      // if not in the database, get new tgt and add it to the database and return the value
    } else {
      tgtRes = await this.getTgtFromUmls().toPromise().catch(error => console.log(error));
      result = tgtRes.substring(tgtRes.indexOf("TGT-"), tgtRes.indexOf("method") - 2);
      // add tgt to database
      await this.addTgtToDatabase(result).toPromise().catch(error => console.log(error));
      return result;
    }
  }
}
