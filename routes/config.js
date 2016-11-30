var express = require('express');
var router = express.Router();
var common = require('./common');

// runs on all routes and checks password if one is setup
router.all('/config/*', common.checkLogin, function (req, res, next){
    next();
});

// Add a new connection config
router.post('/config/add_config', function (req, res, next){
    var nconf = req.nconf.connections;
    var MongoURI = require('mongo-uri');
    var connPool = require('../connections');
    var connection_list = req.nconf.connections.get('connections');

    // check if name already exists
    if(connection_list !== undefined){
        if(connection_list[req.body[0]] !== undefined){
            res.status(400).json({'msg': req.i18n.__('Config error: A connection by that name already exists')});
            return;
        }
    }

    // try parse uri string. If pass, add, else throw an error
    try{
        MongoURI.parse(req.body[1]);
        var options = {};
        try{
            options = JSON.parse(req.body[2]);
        }catch(err){
            res.status(400).json({'msg': req.i18n.__('Error in connection options') + ': ' + err});
            return;
        }

        // try add the connection
        connPool.addConnection({connName: req.body[0], connString: req.body[1], connOptions: options}, req.app, function (err, data){
            if(err){
                console.error('DB Connect error: ' + err);
                res.status(400).json({'msg': req.i18n.__('Config error') + ': ' + err});
            }else{
                // set the new config
                nconf.set('connections:' + req.body[0], {'connection_string': req.body[1], 'connection_options': options});

                // save for ron
                nconf.save(function (err){
                    if(err){
                        console.error('Config error: ' + err);
                        res.status(400).json({'msg': req.i18n.__('Config error') + ': ' + err});
                    }else{
                        res.status(200).json({'msg': req.i18n.__('Config successfully added')});
                    }
                });
            }
        });
    }catch(err){
        console.error('Config error: ' + err);
        res.status(400).json({'msg': req.i18n.__('Config error') + ': ' + err});
    }
});

// Updates an existing connection config
router.post('/config/update_config', function (req, res, next){
    var nconf = req.nconf.connections;
    var connPool = require('../connections');
    var MongoURI = require('mongo-uri');

    // try parse uri string. If pass, add, else throw an error
    try{
        MongoURI.parse(req.body.conn_string);

        // var get current options
        var current_options = nconf.store.connections[req.body.curr_config].connection_options;

        // try add the connection
        connPool.addConnection({connName: req.body.conn_name, connString: req.body.conn_string, connOptions: current_options}, req.app, function (err, data){
            if(err){
                console.error('DB Connect error: ' + err);
                res.status(400).json({'msg': req.i18n.__('Config error') + ': ' + err});
            }else{
                // delete current config
                delete nconf.store.connections[req.body.curr_config];

                // set the new
                nconf.set('connections:' + req.body.conn_name, {'connection_string': req.body.conn_string, 'connection_options': current_options});

                // save for ron
                nconf.save(function (err){
                    if(err){
                        console.error('Config error1: ' + err);
                        res.status(400).json({'msg': req.i18n.__('Config error') + ': ' + err});
                    }else{
                        res.status(200).json({'msg': req.i18n.__('Config successfully updated'), 'name': req.body.conn_name, 'string': req.body.conn_string});
                    }
                });
            }
        });
    }catch(err){
        console.error('Config error: ' + err);
        res.status(400).json({'msg': req.i18n.__('Config error') + ': ' + err});
    }
});

// Drops an existing connection config
router.post('/config/drop_config', function (req, res, next){
    var nconf = req.nconf.connections;
    var connPool = require('../connections');

    // delete current config
    delete nconf.store.connections[req.body.curr_config];
    connPool.removeConnection(req.body.curr_config, req.app);

    // save config
    nconf.save(function (err){
        if(err){
            console.error('Config error: ' + err);
            res.status(400).json({'msg': req.i18n.__('Config error') + ': ' + err});
        }else{
            res.status(200).json({'msg': req.i18n.__('Config successfully deleted')});
        }
    });
});

module.exports = router;
