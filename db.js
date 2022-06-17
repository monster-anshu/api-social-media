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
module.exports = connectToMongo;
