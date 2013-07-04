var io = require('socket.io').listen(3000);

var client_counter = 0

io.sockets.on('connection', function(socket){
	console.log("###### some one come in ######");
	client_counter++;

	socket.on('disconnect', function(){
		client_counter--;
		socket.broadcast.emit('message', {text: 'a user disconnect, left ' + client_counter + ' users.', number: client_counter});
	});

	socket.on('client_message', function(data){
		console.dir('@@@@@@@' + data + '@@@@@@@');
		socket.emit('share_message', {text: 'from server ' + data + ' just now'})
	});

	socket.emit('message', {text: 'you have connected!', number: client_counter})
	socket.broadcast.emit('message', {text: 'a new user joined us!!, and we have ' + client_counter + ' users', number: client_counter})
})