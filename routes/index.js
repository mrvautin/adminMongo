var express = require('express');
var router = express.Router();

// the home route
router.get('/', function (req, res, next) {
    var connection_list = req.nconf.connections.get('connections');

	if(connection_list){
        // we have a connection and redirect to the first
        var first_conn = Object.keys(connection_list)[0];
        res.redirect('/' + first_conn);
    }else{
        // go to connection setup
        res.redirect('/connection_list');
    }
});

// show/manage connections
router.get('/connection_list', function (req, res, next) {
    var connection_list = req.nconf.connections.get('connections');

    res.render('connections', {
        message: "",
        connection_list: order_object(connection_list)
    });
});

router.get('/:conn', function (req, res, next) {
    var mongojs = require('mongojs');
    var helpers = req.handlebars.helpers;
    var connection_list = req.nconf.connections.get('connections');
    var mongodb = require('mongodb').MongoClient;
    var mongo_uri = require('mongo-uri');

    // if no connection found
    if(connection_list == undefined || Object.keys(connection_list).length == 0){
        res.redirect("/");
        return;
    }

    var conn_string = connection_list[req.params.conn].connection_string;

    // parse the connection string to get DB
    var uri = mongo_uri.parse(conn_string);

    // If there is a DB in the connection string, we redirect to the DB level
    if(uri.database){
        res.redirect("/" +  req.params.conn + "/" + uri.database);
        return;
    }

    // connect to DB
    mongodb.connect(conn_string, function (err, mongo_db) {
        if(err){
            console.error("Error connecting to database: " + err);
            render_error(res, req, err, req.params.conn);
        }else{
            var db = mongojs(mongo_db);
            get_db_stats(mongo_db, uri.database, function(err, db_stats){
                db.runCommand({ usersInfo: 1 },function (err, conn_users) {
                    get_sidebar_list(mongo_db, uri.database, function(err, sidebar_list) {
                        get_db_list(uri, mongo_db, function(err, db_list) {
                            res.render('conn', {
                                conn_list: order_object(connection_list),
                                db_stats: db_stats,
                                conn_name: req.params.conn,
                                conn_users: conn_users,
                                sidebar_list: sidebar_list,
                                db_list: db_list,
                                helpers: helpers
                            });
                        });
                    });
                });
            });
        }
    });
});

router.get('/:conn/:db/', function (req, res, next) {
    var mongojs = require('mongojs');
    var helpers = req.handlebars.helpers;
    var connection_list = req.nconf.connections.get('connections');
    var mongodb = require('mongodb').MongoClient;
    var mongo_uri = require('mongo-uri');

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        render_error(res, req, "Invalid connection name", req.params.conn);
        return;
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        render_error(res, req, "Invalid database name", req.params.conn);
        return;
    }

    var conn_string = connection_list[req.params.conn].connection_string;

    // parse the connection string to get DB
    var uri = mongo_uri.parse(conn_string);

    // connect to DB
    mongodb.connect(conn_string, function (err, mongo_db) {
        if(err){
            console.error("Error connecting to database: " + err);
            render_error(res, req, err, req.params.conn);
        }else{
            var db = mongojs(mongo_db.db(req.params.db));
            get_db_stats(mongo_db, req.params.db, function(err, db_stats){
                get_sidebar_list(mongo_db, uri.database, function(err, sidebar_list) {
                    db.runCommand({ usersInfo: 1 },function (err, conn_users) {
                        db.getCollectionNames(function (err, collection_list) {
                            order_array(collection_list)
                            res.render('db', {
                                conn_name: req.params.conn,
                                conn_list: order_object(connection_list),
                                db_stats: db_stats,
                                conn_users: conn_users,
                                coll_list: collection_list,
                                db_name: req.params.db,
                                show_db_name: true,
                                sidebar_list: sidebar_list,
                                helpers: helpers
                            });
                        });
                    });
                });
            });
        }
    });
});

// redirect to page 1
router.get('/:conn/:db/:coll/', function (req, res, next) {
     res.redirect("/" + req.params.conn + "/" + req.params.db + "/" + req.params.coll + "/view/1");
});

// redirect to page 1
router.get('/:conn/:db/:coll/view/', function (req, res, next) {
     res.redirect("/" + req.params.conn + "/" + req.params.db + "/" + req.params.coll + "/view/1");
});

