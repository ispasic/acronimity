import { Component, OnInit } from '@angular/core';
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
  isCaptchaResolved = false;

  constructor(private router: Router) {}

  startButtonClick(): void {
    this.isStarted = true;
  }

  resetApp(): void {
    this.isStarted = false;
    this.isCaptchaResolved = false;
  }

  // captcha resolve function
  public resolved(captchaResponse: string) { 
    this.isCaptchaResolved = true;
    // console.log(`Resolved captcha with response: ${captchaResponse}`); // Write your logic here about once human verified what action you want to perform 
  }

}
