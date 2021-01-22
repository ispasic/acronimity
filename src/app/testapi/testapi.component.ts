import { ChangeDetectorRef, Component, OnInit, ViewChild, ViewChildren } from '@angular/core';
import { Router } from '@angular/router';
import { PubmedService } from '../services/pubmed.service';
import { AcronymService } from '../services/acronym.service';
import { AcronymsDatabaseService } from '../services/acronyms-database.service';
import { MongodbService } from '../services/mongodb.service';
import { AbstractProcessingService } from '../services/abstract-processing.service';
import { UmlsService } from '../services/umls.service';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortable } from '@angular/material/sort';

import { ShowdetailsDialogComponent } from './showdetails-dialog/showdetails-dialog.component';
import { ShowacronymsDialogComponent } from './showacronyms-dialog/showacronyms-dialog.component';

import * as FileSaver from 'file-saver';

import Tokenizer from "../../../node_modules/sentence-tokenizer/lib/tokenizer"

import { PaginationInstance } from 'ngx-pagination';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

//interface for sense inventory table
export interface senseInventory {
  "acronym": string,
  "sense": string,
  "cui": string,
  "frequency": string
};

export interface senseInventorySummary {
  "measure": string,
  "value": string
};

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
    private mongodbService: MongodbService,
    private abstractProcessingService: AbstractProcessingService,
    private UmlsService: UmlsService,
    private dialog: MatDialog,
    private changeDetectorRef: ChangeDetectorRef) { }

  // Sense Inventory Table declarations

  senseInventoryTotal = null;
  senseInventoryAverage = null;
  senseInventorySummaryColumns = ['measure', 'value'];

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

  // query parameters
  query = "";
  resultsNumber = 100;

  // variable buttons/texts
  mainButtonText = "SEARCH";
  searchProgress = "";

  // service booleans
  isTested = false;
  isSearched = false;
  isLoaded = false;

  // global lists
  listOfSearchResults = [];
  listOfSearchIDs = [];
  listOfAcronyms = [];
  listOfAcronymsDuplicates = [];
  listOfAbstracts = [];

  // test object for inserting
  insertObject;

  // CUIs found
  apiCUIs: number = 0; //overall CUIs found
  foundCUIs: number = 0; //meaningful CUIs found
  areCUIsBeingFound = false;
  allCUIsFound = false;

  // notifier that time to unsubscribe
  notifier = new Subject()

  // how many IDs are processed each time
  fetchStep = 400;

  // paginator settings
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

  // paginator page change function
  onPageChange(number: number) {
    this.paginationConfig.currentPage = number;
    //console.log("Page changed to: ", number);
  }

  // do on component initialise
  ngOnInit() {
  }

  // destroy the subscriptions on app closure
  ngOnDestroy() {
    this.dataSource.paginator.page.unsubscribe();
    this.dataSource.sort.sortChange.unsubscribe();
  }

  // main searchButtonClick
  async searchButtonClick(query, number): Promise<void> {

    // null previous results on new search

    this.listOfSearchIDs.length = 0;
    this.listOfSearchResults.length = 0;
    this.listOfAbstracts.length = 0;
    this.listOfAcronyms.length = 0;
    this.listOfAcronymsDuplicates.length = 0;
    this.isTested = true;
    this.isSearched = false;
    this.isLoaded = false;

    this.senseInventoryTotal = null;
    this.senseInventoryAverage = null;

    this.apiCUIs = 0;
    this.foundCUIs = 0;
    this.areCUIsBeingFound = false;
    this.allCUIsFound = false;

    // unsubscribe
    this.notifier.next();

    this.searchProgress = "Searching PubMed Database..";

    // search the database with an API call
    var searchResult = await this.searchDatabase(query, number);

    // if no search results
    if (searchResult.esearchresult.count == 0)
    {
      this.searchProgress = "The search yielded no results";
      return;
    }

    // form the list of IDs from search results
    for (let i = 0; i < searchResult.esearchresult.idlist.length; i++) {
      this.listOfSearchIDs.push(searchResult.esearchresult.idlist[i]);
    }

    // get the basic data for each result
    await this.getBasicDataResults(this.listOfSearchIDs);

    //get acronyms from each abstract one by one
    await this.getAcronymsFromAbstracts(this.listOfSearchIDs);

    // search is done
    this.isSearched = true;
    this.searchProgress = '';
  }

  async getBasicDataResults(listOfIDs): Promise<any> {

    let step = this.fetchStep;
    //get the number of steps needed (STEP each time)
    let number = Math.ceil(listOfIDs.length/step);

    // do searches/each step
    for (let i = 0; i < number; i++) {
      // form the list of IDs for this step
      let processed = 0; //how many IDs processed in this step
      let stepIDsParam = ''; // string with all IDs separeted by coma
      let stepIDsList = []; // list of those IDs

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

      // get all basic data for those IDs
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
      let processed = 0; //how many IDs processed in this step
      let stepIDsParam = ''; // string with all IDs separeted by coma
      let stepIDsList = []; // list of those IDs

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

        //form single acronym list from current abstract
        let singleAcronymList = this.acronymService.getAcronymList(abstract);

        // get extra information about abstract for acronym

        // find basic data for abstract from listOfSearchResults
        let title = '';
        let journal = '';
        let authors = [];
        let pubdate = '';

        // cycle through the list of search results to get the data
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

        // create list of abstracts
        // form list of acronyms without additional info (just pairs shortform - longform)
        let listOfAbstractAcronyms = [];
        for (let k = 0; k < singleAcronymList.length; k++) {
          let singlePair = {
            "shortform": singleAcronymList[k].shortform,
            "longform": singleAcronymList[k].longform
          };
          listOfAbstractAcronyms.push(singlePair);
        }

        // split abstract into sentences
        let tokenizer = new Tokenizer();
        tokenizer.setEntry(abstract);
        let sentences = tokenizer.getSentences();

        //let acronymMentions = 0;
        for (let k = 0; k < sentences.length; k++) {
          sentences[k] = this.abstractProcessingService.tagAcronymsSense(sentences[k], listOfAbstractAcronyms);
          // calculate how many times all acronyms are mentioned in the document overall
          //acronymMentions = acronymMentions + sentences[k].split('acronym sense').length - 1;
        }

        let singleAbstract = {
          "title": title,
          "journal": journal,
          "pubdate": pubdate,
          "authors": authors,
          "pubmed_id": stepIDsList[j],
          "text": abstract,
          "sentences": sentences,
          "acronyms": listOfAbstractAcronyms
          //"acronymMentionsTotal": acronymMentions
        };
        this.listOfAbstracts.push(singleAbstract);
      }
    }

    // generate sense inventory table
    let listOfAcronymsTable = this.generateSenseInventory();
    this.generateSenseInventoryTable(listOfAcronymsTable);

    // generate summary sense tables
    this.generateSenseInventorySummaries(listOfAcronymsTable);
  }

  generateSenseInventory(): any[] {
    this.searchProgress = "Generating sense inventory";
    
    // form a table of acronyms with needed fields
    let listOfAcronymsTable = [];
    for (let i = 0; i < this.listOfAcronymsDuplicates.length; i++) {
      // check if same shortform + longform is already listed
      let item = this.listOfAcronymsDuplicates[i];

      let isListed = false;
      for (let j = 0; j < listOfAcronymsTable.length; j++) {
        if (item.shortform == listOfAcronymsTable[j].acronym) {
          // found same shortform. Check if longform is the same
          if (item.longform == listOfAcronymsTable[j].sense) {
            // found exact same pair, no need to put it into sense inventory
            isListed = true;
            break;
          }
        }
      }
      // add to the table only if same acronym-sense pair is not listed
      if (!isListed) {
        // count the amount of times acronym mentioned
        let frequency = 0;

        // calculate frequency based on "total number of current acronym mentions per whole dataset"
        for (let j = 0; j < this.listOfAbstracts.length; j++) {
          for (let k = 0; k < this.listOfAbstracts[j].sentences.length; k++) {
            frequency = frequency + this.listOfAbstracts[j].sentences[k].split("sense='" + item.longform + "'>" + item.shortform + "<").length - 1;
          }
        }

        let singleEntry = {
          "acronym": item.shortform,
          "sense": item.longform,
          "cui": 'SEARCHING',
          "frequency": frequency
        }
        listOfAcronymsTable.push(singleEntry);
      }
    }
    this.searchProgress = "Sense inventory generated.";
    return listOfAcronymsTable;
  }

  async generateSenseInventoryTable(listOfAcronymsTable): Promise<void> {

    // generate TGT
    await this.UmlsService.getTgt();

    // sort the listOfAcronymsTable and assign first 10 CUIs
    listOfAcronymsTable.sort((a, b) => (a.acronym > b.acronym) ? 1 : -1);
    for (let i = 0; i < 10; i++) {
      // if (i == 0) {
      //   await this.sleep(1000);
      // }
      // sleep cause 20 api calls per second
      await this.sleep(50);
      this.UmlsService.findCUI(listOfAcronymsTable[i].sense).then(data => {
        // increase the number of overall found CUIs
        this.apiCUIs++;
        listOfAcronymsTable[i].cui = data.result.results[0].ui;
        // update the sense inventory total and average CUI values
        if (listOfAcronymsTable[i].cui != "NONE") {
          // increase the number of found meaningful CUIs
          this.foundCUIs++;
          // update the value in Sense Inventory Total and Average tables
          this.updateSenseInventoryCUIs();
        }
      });
    }

    // generate the main sense inventory
    this.dataSource = new MatTableDataSource<senseInventory>(listOfAcronymsTable);
    this.changeDetectorRef.detectChanges();
    // default sort
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

    // this.dataSource.paginator.page.unsubscribe();
    // this.dataSource.sort.sortChange.unsubscribe();
    // subscription to the paginator event in order to dynamically acquire CUI IDs
    this.dataSource.paginator.page
    .pipe(takeUntil(this.notifier))
    .subscribe((pageEvent: PageEvent) => {
      // acquire visible rows
      const startIndex = pageEvent.pageIndex * pageEvent.pageSize;
      const endIndex = startIndex + pageEvent.pageSize;
      let itemsShown = this.dataSource.filteredData.slice(startIndex, endIndex);
      // update CUIs of visible items
      this.updateVisibleCUIs(itemsShown);
    });
    // subscription to the sort even in order to dynamically acquire CUI IDs
    this.dataSource.sort.sortChange
    .pipe(takeUntil(this.notifier))
    .subscribe((sortChangeEvent: MatSort) => {
      // acquire visible rows
      const startIndex = this.dataSource.paginator.pageIndex * this.dataSource.paginator.pageSize;
      const endIndex = startIndex + this.dataSource.paginator.pageSize;
      let itemsShown = this.dataSource.sortData(this.dataSource.filteredData, sortChangeEvent).slice(startIndex, endIndex);
      // update CUIs of visible items
      this.updateVisibleCUIs(itemsShown);
    });
  }

  generateSenseInventorySummaries(listOfAcronymsTable): void {
    this.searchProgress = "Calculating sense inventory totals and averages.";
    // calculate totals
    // total number of acronyms is the length of the list of acronyms without duplicates
    let acronymsTotal = this.listOfAcronyms.length;
    // total number of sense is the length of the list of acronyms created for table that includes different senses of the same acronym
    let sensesTotal = listOfAcronymsTable.length;
    let cuisTotal = 0;
    // total number of mentions is just a sum of all acronymMentions of every abstract in the list of abstracts
    let acronymMentionsTotal = 0;
    // calculate based on whole dataset of sentences (better way)
    for (let i = 0; i < listOfAcronymsTable.length; i++) {
      acronymMentionsTotal = acronymMentionsTotal + listOfAcronymsTable[i].frequency;
    }
    // assign the table data
    let senseInventoryTotalData = [
      {"measure": "Acronyms", "value": acronymsTotal.toFixed(0)},
      {"measure": "Senses", "value": sensesTotal.toFixed(0)},
      {"measure": "CUIs", "value": cuisTotal.toFixed(0)},
      {"measure": "Acronym mentions", "value": acronymMentionsTotal.toFixed(0)}
    ];
    this.senseInventoryTotal = new MatTableDataSource<senseInventorySummary>(senseInventoryTotalData);
    this.changeDetectorRef.detectChanges();

    // calculate averages
    // acronyms per document
    let acronymsPerDocument = this.listOfAcronymsDuplicates.length/this.listOfAbstracts.length;

    // senses per acronym
    let sensesPerAcronym = sensesTotal / acronymsTotal;

    // cuis per acronym
    let cuisPerAcronym = 0;

    // acronym mentions per document
    let acronymMentionsPerDocument = acronymMentionsTotal/this.listOfAbstracts.length;

    let senseInventoryAverageData = [
      {"measure": "Acronyms per document", "value": acronymsPerDocument.toFixed(3)},
      {"measure": "Senses per acronym", "value": sensesPerAcronym.toFixed(3)},
      {"measure": "CUIs per acronym", "value": cuisPerAcronym.toFixed(3)},
      {"measure": "Acronym mentions per document", "value": acronymMentionsPerDocument.toFixed(3)}
    ];
    this.senseInventoryAverage = new MatTableDataSource<senseInventorySummary>(senseInventoryAverageData);
    this.changeDetectorRef.detectChanges();
    this.searchProgress = "Sense inventory totals and averages calculated.";
  }

  //download all abstracts from results as single file
  async downloadAbstractsClick(): Promise<void> {
    // download abstracts and sense inventory
    let downloadJson = {
      "abstracts": [],
      "senseInventory": {
        "data": [],
        "total": {},
        "average": {}
      }
    };
    downloadJson.abstracts = JSON.parse(JSON.stringify(this.listOfAbstracts));
    downloadJson.senseInventory.data = JSON.parse(JSON.stringify(this.dataSource.data));
    downloadJson.senseInventory.total = {
      "acronyms": this.senseInventoryTotal.data[0].value,
      "senses": this.senseInventoryTotal.data[1].value,
      "cuis": this.senseInventoryTotal.data[2].value.toString(),
      "acronymMnetions": this.senseInventoryTotal.data[3].value,
    }
    downloadJson.senseInventory.average = {
      "acronymsPerDocument": this.senseInventoryAverage.data[0].value,
      "sensesPerAcronym": this.senseInventoryAverage.data[1].value,
      "cuisPerAcronym": this.senseInventoryAverage.data[2].value,
      "acronymMnetionsPerDocument": this.senseInventoryAverage.data[3].value,
    }
    // download only abstracts
    var blob = new Blob([JSON.stringify(downloadJson, null, 2)], {type: "text/plain;charset=utf-8"});
    FileSaver.saveAs(blob, "Abstracts.json");

    // // download only abstracts
    // var blob = new Blob([JSON.stringify(this.listOfAbstracts, null, 2)], {type: "text/plain;charset=utf-8"});
    // FileSaver.saveAs(blob, "Abstracts.json");
  }

  openPubmedHelpClick() {
    let url = "https://pubmed.ncbi.nlm.nih.gov/help/";
    window.open(url, "_blank", "noopener");
  }

  //open details dialog
  async moreDetailsClick(entry): Promise<void> {
    const dialogRef = this.dialog.open(ShowdetailsDialogComponent, {
      data: entry
    });
  }

  // button to find all CUIs
  async findAllCUIs() {
    // start the process of CUIs find and show spinner
    this.areCUIsBeingFound = true;

    // cycle through all datasource items
    for (let item of this.dataSource.data) {
      // find only those that are not found
      if (item.cui == 'SEARCHING') {
        // sleep cause 20 api calls per second
        await this.sleep(50);
        this.UmlsService.findCUI(item.sense).then(data => {
          item.cui = data.result.results[0].ui;
          // add to number of found CUIs for progress spinner
          this.apiCUIs++;
          // add to meaningful CUIs
          if (item.cui != "NONE") {
            this.foundCUIs++;
          }
          this.updateSenseInventoryCUIs();
          // if found all hide spinner
          if (this.apiCUIs == this.dataSource.data.length) {
            this.areCUIsBeingFound = false;
            this.allCUIsFound = true;
          }
        });
      }
    }
  }

  // update number of CUIs in tables based on the amount of meaningful CUIs found
  updateSenseInventoryCUIs() {
    if (this.senseInventoryTotal) {
      this.senseInventoryTotal.data[2].value = this.foundCUIs;
    }
    if (this.senseInventoryAverage) {
      this.senseInventoryAverage.data[2].value = (this.foundCUIs / this.senseInventoryTotal.data[0].value).toFixed(3);
    }
  }

  // update visible CUIs in list from subscriptions
  async updateVisibleCUIs(itemsShown): Promise<void> {
    for (let item of itemsShown) {
      if (item.cui == 'SEARCHING') {
        // sleep cause 20 api calls per second
        await this.sleep(50);
        // increase the number of found CUIs
        this.UmlsService.findCUI(item.sense).then(data => {
          this.apiCUIs++;
          item.cui = data.result.results[0].ui;
          // update the sense inventory total and average CUI values
          if (item.cui != "NONE") {
            this.foundCUIs++;
            this.updateSenseInventoryCUIs();
          }
          if (this.apiCUIs == this.dataSource.data.length) {
            this.allCUIsFound = true;
          }
        });
      }
    }
  }

  // get progress for a spinner
  getCUIProgressValue() {
    if (this.dataSource) {
      return ((this.apiCUIs / this.dataSource.data.length) * 100);
    } else {
      return 0;
    }
  }

  navigateCUI(cui) {
    let url = "https://uts.nlm.nih.gov/uts/umls/searchResults?searchString=" + cui;
    window.open(url, "_blank", "noopener");
  }

  // show all acronyms in a separate dialog
  async showAllAcronymsClick(): Promise<void> {
    const dialogRef = this.dialog.open(ShowacronymsDialogComponent, {
      data: this.listOfAcronyms
    });
  }

  // mongodb database connection

  //load mongodb database
  async showDatabaseMongoClick(): Promise<void> {
    //null results
    this.listOfSearchIDs.length = 0;
    this.listOfSearchResults.length = 0;
    this.listOfAcronyms.length = 0;
    this.listOfAcronymsDuplicates.length = 0;
    this.listOfAbstracts.length = 0;
    this.isTested = true;
    this.isSearched = false;
    this.isLoaded = false;
    this.dataSource = null;

    this.senseInventoryTotal = null;
    this.senseInventoryAverage = null;

    this.apiCUIs = 0;
    this.foundCUIs = 0;
    this.areCUIsBeingFound = false;
    this.allCUIsFound = false;

    // unsubscribe
    this.notifier.next();

    this.searchProgress = "Loading MongoDB Database..";

    // get all saved info from MongoDB
    const abstracts = await this.getAllAbstractMongoDB();
    var loadResult = JSON.parse(JSON.stringify(abstracts));

    // if no data in database
    if (loadResult.length == 0)
    {
      this.searchProgress = "No data in the database";
      return;
    }

    // form list of search Results
    for (let i = 0; i < loadResult.length; i++) {
      //form single entry for display

      let authors = loadResult[i].authors;
      let displayAuthors = this.formDisplayAuthors(authors);

      var singleEntry = {
        "id": loadResult[i].pubmed_id,
        "title": loadResult[i].title,
        "journal": loadResult[i].journal,
        "pubdate": loadResult[i].pubdate,
        "authors": authors,
        "displayauthors": displayAuthors
      }
      this.listOfSearchResults.push(singleEntry);
      this.listOfSearchIDs.push(loadResult[i].pubmed_id);

      // push acronyms from these abstracts to lists
      // single acronym list deep copy of loadresult acronyms list
      let singleAcronymList = JSON.parse(JSON.stringify(loadResult[i].acronyms));

      for (let j = 0; j < singleAcronymList.length; j++)
      {
        singleAcronymList[j].pubMedId = loadResult[i].pubmed_id;
        singleAcronymList[j].title = loadResult[i].title;
        singleAcronymList[j].journal = loadResult[i].journal;
        singleAcronymList[j].authors = loadResult[i].authors;
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

      // add to the list of abstracts
      //loadResult[i].acronymMentionsTotal = Number(loadResult[i].acronymMentionsTotal);

      this.listOfAbstracts.push(loadResult[i]);
    }

    // generate sense inventory table
    let listOfAcronymsTable = this.generateSenseInventory();
    this.generateSenseInventoryTable(listOfAcronymsTable);

    // generate summary sense tables
    this.generateSenseInventorySummaries(listOfAcronymsTable);

    //load is done (so search is done as well)  
    this.isLoaded = true;
    this.isSearched = true;
    this.searchProgress = '';

    // console.log("List of loaded results: ", this.listOfSearchResults);
    // console.log("List of loaded IDs:", this.listOfSearchIDs);
    // console.log("Abstracts: ", this.listOfAbstracts);
    // console.log("Acronyms from abstracts: ", this.listOfAcronyms);
  }

  // function to connect to mongodb service
  async getAllAbstractMongoDB() {
    const result = await this.mongodbService.findAllAbstracts().toPromise().catch(error => console.log(error));
    return result;
  }

  async insertAbstractsMongodb(abstracts) {
    const result = await this.mongodbService.addMultipleAbstracts(abstracts).toPromise().catch(error => console.log(error));
    return result;
  }

  // button function to insert all processed abstracts into mongodb
  async insertAllAbstractsClick(): Promise<void> {
    this.insertObject = await this.insertAbstractsMongodb(this.listOfAbstracts);
    console.log("Insert Result: ", this.insertObject);
  }

  // pubmed database search implementation
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

  // form list of authors to display in search results
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

  // sense inventory table filter
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    const startIndex = this.dataSource.paginator.pageIndex * this.dataSource.paginator.pageSize;
    const endIndex = startIndex + this.dataSource.paginator.pageSize;
    let itemsShown = this.dataSource.filteredData.slice(startIndex, endIndex);
    this.updateVisibleCUIs(itemsShown);
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // old code

  // old download functions

  // download all search results as a single file
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

  // MySQL database connection

  // load mysql database
  async showDatabaseSQLClick(): Promise<void> {
    //null results
    this.listOfSearchIDs.length = 0;
    this.listOfSearchResults.length = 0;
    this.listOfAcronyms.length = 0;
    this.listOfAcronymsDuplicates.length = 0;
    this.listOfAbstracts.length = 0;
    this.isTested = true;
    this.isSearched = false;
    this.isLoaded = false;
    this.dataSource = null;

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

      // process abstract and add to the list of abstracts
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
      
      let acronymMentions = 0;
      for (let k = 0; k < sentences.length; k++) {
        sentences[k] = this.abstractProcessingService.tagAcronymsSense(sentences[k], singleAcronymList);
        acronymMentions = acronymMentions + sentences[k].split('acronym sense').length - 1;
      }

      let singleAbstract = {
        "title": loadResult[i].title,
        "journal": loadResult[i].journal,
        "pubdate": loadResult[i].pubdate,
        "authors": authors,
        "pubmed_id": loadResult[i].pubmed_id,
        "text": loadResult[i].text,
        "sentences": sentences,
        "acronyms": abstractAcronyms,
        "acronymMentions": acronymMentions
      };
      this.listOfAbstracts.push(singleAbstract);
    }

    // generate sense inventory table
    let listOfAcronymsTable = this.generateSenseInventory();
    this.generateSenseInventoryTable(listOfAcronymsTable);

    // generate summary sense tables
    this.generateSenseInventorySummaries(listOfAcronymsTable);

    //load is done (so search is done as well)  
    this.isLoaded = true;
    this.isSearched = true;
    this.searchProgress = '';

    console.log("List of loaded results: ", this.listOfSearchResults);
    console.log("List of loaded IDs:", this.listOfSearchIDs);
    console.log("Abstracts: ", this.listOfAbstracts);
    console.log("Acronyms from abstracts: ", this.listOfAcronyms);
  }

  // async functions for msyql
  async getAllAcronymsDatabase() {
    const result = await this.acronymsDatabaseService.getAllAcronyms().toPromise().catch(error => console.log(error));
    return result;
  }

  async getAllAbstractsDatabase() {
    const result = await this.acronymsDatabaseService.getAllAbstracts().toPromise().catch(error => console.log(error));
    console.log(result);
    return result;
  }
  
  async insertAcronym(acronym) {
    const result = await this.acronymsDatabaseService.insertAcronym(acronym).toPromise().catch(error => console.log(error));
    return result;
  }

  // get all acronyms and insert them into mysql database
  async insertAllAcronymsClick(): Promise<void> {
    //insert one by one
    for (var acronym of this.listOfAcronyms)
    {
      console.log("Insert acronym", acronym);
      this.insertObject = await this.insertAcronym(acronym);
      console.log(this.insertObject);
    }
  }


}