router.get('/:conn/:db/:coll/view/:page_num/:key_val?/:value_val?', function (req, res, next) {
    var mongojs = require('mongojs');
    var helpers = req.handlebars.helpers;
    var connection_list = req.nconf.connections.get('connections');
    var mongodb = require('mongodb').MongoClient;
    var mongo_uri = require('mongo-uri');
    var docs_per_page = req.nconf.app.get('app:docs_per_page') != undefined ? req.nconf.app.get('app:docs_per_page') : 5;

    var conn_string = connection_list[req.params.conn].connection_string;

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        render_error(res, req, "Invalid connection name", req.params.conn);
        return;
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        render_error(res, req, "Invalid database name", req.params.conn);
        return;
    }

    // parse the connection string to get DB
    var uri = mongo_uri.parse(conn_string);

    // connect to DB
    mongodb.connect(conn_string, function (err, mongo_db) {
        if(err){
            console.error("Error connecting to database: " + err);
            render_error(res, req, err, req.params.conn);
        }else{
            //var db = mongojs(mongo_db);
            var db = mongojs(mongo_db.db(req.params.db));
            db.getCollectionNames(function (err, collection_list) {
                get_sidebar_list(mongo_db, uri.database, function(err, sidebar_list) {
                    db.collection(req.params.coll).count(function (err, coll_count) {
                        if (collection_list.indexOf(req.params.coll) === -1) {
                            render_error(res, req, "Collection does not exist", req.params.conn);
                        }else{
                            res.render('coll-view', {
                                conn_list: order_object(connection_list),
                                conn_name: req.params.conn,
                                db_name: req.params.db,
                                coll_name: req.params.coll,
                                coll_list: collection_list.sort(),
                                coll_count: coll_count,
                                page_num: req.params.page_num,
                                key_val: req.params.key_val,
                                value_val: req.params.value_val,
                                sidebar_list: sidebar_list,
                                docs_per_page: docs_per_page,
                                helpers: helpers,
                                paginate: true,
                                editor: true
                            });
                        }
                    });
                });
            });
        }
    });
});

router.get('/:conn/:db/:coll/indexes', function (req, res, next) {
    var mongojs = require('mongojs');
    var helpers = req.handlebars.helpers;
    var connection_list = req.nconf.connections.get('connections');
    var mongodb = require('mongodb').MongoClient;
    var mongo_uri = require('mongo-uri');

    var conn_string = connection_list[req.params.conn].connection_string;

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        render_error(res, req, "Invalid connection name", req.params.conn);
        return;
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        render_error(res, req, "Invalid database name", req.params.conn);
        return;
    }

    // parse the connection string to get DB
    var uri = mongo_uri.parse(conn_string);

    // connect to DB
    mongodb.connect(conn_string, function (err, mongo_db) {
        if(err){
            console.error("Error connecting to database: " + err);
            render_error(res, req, err, req.params.conn);
        }else{
            var db = mongojs(mongo_db.db(req.params.db));
            db.getCollectionNames(function (err, collection_list) {
                db.collection(req.params.coll).getIndexes(function (err, coll_indexes) {
                    get_sidebar_list(mongo_db, uri.database, function(err, sidebar_list) {
                        if (collection_list.indexOf(req.params.coll) === -1) {
                            console.error("No collection found");
                            render_error(res, req, "Collection does not exist", req.params.conn);
                        }else{
                            res.render('coll-indexes', {
                                coll_indexes: coll_indexes,
                                conn_list: order_object(connection_list),
                                conn_name: req.params.conn,
                                db_name: req.params.db,
                                coll_name: req.params.coll,
                                coll_list: collection_list.sort(),
                                sidebar_list: sidebar_list,
                                helpers: helpers,
                                editor: true
                            });
                        }
                    });
                });
            });
        }
    });
});

router.get('/:conn/:db/:coll/new', function (req, res, next) {
    var mongojs = require('mongojs');
    var helpers = req.handlebars.helpers;
    var connection_list = req.nconf.connections.get('connections');
    var mongodb = require('mongodb').MongoClient;
    var mongo_uri = require('mongo-uri');

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        render_error(res, req, "Invalid connection name", req.params.conn);
        return;
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        render_error(res, req, "Invalid database name", req.params.conn);
        return;
    }

    var conn_string = connection_list[req.params.conn].connection_string;

    // parse the connection string to get DB
    var uri = mongo_uri.parse(conn_string);

    // connect to DB
    mongodb.connect(conn_string, function (err, mongo_db) {
        if(err){
            console.error("Error connecting to database: " + err);
            render_error(res, req, err, req.params.conn);
        }else{
            var db = mongojs(mongo_db.db(req.params.db));

            db.getCollectionNames(function (err, collection_list) {
                get_sidebar_list(mongo_db, uri.database, function(err, sidebar_list) {
                    if (collection_list.indexOf(req.params.coll) === -1) {
                        console.error("No collection found");
                        render_error(res, req, "Collection does not exist", req.params.conn);
                    }else{
                        res.render('coll-new', {
                            conn_name: req.params.conn,
                            conn_list: order_object(connection_list),
                            coll_name: req.params.coll,
                            sidebar_list: sidebar_list,
                            db_name: req.params.db,
                            helpers: helpers,
                            editor: true
                        });
                    }
                });
            });
        }
    });
});

