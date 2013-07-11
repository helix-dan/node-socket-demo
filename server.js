var WebSocketServer = require('websocket').server;
var http            = require('http');
var tools			= require('./lib/tools.js')

var server = http.createServer(function(request, response){
	//...
});

server.listen(3000, function(){
	console.log('socket server listen on port 3000')
});

var wsServer = new WebSocketServer({
	httpServer: server
});

var increase_id = 0;
var ROOM_USER_LIMIT = 2;


wsServer.on('request', function(request){
	var connection = request.accept('upup', request.origin);

	// get it for redis or client
	// ....
	var user_info = {
		name: increase_id,
		sex: 'man',
		fight_with: [],
		room_id: null,
		iq: Math.floor(Math.random()*100),
		right_num: 0,
		wrong_num: 0,
		answer: false,
		connection: connection
	}

	// temp user id
	var user_id = 'uid' + (++increase_id).toString();

	connection.on('message', function(message){

		if (message.type === 'utf8'){

			var msg = JSON.parse(message.utf8Data)

			// some user into fight room
			if (msg['type'] === 'waiting_fight'){
				var current_info = {
					type: 'current_info',
					data: {
						id: user_id
					}
				}
				connection.send(JSON.stringify(current_info));
				// add this user to waiting_fight_room hash list
				var user_waiting_number = tools.new_waiting_user(user_id, user_info);

				// judge the waiting list length
				// if people is enough to build fight room
				if (user_waiting_number >= ROOM_USER_LIMIT){
					console.log('ready info fight room');
					// get room obj
					var room = tools.select_x_people_to_fight(ROOM_USER_LIMIT);

					tools.init_room_two(room);
				}

			} else if (msg['type'] === 'leave_waiting') {
				tools.leave_waiting(user_id);

			} else if (msg['type'] === 'leave_fight') {
				tools.leave_fight(user_id);

			} else if (msg['type'] === 'send_answer'){
				// send answer status to another user
				tools.send_status_to_another(user_id, msg.data['answer'])

				// answer a question and check right answer
				var go_on = tools.compute_point(user_id, msg.data['answer']);
				if(go_on){
					// go on battle
					tools.go_on_battle(user_id);
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
		console.log('a account lost connect');
		if(typeof waiting_users[user_id] === "undefined"){
			if(typeof fight_users[user_id] === "undefined"){
				// nothing to do
			} else {
				tools.leave_fight(user_id);
			}
		} else {
			tools.leave_waiting(user_id);
		}
	});
});