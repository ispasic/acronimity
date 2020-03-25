import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { PubmedService } from '../../services/pubmed.service';

import * as FileSaver from 'file-saver';

@Component({
  selector: 'app-showdetails-dialog',
  templateUrl: './showdetails-dialog.component.html',
  styleUrls: ['./showdetails-dialog.component.css']
})
export class ShowdetailsDialogComponent {

  constructor(public dialogRef: MatDialogRef<ShowdetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private pubmedService: PubmedService) { }

    abstract;
    isAbstractFormed = false;

    onNoClick(): void {
      this.dialogRef.close();
    }

    downloadDetailsClick(): void {
      var blob = new Blob([this.abstract], {type: "text/plain;charset=utf-8"});
      FileSaver.saveAs(blob, this.data.title + ".txt");
    }

    async ngOnInit() {
      console.log(this.data);
      this.abstract = await this.getAbstractByID(this.data.id);
      console.log("Abstract: ", this.abstract);
      this.isAbstractFormed = true;
    }

    async getAbstractByID(id) {
      const result = await this.pubmedService.getAbstractByID(id).toPromise();
      return result;
    }

}
