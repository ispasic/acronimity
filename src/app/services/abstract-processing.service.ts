import { Injectable } from '@angular/core';

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
      // transform `longform (shortform)` strings into `shortform`
      taggedText = this.replaceAll(taggedText, acronym.longform + " (" + acronym.shortform + ")", acronym.shortform);
      taggedText = this.replaceAll(taggedText, acronym.longform + "(" + acronym.shortform + ")", acronym.shortform);
      // transform `longform (shortform)-` strings into `shortform`
      taggedText = this.replaceAll(taggedText, acronym.longform + " (" + acronym.shortform + ")", acronym.shortform);
      // transform `shortform (longform)` string into `shortform`
      taggedText = this.replaceAll(taggedText, acronym.shortform + " (" + acronym.longform + ")", acronym.shortform);
      taggedText = this.replaceAll(taggedText, acronym.shortform + "(" + acronym.longform + ")", acronym.shortform);
      // transform `(shortform) longform` string into `shortform`
      taggedText = this.replaceAll(taggedText, "(" + acronym.shortform + ") " + acronym.longform, acronym.shortform);
      taggedText = this.replaceAll(taggedText, "(" + acronym.shortform + ")" + acronym.longform, acronym.shortform);
    }

    for (let acronym of acronymList) {
      //console.log(acronym);
      //console.log(taggedText);
      // transform `shortform` into `<acronym sense=longform>shortform</acronym>
      taggedText = this.replaceAllBoundaries(taggedText, acronym.shortform, "<acronym sense='" + acronym.longform + "'>" + acronym.shortform + "</acronym>");
      //console.log(taggedText);
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
    if (count = processedText.match(new RegExp(`(\\b)(${this.escapeRegExp(acronym)})(?!\\w)`, 'gi'))) {
      result = count.length
    }
    return result;
  }


  //replace all occurences of <find> with <replace> in <str>
  public replaceAllBoundaries(str, find: string, replace: string) {
    //console.log(`Replacing ${find} with ${replace}`);
    return str.replace(new RegExp(`(^|\\.|\\,|\\s)(${this.escapeRegExp(find)})(^|\\.|\\,|\\/|\\-|\\s)`, 'gi'), `$1${replace}$3`);
  }

  private replaceAll(str, term, replacement) {
    return str.replace(new RegExp(this.escapeRegExp(term), 'gi'), replacement);
  } 

  private escapeRegExp(string){
    let result = string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return result;
  }



  // old code

  //function for swapping acronyms' longform and shortform in text
  public swapAcronyms(text: string, acronymList: any[]): string {

    let swapText = text;

    swapText = swapText.replace(/\n/g, " "); //swap all endlines by spaces
    swapText = swapText.replace(/\u00A0/g, " "); //swap all non-breaking spaces by spaces
    swapText = swapText.replace(/\s{2,}/g,' '); //swap all multiple spaces with spaces

    for (let acronym of acronymList)
    {
      //swapText = this.replaceAll(swapText, acronym.shortform, acronym.longform + " TEMP");
      //swapText = this.replaceAll(swapText, acronym.longform, acronym.shortform);
      //swapText = this.replaceAll(swapText, acronym.shortform + " TEMP", acronym.longform);
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
      //taggedText = this.replaceAll(taggedText, acronym.shortform, "<shortform>" + acronym.shortform + "</shortform>");
      //taggedText = this.replaceAll(taggedText, acronym.longform, "<longform>" + acronym.longform + "</longform>");
      taggedText = taggedText.split(acronym.shortform).join("<shortform>" + acronym.shortform + "</shortform>");
      taggedText = taggedText.split(acronym.longform).join("<longform>" + acronym.longform + "</longform>");
    }

    return taggedText;
  }

  public tagAcronymsSenseOld(text: string, acronymList: any[]): string {
    
    let taggedText = text;
    taggedText = taggedText.replace(/\n/g, " "); //swap all endlines by spaces
    taggedText = taggedText.replace(/\u00A0/g, " "); //swap all non-breaking spaces by spaces
    taggedText = taggedText.replace(/\s{2,}/g,' '); //swap all multiple spaces with spaces

    for (let acronym of acronymList) {
      // transform `longform (shortform)` strings into `shortform`
      taggedText = taggedText.split(`(?i)${acronym.longform + " (" + acronym.shortform + ")"}`).join(acronym.shortform);
      console.log(taggedText.split(`(?i)${acronym.longform + " (" + acronym.shortform + ")"}`).join(acronym.shortform));
      taggedText = taggedText.split(`(?i)${acronym.longform + "(" + acronym.shortform + ")"}`).join(acronym.shortform);
      // transform `shortform (longform)` string into `shortform`
      taggedText = taggedText.split(acronym.shortform + " (" + acronym.longform + ")").join(acronym.shortform);
      taggedText = taggedText.split(acronym.shortform + "(" + acronym.longform + ")").join(acronym.shortform);
      // transform `(shortform) longform` string into `shortform`
      taggedText = taggedText.split("(" + acronym.shortform + ") " + acronym.longform).join(acronym.shortform);
      taggedText = taggedText.split("(" + acronym.shortform + ")" + acronym.longform).join(acronym.shortform);
      // transform `shortform` into `<acronym sense=longform>shortform</acronym>
      taggedText = taggedText.split(' ' + acronym.shortform + ' ').join(" <acronym sense='" + acronym.longform + "'>" + acronym.shortform + "</acronym> ");
    }

    return taggedText;
  }
}
