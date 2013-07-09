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

	var user_info = {
		name: increase_id,
		fight_with: null,
		sex: 'man',
		connection: connection
	}

	var user_id = 'id' + (++increase_id).toString(),

	tools.new_user(user_id, user_info);

	connection.on('message', function(message){
		if (message.type === 'utf8'){

			// some user into fight room
			if (message.utf8Data === 'waiting_fight'){
				// add this user to waiting_fight_room hash list
				var fight_room_number = tools.new_fight_user(user_id, user_info);

				// judge the waiting list length
				// if people in here is enough
				if (fight_room_number >= ROOM_USER_LIMIT){
					console.log('ready info fight room');
					tools.select_x_people_to_fight(ROOM_USER_LIMIT);



					var clientA = fight_array.shift();
					var clientB = fight_array.shift();
					console.log('ready into fight!');

					var simple_fight = FightMod.new(clientA, clientB);

				}
			} else if (message.utf8Data === 'leave_fight') {
				current_client.fight_with.connection.send('another_leave');
				current_client.fight_with = null;

			} else if (message.utf8Data == 'another_leave') {
				connection.send(JSON.stringify({type: 'fight_win', data: 'you get 5 points!' }))
			} else {
				connection.send(message.utf8Data);
			}
			
		}else{
			console.log('send binary data!!')
			connection.sendBytes(message.binaryData);
		}
	});

	// 当设备断开链接
	connection.on('close', function(connection){
		console.log('a account lost connect');

		// 从所有的链接数组中，删除当前链接

		// 从所有的对战数组中，删除当前链接

	});
});


function FightMod(clientA, clientB){
	this.clientA = clientA;
	this.clientB = clientB;

	clientA.connection.send(JSON.stringify({type: 'complete_realy', data: clientB.id }));
	clientB.connection.send(JSON.stringify({type: 'complete_realy', data: clientA.id }));
}