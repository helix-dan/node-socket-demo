var WebSocketServer = require('websocket').server;
var http            = require('http');

var server = http.createServer(function(request, response){

});

server.listen(3000, function(){
	console.log('server listen on port 3000')
});

var wsServer = new WebSocketServer({
	httpServer: server
});

wsServer.on('request', function(request){
	console.log('- -');

	var connection = request.accept(null, request.origin);

	connection.on('message', function(message){
		if (message.type === 'utf8'){
			console.dir(message.utf8Data);
			connection.send(message.utf8Data)
		}else{
			connection.sendBytes(message.binaryData);
			console.log('get byte data.');
		}
	});

	connection.on('close', function(connection){
		console.log('a account lost connect')
	});
});