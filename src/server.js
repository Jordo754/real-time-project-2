const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');
const xxh = require('xxhashjs');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const index = fs.readFileSync(`${__dirname}/../client/index.html`);

const onRequest = (request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.write(index);
  response.end();
};

const app = http.createServer(onRequest).listen(port);

console.log(`Listening on 127.0.0.1: ${port}`);

// pass in the http server into socketio and grab the websocket server as io
const io = socketio(app);

const ores = [
  { x: 50, y: 100, width: 25 },
  { x: 150, y: 200, width: 25 },
  { x: 400, y: 60, width: 25 },
  { x: 250, y: 175, width: 25 },
];

const CheckCollisions = (square) => {
  // check if square is colliding with another
  for (let i = 0; i < ores.length; i++) {
    const ore = ores[i];
    if (square.x + square.width > ore.x - 5 && square.x < ore.x + ore.width + 5 &&
        square.y < ore.y + ore.width + 5 && square.y + square.height > ore.y - 5) {
      return true;
    }
  }

  return false;
};

const onJoined = (sock) => {
  const socket = sock;

  socket.join('lobby');

  socket.square = {
    hash: xxh.h32(`${socket.id}${new Date().getTime()}`, 0xCAFEBABE).toString(16),
    lastUpdate: new Date().getTime(),
    x: 0,
    y: 0,
    width: 50,
    height: 50,
    colliding: false
  };

  socket.emit('join', { square: socket.square, ores });
};

const onMsg = (sock) => {
  const socket = sock;

  socket.on('clientUpdate', (data) => {
    socket.square = data;

    socket.square.colliding = CheckCollisions(data);

    io.to('lobby').emit('serverUpdate', socket.square);
  });
};

const onDisconnect = (sock) => {
  const socket = sock;

  socket.on('disconnect', () => {
    socket.broadcast.to('lobby').emit('leave', socket.square.hash);
  });
};

io.sockets.on('connection', (socket) => {
  console.log('started');

  onJoined(socket);
  onMsg(socket);
  onDisconnect(socket);
});

console.log('Websocket server started');
