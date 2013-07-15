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

var increase_id = 0;
var ROOM_USER_LIMIT = 2;


wsServer.on('request', function(request){
	var connection = request.accept(null, request.origin);

	// get it for redis or client
	// .... temp
	var user_info = {
		sex: 'man',
		room_id: null,
		iq: Math.floor(Math.random()*100),
		connection: connection
	}

	// temp user id
	// redis replace it
	var user_id = 'uid' + (++increase_id).toString();

	connection.on('message', function(message){

		if (message.type === 'utf8'){

			var msg = JSON.parse(message.utf8Data)

			// some user into fight room
			if (msg['type'] === 'join'){

				user_info['name'] = msg.data;
				// use array! for the future 3, 4, 5 or more people!
				user_info['fight_with'] = [];
				user_info['right_num'] = 0;
				user_info['wrong_num'] = 0;
				// add this user to waiting_fight_room hash list
				var user_waiting_number = tools.newWaitingUser(user_id, user_info);

				// judge the waiting list length
				// if people is enough to build fight room
				if (user_waiting_number >= ROOM_USER_LIMIT){
					console.log('ready info fight room');
					// get room obj
					var room = tools.select_x_people_to_fight(ROOM_USER_LIMIT);

					tools.init_room_two(room, client);
				}

			} else if (msg['type'] === 'quit') {
				console.log('quit the room')
				tools.leaveWaiting(user_id);
				tools.end_fight(user_id);

			} else if (msg['type'] === 'answer'){
				// send answer status to another user
				tools.send_status_to_another(user_id, msg.data['ans'])

				// answer a question and check right answer
				var go_on = tools.compute_point(user_id, msg.data['ans']);
				if(go_on){
					// go on battle
					tools.go_on_battle(user_id, client);
				} else {
					// end the battle
					tools.end_fight(user_id);
				}
			}
			
		}else{
			console.log('send binary data!!')
			connection.sendBytes(message.binaryData);
		}
	});

	// user's network disconnect
	connection.on('close', function(connection){
		if(typeof waiting_users[user_id] === "undefined"){
			if(typeof fight_users[user_id] === "undefined"){
				// nothing to do
			} else {
				tools.end_fight(user_id);
			}
		} else {
			tools.leaveWaiting(user_id);
			tools.end_fight(user_id);
		}
	});
});