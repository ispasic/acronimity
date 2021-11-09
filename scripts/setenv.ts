const { writeFile } = require('fs');
const { argv } = require('yargs');

// read environment variables from .env file
require('dotenv').config();

// set baseApiUrl options
let baseApiUrlLocal = "http://localhost:8083/";
let baseApiUrlProd = "/acronyms";

// read the command line arguments passed with yargs
const environment = argv.environment;
const isProduction = environment === 'prod';
let baseApiUrl = '';
if (isProduction) {
   baseApiUrl = "/acronyms";
} else {
   baseApiUrl = "http://localhost:8083/";
}
console.log(baseApiUrl);
const targetPath = isProduction
   ? `./src/environments/environment.prod.ts`
   : `./src/environments/environment.ts`;
// we have access to our environment variables
// in the process.env object thanks to dotenv
const environmentFileContent = `
export const environment = {
   production: ${isProduction},
   baseApiUrl: "${baseApiUrl}",
   pubmedApiKey: "${process.env.PUBMED_API_KEY}",
   umlsApiKey: "${process.env.UMLS_API_KEY}"
};
`;
// write the content to the respective file
writeFile(targetPath, environmentFileContent, function (err) {
   if (err) {
      console.log(err);
   }
   console.log(`Wrote variables to ${targetPath}`);
});