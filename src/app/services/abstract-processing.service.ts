import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AbstractProcessingService {

  constructor() { }

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

  public tagAcronymsSense(text: string, acronymList: any[]): string {
    
    let taggedText = text;
    taggedText = taggedText.replace(/\n/g, " "); //swap all endlines by spaces
    taggedText = taggedText.replace(/\u00A0/g, " "); //swap all non-breaking spaces by spaces
    taggedText = taggedText.replace(/\s{2,}/g,' '); //swap all multiple spaces with spaces

    for (let acronym of acronymList) {
      // transform `longform (shortform)` strings into `shortform`
      taggedText = taggedText.split(acronym.longform + " (" + acronym.shortform + ")").join(acronym.shortform);
      taggedText = taggedText.split(acronym.longform + "(" + acronym.shortform + ")").join(acronym.shortform);
      // transform `shortform (longform)` string into `shortform`
      taggedText = taggedText.split(acronym.shortform + " (" + acronym.longform + ")").join(acronym.shortform);
      taggedText = taggedText.split(acronym.shortform + "(" + acronym.longform + ")").join(acronym.shortform);
      // transform `(shortform) longform` string into `shortform`
      taggedText = taggedText.split("(" + acronym.shortform + ") " + acronym.longform).join(acronym.shortform);
      taggedText = taggedText.split("(" + acronym.shortform + ")" + acronym.longform).join(acronym.shortform);
      // transform `shortform` into `<acronym sense=longform>shortform</acronym>
      taggedText = taggedText.split(' ' + acronym.shortform + ' ').join(" <acronym sense=" + acronym.longform + ">" + acronym.shortform + "</acronym> ");
    }

    return taggedText;
  }

  //replace all occurences of <find> with <replace> in <str>
  public replaceAll(str, find: string, replace: string) {
    //console.log(`Replacing ${find} with ${replace}`);
    return str.replace(new RegExp(`\\b${find}\\b`, 'gi'), replace);
  }
}
