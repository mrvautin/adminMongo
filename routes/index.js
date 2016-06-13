var express = require('express');
var router = express.Router();
var _ = require('lodash');

// runs on all routes and checks password if one is setup
router.all("/*", checkLogin, function(req, res, next) {
    next(); 
});

// the home route
router.get('/', function (req, res, next) {
    var connection_list = req.nconf.connections.get('connections');
	if(connection_list){
        // we have a connection and redirect to the first
        var first_conn = Object.keys(connection_list)[0];
        res.redirect(req.app.locals.app_context + "/" + first_conn);
    }else{
        // go to connection setup
        res.redirect(req.app.locals.app_context + '/connection_list');
    }
});

// login page
router.get('/login', function (req, res, next) {
    var passwordConf = req.nconf.app.get('app');
    
    // if password is set then render the login page, else continue 
    if(passwordConf && passwordConf.hasOwnProperty("password")){
        res.render('login', {
            message: "",
            helpers: req.handlebars.helpers
        });
    }else{
        res.redirect(req.app.locals.app_context + '/');
    }
});

// logout
router.get('/logout', function (req, res, next) {
    req.session.loggedIn = null;
    res.redirect(req.app.locals.app_context + '/');
});

// login page
router.post('/login_action', function (req, res, next) {
    var passwordConf = req.nconf.app.get('app');

    if(passwordConf && passwordConf.hasOwnProperty("password")){
        if(req.body.inputPassword == passwordConf.password){
            // password is ok, go to home
            req.session.loggedIn = true;
            res.redirect(req.app.locals.app_context + '/');
        }else{
            // password is wrong. Show login form with a message
            res.render('login', {
                message: "Password is incorrect",
                helpers: req.handlebars.helpers
            });
        }
    }else{
        res.redirect(req.app.locals.app_context + '/');
    }
});

// show/manage connections
router.get('/connection_list', function (req, res, next) {
    var connection_list = req.nconf.connections.get('connections');

    res.render('connections', {
        message: "",
        connection_list: order_object(connection_list),
        helpers: req.handlebars.helpers,
    });
});

router.get('/:conn', function (req, res, next) {
    var connection_list = req.app.locals.dbConnections;
    var MongoURI = require('mongo-uri');

    // if no connection found
    if(connection_list == undefined || Object.keys(connection_list).length == 0){
        res.redirect(req.app.locals.app_context + "/");
        return;
    }

    // parse the connection string to get DB
    var conn_string = connection_list[req.params.conn].connString;
    var uri = MongoURI.parse(conn_string);

    // If there is a DB in the connection string, we redirect to the DB level
    if(uri.database){
        res.redirect(req.app.locals.app_context + "/" +  req.params.conn + "/" + uri.database);
        return;
    }

    // Get DB's form pool
    var mongo_db = connection_list[req.params.conn].native;

    get_db_stats(mongo_db, uri.database, function(err, db_stats){
        get_sidebar_list(mongo_db, uri.database, function(err, sidebar_list) {
            get_db_list(uri, mongo_db, function(err, db_list) {
                res.render('conn', {
                    conn_list: order_object(connection_list),
                    db_stats: db_stats,
                    conn_name: req.params.conn,
                    sidebar_list: sidebar_list,
                    db_list: db_list,
                    helpers: req.handlebars.helpers,
                    session: req.session
                });
            });
        });
    });
});

router.get('/:conn/:db', function (req, res, next) {
    var connection_list = req.app.locals.dbConnections;

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        render_error(res, req, req.i18n.__("Invalid connection name"), req.params.conn);
        return;
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        render_error(res, req, req.i18n.__("Invalid database name"), req.params.conn);
        return;
    }
    // Get DB's form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    // do DB stuff
    get_db_stats(mongo_db, req.params.db, function(err, db_stats){
        get_sidebar_list(mongo_db, req.params.db, function(err, sidebar_list) {
            mongo_db.command({ usersInfo: 1 },function (err, conn_users) {
                mongo_db.listCollections().toArray(function(err, collection_list){
                    res.render('db', {
                        conn_name: req.params.conn,
                        conn_list: order_object(connection_list),
                        db_stats: db_stats,
                        conn_users: conn_users,
                        coll_list: cleanCollections(collection_list),
                        db_name: req.params.db,
                        show_db_name: true,
                        sidebar_list: sidebar_list,
                        helpers: req.handlebars.helpers,
                        session: req.session
                    });
                });
            });
        });
    });
});

