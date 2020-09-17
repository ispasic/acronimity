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
    this.listOfSearchIDs.length = 0;
    this.listOfSearchResults.length = 0;
    this.listOfDisplayResults.length = 0;
    this.isTested = true;
    this.isSearched = false;
    this.isLoaded = false;

    this.searchProgress = "Searching PubMed Database..";

    console.log("Query:", query);
    var searchResult = await this.searchDatabase(query, number);
    console.log("Search Result:", searchResult);
    if (searchResult.esearchresult.count == 0)
    {
      this.searchProgress = "The search yielded no results";
      return;
    }

    if (searchResult.esearchresult.idlist.length < this.resultsNumber)
    {
      this.resultsNumber = searchResult.esearchresult.idlist.length;
    }

    //console.log("Test:", searchResult.esearchresult.)

    var i = 0;
    for(var id of searchResult.esearchresult.idlist)
    {
      i++;
      this.searchProgress = `Search done. Fetching basic data for ${i} result out of ${this.resultsNumber} result(s)`;
      this.listOfSearchIDs.push(id);
      await this.sleep(500);
      var basicDataResult = await this.getBasicDataByID(id);
      //console.log("basicDataResult = ", basicDataResult);
      var title = basicDataResult.result[id].title;
      var journal = basicDataResult.result[id].fulljournalname;
      var pubdate = basicDataResult.result[id].pubdate;
      var authors = basicDataResult.result[id].authors;
      //console.log("Authors = ", authors);
      var displayAuthors = this.formDisplayAuthors(authors);

      var singleEntry = {
        "id": id,
        "title": title,
        "journal": journal,
        "pubdate": pubdate,
        "authors": authors,
        "displayauthors": displayAuthors
      }; //generate single entry and push it into the list of results

      this.listOfSearchResults.push(singleEntry);
    }

    console.log("List of search results: ", this.listOfSearchResults);
    console.log("List of IDs:", this.listOfSearchIDs);


    //get all abstracts instantly
    // this.result = this.listOfSearchIDs.toString().split(",").join('\n');

    // //get all acronyms into list
    // var IDs;
    // //console.log("listOfSearchResults:", this.listOfSearchResults);
    // for (var entry of this.listOfSearchResults)
    // {
    //   IDs = IDs + entry.id + ",";
    // }
    // var abstracts = await this.getAbstractByID(IDs);
    // //console.log("abstracts = ", abstracts);

    // this.acronymList.length = 0; //empty the acronym list
    // this.acronymList = this.acronymService.getAcronymList(abstracts); //get acronyms from abstracts

    //get acronyms from each abstract one by one
    this.acronymList.length = 0; //empty the acronym list
    await this.getAcronymsFromAbstracts(this.listOfSearchIDs);

    //search is done
    this.isSearched = true;
    this.searchProgress = '';

    console.log("Acronyms from abstracts: ", this.acronymList);

    //if less results then requested
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

  async getAcronymsFromAbstracts(listOfIDs): Promise<any> {
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

    this.resultsNumber = loadResult.length;

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

}
