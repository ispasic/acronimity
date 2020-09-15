import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AcronymService {

  constructor() { }

  //schwartz algorithm implementation

  //check if string contains a letter

  private hasLetter(str: string): boolean {
    for (let s of str)
    {
      if(this.isLetter(s))
      {
        return true;
      }
    }
    return false;
  }

  //check if symbol is a letter

  private isLetter(str: string): boolean {
    return str.toLowerCase() != str.toUpperCase();
  }

  //check if symbol is a letter or digit

  private isLetterOrDigit(str: string): boolean {
    if(str.match(/[0-9]/i))
    {
      return true;
    }
    return str.toLowerCase() != str.toUpperCase();
  }

  //check if string has capital letter

  private hasCapital(str: string): boolean {
    for (let s of str)
    {
      if(this.isLetter(s) && s == s.toUpperCase())
      {
        return true;
      }
    }
    return false;
  }

  //count letters and digits in string

  private countLetterAndDigits(str: string): number {
    let count = 0;
    for (let s of str)
    {
      if(this.isLetterOrDigit(s))
      {
        count++;
      }
    }
    return count;
  }

  //check if that is a valid short form

  private isValidShortForm(str: string): boolean {
    if (this.hasLetter(str) && (this.isLetterOrDigit(str.charAt(0)) || str.charAt(0) == "("))
    {
      return true;
    }
    return false;
  }

  public getAcronymList(sentence: string) {
    var list = [];
    list = this.extractPairs(sentence);
    return list;
  }

  private extractPairs(sentence: string) {
    let acronym = "";
    let definition = "";
    let o = -1;
    let c = -1;
    let cutoff = -1;
    let nextc = -1;
    let tmp = -1;
    let swapAcronym = "";

    var candidateList = [];
    var acronymList = [];

    let originalSentence = sentence; //save original text

    o = sentence.indexOf(" ("); //find open parenthesis

    while (o > -1) //do it while we have an open parenthesis in text
    {
      // if(o > -1) //it's >-1 anyhow?
      // {
        o++; //move " (" to "("

        c = sentence.indexOf(")", o); //find close parethesis
        if (c > -1) //if close parenthesis found
        {
          //find the start of the previous clause based on punctuation
          cutoff = Math.max(sentence.lastIndexOf(". ", o),
            sentence.lastIndexOf(", ", o),
            sentence.lastIndexOf(".\n", o),
            sentence.lastIndexOf(",\n", o)
            );
          if (cutoff == -1) //if no . or , before
          {
            cutoff = -2;
          }

          definition = sentence.substring(cutoff + 2, o); //get the full definition candidate
          acronym = sentence.substring(o + 1, c); //get the full acronym candidate
        }
      //}

      if (acronym.length > 0 || definition.length > 0) //candidates found
      {
        if (acronym.length > 1 && definition.length > 1) //both candidates are longer than 1 symbol
        {
          //look for parenthesis nested in candidate acronym
          nextc = sentence.indexOf(")", c + 1);
          if((acronym.indexOf("(") > -1) && (nextc > -1))
          {
            acronym = sentence.substring(o + 1, nextc);
            c = nextc;
          }

          //if separator in candidate acronym then cut acronym
          if((tmp = acronym.indexOf(", ")) > -1)
          {
            acronym = acronym.substring(0, tmp);
          }
          if((tmp = acronym.indexOf("; ")) > -1)
          {
            acronym = acronym.substring(0, tmp);
          }

          //check if acronym is in () or definition
          var splitted = acronym.split(" "); //split the acronym into parts separated by " "

          //if more than 2 parts in acronym and acronym is longer than definition
          if(splitted.length > 2 || acronym.length > definition.length) 
          {
            //definition found within (***) so need to swap definition and acronym

            //extract the last word before "(" as a candidate for acronym
            tmp = sentence.lastIndexOf(" ", o - 2);
            swapAcronym = sentence.substring(tmp + 1, o - 1);

            //swap acronym and definition
            definition = acronym;
            acronym = swapAcronym;

            //validate new acronym
            if(!this.hasCapital(acronym))
            {
              acronym = ""; //delete invalid acronym
            }
          }

          if(this.isValidShortForm(acronym)) //if acronym is actually valid short form
          {
            var foundPair = {
              "shortform": acronym.trim(),
              "longform": definition.trim()
            }; //set up a pair for candidate list of acronym - long form JSON
            candidateList.push(foundPair); //push the pair into candidate list
          }
        }

        //prepare to process the rest after )
        sentence = sentence.substring(c + 1);
      }
      else
      {
        sentence = sentence.substring(o + 1); //process the rest
      }
      o = sentence.indexOf(" ("); //find next open parenthesis and repeat the cycle
    }
    //console.log("Full candidate List: ", candidateList);
    acronymList = this.matchPairs(candidateList); //process full candidate list to get list of acronyms
    for (let i = 0; i < acronymList.length; i++)
    {
      acronymList[i].text = originalSentence;
    }

    return acronymList;
  }

  private bestLongForm(acronym: string, definition: string): string {
    // --- go through the acronym & definition character by character,
    //     right to left looking for a match

    //definition = definition.toLowerCase();

    let a = acronym.length - 1;
    let d = definition.length - 1;

    for( ; a >= 0; a--)
    {
      let c = acronym.charAt(a).toLowerCase();

      if(this.isLetterOrDigit(c))
      {
        while (
            (d >= 0 && definition.charAt(d).toLowerCase() != c) ||
            (a == 0 && d > 0 && this.isLetterOrDigit(definition.charAt(d - 1).toLowerCase()))
          )
        {
          d--;
        }

        if(d < 0)
        {
          return null;
        }
        d--;
      }

    }

    d = Math.max(definition.lastIndexOf(" ", d) + 1, definition.lastIndexOf("(", d) + 1, definition.lastIndexOf(")", d) + 1,
      definition.lastIndexOf("/", d) + 1, definition.lastIndexOf("]", d) + 1, definition.lastIndexOf("[", d) + 1,
      definition.lastIndexOf("}", d) + 1, definition.lastIndexOf("{", d) + 1);
    return definition.substring(d);
  }

  private matchPairs(candidateList) {

    var acronymList = [];
    var acronym = '';
    var definition = '';
    var isInList = false;

    //cycle through the whole candidate list 
    for (var cand of candidateList)
    {
      acronym = cand.shortform;
      definition = cand.longform;

      //console.log("Acronym candidate: ", acronym);
      //console.log("Definition candidate: ", definition);

      //acronym has to have at least 2 characters
      if (acronym.length < 2)
      {
        //console.log("ERROR: Acronym length is less than 2");
        continue;
      }

      definition = definition.replace(/\n/g, " "); //swap all endlines by spaces
      definition = definition.replace(/\u00A0/g, " "); //swap all non-breaking spaces by spaces
      //console.log("definition after eliminating enters: ", definition);
      
      let bestLongForm = this.bestLongForm(acronym, definition);

      //console.log("bestLongForm: ", bestLongForm);

      if (bestLongForm == null)
      {
        //console.log("ERROR: no bestLongForm determined");
        continue;
      }
      
      //swap \n to " "

      bestLongForm = bestLongForm.replace(/\n/g, " "); //swap all endlines by spaces

      //check the bestLongForm according to Schwartz algorithm
      let bestLongFormWords = bestLongForm.split(" ");

      let acronymCharsCount = this.countLetterAndDigits(acronym); //number of characters in acronym that are digits or letters
      let defWordsCount = bestLongFormWords.length; //number of words in definition

      if(bestLongForm.length < acronym.length || //if long form is shorter than acronym
        bestLongForm.indexOf(acronym + " ") > -1 || //if long form containt acronym
        bestLongForm.endsWith(acronym) || //if long form ends with acronym
        defWordsCount > 2 * acronymCharsCount || defWordsCount > acronymCharsCount + 5 || acronymCharsCount > 10)
      {
        continue;
      }

      var foundPair = {
        "shortform": acronym,
        "longform": bestLongForm
      }; //set up a pair of acronym - long form JSON
  
      //check if the pair is in List already
      isInList = false;
      for (var acr of acronymList)
      {
        if (acr.shortform == foundPair.shortform)
        {
          isInList = true;
          break;
        }
      }

      //if not in list
      if(isInList == false)
      {
        acronymList.push(foundPair); //push the pair into the list
        //console.log(acronym + " " + bestLongForm); //print list
      }

    }

    return acronymList;
    
  }


  //old single match Pair function
  private matchPair(acronym: string, definition: string) {
    //acronym has to have at least 2 characters

    // console.log("Acronym candidate: ", acronym);
    // console.log("Definition candidate: ", definition);

    if (acronym.length < 2)
    {
      //console.log("ERROR: Acronym length is less than 2");
      return;
    }

    definition = definition.replace(/\n/g, " "); //swap all endlines by spaces


    
    let bestLongForm = this.bestLongForm(acronym, definition);

    //console.log("bestLongForm: ", bestLongForm);

    if (bestLongForm == null)
    {
      //console.log("ERROR: no bestLongForm determined");
      return;
    }
    
    //swap \n to " "

    bestLongForm = bestLongForm.replace(/\n/g, " "); //swap all endlines by spaces

    //check the bestLongForm according to Schwartz algorithm
    let bestLongFormWords = bestLongForm.split(" ");

    let acronymCharsCount = this.countLetterAndDigits(acronym); //number of characters in acronym that are digits or letters
    let defWordsCount = bestLongFormWords.length; //number of words in definition

    if(bestLongForm.length < acronym.length || //if long form is shorter than acronym
      bestLongForm.indexOf(acronym + " ") > -1 || //if long form containt acronym
      bestLongForm.endsWith(acronym) || //if long form ends with acronym
      defWordsCount > 2 * acronymCharsCount || defWordsCount > acronymCharsCount + 5 || acronymCharsCount > 10)
    {
      return;
    }

    var foundPair = {
      "shortform": acronym,
      "longform": bestLongForm
    }; //set up a pair of acronym - long form JSON

    //this.acronymList.push(foundPair); //push the pair into the list
    //console.log(acronym + " " + bestLongForm); //print list
  }
}
