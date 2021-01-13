import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PubmedService } from '../services/pubmed.service';
import { AcronymService } from '../services/acronym.service';
import { AcronymsDatabaseService } from '../services/acronyms-database.service';
import { AbstractProcessingService } from '../services/abstract-processing.service';
import { MatDialog } from '@angular/material/dialog';

import { ShowdetailsDialogComponent } from './showdetails-dialog/showdetails-dialog.component';
import { ShowacronymsDialogComponent } from './showacronyms-dialog/showacronyms-dialog.component';

import * as FileSaver from 'file-saver';
import { PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-testapi',
  templateUrl: './testapi.component.html',
  styleUrls: ['./testapi.component.css']
})
export class TestapiComponent implements OnInit {

  constructor(private router: Router,
    private pubmedService: PubmedService,
    private acronymService: AcronymService,
    private acronymsDatabaseService: AcronymsDatabaseService,
    private abstractProcessingService: AbstractProcessingService,
    private dialog: MatDialog) { }

  testButtonText = "SEARCH";
  isTested = false;
  isSearched = false;
  isLoaded = false;
  query = "";
  resultsNumber = 100;
  listOfSearchIDs = [];
  searchProgress = "";

  listOfAcronyms = [];
  listOfAcronymsDuplicates = [];
  acronymListFromDatabase;
  insertObject;
  listOfSearchResults = [];
  listOfDisplayResults = [];

  pageEvent: PageEvent;
  currentPage: number;
  pageSize = 10;

  searchButtonText = "SEARCH";
  startIndex = 1;
  paginatorResultsNumber: number;

  fetchStep = 400;

  listOfAbstracts = [];

  ngOnInit(): void {
  }

  ngOnDestroy() {
  }

  async searchButtonClick(query, number): Promise<void> {

    // null previous results

    this.listOfSearchIDs.length = 0;
    this.listOfSearchResults.length = 0;
    this.listOfDisplayResults.length = 0;
    this.listOfAbstracts.length = 0;
    this.listOfAcronyms.length = 0;
    this.listOfAcronymsDuplicates.length = 0;
    this.isTested = true;
    this.isSearched = false;
    this.isLoaded = false;

    this.searchProgress = "Searching PubMed Database..";

    console.log("Query:", query);

    // search the database with an API call
    var searchResult = await this.searchDatabase(query, number);
    console.log("Search Result:", searchResult);
    // if no search results
    if (searchResult.esearchresult.count == 0)
    {
      this.searchProgress = "The search yielded no results";
      return;
    }

    // adjust the pagination
    if (searchResult.esearchresult.idlist.length < this.resultsNumber)
    {
      this.resultsNumber = searchResult.esearchresult.idlist.length;
    }

    // form the list of IDs
    for (let i = 0; i < searchResult.esearchresult.idlist.length; i++) {
      this.listOfSearchIDs.push(searchResult.esearchresult.idlist[i]);
    }
    //console.log("List of IDs:", this.listOfSearchIDs);

    // get the basic data for each result
    await this.getBasicDataResults(this.listOfSearchIDs);
    console.log("List of search results: ", this.listOfSearchResults);

    //get acronyms from each abstract one by one
    await this.getAcronymsFromAbstracts(this.listOfSearchIDs);

    //search is done
    this.isSearched = true;
    this.searchProgress = '';

    console.log("Acronyms from abstracts: ", this.listOfAcronyms);
    console.log("Abstracts: ", this.listOfAbstracts);

    //if less results then requested adjust paginator
    if (this.listOfSearchResults.length < this.resultsNumber)
    {
      this.paginatorResultsNumber = this.listOfSearchResults.length;
    }
    else
    {
      this.paginatorResultsNumber = this.resultsNumber;
    }

    //form initial list of display results
    for (let i = 0; i < Math.min(10, this.listOfSearchResults.length); i++) {
      this.listOfDisplayResults.push(this.listOfSearchResults[i]);
    }
  }