// redirect to page 1
router.get('/:conn/:db/:coll/', function (req, res, next) {
     res.redirect(req.app.locals.app_context + "/" + req.params.conn + "/" + req.params.db + "/" + req.params.coll + "/view/1");
});

// redirect to page 1
router.get('/:conn/:db/:coll/view/', function (req, res, next) {
     res.redirect(req.app.locals.app_context + "/" + req.params.conn + "/" + req.params.db + "/" + req.params.coll + "/view/1");
});

router.get('/:conn/:db/:coll/view/:page_num/:key_val?/:value_val?', function (req, res, next) {
    var connection_list = req.app.locals.dbConnections;
    var docs_per_page = req.nconf.app.get('app:docs_per_page') != undefined ? req.nconf.app.get('app:docs_per_page') : 5;

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        render_error(res, req, req.i18n.__("Invalid connection name"), req.params.conn);
        return;
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        render_error(res, req, req.i18n.__("Invalid database name"), req.params.conn);
        return;
    }

    // Get DB's form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    // do DB stuff
    mongo_db.listCollections().toArray(function(err, collection_list){
        // clean up the collection list
        collection_list = cleanCollections(collection_list);
        get_sidebar_list(mongo_db, req.params.db, function(err, sidebar_list) {
            mongo_db.db(req.params.db).collection(req.params.coll).count(function (err, coll_count) {
                if (collection_list.indexOf(req.params.coll) === -1) {
                    render_error(res, req, "Collection does not exist", req.params.conn);
                }else{
                    res.render('coll-view', {
                        conn_list: order_object(req.nconf.connections.get('connections')),
                        conn_name: req.params.conn,
                        db_name: req.params.db,
                        coll_name: req.params.coll,
                        coll_count: coll_count,
                        page_num: req.params.page_num,
                        key_val: req.params.key_val,
                        value_val: req.params.value_val,
                        sidebar_list: sidebar_list,
                        docs_per_page: docs_per_page,
                        helpers: req.handlebars.helpers,
                        paginate: true,
                        editor: true,
                        session: req.session
                    });
                }
            });
        });
    });
});

router.get('/:conn/:db/:coll/indexes', function (req, res, next) {
    var connection_list = req.app.locals.dbConnections;

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        render_error(res, req, req.i18n.__("Invalid connection name"), req.params.conn);
        return;
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        render_error(res, req, req.i18n.__("Invalid database name"), req.params.conn);
        return;
    }

    // Get DB's form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    // do DB stuff
    mongo_db.listCollections().toArray(function(err, collection_list){
        // clean up the collection list
        collection_list = cleanCollections(collection_list);
        mongo_db.collection(req.params.coll).indexes(function (err, coll_indexes) {
            get_sidebar_list(mongo_db, req.params.db, function(err, sidebar_list) {
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
                        sidebar_list: sidebar_list,
                        helpers: req.handlebars.helpers,
                        editor: true,
                        session: req.session
                    });
                }
            });
        });
    });
});

router.get('/:conn/:db/:coll/new', function (req, res, next) {
    var connection_list = req.app.locals.dbConnections;

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        render_error(res, req, req.i18n.__("Invalid connection name"), req.params.conn);
        return;
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        render_error(res, req, req.i18n.__("Invalid database name"), req.params.conn);
        return;
    }

    // Get DB form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    // do DB stuff
    mongo_db.listCollections().toArray(function(err, collection_list){
        // clean up the collection list
        collection_list = cleanCollections(collection_list);
        get_sidebar_list(mongo_db, req.params.db, function(err, sidebar_list) {
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
                    helpers: req.handlebars.helpers,
                    editor: true,
                    session: req.session
                });
            }
        });
    });
});

