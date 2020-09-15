const express = require('express');

function createRouter(db) {
    const router = express.Router();
    const owner = '';

    //router will be here

    router.post('/insertAcronym', async (req, res, next) => {

        //check if empty request
        if (!req.body.longform || !req.body.shortform || !req.body.text ||
            !req.body.swapText || !req.body.tagText || !req.body.pubMedId ||
            !req.body.title || !req.body.journal || !req.body.authors || !req.body.pubdate)
        {
            let msg = 'Not enough parameters in the request body';
            res.status(500).json({
                status: 'error',
                message: msg
            });
        }

        let shortform = req.body.shortform;
        let longform = req.body.longform;
        let text = req.body.text;
        let swapText = req.body.swapText;
        let tagText = req.body.tagText;
        let pubMedId = req.body.pubMedId;
        let title = req.body.title;
        let journal = req.body.journal
        let authors = req.body.authors;
        let pubdate = req.body.pubdate;

        try {
            //check if that abstract is already in database by pubMedId
            const checkAbstract = await db.query(
                'SELECT id FROM abstracts WHERE pubmed_id=?',
                [pubMedId]
            );

            //if in database, get its id
            if (checkAbstract.length > 0) {
                let msg = `abstract with ${pubMedId} is already in database`;
                console.log(msg);
                refId = checkAbstract[0].id;
            }
            //if not in database, insert it into it and get its id
            else {
                const insertAbstract = await db.query(
                    'INSERT INTO abstracts (text, swapText, tagText, pubmed_id, title, journal, authors, pubdate) VALUES (?,?,?,?,?,?,?,?)',
                    [text, swapText, tagText, pubMedId, title, journal, authors, pubdate]
                );
                refId = insertAbstract.insertId;
            }

            //check if that acronym is already in database
            const checkAcronym = await db.query(
                'SELECT shortform, longform FROM acronyms WHERE shortform=?',
                [shortform]
            );

            //if that acronym is already in database
            if (checkAcronym.length > 0) {
                let msg = `shortform ${shortform} is already in the database`;
                console.log(msg);
                throw msg;
            }
            else {
                const insertAcronym = await db.query(
                    'INSERT INTO acronyms (shortform, longform, abstract_id) VALUES (?,?,?)',
                    [shortform, longform, refId]
                )
                let msg = `inserted new acronym with shortform: ${shortform} and longform: ${longform}`;
                console.log(msg);
                res.status(200).json({
                    status: 'ok',
                    message: msg
                });
            }

        } catch (error) {
            res.status(500).send(error);
        }
    });

    router.get('/getAcronymByShort', async function(req, res, next) {

        //check if empty request
        if (!req.body.shortform)
        {
            let msg = 'Empty shortform';
            res.status(500).json({
                status: 'error',
                message: msg
            });
        }
        let shortform = req.body.shortform;

        try {
            const result = await db.query(
                'SELECT * FROM acronyms INNER JOIN abstracts ON acronyms.abstract_id=abstracts.id WHERE shortform=?',
                [shortform]
            )
            res.status(200).json(result);
        } catch (error) {
            res.status(500).send(error);
        }
    });

    router.get('/getAcronymByLong', async function(req, res, next) {

        //check if empty request
        if (!req.body.longform)
        {
            let msg = 'Empty longform';
            res.status(500).json({
                status: 'error',
                message: msg
            });
        }
        let longform = req.body.longform;

        try {
            const result = await db.query(
                'SELECT * FROM acronyms INNER JOIN abstracts ON acronyms.abstract_id=abstracts.id WHERE longform=?',
                [longform]
            )
            res.status(200).json(result);
        } catch (error) {
            res.status(500).send(error);
        }
    });

    router.get('/getAllAcronyms', async (req, res, next) => {
        try {
            const results = await db.query(
                'SELECT * FROM acronyms INNER JOIN abstracts ON acronyms.abstract_id=abstracts.id',
            )
            res.status(200).json(results);
        } catch (error) {
            res.status(500).send(error);
        }
    });


    //old implementation with callbacks


    router.post('/insertAcronymOld', (req, res, next) => {
        //check if empty request
        if (!req.body.longform || !req.body.shortform)
        {
            let msg = 'Empty shortform or longform';
            res.status(500).json({
                status: 'ok',
                message: msg
            });
            return;
        }

        let shortform = req.body.shortform;
        let longform = req.body.longform;

        //check if shortform is already in database
        db.query(
            'SELECT shortform, longform FROM acronyms WHERE shortform=?',
            [shortform],
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
                        'INSERT INTO acronyms (shortform, longform) VALUES (?,?)',
                        [shortform, longform],
                        (error) => {
                            if (error) {
                                console.log(shortform);
                                console.error(error);
                                res.status(500).json({status: 'error'});
                            } else {
                                let msg = `inserted new acronym with shortform: ${shortform} and longform: ${longform}`;
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

    router.get('/getAllAcronymsOld', (req, res, next) => {
        db.query(
            'SELECT * FROM acronyms',
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

    router.post('/updateAcronym', (req, res, next) => {

        //check if empty request
        if (!req.body.longform || !req.body.shortform)
        {
            let msg = 'Empty shortform or longform';
            res.status(500).json({
                status: 'ok',
                message: msg
            });
            return;
        }

        let shortform = req.body.shortform;
        let longform = req.body.longform;
        
        //check if there is an acronym with shortfrom from request
        db.query(
            'SELECT shortform FROM acronyms WHERE shortform=?',
            [shortform],
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
                        'UPDATE acronyms SET longform=? WHERE shortform=?',
                        [longform, shortform],
                        (error) => {
                            if (error) {
                                console.error(error);
                                res.status(500).json({status: 'error'});
                            } else {
                                let msg = `updated acronym with shortform: ${shortform} and longform: ${longform}`;
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

    router.get('/getAcronymByShortOld', function(req, res, next) {

        //check if empty request
        if (!req.body.shortform)
        {
            let msg = 'Empty shortform';
            res.status(500).json({
                status: 'ok',
                message: msg
            });
            return;
        }
        let shortform = req.body.shortform;

        db.query(
            'SELECT shortform, longform FROM acronyms WHERE shortform=?',
            [shortform],
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

    router.get('/getAcronymByLongOld', function(req, res, next) {
        
        //check if empty request
        if (!req.body.longform)
        {
            let msg = 'Empty longform';
            res.status(500).json({
                status: 'ok',
                message: msg
            });
            return;
        }
        let longform = req.body.longform;
        
        db.query(
            'SELECT shortform, longform FROM acronyms WHERE longform=?',
            [longform],
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


    return router;
}

module.exports = createRouter;