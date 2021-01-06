const fs = require('fs');
const xml2js = require('xml2js');
const path = require('path');

//read file
let file = fs.readFileSync(path.join(__dirname, 'pubmed21n0001.xml'));

xml2js.parseStringPromise(file, { mergeAttrs: true }).then(function (result) {
    fs.writeFileSync(path.join(__dirname,'result.json'), JSON.stringify(result, null, 2));
});


