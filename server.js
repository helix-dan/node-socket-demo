var server = require('http').createServer(handler),
		fs     = require('fs'),
		io     = require('socket.io').listen(server);

server.listen(3000);

function handler (request, response) {
	fs.readFile('./index.html', function(error, data){
		if (error) {
			response.writeHead(500);
			return response.end('Server Error')
		}

		response.writeHead(200);
		response.end(data, 'utf8');
	});
}

var client_counter = 0

io.sockets.on('connection', function(socket){
	client_counter++;

	socket.on('disconnect', function(){
		client_counter--;
		socket.broadcast.emit('message', {text: 'a user disconnect, left ' + client_counter + ' users.', number: client_counter});
	})

	socket.emit('users', {number: client_counter})

	socket.emit('message', {text: 'you have connected!', number: client_counter})
	socket.broadcast.emit('message', {text: 'a new user joined us!!, and we have ' + client_counter + ' users', number: client_counter})
})