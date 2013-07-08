var WebSocketServer = require('websocket').server;
var http            = require('http');

var server = http.createServer(function(request, response){

});

server.listen(3000, function(){
	console.log('helix\'s server listen on port 3000')
});

var wsServer = new WebSocketServer({
	httpServer: server
});

client_array = [];
fight_array = [];

var vistor_id = 0;



wsServer.on('request', function(request){
	var connection = request.accept('upup', request.origin);

	var current_client = {
		id: ++vistor_id,
		info: 'temp_info',
		connection: connection,
		fight_with: null
	}


	client_array.push(current_client);

	connection.on('message', function(message){
		if (message.type === 'utf8'){
			if (message.utf8Data === 'fight_ready'){
				fight_array.push(current_client)
				if (fight_array.length >= 2){
					var clientA = fight_array.shift();
					var clientB = fight_array.shift();
					console.log('ready into fight!');

					clientA.connection.send(JSON.stringify({type: 'complete_realy', data: clientB.id }));
					clientB.connection.send(JSON.stringify({type: 'complete_realy', data: clientA.id }));

					clientA.fight_with = clientB;
					clientB.fight_with = clientA;
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
		// client_array.pop(current_client);
		// 从所有的对战数组中，删除当前链接
		// fight_array.pop(current_client);
	});
});


function FightMod(clientA, clientB){
	this.clientA = clientA;
	this.clientB = clientB;
}