// create a user
router.post('/:conn/:db/:coll/user_create', function (req, res, next) {
    var connection_list = req.app.locals.dbConnections;

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end(req.i18n.__('Invalid connection name'));
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end(req.i18n.__('Invalid database name'));
    }

    // Get DB's form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    // do DB stuff
    var roles = req.body.roles_text ? req.body.roles_text.split(/\s*,\s*/) : [];

    // Add a user
    mongo_db.addUser(req.body.username, req.body.user_password, {"roles": roles}, function (err, user_name) {
        if(err){
            console.error('Error creating user: ' + err);
            res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end(req.i18n.__('Error creating user') + ': ' + err);
        }else{
            res.writeHead(200, { 'Content-Type': 'application/text' });
            res.end(req.i18n.__('User successfully created'));
        }
    });
});

// delete a user
router.post('/:conn/:db/:coll/user_delete', function (req, res, next) {
    var connection_list = req.app.locals.dbConnections;

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end(req.i18n.__('Invalid connection name'));
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end(req.i18n.__('Invalid database name'));
    }

    // Get DB form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    // remove a user
    mongo_db.removeUser(req.body.username, function (err, user_name) {
        if(err){
            console.error('Error deleting user: ' + err);
            res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end(req.i18n.__('Error deleting user') + ': ' + err);
        }else{
            res.writeHead(200, { 'Content-Type': 'application/text' });
            res.end(req.i18n.__('User successfully deleted'));
        }
    });  
});

// rename a collection
router.post('/:conn/:db/:coll/coll_name_edit', function (req, res, next) {
    var connection_list = req.app.locals.dbConnections;

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end(req.i18n.__('Invalid connection name'));
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end(req.i18n.__('Invalid database name'));
    }

    // Get DB form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    // change a collection name
    mongo_db.collection(req.params.coll).rename(req.body.new_collection_name, {"dropTarget": false} , function (err, coll_name) {
        if(err){
            console.error('Error renaming collection: ' + err);
            res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end(req.i18n.__('Error renaming collection') + ': ' + err);
        }else{
            res.writeHead(200, { 'Content-Type': 'application/text' });
            res.end(req.i18n.__('Collection successfully renamed'));
        }
    });
});

// create a new collection index
router.post('/:conn/:db/:coll/create_index', function (req, res, next) {
    var connection_list = req.app.locals.dbConnections;

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end(req.i18n.__('Invalid connection name'));
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end(req.i18n.__('Invalid database name'));
    }

    // Get DB form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    // adding a new collection
    var unique_bool = (req.body[1] === 'true');
    var sparse_bool = (req.body[2] === 'true');
    var options = {unique: unique_bool, background:true, sparse: sparse_bool};
    mongo_db.collection(req.params.coll).createIndex(JSON.stringify(req.body[0]), options, function (err, index) {
        if(err){
            console.error('Error creating index: ' + err);
            res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end(req.i18n.__('Error creating index') + ': ' + err);
        }else{
            res.writeHead(200, { 'Content-Type': 'application/text' });
            res.end(req.i18n.__('Index successfully created'));
        }
    });
});

// create a new collection index
router.post('/:conn/:db/:coll/drop_index', function (req, res, next) {
    var connection_list = req.app.locals.dbConnections;

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end(req.i18n.__('Invalid connection name'));
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end(req.i18n.__('Invalid database name'));
    }
    
    // Get DB form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    // adding a new index
    mongo_db.collection(req.params.coll).indexes(function(err, indexes) {
        mongo_db.collection(req.params.coll).dropIndex(indexes[req.body.index].name, function (err, index) {
            if(err){
                console.error('Error dropping Index: ' + err);
                res.writeHead(400, { 'Content-Type': 'application/text' });
                res.end(req.i18n.__('Error dropping Index') + ': ' + err);
            }else{
                res.writeHead(200, { 'Content-Type': 'application/text' });
                res.end(req.i18n.__('Index successfully dropped'));
            }
        });
    });
});

