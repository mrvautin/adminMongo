var express = require('express');
var router = express.Router();
var _ = require('lodash');
var common = require('./common');

// runs on all routes and checks password if one is setup
router.all('/db/*', common.checkLogin, function (req, res, next){
    next();
});

// create a new database
router.post('/database/:conn/db_create', function (req, res, next){
    var connection_list = req.app.locals.dbConnections;

    // Check for existance of connection
    if(connection_list[req.params.conn] === undefined){
        res.status(400).json({'msg': req.i18n.__('Invalid connection')});
        return;
    }

    // check for valid DB name
    if(req.body.db_name.indexOf(' ') >= 0 || req.body.db_name.indexOf('.') >= 0){
        res.status(400).json({'msg': req.i18n.__('Invalid database name')});
        return;
    }

    // Get DB form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.body.db_name);

    // adding a new collection to create the DB
    mongo_db.collection('test').save({}, function (err, docs){
        if(err){
            console.error('Error creating database: ' + err);
            res.status(400).json({'msg': req.i18n.__('Error creating database') + ': ' + err});
        }else{
            res.status(200).json({'msg': req.i18n.__('Database successfully created')});
        }
    });
});

// delete a database
router.post('/database/:conn/db_delete', function (req, res, next){
    var connection_list = req.app.locals.dbConnections;

    // Check for existance of connection
    if(connection_list[req.params.conn] === undefined){
        res.status(400).json({'msg': req.i18n.__('Invalid connection')});
    }

    // Get DB form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.body.db_name);

    // delete a collection
    mongo_db.dropDatabase(function (err, result){
        if(err){
            console.error('Error deleting database: ' + err);
            res.status(400).json({'msg': req.i18n.__('Error deleting database') + ': ' + err});
        }else{
            res.status(200).json({'msg': req.i18n.__('Database successfully deleted'), 'db_name': req.body.db_name});
        }
    });
});

module.exports = router;
