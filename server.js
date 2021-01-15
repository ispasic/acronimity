const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// mysql database connection
// const mysql = require('mysql');
// const util = require( 'util' );
// const events = require('./backend/events');

// dbConfig = 
// {
//     host: 'localhost',
//     user: 'acronyms',
//     password: '-3GN^35-Ft8w?6wc',
//     database: 'acronyms'
// };

// //ordinary connection to mysql for callbacks only
// //const connection = mysql.createConnection(dbConfig);
// //connection.connect();

// //promisified connection to mysql for async/await
// function makeDb( config ) {
//   const connection = mysql.createConnection( config );
//   return {
//     query( sql, args ) {
//       return util.promisify( connection.query )
//         .call( connection, sql, args );
//     },
//     close() {
//       return util.promisify( connection.end ).call( connection );
//     }
//   };
// }
// const connection = makeDb( dbConfig );

// const app = express()
//     .use(events(connection));

const app = express();

var corsOptions = {
  origin: "http://localhost:4203"
};
app.use(cors(corsOptions));

// Create link to Angular build directory
var distDir = "./dist/pubmedapis/";
app.use(express.static(distDir));

//parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded( {extended: true }));

//parse requests of content-type - application/json
app.use(bodyParser.json());

//use routes
require("./backend/routes/routes")(app);
app.all("/*", function(req, res, next) {
    res.sendFile("index.html", { root: distDir });
});

//set port, listen for requests
const port = process.env.PORT || 8083;
app.listen(port, () => {
    console.log(`Express server listening on port ${port}`);
})