var express = require('express');
var router = express.Router();
var _ = require('lodash');
var common = require('./common');

// runs on all routes and checks password if one is setup
router.all('/api/*', common.checkLogin, function (req, res, next){
    next();
});

// pagination API
router.post('/api/:conn/:db/:coll/:page', function (req, res, next){
    var connection_list = req.app.locals.dbConnections;
    var ejson = require('mongodb-extended-json');
    var docs_per_page = parseInt(req.body.docsPerPage) !== undefined ? parseInt(req.body.docsPerPage) : 5;

    // Check for existance of connection
    if(connection_list[req.params.conn] === undefined){
        res.status(400).json({'msg': req.i18n.__('Invalid connection name')});
    }

    // Validate database name
    if(req.params.db.indexOf(' ') > -1){
        res.status(400).json({'msg': req.i18n.__('Invalid database name')});
    }

    // Get DB's form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    var page_size = docs_per_page;
    var page = 1;

    if(req.params.page !== undefined){
        page = parseInt(req.params.page);
    }

    var skip = 0;
    if(page > 1){
        skip = (page - 1) * page_size;
    }

    var limit = page_size;

    var query_obj = {};
    var validQuery = true;
    var queryMessage = '';
    if(req.body.query){
        try{
            query_obj = ejson.parse(req.body.query);
        }catch(e){
            validQuery = false;
            queryMessage = e.toString();
            query_obj = {};
        }
    }

    mongo_db.collection(req.params.coll).find(query_obj, {skip: skip, limit: limit}).toArray(function (err, result){
        if(err){
            console.error(err);
            res.status(500).json(err);
        }else{
            mongo_db.collection(req.params.coll).find({}, {skip: skip, limit: limit}).toArray(function (err, simpleSearchFields){
                // get field names/keys of the Documents in collection
                var fields = [];
                for(var i = 0; i < simpleSearchFields.length; i++){
                    var doc = simpleSearchFields[i];

                    for(var key in doc){
                        if(key === '__v')continue;
                        fields.push(key);
                    }
                };

                fields = fields.filter(function (item, pos){
                    return fields.indexOf(item) === pos;
                });

                // get total num docs in query
                mongo_db.collection(req.params.coll).count(query_obj, function (err, doc_count){
                    var return_data = {
                        data: result,
                        fields: fields,
                        total_docs: doc_count,
                        deleteButton: req.i18n.__('Delete'),
                        linkButton: req.i18n.__('Link'),
                        editButton: req.i18n.__('Edit'),
                        validQuery: validQuery,
                        queryMessage: queryMessage
                    };
                    res.status(200).json(return_data);
                });
            });
        }
    });
});

