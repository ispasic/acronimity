import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { PubmedService } from '../../services/pubmed.service';
import { AcronymService } from '../../services/acronym.service';
import { AcronymsDatabaseService } from '../../services/acronyms-database.service';

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
    private acronymsDatabaseService: AcronymsDatabaseService) { }

    abstract;
    isAbstractFormed = false;
    isNoAcronyms = false;
    insertObject;

    detailsAcronymList = [];

    onNoClick(): void {
      this.dialogRef.close();
    }

    downloadDetailsClick(): void {
      var blob = new Blob([this.abstract], {type: "text/plain;charset=utf-8"});
      FileSaver.saveAs(blob, this.data.title + ".txt");
    }

    async insertAcronymsClick(): Promise<void> {
      for (var a of this.detailsAcronymList)
      {
        this.insertObject = await this.insertAcronym(a.shortform, a.longform);
        console.log(this.insertObject);
      }
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

    ngOnDestroy() {
      if(this.insertObject) this.insertObject.unsubscribe();
    }

    async getAbstractByID(id) {
      const result = await this.pubmedService.getAbstractByID(id).toPromise().catch(error => console.log(error));
      return result;
    }

    swapAcronymsClick(): void{
      this.abstract = this.swapAcronyms(this.abstract, this.detailsAcronymList);
    }

    swapAcronyms(text: string, acronymList: any[]): string {

      let swapText = text;

      for (let acronym of acronymList)
      {
        swapText = this.replaceAll(swapText, acronym.shortform, acronym.longform + "TEMP");
        swapText = this.replaceAll(swapText, acronym.longform, acronym.shortform);
        swapText = this.replaceAll(swapText, acronym.shortform + "TEMP", acronym.longform);
        //console.log("Replaced 1 ", acronym);
      }

      return swapText;
    }

    private replaceAll(str, find: string, replace: string) {
      return str.replace(new RegExp(find, 'g'), replace);
    }

    async insertAcronym(shortform, longform) {
      const result = await this.acronymsDatabaseService.insertAcronym(shortform, longform).toPromise().catch(error => console.log(error));
      return result;
    }

    

}
