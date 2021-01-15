module.exports = app => {
    const abstracts = require("../controllers/abstracts.controller.js");

    var router = require("express").Router();

    //Retrieve an abstract by ID
    router.get("/abstracts/findById", abstracts.findAbstractById);

    //Retrieve an abstract by ID
    router.get("/abstracts/findAll", abstracts.findAllAbstracts);

    //Count Abstracts
    router.get("abstracts/count", abstracts.countAbstracts);

    //Insert one Abstract
    router.post("/abstracts/addOne", abstracts.addOneAbstract);

    //Add multiple Abstracts
    router.post("/abstracts/addMultiple", abstracts.addMultipleAbstracts);

    //delete by ID
    router.delete("/abstracts/deleteById", abstracts.deleteAbstractById);

    app.use("/", router);
}