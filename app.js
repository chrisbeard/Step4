"use strict";
let app = require('express')();
let server = require('http').Server(app);
let io = require('socket.io')(server);

server.listen(3000);

let games = {
    "1" :  {
        "id" : "1",
        "bidder_id": null,
        "bidder_session": null,
        "increment": 1,
        "next_bid": 1,
        "pool": 1
    },
    "2" : {
        "id" : "2",
        "bidder_id": null,
        "bidder_session": null,
        "increment" : 10,
        "next_bid" : 10,
        "pool" : 10
    },
    "3" : {
        "id" : "3",
        "bidder_id": null,
        "bidder_session": null,
        "increment" : 100,
        "next_bid" : 100,
        "pool" : 100
    }
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

let users = {};


app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

let handleBid = function(socket, data) {
    console.log("bid", data);
    let game = games[data.game_id];
    let user = users[data.user_id];

    // Reject bad/outdated bids
    if (!game
        || !user
        || data.session_id !== user.session_id
        || data.user_id === game.bidder
        || data.bid !== game.next_bid)
    {
        console.log("bid_fail", game);
        socket.emit('bid_fail', game);
        return;
    }

    // Successful user bid
    user.coins -= game.next_bid;
    game.pool += game.next_bid;
    game.next_bid += game.increment;
    game.bidder_id = data.user_id;
    game.bidder_session = data.session_id;

    console.log("Bid success", game);

    // Broadcast new game state
    let updated_game = createUserGame(game);
    socket.broadcast.emit('game_update', updated_game);
    socket.emit('user_status', { "coins" : user.coins });
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

io.on('connection', function (socket) {
    let user = createUser();
    let user_games = Object.keys(games).map(k => games[k]).map(createUserGame);

    socket.emit('game_state', {
        "user" : user,
        "games" : user_games 
    });

    socket.on('bid', handleBid.bind(null, socket));
});