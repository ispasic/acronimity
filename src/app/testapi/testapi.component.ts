import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PubmedService } from '../services/pubmed.service';
import { MatDialog } from '@angular/material/dialog';

import { ShowdetailsDialogComponent } from './showdetails-dialog/showdetails-dialog.component';

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
  result = "";
  listOfSearchIDs = [];
  searchProgress = "";
  
  listOfSearchResults = [];

  ngOnInit(): void {
  }

  async searchButtonClick(query): Promise<void> {
    this.listOfSearchIDs.length = 0;
    this.listOfSearchResults.length = 0;
    this.isTested = true;
    this.isSearched = false;

    this.searchProgress = "Searching PubMed Database..";

    console.log("Query:", query);
    var searchResult = await this.searchDatabase(query);
    console.log("Search Result:", searchResult);

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
  }

  async moreDetailsClick(entry): Promise<void> {
    const dialogRef = this.dialog.open(ShowdetailsDialogComponent, {
      data: entry
    });

  }

  async searchDatabase(query) {
    const res = await this.pubmedService.searchDatabase(query).toPromise();
    return res;
  }

  async getBasicDataByID(id) {
    const res = await this.pubmedService.getBasicDataByID(id).toPromise();
    return res;
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

}
