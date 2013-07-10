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
var ROOM_USER_LIMIT = 3;


wsServer.on('request', function(request){
	var connection = request.accept('upup', request.origin);

	var user_info = {
		name: increase_id,
		sex: 'man',
		fight_with: [],
		room_id: null,
		iq: 0,
		connection: connection
	}

	var user_id = 'uid' + (++increase_id).toString();

	connection.on('message', function(message){
		if (message.type === 'utf8'){

			// some user into fight room
			if (message.utf8Data === 'waiting_fight'){
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

					// send message to room member
					for (var mem in room.member){
						var their_name = '';
						for(var i=0; i<room.member[mem].fight_with.length; ++i){
							their_name += room.member[mem].fight_with[i] + ' ';
						}

						var send_info = {
							type: 'find_user',
							data: {
								room: room.id,
								name: their_name,
								text: 'find people for you'
							}
						}
						room.member[mem].connection.send(JSON.stringify(send_info));
					}
				}

			} else if (message.utf8Data === 'leave_waiting') {
				tools.leave_waiting(user_id);

			} else if (message.utf8Data == 'leave_fight') {
				tools.leave_fight(user_id);

			} else {
				
			}
			
		}else{
			console.log('send binary data!!')
			connection.sendBytes(message.binaryData);
		}
	});

	// 当设备断开链接
	connection.on('close', function(connection){
		console.log('a account lost connect');

		// 从所有的对战数组中，删除当前链接
		tools.leave_waiting(user_id);
	});
});