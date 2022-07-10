'use strict';
const express = require('express');
const app = express();
const dotenv = require('dotenv');
const { connectToMongo } = require('./db');
const { default: helmet } = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const PORT = process.env.PORT || 5000;
const { addUsers, removeUser, getOnline } = require('./helper/socketHelp');
dotenv.config();
const server = http.createServer(app);

app.use(
  cors({
    origin: '*',
  }),
);

const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

app.use(express.json());
app.use(helmet());
app.use(morgan('common'));
app.use('/user', require('./routes/user'));
app.use('/auth', require('./routes/auth'));
app.use('/post', require('./routes/post'));
app.use('/chat', require('./routes/chat'));
app.set('SocketIO', io);
app.get('/', (req, res) => {
  res.send('Welcome to home page');
});

server.listen(PORT, () => {
  connectToMongo(() => {
    console.log('Server is running on port : ' + PORT);
  });
});

io.on('connection', (socket) => {
  socket.on('online', async ({ userId }) => {
    await addUsers(userId, socket.id);
    const users = await getOnline();
    io.emit('updateOnline', users);
  });
  socket.on('disconnect', async () => {
    await removeUser(socket.id);
    const users = await getOnline();
    io.emit('updateOnline', users);
  });
});

module.exports = server;
