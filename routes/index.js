var express = require('express');
var router = express.Router();
var _ = require('lodash');
var common = require('./common');

// runs on all routes and checks password if one is setup
router.all('/*', common.checkLogin, function (req, res, next){
    next();
});

// redirect to "/app" on home route
router.all('/', common.checkLogin, function (req, res, next){
    res.redirect(req.app_context + '/app/');
});

// runs on all routes and checks password if one is setup
router.all('/app/*', common.checkLogin, function (req, res, next){
    next();
});

// the home route
router.get('/app/', function (req, res, next){
    var connection_list = req.nconf.connections.get('connections');

    if(connection_list){
        if(Object.keys(connection_list).length > 0){
            // we have a connection and redirect to the first
            var first_conn = Object.keys(connection_list)[0];
            res.redirect(req.app_context + '/app/' + first_conn);
            return;
        }
    }
    // if no connections, go to connection setup
    res.redirect(req.app_context + '/app/connection_list');
    return;
});

// login page
router.get('/app/login', function (req, res, next){
    var passwordConf = req.nconf.app.get('app');

    // if password is set then render the login page, else continue
    if(passwordConf && passwordConf.hasOwnProperty('password')){
        res.render('login', {
            message: '',
            helpers: req.handlebars.helpers
        });
    }else{
        res.redirect(req.app_context + '/');
    }
});

// logout
router.get('/app/logout', function (req, res, next){
    req.session.loggedIn = null;
    res.redirect(req.app_context + '/app');
});

// login page
router.post('/app/login_action', function (req, res, next){
    var passwordConf = req.nconf.app.get('app');

    if(passwordConf && passwordConf.hasOwnProperty('password')){
        if(req.body.inputPassword === passwordConf.password){
            // password is ok, go to home
            req.session.loggedIn = true;
            res.redirect(req.app_context + '/');
        }else{
            // password is wrong. Show login form with a message
            res.render('login', {
                message: 'Password is incorrect',
                helpers: req.handlebars.helpers
            });
        }
    }else{
        res.redirect(req.app_context + '/');
    }
});

// Show/manage connections
router.get('/app/connection_list', function (req, res, next){
    var connection_list = req.nconf.connections.get('connections');

    res.render('connections', {
        message: '',
        editor: true,
        connection_list: common.order_object(connection_list),
        helpers: req.handlebars.helpers
    });
});

// Show server monitoring
router.get('/app/monitoring/:conn/', function (req, res, next){
    var monitoringMessage = '';
    var monitoringRequired = true;
    if(req.nconf.app.get('app:monitoring') === false){
        monitoringRequired = false;
        monitoringMessage = 'Monitoring has been switched off in the config. Please enable or remove if you want this feature.';
    }

    res.render('monitoring', {
        message: monitoringMessage,
        monitoring: monitoringRequired,
        conn_name: req.params.conn,
        helpers: req.handlebars.helpers
    });
});

// The base connection route showing all DB's for connection
router.get('/app/:conn', function (req, res, next){
    var connection_list = req.app.locals.dbConnections;
    var MongoURI = require('mongo-uri');

    // if no connection found
    if(!connection_list || Object.keys(connection_list).length === 0){
        res.redirect(req.app_context + '/app');
        return;
    }

    // Check for existance of connection
    if(connection_list[req.params.conn] === undefined){
        common.render_error(res, req, req.i18n.__('Invalid connection name'), req.params.conn);
        return;
    }

    // parse the connection string to get DB
    var conn_string = connection_list[req.params.conn].connString;
    var uri = MongoURI.parse(conn_string);

    // If there is a DB in the connection string, we redirect to the DB level
    if(uri.database){
        res.redirect(req.app_context + '/app/' + req.params.conn + '/' + uri.database);
        return;
    }

    // Get DB's form pool
    var mongo_db = connection_list[req.params.conn].native;

    common.get_db_status(mongo_db, function (err, db_status){
        common.get_backups(function(err, backup_list){
            common.get_db_stats(mongo_db, uri.database, function (err, db_stats){
                common.get_sidebar_list(mongo_db, uri.database, function (err, sidebar_list){
                    common.get_db_list(uri, mongo_db, function (err, db_list){
                        res.render('conn', {
                            conn_list: common.order_object(connection_list),
                            db_stats: db_stats,
                            db_status: db_status,
                            conn_name: req.params.conn,
                            sidebar_list: sidebar_list,
                            db_list: db_list,
                            backup_list: backup_list,
                            helpers: req.handlebars.helpers,
                            session: req.session
                        });
                    });
                });
            });
        });
    });
});

