import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './../../environments/environment';

const baseUrl = environment.baseApiUrl;
const baseTicketUrl = "https://utslogin.nlm.nih.gov/cas/v1/";
const baseSearchUrl = "https://uts-ws.nlm.nih.gov/rest/search/current";
const apiKey = environment.umlsApiKey;

@Injectable({
  providedIn: 'root'
})
export class UmlsService {

  private findUrl = "";

  constructor(private http: HttpClient) { }

  // acquire ticket granting tickets from database
  private getTgtFromDatabase(): Observable<any> {
    this.findUrl = baseUrl + "umls/getTgt";
    let headers = new HttpHeaders();
    let params = new HttpParams();
    return this.http.get(this.findUrl, {headers: headers, params: params});
  }

  // delete ticket granting tickets from database
  private deleteTgtFromDatabase(): Observable<any> {
    this.findUrl = baseUrl + "umls/deleteTgt";
    let headers = new HttpHeaders();
    let params = new HttpParams();
    return this.http.post(this.findUrl, {headers: headers, params: params});
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
    params = params.set("apikey", apiKey); // set api key parameter
    return this.http.post(this.findUrl, null, { headers: headers, params: params, responseType: 'text' });
  }

  // get service ticket from umls
  private getStFromUmls(tgt): Observable<any> {
    this.findUrl = baseTicketUrl + "tickets/" + tgt;
    let headers = new HttpHeaders({
      'content-type': 'application/x-www-form-urlencoded'
    });
    let params = new HttpParams();
    params = params.set('service', 'http://umlsks.nlm.nih.gov'); // set the service for the API Call
    return this.http.post(this.findUrl, null, { headers: headers, params: params, responseType: 'text' });
  }

  // search umls for CUI
  private searchUmls(query, ticket): Observable<any> {
    this.findUrl = baseSearchUrl
    let headers = new HttpHeaders();
    let params = new HttpParams();
    params = params.set('string', query); // query. i.e. acronym longform
    params = params.set('ticket', ticket); // service ticket for each query
    return this.http.get(this.findUrl, { headers: headers, params: params } );
  }

  // search umls for CUI
  public async findCUI(query) {
    // get tgt
    let tgt = await this.getTgt();
    // if error while searching for CUI
    if (tgt.status) {
      if (tgt.status == 'error') {
        return new Promise(resolve => {
          resolve({"status": "fail"})
        });
      }
    }
    // get st
    let st = await this.getStFromUmls(tgt).toPromise().catch(error => console.log("Error while getting service ticket"));
    // get result through UMLS API Call
    let result = await this.searchUmls(query, st).toPromise().catch(error => console.log("Error while searching UMLS"));
    return result;
  }

  public async validateTgt(): Promise<any> {
    // get current tgt if any
    let tgt = await this.getTgt();
    if (tgt.status) {
      if (tgt.status == 'error') {
        return new Promise(resolve => {
          resolve({"status": "fail"})
        });
      }
    }
    // try to get a st
    let st = await this.getStFromUmls(tgt).toPromise().catch(error => {
      console.log("Error while getting service ticket");
      return new Promise(resolve => {
        resolve({"status": "fail"})
      });
    });
    if (!this.isString(st)) {
      // no st received, need to generate new tgt
      // delete all in umls collection
      await this.deleteTgtFromDatabase().toPromise().catch(error => {
        console.log("Error while deleting ticket granting tickets from database");
        return new Promise(resolve => {
          resolve({"status": "fail"})
        });
      });
      // add a new tgt into database
      // get tgt from umls
      let tgtRes = await this.getTgtFromUmls().toPromise().catch(error => {
        console.log("Error while getting ticket granting tickets")
        return new Promise(resolve => {
          resolve({"status": "fail"})
        });
      });
      // cut the actual tgt from the response
      let result = tgtRes.substring(tgtRes.indexOf("TGT-"), tgtRes.indexOf("method") - 2);
      // add tgt to database
      await this.addTgtToDatabase(result).toPromise().catch(error => {
        console.log("Error while adding ticket granting tickets from database");
        return new Promise(resolve => {
          resolve({"status": "fail"})
        });
      });
    }
    return new Promise(resolve => {
      resolve({"status": "success"})
    });
  }

  // get tgt checking the database
  private async getTgt(): Promise<any> {
    let result = '';
    // get from Database first
    let tgtRes = await this.getTgtFromDatabase().toPromise().catch(error => console.log("Error while getting ticket granting tickets from database"));
    // check if in database
    let tgtResJson = JSON.parse(JSON.stringify(tgtRes));
    // if in database return it
    if (tgtResJson.length != 0) {
      return new Promise(resolve => {
        resolve(tgtRes[0].tgt);
      });
      // if not in the database, get new tgt and add it to the database and return the value
    } else {
      // get tgt from umls
      tgtRes = await this.getTgtFromUmls().toPromise().catch(error => console.log("Error while getting ticket granting tickets"));
      // if no tgt received (authorization error etc.) send an error
      if (!tgtRes) {
        return new Promise(resolve => {
          resolve({"status": "error"})
        });
      }
      // cut the actual tgt from the response
      result = tgtRes.substring(tgtRes.indexOf("TGT-"), tgtRes.indexOf("method") - 2);
      // add tgt to database
      await this.addTgtToDatabase(result).toPromise().catch(error => console.log("Error while adding ticket granting tickets from database"));
      // return the value
      return new Promise(resolve => {
        resolve(result);
      });
    }
  }

  private isString(value) {
    return typeof value === 'string' || value instanceof String;
  }
}
