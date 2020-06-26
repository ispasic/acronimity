const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const events = require('./events');

const connection = mysql.createConnection(
    {
        host: 'localhost',
        user: 'acronyms',
        password: '-3GN^35-Ft8w?6wc',
        database: 'acronyms'
    }
);

connection.connect();

const port = process.env.PORT || 8083;

const app = express()
    .use(cors())
    .use(bodyParser.json())
    .use(events(connection));

app.listen(port, () => {
    console.log(`Express server listening on port ${port}`);
})