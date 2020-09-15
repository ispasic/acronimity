import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { PubmedService } from '../../services/pubmed.service';
import { AcronymService } from '../../services/acronym.service';
import { AcronymsDatabaseService } from '../../services/acronyms-database.service';
import { AbstractProcessingService } from '../../services/abstract-processing.service';

import * as FileSaver from 'file-saver';

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
    private abstractProcessingService: AbstractProcessingService) { }

    abstract;
    status;
    isAbstractFormed = false;
    isNoAcronyms = false;
    isTagged = false;
    isSwapped = false;
    insertObject;

    detailsAcronymList = [];

    onNoClick(): void {
      this.dialogRef.close();
    }

    async ngOnInit() {
      //get abstract with pubmed query
      this.abstract = await this.getAbstractByID(this.data.id);
      this.isAbstractFormed = true;

      //form acronym list
      this.detailsAcronymList.length = 0;
      this.detailsAcronymList = this.acronymService.getAcronymList(this.abstract);
      //if no acronyms
      if (this.detailsAcronymList.length == 0)
      {
        this.isNoAcronyms = true;
      }

      //swap long<->short in abstract
      let swapText = this.abstractProcessingService.swapAcronyms(this.abstract, this.detailsAcronymList);
      let tagText = this.abstractProcessingService.tagAcronyms(this.abstract, this.detailsAcronymList);
      for (let i = 0; i < this.detailsAcronymList.length; i++)
      {
        this.detailsAcronymList[i].swapText = swapText;
        this.detailsAcronymList[i].tagText = tagText;
      }
      console.log("Acronym List: ", this.detailsAcronymList);
    }

    async getAbstractByID(id) {
      const result = await this.pubmedService.getAbstractByID(id).toPromise().catch(error => console.log(error));
      return result;
    }

    ngOnDestroy() {
    }

    downloadDetailsClick(): void {
      var blob = new Blob([this.abstract], {type: "text/plain;charset=utf-8"});
      FileSaver.saveAs(blob, this.data.title + ".txt");
    }

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

    swapAcronymsClick(): void{
      if (!this.isSwapped) {
        this.abstract = this.abstractProcessingService.swapAcronyms(this.abstract, this.detailsAcronymList);
        this.isSwapped = true;
      }
      else {
        this.status = 'Acronyms already swapped';
      }
      
    }

    tagAcronymsClick(): void{
      if (!this.isTagged) {
        this.abstract = this.abstractProcessingService.tagAcronyms(this.abstract, this.detailsAcronymList);
        this.isTagged = true;
      }
      else {
        this.status = 'Text is already tagged';
      }

    }



}
