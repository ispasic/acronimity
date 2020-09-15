import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { PubmedService } from '../../services/pubmed.service';
import { AcronymService } from '../../services/acronym.service';
import { AcronymsDatabaseService } from '../../services/acronyms-database.service';

import * as FileSaver from 'file-saver';

@Component({
  selector: 'app-showacronyms-dialog',
  templateUrl: './showacronyms-dialog.component.html',
  styleUrls: ['./showacronyms-dialog.component.css']
})
export class ShowacronymsDialogComponent implements OnInit {

  constructor(public dialogRef: MatDialogRef<ShowacronymsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private pubmedService: PubmedService,
    private acronymService: AcronymService,
    private acronymsDatabaseService: AcronymsDatabaseService) { }

  allAcronymList: [];
  insertObject;
  isNoAcronyms = false;

  ngOnInit(): void {
    this.allAcronymList = this.data;
    console.log("Acronyms in Dialog: ", this.allAcronymList);
    if (this.allAcronymList.length == 0)
      {
        this.isNoAcronyms = true;
      }
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  ngOnDestroy() {
  }

  downloadAcronymsClick(): void {
    var blob = new Blob([JSON.stringify(this.allAcronymList, null, '\t')], {type: "text/plain;charset=utf-8"});
    FileSaver.saveAs(blob, "Acronyms.txt");
  }

  async insertAcronymsClick(): Promise<void> {
    for (var a of this.data)
    {
      this.insertObject = await this.insertAcronym(a.shortform, a.longform, a.text);
      console.log(this.insertObject);
    }
  }

  async insertAcronym(shortform, longform, text) {
    const result = await this.acronymsDatabaseService.insertAcronym(shortform, longform, text).toPromise().catch(error => console.log(error));
    return result;
  }

}