  async getBasicDataResults(listOfIDs): Promise<any> {

    let step = this.fetchStep;
    //get the number of steps needed (STEP each time)
    let number = Math.ceil(listOfIDs.length/step);

    // do searches/each step
    for (let i = 0; i < number; i++) {
      // form the list of IDs for this step
      let processed = 0;
      let stepIDsParam = '';
      let stepIDsList = [];

      // create a string of IDs separated by coma. Stop when processed = step
      for (let j = i * step; j < listOfIDs.length; j++) {
        this.searchProgress = `Fetching basic data for ${i*step + 1} - ${j + 1} out of ${this.resultsNumber} result(s)`;

        if (j == i * step) {
          stepIDsParam = stepIDsParam + listOfIDs[j];
        } else {
          stepIDsParam = stepIDsParam + ',' + listOfIDs[j];
        }
        stepIDsList.push(listOfIDs[j]);

        // check if enough IDs in this step
        processed++;
        if (processed == step) {
          break;
        }
      }

      // get all basic data
      let dataRes = await this.getBasicDataByID(stepIDsParam, 0);

      // push each entry one by one
      for (let j = 0; j < stepIDsList.length; j++) {
        let singleEntry = {
          "id": stepIDsList[j],
          "title": dataRes.result[stepIDsList[j]].title,
          "journal": dataRes.result[stepIDsList[j]].fulljournalname,
          "pubdate": dataRes.result[stepIDsList[j]].pubdate,
          "authors": dataRes.result[stepIDsList[j]].authors,
          "displayauthors": this.formDisplayAuthors(dataRes.result[stepIDsList[j]].authors)
        }; //generate single entry and push it into the list of results

        this.listOfSearchResults.push(singleEntry);
      }
    }
  }