// create a new collection
router.post('/:conn/:db/coll_create', function (req, res, next) {
    var connection_list = req.app.locals.dbConnections;

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end(req.i18n.__('Invalid connection name'));
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end(req.i18n.__('Invalid database name'));
    }
    
    // Get DB form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    // adding a new collection
    mongo_db.createCollection(req.body.collection_name, function (err, coll) {
        if(err){
            console.error('Error creating collection: ' + err);
            res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end(req.i18n.__('Error creating collection') + ': ' + err);
        }else{
            res.writeHead(200, { 'Content-Type': 'application/text' });
            res.end(req.i18n.__('Collection successfully created'));
        }
    });   
});

// delete a collection
router.post('/:conn/:db/coll_delete', function (req, res, next) {
    var connection_list = req.app.locals.dbConnections;

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end(req.i18n.__('Invalid connection name'));
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end(req.i18n.__('Invalid database name'));
    }
    
    // Get DB form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);
    
    // delete a collection
    mongo_db.dropCollection(req.body.collection_name, function (err, coll) {
        if(err){
            console.error('Error deleting collection: ' + err);
            res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end(req.i18n.__('Error deleting collection') + ': ' + err);
        }else{
            res.writeHead(200, { 'Content-Type': 'application/text' });
            res.end(req.i18n.__('Collection successfully deleted'));
        }
    });
});

// create a new database
router.post('/:conn/db_create', function (req, res, next) {
    var connection_list = req.app.locals.dbConnections;

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end(req.i18n.__('Invalid connection'));
    }

    // Get DB form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.body.db_name);

    // adding a new collection to create the DB
    mongo_db.collection("test").save({}, function (err, docs) {
        if(err){
            console.error('Error creating database: ' + err);
            res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end(req.i18n.__('Error creating database') + ': ' + err);
        }else{
            res.writeHead(200, { 'Content-Type': 'application/text' });
            res.end(req.i18n.__('Database successfully created'));
        }
    });
});

// delete a database
router.post('/:conn/db_delete', function (req, res, next) {
    var connection_list = req.app.locals.dbConnections;

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end(req.i18n.__('Invalid connection'));
    }

    // Get DB form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.body.db_name);

    // delete a collection
    mongo_db.dropDatabase(function(err, result) {
        if(err){
            console.error('Error deleting database: ' + err);
            res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end(req.i18n.__('Error deleting database') + ': ' + err);
        }else{
            res.writeHead(200, { 'Content-Type': 'application/text' });
            res.end(req.i18n.__('Database successfully deleted'));
        }
    });
});

router.post('/:conn/:db/:coll/insert_doc', function (req, res, next) {
    var connection_list = req.app.locals.dbConnections;
    var ejson = require('mongodb-extended-json');

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end(req.i18n.__('Invalid connection name'));
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end(req.i18n.__('Invalid database name'));
    }
    
    // Get DB form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    try {
        var eJsonData = ejson.parse(req.body.objectData);
    }catch (e) {
        console.error("Syntax error: " + e);
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end(req.i18n.__('Syntax error. Please check the syntax'));
        return;
    }

    // adding a new doc
    mongo_db.collection(req.params.coll).save(eJsonData, function (err, docs) {
        if(err){
            console.error('Error inserting document: ' + err);
            res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end(req.i18n.__('Error inserting document') + ': ' + err);
        }else{
            res.writeHead(200, { 'Content-Type': 'application/text' });
            res.end(req.i18n.__('Document successfully added'));
        }
    });
});

