var express = require('express');
var router = express.Router();
var common = require('./common');

// runs on all routes and checks password if one is setup
router.all('/users/*', common.checkLogin, function (req, res, next){
    next();
});

// Creates a new user
router.post('/users/:conn/:db/user_create', function (req, res, next){
    var connection_list = req.app.locals.dbConnections;

    // Check for existance of connection
    if(connection_list[req.params.conn] === undefined){
        res.status(400).json({'msg': req.i18n.__('Invalid connection')});
        return;
    }

    // Validate database name
    if(req.params.db.indexOf(' ') > -1){
        res.status(400).json({'msg': req.i18n.__('Invalid database name')});
    }

    // Get DB's form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    // do DB stuff
    var roles = req.body.roles_text ? req.body.roles_text.split(/\s*,\s*/) : [];

    // Add a user
    mongo_db.addUser(req.body.username, req.body.user_password, {'roles': roles}, function (err, user_name){
        if(err){
            console.error('Error creating user: ' + err);
            res.status(400).json({'msg': req.i18n.__('Error creating user') + ': ' + err});
        }else{
            res.status(200).json({'msg': req.i18n.__('User successfully created')});
        }
    });
});

// Deletes a user
router.post('/users/:conn/:db/user_delete', function (req, res, next){
    var connection_list = req.app.locals.dbConnections;

    // Check for existance of connection
    if(connection_list[req.params.conn] === undefined){
        res.status(400).json({'msg': req.i18n.__('Invalid connection')});
        return;
    }

    // Validate database name
    if(req.params.db.indexOf(' ') > -1){
        res.status(400).json({'msg': req.i18n.__('Invalid database name')});
    }

    // Get DB form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    // remove a user
    mongo_db.removeUser(req.body.username, function (err, user_name){
        if(err){
            console.error('Error deleting user: ' + err);
            res.status(400).json({'msg': req.i18n.__('Error deleting user') + ': ' + err});
        }else{
            res.status(200).json({'msg': req.i18n.__('User successfully deleted')});
        }
    });
});

module.exports = router;
