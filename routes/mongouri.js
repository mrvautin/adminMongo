const RE_PULL_MONGODB_SCHEME = /^(mongodb:\/\/|mongodb\+srv:\/\/)(.*)$/i;
const RE_PULL_MONGODB_AUTH = /^([^:\/\?,]+):([^@\/\?,]+)@(.*)$/;
const RE_PULL_HOSTNAME_PORTION = /^([^\/\?]+)(.*)$/;
const RE_PULL_DATABASE = /^\/([^?]*)($|\?.*$)/;
const RE_PULL_OPTIONS = /^\?(.*)$/;

exports.parse = function (uri){
    console.log('[DEBUG, mongouri.js, .parse] uri: ' + uri);
    let uri_trimmed = uri.trim();
    let scheme = MongoUri.pullMongodbScheme(uri_trimmed);
    let auth = MongoUri.pullAuth(scheme[2]);
    let hosts = MongoUri.pullHosts(auth[3]);
    let database = MongoUri.pullDatabase(hosts[2]);
    let options = MongoUri.pullOptions(database[2]);
    let mongoUri = new MongoUri(scheme[1], decodeURIComponent(auth[1]), decodeURIComponent(auth[2]), hosts[1], database[1], options);
    console.log('[DEBUG, mongouri.js, .parse] MongoUri: ' + mongoUri);
    return new MongoUri(scheme[1], decodeURIComponent(auth[1]), decodeURIComponent(auth[2]), hosts[1], database[1], options);
};

class MongoUri{
    constructor(
        scheme = null,
        username = null,
        password = null,
        hosts = null,
        database = null,
        options = null
    ){
        this.scheme = scheme;
        this.username = username;
        this.password = password;
        this.hosts = hosts;
        this.database = database;
        this.options = options;
    }

    static pullMongodbScheme(uri){
        if(uri){
            let matches = uri.match(RE_PULL_MONGODB_SCHEME);
            if(matches && matches.length === 3){
                return matches;
            }
        }
        return [null, null, null];
    }

    static pullAuth(uri){
        if(uri){
            let matches = uri.match(RE_PULL_MONGODB_AUTH);

            if(matches === null){
                return [null, null, null, uri];
            }
            return matches;
        }
        return [null, null, null, null];
    }

    static pullHosts(uri){
        if(uri){
            let matches = uri.match(RE_PULL_HOSTNAME_PORTION);
            if(matches){
                return matches;
            }
        }
        return [null, null];
    }

    static pullDatabase(uri){
        if(uri){
            let matches = uri.match(RE_PULL_DATABASE);
            if(matches){
                return matches;
            }
        }
        return [null, null];
    }

    static pullOptions(uri){
        if(uri){
            let matches = uri.match(RE_PULL_OPTIONS);
            if(matches){
                var map = new Map();
                let options = matches[1].split('&');
                for(let i in options){
                    let split = options[i].split('=');
                    if(split.length === 2){
                        let key = split[0];
                        let value = split[1];
                        map.set(key, value);
                    }
                }
                return map;
            }
        }
        return null;
    }
}

