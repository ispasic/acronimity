import { Injectable } from '@angular/core';
import * as pluralize from '../../../node_modules/pluralize';

@Injectable({
  providedIn: 'root'
})
export class AbstractProcessingService {

  constructor() { }

  public tagAcronymsSense(text: string, acronymList: any[]): any {
    
    let taggedText = text;

    taggedText = taggedText.replace(/\n/g, " "); //swap all endlines by spaces
    taggedText = taggedText.replace(/\u00A0/g, " "); //swap all non-breaking spaces by spaces
    taggedText = taggedText.replace(/\s{2,}/g,' '); //swap all multiple spaces with spaces

    // preprocess sentence
    for (let acronym of acronymList) {
      // using javascript notations
      // transform `longform (shortform)` strings into `shortform`
      taggedText = this.replaceAll(taggedText, `${acronym.longform} (${acronym.shortform})`, acronym.shortform);
      taggedText = this.replaceAll(taggedText, `${acronym.longform}(${acronym.shortform})`, acronym.shortform);
      // transform `longform (shortform)-` strings into `shortform`
      taggedText = this.replaceAll(taggedText, `${acronym.longform}(${acronym.shortform})-`, acronym.shortform);
      // transform `shortform (longform)` string into `shortform`
      taggedText = this.replaceAll(taggedText, `${acronym.shortform} (${acronym.longform})`, acronym.shortform);
      taggedText = this.replaceAll(taggedText, `${acronym.shortform}(${acronym.longform})`, acronym.shortform);
      // transform `(shortform) longform` string into `shortform`
      taggedText = this.replaceAll(taggedText, `(${acronym.shortform}) ${acronym.longform}`, acronym.shortform);
      taggedText = this.replaceAll(taggedText, `(${acronym.shortform})${acronym.longform}`, acronym.shortform);

      // do the same for plural
      // transform `longform (shortform)` strings into `shortform`
      taggedText = this.replaceAll(taggedText, `${pluralize.plural(acronym.longform)} (${acronym.shortform}s)`, `${acronym.shortform}s`);
      taggedText = this.replaceAll(taggedText, `${pluralize.plural(acronym.longform)}(${acronym.shortform}s)`, `${acronym.shortform}s`);
      // transform `longform (shortform)-` strings into `shortform`
      taggedText = this.replaceAll(taggedText, `${pluralize.plural(acronym.longform)}(${acronym.shortform}s)-`, `${acronym.shortform}s`);
      // transform `shortform (longform)` string into `shortform`
      taggedText = this.replaceAll(taggedText, `${acronym.shortform}s (${pluralize.plural(acronym.longform)})`, `${acronym.shortform}s`);
      taggedText = this.replaceAll(taggedText, `${acronym.shortform}s(${pluralize.plural(acronym.longform)})`, `${acronym.shortform}s`);
      // transform `(shortform) longform` string into `shortform`
      taggedText = this.replaceAll(taggedText, `(${acronym.shortform}s) ${pluralize.plural(acronym.longform)}`, `${acronym.shortform}s`);
      taggedText = this.replaceAll(taggedText, `(${acronym.shortform}s)${pluralize.plural(acronym.longform)}`, `${acronym.shortform}s`);
    }

    for (let acronym of acronymList) {
      // transform `shortform` into `<acronym sense='longform'>shortform</acronym>
      // taggedText = this.replaceAllBoundaries(taggedText, acronym.shortform, `<acronym sense='${acronym.longform}'>${acronym.shortform}</acronym>`)

      // transform `shortform` into `<acronym shortform='shortform' longform='longform'>shortform</acronym>
      taggedText = this.replaceAllBoundaries(taggedText, acronym.shortform, `<acronym shortform='${acronym.shortform}' longform='${acronym.longform}'>${acronym.shortform}</acronym>`)
      // same for plurals
      taggedText = this.replaceAllBoundaries(taggedText, `${acronym.shortform}s`, `<acronym shortform='${acronym.shortform}' longform='${acronym.longform}'>${acronym.shortform}s</acronym>`)
    }
    return taggedText;
  }

  public countAcronym(text: string, acronym: string): any {
    let processedText = text;
    processedText = processedText.replace(/\n/g, " "); //swap all endlines by spaces
    processedText = processedText.replace(/\u00A0/g, " "); //swap all non-breaking spaces by spaces
    processedText = processedText.replace(/\s{2,}/g,' '); //swap all multiple spaces with spaces

    let result = 0;
    let count;
    if (count = processedText.match(new RegExp(`(\\b)(${this.escapeRegExp(acronym)})(s|(?!\\w))`, 'gi'))) {
      result = count.length
    }
    return result;
  }


  //replace all occurences of <find> with <replace> in <str>
  public replaceAllBoundaries(str, find: string, replace: string) {
    return str.replace(new RegExp(`(^|\\.|\\,|\\s)(${this.escapeRegExp(find)})(^|\\.|\\,|\\/|\\-|\\s)`, 'gi'), `$1${replace}$3`);
  }

  private replaceAll(str, term, replacement) {
    return str.replace(new RegExp(this.escapeRegExp(term), 'gi'), replacement);
  } 

  private escapeRegExp(string){
    let result = string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return result;
  }

  //function for swapping acronyms' longform and shortform in text
  public swapAcronyms(text: string, acronymList: any[]): string {

    let swapText = text;

    swapText = swapText.replace(/\n/g, " "); //swap all endlines by spaces
    swapText = swapText.replace(/\u00A0/g, " "); //swap all non-breaking spaces by spaces
    swapText = swapText.replace(/\s{2,}/g,' '); //swap all multiple spaces with spaces

    for (let acronym of acronymList)
    {
      swapText = swapText.split(acronym.shortform).join(acronym.longform + " TEMP");
      swapText = swapText.split(acronym.longform).join(acronym.shortform);
      swapText = swapText.split(acronym.shortform + " TEMP").join(acronym.longform);
    }

    return swapText;
  }

  //function to tag shortforms and longforms of all acronyms in text
  public tagAcronyms(text: string, acronymList: any[]): string {

    let taggedText = text;
    
    taggedText = taggedText.replace(/\n/g, " "); //swap all endlines by spaces
    taggedText = taggedText.replace(/\u00A0/g, " "); //swap all non-breaking spaces by spaces
    taggedText = taggedText.replace(/\s{2,}/g,' '); //swap all multiple spaces with spaces

    for (let acronym of acronymList)
    {
      taggedText = taggedText.split(acronym.shortform).join("<shortform>" + acronym.shortform + "</shortform>");
      taggedText = taggedText.split(acronym.longform).join("<longform>" + acronym.longform + "</longform>");
    }

    return taggedText;
  }
}
