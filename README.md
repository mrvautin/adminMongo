# adminMongo

![npm downloads badge](https://img.shields.io/npm/dm/admin-mongo.svg "npm download badge")
![npm version badge](https://img.shields.io/npm/v/admin-mongo.svg "npm version badge")
[![Build Status](https://travis-ci.org/mrvautin/adminMongo.svg?branch=master)](https://travis-ci.org/mrvautin/adminMongo)
[![Github stars](https://img.shields.io/github/stars/mrvautin/adminMongo.svg?style=social&label=Star)](https://github.com/mrvautin/adminMongo)


adminMongo is a Web based user interface (GUI) to handle all your MongoDB connections/databases needs. adminMongo is fully responsive and should work on a range of devices.

> adminMongo connection information (including username/password) is stored unencrypted in a config file, it is not recommended to run this application on a production or public facing server without proper security considerations.

## Installation

1. Clone Repository: `git clone https://github.com/mrvautin/adminMongo.git && cd adminMongo`
2. Install dependencies: `npm install`
3. Start application: `npm start`
4. Visit [http://127.0.0.1:1234](http://127.0.0.1:1234) in your browser

## Deploy on Heroku
[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## Demo (read only)

A read only demo can be seen [here](http://adminmongo.mrvautin.com) 

## Features

* Manage from a connection level for easy access to multiple databases
* Create/Delete databases
* Create/Delete/Edit collection
* Create/Delete/Edit documents
* Create/Delete indexes
* Query documents
* Collection statistics
* Export collections in JSON format

### Current limitations

* Documents need to have an "_id" value which is a string, integer, or MongoDB ObjectId. Documents using Composite ID indexing is currently not supported.
* Connection strings with multiple hosts for replica sets are currently not supported.

## Configuration

adminMongo will listen on host: `localhost` and  port: `1234` by default. This can be overwritten by adding a config file in `/config/app.json`. For example:

```
{
    "app": {
        "host": "10.0.0.1",
        "port": 4321,
        "docs_per_page": 15,
        "password": "secureadminpassword",
        "locale": "de",
        "context": "dbApp"
    }
}
```

> Note: Any changes to the config file requires a restart of the application

The config file (optional) options are:

|Option|Definition|
|--- |--- |
|`host`|The IP address  `adminMongo`  will listen on|
|`port`|The Port `adminMongo` will listen on|
|`docs_per_page`|When viewing docs you can specify how many are shown per page|
|`password`|An application level password to add simply authentication|
|`locale`|The locale is automatically set to the detected locale of Nodejs. If there is not a translation, `adminMongo` will default to English. This setting overrides the default/detected value|
|`context`|Setting a `context` of "dbApp" is like changing the base URL of the app and will mean the app will listen on `http://10.0.0.1:4321/dbApp`. Ommiting a context will mean the application will listen on root. Eg: `http://10.0.0.1:4321`. This setting can be useful when running `adminMongo` behind Nginx etc.|

### Setting a context path

Setting a `context` of "dbApp" is like changing the base URL of the app and will mean the app will listen on `http://10.0.0.1:4321/dbApp`. Ommiting a context will mean the application will listen on 
root. Eg: `http://10.0.0.1:4321`. This setting can be useful when running `adminMongo` behind Nginx etc.

An example Nginx server block. Note the `location /dbApp {` and `proxy_pass http://10.0.0.1:4321/dbApp;` lines match 
the `context` set in the `/config/app.json` file.

```
server {
    listen 80;

    server_name mydomain.com www.mydomain.com;

    location /dbApp {
        proxy_pass http://10.0.0.1:4321/dbApp;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Language locale

> Looking for people to translate into other languages. If you can help, grab the `/locale/en.js` file, translate to your language and submit a pull request.

The locale is automatically set to the detected locale of Nodejs. If there is not a translation, `adminMongo` will default to English. To override the detected locale
a setting can be added to the `app.json` file. See Configuration section for a "German" example.

### Authentication

By default `adminMongo` is not password protected. You can add password authentication by adding a `password` value to the `/config/app.json` file 
(See the Configuration section). Once added you will need to restart `adminMongo` and all routes will be protected until the correct password is added. You
will then be authenticated for the life of the session (60 mins by default) or if the "Logout" link is clicked.

## Usage

### Create a connection

After visiting [http://127.0.0.1:1234](http://127.0.0.1:1234) you will be presented with a connection screen. You need to give your connection a unique name as a reference when using adminMongo and a MongoDB formatted connection string. The format of a MongoDB connection string can form: `mongodb://<user>:<password>@127.0.0.1:<port>/<db>` where specifying to the `<db>` level is optional. For more information on MongoDB connection strings, see the [official MongoDB documentation](http://docs.mongodb.org/manual/reference/connection-string/).

You can supply a connection options object (see [docs](http://mongodb.github.io/node-mongodb-native/2.1/reference/connecting/connection-settings/)) with each connection. 

For example:

```
{
    "poolSize": 10,
    "autoReconnect": false,
    "ssl": false
}
```

Note: The connection can be either local or remote hosted on VPS or MongoDB service such as mLab.

*The Connection setup screen*
![adminMongo connections screen](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/adminMongo/adminMongo_connections.png "adminMongo connections screen")

### Connection/Database admin

After opening your newly created connection, you are able to see all database objects associated with your connection. Here you can create/delete collections, create/delete users and see various stats for your database.

*The connections/database screen*
![adminMongo database screen](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/adminMongo/adminMongo_dbview.png "adminMongo database screen")

### Collections

After selecting your collection from the "Database Objects" menu, you will be presented with the collections screen. Here you can see documents in pagination form, create new documents, search documents, delete, edit documents and view/add indexes to your collection.

*The collections screen*
![adminMongo collections screen](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/adminMongo/adminMongo_collectionview.png "adminMongo collections screen")

### Searching/Querying documents

You can perform searches of documents using the `Search documents` button on the collections screen. You will need to enter the key (field name) and value. Eg: key = "_id" and value = "569ff81e0077663d78a114ce" (Only works on string "_id" fields - Use "Query Documents" for ObjectID's).

> You can clear your search by clicking the `Reset` button on the collections screen.

*Simple search documents*
![adminMongo search documents](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/adminMongo/adminMongo_searchdocuments.png "adminMongo search documents")

Complex querying of documents is done through the "Query documents" button. This allows a query Object to be passed to MongoDB to return results.
Queries can be written in full BSON format or EJSON format. For example these queries should return the same results: 

```
{ 
    ObjectId("56a97ed3f718fe9a4f599489")
}
``` 

is equivalent to: 

```
{
    "$oid": "56a97ed3f718fe9a4f599489"
}
```

*Query documents*
![adminMongo search documents](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/adminMongo/adminMongo_querydocuments.png "adminMongo search documents")


### Documents

Adding and editing documents is done using a JSON syntax highlighting control.

*Editing a document*
![adminMongo documents](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/adminMongo/adminMongo_docedit.png "adminMongo documents")

Documents with Media embedded show previews

*Documents with media*
![adminMongo media](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/adminMongo/adminMongo_media.png "adminMongo media documents")

### Indexes

Indexes can be added from the collection screen. Please see the [official MongoDB documentation](https://docs.mongodb.org/manual/indexes/) on adding indexes.

*Viewing/Adding indexes*
![adminMongo documents](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/adminMongo/adminMongo_manageindexes.png "adminMongo indexes")

## Tests

The `adminMongo` API tests include:

- Add and remove a connection
- Add and remove a database
- Add, remove and rename a collection
- Create and delete a user
- Add, query and delete a document

To run tests, simply run:

```
npm test
```

*You may need to edit the variables and connection string in `/tests/tests.js` for your MongoDB instance.*

If you see any missing tests, please submit a PR.

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## Future plans

- MongoDB monitoring/reporting

Please make any suggestions.

## License

[The MIT License](https://github.com/mrvautin/adminMongo/tree/master/LICENSE)