router.get('/:conn/:db/:coll/edit/:doc_id', function (req, res, next) {
    var mongojs = require('mongojs');
    var helpers = req.handlebars.helpers;
    var connection_list = req.nconf.connections.get('connections');
    var mongodb = require('mongodb').MongoClient;
    var mongo_uri = require('mongo-uri');
    var bsonify = require('./bsonify');

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        render_error(res, req, "Invalid connection name", req.params.conn);
        return;
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        render_error(res, req, "Invalid database name", req.params.conn);
        return;
    }

    var conn_string = connection_list[req.params.conn].connection_string;

    // parse the connection string to get DB
    var uri = mongo_uri.parse(conn_string);

    // connect to DB
    mongodb.connect(conn_string, function (err, mongo_db) {
        if(err){
            console.error("Error connecting to database: " + err);
            render_error(res, req, err, req.params.conn);
        }else{
            var db = mongojs(mongo_db.db(req.params.db));

            db.getCollectionNames(function (err, collection_list) {
                get_sidebar_list(mongo_db, uri.database, function(err, sidebar_list) {
                    get_id_type(db, req.params.coll, req.params.doc_id, function(err, doc_id_type, doc) {
                        if(doc == undefined){
                            console.error("No document found");
                            render_error(res, req, "Document not found", req.params.conn);
                            return;
                        }
                        if(err){
                            console.error("No document found");
                            render_error(res, req, "Document not found", req.params.conn);
                            return;
                        }

                        res.render('coll-edit', {
                            conn_list: order_object(connection_list),
                            conn_name: req.params.conn,
                            db_name: req.params.db,
                            sidebar_list: sidebar_list,
                            coll_name: req.params.coll,
                            coll_list: collection_list.sort(),
                            coll_doc: bsonify.stringify(doc, null, '    '),
                            helpers: helpers,
                            editor: true
                        });
                    });
                });
            });
        }
    });
});

// create a user
router.post('/:conn/:db/:coll/user_create', function (req, res, next) {
    var mongojs = require('mongojs');
    var connection_list = req.nconf.connections.get('connections');
    var mongodb = require('mongodb').MongoClient;

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end('Invalid connection name');
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end('Invalid database name');
    }

    mongodb.connect(connection_list[req.params.conn].connection_string, function (err, mongo_db) {
        if(err){
            console.error("Error connecting to database: " + err);
            res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end('Error connecting to database: ' + err);
        }else{
            var db = mongojs(mongo_db.db(req.params.db));
            var roles = req.body.roles_text ? req.body.roles_text.split(/\s*,\s*/) : [];

            // Add a user
            db.addUser({"user": req.body.username, "pwd": req.body.user_password, "roles": roles}, function (err, user_name) {
                if(err){
                    console.error('Error creating user: ' + err);
                    res.writeHead(400, { 'Content-Type': 'application/text' });
                    res.end('Error creating user: ' + err);
                }else{
                    res.writeHead(200, { 'Content-Type': 'application/text' });
                    res.end('User successfully created');
                }
            });
        }
    });
});

// delete a user
router.post('/:conn/:db/:coll/user_delete', function (req, res, next) {
    var mongojs = require('mongojs');
    var connection_list = req.nconf.connections.get('connections');
    var mongodb = require('mongodb').MongoClient;

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end('Invalid connection name');
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end('Invalid database name');
    }

    mongodb.connect(connection_list[req.params.conn].connection_string, function (err, mongo_db) {
        if(err){
            console.error('Error connecting to database: ' + err);
            res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end('Error connecting to database: ' + err);
        }else{
            var db = mongojs(mongo_db.db(req.params.db));

            // Add a user
            db.removeUser(req.body.username, function (err, user_name) {
                if(err){
                    console.error('Error deleting user: ' + err);
                    res.writeHead(400, { 'Content-Type': 'application/text' });
                    res.end('Error deleting user: ' + err);
                }else{
                    res.writeHead(200, { 'Content-Type': 'application/text' });
                    res.end('User successfully created');
                }
            });
        }
    });
});