  async getAcronymsFromAbstracts(listOfIDs): Promise<any> {

    let step = this.fetchStep;
    //get the number of fetching needed (STEP each time)
    let number = Math.ceil(listOfIDs.length/step);

    // cycle through each step
    for (let i = 0; i < number; i++) {
      // form the list of IDs for this step
      let processed = 0;
      let stepIDsParam = '';
      let stepIDsList = [];

      // create a string of IDs separated by coma. Stop when processed = step
      for (let j = i * step; j < listOfIDs.length; j++) {
        this.searchProgress = `Processing abstracts for ${i*step + 1} - ${j + 1} out of ${this.resultsNumber} result(s)`;
        if (j == i * step) {
          stepIDsParam = stepIDsParam + listOfIDs[j];
        } else {
          stepIDsParam = stepIDsParam + ',' + listOfIDs[j];
        }
        stepIDsList.push(listOfIDs[j]);

        // check if enough IDs in this step
        processed++;
        if (processed == step) {
          break;
        }
      }

      // get all the abstracts for this step
      let abstractsRes = await this.getAbstractByID(stepIDsParam, 0);
      let abstracts = '';
      abstracts = abstracts + abstractsRes;

      // cycle through IDs, separate each abstract and process it
      for (let j = 0; j < stepIDsList.length; j++) {

        // find position of abstract
        let abstractFound = false;
        if (abstracts.indexOf(stepIDsList[j]) != -1) {
          abstractFound = true;
        }
        // if abstract found cut everything before
        if (abstractFound) {
          abstracts = abstracts.substring(abstracts.indexOf(stepIDsList[j]));
        }

        // find an abstract and cut it into separate substring
        let abIndexStart = abstracts.indexOf('AB  - ');
        let abIndexEnd = 0;

        if (abstracts.indexOf('CI  - ') == -1) {
          abIndexEnd = abstracts.indexOf('FAU - ');
        } else if (abstracts.indexOf('FAU - ') == -1) {
          abIndexEnd = abstracts.indexOf('CI  - ');
        } else if (abstracts.indexOf('CI  - ') - abIndexStart < abstracts.indexOf('FAU - ') - abIndexStart) {
          abIndexEnd = abstracts.indexOf('CI  - ');
        } else {
          abIndexEnd = abstracts.indexOf('FAU - ');
        }

        // get the abstract
        let abstract = '';
        if (abIndexStart < abIndexEnd) {
          abstract = abstracts.substring(abIndexStart + 6, abIndexEnd);
        }
        abstract = abstract.replace(/\s{2,}/g,' '); //swap all multiple spaces with spaces
        
        // cut all abstracts for the next one
        abstracts = abstracts.substring(abIndexEnd);

        //form single acronym list
        let singleAcronymList = this.acronymService.getAcronymList(abstract);

        // get extra information about abstract for acronym

        //swap long<->short in abstract
        let swapText = this.abstractProcessingService.swapAcronyms(abstract, singleAcronymList);
        let tagText = this.abstractProcessingService.tagAcronyms(abstract, singleAcronymList);

        // find basic data for abstract from listOfSearchResults
        let title = '';
        let journal = '';
        let authors = [];
        let pubdate = '';

        for (let k = 0; k < this.listOfSearchResults.length; k++) {
          if (this.listOfSearchResults[k].id == stepIDsList[j]) {
            title = this.listOfSearchResults[k].title;
            journal = this.listOfSearchResults[k].journal;
            pubdate = this.listOfSearchResults[k].pubdate;
            for (let l = 0; l < this.listOfSearchResults[k].authors.length; l++) {
              authors.push(this.listOfSearchResults[k].authors[l]);
            }
          }
        }

        // attach extra info to each acronym pair
        for (let k = 0; k < singleAcronymList.length; k++)
        {
          singleAcronymList[k].swapText = swapText;
          singleAcronymList[k].tagText = tagText;
          singleAcronymList[k].pubMedId = stepIDsList[j];
          singleAcronymList[k].title = title;
          singleAcronymList[k].journal = journal;
          singleAcronymList[k].authors = authors;
          singleAcronymList[k].pubdate = pubdate;
        }

        //push acronyms to main acronym list without removing duplicates
        this.listOfAcronymsDuplicates = this.listOfAcronymsDuplicates.concat(singleAcronymList);
        
        //push acronyms to main acronym list with removing duplicates
        for (let l = 0; l < singleAcronymList.length; l++) {
          let isPresent = false;
          for (let k = 0; k < this.listOfAcronyms.length; k++) {
            if (this.listOfAcronyms[k].shortform.toLowerCase() == singleAcronymList[l].shortform.toLowerCase()) {
              isPresent = true;
              break;
            }
          }
          if (!isPresent) {
            this.listOfAcronyms.push(singleAcronymList[l]);
          }
        }

        
        // form list of acronyms without additional info
        let abstractAcronyms = [];
        for (let k = 0; k < singleAcronymList.length; k++) {
          let singlePair = {
            "shortform": singleAcronymList[k].shortform,
            "longform": singleAcronymList[k].longform
          };
          abstractAcronyms.push(singlePair);
        }

        let singleAbstract = {
          "title": title,
          "journal": journal,
          "pubdate": pubdate,
          "authors": authors,
          "text": abstract,
          "acronyms": abstractAcronyms
        };
        this.listOfAbstracts.push(singleAbstract);
      }
    }
  }

  //open details dialog
  async moreDetailsClick(entry): Promise<void> {
    const dialogRef = this.dialog.open(ShowdetailsDialogComponent, {
      data: entry
    });
  }

  //download all abstracts as a single file
  async downloadSearchResultsClick(): Promise<void> {
    var IDs;
    console.log("listOfSearchResults:", this.listOfSearchResults);
    for (var entry of this.listOfSearchResults)
    {
      IDs = IDs + entry.id + ",";
    }
    const abstracts = await this.getAbstractByID(IDs, 0);
    var blob = new Blob([abstracts], {type: "text/plain;charset=utf-8"});
    FileSaver.saveAs(blob, "Search Results.txt");
  }