// The base route at the DB level showing all collections for DB
router.get('/app/:conn/:db', function (req, res, next){
    var connection_list = req.app.locals.dbConnections;

    // Check for existance of connection
    if(connection_list[req.params.conn] === undefined){
        common.render_error(res, req, req.i18n.__('Invalid connection name'), req.params.conn);
        return;
    }

    // Validate database name
    if(req.params.db.indexOf(' ') > -1){
        common.render_error(res, req, req.i18n.__('Invalid database name'), req.params.conn);
        return;
    }
    // Get DB's form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    // do DB stuff
    common.get_db_stats(mongo_db, req.params.db, function (err, db_stats){
        common.get_sidebar_list(mongo_db, req.params.db, function (err, sidebar_list){
            mongo_db.command({usersInfo: 1}, function (err, conn_users){
                mongo_db.listCollections().toArray(function (err, collection_list){
                    res.render('db', {
                        conn_name: req.params.conn,
                        conn_list: common.order_object(connection_list),
                        db_stats: db_stats,
                        conn_users: conn_users,
                        coll_list: common.cleanCollections(collection_list),
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

// Pagination redirect to page 1
router.get('/app/:conn/:db/:coll/', function (req, res, next){
    res.redirect(req.app_context + '/app/' + req.params.conn + '/' + req.params.db + '/' + req.params.coll + '/view/1');
});

// Pagination redirect to page 1
router.get('/app/:conn/:db/:coll/view/', function (req, res, next){
    res.redirect(req.app_context + '/app/' + req.params.conn + '/' + req.params.db + '/' + req.params.coll + '/view/1');
});

// Shows the document preview/pagination
router.get('/app/:conn/:db/:coll/view/:page_num', function (req, res, next){
    var connection_list = req.app.locals.dbConnections;
    var docs_per_page = 5;

    // Check for existance of connection
    if(connection_list[req.params.conn] === undefined){
        common.render_error(res, req, req.i18n.__('Invalid connection name'), req.params.conn);
        return;
    }

    // Validate database name
    if(req.params.db.indexOf(' ') > -1){
        common.render_error(res, req, req.i18n.__('Invalid database name'), req.params.conn);
        return;
    }

    // Get DB's form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    // do DB stuff
    mongo_db.listCollections().toArray(function (err, collection_list){
        // clean up the collection list
        collection_list = common.cleanCollections(collection_list);
        common.get_sidebar_list(mongo_db, req.params.db, function (err, sidebar_list){
            mongo_db.db(req.params.db).collection(req.params.coll).count(function (err, coll_count){
                if(collection_list.indexOf(req.params.coll) === -1){
                    common.render_error(res, req, 'Database or Collection does not exist', req.params.conn);
                }else{
                    res.render('coll-view', {
                        conn_list: common.order_object(req.nconf.connections.get('connections')),
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

// Show all indexes for collection
router.get('/app/:conn/:db/:coll/indexes', function (req, res, next){
    var connection_list = req.app.locals.dbConnections;

    // Check for existance of connection
    if(connection_list[req.params.conn] === undefined){
        common.render_error(res, req, req.i18n.__('Invalid connection name'), req.params.conn);
        return;
    }

    // Validate database name
    if(req.params.db.indexOf(' ') > -1){
        common.render_error(res, req, req.i18n.__('Invalid database name'), req.params.conn);
        return;
    }

    // Get DB's form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    // do DB stuff
    mongo_db.listCollections().toArray(function (err, collection_list){
        // clean up the collection list
        collection_list = common.cleanCollections(collection_list);
        mongo_db.collection(req.params.coll).indexes(function (err, coll_indexes){
            common.get_sidebar_list(mongo_db, req.params.db, function (err, sidebar_list){
                if(collection_list.indexOf(req.params.coll) === -1){
                    console.error('No collection found');
                    common.render_error(res, req, 'Database or Collection does not exist', req.params.conn);
                }else{
                    res.render('coll-indexes', {
                        coll_indexes: coll_indexes,
                        conn_list: common.order_object(connection_list),
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

// New document view
router.get('/app/:conn/:db/:coll/new', function (req, res, next){
    var connection_list = req.app.locals.dbConnections;

    // Check for existance of connection
    if(connection_list[req.params.conn] === undefined){
        common.render_error(res, req, req.i18n.__('Invalid connection name'), req.params.conn);
        return;
    }

    // Validate database name
    if(req.params.db.indexOf(' ') > -1){
        common.render_error(res, req, req.i18n.__('Invalid database name'), req.params.conn);
        return;
    }

    // Get DB form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    // do DB stuff
    mongo_db.listCollections().toArray(function (err, collection_list){
        // clean up the collection list
        collection_list = common.cleanCollections(collection_list);
        common.get_sidebar_list(mongo_db, req.params.db, function (err, sidebar_list){
            if(collection_list.indexOf(req.params.coll) === -1){
                console.error('No collection found');
                common.render_error(res, req, 'Database or Collection does not exist', req.params.conn);
            }else{
                res.render('coll-new', {
                    conn_name: req.params.conn,
                    conn_list: common.order_object(connection_list),
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

// Shows the document preview/pagination
router.get('/app/:conn/:db/:coll/:id', function (req, res, next){
    var connection_list = req.app.locals.dbConnections;
    var docs_per_page = 5;

    // Check for existance of connection
    if(connection_list[req.params.conn] === undefined){
        common.render_error(res, req, req.i18n.__('Invalid connection name'), req.params.conn);
        return;
    }

    // Validate database name
    if(req.params.db.indexOf(' ') > -1){
        common.render_error(res, req, req.i18n.__('Invalid database name'), req.params.conn);
        return;
    }

    // Get DB's form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    // do DB stuff
    mongo_db.listCollections().toArray(function (err, collection_list){
        // clean up the collection list
        collection_list = common.cleanCollections(collection_list);
        common.get_sidebar_list(mongo_db, req.params.db, function (err, sidebar_list){
            mongo_db.db(req.params.db).collection(req.params.coll).count(function (err, coll_count){
                if(collection_list.indexOf(req.params.coll) === -1){
                    common.render_error(res, req, 'Database or Collection does not exist', req.params.conn);
                }else{
                    res.render('doc-view', {
                        conn_list: common.order_object(req.nconf.connections.get('connections')),
                        conn_name: req.params.conn,
                        db_name: req.params.db,
                        coll_name: req.params.coll,
                        coll_count: coll_count,
                        doc_id: req.params.id,
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

// Shows document editor
router.get('/app/:conn/:db/:coll/edit/:doc_id', function (req, res, next){
    var connection_list = req.app.locals.dbConnections;
    var bsonify = require('./bsonify');

    // Check for existance of connection
    if(connection_list[req.params.conn] === undefined){
        common.render_error(res, req, req.i18n.__('Invalid connection name'), req.params.conn);
        return;
    }

    // Validate database name
    if(req.params.db.indexOf(' ') > -1){
        common.render_error(res, req, req.i18n.__('Invalid database name'), req.params.conn);
        return;
    }

    // Get DB's form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    // do DB stuff
    common.get_sidebar_list(mongo_db, req.params.db, function(err, sidebar_list){
        common.get_id_type(mongo_db, req.params.coll, req.params.doc_id, function (err, result){
            if(result.doc === undefined){
                console.error('No document found');
                common.render_error(res, req, req.i18n.__('Document not found'), req.params.conn);
                return;
            }
            if(err){
                console.error('No document found');
                common.render_error(res, req, req.i18n.__('Document not found'), req.params.conn);
                return;
            }

            var images = [];
            _.forOwn(result.doc, function (value, key){
                if(value){
                    if(value.toString().substring(0, 10) === 'data:image'){
                        images.push({'field': key, 'src': value});
                    }
                }
            });

            var videos = [];
            _.forOwn(result.doc, function (value, key){
                if(value){
                    if(value.toString().substring(0, 10) === 'data:video'){
                        videos.push({'field': key, 'src': value, 'type': value.split(';')[0].replace('data:', '')});
                    }
                }
            });

            var audio = [];
            _.forOwn(result.doc, function (value, key){
                if(value){
                    if(value.toString().substring(0, 10) === 'data:audio'){
                        audio.push({'field': key, 'src': value});
                    }
                }
            });

            res.render('coll-edit', {
                conn_name: req.params.conn,
                db_name: req.params.db,
                conn_list: common.order_object(req.nconf.connections.get('connections')),
                sidebar_list: sidebar_list,
                coll_name: req.params.coll,
                coll_doc: bsonify.stringify(result.doc, null, '    '),
                helpers: req.handlebars.helpers,
                editor: true,
                images_fields: images,
                video_fields: videos,
                audio_fields: audio,
                session: req.session
            });
        });
    });
});

module.exports = router;
