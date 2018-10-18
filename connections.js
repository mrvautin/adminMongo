var MongoClient = require('mongodb').MongoClient;

exports.addConnection = function (connection, app, callback){
    if(!app.locals.dbConnections){
        app.locals.dbConnections = [];
    }

    if(!connection.connOptions){
        connection.connOptions = {};
    }

    var dbObj = {};
    dbObj.connection = null;
    dbObj.connect = (callback) => {
        if(dbObj.connection && dbObj.connect.isConnected()){
            callback(null, dbObj.connection);
        } else {
            MongoClient.connect(dbObj.connString, dbObj.connOptions, function(err, database){
                connection = database;
                callback(err, database);
            });
        }
    };
    dbObj.connString = connection.connString;
    dbObj.connOptions = connection.connOptions;

    app.locals.dbConnections[connection.connName] = null;
    app.locals.dbConnections[connection.connName] = dbObj;
    callback(null, null);
};

exports.removeConnection = function (connection, app){
    if(!app.locals.dbConnections){
        app.locals.dbConnections = [];
    }

    try{
        app.locals.dbConnections[connection].connection.close();
    }catch(e){}

    delete app.locals.dbConnections[connection];
    return;
};
