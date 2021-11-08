import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { PubmedService } from '../../services/pubmed.service';
import { AcronymService } from '../../services/acronym.service';
import { AcronymsDatabaseService } from '../../services/acronyms-database.service';
import { AbstractProcessingService } from '../../services/abstract-processing.service';
import { MongodbService } from '../../services/mongodb.service';

import * as FileSaver from 'file-saver';

import Tokenizer from "../../../../node_modules/sentence-tokenizer/lib/tokenizer"

@Component({
  selector: 'app-showdetails-dialog',
  templateUrl: './showdetails-dialog.component.html',
  styleUrls: ['./showdetails-dialog.component.css']
})
export class ShowdetailsDialogComponent {

  constructor(public dialogRef: MatDialogRef<ShowdetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private pubmedService: PubmedService,
    private acronymService: AcronymService,
    private acronymsDatabaseService: AcronymsDatabaseService,
    private abstractProcessingService: AbstractProcessingService,
    private mongodbService: MongodbService) { }

    abstractRes;
    status;
    abstractOriginal;
    abstractProcessed;
    isAbstractFormed = false;
    isNoAcronyms = false;
    isTagged = false;
    isSwapped = false;
    insertObject;

    detailsAcronymList = [];
    detailsAbstractList = [];

    onNoClick(): void {
      this.dialogRef.close();
    }

    async ngOnInit() {
      //get abstract with pubmed query
      this.abstractRes = await this.getAbstractByID(this.data.id, 0);
      this.isAbstractFormed = true;
      // get basic data from API
      // let basicData = await this.getBasicDataByID(this.data.id, 0);
      // var title = basicData.result[this.data.id].title;
      // var journal = basicData.result[this.data.id].fulljournalname;
      // var pubdate = basicData.result[this.data.id].pubdate;
      // var authors = basicData.result[this.data.id].authors;
      // get basic data from passed info into the dialog
      var title = this.data.title;
      var journal = this.data.fulljournalname;
      var pubdate = this.data.pubdate;
      var authors = this.data.authors;

      // find an abstract and cut it into separate substring
      let abIndexStart = this.abstractRes.indexOf('AB  - ');
      let abIndexEnd = 0;

      if (this.abstractRes.indexOf('CI  - ') == -1) {
        abIndexEnd = this.abstractRes.indexOf('FAU - ');
      } else if (this.abstractRes.indexOf('FAU - ') == -1) {
        abIndexEnd = this.abstractRes.indexOf('CI  - ');
      } else if (this.abstractRes.indexOf('CI  - ') - abIndexStart < this.abstractRes.indexOf('FAU - ') - abIndexStart) {
        abIndexEnd = this.abstractRes.indexOf('CI  - ');
      } else {
        abIndexEnd = this.abstractRes.indexOf('FAU - ');
      }

      // get the abstract for acronyms search
      let abstract = '';
      if (abIndexStart < abIndexEnd) {
        abstract = this.abstractRes.substring(abIndexStart + 6, abIndexEnd);
      }
      abstract = abstract.replace(/\s{2,}/g,' '); //swap all multiple spaces with spaces

      this.abstractOriginal = abstract;

      //form acronym list
      this.detailsAcronymList.length = 0;
      this.detailsAcronymList = this.acronymService.getAcronymList(abstract);
      //if no acronyms
      if (this.detailsAcronymList.length == 0)
      {
        this.isNoAcronyms = true;
      }

      //swap long<->short in abstract
      let swapText = this.abstractProcessingService.swapAcronyms(abstract, this.detailsAcronymList);
      let tagText = this.abstractProcessingService.tagAcronyms(abstract, this.detailsAcronymList);

      for (let i = 0; i < this.detailsAcronymList.length; i++)
      {
        this.detailsAcronymList[i].swapText = swapText;
        this.detailsAcronymList[i].tagText = tagText;
        this.detailsAcronymList[i].pubmed_id = this.data.id;
        this.detailsAcronymList[i].title = title;
        this.detailsAcronymList[i].journal = journal;
        this.detailsAcronymList[i].authors = authors;
        this.detailsAcronymList[i].pubdate = pubdate;
      }

      // form abstract with sentences and acronyms

      // form list of acronyms without additional info
      let abstractAcronyms = [];
      for (let k = 0; k < this.detailsAcronymList.length; k++) {
        let singlePair = {
          "shortform": this.detailsAcronymList[k].shortform,
          "longform": this.detailsAcronymList[k].longform
        };
        abstractAcronyms.push(singlePair);
      }

      // split abstract into sentences
      let tokenizer = new Tokenizer();
      tokenizer.setEntry(abstract);
      let sentences = tokenizer.getSentences();

      for (let k = 0; k < sentences.length; k++) {
        sentences[k] = this.abstractProcessingService.tagAcronymsSense(sentences[k], this.detailsAcronymList);
        if (k == 0) {
          this.abstractProcessed = sentences[k];
        } else if (k == sentences.length - 1) {
          this.abstractProcessed = this.abstractProcessed + sentences[k];
        } else {
          this.abstractProcessed = this.abstractProcessed + sentences[k] + " ";
        }

      }

      let abstractWithInfo = {
        "title": title,
        "journal": journal,
        "pubdate": pubdate,
        "authors": authors,
        "pubmed_id": this.data.id,
        "text": abstract,
        "sentences": sentences,
        "acronyms": abstractAcronyms
      };
      this.detailsAbstractList.push(abstractWithInfo);

      console.log("Acronym List: ", this.detailsAcronymList);
      console.log("Abstract with all info: ", this.detailsAbstractList);
    }

