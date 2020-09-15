const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const util = require( 'util' );
const events = require('./backend/events');

dbConfig = 
{
    host: 'localhost',
    user: 'acronyms',
    password: '-3GN^35-Ft8w?6wc',
    database: 'acronyms'
};

//ordinary connection to mysql for callbacks only
//const connection = mysql.createConnection(dbConfig);
//connection.connect();

//promisified connection to mysql for async/await
function makeDb( config ) {
  const connection = mysql.createConnection( config );
  return {
    query( sql, args ) {
      return util.promisify( connection.query )
        .call( connection, sql, args );
    },
    close() {
      return util.promisify( connection.end ).call( connection );
    }
  };
}
const connection = makeDb( dbConfig );


const port = process.env.PORT || 8083;

const app = express()
    .use(cors())
    .use(bodyParser.json())
    .use(events(connection));

// Create link to Angular build directory
var distDir = "./dist/pubmedapis/";
app.use(express.static(distDir));

app.all("/*", function(req, res, next) {
    res.sendFile("index.html", { root: distDir });
});

app.listen(port, () => {
    console.log(`Express server listening on port ${port}`);
})