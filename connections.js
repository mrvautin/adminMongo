var MongoClient = require('mongodb').MongoClient;

exports.addConnection = function (connection, app, callback){
    if(!app.locals.dbConnections){
        app.locals.dbConnections = {};
    }
    if(app.locals.dbConnections[connection.name]){
        return callback(null, app.locals.dbConnections[connection.name].connection);
    }

    if(!connection.connOptions){
        connection.connOptions = {};
    }

    var dbObj = {};
    dbObj.connection = null;
    dbObj.connect = (callback) => {
        if(dbObj.connection){
            callback(null, dbObj.connection);
        } else {
            MongoClient.connect(dbObj.connString, dbObj.connOptions, function(err, database){
                dbObj.connection = database;
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

exports.getConnection = function(request, response, connectionName) {
    // Get request and check if user has required roles
    var connection_list = request.app.locals.dbConnections;
    var connection = connection_list[connectionName];

    if(!connection){
        throw new Error(req.i18n.__('Invalid connection name'));
    }

    if(connection.requiredRoles){
        var role = request.get("x-role");
        if(connection.requiredRoles.map(r => r.toLowerCase()).indexOf(role.toLowerCase()) === -1){
            throw new Error(req.i18n.__('Insufficient permissions'));
        }
    }

    return connection
}

exports.getConnections = function(request, response){
    var connection_list = request.app.locals.dbConnections;
    var result = {};
    if(connection_list){
        Object.keys(connection_list).forEach(name => {
            let connection = connection_list[name];
            if(connection.requiredRoles){
                var role = request.get("x-role");
                if(connection.requiredRoles.map(r => r.toLowerCase()).indexOf(role.toLowerCase()) === -1){
                    return;
                }
            }
            result[name] = connection;
        });
    }
    return result;
}

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
