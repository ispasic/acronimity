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
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { ShowdetailsDialogComponent } from './showdetails-dialog/showdetails-dialog.component';
import { ShowacronymsDialogComponent } from './showacronyms-dialog/showacronyms-dialog.component';

import * as FileSaver from 'file-saver';
import * as JSZip from 'jszip';

import Tokenizer from "../../../node_modules/sentence-tokenizer/lib/tokenizer"
import { environment } from './../../environments/environment';

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
    private changeDetectorRef: ChangeDetectorRef,
    private http: HttpClient) { }

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

  // captcha settings
  isCaptchaResolved = false;
  captchaSiteKey = environment.captchaSiteKey;

  // global lists
  listOfSearchResults = [];
  listOfSearchIDs = [];
  listOfAcronyms = [];
  listOfAcronymsDuplicates = [];
  listOfAbstracts = [];

  // texts abstracts found
  foundAbstractsNumber: number = 0;
  foundTextsNumber: number = 0;

  // test object for inserting
  insertObject;

  // CUIs found
  apiCUIs: number = 0; //overall CUIs found
  foundCUIs: number = 0; //meaningful CUIs found
  areCUIsBeingFound = false;
  allCUIsFound = false;
  cuiProgress = '';

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

  // captcha resolve function
  public resolved(captchaResponse: string) { 
    this.isCaptchaResolved = true;
    // console.log(`Resolved captcha with response: ${captchaResponse}`); // Write your logic here about once human verified what action you want to perform 
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
    this.cuiProgress = '';

    this.foundAbstractsNumber = 0;
    this.foundTextsNumber = 0;

    // unsubscribe
    this.notifier.next();

    // check if query and number of results provided
    if (!query || !number) {
      this.searchProgress = "Search parameters cannot be empty.";
      return;
    } 

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

    // validate tgt first
    let validateResult = await this.UmlsService.validateTgt();

    // get the basic data for each result
    await this.getBasicDataResults(this.listOfSearchIDs);

    //get acronyms from each abstract one by one
    await this.getAcronymsFromAbstracts(this.listOfSearchIDs);

    // search is done
    this.isSearched = true;
    this.searchProgress = '';
    // null and reset captcha
    this.isCaptchaResolved = false;
    grecaptcha.reset();

    // console.log(this.listOfSearchResults);
    // console.log(this.listOfAbstracts);
    
    if (validateResult.stasus == "fail") {
      this.cuiProgress = 'Error occured while searching CUIs. Please reload the application and try again. If the error persists, contact the developers. Sorry for the inconvenience.';
      return;
    } else {
      // small sleep before starting find of all cuis
      await this.sleep(3000);
      this.findAllCUIs();
    }

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
          singleAcronymList[k].pubmed_id = stepIDsList[j];
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
        let sentencesOriginal = tokenizer.getSentences();

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
          "original_abstract": sentencesOriginal,
          "edited_abstract": sentences,
          "acronyms": listOfAbstractAcronyms
          //"acronymMentionsTotal": acronymMentions
        };
        this.listOfAbstracts.push(singleAbstract);
      }
    }

    // trim list of search results and list of abstracts of entries with no abstract if necessary
    // this.deleteResultsWithNoAbstract();

    // find number of abstracts
    for (let i = 0; i < this.listOfAbstracts.length; i++) {
      let ab = this.listOfAbstracts[i];
      if (ab.text.length != 0) {
        this.foundAbstractsNumber++;
      }
    }

    // number of texts
    this.foundTextsNumber = this.listOfSearchResults.length;

    // generate sense inventory table
    let listOfAcronymsTable = this.generateSenseInventory();
    this.generateSenseInventoryTable(listOfAcronymsTable);

    // generate summary sense tables
    this.generateSenseInventorySummaries(listOfAcronymsTable);
  }

  deleteResultsWithNoAbstract() {
    // cycle through list of abstracts and find those with no text
    for (let i = 0; i < this.listOfAbstracts.length; i++) {
      if (this.listOfAbstracts[i].text == '') {
        // find same id in list of search results
        for (let j = 0; j < this.listOfSearchResults.length; j++) {
          if (this.listOfSearchResults[j].id == this.listOfAbstracts[i].pubmed_id) {
            // found needed one, delete both and adjust index
            this.listOfAbstracts.splice(i, 1);
            this.listOfSearchResults.splice(j, 1);
            // adjust index
            i--;
            j--;
          }
        }
      }
    }
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

        // cycle through the list of abstract and find if abstract has same acronym-sense combination
        for (let j = 0; j < this.listOfAbstracts.length; j++) {
          let abstractHasAcronymSense = false;
          for (let k = 0; k < this.listOfAbstracts[j].acronyms.length; k++) {
            let acronym = this.listOfAbstracts[j].acronyms[k];
            // found the same acronym-sense combination in the abstract
            if (acronym.shortform == item.shortform && acronym.longform == item.longform) {
              abstractHasAcronymSense = true;
              break;
            }
          }
          // if abstract has same acronym-sense combination, count acronyms based on Regex
          if (abstractHasAcronymSense) {
            frequency = frequency + this.abstractProcessingService.countAcronym(this.listOfAbstracts[j].text, item.shortform);
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
    for (let i = 0; i < Math.min(10, listOfAcronymsTable.length); i++) {
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
        // if all cuis found
        if (this.apiCUIs == listOfAcronymsTable.length) {
          this.allCUIsFound = true;
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

    //console.log(this.dataSource.data);

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
      {"measure": "Long forms", "value": sensesTotal.toFixed(0)},
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
      {"measure": "Long forms per acronym", "value": sensesPerAcronym.toFixed(3)},
      {"measure": "CUIs per acronym", "value": cuisPerAcronym.toFixed(3)},
      {"measure": "Acronym mentions per document", "value": acronymMentionsPerDocument.toFixed(3)}
    ];
    this.senseInventoryAverage = new MatTableDataSource<senseInventorySummary>(senseInventoryAverageData);
    this.changeDetectorRef.detectChanges();
    this.searchProgress = "Sense inventory totals and averages calculated.";
  }

  //download all abstracts from results as single file
  async downloadClick(): Promise<void> {
    // download abstracts and sense inventory
    let downloadJson = {
      "abstracts": [],
      "inventory": {
        "data": [],
        "total": {},
        "average": {}
      }
    };
    downloadJson.abstracts = JSON.parse(JSON.stringify(this.listOfAbstracts));
    downloadJson.inventory.data = JSON.parse(JSON.stringify(this.dataSource.data));
    downloadJson.inventory.total = {
      "acronyms": Number(this.senseInventoryTotal.data[0].value),
      "senses": Number(this.senseInventoryTotal.data[1].value),
      "cuis": Number(this.senseInventoryTotal.data[2].value.toString()),
      "acronymMentions": Number(this.senseInventoryTotal.data[3].value),
    }
    downloadJson.inventory.average = {
      "acronymsPerDocument": Number(this.senseInventoryAverage.data[0].value),
      "sensesPerAcronym": Number(this.senseInventoryAverage.data[1].value),
      "cuisPerAcronym": Number(this.senseInventoryAverage.data[2].value),
      "acronymMentionsPerDocument": Number(this.senseInventoryAverage.data[3].value),
    }

    // cut text field and add CUIs
    for (let i = 0; i < downloadJson.abstracts.length; i++) {
      delete downloadJson.abstracts[i]["text"];
      for (let j = 0; j < downloadJson.abstracts[i].acronyms.length; j++) {
        let acr = downloadJson.abstracts[i].acronyms[j];
        // find that acronym in sense inventory
        let isCuiFound = false;
        for (let k = 0; k < downloadJson.inventory.data.length; k++) {
          let acrInv = downloadJson.inventory.data[k];
          // compare and if found then assigne cui
          if (acr.shortform.toLowerCase().localeCompare(acrInv.acronym.toLowerCase()) == 0 && acr.longform.toLowerCase().localeCompare(acrInv.sense.toLowerCase()) == 0) {
            downloadJson.abstracts[i].acronyms[j].cui = acrInv.cui;
            isCuiFound = true;
            break;
          }
        }
        // if nothing found, just NONE
        if (!isCuiFound) {
          downloadJson.abstracts[i].acronyms[j].cui = "NONE"
        }
      }
    }

    // create archive before download
    var archive = new JSZip();
    archive.file("corpus.json", new Blob([JSON.stringify(downloadJson, null, 2)], {type: "text/plain;charset=utf-8"}));
    let readmeFile;
    readmeFile = await this.http.get('assets/ReadMe.txt', {responseType: 'text'}).toPromise().catch(error => console.log(error));
    archive.file("ReadMe.txt", readmeFile);
    let schemaFile;
    schemaFile = await this.http.get('assets/schema.json', {responseType: 'json'}).toPromise().catch(error => console.log(error));
    archive.file("schema.json", new Blob([JSON.stringify(schemaFile, null, 2)], {type: "text/plain;charset=utf-8"}));
    let pythonFile;
    pythonFile = await this.http.get('assets/randomise.py', {responseType: 'text'}).toPromise().catch(error => console.log(error));
    archive.file("randomise.py", pythonFile);
    //generate archive and download
    archive.generateAsync({ type: 'blob' }).then(function(content) {
      // see FileSaver.js
      FileSaver.saveAs(content, 'data.zip');
    });

    // download
    // var blob = new Blob([JSON.stringify(downloadJson, null, 2)], {type: "text/plain;charset=utf-8"});
    // FileSaver.saveAs(blob, "Corpus.json");

    // // download only abstracts
    // var blob = new Blob([JSON.stringify(this.listOfAbstracts, null, 2)], {type: "text/plain;charset=utf-8"});
    // FileSaver.saveAs(blob, "Abstracts.json");
  }

   //download all abstracts from results as single file
   async downloadSenseInventoryClick(): Promise<void> {
    // download sense inventory
    let senseInventory = {
        "data": [],
        "total": {},
        "average": {}
    };
    senseInventory.data = JSON.parse(JSON.stringify(this.dataSource.data));
    senseInventory.total = {
      "acronyms": this.senseInventoryTotal.data[0].value,
      "senses": this.senseInventoryTotal.data[1].value,
      "cuis": this.senseInventoryTotal.data[2].value.toString(),
      "acronymMentions": this.senseInventoryTotal.data[3].value,
    }
    senseInventory.average = {
      "acronymsPerDocument": this.senseInventoryAverage.data[0].value,
      "sensesPerAcronym": this.senseInventoryAverage.data[1].value,
      "cuisPerAcronym": this.senseInventoryAverage.data[2].value,
      "acronymMentionsPerDocument": this.senseInventoryAverage.data[3].value,
    }
    var blob = new Blob([JSON.stringify(senseInventory, null, 2)], {type: "text/plain;charset=utf-8"});
    FileSaver.saveAs(blob, "Sense_Inventory.json");
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
    this.cuiProgress = 'Please be patient. The download button will be activated once all data have been processed.';
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
            this.cuiProgress = '';
            // if consume is needed, start the function. If not - comment that
            this.consumeSameCUIs();
          }
        });
      }
    }
  }

  // if the same CUI then the one with higher frequency consumes the other ones
  consumeSameCUIs(): void {
    let ds = this.dataSource.data; //copy data for processing
    ds.sort((a, b) => (a.cui > b.cui) ? 1 : -1); //sort the copied data by CUI

    // go over the data
    for (let i = 1; i < ds.length; i++) {
      if (ds[i].cui != 'SEARCHING' && ds[i].cui != 'NONE') { // skip not found CUIs
        if (ds[i].cui == ds[i-1].cui && ds[i].acronym == ds[i-1].acronym) { // if same CUI and Acronym
          //console.log(`Same cuis. ${i-1}: ${ds[i-1].cui}. ${i}: ${ds[i].cui}`);
          if (ds[i].frequency >= ds[i-1].frequency) { // find which one has higher frequency, consume that frequency
            ds[i].frequency = ds[i].frequency + ds[i-1].frequency;
            //console.log(`Consumed acronym ${ds[i-1].acronym} with sense ${ds[i-1].sense}, ${ds[i-1].cui} and frequency ${ds[i-1].frequency}`);
            //console.log(`Consumer: acronym ${ds[i].acronym} with sense ${ds[i].sense}, ${ds[i].cui} and frequency ${ds[i].frequency}`)
            ds.splice(i-1, 1); // delete the one with lower frequency
            i--;
          } else {
            ds[i-1].frequency = ds[i-1].frequency + ds[i].frequency;
            //console.log(`Consumed acronym ${ds[i].acronym} with sense ${ds[i].sense}, ${ds[i].cui} and frequency ${ds[i].frequency}`);
            //console.log(`Consumer: acronym ${ds[i-1].acronym} with sense ${ds[i-1].sense}, ${ds[i-1].cui} and frequency ${ds[i-1].frequency}`)
            ds.splice(i, 1);
            i--;
          }
          this.apiCUIs--;
          //console.log(`dataset length after consumption: ${ds.length}`);
        }
      }
    }
    ds.sort((a, b) => (a.acronym > b.acronym) ? 1: -1); // sort data by name again
    this.dataSource.data = ds; // refresh the table with new data

    this.updateCutSenseInventory();
  }

  // update senseInventory after cutting
  updateCutSenseInventory() {
    // update totals
    // total number of acronyms not changed (deleted only same acronym-cui pairs)
    // total number of sense is the length data
    this.senseInventoryTotal.data[1].value = this.dataSource.data.length;
    // total number of meaningful cuis not changed (deleted only same acronym-cui pairs)
    // total number of mentions is not changed (initial dataset is not changed)

    // update averages
    // acronyms per document not changed (deleted only same aconym-cui pairs;
    // senses per acronym
    this.senseInventoryAverage.data[1].value = (this.senseInventoryTotal.data[1].value / this.senseInventoryTotal.data[0].value).toFixed(3);
    // cuis per acronym
    // acronym mentions per document not changed  (deleted only same aconym-cui pairs;
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
        singleAcronymList[j].pubmed_id = loadResult[i].pubmed_id;
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

    // small sleep before starting find of all cuis
    await this.sleep(2000);
    this.findAllCUIs();

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
  
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
