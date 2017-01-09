var _ = require('lodash');
var fs = require('fs');
var path = require('path');

// checks for the password in the /config/app.json file if it's set
exports.checkLogin = function(req, res, next){
    var passwordConf = req.nconf.app.get('app');

    // only check for login if a password is specified in the /config/app.json file
    if(passwordConf && passwordConf.hasOwnProperty('password')){
        // dont require login session for login route
        if(req.path === '/app/login' || req.path === '/app/logout' || req.path === '/app/login_action'){
            next();
        }else{
            // if the session exists we continue, else renter login page
            if(req.session.loggedIn){
                next(); // allow the next route to run
            }else{
                res.redirect(req.app_context + '/app/login');
            }
        }
    }else{
        // no password is set so we continue
        next();
    }
};

// gets some db stats
exports.get_db_status = function (mongo_db, cb){
    var adminDb = mongo_db.admin();
    adminDb.serverStatus(function (err, status){
        if(err){
            cb('Error', null);
        }else{
            cb(null, status);
        }
    });
};

// gets the backup dirs
exports.get_backups = function(cb){
    var junk = require('junk');
    var backupPath = path.join(__dirname, '../backups');

    fs.readdir(backupPath, function (err, files){
        cb(null, files.filter(junk.not));
    });
};

// gets the db stats
exports.get_db_stats = function (mongo_db, db_name, cb){
    var async = require('async');
    var db_obj = {};

    // if at connection level we loop db's and collections
    if(db_name == null){
        var adminDb = mongo_db.admin();
        adminDb.listDatabases(function (err, db_list){
            if(err){
                cb('User is not authorised', null);
                return;
            }
            if(db_list !== undefined){
                async.forEachOf(exports.order_object(db_list.databases), function (value, key, callback){
                    exports.order_object(db_list.databases);
                    var skipped_dbs = ['null', 'admin', 'local'];
                    if(skipped_dbs.indexOf(value.name) === -1){
                        var tempDBName = value.name;
                        mongo_db.db(tempDBName).listCollections().toArray(function (err, coll_list){
                            var coll_obj = {};
                            async.forEachOf(exports.cleanCollections(coll_list), function (value, key, callback){
                                mongo_db.db(tempDBName).collection(value).stats(function (err, coll_stat){
                                    coll_obj[value] = {Storage: coll_stat.size, Documents: coll_stat.count};
                                    callback();
                                });
                            }, function (err){
                                if(err) console.error(err.message);
                                // add the collection object to the DB object with the DB as key
                                db_obj[value.name] = exports.order_object(coll_obj);
                                callback();
                            });
                        });
                    }else{
                        callback();
                    }
                }, function (err){
                    if(err) console.error(err.message);
                    // wrap this whole thing up
                    cb(null, exports.order_object(db_obj));
                });
            }else{
                // if doesnt have the access to get all DB's
                cb(null, null);
            }
        });
        // if at DB level, we just grab the collections below
    }else{
        mongo_db.db(db_name).listCollections().toArray(function (err, coll_list){
            var coll_obj = {};
            async.forEachOf(exports.cleanCollections(coll_list), function (value, key, callback){
                mongo_db.db(db_name).collection(value).stats(function (err, coll_stat){
                    coll_obj[value] = {
                        Storage: coll_stat ? coll_stat.size : 0,
                        Documents: coll_stat ? coll_stat.count : 0
                    };

                    callback();
                });
            }, function (err){
                if(err) console.error(err.message);
                db_obj[db_name] = exports.order_object(coll_obj);
                cb(null, db_obj);
            });
        });
    }
};

// gets the Databases
exports.get_db_list = function (uri, mongo_db, cb){
    var async = require('async');
    var adminDb = mongo_db.admin();
    var db_arr = [];

    // if a DB is not specified in the Conn string we try get a list
    if(uri.database === undefined || uri.database === null){
        // try go all admin and get the list of DB's
        adminDb.listDatabases(function (err, db_list){
            if(db_list !== undefined){
                async.forEachOf(db_list.databases, function (value, key, callback){
                    var skipped_dbs = ['null', 'admin', 'local'];
                    if(skipped_dbs.indexOf(value.name) === -1){
                        db_arr.push(value.name);
                    }
                    callback();
                }, function (err){
                    if(err) console.error(err.message);
                    exports.order_array(db_arr);
                    cb(null, db_arr);
                });
            }else{
                cb(null, null);
            }
        });
    }else{
        cb(null, null);
    }
};

