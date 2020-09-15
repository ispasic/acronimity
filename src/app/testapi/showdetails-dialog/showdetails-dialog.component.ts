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
    status;
    isAbstractFormed = false;
    isNoAcronyms = false;
    isTagged = false;
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
    }

    async getAbstractByID(id) {
      const result = await this.pubmedService.getAbstractByID(id).toPromise().catch(error => console.log(error));
      return result;
    }

    swapAcronymsClick(): void{
      this.abstract = this.swapAcronyms(this.abstract, this.detailsAcronymList);
    }

    tagAcronymsClick(): void{
      if (!this.isTagged) {
        this.abstract = this.tagAcronyms(this.abstract, this.detailsAcronymList);
        this.isTagged = true;
      }
      else {
        this.status = 'Text is already tagged';
      }

    }

    swapAcronyms(text: string, acronymList: any[]): string {

      let swapText = text;

      swapText = swapText.replace(/\n/g, " "); //swap all endlines by spaces
      swapText = swapText.replace(/\u00A0/g, " "); //swap all non-breaking spaces by spaces

      for (let acronym of acronymList)
      {
        swapText = this.replaceAll(swapText, acronym.shortform, acronym.longform + "TEMP");
        swapText = this.replaceAll(swapText, acronym.longform, acronym.shortform);
        swapText = this.replaceAll(swapText, acronym.shortform + "TEMP", acronym.longform);
      }

      return swapText;
    }

    tagAcronyms(text: string, acronymList: any[]): string {

      let taggedText = text;
      
      taggedText = taggedText.replace(/\n/g, " "); //swap all endlines by spaces
      taggedText = taggedText.replace(/\u00A0/g, " "); //swap all non-breaking spaces by spaces

      for (let acronym of acronymList)
      {
        taggedText = this.replaceAll(taggedText, acronym.shortform, "<shortform>" + acronym.shortform +"</shortform>");
        taggedText = this.replaceAll(taggedText, acronym.longform, "<longform>" + acronym.longform +"</longform>");
      }

      return taggedText;
    }

    private replaceAll(str, find: string, replace: string) {
      return str.replace(new RegExp(find, 'gi'), replace);
    }

    async insertAcronym(shortform, longform) {
      const result = await this.acronymsDatabaseService.insertAcronym(shortform, longform).toPromise().catch(error => console.log(error));
      return result;
    }

    

}
