var Express = require("express");
var MongoClient = require("mongodb").MongoClient;
var cors = require("cors");
const multer=require("multer");

var app = Express();
app.use(cors());

app.use(Express.json()); // for parsing application/json

var CON_STRING = "mongodb+srv://<username>:<password>@<clustername>.puxky3h.mongodb.net/?retryWrites=true&w=majority"

var DABATASENAME="arabicdb";
var COLLECTIONNAME="arabicdbcol";
var database;
const PORT = 5038;
app.listen(PORT, () =>{
    MongoClient.connect(CON_STRING)
    .then(client => {
        database = client.db(DABATASENAME);
        console.log("Mongo DB Connection Successful");
    })
    .catch(error => {
        console.error("An error occurred while connecting to MongoDB Atlas:\n", error);
    });
});

app.get('/api/arabic/dict', (req,res)=>{
    database.collection(COLLECTIONNAME).find({}).toArray()
    .then(data =>{
        res.send(data);
    })
    .catch(error =>{
        console.log(error);
        res.send(error);
    });
})

app.post('/api/arabic/dict', async (req,res)=>{
    console.log("Req arrived: ", req.body);
    let exists = await database.collection(COLLECTIONNAME).findOne({word: req.body.word})
    if(exists){
        console.log("word: " + req.body.word + " already in db");
        res.json("Word already exists");
    }else{
        let numOfDocs = await database.collection(COLLECTIONNAME).count({});
        await database.collection(COLLECTIONNAME)
            .insertOne({
                id : (numOfDocs+1).toString(),
                word : req.body.word,
                arabic : req.body.arabic,
                meaning : req.body.meaning,
                type: req.body.type
            });
        console.log("Successfully added");
        res.json("Successfully added");
    }
})

app.delete('/api/arabic/dict/:id', (req,res)=>{
    database.collection(COLLECTIONNAME).deleteOne({
        id:req.params.id
    })
    .then(()=>{
        res.json("Deleted successfully");
    })
    .catch((error)=>{
        console.log(error);
        res.json(error);
    });
})