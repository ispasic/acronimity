import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from './../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  
  title = 'pubmedapis';

  isStarted = false;
  isCaptchaResolved = false;
  captchaSiteKey = environment.captchaSiteKey;
  
  constructor(private router: Router) {}

  startButtonClick(): void {
    this.isStarted = true;
  }

  resetApp(): void {
    this.isStarted = false;
    this.isCaptchaResolved = false;
    grecaptcha.reset();
  }

  // captcha resolve function
  public resolved(captchaResponse: string) { 
    this.isCaptchaResolved = true;
    //console.log(`Resolved captcha with response: ${captchaResponse}`); // Write your logic here about once human verified what action you want to perform 
  }

}
