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
  query = "";
  resultsNumber = 1;
  result = "";
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
    for (let i = 0; i < this.listOfSearchIDs.length; i++) {
      this.searchProgress = `Search done. Fetching abstract for ${i + 1} result out of ${this.resultsNumber} result(s)`;
      let abstract = await this.getAbstractByID(this.listOfSearchIDs[i]);
      await this.sleep(500);

      //form single acronym list
      let singleAcronymList = this.acronymService.getAcronymList(abstract);

      //swap long<->short in abstract
      let swapText = this.abstractProcessingService.swapAcronyms(abstract, singleAcronymList);
      let tagText = this.abstractProcessingService.tagAcronyms(abstract, singleAcronymList);
      for (let i = 0; i < singleAcronymList.length; i++)
      {
        singleAcronymList[i].swapText = swapText;
        singleAcronymList[i].tagText = tagText;
        singleAcronymList[i].pubMedId = this.listOfSearchIDs[i];
      }
      //push acronyms to main acronym list
      this.acronymList = this.acronymList.concat(singleAcronymList);
    }
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

  //open details dialog
  async moreDetailsClick(entry): Promise<void> {
    const dialogRef = this.dialog.open(ShowdetailsDialogComponent, {
      data: entry
    });
  }

  //download all abstracts as a single file
  async downloadResultsClick(): Promise<void> {
    var IDs;
    console.log("listOfSearchResults:", this.listOfSearchResults);
    for (var entry of this.listOfSearchResults)
    {
      IDs = IDs + entry.id + ",";
    }
    var abstracts = await this.getAbstractByID(IDs);
    var blob = new Blob([abstracts], {type: "text/plain;charset=utf-8"});
    FileSaver.saveAs(blob, "Search Results.txt");
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

    this.acronymListFromDatabase = await this.getAllAcronymsDatabase(); //get acronyms from MySql database
    console.log("Acronyms from database: ", this.acronymListFromDatabase);
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

  async insertAcronym(acronym) {
    const result = await this.acronymsDatabaseService.insertAcronym(acronym).toPromise().catch(error => console.log(error));
    return result;
  }

  async getAllAcronymsDatabase() {
    const result = await this.acronymsDatabaseService.getAllAcronyms().toPromise().catch(error => console.log(error));
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
