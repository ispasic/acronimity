const dbConfig = require("../database/db.config.js");

const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true
};

const connAcronyms = mongoose.createConnection(dbConfig.urlAcronyms, options);

const models = {};
models.abstractModel = connAcronyms.model('abstracts', require('./abstracts.schema')(mongoose));
models.umlsModel = connAcronyms.model('umls', require('./umls.schema')(mongoose));

module.exports = models;