router.get('/:conn/:db/:coll/edit/:doc_id', function (req, res, next) {
    var connection_list = req.app.locals.dbConnections;
    var bsonify = require('./bsonify');

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        render_error(res, req, req.i18n.__("Invalid connection name"), req.params.conn);
        return;
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        render_error(res, req, req.i18n.__("Invalid database name"), req.params.conn);
        return;
    }

    // Get DB's form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    // do DB stuff
    mongo_db.listCollections().toArray(function(err, collection_list){
        // clean up the collection list
        collection_list = cleanCollections(collection_list);
        get_sidebar_list(mongo_db, req.params.db, function(err, sidebar_list) {
            get_id_type(mongo_db, req.params.coll, req.params.doc_id, function(err, doc_id_type, doc) {
                if(doc == undefined){
                    console.error("No document found");
                    render_error(res, req, req.i18n.__("Document not found"), req.params.conn);
                    return;
                }
                if(err){
                    console.error("No document found");
                    render_error(res, req, req.i18n.__("Document not found"), req.params.conn);
                    return;
                }

                res.render('coll-edit', {
                    conn_name: req.params.conn,
                    db_name: req.params.db,
                    sidebar_list: sidebar_list,
                    coll_name: req.params.coll,
                    coll_doc: bsonify.stringify(doc, null, '    '),
                    helpers: req.handlebars.helpers,
                    editor: true,
                    session: req.session
                });
            });
        });
    });
});

router.post('/:conn/:db/:coll/edit_doc', function (req, res, next) {
    var connection_list = req.app.locals.dbConnections;
    var ejson = require('mongodb-extended-json');

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end(req.i18n.__('Invalid connection name'));
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end(req.i18n.__('Invalid database name'));
    }
    
    // Get DB's form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    try {
        var eJsonData = ejson.parse(req.body.objectData);
    }catch (e) {
        console.error("Syntax error: " + e);
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end(req.i18n.__('Syntax error. Please check the syntax'));
        return;
    }

    mongo_db.collection(req.params.coll).save(eJsonData, function (err, doc, lastErrorObject) {
        if(err){
            console.error("Error updating document: " + err);
            res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end(req.i18n.__('Error updating document') + ': ' + err);
        }else{
            if(doc['nModified'] == 0){
                console.error('Error updating document: Document ID is incorrect');
                res.writeHead(400, { 'Content-Type': 'application/text' });
                res.end(req.i18n.__('Error updating document: Syntax error'));
            }else{
                res.writeHead(200, { 'Content-Type': 'application/text' });
                res.end(req.i18n.__('Document successfully updated'));
            }
        }
    });
});

router.post('/:conn/:db/:coll/doc_delete', function (req, res, next) {
    var connection_list = req.app.locals.dbConnections;

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end(req.i18n.__('Invalid connection name'));
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end(req.i18n.__('Invalid database name'));
    }
    
    // Get DB's form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);
    get_id_type(mongo_db, req.params.coll, req.body.doc_id, function(err, doc_id_type, doc) {
        if(doc){
            mongo_db.collection(req.params.coll).remove({_id: doc_id_type}, function(err, docs){
                if(err){
                    console.error('Error deleting document: ' + err);
                    res.writeHead(400, { 'Content-Type': 'application/text' });
                    res.end(req.i18n.__('Error deleting document') + ': ' + err);
                }else{
                    res.writeHead(200, { 'Content-Type': 'application/text' });
                    res.end(req.i18n.__('Document successfully deleted'));
                }
            });
        }else{
            console.error('Error deleting document: ' + err);
            res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end(req.i18n.__('Cannot find document by Id'));
        }
    });
});

router.post('/add_config', function (req, res, next) {
    var nconf = req.nconf.connections;
    var MongoURI = require('mongo-uri');
    var connPool = require('../connections');
    var connection_list = req.nconf.connections.get('connections');

    // check if name already exists
    if(connection_list != undefined){
        if(connection_list[req.body[0]] != undefined){
            res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end(req.i18n.__('Config error: A connection by that name already exists'));
            return;
        }
    }

    // try parse uri string. If pass, add, else throw an error
    try {
        uri = MongoURI.parse(req.body[1]);

        // try add the connection
        connPool.addConnection({connName: req.body[0], connString: req.body[1]}, req.app, function(err, data){
            if(err){
                console.error('DB Connect error: ' + err);
                res.writeHead(400, { 'Content-Type': 'application/text' });
                res.end(req.i18n.__('Config error') +': ' + err);
            }else{
                // set the new config
                nconf.set('connections:' + req.body[0], {"connection_string": req.body[1]});

                // save for ron
                nconf.save(function (err) {
                    if(err){
                        console.error('Config error: ' + err);
                        res.writeHead(400, { 'Content-Type': 'application/text' });
                        res.end(req.i18n.__('Config error') +': ' + err);
                    }else{
                        res.writeHead(200, { 'Content-Type': 'application/text' });
                        res.end(req.i18n.__('Config successfully added'));
                    }
                });
            }
        });
    }catch(err) {
        console.error('Config error: ' + err);
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end(req.i18n.__('Config error') +': ' + err);
    }
});