// rename a collection
router.post('/:conn/:db/:coll/coll_name_edit', function (req, res, next) {
    var mongojs = require('mongojs');
    var connection_list = req.nconf.connections.get('connections');
    var mongodb = require('mongodb').MongoClient;

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end('Invalid connection name');
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end('Invalid database name');
    }

    mongodb.connect(connection_list[req.params.conn].connection_string, function (err, mongo_db) {
        if(err){
            console.error('Error connecting to database: ' + err);
            res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end('Error connecting to database: ' + err);
        }else{
            var db = mongojs(mongo_db.db(req.params.db));

            // change a collection name
            db.collection(req.params.coll).rename(req.body.new_collection_name, {"dropTarget": false} , function (err, coll_name) {
                if(err){
                    console.error('Error renaming collection: ' + err);
                    res.writeHead(400, { 'Content-Type': 'application/text' });
                    res.end('Error renaming collection: ' + err);
                }else{
                    res.writeHead(200, { 'Content-Type': 'application/text' });
                    res.end('Collection successfully renamed');
                }
            });
        }
    });
});

// create a new collection index
router.post('/:conn/:db/:coll/create_index', function (req, res, next) {
    var mongojs = require('mongojs');
    var connection_list = req.nconf.connections.get('connections');
    var mongodb = require('mongodb').MongoClient;

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end('Invalid connection name');
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end('Invalid database name');
    }

    mongodb.connect(connection_list[req.params.conn].connection_string, function (err, mongo_db) {
        if(err){
            console.error('Error connecting to database: ' + err);
            res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end('Error connecting to database: ' + err);
        }else{
            var db = mongojs(mongo_db.db(req.params.db));

            // adding a new collection
            var unique_bool = (req.body[1] === 'true');
            var sparse_bool = (req.body[2] === 'true');
            var options = {unique: unique_bool, background:true, sparse: sparse_bool};
            db.collection(req.params.coll).createIndex(JSON.stringify(req.body[0]), options, function (err, index) {
                if(err){
                    console.error('Error creating index: ' + err);
                    res.writeHead(400, { 'Content-Type': 'application/text' });
                    res.end('Error creating index: ' + err);
                }else{
                    res.writeHead(200, { 'Content-Type': 'application/text' });
                    res.end('Index successfully created');
                }
            });
        }
    });
});

// create a new collection index
router.post('/:conn/:db/:coll/drop_index', function (req, res, next) {
    var mongojs = require('mongojs');
    var connection_list = req.nconf.connections.get('connections');
    var mongodb = require('mongodb').MongoClient;

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end('Invalid connection name');
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end('Invalid database name');
    }

    mongodb.connect(connection_list[req.params.conn].connection_string, function (err, mongo_db) {
        if(err){
            console.error('Error connecting to database: ' + err);
            res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end('Error connecting to database: ' + err);
        }else{
            var db = mongojs(mongo_db.db(req.params.db));

            // adding a new index
            db.collection(req.params.coll).getIndexes(function (err, indexes) {
                db.collection(req.params.coll).dropIndex(indexes[req.body.index].key, function (err, index) {
                    if(err){
                        console.error('Error dropping Index: ' + err);
                        res.writeHead(400, { 'Content-Type': 'application/text' });
                        res.end('Error dropping Index: ' + err);
                    }else{
                        res.writeHead(200, { 'Content-Type': 'application/text' });
                        res.end('Index successfully dropped');
                    }
                });
            });
        }
    });
});

// create a new collection
router.post('/:conn/:db/coll_create', function (req, res, next) {
    var mongojs = require('mongojs');
    var connection_list = req.nconf.connections.get('connections');
    var mongodb = require('mongodb').MongoClient;

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end('Invalid connection name');
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end('Invalid database name');
    }

    mongodb.connect(connection_list[req.params.conn].connection_string, function (err, mongo_db) {
        if(err){
            console.error('Error connecting to database: ' + err);
            res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end('Error connecting to database: ' + err);
        }else{
            var db = mongojs(mongo_db.db(req.params.db));

            // adding a new collection
            db.createCollection(req.body.collection_name, function (err, coll) {
                if(err){
                    console.error('Error creating collection: ' + err);
                    res.writeHead(400, { 'Content-Type': 'application/text' });
                    res.end('Error creating collection: ' + err);
                }else{
                    res.writeHead(200, { 'Content-Type': 'application/text' });
                    res.end('Collection successfully created');
                }
            });
        }
    });
});

