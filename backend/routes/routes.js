module.exports = app => {
    const abstracts = require("../controllers/abstracts.controller.js");
    const umls = require("../controllers/umls.controller.js");

    var router = require("express").Router();

    //Retrieve an abstract by ID
    router.get("/abstracts/findById", abstracts.findAbstractById);

    //Retrieve an abstract by ID
    router.get("/abstracts/findAll", abstracts.findAllAbstracts);

    //Count Abstracts
    router.get("/abstracts/count", abstracts.countAbstracts);

    //Insert one Abstract
    router.post("/abstracts/addOne", abstracts.addOneAbstract);

    //Add multiple Abstracts
    router.post("/abstracts/addMultiple", abstracts.addMultipleAbstracts);

    //delete by ID
    router.delete("/abstracts/deleteById", abstracts.deleteAbstractById);

    // acquire TGT from database
    router.get("/umls/getTgt", umls.getTgt);

    // add TGT to database
    router.post("/umls/addTgt", umls.addTgt);

    // delete TGT from database
    router.post("/umls/deleteTgt", umls.deleteTgt);

    app.use("/", router);
}