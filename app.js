"use strict";
let express = require('express');
let app = express();
let server = require('http').Server(app);
let io = require('socket.io')(server);

app.use(express.static('resources'))
server.listen(3000);

// Main route
app.get('/', function(req, res) {
    res.sendFile('index.html', {
        "root" : __dirname
    });
});


let createGame = function(id, increment) {
    return {
        "id" : id,
        "bidder_id": null,
        "bidder_session": null,
        "increment": increment,
        "next_bid": increment,
        "pool": increment,
        "timer" : null
    };
};

let createUserGame = function(game) {
    return {
        "id" : game.id,
        "bidder_session" : game.bidder_session,
        "increment" : game.increment,
        "next_bid" : game.next_bid,
        "pool" : game.pool
    };
};

let endGame = function(game) {
    console.log("endGame");
    io.sockets.emit('game_end', createUserGame(game));
    delete games[game.id];
};

let last_id = 123;
let createUser = function() {
    let new_id = ++last_id;
    users[new_id] = {
        "id" : new_id,
        "session_id" : new_id * 123,
        "coins" : 1000
    };
    return users[new_id];
};


let users = {};
let games = {};
games[1] = createGame(1, 1);
games[2] = createGame(2, 5);
games[3] = createGame(3, 10);

let handleBid = function(socket, data) {
    console.log("bid", data);
    let game = games[data.game_id];
    let user = users[data.user_id];

    // Reject bad/outdated bids
    if (!game
        || !user
        || data.session_id !== user.session_id
        || data.user_id === game.bidder
        || data.bid !== game.next_bid
        || user.coins < game.next_bid)
    {
        console.log("bid_fail", game);
        socket.emit('bid_fail', createUserGame(game));
        return;
    }

    // Successful user bid
    user.coins -= game.next_bid;
    game.pool += game.next_bid;
    game.next_bid += game.increment;
    game.bidder_id = data.user_id;
    game.bidder_session = data.session_id;

    console.log("Bid success", game);

    if (!game.timer) {
        game.timer = setTimeout(endGame.bind(null, game), 10000);
    }

    // Broadcast new game state to all clients
    let updated_game = createUserGame(game);
    io.sockets.emit('game_update', updated_game);
    // Update user data
    socket.emit('user_status', { "coins" : user.coins });
};


io.on('connection', function (socket) {
    let user = createUser();
    let user_games = Object.keys(games).map(k => games[k]).map(createUserGame);

    socket.emit('game_state', {
        "user" : user,
        "games" : user_games 
    });

    socket.on('bid', handleBid.bind(null, socket));
});
