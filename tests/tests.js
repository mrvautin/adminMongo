var request = require("supertest");
var assert = require('chai').assert;

var conn_name = "TestConnection";
var db_name = "NewTestDB";
var coll_name = "NewTestCollection";
var user_name = "TestNewUser";

app = require('../app');
var agent = request.agent(app);

before(function (done) {
    app.on("adminMongoStarted", function(){
        done();
    });
});

describe("Add connection, database and collection",function(){

    it("Add a new connection",function(done){
        agent
            .post("/add_config")
            .send({0: conn_name,1: "mongodb://localhost:27017", 2: "{}"})
            .expect(200)
            .expect("Config successfully added", done);
    });
    
    it("Add a database",function(done){
        agent
            .post("/" + conn_name + "/db_create")
            .send({"db_name" : db_name})
            .expect(200)
            .expect("Database successfully created", done);
    });

    it("Add a collection",function(done){
        agent
            .post("/" + conn_name + "/" + db_name + "/coll_create")
            .send({"collection_name" : coll_name})
            .expect(200)
            .expect("Collection successfully created", done);
    });
});

describe("User tests",function(){
    it("Create a user",function(done){
        var json = {
            "username": user_name,
            "user_password": "test",
            "roles_text": "read"
        }
        agent
            .post("/" + conn_name + "/" + db_name + "/" + coll_name + "/user_create")
            .send(json)
            .expect(200)
            .expect("User successfully created", done);
    });
 
    it('Delete a user', function(done){       
        agent
            .post("/" + conn_name + "/" + db_name + "/" + coll_name + "/user_delete")
            .send({"username": user_name})
            .expect(200)
            .expect("User successfully deleted", done);
    });
});

describe("Document tests",function(){
    var doc_id = "";
    it("Add a document",function(done){
        var json = {"NewTestDocument":"Test Data"};
        var strJSON = JSON.stringify(json);
        agent
            .post("/" + conn_name + "/" + db_name + "/" + coll_name + "/insert_doc")
            .send({"objectData": strJSON})
            .expect(200)
            .expect("Document successfully added", done);
    });

    it("Find our new document",function(done){
        var json = {"NewTestDocument":"Test Data"};
        var strJSON = JSON.stringify(json);
        agent
            .post("/api/" + conn_name + "/" + db_name + "/" + coll_name + "/1")
            .send({"query": strJSON})
            .expect(200)
            .end(function(err, res) {
                assert.equal(res.body.data[0].NewTestDocument, 'Test Data');
                doc_id = res.body.data[0]._id;
                done();
            });
    });
 
    it('Delete our new document', function(done){       
        agent
            .post("/" + conn_name + "/" + db_name + "/" + coll_name + "/doc_delete")
            .send({"doc_id": doc_id})
            .expect(200)
            .expect("Document successfully deleted", done);
    });
});

describe("Remove and remove collection and connection",function(){
    it("Rename the collection",function(done){
        agent
            .post("/" + conn_name + "/" + db_name + "/" + coll_name + "/coll_name_edit")
            .send({"new_collection_name" :  coll_name + "Changed"})
            .expect(200)
            .expect("Collection successfully renamed", done);
    });
    
    it("Remove the collection",function(done){
        agent
            .post("/" + conn_name + "/" + db_name + "/coll_delete")
            .send({"collection_name" : coll_name + "Changed"})
            .expect(200)
            .expect("Collection successfully deleted", done);
    });
    
    it("Remove the database",function(done){
        agent
            .post("/" + conn_name + "/db_delete")
            .send({"db_name" : db_name})
            .expect(200)
            .expect("Database successfully deleted", done);
    });

    it("Remove the connection",function(done){
        agent
            .post("/drop_config")
            .send({"curr_config": conn_name})
            .expect(200)
            .expect("Config successfully deleted", done);
    });
});