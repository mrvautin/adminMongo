/* global it, describe, toEJSON */

var request = require('supertest');
var assert = require('chai').assert;
var jsdom = require('mocha-jsdom');
var fs = require('fs');

var conn_name = 'TestConnection';
var db_name = 'NewTestDB';
var coll_name = 'NewTestCollection';
var user_name = 'TestNewUser';

const app = require('../app');
var agent = request.agent(app);

describe('Add connection, database and collection', function(){
    it('Add a new connection', function(done){
        agent
            .post('/config/add_config')
            .send({0: conn_name, 1: 'mongodb://localhost:27017', 2: '{}'})
            .expect(200)
            .expect({'msg': 'Config successfully added'}, done);
    });

    it('Add a database', function(done){
        agent
            .post('/database/' + conn_name + '/db_create')
            .send({'db_name': db_name})
            .expect(200)
            .expect({'msg': 'Database successfully created'}, done);
    });

    it('Add a collection', function(done){
        agent
            .post('/collection/' + conn_name + '/' + db_name + '/coll_create')
            .send({'collection_name': coll_name})
            .expect(200)
            .expect({'msg': 'Collection successfully created'}, done);
    });
});

describe('User tests', function(){
    it('Create a user', function(done){
        var json = {
            'username': user_name,
            'user_password': 'test',
            'roles_text': 'read'
        };
        agent
            .post('/users/' + conn_name + '/' + db_name + '/user_create')
            .send(json)
            .expect(200)
            .expect({'msg': 'User successfully created'}, done);
    });

    it('Delete a user', function(done){
        agent
            .post('/users/' + conn_name + '/' + db_name + '/user_delete')
            .send({'username': user_name})
            .expect(200)
            .expect({'msg': 'User successfully deleted'}, done);
    });
});

// as this requires JSDOM to properly test document adding/validation
// these tests only support Nodejs 4 or above as per JSDOM's requirements
if(process.version.substring(1, 2) >= 4){
    describe('Document tests', function(){
        var oid_doc_id = '';
        var doc_id;

        jsdom({
            src: fs.readFileSync('./public/js/toEJSON.js', 'utf-8')
        });

        it('Add a document', function(done){
            var dte = new Date();
            var json = '{"NewTestDocument":"Test Data","NewTestDateToday": ISODate("' + dte.toISOString() + '"),"NewTestDate5Days": ISODate("' + new Date(dte.setDate(dte.getDate() - 5)).toISOString() + '")}';
            var strJSON = toEJSON.serializeString(json);
            agent
                .post('/document/' + conn_name + '/' + db_name + '/' + coll_name + '/insert_doc')
                .send({'objectData': strJSON})
                .expect(200)
                .end(function(err, result){
                    assert.equal(result.body.msg, 'Document successfully added');
                    oid_doc_id = result.body.doc_id;
                    done();
                });
        });

        it('Find document using ObjectID', function(done){
            var qryJson = "{'_id': ObjectId('" + oid_doc_id + "')}";
            var strJSON = toEJSON.serializeString(qryJson);
            agent
                .post('/api/' + conn_name + '/' + db_name + '/' + coll_name + '/1')
                .send({'query': strJSON})
                .expect(200)
                .end(function(err, result){
                    assert.equal(result.body.data[0]._id, oid_doc_id);
                    done();
                });
        });

        it('Find document using non existant ObjectID', function(done){
            var qryJson = '{"_id": ObjectId("56a97ed3f718fe9a4f59948c")}';
            var strJSON = toEJSON.serializeString(qryJson);
            agent
                .post('/api/' + conn_name + '/' + db_name + '/' + coll_name + '/1')
                .send({'query': strJSON})
                .expect(200)
                .end(function(err, result){
                    assert.equal(result.body.data.length, 0);
                    done();
                });
        });

        it('Send in an incorrect syntax query', function(done){
            var qryJson = '{"_id": ObjectId("56a97ed3f718fe9a4f59948cds")}';
            var strJSON = toEJSON.serializeString(qryJson);
            agent
                .post('/api/' + conn_name + '/' + db_name + '/' + coll_name + '/1')
                .send({'query': strJSON})
                .expect(200)
                .end(function(err, result){
                    assert.equal(result.body.validQuery, false);
                    done();
                });
        });

        it('Find document using valid date', function(done){
            var qryJson = '{"NewTestDateToday" : {"$gte": ISODate("2013-10-01T00:00:00.000Z")}}';
            var strJSON = toEJSON.serializeString(qryJson);
            agent
                .post('/api/' + conn_name + '/' + db_name + '/' + coll_name + '/1')
                .send({'query': strJSON})
                .expect(200)
                .end(function(err, result){
                    assert.equal(result.body.data[0]._id, oid_doc_id);
                    done();
                });
        });

        it('Find document using invalid date', function(done){
            var qryJson = '{"NewTestDateToday" : {"$lte": ISODate("2013-10-01T00:00:00.000Z")}}';
            var strJSON = toEJSON.serializeString(qryJson);
            agent
                .post('/api/' + conn_name + '/' + db_name + '/' + coll_name + '/1')
                .send({'query': strJSON})
                .expect(200)
                .end(function(err, result){
                    assert.equal(result.body.data.length, 0);
                    done();
                });
        });

        it('Find document using string values', function(done){
            var json = {'NewTestDocument': 'Test Data'};
            var strJSON = JSON.stringify(json);
            agent
                .post('/api/' + conn_name + '/' + db_name + '/' + coll_name + '/1')
                .send({'query': strJSON})
                .expect(200)
                .end(function(err, res){
                    assert.equal(res.body.data[0].NewTestDocument, 'Test Data');
                    doc_id = res.body.data[0]._id;
                    done();
                });
        });

        it('Delete our new document', function(done){
            agent
                .post('/document/' + conn_name + '/' + db_name + '/' + coll_name + '/doc_delete')
                .send({'doc_id': doc_id})
                .expect(200)
                .expect({'msg': 'Document successfully deleted'}, done);
        });
    });
}else{
    console.warn('*** Document tests cannot be completed. Please update your Nodejs version to v4 or above ***'.red);
}

describe('Remove and remove collection and connection', function(){
    it('Rename the collection', function(done){
        agent
            .post('/collection/' + conn_name + '/' + db_name + '/' + coll_name + '/coll_name_edit')
            .send({'new_collection_name': coll_name + 'Changed'})
            .expect(200)
            .expect({'msg': 'Collection successfully renamed'}, done);
    });

    it('Remove the collection', function(done){
        agent
            .post('/collection/' + conn_name + '/' + db_name + '/coll_delete')
            .send({'collection_name': coll_name + 'Changed'})
            .expect(200)
            .expect({'coll_name': coll_name + 'Changed', 'msg': 'Collection successfully deleted'}, done);
    });

    it('Remove the database', function(done){
        agent
            .post('/database/' + conn_name + '/db_delete')
            .send({'db_name': db_name})
            .expect(200)
            .expect({'db_name': db_name, 'msg': 'Database successfully deleted'}, done);
    });

    it('Remove the connection', function(done){
        agent
            .post('/config/drop_config')
            .send({'curr_config': conn_name})
            .expect(200)
            .expect({'msg': 'Config successfully deleted'}, done);
    });
});
