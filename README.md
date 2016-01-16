# adminMongo

adminMongo is a Web based user interface (GUI) to handle all your MongoDB connections/databases needs. adminMongo is fully responsive and should work on a range of devices.

> adminMongo connection information (including username/password) is stored unencrypted in a config file, it is not recommended to run this application on a production or public facing server without proper security considerations.

## Installation

1. Clone Repository: `git clone https://github.com/mrvautin/adminMongo.git && cd adminMongo`
2. Install dependencies: `npm install`
3. Start application: `npm start`
4. Visit [http://127.0.0.1:1234](http://127.0.0.1:1234) in your browser

## Usage

##### Create a connection

After visiting [http://127.0.0.1:1234](http://127.0.0.1:1234) you will be presented with a connection screen. You need to give your connection a unique name as a reference when using adminMongo and a MongoDB formatted connection string. The format of a MongoDB connection string can form: `mongodb://<user>:<password>>127.0.0.1:<port>/<db>` where specifying to the `<db>` level is optional. For more information on MongoDB connection strings, see the [official MongoDB documentation](http://docs.mongodb.org/manual/reference/connection-string/).

Note: The connection can be either local or remote hosted on VPS or MongoDB service such as MongoLab.

![adminMongo connections screen](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/adminMongo/adminMongo_connections.png "adminMongo connections screen")
*The Connection setup screen*

##### Connection/Database admin

After connecting to your newly created connection, you are able to see all database objects associated with your connection. Here you can create/delete collections, create/delete users and see various stats for your database.

![adminMongo database screen](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/adminMongo/adminMongo_dbview.png "adminMongo database screen")
*The connections/database screen*

##### Collections

After selecting your collection from the "Database Objects" menu, you will be presented with the collections screen. Here you can see documents in pagination form, create new documents, delete, edit documents and view/add indexes to your collection.

![adminMongo collections screen](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/adminMongo/adminMongo_collectionview.png "adminMongo collections screen")
*The collections screen*

##### Documents

Adding and editing documents is done using a JSON syntax highlighting control.

![adminMongo documents](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/adminMongo/adminMongo_docedit.png "adminMongo documents")
*Editing a document*

##### Indexes

Indexes can be added from the collection screen. Please see the [official MongoDB documentation](https://docs.mongodb.org/manual/indexes/) on adding indexes.

![adminMongo documents](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/adminMongo/adminMongo_manageindexes.png "adminMongo indexes")
*Viewing/Adding indexes*

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## Future plans

In coming versions search functionality and an improved database dashboard will be added. 

## License

The MIT License

Copyright (c) 2010-2016 Google, Inc. http://angularjs.org

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.