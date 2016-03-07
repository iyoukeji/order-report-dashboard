//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');
var path = require('path');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');
var bodyParser = require('body-parser');

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(bodyParser.json());

router.use(express.static(path.resolve(__dirname, 'client')));

router.post('/upload-data', function(req, res, next) {
  console.log(req.body);
  var geoAddress = req.body.entry.field_5;
  var textAddress = req.body.entry.field_24.city + req.body.entry.field_24.district + req.body.entry.field_24.street;
  var address = {};
  if (geoAddress.address) {
    address = {
      latitude: geoAddress.latitude,
      longitude: geoAddress.longitude,
      text: geoAddress.address
    };
  } else {
    address = {
      text: textAddress
    };
  }
  broadcast('message', {
    id: req.body.serial_number,
    address: address,
    arriveAt: {
      date: req.body.entry.field_2,
      time: req.body.entry.field_3
    },
    amount: req.body.entry.field_8,
    title: req.body.entry.field_7
  });
  res.send('success!');
});

router.post('/upload-location', function(req, res, next) {
  broadcast('vehicle', req.body);
  res.send(JSON.stringify({ status: 200 }));
});

var sockets = [];

io.on('connection', function (socket) {
  sockets.push(socket);

  socket.on('disconnect', function () {
    sockets.splice(sockets.indexOf(socket), 1);
  });
});


function broadcast(event, data) {
  sockets.forEach(function (socket) {
    socket.emit(event, data);
  });
}

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
