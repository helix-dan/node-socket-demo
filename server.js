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

io.sockets.on('connection', function(socket){
	
})


// var http = require('http');
// var fs   = require('fs');

// var server = http.createServer(function(request, response){
// 	fs.readFile('./index.html', function(error, data){
// 		if (error) {
// 			response.writeHead(500);
// 			return response.end('Server Error')
// 		}

// 		response.writeHead(200);
// 		response.end(data, 'utf-8');
// 	})
// }).listen(3000);

// var io = require('socket.io').listen(server);

// io.sockets.on('connection', function(socket){

// })