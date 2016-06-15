var MongoClient = require('mongodb').MongoClient;

exports.addConnection = function (connection, app, callback) {
    if(!app.locals.dbConnections){
        app.locals.dbConnections = [];
    }

    MongoClient.connect(connection.connString, function(err, database) {
        if(err){
            callback(err, null);
        }else{
            var dbObj = {};
            dbObj.native = database;
            dbObj.connString = connection.connString;
            
            app.locals.dbConnections[connection.connName] = null;
            app.locals.dbConnections[connection.connName] = dbObj;
            callback(null, null);
        }
    });
};

exports.removeConnection = function (connection, app) {
    if(!app.locals.dbConnections){
        app.locals.dbConnections = [];
    }

    app.locals.dbConnections[connection].native.close();
    delete app.locals.dbConnections[connection];
    return;
};