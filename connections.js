var MongoClient = require('mongodb').MongoClient;

exports.addConnection = function (connection, app, callback){
    if(!app.locals.dbConnections){
        app.locals.dbConnections = [];
    }

    if(!connection.connOptions){
        connection.connOptions = {};
    }

    MongoClient.connect(connection.connString, connection.connOptions, function(err, database){
        if(err){
            callback(err, null);
        }else{
            var dbObj = {};
            dbObj.native = database;
            dbObj.connString = connection.connString;
            dbObj.connOptions = connection.connOptions;

            app.locals.dbConnections[connection.connName] = null;
            app.locals.dbConnections[connection.connName] = dbObj;
            callback(null, null);
        }
    });
};

exports.removeConnection = function (connection, app){
    if(!app.locals.dbConnections){
        app.locals.dbConnections = [];
    }

    try{
        app.locals.dbConnections[connection].native.close();
    }catch(e){}

    delete app.locals.dbConnections[connection];
    return;
};
