var express = require('express');
var router = express.Router();
var _ = require('lodash');
var common = require('./common');

// runs on all routes and checks password if one is setup
router.all('/document/*', common.checkLogin, function (req, res, next){
    next();
});

// Inserts a new document
router.post('/document/:conn/:db/:coll/insert_doc', function (req, res, next){
    var connection_list = req.app.locals.dbConnections;
    var ejson = require('mongodb-extended-json');

    // Check for existance of connection
    if(connection_list[req.params.conn] === undefined){
        res.status(400).json({'msg': req.i18n.__('Invalid connection name')});
    }

    // Validate database name
    if(req.params.db.indexOf(' ') > -1){
        res.status(400).json({'msg': req.i18n.__('Invalid database name')});
    }

    // Get DB form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    try{
        var eJsonData = ejson.parse(req.body.objectData);
    }catch(e){
        console.error('Syntax error: ' + e);
        res.status(400).json({'msg': req.i18n.__('Syntax error. Please check the syntax')});
        return;
    }

    // if it's like an array of documents, we "insertMany"
    if(_.isArrayLike(eJsonData) === true){
        mongo_db.collection(req.params.coll).insertMany(eJsonData, function (err, docs){
            if(err || docs.ops === undefined){
                console.error('Error inserting documents', err);
                res.status(400).json({'msg': req.i18n.__('Error inserting documents')});
            }else{
                // get the first inserted doc
                var dataReturn = '';
                if(docs.ops){
                    dataReturn = docs.ops[0]._id;
                }
                res.status(200).json({'msg': req.i18n.__('Documents successfully added'), 'doc_id': dataReturn});
            }
        });
    }else{
        // just the one document it seems so we call "save"
        mongo_db.collection(req.params.coll).save(eJsonData, function (err, docs){
            if(err || docs.ops === undefined){
                console.error('Error inserting document', err);
                res.status(400).json({'msg': req.i18n.__('Error inserting document')});
            }else{
                var dataReturn = '';
                if(docs.ops){
                    dataReturn = docs.ops[0]._id;
                }
                res.status(200).json({'msg': req.i18n.__('Document successfully added'), 'doc_id': dataReturn});
            }
        });
    }
});

// Edits/updates an existing document
router.post('/document/:conn/:db/:coll/edit_doc', function (req, res, next){
    var connection_list = req.app.locals.dbConnections;
    var ejson = require('mongodb-extended-json');

    // Check for existance of connection
    if(connection_list[req.params.conn] === undefined){
        res.status(400).json({'msg': req.i18n.__('Invalid connection name')});
    }

    // Validate database name
    if(req.params.db.indexOf(' ') > -1){
        res.status(400).json({'msg': req.i18n.__('Invalid database name')});
    }

    // Get DB's form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    try{
        var eJsonData = ejson.parse(req.body.objectData);
    }catch(e){
        console.error('Syntax error: ' + e);
        res.status(400).json({'msg': req.i18n.__('Syntax error. Please check the syntax')});
        return;
    }

    mongo_db.collection(req.params.coll).save(eJsonData, function (err, doc, lastErrorObject){
        if(err){
            console.error('Error updating document: ' + err);
            res.status(400).json({'msg': req.i18n.__('Error updating document') + ': ' + err});
        }else{
            if(doc['nModified'] === 0){
                console.error('Error updating document: Document ID is incorrect');
                res.status(400).json({'msg': req.i18n.__('Error updating document: Syntax error')});
            }else{
                res.status(200).json({'msg': req.i18n.__('Document successfully updated')});
            }
        }
    });
});

// Deletes a document or set of documents based on a query
router.post('/document/:conn/:db/:coll/mass_delete', function (req, res, next){
    var ejson = require('mongodb-extended-json');
    var connection_list = req.app.locals.dbConnections;

    // Check for existance of connection
    if(connection_list[req.params.conn] === undefined){
        res.status(400).json({'msg': req.i18n.__('Invalid connection name')});
    }

    // Validate database name
    if(req.params.db.indexOf(' ') > -1){
        res.status(400).json({'msg': req.i18n.__('Invalid database name')});
    }

    var query_obj = {};
    var validQuery = true;
    if(req.body.query){
        try{
            query_obj = ejson.parse(req.body.query);
        }catch(e){
            validQuery = false;
            query_obj = {};
        }
    }

    // Get DB's form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    if(validQuery){
        mongo_db.collection(req.params.coll).remove(query_obj, true, function (err, docs){
            if(err || docs.result.n === 0){
                console.error('Error deleting document(s): ' + err);
                res.status(400).json({'msg': req.i18n.__('Error deleting document(s)') + ': ' + req.i18n.__('Invalid query specified')});
            }else{
                res.status(200).json({'msg': req.i18n.__('Document(s) successfully deleted')});
            }
        });
    }else{
        res.status(400).json({'msg': req.i18n.__('Error deleting document(s)') + ': ' + req.i18n.__('Invalid query specified')});
    }
});

// Deletes a document
router.post('/document/:conn/:db/:coll/doc_delete', function (req, res, next){
    var connection_list = req.app.locals.dbConnections;

    // Check for existance of connection
    if(connection_list[req.params.conn] === undefined){
        res.status(400).json({'msg': req.i18n.__('Invalid connection name')});
    }

    // Validate database name
    if(req.params.db.indexOf(' ') > -1){
        res.status(400).json({'msg': req.i18n.__('Invalid database name')});
    }

    // Get DB's form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);
    common.get_id_type(mongo_db, req.params.coll, req.body.doc_id, function (err, result){
        if(result.doc){
            mongo_db.collection(req.params.coll).remove({_id: result.doc_id_type}, true, function (err, docs){
                if(err || docs.result.n === 0){
                    console.error('Error deleting document: ' + err);
                    res.status(400).json({'msg': req.i18n.__('Error deleting document') + ': ' + req.i18n.__('Cannot find document by Id')});
                }else{
                    res.status(200).json({'msg': req.i18n.__('Document successfully deleted')});
                }
            });
        }else{
            console.error('Error deleting document: ' + err);
            res.status(400).json({'msg': req.i18n.__('Cannot find document by Id')});
        }
    });
});

module.exports = router;
