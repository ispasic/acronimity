const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// mongodb connection
const app = express();

var corsOptions = {
  origin: "http://localhost:4203"
};
app.use(cors(corsOptions));

// Create link to Angular build directory
var distDir = "./dist/pubmedapis/";
app.use(express.static(distDir));

//parse requests of content-type - application/json
app.use(bodyParser.json({
  limit: '50mb'
}));

//parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded( {
  limit: '50mb',
  parameterLimit: 100000,
  extended: true 
}));

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