var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
    var connection_list = req.nconf.get('connections');
    
    res.render('connections', {
        message: "",
        connection_list: order_object(connection_list),
        layout: "layout"
    });
});

router.get('/:conn', function (req, res, next) {
    var mongojs = require('mongojs');
    var helpers = req.handlebars.helpers;
    var connection_list = req.nconf.get('connections');
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
    
    // pick view to render based on whether a DB has been specified in conn string
    var view_to_render = "";
    if(uri.database){
        view_to_render = "db";
    }else{
        view_to_render = "conn";
    }
    
    // connect to DB
    mongodb.connect(conn_string, function (err, mongo_db) {
        if(err){
            console.error("Error connecting to database: " + err);
            render_error(res, req, err, req.params.conn);
        }else{
            var db = mongojs(mongo_db);
            db.stats(function (err, conn_stats) {
                db.runCommand({ usersInfo: 1 },function (err, conn_users) {
                    get_sidebar_list(mongo_db, uri.database, function(err, sidebar_list) {
                        get_db_list(uri, mongo_db, function(err, db_list) {
                            res.render(view_to_render, {
                                conn_list: order_object(connection_list),
                                conn_stats: clean_stats(conn_stats),
                                conn_name: req.params.conn,
                                conn_users: conn_users,
                                sidebar_list: sidebar_list,
                                db_list: db_list,
                                db_name: conn_stats.db,
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
    var connection_list = req.nconf.get('connections');
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
            db.stats(function (err, conn_stats) {
                get_sidebar_list(mongo_db, uri.database, function(err, sidebar_list) {
                    db.runCommand({ usersInfo: 1 },function (err, conn_users) {
                        db.getCollectionNames(function (err, collection_list) {
                            res.render('db', {
                                conn_name: req.params.conn,
                                conn_list: order_object(connection_list),
                                conn_stats: clean_stats(conn_stats),
                                conn_users: conn_users,
                                coll_list: collection_list.sort(),
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
router.get('/:conn/:db/:coll/view/', function (req, res, next) {
     res.redirect("/" + req.params.conn + "/" + req.params.db + "/" + req.params.coll + "/view/1");
});

router.get('/:conn/:db/:coll/view/:page_num/:key_val?/:value_val?', function (req, res, next) {
    var mongojs = require('mongojs');
    var helpers = req.handlebars.helpers;
    var connection_list = req.nconf.get('connections');
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
                                docs_per_page: 5,
                                helpers: helpers,
                                layout: "coll-layout"
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
    var connection_list = req.nconf.get('connections');
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
                                layout: "coll-layout",
                                editor: true
                            });
                        }
                    });
                });
            });
        }
    });
});

router.get('/:conn/:db/:coll/users', function (req, res, next) {
    var mongojs = require('mongojs');
    var helpers = req.handlebars.helpers;
    var connection_list = req.nconf.get('connections');
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

    mongodb.connect(connection_list[req.params.conn].connection_string, function (err, mongo_db) {
        if(err){
            console.error("Error connecting to database: " + err);
            render_error(res, req, err, req.params.conn);
        }else{
            var db = mongojs(mongo_db.db(req.params.db));
            db.getCollectionNames(function (err, collection_list) {
                db.runCommand({ usersInfo: 1 },function (err, conn_users) {
                    if (collection_list.indexOf(req.params.coll) === -1) {
                        console.error("No collection found");
                        render_error(res, req, "Collection does not exist", req.params.conn);
                    }else{
                        res.render('coll-users', {
                            conn_list: order_object(connection_list),
                            conn_name: req.params.conn,
                            db_name: req.params.db,
                            conn_users: conn_users,
                            coll_name: req.params.coll,
                            coll_list: collection_list.sort(),
                            helpers: helpers,
                            editor: true,
                            layout: "coll-layout"
                        });
                    }
                });
            });
        }
    });
});

router.get('/:conn/:db/:coll/new', function (req, res, next) {
    var mongojs = require('mongojs');
    var helpers = req.handlebars.helpers;
    var connection_list = req.nconf.get('connections');
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
                            editor: true,
                            layout: "coll-layout"
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
    var connection_list = req.nconf.get('connections');
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
                    db.collection(req.params.coll).findOne({_id: parse_doc_id(req.params.doc_id)}, function(err, coll_doc) {
                        if (collection_list.indexOf(req.params.coll) === -1) {
                            console.error("No collection found");
                            render_error(res, req, "Collection does not exist", req.params.conn);
                        }else if(coll_doc == undefined){
                            console.error("No document found");
                            render_error(res, req, "Document not found", req.params.conn);
                        }else{
                            res.render('coll-edit', {
                                conn_list: order_object(connection_list),
                                conn_name: req.params.conn,
                                db_name: req.params.db,
                                sidebar_list: sidebar_list,
                                coll_name: req.params.coll,        
                                coll_list: collection_list.sort(),
                                coll_doc: coll_doc,
                                helpers: helpers,
                                editor: true,
                                layout: "coll-layout"
                            });
                        }
                    });
                });
            });
        }
    });
});

// create a user
router.post('/:conn/:db/:coll/user_create', function (req, res, next) {
    var mongojs = require('mongojs');
    var connection_list = req.nconf.get('connections');
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
            
            // Add a user
            db.addUser({"user": req.body.username, "pwd": req.body.user_password, "roles": []}, function (err, user_name) {
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
    var connection_list = req.nconf.get('connections');
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
    var connection_list = req.nconf.get('connections');
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
    var connection_list = req.nconf.get('connections');
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
    var connection_list = req.nconf.get('connections');
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
    var connection_list = req.nconf.get('connections');
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
    var connection_list = req.nconf.get('connections');
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
    var connection_list = req.nconf.get('connections');
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
    var connection_list = req.nconf.get('connections');
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
    var connection_list = req.nconf.get('connections');
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
            
            // adding a new doc
            db.collection(req.params.coll).save(req.body, function (err, docs) {
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
    var connection_list = req.nconf.get('connections');
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

            // remove the _id form the body object so we set in query
            var doc_id = req.body['_id'];
            delete req.body['_id'];
            db.collection(req.params.coll).update({_id: parse_doc_id(doc_id)},req.body, function (err, doc, lastErrorObject) {   
                if(err){
                    console.error("Error updating document: " + err);
                    res.writeHead(400, { 'Content-Type': 'application/text' }); 
                    res.end('Error updating document: ' + err);
                }else{
                    if(doc['nModified'] == 0){
                        console.error('Error updating document: Document ID is incorrect');
                        res.writeHead(400, { 'Content-Type': 'application/text' }); 
                        res.end('Error updating document: Document ID is incorrect');
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
    var connection_list = req.nconf.get('connections');
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

            db.collection(req.params.coll).remove({_id: parse_doc_id(req.body.doc_id)}, function(err, docs){
                if(err){
                    console.error('Error deleting document: ' + err);
                    res.writeHead(400, { 'Content-Type': 'application/text' }); 
                    res.end('Error deleting document: ' + err);
                }else{
                    res.writeHead(200, { 'Content-Type': 'application/text' }); 
                    res.end('Document successfully deleted');
                }
            });
        }
    });
});

router.post('/add_config', function (req, res, next) {
    var nconf = req.nconf;
    var connection_list = nconf.get('connections');
    
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

    // save for ron
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
router.get('/api/:conn/:db/:coll/:page/:search_key?/:search_value?', function (req, res, next) {
    var mongojs = require('mongojs');
    var connection_list = req.nconf.get('connections');
    var mongodb = require('mongodb').MongoClient;
    
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
            res.json(500, err);
        }
            
        var db = mongojs(mongo_db.db(req.params.db));
        
        var page_size = 5;
        var page = 1;
        
        if(req.params.page != undefined){
            page = parseInt(req.params.page);
        }
        
        // build the search query if the variables are present
        var query_obj = {};
        var key_val = req.params.search_key;
        var value_val = req.params.search_value;
        if(key_val != undefined && value_val != undefined){
            if(key_val == "_id"){
                query_obj[key_val] = parse_doc_id(value_val);
            }else{
                query_obj[key_val] = value_val;
            }
        }

        var skip = 0;
        if(page > 1){
            skip = (page - 1) * page_size
        }
        
        var limit = page_size;

        db.collection(req.params.coll).find(query_obj).limit(limit).skip(skip, function (err, data) {
            if (err) {
                res.json(500, err);
            }
            else {
                res.json({
                    data: data
                });
            }
        });
    });
});

// gets the Databases
var get_db_list = function(uri, mongo_db, cb) {
    var async = require('async');
    var adminDb = mongo_db.admin();
    var db_obj = [];
    
    // if a DB is not specified in the Conn string we try get a list
    if(uri.database == undefined){ 
        // try go all admin and get the list of DB's
        adminDb.listDatabases(function (err, db_list) {
            if(db_list != undefined){
                async.forEachOf(db_list.databases, function (value, key, callback) {
                    var skipped_dbs = ["null", "admin", "local"];
                    if(skipped_dbs.indexOf(value.name) === -1){
                        db_obj.push(value.name);
                    }
                    callback();
                }, function (err) {
                    if (err) console.error(err.message);
                    cb(null, db_obj);
                });
            }else{
                cb(null, null);
            }
        });
    }else{
        cb(null, null);
    }
};

// gets the Databases and collections
var get_sidebar_list = function(mongo_db, db_name, cb) {
    var mongojs = require('mongojs');
    var async = require('async');
    var db_obj = {};
    
    // if no DB is specified, we get all DBs and collections
    if(db_name == null){
        var adminDb = mongo_db.admin();
        adminDb.listDatabases(function (err, db_list) {
            async.forEachOf(order_object(db_list.databases), function (value, key, callback) {
                var skipped_dbs = ["null", "admin", "local"];
                if(skipped_dbs.indexOf(value.name) === -1){
                    var temp_db = mongojs(mongo_db.db(value.name));
                    temp_db.getCollectionNames(function(err, collections){
                        db_obj[value.name] = collections.sort();
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
            db_obj[db_name] = collections;
            cb(null, db_obj);
        });
    }
};

// order the object by alpha key
function order_object(unordered){
    if(unordered != undefined){
        var ordered = {};
        Object.keys(unordered).sort().forEach(function(key) {
            ordered[key] = unordered[key];
        });
    }
    return ordered;
}

// check if is int
function isInt(value) {
  return !isNaN(value) && (function(x) { return (x | 0) === x; })(parseFloat(value))
}

// render the error page
function render_error(res, req, err, conn){
    var connection_list = req.nconf.get('connections');
    
    var conn_string = "";
    if(connection_list[conn] != undefined){
        conn_string = connection_list[conn].connection_string;
    }

    res.render('error', {
        message: err,
        conn: conn,
        conn_string: conn_string,
        connection_list: order_object(connection_list),
        layout: "layout"
    });
}

// Some MongoDB's are going to have _id fields which are not
// MongoDB ObjectID's. In cases like this, we cannot cast all _id
// as a ObjectID in the query. We can run a ObjectID.isValid() check
// to determine whether it is an ObjectID (most likely), then we check
// if we can parse it as an integer (second most likely), then we check
// for a string. Is someone has a better way of doing this (I'm sure someone does)
// please submit fix and submit a pull request.
function parse_doc_id(value){
    var ObjectID = require('mongodb').ObjectID;
    if(ObjectID.isValid(value) == true){
        return new ObjectID(value);
    }else if (isInt(value) == true){
       return parseInt(value);
    }else{
        return value;
    }
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