    // connection to pubmed service api
    async getAbstractByID(id, start) {
      await this.sleep(500);
      const result = await this.pubmedService.getAbstractByID(id, start).toPromise().catch(error => console.log(error));
      return result;
    }

    async getBasicDataByID(id, start) {
      await this.sleep(500);
      const res = await this.pubmedService.getBasicDataByID(id, start).toPromise().catch(error => console.log(error));
      return res;
    }

    ngOnDestroy() {
    }

    // download abstract as json
    downloadDetailsClick(): void {
      var blob = new Blob([JSON.stringify(this.detailsAbstractList, null, 2)], {type: "text/plain;charset=utf-8"});
      FileSaver.saveAs(blob, "Abstract.json");
    }

    // insert acronyms into mysql
    async insertAcronymsClick(): Promise<void> {
      for (var acronym of this.detailsAcronymList)
      {
        this.insertObject = await this.insertAcronym(acronym);
        console.log(this.insertObject);
      }
    }

    async insertAcronym(acronym) {
      const result = await this.acronymsDatabaseService.insertAcronym(acronym).toPromise().catch(error => console.log(error));
      return result;
    }

    // abstract processing service
    swapAcronymsClick(): void{
      if (!this.isSwapped) {
        this.abstractRes = this.abstractProcessingService.swapAcronyms(this.abstractRes, this.detailsAcronymList);
        this.isSwapped = true;
      }
      else {
        this.status = 'Acronyms already swapped';
      }
      
    }

    tagAcronymsClick(): void{
      if (!this.isTagged) {
        this.abstractRes = this.abstractProcessingService.tagAcronyms(this.abstractRes, this.detailsAcronymList);
        this.isTagged = true;
      }
      else {
        this.status = 'Text is already tagged';
      }

    }

    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    // mongodb abstract insert implementation
    async insertAbstractClick(): Promise<void> {
      this.insertObject = await this.insertAbstractMongoDB(this.detailsAbstractList[0]);
      console.log(this.insertObject);
    }

    async insertAbstractMongoDB(abstract) {
      const result = await this.mongodbService.addOneAbstract(abstract).toPromise().catch(error => console.log(error));
      return result;
    }
}