// delete a collection
router.post('/:conn/:db/coll_delete', function (req, res, next) {
    var mongojs = require('mongojs');
    var connection_list = req.nconf.connections.get('connections');
    var mongodb = require('mongodb').MongoClient;

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end('Invalid connection name');
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end('Invalid database name');
    }

    mongodb.connect(connection_list[req.params.conn].connection_string, function (err, mongo_db) {
        if(err){
            console.error('Error connecting to database: ' + err);
            res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end('Error connecting to database: ' + err);
        }else{
            var db = mongojs(mongo_db.db(req.params.db));

            // delete a collection
            db.collection(req.body.collection_name).drop(function (err, coll) {
                if(err){
                    console.error('Error deleting collection: ' + err);
                    res.writeHead(400, { 'Content-Type': 'application/text' });
                    res.end('Error deleting collection: ' + err);
                }else{
                    res.writeHead(200, { 'Content-Type': 'application/text' });
                    res.end('Collection successfully deleted');
                }
            });
        }
    });
});

// create a new database
router.post('/:conn/db_create', function (req, res, next) {
    var mongojs = require('mongojs');
    var connection_list = req.nconf.connections.get('connections');
    var mongodb = require('mongodb').MongoClient;

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end('Invalid connection');
    }

    mongodb.connect(connection_list[req.params.conn].connection_string, function (err, mongo_db) {
        if(err){
            res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end('Error connecting to database: ' + err);
        }else{
            var db = mongojs(mongo_db.db(req.body.db_name));

            // adding a new collection to create the DB
            db.collection("test").save({}, function (err, docs) {
                if(err){
                    console.error('Error creating database: ' + err);
                    res.writeHead(400, { 'Content-Type': 'application/text' });
                    res.end('Error creating database: ' + err);
                }else{
                    res.writeHead(200, { 'Content-Type': 'application/text' });
                    res.end('Database successfully created');
                }
            });
        }
    });
});

// delete a database
router.post('/:conn/db_delete', function (req, res, next) {
    var mongojs = require('mongojs');
    var connection_list = req.nconf.connections.get('connections');
    var mongodb = require('mongodb').MongoClient;

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end('Invalid connection');
    }

    mongodb.connect(connection_list[req.params.conn].connection_string, function (err, mongo_db) {
        if(err){
            console.error('Error deleting database: ' + err);
            res.writeHead(200, { 'Content-Type': 'application/text' });
            res.end('Error deleting database: ' + err);
        }else{
            var db = mongojs(mongo_db.db(req.body.db_name));

            // delete a collection
            db.dropDatabase(function(err, result) {
                if(err){
                    console.error('Error deleting database: ' + err);
                    res.writeHead(400, { 'Content-Type': 'application/text' });
                    res.end('Error deleting database: ' + err);
                }else{
                    res.writeHead(200, { 'Content-Type': 'application/text' });
                    res.end('Database successfully deleted');
                }
            });
        }
    });
});

router.post('/:conn/:db/:coll/insert_doc', function (req, res, next) {
    var mongojs = require('mongojs');
    var connection_list = req.nconf.connections.get('connections');
    var mongodb = require('mongodb').MongoClient;
    var ejson = require('mongodb-extended-json');

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end('Invalid connection name');
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end('Invalid database name');
    }

    mongodb.connect(connection_list[req.params.conn].connection_string, function (err, mongo_db) {
        if(err){
            console.error('Error connecting to database: ' + err);
            res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end('Error connecting to database: ' + err);
        }else{
            var db = mongojs(mongo_db.db(req.params.db));

            try {
                var eJsonData = ejson.parse(req.body.objectData);
            }catch (e) {
                console.error("Syntax error: " + e);
                res.writeHead(400, { 'Content-Type': 'application/text' });
                res.end('Syntax error. Please check the syntax');
                return;
            }

            // adding a new doc
            db.collection(req.params.coll).save(eJsonData, function (err, docs) {
                if(err){
                    console.error('Error inserting document: ' + err);
                    res.writeHead(400, { 'Content-Type': 'application/text' });
                    res.end('Error inserting document: ' + err);
                }else{
                    res.writeHead(200, { 'Content-Type': 'application/text' });
                    res.end('Document successfully added');
                }
            });
        }
    });
});

