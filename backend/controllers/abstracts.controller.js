//connection to multiple databases
const abstractsCollection = require("../schemas").abstractModel;

//retrieve a specified abstract from the database
exports.findAbstractById = (req, res) => {
    const pubmed_id = req.query.pubmed_id;
    var condition = { "pubmed_id": pubmed_id };

    abstractsCollection.find(condition)
        .then(data => {
            if (data.length != 0) {
                console.log(`Found a record by ID ${pubmed_id}`);
            } else {
                console.log(`No record with id ${pubmed_id}`);
            }
            res.send(data);
        })
        .catch(err => {
            res.status(500).send({
                message:
                    err.message || "Some error occurred while retrieving abstract."
            });
        });
};

//retrieve a specified abstract from the database
exports.findAllAbstracts = (req, res) => {
    abstractsCollection.find()
        .then(data => {
            console.log(`Got all abstracts from the database.`);
            res.send(data);
        })
        .catch(err => {
            res.status(500).send({
                message:
                    err.message || "Some error occurred while retrieving abstracts."
            });
        });
};

//count number of abstracts
exports.countAbstracts = (req, res) => {
    abstractsCollection.countDocuments()
        .then(data => {
            console.log("Number of documents = ", data); 
            //create JSON with count data  
            var count = { 
                "count": data,
            };
            res.send(count);
        })
        .catch(err => {
            res.status(500).send({
                message:
                    err.message || "Some error occurred while counting abstracts."
            });
        });
};

//add an entry to mongodb
exports.addOneAbstract = async (req, res) => {
    //if empty ID
    if (!req.body.pubmed_id)
    {
        res.status(400).send({ message: "ID can not be empty!" });
        return;
    }

    var currentDate = new Date();

    console.log("Adding a new entity to search history. Date and time: ", currentDate);

    //check if same entry already in the database
    var condition = { "pubmed_id": req.body.pubmed_id };
    var findRes;
    await abstractsCollection.find(condition).then(data => {
        findRes = data;
    });

    //if entry is already in the database
    if (findRes.length != 0)
    {
        console.log("Same entry already exists in the database with pubmed_id = ", entry.searchId);
        res.status(400).send({ message: "Same entry already exists in the database!" });
        return;
    }

    //if no such entry already in the database

    //create entry of data model
    const entry = new abstractsCollection({
        pubmed_id: req.body.pubmed_id,
        title: req.body.title,
        journal: req.body.journal,
        pubdate: req.body.pubdate,
        authors: req.body.authors,
        text: req.body.text,
        sentences: req.body.sentences,
        acronyms: req.body.acronyms,
        acronymMentions: req.body.acronymMentions
    });

    //save to database
    entry.save(entry)
        .then(data => {
            console.log("Added a new entry to the abstracts database with pubmed_id = ", entry.pubmed_id);
            res.send(data);
        })
        .catch(err => {
            res.status(500).send({
            message:
                err.message || "Some error occurred while adding the entry."
            });
        });
};

exports.addMultipleAbstracts = async (req, res) => {

    //check if empty body
    if (!req.body || req.body.length == 0)
    {
        res.status(400).send({ message: "Content cannot be empty!" });
        return;
    }

    var numAdded = 0;
    var numFailed = 0;

    var currentDate = new Date();

    console.log("Adding some entities. Total number: ", req.body.length);
    console.log("Date and time: ", currentDate);

    //cycle through entries in the request body
    for (var inputEntry of req.body)
    {
        //console.log("inputEntry = ", inputEntry);
        //if not empty entry and entry is correct
        if (inputEntry.id)
        {
            //check if same entry already in the database
            var condition = { "pubmed_id": inputEntry.pubmed_id };
            var findRes;
            await abstractsCollection.find(condition).then(data => {
                findRes = data;
            });

            //if the entry is in the database
            if (findRes.length != 0)
            {
                numFailed++;
                console.log("Same entry already exists in the database with pubmed_id = ", inputEntry.pubmed_id);
            }

            //if the entry is not present in the database and correct format
            else
            {
                //create entry of data model
                const entry = new abstractsCollection({
                    pubmed_id: inputEntry.pubmed_id,
                    title: inputEntry.title,
                    journal: inputEntry.journal,
                    pubdate: inputEntry.pubdate,
                    authors: inputEntry.authors,
                    text: inputEntry.text,
                    sentences: inputEntry.sentences,
                    acronyms: inputEntry.acronyms,
                    acronymMentions: inputEntry.acronymMentions
                });

                //save to database
                await entry.save(entry)
                    .then(data => {
                        console.log("Added a new entry to the database with pubmed_id = ", inputEntry.pubmed_id);
                    })
                    .catch(err => {
                        res.status(500).send({
                        message:
                            err.message || "Some error occurred while adding one of the entries."
                        });
                    });
                numAdded++;
            }
        }
        //if something wrong with the entry
        else
        {
            numFailed++;
            console.log("Entry is not correct to be added to the database");
        }
        
    }

    //form result with quantity of entries added/failed
    var result = {
        message: "Added " + numAdded + " entry(s)" + " and failed adding " + numFailed + " entry(s)",
    }
    //console.log(result);

    //send result
    res.send(result);
};

// delete an abstract by ID
exports.deleteAbstractById = (req, res) => {
    const pubmed_id = req.query.pubmed_id;
    var condition = { "pubmed_id": pubmed_id };

    searchHistoryCollection.find(condition)
        .then(data => {
            if(data.length == 0) {
                console.log("No record with pubmed_id = ", pubmed_id);
                res.status(400).send({ message: "No record with specified pubmed_id "});
                return;
            }
            else
            {
                console.log("Found a record with pubmed_id = ", pubmed_id);
                searchHistoryCollection.deleteOne(condition, function(err, result) {
                    if (err) {
                        res.status(500).send({
                            message:
                                err.message || "Some error occurred while deleting abstract entry."
                        });
                    }
                    else {
                        console.log("Deleted an entry with pubmed_id = ", pubmed_id);
                        res.send(result);
                    }
                });
            }
        })
}