// Gets monitoring data
router.get('/api/monitoring/:conn', function (req, res, next){
    var dayBack = new Date();
    dayBack.setDate(dayBack.getDate() - 1);

    req.db.find({connectionName: req.params.conn, eventDate: {$gte: dayBack}}).sort({eventDate: 1}).exec(function (err, serverEvents){
        var connectionsCurrent = [];
        var connectionsAvailable = [];
        var connectionsTotalCreated = [];

        var clientsTotal = [];
        var clientsReaders = [];
        var clientsWriters = [];

        var memoryVirtual = [];
        var memoryMapped = [];
        var memoryCurrent = [];

        var docsQueried = [];
        var docsInserted = [];
        var docsDeleted = [];
        var docsUpdated = [];

        if(serverEvents.length > 0){
            if(serverEvents[0].dataRetrieved === true){
                if(serverEvents){
                    _.each(serverEvents, function (value, key){
                        // connections
                        if(value.connections){
                            connectionsCurrent.push({x: value.eventDate, y: value.connections.current});
                            connectionsAvailable.push({x: value.eventDate, y: value.connections.available});
                            connectionsTotalCreated.push({x: value.eventDate, y: value.connections.totalCreated});
                        }
                        // clients
                        if(value.activeClients){
                            clientsTotal.push({x: value.eventDate, y: value.activeClients.total});
                            clientsReaders.push({x: value.eventDate, y: value.activeClients.readers});
                            clientsWriters.push({x: value.eventDate, y: value.activeClients.writers});
                        }
                        // memory
                        if(value.memory){
                            memoryVirtual.push({x: value.eventDate, y: value.memory.virtual});
                            memoryMapped.push({x: value.eventDate, y: value.memory.mapped});
                            memoryCurrent.push({x: value.eventDate, y: value.memory.resident});
                        }

                        if(value.docCounts){
                            docsQueried.push({x: value.eventDate, y: value.docCounts.queried});
                            docsInserted.push({x: value.eventDate, y: value.docCounts.inserted});
                            docsDeleted.push({x: value.eventDate, y: value.docCounts.deleted});
                            docsUpdated.push({x: value.eventDate, y: value.docCounts.updated});
                        }
                    });
                }
            }

            var dataPointsLimit = 1000;

            var returnedData = {
                connectionsCurrent: averageDatapoints(connectionsCurrent, dataPointsLimit),
                connectionsAvailable: averageDatapoints(connectionsAvailable, dataPointsLimit),
                connectionsTotalCreated: averageDatapoints(connectionsTotalCreated, dataPointsLimit),
                clientsTotal: averageDatapoints(clientsTotal, dataPointsLimit),
                clientsReaders: averageDatapoints(clientsReaders, dataPointsLimit),
                clientsWriters: averageDatapoints(clientsWriters, dataPointsLimit),
                memoryVirtual: averageDatapoints(memoryVirtual, dataPointsLimit),
                memoryMapped: averageDatapoints(memoryMapped, dataPointsLimit),
                memoryCurrent: averageDatapoints(memoryCurrent, dataPointsLimit),
                docsQueried: averageDatapoints(docsQueried, dataPointsLimit),
                docsInserted: averageDatapoints(docsInserted, dataPointsLimit),
                docsDeleted: averageDatapoints(docsDeleted, dataPointsLimit),
                docsUpdated: averageDatapoints(docsUpdated, dataPointsLimit)
            };

            // get hours or mins
            var uptime = (serverEvents[0].uptime / 60).toFixed(2);
            if(uptime > 61){
                uptime = (uptime / 60).toFixed(2) + ' hours';
            }else{
                uptime = uptime + ' minutes';
            }

            if(err){
                res.status(400).json({'msg': req.i18n.__('Could not get server monitoring')});
            }else{
                res.status(200).json({data: returnedData, dataRetrieved: serverEvents[0].dataRetrieved, pid: serverEvents[0].pid, version: serverEvents[0].version, uptime: uptime});
            }
        }
    });
});

function averageDatapoints(datapoints, limit){
    if(limit >= datapoints.length){
        return datapoints;
    }

    var min = datapoints[0].x.getTime();
    var max = datapoints[datapoints.length - 1].x.getTime();

    if(limit < 1){
        return[{
            x: new Date((min + max) / 2),
            y: datapoints.reduce((a, b) => a.y + b.y, 0) / datapoints.length
        }];
    }
    var step = (max - min) / limit;
    var result = [];
    var l = min + step;
    var n = 0;
    var sumx = 0;
    var sumy = 0;
    for(var i = 0; i < datapoints.length; i++){
        if(datapoints[i].x.getTime() > l){
            if(n > 0){
                result.push({
                    x: sumy ? new Date(sumx / sumy) : new Date(l - step / 2),
                    y: sumy / n
                });
            }
            while(datapoints[i].x.getTime() > l){
                l += step;
            }
            n = 0;
            sumx = 0;
            sumy = 0;
        }
        n++;
        sumx += datapoints[i].x.getTime() * datapoints[i].y;
        sumy += datapoints[i].y;
    }
    if(n > 0){
        result.push({
            x: sumy ? new Date(sumx / sumy) : new Date(l - step / 2),
            y: sumy / n
        });
    }
    return result;
}

module.exports = router;