router.post('/:conn/:db/:coll/edit_doc', function (req, res, next) {
    var mongojs = require('mongojs');
    var connection_list = req.nconf.connections.get('connections');
    var mongodb = require('mongodb').MongoClient;
    var ejson = require('mongodb-extended-json');

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end('Invalid connection name');
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end('Invalid database name');
    }

    mongodb.connect(connection_list[req.params.conn].connection_string, function (err, mongo_db) {
        if(err){
            console.error('Error connecting to database: ' + err);
            res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end('Error connecting to database: ' + err);
        }else{
            var db = mongojs(mongo_db.db(req.params.db));

            try {
                var eJsonData = ejson.parse(req.body.objectData);
            }catch (e) {
                console.error("Syntax error: " + e);
                res.writeHead(400, { 'Content-Type': 'application/text' });
                res.end('Syntax error. Please check the syntax');
                return;
            }

            db.collection(req.params.coll).save(eJsonData, function (err, doc, lastErrorObject) {
                if(err){
                    console.error("Error updating document: " + err);
                    res.writeHead(400, { 'Content-Type': 'application/text' });
                    res.end('Error updating document: ' + err);
                }else{
                    if(doc['nModified'] == 0){
                        console.error('Error updating document: Document ID is incorrect');
                        res.writeHead(400, { 'Content-Type': 'application/text' });
                        res.end('Error updating document: Syntax error');
                    }else{
                        res.writeHead(200, { 'Content-Type': 'application/text' });
                        res.end('Document successfully updated');
                    }
                }
            });
        }
    });
});

router.post('/:conn/:db/:coll/doc_delete', function (req, res, next) {
    var mongojs = require('mongojs');
    var connection_list = req.nconf.connections.get('connections');
    var mongodb = require('mongodb').MongoClient;

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end('Invalid connection name');
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end('Invalid database name');
    }

    mongodb.connect(connection_list[req.params.conn].connection_string, function (err, mongo_db) {
        if(err){
            console.error('Error connecting to database: ' + err);
            res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end('Error connecting to database: ' + err);
        }else{
            var db = mongojs(mongo_db.db(req.params.db));
            get_id_type(db, req.params.coll, req.body.doc_id, function(err, doc_id_type, doc) {
                if(doc){
                    db.collection(req.params.coll).remove({_id: doc_id_type}, function(err, docs){
                        if(err){
                            console.error('Error deleting document: ' + err);
                            res.writeHead(400, { 'Content-Type': 'application/text' });
                            res.end('Error deleting document: ' + err);
                        }else{
                            res.writeHead(200, { 'Content-Type': 'application/text' });
                            res.end('Document successfully deleted');
                        }
                    });
                }else{
                    console.error('Error deleting document: ' + err);
                    res.writeHead(400, { 'Content-Type': 'application/text' });
                    res.end('Cannot find document by Id');
                }
            });
        }
    });
});

router.post('/add_config', function (req, res, next) {
    var nconf = req.nconf.connections;
    var connection_list = req.nconf.connections.get('connections');

    // check if name already exists
    if(connection_list != undefined){
        if(connection_list[req.body[0]] != undefined){
            res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end('Config error: ' + 'A connection by that name already exists');
            return;
        }
    }

    // set the new config
    nconf.set('connections:' + req.body[0], {"connection_string": req.body[1]});

    // save for ron
    nconf.save(function (err) {
        if(err){
            console.error('Config error: ' + err);
            res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end('Config error: ' + err);
        }else{
            res.writeHead(200, { 'Content-Type': 'application/text' });
            res.end('Config successfully added');
        }
    });
});

router.post('/update_config', function (req, res, next) {
    var nconf = req.nconf;

    // delete current config
    delete nconf.store.connections[req.body.curr_config];

    // set the new
    nconf.set('connections:' + req.body.conn_name, { 'connection_string':  req.body.conn_string});

    // save for ron
    nconf.save(function (err) {
        if(err){
            console.error('Config error: ' + err);
            res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end('Config error: ' + err);
        }else{
            res.writeHead(200, { 'Content-Type': 'application/text' });
            res.end('Config successfully updated');
        }
    });
});

router.post('/drop_config', function (req, res, next) {
    var nconf = req.nconf;

    // delete current config
    delete nconf.store.connections[req.body.curr_config];

    // save config
    nconf.save(function (err) {
        if(err){
            console.error('Config error: ' + err);
            res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end('Config error: ' + err);
        }else{
            res.writeHead(200, { 'Content-Type': 'application/text' });
            res.end('Config successfully deleted');
        }
    });
});

