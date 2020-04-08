import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { PubmedService } from '../../services/pubmed.service';
import { AcronymService } from '../../services/acronym.service';

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
    private acronymService: AcronymService) { }

    abstract;
    isAbstractFormed = false;

    acronymList: string[][] = [];

    onNoClick(): void {
      this.dialogRef.close();
    }

    downloadDetailsClick(): void {
      var blob = new Blob([this.abstract], {type: "text/plain;charset=utf-8"});
      FileSaver.saveAs(blob, this.data.title + ".txt");
    }

    async ngOnInit() {
      //console.log(this.data);
      this.abstract = await this.getAbstractByID(this.data.id);
      //console.log("Abstract: ", this.abstract);
      this.isAbstractFormed = true;

      this.acronymList.length = 0;
      this.acronymList = this.acronymService.getAcronymList(this.abstract);
      console.log("Acronym List: ", this.acronymList);
    }

    async getAbstractByID(id) {
      const result = await this.pubmedService.getAbstractByID(id).toPromise();
      return result;
    }

    swapAcronymsClick(): void{
      this.abstract = this.swapAcronyms(this.abstract, this.acronymList);
    }

    swapAcronyms(text: string, acronymList: string[][]): string {

      let swapText = text;

      for (let acronym of acronymList)
      {
        swapText = this.replaceAll(swapText, acronym[0], acronym[1] + "TEMP");
        swapText = this.replaceAll(swapText, acronym[1], acronym[0]);
        swapText = this.replaceAll(swapText, acronym[0] + "TEMP", acronym[1]);
        console.log("Replaced 1 ", acronym);
      }

      return swapText;
    }

    private replaceAll(str, find: string, replace: string) {
      return str.replace(new RegExp(find, 'g'), replace);
    }

    

}
