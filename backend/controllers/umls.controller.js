//connection to multiple databases
const umlsCollection = require("../schemas").umlsModel;

//retrieve a tgt from the database
exports.getTgt = (req, res) => {
    umlsCollection.find()
        .then(data => {
            //console.log(`Got tgt from the database.`);
            res.send(data);
        })
        .catch(err => {
            res.status(500).send({
                message:
                    err.message || "Some error occurred while retrieving tgt."
            });
        });
};

// delete a tgt from the database
exports.deleteTgt = (req, res) => {
    umlsCollection.deleteMany({})
        .then(data => {
            console.log(`Deleted tgt from the database.`);
            res.send(data);
        })
        .catch(err => {
            res.status(500).send({
                message:
                    err.message || "Some error occurred while deleting tgt."
            });
        });
};

//add an entry to mongodb
exports.addTgt = async (req, res) => {
    //if empty ID
    if (!req.body.tgt)
    {
        res.status(400).send({ message: "tgt can not be empty!" });
        return;
    }

    // set currentDate in order to then set the expiring Index
    // expiring index is done by creating an index on the umls collection
    // db.umls.createIndex( { "createdAt": 1 }, { "expireAfterSeconds": X } );
    let currentDate = new Date();

    console.log("Adding a new tgt to database. Date and time: ", currentDate);

    //create entry of data model
    const entry = new umlsCollection({
        tgt: req.body.tgt,
        createdAt: currentDate
    });

    //save to database
    entry.save(entry)
        .then(data => {
            console.log("Added a new tgt to the database = ", entry.tgt);
            res.send(data);
        })
        .catch(err => {
            res.status(500).send({
            message:
                err.message || "Some error occurred while adding the tgt."
            });
        });
};