// pagination API
router.post('/api/:conn/:db/:coll/:page', function (req, res, next) {
    var mongojs = require('mongojs');
    var connection_list = req.nconf.connections.get('connections');
    var mongodb = require('mongodb').MongoClient;
    var ejson = require('mongodb-extended-json');
    var docs_per_page = req.nconf.app.get('app:docs_per_page') != undefined ? req.nconf.app.get('app:docs_per_page') : 5;
   
    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        res.writeHead(500, { 'Content-Type': 'application/text' });
        res.end('Invalid connection name');
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        res.writeHead(500, { 'Content-Type': 'application/text' });
        res.end('Invalid database name');
    }

    mongodb.connect(connection_list[req.params.conn].connection_string, function (err, mongo_db) {
        if (err) {
            res.status(500).json(err);
        }

        var db = mongojs(mongo_db.db(req.params.db));

        var page_size = docs_per_page;
        var page = 1;

        if(req.params.page != undefined){
            page = parseInt(req.params.page);
        }
         
        var skip = 0;
        if(page > 1){
            skip = (page - 1) * page_size
        }

        var limit = page_size;
        
        var query_obj = {};
        if(req.body.query){     
            try {
                query_obj = ejson.parse(req.body.query);
            }catch (e) {
                query_obj = {}
            }
        }
        
        db.collection(req.params.coll).find(query_obj).limit(limit).skip(skip, function (err, result) {
            if (err) {
                res.status(500).json(err);
            }else{
                
                db.collection(req.params.coll).find({}).limit(limit).skip(skip, function (err, simpleSearchFields) {
                    //get field names/keys of the Documents in collection                
                    var fields = [];
                    for (var i = 0; i < simpleSearchFields.length; i++) {
                        var doc = simpleSearchFields[i];

                        for (key in doc){
                           if(key == "__v") continue;
                           fields.push(key);
                        }
                    };

                    fields = fields.filter(function(item, pos) {
                        return fields.indexOf(item) == pos;
                    });
                    
                    // get total num docs in query
                    db.collection(req.params.coll).count(query_obj, function (err, doc_count) {
                        var return_data = {
                            data: result,
                            fields : fields,
                            total_docs: doc_count
                        }
                        res.status(200).json(return_data);
                    });

                });                
            }            
        });
    });
});

router.get('/:conn/:db/:coll/export/:excludedID?', function (req, res, next) {
    var mongojs = require('mongojs');
    var connection_list = req.nconf.connections.get('connections');
    var mongodb = require('mongodb').MongoClient;

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        render_error(res, req, "Invalid connection name", req.params.conn);
        return;
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        render_error(res, req, "Invalid database name", req.params.conn);
        return;
    }

    // exclude _id from export
    var exportID = {};
    if(req.params.excludedID === "true"){
        exportID = {"_id": 0};
    }

    mongodb.connect(connection_list[req.params.conn].connection_string, function (err, mongo_db){
        var db = mongojs(mongo_db.db(req.params.db));
        db.collection(req.params.coll).find({},exportID, function (err, data) {
            if(data != ""){
                res.set({"Content-Disposition":"attachment; filename=" + req.params.coll + ".json"});
                res.send(JSON.stringify(data, null, 2));
            }else{
                render_error(res, req, "Export error: Collection not found", req.params.conn);
            }
        });
    });
});

// gets the db stats
var get_db_stats = function(mongo_db, db_name, cb) {
    var async = require('async');
    var mongojs = require('mongojs');
    var db_obj = {};

    // if at connection level we get db's, then get collections
    if(db_name == null){
        var adminDb = mongo_db.admin();
        adminDb.listDatabases(function (err, db_list) {
            if(err){
                cb("User is not authorised", null);
                return;
            }
            if(db_list != undefined){
                async.forEachOf(order_object(db_list.databases), function (value, key, callback) {
                    order_object(db_list.databases);
                    var skipped_dbs = ["null", "admin", "local"];
                    if(skipped_dbs.indexOf(value.name) === -1){
                        var db_name = value.name;
                        var temp_db = mongojs(mongo_db.db(value.name));
                        temp_db.getCollectionNames(function(err, coll_list){
                            var coll_obj = {};
                            async.forEachOf(coll_list, function (value, key, callback) {
                                temp_db.collection(value).stats(function(err, coll_stat){
                                    coll_obj[value] = {Storage: coll_stat.size, Documents: coll_stat.count};
                                    callback();
                                });
                            }, function (err) {
                            if (err) console.error(err.message);
                                // add the collection object to the DB object with the DB as key
                                db_obj[db_name] = order_object(coll_obj);
                                callback();
                            });
                        });
                    }else{
                        callback();
                    }
                }, function (err) {
                    if (err) console.error(err.message);
                    // wrap this whole thing up
                    cb(null, order_object(db_obj));
                });
            }else{
                // if doesnt have the access to get all DB's
                cb(null, null);
            }
        });
    // if at DB level, we just grab the collections below
    }else{
        var db = mongojs(mongo_db.db(db_name));
        db.getCollectionNames(function(err, coll_list){
            var coll_obj = {};
            async.forEachOf(coll_list, function (value, key, callback) {
                db.collection(value).stats(function(err, coll_stat){
                    coll_obj[value] = {
                        Storage: coll_stat ? coll_stat.size : 0,
                        Documents: coll_stat ? coll_stat.count : 0,
                    };

                    callback();
                });
            }, function (err) {
                if (err) console.error(err.message);
                db_obj[db_name] = order_object(coll_obj);
                cb(null, db_obj);
            });
        });
    }
};

