var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;
var handlebars = require('express-handlebars');
var nconf = require('nconf');
var session = require('express-session');

// routes
var routes = require('./routes/index');

var app = express();

// setup the translation
var i18n = new (require('i18n-2'))({
    locales: ['en', 'de']
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('hbs', handlebars({ extname: 'hbs', defaultLayout: 'layout.hbs' }));
app.set('view engine', 'hbs');

// helpers for the handlebars templating platform
handlebars = handlebars.create({
    helpers: {
        __ : function(value) {
            return i18n.__(value);
        },
        toJSON : function(object) {
            return JSON.stringify(object);
        },
        niceBool : function(object) {
            if(object === undefined){
                return "No";
            }
            if(object === true){
                return "Yes";
            }else{
                return "No";
            }
        },
        formatBytes : function(bytes) {
            if(bytes == 0) return '0 Byte';
            var k = 1000;
            var decimals = 2;
            var dm = decimals + 1 || 3;
            var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
            var i = Math.floor(Math.log(bytes) / Math.log(k));
            return (bytes / Math.pow(k, i)).toPrecision(dm) + ' ' + sizes[i];
        }
    }
});

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json({limit: '16mb'}));
app.use(bodyParser.urlencoded({extended: false }));
app.use(cookieParser());

// setup session
app.use(session({
    secret: '858SGTUyX8w1L6JNm1m93Cvm8uX1QX2D',
    resave: true,
    saveUninitialized: true
}))

// front-end modules loaded from NPM
app.use("/ace", express.static(path.join(__dirname, 'node_modules/ace-builds/src-min/')));
app.use("/font-awesome", express.static(path.join(__dirname, 'node_modules/font-awesome/')));
app.use("/jquery", express.static(path.join(__dirname, 'node_modules/jquery/dist/')));
app.use("/bootstrap", express.static(path.join(__dirname, 'node_modules/bootstrap/dist/')));
app.use(express.static(path.join(__dirname, 'public')));

// setup nconf to read in the file

// create config dir and blank files if they dont exist
var fs = require('fs');
if (!fs.existsSync("config")){
    fs.mkdirSync("config");
}
if (!fs.existsSync("config/config.json")){
    fs.writeFileSync("config/config.json", "{}");
}
if (!fs.existsSync("config/app.json")){
    fs.writeFileSync("config/app.json", "{}");
}

var connection_config = path.join(__dirname, 'config', 'config.json');
var app_config = path.join(__dirname, 'config', 'app.json');

// if config files exist but are blank we write blank files for nconf
if (fs.existsSync(app_config, "utf8")) {
    if(fs.readFileSync(app_config, "utf8") == ""){
        fs.writeFileSync(app_config, "{}", 'utf8');
    }
}
if (fs.existsSync(connection_config, "utf8")) {
    if(fs.readFileSync(connection_config, "utf8") == ""){
        fs.writeFileSync(connection_config, "{}", 'utf8');
    }
}

// setup the two conf. 'app' holds application config, and connections
// holds the mongoDB connections
nconf.add('connections', { type: 'file', file: connection_config });
nconf.add('app', { type: 'file', file: app_config });

// set app defaults
var app_host = '0.0.0.0';
var app_port = process.env.PORT || 1234;
var app_context = '';

// get the app configs and override if present
if(nconf.stores.app.get('app:host') != undefined){
    app_host = nconf.stores.app.get('app:host');
}
if(nconf.stores.app.get('app:port') != undefined){
    app_port = nconf.stores.app.get('app:port');
}
if(nconf.stores.app.get('app:locale') != undefined){
    i18n.setLocale(nconf.stores.app.get('app:locale'));
}
if(nconf.stores.app.get('app:context') != undefined){
    app_context = nconf.stores.app.get('app:context');
}


// Make stuff accessible to our router
app.use(function (req, res, next) {
    req.nconf = nconf.stores;
	req.handlebars = handlebars;
    req.i18n = i18n;
    req.app_context = app_context;
	next();
});

app.use('/', routes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
			context: req.app_context,
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        context: req.app_context,
        message: err.message,
        error: {}
    });
});


// lift the app
app.listen(app_port, app_host, function () {
    console.log('adminMongo listening on host: http://' + app_host + ':' + app_port);
});

module.exports = app;