router.post('/update_config', function (req, res, next) {
    var nconf = req.nconf.connections;
    var connPool = require('../connections');
    var MongoURI = require('mongo-uri');

    // try parse uri string. If pass, add, else throw an error
    try {
        uri = MongoURI.parse(req.body.conn_string);

        // try add the connection
        connPool.addConnection({connName: req.body.conn_name, connString: req.body.conn_string}, req.app, function(err, data){
            if(err){
                console.error('DB Connect error: ' + err);
                res.writeHead(400, { 'Content-Type': 'application/text' });
                res.end(req.i18n.__('Config error') +': ' + err);
            }else{
                // delete current config
                delete nconf.store.connections[req.body.curr_config];

                // set the new
                nconf.set('connections:' + req.body.conn_name, { 'connection_string':  req.body.conn_string});

                // save for ron
                nconf.save(function (err) {
                    if(err){
                        console.error('Config error1: ' + err);
                        res.writeHead(400, { 'Content-Type': 'application/text' });
                        res.end(req.i18n.__('Config error') + ': ' + err);
                    }else{
                        res.writeHead(200, { 'Content-Type': 'application/text' });
                        res.end(req.i18n.__('Config successfully updated'));
                    }
                });
            }
        });
    }catch(err) {
        console.error('Config error2: ' + err);
        res.writeHead(400, { 'Content-Type': 'application/text' });
        res.end(req.i18n.__('Config error') +': ' + err);
    }   
});

router.post('/drop_config', function (req, res, next) {
    var nconf = req.nconf.connections;

    // delete current config
    delete nconf.store.connections[req.body.curr_config];

    // save config
    nconf.save(function (err) {
        if(err){
            console.error('Config error: ' + err);
            res.writeHead(400, { 'Content-Type': 'application/text' });
            res.end(req.i18n.__('Config error') + ': ' + err);
        }else{
            res.writeHead(200, { 'Content-Type': 'application/text' });
            res.end(req.i18n.__('Config successfully deleted'));
        }
    });
});

