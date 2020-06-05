const express = require('express');

function createRouter(db) {
    const router = express.Router();
    const owner = '';

    //router will be here

    router.post('/insertAcronym', (req, res, next) => {
        
        //check if empty query
        if (req.query.longform.length == 0 || req.query.shortform.length == 0)
        {
            let msg = 'Empty shortform or longform';
            res.status(500).json({
                status: 'ok',
                message: msg
            });
            return;
        }

        //check if shortform is already in database
        db.query(
            'SELECT shortform, longform FROM lexicon WHERE shortform=?',
            [req.query.shortform],
            (error, results) => {
                if (error) {
                    console.error(error);
                    res.status(500).json({status: 'error'});
                } else if (results.length != 0) {
                    let msg = 'this shortform is already in the database';
                    res.status(500).json({
                        status: 'error',
                        message: msg
                    });
                } else { //valid acronym for insertion
                    db.query(
                        'INSERT INTO lexicon (shortform, longform) VALUES (?,?)',
                        [req.query.shortform, req.query.longform],
                        (error) => {
                            if (error) {
                                console.log(req.query.shortform);
                                console.error(error);
                                res.status(500).json({status: 'error'});
                            } else {
                                let msg = 'inserted new acronym with shortform: ' + req.query.shortform + ' and longform: ' + req.query.longform;
                                res.status(200).json({
                                    status: 'ok',
                                    message: msg
                                });
                            }
                        }
                    );
                }
            }
        );
    });

    router.post('/updateAcronym', (req, res, next) => {
        
        //check if empty request
        if (req.query.longform.length == 0 || req.query.shortform.length == 0)
        {
            let msg = 'Empty shortform or longform';
            res.status(500).json({
                status: 'ok',
                message: msg
            });
            return;
        }
        
        //check if there is an acronym with shortfrom from request
        db.query(
            'SELECT shortform FROM lexicon WHERE shortform=?',
            [req.query.shortform],
            (error, results) => {
                if (error) {
                    console.error(error);
                    res.status(500).json({status: 'error'});
                } else if (results.length == '0') {
                        let msg = 'No acronym with requested shortform';
                        res.status(500).json({
                            status: 'ok',
                            message: msg
                        });

                } else { //update acronym according to request
                    db.query(
                        'UPDATE lexicon SET longform=? WHERE shortform=?',
                        [req.query.longform, req.query.shortform],
                        (error) => {
                            if (error) {
                                console.error(error);
                                res.status(500).json({status: 'error'});
                            } else {
                                let msg = 'updated acronym with shortform: ' + req.query.shortform + ' and longform: ' + req.query.longform;
                                res.status(200).json({
                                    status: 'ok',
                                    message: msg
                                });
                            }
                        }
                    );
                }
            }
        );     
    });

    router.get('/getAcronymByShort', function(req, res, next) {

        //check if empty request
        if (req.query.shortform.length == 0)
        {
            let msg = 'Empty shortform in request';
            res.status(500).json({
                status: 'error',
                message: msg
            });
            return;
        }

        db.query(
            'SELECT shortform, longform FROM lexicon WHERE shortform=?',
            [req.query.shortform],
            (error, results) => {
                if (error) {
                    console.error(error);
                    res.status(500).json({status: 'error'});
                } else if (results.length == 0) {
                    let msg = 'No acronym with requested shortform';
                    res.status(500).json({
                        status: 'ok',
                        message: msg
                    });
                } else {
                    res.status(200).json(results);
                }
            }
        );
    });

    router.get('/getAcronymByLong', function(req, res, next) {
        
        //check if empty request
        if (req.query.longform.length == 0)
        {
            let msg = 'Empty longform in request';
            res.status(500).json({
                status: 'error',
                message: msg
            });
            return;
        }
        
        db.query(
            'SELECT shortform, longform FROM lexicon WHERE longform=?',
            [req.query.longform],
            (error, results) => {
                if (error) {
                    console.error(error);
                    res.status(500).json({status: 'error'});
                } else if (results.length == 0) {
                    let msg = 'No acronym with requested longform';
                    res.status(500).json({
                        status: 'ok',
                        message: msg
                    });
                } else {
                    res.status(200).json(results);
                }
            }
        );
    });

    router.get('/getAllAcronyms', (req, res, next) => {
        db.query(
            'SELECT * FROM lexicon',
            (error, results) => {
                if(error) {
                    console.log(error);
                    res.status(500).json({status: 'error'});
                } else {
                    res.status(200).json(results);
                }
            }
        );
    });


    return router;
}

module.exports = createRouter;