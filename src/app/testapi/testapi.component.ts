import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PubmedService } from '../services/pubmed.service';
import { MatDialog } from '@angular/material/dialog';

import { ShowdetailsDialogComponent } from './showdetails-dialog/showdetails-dialog.component';
import { isDataSource } from '@angular/cdk/collections';

import * as FileSaver from 'file-saver';
import { analyzeAndValidateNgModules } from '@angular/compiler';

@Component({
  selector: 'app-testapi',
  templateUrl: './testapi.component.html',
  styleUrls: ['./testapi.component.css']
})
export class TestapiComponent implements OnInit {

  constructor(private router: Router,
    private pubmedService: PubmedService,
    private dialog: MatDialog) { }

  testButtonText = "SEARCH";
  isTested = false;
  isSearched = false;
  query = "";
  resultsNumber = 1;
  result = "";
  listOfSearchIDs = [];
  searchProgress = "";
  abstracts;

  acronymList: String[][] = [];
  
  listOfSearchResults = [];

  ngOnInit(): void {
  }

  async searchButtonClick(query, number): Promise<void> {
    this.listOfSearchIDs.length = 0;
    this.listOfSearchResults.length = 0;
    this.isTested = true;
    this.isSearched = false;

    this.searchProgress = "Searching PubMed Database..";

    console.log("Query:", query);
    var searchResult = await this.searchDatabase(query, number);
    console.log("Search Result:", searchResult);
    if (searchResult.esearchresult.count == 0)
    {
      this.searchProgress = "The search yielded no results";
      return;
    }

    //console.log("Test:", searchResult.esearchresult.)

    this.searchProgress = "Search done. Fetching basic data for 20 most relevant results..";
    for(var id of searchResult.esearchresult.idlist)
    {
      this.listOfSearchIDs.push(id);
      await this.sleep(1000);
      var basicDataResult = await this.getBasicDataByID(id);
      var title = basicDataResult.result[id].title;
      var journal = basicDataResult.result[id].fulljournalname;
      var pubdate = basicDataResult.result[id].pubdate;
      var authors = basicDataResult.result[id].authors;
      var displayAuthors = this.formDisplayAuthors(authors);

      var singleEntry = {
        "id": id,
        "title": title,
        "journal": journal,
        "pubdate": pubdate,
        "authors": authors,
        "displayauthors": displayAuthors
      };

      this.listOfSearchResults.push(singleEntry);
    }

    console.log("List of search results: ", this.listOfSearchResults);

    this.isSearched = true;
    this.searchProgress = "";

    console.log("List of IDs:", this.listOfSearchIDs);
    this.result = this.listOfSearchIDs.toString().split(",").join('\n');

    //let testString = "We recruited people with rheumatoid arthritis (RA) or systemic lupuserythematosus (SLE) or DNA (de nuclein acid)."
    //console.log("testString = ", testString);
    //this.extractPairs(testString);

    console.log("Found Acronyms = ", this.acronymList);

  }

  async moreDetailsClick(entry): Promise<void> {
    const dialogRef = this.dialog.open(ShowdetailsDialogComponent, {
      data: entry
    });
  }

  async downloadResults(): Promise<void> {
    var IDs;
    console.log("listOfSearchResults:", this.listOfSearchResults);
    for (var entry of this.listOfSearchResults)
    {
      IDs = IDs + entry.id + ",";
    }
    var abstracts = await this.getAbstractByID(IDs);
    var blob = new Blob([abstracts], {type: "text/plain;charset=utf-8"});
    FileSaver.saveAs(blob, "Search Results.txt");

    this.acronymList.length = 0; //empty the acronym list
    this.extractPairs(abstracts);
    console.log("Found Acronyms = ", this.acronymList);
  }

  async searchDatabase(query, number) {
    const res = await this.pubmedService.searchDatabase(query, number).toPromise();
    return res;
  }

  async getBasicDataByID(id) {
    const res = await this.pubmedService.getBasicDataByID(id).toPromise();
    return res;
  }

  async getAbstractByID(id) {
    const result = await this.pubmedService.getAbstractByID(id).toPromise();
    return result;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  addToResults(id, title, authors, journal, year) {

    var singleEntry = {
      "id": id,
      "title": title,
      "journal": journal,
      "year": year,
      "authors": authors
    };

    this.listOfSearchResults.push(singleEntry);

    return;
  }

  formDisplayAuthors(authors): String {
    var result;
    if(authors.length > 3)
      {
        result = authors[0].name + ", " + authors[1].name + ", " + authors[2].name + " et al.";
      }
      else if(authors.length == 3)
      {
        result = authors[0].name + ", " + authors[1].name + ", " + authors[2].name;
      }
      else if(authors.length == 2)
      {
        result = authors[0].name + ", " + authors[1].name;
      }
      else
      {
        result = authors[0].name;
      }
    return result;
  }



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

  countLetterAndDigits(str: string): number {
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

  private extractPairs(sentence: string) {
    let acronym = "";
    let definition = "";
    let o = -1;
    let c = -1;
    let cutoff = -1;
    let nextc = -1;
    let tmp = -1;
    let swapAcronym = "";

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
          cutoff = Math.max(sentence.lastIndexOf(". ", o), sentence.lastIndexOf(", ", o));
          if (cutoff == -1) //if no . or , before
          {
            cutoff = -2;
          }

          definition = sentence.substring(cutoff + 2, o); //get the full definition candidate
          console.log("Initial definition = ", definition);
          acronym = sentence.substring(o + 1, c); //get the full acronym candidate
          console.log("Initial acronym = ", acronym);
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
            this.matchPair(acronym.trim(), definition.trim()); //match the pair of acronym and definition candidates
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
  }

  private bestLongForm(acronym: string, definition: string): string {
    // --- go through the acronym & definition character by character,
    //     right to left looking for a match

    definition = definition.toLowerCase();

    let a = acronym.length - 1;
    let d = definition.length - 1;

    for( ; a >= 0; a--)
    {
      let c = acronym.charAt(a).toLowerCase();

      if(this.isLetterOrDigit(c))
      {
        while (
            (d >= 0 && definition.charAt(d) != c) ||
            (a == 0 && d > 0 && this.isLetterOrDigit(definition.charAt(d - 1)))
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

    d = definition.lastIndexOf(" ", d) + 1;
    return definition.substring(d);
  }

  private matchPair(acronym: string, definition: string): void {
    console.log("acronym in matchPair = ", acronym);
    console.log("definition in matchPair = ", definition);
    //acronym has to have at least 2 characters
    if (acronym.length < 2)
    {
      console.log("ERROR: Acronym length is less than 2");
      return;
    }

    let bestLongForm = this.bestLongForm(acronym, definition);
    
    if (bestLongForm == null)
    {
      console.log("ERROR: no bestLongForm determined");
      return;
    }

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

    let foundPair: String[] = [acronym, bestLongForm]; //set up a pair of acronym - long form
    this.acronymList.push(foundPair); //push the pair into the list
    //console.log(acronym + " " + bestLongForm); //print list
  }
  

}
