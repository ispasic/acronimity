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
    insertObject;

    detailsAcronymList = [];

    onNoClick(): void {
      this.dialogRef.close();
    }

    async ngOnInit() {
      this.abstract = await this.getAbstractByID(this.data.id);
      this.isAbstractFormed = true;

      this.detailsAcronymList.length = 0;
      this.detailsAcronymList = this.acronymService.getAcronymList(this.abstract);
      if (this.detailsAcronymList.length == 0)
      {
        this.isNoAcronyms = true;
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
      for (var a of this.detailsAcronymList)
      {
        this.insertObject = await this.insertAcronym(a.shortform, a.longform, a.text);
        console.log(this.insertObject);
      }
    }

    async insertAcronym(shortform, longform, text) {
      const result = await this.acronymsDatabaseService.insertAcronym(shortform, longform, text).toPromise().catch(error => console.log(error));
      return result;
    }

    swapAcronymsClick(): void{
      this.abstract = this.abstractProcessingService.swapAcronyms(this.abstract, this.detailsAcronymList);
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
