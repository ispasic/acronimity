import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { TestapiComponent} from "./testapi/testapi.component";


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'pubmedapis';

  isStarted = false;

  constructor(private router: Router) {}

  startButtonClick(): void {
    this.isStarted = true;
  }

  resetApp(): void {
    this.isStarted = false;
  }
}
