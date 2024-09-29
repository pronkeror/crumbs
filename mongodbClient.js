const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const config = process.env

const uri = config.mongodbURI;

const mongoclient = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function connectToMongoDB() {
  try {
    await mongoclient.connect();
    await mongoclient.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error('Error connecting to MongoDB', error);
  }
}

async function closeMongoDB() {
  try {
    await mongoclient.close();
  } catch (error) {
    console.error('Error closing MongoDB connection', error);
  }
}

module.exports = { mongoclient, connectToMongoDB, closeMongoDB };
