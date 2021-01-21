// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  baseApiUrl: 'http://localhost:8083/',
  pubmedBaseUrl: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/",
  pubmedApiKey: "842007c31c1ec561c1d418abf9f279f21408",
  umlsBaseTicketUrl: "https://utslogin.nlm.nih.gov/cas/v1/",
  umlsBaseUrl: "https://uts-ws.nlm.nih.gov/rest/search/current",
  umlsApiKey: "83cf24e6-c28c-429d-82cd-86c6d563c6d4"
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
