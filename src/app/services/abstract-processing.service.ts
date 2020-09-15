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

    for (let acronym of acronymList)
    {
      swapText = this.replaceAll(swapText, acronym.shortform, acronym.longform + "TEMP");
      swapText = this.replaceAll(swapText, acronym.longform, acronym.shortform);
      swapText = this.replaceAll(swapText, acronym.shortform + "TEMP", acronym.longform);
    }

    return swapText;
  }

  //function to tag shortforms and longforms of all acronyms in text
  public tagAcronyms(text: string, acronymList: any[]): string {

    let taggedText = text;
    
    taggedText = taggedText.replace(/\n/g, " "); //swap all endlines by spaces
    taggedText = taggedText.replace(/\u00A0/g, " "); //swap all non-breaking spaces by spaces

    for (let acronym of acronymList)
    {
      taggedText = this.replaceAll(taggedText, acronym.shortform, "<shortform>" + acronym.shortform +"</shortform>");
      taggedText = this.replaceAll(taggedText, acronym.longform, "<longform>" + acronym.longform +"</longform>");
    }

    return taggedText;
  }

  //replace all occurences of <find> with <replace> in <str>
  private replaceAll(str, find: string, replace: string) {
    console.log(`Replacing ${find} with ${replace}`);
    return str.replace(new RegExp(find, 'gi'), replace);
  }
}
