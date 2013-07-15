var WebSocketServer = require('websocket').server;
var redis 			= require('redis');
var http            = require('http');
var tools			= require('./lib/tools.js');

var server = http.createServer(function(request, response){
	//...
});

var redisConf = {
	host: '192.168.2.18',
	port: 6379
}
var client = redis.createClient(redisConf.port, redisConf.host);

server.listen(3000, function(){
	console.log('socket server listen on port 3000')
});

var wsServer = new WebSocketServer({
	httpServer: server
});

var ROOM_USER_LIMIT = 2;

wsServer.on('request', function(request){
	var connection = request.accept(null, request.origin);

	// get it for redis or client
	// .... temp
	var userInfo = {
		room_id: null,
		connection: connection
	}

	// temp user id
	// redis replace it
	var userId = '';

	connection.on('message', function(message){

		if (message.type === 'utf8'){

			var msg = JSON.parse(message.utf8Data)

			// some user into fight room
			if (msg['type'] === 'join'){
				userId = msg.data;

				if (typeof fightUsers[userId] === "undefined"){
						// if fight users have no this user
						client.hgetall('uid:' + msg.data, function(err, data){
						if(err){
							console.log(err)
						}else{
							userInfo['name'] = data['name'];
							userInfo['pic']  = data['pic'];
							userInfo['rank'] = data['rank'];
							userInfo['exp']  = data['exp'];

							// use array! for the future 3, 4, 5 or more people!
							userInfo['fight_with'] = [];
							userInfo['right_num']  = 0;
							userInfo['wrong_num']  = 0;
							// add this user to waiting_fight_room hash list
							var userWaitingNumber = tools.newWaitingUser(userId, userInfo);

							// judge the waiting list length
							// if people is enough to build fight room
							if (userWaitingNumber >= ROOM_USER_LIMIT){
								console.log('ready info fight room');
								// get room obj
								var room = tools.selectXPeopleToFight(ROOM_USER_LIMIT);

								tools.initRoomTwo(room, client);
							}
						}
					});

				} else {
					// if he disconnect just now, and he want to reconnect
					fightUsers[userId]['connection'] = connection;
				}
				
			} else if (msg['type'] === 'quit') {
				tools.leaveWaiting(userId);
				tools.endFight(userId);

			} else if (msg['type'] === 'answer'){
				// send answer status to another user
				tools.sendStatusToAnother(userId, msg.data['ans'])

				// answer a question and check right answer
				var go_on = tools.computePoint(userId, msg.data['ans']);
				if(go_on){
					// go on battle
					tools.goOnBattle(userId, client);
				} else {
					// end the battle
					tools.endFight(userId);
				}
			}
			
		}else{
			console.log('send binary data!!')
			connection.sendBytes(message.binaryData);
		}
	});

	// user's network disconnect
	connection.on('close', function(connection){
		var waitingUsers = tools.getWaitUser();
		// var fightUsers   = tools.getFightUser();
		if(typeof waitingUsers[userId] === "undefined"){
			// if(typeof fightUsers[userId] === "undefined"){
			// 	// nothing to do
			// } else {
			// 	// tools.endFight(userId);
			// }
		} else {
			tools.leaveWaiting(userId);
			// tools.endFight(userId);
		}
	});
});