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
  resultsNumber = 1;
  listOfSearchIDs = [];
  searchProgress = "";
  abstracts;

  acronymList = [];
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

  ngOnInit(): void {
  }

  ngOnDestroy() {
  }

  async searchButtonClick(query, number): Promise<void> {

    // null previous results

    this.listOfSearchIDs.length = 0;
    this.listOfSearchResults.length = 0;
    this.listOfDisplayResults.length = 0;
    this.acronymList.length = 0;
    this.isTested = true;
    this.isSearched = false;
    this.isLoaded = false;

    this.searchProgress = "Searching PubMed Database..";

    console.log("Query:", query);

    // search the database with an API call
    await this.sleep(1000);
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
    console.log("List of IDs:", this.listOfSearchIDs);

    // get the basic data for each result
    await this.getBasicDataResults(this.listOfSearchIDs);
    console.log("List of search results: ", this.listOfSearchResults);

    //get acronyms from each abstract one by one
    await this.getAcronymsFromAbstracts(this.listOfSearchIDs);

    //search is done
    this.isSearched = true;
    this.searchProgress = '';

    console.log("Acronyms from abstracts: ", this.acronymList);

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
    await this.sleep(1000);
    this.searchProgress = `Fetching basic data for ${this.resultsNumber} result(s)`;

    // form the list of IDs
    let allIDs = '';
    for (let i = 0; i < listOfIDs.length; i++) {
      if (i == 0) {
        allIDs = allIDs + listOfIDs[i];
      } else {
        allIDs = allIDs + ',' + listOfIDs[i];
      }
    }

    // get all basic data
    let dataRes = await this.getBasicDataByID(allIDs);

    for (let i = 0; i < listOfIDs.length; i++) {
      let id = listOfIDs[i];
      let title = dataRes.result[id].title;
      let journal = dataRes.result[id].fulljournalname;
      let pubdate = dataRes.result[id].pubdate;
      let authors = dataRes.result[id].authors;
      //console.log("Authors = ", authors);
      let displayAuthors = this.formDisplayAuthors(authors);

      let singleEntry = {
        "id": id,
        "title": title,
        "journal": journal,
        "pubdate": pubdate,
        "authors": authors,
        "displayauthors": displayAuthors
      }; //generate single entry and push it into the list of results

      this.listOfSearchResults.push(singleEntry);
    }
    console.log(dataRes);
    
  }

  async getAcronymsFromAbstracts(listOfIDs): Promise<any> {
    await this.sleep(1000);
    this.searchProgress = `Fetching all abstracts for ${this.resultsNumber} result(s)`;
    // form the list of IDs
    let allIDs = '';
    for (let i = 0; i < listOfIDs.length; i++) {
      if (i == 0) {
        allIDs = allIDs + listOfIDs[i];
      } else {
        allIDs = allIDs + ',' + listOfIDs[i];
      }
    }

    // get all the abstracts
    let abstractsRes = await this.getAbstractByID(allIDs);
    let abstracts = '';
    abstracts = abstracts + abstractsRes;

    // separate abstracts
    for (let i = 0; i < listOfIDs.length; i++) {

      // find position of abstract
      let abstractFound = false;
      if (abstracts.indexOf(listOfIDs[i]) != -1) {
        abstractFound = true;
      }
      // if abstract found cut everything before
      if (abstractFound) {
        abstracts = abstracts.substring(abstracts.indexOf(listOfIDs[i]));
      }

      // find an abstract and cut it into separate substring
      let abIndexStart = abstracts.indexOf('AB  - ');
      let abIndexEnd = 0;

      if (abstracts.indexOf('CI  - ') - abIndexStart < abstracts.indexOf('FAU - ') - abIndexStart) {
        abIndexEnd = abstracts.indexOf('CI  - ');
      } else {
        abIndexEnd = abstracts.indexOf('FAU - ');
      }
      let abstract = abstracts.substring(abIndexStart + 6, abIndexEnd);
      abstract = abstract.replace(/\s{2,}/g,' '); //swap all multiple spaces with spaces

      // cut all abstracts for the next one
      abstracts = abstracts.substring(abIndexEnd);

      //form single acronym list
      let singleAcronymList = this.acronymService.getAcronymList(abstract);
      //swap long<->short in abstract
      let swapText = this.abstractProcessingService.swapAcronyms(abstract, singleAcronymList);
      let tagText = this.abstractProcessingService.tagAcronyms(abstract, singleAcronymList);
      for (let j = 0; j < singleAcronymList.length; j++)
      {
        singleAcronymList[j].swapText = swapText;
        singleAcronymList[j].tagText = tagText;
        singleAcronymList[j].pubMedId = listOfIDs[i];
        singleAcronymList[j].title = this.listOfSearchResults[i].title;
        singleAcronymList[j].journal = this.listOfSearchResults[i].journal;
        singleAcronymList[j].authors = this.listOfSearchResults[i].authors;
        singleAcronymList[j].pubdate = this.listOfSearchResults[i].pubdate;
      }
      //push acronyms to main acronym list without removing duplicates
      //this.acronymList = this.acronymList.concat(singleAcronymList);
      
      //push acronyms to main acronym list with removing duplicates
      for (let j = 0; j < singleAcronymList.length; j++) {
        let isPresent = false;
        for (let k = 0; k < this.acronymList.length; k++) {
          if (this.acronymList[k].shortform.toLowerCase() == singleAcronymList[j].shortform.toLowerCase()) {
            isPresent = true;
            break;
          }
        }
        if (!isPresent) {
          this.acronymList.push(singleAcronymList[j]);
        }
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
  async downloadAbstractsClick(): Promise<void> {
    var IDs;
    console.log("listOfSearchResults:", this.listOfSearchResults);
    for (var entry of this.listOfSearchResults)
    {
      IDs = IDs + entry.id + ",";
    }
    const abstracts = await this.getAbstractByID(IDs);
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
    var blob = new Blob([JSON.stringify(this.acronymList, null, 2)], {type: "text/plain;charset=utf-8"});
    FileSaver.saveAs(blob, "Acronyms.json");
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
    this.acronymList.length = 0;
    this.isTested = true;
    this.isSearched = false;
    this.isLoaded = false;

    this.searchProgress = "Loading MaridDB Database..";

    //get abstracts from database
    const abstracts = await this.getAllAbstractsDatabase();
    var loadResult = JSON.parse(JSON.stringify(abstracts));

    console.log("Load Result:", loadResult);
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
      let swapText = this.abstractProcessingService.swapAcronyms(loadResult[i].text, singleAcronymList);
      let tagText = this.abstractProcessingService.tagAcronyms(loadResult[i].text, singleAcronymList);
      for (let j = 0; j < singleAcronymList.length; j++)
      {
        singleAcronymList[j].swapText = swapText;
        singleAcronymList[j].tagText = tagText;
        singleAcronymList[j].pubMedId = loadResult[i].pubmed_id;
        singleAcronymList[j].title = loadResult[i].title;
        singleAcronymList[j].journal = loadResult[i].journal;
        singleAcronymList[j].authors = JSON.parse(loadResult[i].authors);
        singleAcronymList[j].pubdate = loadResult[i].pubdate;
      }
      //push acronyms to main acronym list
      this.acronymList = this.acronymList.concat(singleAcronymList);
    }

    console.log("List of loaded results: ", this.listOfSearchResults);
    console.log("List of loaded IDs:", this.listOfSearchIDs);

    //search is done
    this.isSearched = true;
    this.searchProgress = '';

    console.log("Acronyms from abstracts: ", this.acronymList);

    this.paginatorResultsNumber = this.listOfSearchResults.length;

    //form initial list of display results
    for (let i = 0; i < Math.min(10, this.listOfSearchResults.length); i++) {
      this.listOfDisplayResults.push(this.listOfSearchResults[i]);
    }

    this.isLoaded = true;
  }

  async getAllAbstractsDatabase() {
    const result = await this.acronymsDatabaseService.getAllAbstracts().toPromise().catch(error => console.log(error));
    return result;
  }

  //get all acronyms and insert them into database
  async insertAllAcronymsClick(): Promise<void> {
    //insert one by one
    for (var acronym of this.acronymList)
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
      data: this.acronymList
    });
  }

  async searchDatabase(query, number) {
    const res = await this.pubmedService.searchDatabase(query, number).toPromise().catch(error => console.log(error));
    return res;
  }

  async getBasicDataByID(id) {
    const res = await this.pubmedService.getBasicDataByID(id).toPromise().catch(error => console.log(error));
    return res;
  }

  async getAbstractByID(id) {
    const result = await this.pubmedService.getAbstractByID(id).toPromise().catch(error => console.log(error));
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

  async getAcronymsFromAbstractsOld(listOfIDs): Promise<any> {
    for (let i = 0; i < listOfIDs.length; i++) {
      await this.sleep(500);
      this.searchProgress = `Fetching abstract for ${i + 1} result out of ${this.resultsNumber} result(s)`;
      let abstract = await this.getAbstractByID(listOfIDs[i]);
      if (!abstract)
      {
        this.searchProgress = `Request limit to pubmed exceeded`;
        return;
      }

      //form single acronym list
      let singleAcronymList = this.acronymService.getAcronymList(abstract);
      //swap long<->short in abstract
      let swapText = this.abstractProcessingService.swapAcronyms(abstract, singleAcronymList);
      let tagText = this.abstractProcessingService.tagAcronyms(abstract, singleAcronymList);
      for (let j = 0; j < singleAcronymList.length; j++)
      {
        singleAcronymList[j].swapText = swapText;
        singleAcronymList[j].tagText = tagText;
        singleAcronymList[j].pubMedId = listOfIDs[i];
        singleAcronymList[j].title = this.listOfSearchResults[i].title;
        singleAcronymList[j].journal = this.listOfSearchResults[i].journal;
        singleAcronymList[j].authors = this.listOfSearchResults[i].authors;
        singleAcronymList[j].pubdate = this.listOfSearchResults[i].pubdate;
      }
      //push acronyms to main acronym list
      this.acronymList = this.acronymList.concat(singleAcronymList);
    }
  }

}