  //download all acronyms from database as a single file
  async downloadAcronymsDatabaseClick(): Promise<void> {
    const acronymsResult = await this.getAllAcronymsDatabase();
    let acronymsJson = JSON.parse(JSON.stringify(acronymsResult));
    for (let i = 0; i < acronymsJson.length; i++)
    {
      if (acronymsJson[i].authors.length > 0) {
        acronymsJson[i].authors = JSON.parse(acronymsJson[i].authors);
      } 
    }
    var blob = new Blob([JSON.stringify(acronymsJson, null, 2)], {type: "text/plain;charset=utf-8"});
    FileSaver.saveAs(blob, "Acronyms.json");
  }

  //download all acronyms from results as single file
  async downloadAcronymsClick(): Promise<void> {
    var blob = new Blob([JSON.stringify(this.listOfAcronyms, null, 2)], {type: "text/plain;charset=utf-8"});
    FileSaver.saveAs(blob, "Acronyms.json");
  }

  //download all abstracts from results as single file
  async downloadAbstractsClick(): Promise<void> {
    var blob = new Blob([JSON.stringify(this.listOfAbstracts, null, 2)], {type: "text/plain;charset=utf-8"});
    FileSaver.saveAs(blob, "Abstracts.json");
  }

  openPubmedHelpClick() {
    let url = "https://pubmed.ncbi.nlm.nih.gov/help/";
    window.open(url, "_blank", "noopener");
  }

  async getAllAcronymsDatabase() {
    const result = await this.acronymsDatabaseService.getAllAcronyms().toPromise().catch(error => console.log(error));
    return result;
  }

  async showDatabaseClick(): Promise<void> {
    //null results
    this.listOfSearchIDs.length = 0;
    this.listOfSearchResults.length = 0;
    this.listOfDisplayResults.length = 0;
    this.listOfAcronyms.length = 0;
    this.listOfAcronymsDuplicates.length = 0;
    this.listOfAbstracts.length = 0;
    this.isTested = true;
    this.isSearched = false;
    this.isLoaded = false;

    this.searchProgress = "Loading MaridDB Database..";

    //get abstracts from database
    const abstracts = await this.getAllAbstractsDatabase();
    var loadResult = JSON.parse(JSON.stringify(abstracts));

    //console.log("Load Result:", loadResult);
    if (loadResult.length == 0)
    {
      this.searchProgress = "No data in the database";
      return;
    }

    //form list of search Results
    for (let i = 0; i < loadResult.length; i++) {
      //form single entry for display

      let authors = JSON.parse(loadResult[i].authors);
      let displayAuthors = this.formDisplayAuthors(authors);

      var singleEntry = {
        "id": loadResult[i].pubmed_id,
        "title": loadResult[i].title,
        "journal": loadResult[i].journal,
        "pubdate": loadResult[i].pubdate,
        "authors": JSON.parse(loadResult[i].authors),
        "displayauthors": displayAuthors
      }
      this.listOfSearchResults.push(singleEntry);
      this.listOfSearchIDs.push(loadResult[i].pubmed_id);

      //find acronyms from the abstract and push to list
      //form single acronym list
      let singleAcronymList = this.acronymService.getAcronymList(loadResult[i].text);

      //swap long<->short in abstract
      //let swapText = this.abstractProcessingService.swapAcronyms(loadResult[i].text, singleAcronymList);
      //let tagText = this.abstractProcessingService.tagAcronyms(loadResult[i].text, singleAcronymList);

      for (let j = 0; j < singleAcronymList.length; j++)
      {
        singleAcronymList[j].swapText = loadResult[i].swapText;
        singleAcronymList[j].tagText = loadResult[i].tagText;
        singleAcronymList[j].pubMedId = loadResult[i].pubmed_id;
        singleAcronymList[j].title = loadResult[i].title;
        singleAcronymList[j].journal = loadResult[i].journal;
        singleAcronymList[j].authors = JSON.parse(loadResult[i].authors);
        singleAcronymList[j].pubdate = loadResult[i].pubdate;
      }

      //push acronyms to main acronym list with duplicates
      this.listOfAcronymsDuplicates = this.listOfAcronymsDuplicates.concat(singleAcronymList);

      //push acronyms to main acronym list with removing duplicates
      for (let j = 0; j < singleAcronymList.length; j++) {
        let isPresent = false;
        for (let k = 0; k < this.listOfAcronyms.length; k++) {
          if (this.listOfAcronyms[k].shortform.toLowerCase() == singleAcronymList[j].shortform.toLowerCase()) {
            isPresent = true;
            break;
          }
        }
        if (!isPresent) {
          this.listOfAcronyms.push(singleAcronymList[j]);
        }
      }

      // form list of acronyms without additional info
      let abstractAcronyms = [];
      for (let k = 0; k < singleAcronymList.length; k++) {
        let singlePair = {
          "shortform": singleAcronymList[k].shortform,
          "longform": singleAcronymList[k].longform
        };
        abstractAcronyms.push(singlePair);
      }

      let singleAbstract = {
        "title": loadResult[i].title,
        "journal": loadResult[i].journal,
        "pubdate": loadResult[i].pubdate,
        "authors": authors,
        "text": loadResult[i].text,
        "acronyms": abstractAcronyms
      };
      this.listOfAbstracts.push(singleAbstract);
    }

    console.log("List of loaded results: ", this.listOfSearchResults);
    console.log("List of loaded IDs:", this.listOfSearchIDs);
    console.log("Abstracts: ", this.listOfAbstracts);

    //search is done
    this.isSearched = true;
    this.searchProgress = '';

    console.log("Acronyms from abstracts: ", this.listOfAcronyms);

    this.paginatorResultsNumber = this.listOfSearchResults.length;

    //form initial list of display results
    for (let i = 0; i < Math.min(10, this.listOfSearchResults.length); i++) {
      this.listOfDisplayResults.push(this.listOfSearchResults[i]);
    }

    this.resultsNumber = loadResult.length;

    this.isLoaded = true;
  }