// pagination API
router.post('/api/:conn/:db/:coll/:page', function (req, res, next) {
    var connection_list = req.app.locals.dbConnections;
    var ejson = require('mongodb-extended-json');
    var docs_per_page = req.nconf.app.get('app:docs_per_page') != undefined ? req.nconf.app.get('app:docs_per_page') : 5;
   
    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        res.writeHead(500, { 'Content-Type': 'application/text' });
        res.end(req.i18n.__('Invalid connection name'));
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        res.writeHead(500, { 'Content-Type': 'application/text' });
        res.end(req.i18n.__('Invalid database name'));
    }

    // Get DB's form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

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
    mongo_db.collection(req.params.coll).find(query_obj, {skip: skip, limit: limit}).toArray(function(err, result) {
        if (err) {
            console.error(err);
            res.status(500).json(err);
        }else{
            mongo_db.collection(req.params.coll).find(query_obj, {skip: skip, limit: limit}).toArray(function(err, simpleSearchFields) {
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
                mongo_db.collection(req.params.coll).count(query_obj, function (err, doc_count) {
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

router.get('/:conn/:db/:coll/export/:excludedID?', function (req, res, next) {
    var connection_list = req.app.locals.dbConnections;

    // Check for existance of connection
    if(connection_list[req.params.conn] == undefined){
        render_error(res, req, req.i18n.__("Invalid connection name"), req.params.conn);
        return;
    }

    // Validate database name
    if (req.params.db.indexOf(" ") > -1){
        render_error(res, req, req.i18n.__("Invalid database name"), req.params.conn);
        return;
    }

    // exclude _id from export
    var exportID = {};
    if(req.params.excludedID === "true"){
        exportID = {"_id": 0};
    }
    
    // Get DB's form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    mongo_db.collection(req.params.coll).find({},exportID).toArray(function(err, data) {
        if(data != ""){
            res.set({"Content-Disposition":"attachment; filename=" + req.params.coll + ".json"});
            res.send(JSON.stringify(data, null, 2));
        }else{
            render_error(res, req, req.i18n.__("Export error: Collection not found"), req.params.conn);
        }
    });
});

// gets the db stats
var get_db_stats = function(mongo_db, db_name, cb) {
    var async = require('async');
    var db_obj = {};

    // if at connection level we loop db's and collections
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
                        var tempDBName = value.name;
                        mongo_db.db(tempDBName).listCollections().toArray(function(err, coll_list){
                            var coll_obj = {};
                            async.forEachOf(cleanCollections(coll_list), function (value, key, callback) {
                                mongo_db.db(tempDBName).collection(value).stats(function(err, coll_stat){
                                    coll_obj[value] = {Storage: coll_stat.size, Documents: coll_stat.count};
                                    callback();
                                });
                            }, function (err) {
                            if (err) console.error(err.message);
                                // add the collection object to the DB object with the DB as key
                                db_obj[value.name] = order_object(coll_obj);
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
        mongo_db.db(db_name).listCollections().toArray(function(err, coll_list){
            var coll_obj = {};
            async.forEachOf(cleanCollections(coll_list), function (value, key, callback) {
                mongo_db.db(db_name).collection(value).stats(function(err, coll_stat){
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
// the _id string is a valid MongoDb ObjectId but this does not guarantee it is stored as an ObjectId in the DB. It's most likely
// the value will be an ObjectId (hopefully) so we try that first then go from there
var get_id_type = function(mongo, collection, doc_id, cb) {

    var ObjectID = require('mongodb').ObjectID;
    // if a valid ObjectId we try that, then then try as a string
    if(ObjectID.isValid(doc_id)){
        mongo.collection(collection).findOne({_id: ObjectID(doc_id)}, function(err, doc) {
            if(doc){
                // doc_id is an ObjectId
                cb(null, ObjectID(doc_id), doc);
            }else{
                mongo.collection(collection).findOne({_id: doc_id}, function(err, doc) {
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
        mongo.collection(collection).findOne({_id: parseInt(doc_id)}, function(err, doc) {
            if(doc){
                // doc_id is integer
                cb(null, parseInt(doc_id), doc);
            }else{
                mongo.collection(collection).findOne({_id: doc_id}, function(err, doc) {
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
    var async = require('async');
    var db_obj = {};

    // if no DB is specified, we get all DBs and collections
    if(db_name == null){
        var adminDb = mongo_db.admin();
        adminDb.listDatabases(function (err, db_list) {
            async.forEachOf(db_list.databases, function (value, key, callback) {
                var skipped_dbs = ["null", "admin", "local"];
                if(skipped_dbs.indexOf(value.name) === -1){
                    mongo_db.db(value.name).listCollections().toArray(function(err, collections){
                        collections = cleanCollections(collections);
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
        mongo_db.db(db_name).listCollections().toArray(function(err, collections){
            collections = cleanCollections(collections);
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
        connection_list: order_object(connection_list),
        helpers: req.handlebars.helpers
    });
}

// checks for the password in the /config/app.json file if it's set
function checkLogin(req, res, next) {
    var passwordConf = req.nconf.app.get('app');

    // only check for login if a password is specified in the /config/app.json file
    if(passwordConf && passwordConf.hasOwnProperty("password")){
        // dont require login session for login route
        if(req.path == "/login" || req.path == "/logout" || req.path == "/login_action"){
            next();
        }else{
            // if the session exists we continue, else renter login page
            if (req.session.loggedIn) {
                next(); // allow the next route to run
            } else {
                res.redirect("login");
            }
        }
    }else{
        // no password is set so we continue
        next();
    }
}

function cleanCollections(collection_list){
    var list = [];
    _.each(collection_list, function(item){
        list.push(item.name);
    });
    return list;
}

module.exports = router;
