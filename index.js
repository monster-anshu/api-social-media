const express = require('express');
const app = express();
const dotenv = require('dotenv');
const connectToMongo = require('./db');
const { default: helmet } = require('helmet');
const morgan = require('morgan');
const http = require('http');

dotenv.config();
app.use(express.json());
app.use(helmet());
app.use(morgan('common'));

const PORT = process.env.PORT || 5000;

app.use('/user', require('./routes/user'));
app.use('/auth', require('./routes/auth'));
app.use('/post', require('./routes/post'));
app.get('/', (req, res) => {
  res.send('Welcome to home page');
});

app.listen(PORT, () => {
  connectToMongo(() => {
    console.log('Server is running on port : ' + PORT);
  });
});
setInterval(() => {
  http.get(process.env.PROJECT_DOMAIN);
}, 291000);
