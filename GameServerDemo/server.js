let express = require("express");
let app = express();
let http = require('http').Server(app);
let socketio = require('socket.io')(http);
let gameServer = require('./models/gameserver.js')(socketio);

app.use(express.static("public"));


http.listen(3003, function() {

});