// gets the Databases
var get_db_list = function(uri, mongo_db, cb) {
    var async = require('async');
    var adminDb = mongo_db.admin();
    var db_arr = [];

    // if a DB is not specified in the Conn string we try get a list
    if(uri.database == undefined){
        // try go all admin and get the list of DB's
        adminDb.listDatabases(function (err, db_list) {
            if(db_list != undefined){
                async.forEachOf(db_list.databases, function (value, key, callback) {
                    var skipped_dbs = ["null", "admin", "local"];
                    if(skipped_dbs.indexOf(value.name) === -1){
                        db_arr.push(value.name);
                    }
                    callback();
                }, function (err) {
                    if (err) console.error(err.message);
                    order_array(db_arr);
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
// the _id string is a valid MongoDb ObjectId but this does not guarantee it is stored as an ObjectId in the DB. Its most likely
// the value will be an ObjectId (hopefully) so we try that first then go from there
var get_id_type = function(mongojs, collection, doc_id, cb) {

    var ObjectID = require('mongodb').ObjectID;
    // if a valid ObjectId we try that, then then try as a string
    if(ObjectID.isValid(doc_id)){
        mongojs.collection(collection).findOne({_id: mongojs.ObjectId(doc_id)}, function(err, doc) {
            if(doc){
                // doc_id is an ObjectId
                cb(null, mongojs.ObjectId(doc_id), doc);
            }else{
                mongojs.collection(collection).findOne({_id: doc_id}, function(err, doc) {
                    if(doc){
                        // doc_id is string
                        cb(null, doc_id, doc);
                    }else{
                        cb("Document not found", null, null);
                    }
                });
            }
        });
    }else{
        // if the value is not a valid ObjectId value we try as an integer then as a last resort, a string.
        mongojs.collection(collection).findOne({_id: parseInt(doc_id)}, function(err, doc) {
            if(doc){
                // doc_id is integer
                cb(null, parseInt(doc_id), doc);
            }else{
                mongojs.collection(collection).findOne({_id: doc_id}, function(err, doc) {
                    if(doc){
                        // doc_id is string
                        cb(null, doc_id, doc);
                    }else{
                        cb("Document not found", null, null);
                    }
                });
            }
        });
    }
}

// gets the Databases and collections
var get_sidebar_list = function(mongo_db, db_name, cb) {
    var mongojs = require('mongojs');
    var async = require('async');
    var db_obj = {};

    // if no DB is specified, we get all DBs and collections
    if(db_name == null){
        var adminDb = mongo_db.admin();
        adminDb.listDatabases(function (err, db_list) {
            async.forEachOf(db_list.databases, function (value, key, callback) {
                var skipped_dbs = ["null", "admin", "local"];
                if(skipped_dbs.indexOf(value.name) === -1){
                    var temp_db = mongojs(mongo_db.db(value.name));
                    temp_db.getCollectionNames(function(err, collections){
                        order_array(collections);
                        db_obj[value.name] = collections;
                        callback();
                    });
                }else{
                    callback();
                }
            }, function (err) {
                if (err) console.error(err.message);
                cb(null, order_object(db_obj));
            });
        });
    }else{
        var db = mongojs(mongo_db.db(db_name));
        db.getCollectionNames(function(err, collections){
            order_array(collections);
            db_obj[db_name] = collections;
            cb(null, db_obj);
        });
    }
};

// order the object by alpha key
function order_object(unordered){
    if(unordered != undefined){
        var ordered = {};
        var keys = Object.keys(unordered);
        order_array(keys);
        keys.forEach(function(key) {
            ordered[key] = unordered[key];
        });
    }
    return ordered;
}

function order_array(array){
    if(array){
        array.sort(function(a,b) {
            a = a.toLowerCase();
            b = b.toLowerCase();
            if( a == b) return 0;
            if( a > b) return 1;
            return -1;
        });
    }else{
        return array;
    }
}

// render the error page
function render_error(res, req, err, conn){
    var connection_list = req.nconf.connections.get('connections');

    var conn_string = "";
    if(connection_list[conn] != undefined){
        conn_string = connection_list[conn].connection_string;
    }

    res.render('error', {
        message: err,
        conn: conn,
        conn_string: conn_string,
        connection_list: order_object(connection_list)
    });
}

// only want the first 9 stats
function clean_stats(array){
    var accum = {};
    var i = 0;
    for (var key in array) {
        if(i <= 9){
            accum[key] = array[key];
        }
        i++;
    }
    return accum;
}

module.exports = router;
