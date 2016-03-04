var toEJSON = (function () {
    
    var serialize_BinData = function (bsonString) {
        var bson_full = bsonString.match(/(BinData\s?\([^)]+\))/g);
        if (bson_full) {
            for (var i = 0; i < bson_full.length; i++) {
                var bson_value = bson_full[i].match(/\((.*?)\)/i);
                var bson_data = bson_value[1].split(',');
                var ejson = '{ "$binary": ' + bson_data[1] + ',  "$type": "' + bson_data[0] + '" }';
                bsonString = bsonString.replace(/(BinData\s?\([^)]+\))/g, ejson);
            }
        }
        return bsonString;
    };

    var serialize_Date = function (bsonString) {
        var bson_full = bsonString.match(/(new Date\s?)\(.?\)/g);
        if (bson_full) {
            for (var i = 0; i < bson_full.length; i++) {
                var dte = new Date();
                var ejson = '{ "$date": "' + dte.toISOString() + '" }';
                bsonString = bsonString.replace(/(new Date\s?)\(.?\)/g, ejson);
            }
        }
        return bsonString;
    };

    var serialize_ISODate = function (bsonString) {
        var bson_full = bsonString.match(/(ISODate\s?\([^)]+\))/g);
        if (bson_full) {
            for (var i = 0; i < bson_full.length; i++) {
                var bson_value = bson_full[i].match(/\((.*?)\)/i);
                var ejson = '{ "$date": ' + bson_value[1] + ' }';
                bsonString = bsonString.replace(/(ISODate\s?\([^)]+\))/g, ejson);
            }
        }
        return bsonString;
    };

    var serialize_Timestamp = function (bsonString) {
        var bson_full = bsonString.match(/(Timestamp\s?\([^)]+\))/g);
        if (bson_full) {
            for (var i = 0; i < bson_full.length; i++) {
                var bson_value = bson_full[i].match(/\((.*?)\)/i);
                var bson_data = bson_value[1].split(',');
                var ejson = '{ "$timestamp": { "$t": ' + bson_data[0] + ',  "$i": ' + bson_data[1] + '}}';
                bsonString = bsonString.replace(/(Timestamp\s?\([^)]+\))/g, ejson);
            }
        }
        return bsonString;
    };

    var serialize_Regex = function (bsonString) {
        // TODO: Implement a regex fixer
        return bsonString;
    };

    var serialize_ObjectId = function (bsonString) {
        var bson_full = bsonString.match(/(ObjectId\s?\([^)]+\))/g);
        if (bson_full) {
            for (var i = 0; i < bson_full.length; i++) {
                var bson_value = bson_full[i].match(/\((.*?)\)/i);
                var ejson = '{ "$oid": ' + bson_value[1] + '}';
                bsonString = bsonString.replace(/(ObjectId\s?\([^)]+\))/g, ejson);
            }
        }
        return bsonString;
    };

    var serialize_DBRef = function (bsonString) {
        // TODO: possibly implement something in the future here
        return bsonString;
    };

    var serializeString = function (bsonString) {
        
        if(bsonString){
            bsonString = serialize_BinData(bsonString);
            bsonString = serialize_Date(bsonString);
            bsonString = serialize_ISODate(bsonString);
            bsonString = serialize_Timestamp(bsonString);
            bsonString = serialize_Regex(bsonString);
            bsonString = serialize_ObjectId(bsonString);
            bsonString = serialize_DBRef(bsonString);
        }

        var eJsonString = bsonString;
        return eJsonString;
    };
    
    return {
        serializeString: serializeString,
    };
})();