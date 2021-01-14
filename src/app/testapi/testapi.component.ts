import { ChangeDetectorRef, Component, OnInit, ViewChild, ViewChildren } from '@angular/core';
import { Router } from '@angular/router';
import { PubmedService } from '../services/pubmed.service';
import { AcronymService } from '../services/acronym.service';
import { AcronymsDatabaseService } from '../services/acronyms-database.service';
import { AbstractProcessingService } from '../services/abstract-processing.service';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent, MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';

import { ShowdetailsDialogComponent } from './showdetails-dialog/showdetails-dialog.component';
import { ShowacronymsDialogComponent } from './showacronyms-dialog/showacronyms-dialog.component';

import * as FileSaver from 'file-saver';

import Tokenizer from "../../../node_modules/sentence-tokenizer/lib/tokenizer"

import { PaginationInstance } from 'ngx-pagination';

//interface for sense inventory table
export interface senseInventory {
  "acronym": string,
  "sense": string,
  "cui": string,
  "frequency": string
}

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
    private dialog: MatDialog,
    private changeDetectorRef: ChangeDetectorRef) { }

  // Sense Inventory Table declarations

  dataSource = new MatTableDataSource<senseInventory>();
  displayedColumns = ['acronym', 'sense', 'cui', 'frequency'];

  private paginator: MatPaginator;
  private sort: MatSort;
  @ViewChild(MatSort) set matSort(ms: MatSort) {
    this.sort = ms;
    this.setDataSourceAttributes();
  }

  @ViewChild(MatPaginator) set matPaginator(mp: MatPaginator) {
    this.paginator = mp;
    this.setDataSourceAttributes();
  }

  setDataSourceAttributes() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  // Global variables declarations
  testButtonText = "SEARCH";
  isTested = false;
  isSearched = false;
  isLoaded = false;
  query = "";
  resultsNumber = 10;
  listOfSearchIDs = [];
  searchProgress = "";

  listOfAcronyms = [];
  listOfAcronymsDuplicates = [];
  acronymListFromDatabase;
  insertObject;
  listOfSearchResults = [];
  listOfDisplayResults = [];

  searchButtonText = "SEARCH";
  startIndex = 1;

  fetchStep = 400;

  listOfAbstracts = [];

  page: number = 1;
  maxSize: number = 10;
  paginationConfig: PaginationInstance = {
    id: 'search',
    itemsPerPage: 10,
    currentPage: 1
  };
  labels: any = {
    previousLabel: 'Previous',
    nextLabel: 'Next',
    screenReaderPaginationLabel: 'Pagination',
    screenReaderPageLabel: 'page',
    screenReaderCurrentLabel: `You're on page`
  };

  onPageChange(number: number) {
    this.paginationConfig.currentPage = number;
    console.log("Page changed to: ", number);
  }

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
    this.dataSource = null;

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

        let title = dataRes.result[stepIDsList[j]].title;
        if (title == '') {
          title = 'Undefined Title';
        }
        let journal = dataRes.result[stepIDsList[j]].fulljournalname;
        if (journal == '') {
          journal = 'Undefined Journal';
        }

        let singleEntry = {
          "id": stepIDsList[j],
          "title": title,
          "journal": journal,
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

        // split abstract into sentences
        let tokenizer = new Tokenizer();
        tokenizer.setEntry(abstract);
        let sentences = tokenizer.getSentences();

        for (let k = 0; k < sentences.length; k++) {
          sentences[k] = this.abstractProcessingService.tagAcronymsSense(sentences[k], singleAcronymList);
        }

        //console.log(sentences);

        let singleAbstract = {
          "title": title,
          "journal": journal,
          "pubdate": pubdate,
          "authors": authors,
          "pubmed_id": stepIDsList[j],
          "text": abstract,
          "sentences": sentences,
          "acronyms": abstractAcronyms
        };
        this.listOfAbstracts.push(singleAbstract);
      }
    }
    // generate sense inventory table
    this.searchProgress = "Generating Sense Inventory";
    
    let listOfAcronymsTable = [];
    for (let i = 0; i < this.listOfAcronyms.length; i++) {
      let frequency = 0;
      // count the amount of times acronym mentioned
      for (let j = 0; j < this.listOfAcronymsDuplicates.length; j++) {
        if (this.listOfAcronyms[i].shortform == this.listOfAcronymsDuplicates[j].shortform) {
          frequency++;
        }
      }
      let singleEntry = {
        "acronym": this.listOfAcronyms[i].shortform,
        "sense": this.listOfAcronyms[i].longform,
        "cui": 'XXXXXX',
        "frequency": frequency
      }
      listOfAcronymsTable.push(singleEntry);
    }
    console.log("1");
    this.dataSource = new MatTableDataSource<senseInventory>(listOfAcronymsTable);
    this.changeDetectorRef.detectChanges();
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (item, property): string | number => {
      switch(property) {
        case 'acronym': return item.acronym;
        case 'sense': return item.sense;
        case 'cui': return item.cui;
        case 'frequency': return item.frequency;
        default: return item[property];
      }
    };
    //console.log(this.dataSource);
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

      // split abstract into sentences
      let tokenizer = new Tokenizer();
      tokenizer.setEntry(loadResult[i].text);
      let sentences = tokenizer.getSentences();

      for (let k = 0; k < sentences.length; k++) {
        sentences[k] = this.abstractProcessingService.tagAcronymsSense(sentences[k], singleAcronymList);
      }

      let singleAbstract = {
        "title": loadResult[i].title,
        "journal": loadResult[i].journal,
        "pubdate": loadResult[i].pubdate,
        "authors": authors,
        "pubmed_id": loadResult[i].pubmed_id,
        "text": loadResult[i].text,
        "sentences": sentences,
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

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
}
