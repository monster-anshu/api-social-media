const dotenv = require('dotenv');
const mongoose = require('mongoose');
dotenv.config();
const mongoURI = process.env.MONGO_URI;

const connectToMongo = (next) => {
  mongoose.connect(mongoURI, () => {
    console.log('Connnected  to mongodb');
    next();
  });
};

const firebase = require('firebase/app');
const firebaseConfig = require('./firebase.config.json');
const configFirebase = {
  ...firebaseConfig,
  private_key: process.env.FIREBASE_PRIVATE_KEY,
};
const firebaseApp = firebase.initializeApp(configFirebase);
module.exports = connectToMongo;
module.exports = { firebaseApp, connectToMongo };
