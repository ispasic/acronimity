import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PubmedService } from '../services/pubmed.service';
import { AcronymService } from '../services/acronym.service';
import { AcronymsDatabaseService } from '../services/acronyms-database.service';
import { MatDialog } from '@angular/material/dialog';

import { ShowdetailsDialogComponent } from './showdetails-dialog/showdetails-dialog.component';
import { ShowacronymsDialogComponent } from './showacronyms-dialog/showacronyms-dialog.component';

import * as FileSaver from 'file-saver';

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

  ngOnInit(): void {
  }

  ngOnDestroy() {
    if(this.insertObject) this.insertObject.unsubscribe(console.log);
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

    this.searchProgress = "Search done. Fetching basic data for " + this.resultsNumber + " result(s)..";
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
      }; //generate single entry and push it into the list of results

      this.listOfSearchResults.push(singleEntry);
    }

    console.log("List of search results: ", this.listOfSearchResults);

    this.isSearched = true;
    this.searchProgress = "";

    console.log("List of IDs:", this.listOfSearchIDs);
    this.result = this.listOfSearchIDs.toString().split(",").join('\n');

    //get all acronyms into list
    var IDs;
    console.log("listOfSearchResults:", this.listOfSearchResults);
    for (var entry of this.listOfSearchResults)
    {
      IDs = IDs + entry.id + ",";
    }
    var abstracts = await this.getAbstractByID(IDs);

    this.acronymList.length = 0; //empty the acronym list
    this.acronymList = this.acronymService.getAcronymList(abstracts); //get acronyms from abstracts
    console.log("Acronyms from abstracts: ", this.acronymList);
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
    for (var a of this.acronymList)
    {
      console.log("Insert acronym", a);
      this.insertObject = this.acronymsDatabaseService.insertAcronym(a.shortform, a.longform).subscribe(console.log);
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

  async getAllAcronymsDatabase() {
    const result = await this.acronymsDatabaseService.getAllAcronyms().toPromise();
    return result;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

}