  async getAllAbstractsDatabase() {
    const result = await this.acronymsDatabaseService.getAllAbstracts().toPromise().catch(error => console.log(error));
    return result;
  }

  //get all acronyms and insert them into database
  async insertAllAcronymsClick(): Promise<void> {
    //insert one by one
    for (var acronym of this.listOfAcronyms)
    {
      console.log("Insert acronym", acronym);
      this.insertObject = await this.insertAcronym(acronym);
      console.log(this.insertObject);
    }

    // this.acronymListFromDatabase = await this.getAllAcronymsDatabase(); //get acronyms from MySql database
    // console.log("Acronyms from database: ", this.acronymListFromDatabase);
  }

  async insertAcronym(acronym) {
    const result = await this.acronymsDatabaseService.insertAcronym(acronym).toPromise().catch(error => console.log(error));
    return result;
  }

  async showAllAcronymsClick(): Promise<void> {
    const dialogRef = this.dialog.open(ShowacronymsDialogComponent, {
      data: this.listOfAcronyms
    });
  }

  async searchDatabase(query, number) {
    await this.sleep(1000);
    const res = await this.pubmedService.searchDatabase(query, number).toPromise().catch(error => console.log(error));
    return res;
  }

  async getBasicDataByID(id, start) {
    await this.sleep(1000);
    const res = await this.pubmedService.getBasicDataByID(id, start).toPromise().catch(error => console.log(error));
    return res;
  }

  async getAbstractByID(id, start) {
    await this.sleep(1000);
    const result = await this.pubmedService.getAbstractByID(id, start).toPromise().catch(error => console.log(error));
    return result;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  formDisplayAuthors(authors): String {
    var result;
    if(authors.length == 0)
    {
      result = "undefined";
      return result;
    }
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

  public getDisplayResults(event?:PageEvent) {

    //clear list of display results
    this.listOfDisplayResults.length = 0;

    //get page index and size
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;

    //console.log("Current Page", this.currentPage);
    //console.log("Current Display Size", this.pageSize);

    //form list of display results
    for (let i = this.currentPage * this.pageSize; i < Math.min(this.currentPage * this.pageSize + this.pageSize, this.listOfSearchResults.length); i++) {
      this.listOfDisplayResults.push(this.listOfSearchResults[i]);
    }

    return event;

  }
}
