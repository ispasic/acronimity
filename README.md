# Acronimity

Global acronyms are used in written text without their formal definitions. This makes it difficult to
automatically interpret their sense as acronyms tend to be ambiguous. Supervised machine learning approaches to
sense disambiguation require large training datasets. In clinical applications, large datasets are difficult to
obtain due to patient privacy. Manual data annotation creates an additional bottleneck. This application
automatically modifies PubMed abstracts to simulate global acronym usage and annotate their senses
without the need for external sources or manual intervention. It can be used to create large datasets that in
turn can be used to train supervised approaches to word sense disambiguation of biomedical acronyms.

To create an annotated corpus, start by providing a search query that describes a specific area of interest. The
matching abstracts will be downloaded from PubMed automatically. Each abstract will be modified so that for each
acronym it defines, either its full form or the acronym itself is used consistently throughout the abstract.
This choice between the two is random. When an acronym is retained, its full form is used as its sense
annotation. Once the corpus has been processed, it can be downloaded together with the sense inventory in a
simple JSON format ready to be processed locally by other natural language processing applications.

## Application

The application is written using MEAN stack (http://meanjs.org/)

Due to limitations associated with the use of PubMed and UMLS APIs, we recommend installing the application
locally and using your own API keys if you plan to use the application frequently or to generate a large
dataset.

Demo is accessible on https://datainnovation.cardiff.ac.uk/acronyms/

## Set Up
The following will install the npm packages according to the configuration:
#### `npm install`

## Development server/Run the application locally

Run `npm start` for a dev frontend server and `node server.js` for backend server from separate consoles.
Navigate to `http://localhost:4203/`.
The app will automatically reload if you change any of the source files.

## Build

The following will build the production version of the applicaion:
#### `npm run build`
The following will run the production version of the application:
#### `node server.js`

## Mongodb connection

MongoDB is used to store and access the ticket granting ticket (TGT) for UMLS service. Please ensure to create an `acronyms` database with `umls` empty collection.

Use the following command to create a "Time to Live" (TTL) index on the collection using the following command:
#### `db.umls.createIndex( { "createdAt": 1 }, { expireAfterSeconds: 25000 } )`
That will ensure that TGT deletes itself from the database in order for the app to acquire a new one as TGT expires in 8 hours.

## Environment Variables
To make use of all the APIs and mongoDB connection, you need to provide API Keys and mongoDB user settings in `.env` file in the source directory.
The variables required:

- For Pubmed API: `PUBMED_API_KEY`
- For UMLS: `UMLS_API_KEY`
- For MongoDB Connection: `MONGODB_USER` and `MONGODB_USER_PASSWORD`

Please refer to https://www.ncbi.nlm.nih.gov/home/develop/api/ in order to acquire PubMed database API key.

Please refer to https://documentation.uts.nlm.nih.gov/rest/authentication.html in order to acquire UMLS API key.

Additionally, if the intention is to run the application not locally, you need to register the application/domain at Google reCaptcha service (https://www.google.com/recaptcha/). Please provide an additional enviromental variable in that case: `CAPTCHA_SITE_KEY`. If that variable is not provided, a default value of the site key is used that works only for local environment.

## Authors
- Maxim Filimonov
- Irena Spasić

School of Computer Science & Informatics, Cardiff University