// Normally you would know how your ID's are stored in your DB. As the _id value which is used to handle
// all document viewing in adminMongo is a parameter we dont know if it is an ObjectId, string or integer. We can check if
// the _id string is a valid MongoDb ObjectId but this does not guarantee it is stored as an ObjectId in the DB. It's most likely
// the value will be an ObjectId (hopefully) so we try that first then go from there
exports.get_id_type = function (mongo, collection, doc_id, cb){
    if(doc_id){
        var ObjectID = require('mongodb').ObjectID;
        // if a valid ObjectId we try that, then then try as a string
        if(ObjectID.isValid(doc_id)){
            mongo.collection(collection).findOne({_id: ObjectID(doc_id)}, function (err, doc){
                if(doc){
                    // doc_id is an ObjectId
                    cb(null, {'doc_id_type': ObjectID(doc_id), 'doc': doc});
                }else{
                    mongo.collection(collection).findOne({_id: doc_id}, function (err, doc){
                        if(doc){
                            // doc_id is string
                            cb(null, {'doc_id_type': doc_id, 'doc': doc});
                        }else{
                            cb('Document not found', {'doc_id_type': null, 'doc': null});
                        }
                    });
                }
            });
        }else{
            // if the value is not a valid ObjectId value we try as an integer then as a last resort, a string.
            mongo.collection(collection).findOne({_id: parseInt(doc_id)}, function (err, doc){
                if(doc){
                    // doc_id is integer
                    cb(null, {'doc_id_type': parseInt(doc_id), 'doc': doc});
                    return;
                }else{
                    mongo.collection(collection).findOne({_id: doc_id}, function (err, doc){
                        if(doc){
                            // doc_id is string
                            cb(null, {'doc_id_type': doc_id, 'doc': doc});
                        }else{
                            cb('Document not found', {'doc_id_type': null, 'doc': null});
                        }
                    });
                }
            });
        }
    }else{
        cb(null, {'doc_id_type': null, 'doc': null});
    }
};

// gets the Databases and collections
exports.get_sidebar_list = function (mongo_db, db_name, cb){
    var async = require('async');
    var db_obj = {};

    // if no DB is specified, we get all DBs and collections
    if(db_name == null){
        var adminDb = mongo_db.admin();
        adminDb.listDatabases(function (err, db_list){
            if(db_list){
                async.forEachOf(db_list.databases, function (value, key, callback){
                    var skipped_dbs = ['null', 'admin', 'local'];
                    if(skipped_dbs.indexOf(value.name) === -1){
                        mongo_db.db(value.name).listCollections().toArray(function (err, collections){
                            collections = exports.cleanCollections(collections);
                            exports.order_array(collections);
                            db_obj[value.name] = collections;
                            callback();
                        });
                    }else{
                        callback();
                    }
                }, function (err){
                    if(err) console.error(err.message);
                    cb(null, exports.order_object(db_obj));
                });
            }else{
                cb(null, exports.order_object(db_obj));
            }
        });
    }else{
        mongo_db.db(db_name).listCollections().toArray(function (err, collections){
            collections = exports.cleanCollections(collections);
            exports.order_array(collections);
            db_obj[db_name] = collections;
            cb(null, db_obj);
        });
    }
};

// order the object by alpha key
exports.order_object = function(unordered){
    if(unordered !== undefined){
        var ordered = {};
        var keys = Object.keys(unordered);
        exports.order_array(keys);
        keys.forEach(function (key){
            ordered[key] = unordered[key];
        });
    }
    return ordered;
};

exports.order_array = function(array){
    if(array){
        array.sort(function (a, b){
            a = a.toLowerCase();
            b = b.toLowerCase();
            if(a === b)return 0;
            if(a > b)return 1;
            return-1;
        });
    }
    return array;
};

// render the error page
exports.render_error = function(res, req, err, conn){
    var connection_list = req.nconf.connections.get('connections');

    var conn_string = '';
    if(connection_list[conn] !== undefined){
        conn_string = connection_list[conn].connection_string;
    }

    res.render('error', {
        message: err,
        conn: conn,
        conn_string: conn_string,
        connection_list: exports.order_object(connection_list),
        helpers: req.handlebars.helpers
    });
};

exports.cleanCollections = function(collection_list){
    var list = [];
    _.each(collection_list, function (item){
        list.push(item.name);
    });
    return list;
};
