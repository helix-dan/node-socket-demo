var WebSocketServer = require('websocket').server;
var redis 			= require('redis');
var http            = require('http');
var tools			= require('./lib/tools.js');

var server = http.createServer(function(request, response){
	//...
});

process.title = 'node-mi20-websocket-challenge';

var redisConf = {
	host: '42.121.1.23',
	// host: '192.168.2.18',
	port: 6381
	// port: 6379
}

var client = redis.createClient(redisConf.port, redisConf.host);

server.listen(8889, function(){
	console.log('socket server listen on port 8889')
});

var wsServer = new WebSocketServer({
	httpServer: server
});

var ROOM_USER_LIMIT = 2;

wsServer.on('request', function(request){
	var connection = request.accept(null, request.origin);

	var userInfo = {
		room_id: null,
		connection: connection
	}

	// temp user id
	var userId = '';

	connection.on('message', function(message){
		if (message.type === 'utf8'){

			var msg = JSON.parse(message.utf8Data);
			// some user into fight room
			if (msg['type'] === 'join'){
				if (typeof fightUsers[userId] === "undefined"){
					client.hgetall('sid:' + msg.data, function(err, sidData){
						if(err){
							console.log(err);
						}else{
							if(sidData  === null){
								console.log('sid not found')
							} else {
								// if fight users have no this user
								client.hgetall('uid:' + sidData['NUID'], function(err, data){
									if(err){
										console.log(err)
									}else{
										if(data === null){
											console.log('can not find user');
											console.log(msg);
										}else{
											userId = msg.data;
											if (typeof fightUsers[userId] === "undefined"){
												userInfo['name'] = data['name'];
												userInfo['pic']  = data['pic'];
												userInfo['rank'] = data['rank'];
												userInfo['exp']  = data['exp'];
												userInfo['type'] = 'user';

												// use array! for the future 3, 4, 5 or more people!
												userInfo['fight_with'] = [];
												userInfo['right_num']  = 0;
												userInfo['wrong_num']  = 0;

												// add AI waiting timer
												var aiTimer = setTimeout(function(){
													// 请后续人解决这件事情:
													// Android没有处理好自己的退出机制，有时退出的时候会导致client app发生错误
													// 如果该用户在这种情况下仍然继续用对战模式，则他的sid会更换一个
													// 所以对应的uid也会不同
													if(typeof waitingUsers[userId] === 'undefined'){
														console.log('android client error!')
													}else{
														tools.intoAIMode(userId, client);
													}

												}, 10000)

												userInfo['ai_timer'] = aiTimer;

												// add this user to waiting_fight_room hash list
												var userWaitingNumber = tools.newWaitingUser(userId, userInfo);
												
												// judge the waiting list length
												// if people is enough to build fight room
												if (userWaitingNumber >= ROOM_USER_LIMIT){
													// get room obj
													var room = tools.selectXPeopleToFight(ROOM_USER_LIMIT);

													tools.initRoomTwo(room, client);
												}

											} else {
												// if he disconnect just now, and he want to reconnect
												fightUsers[userId]['connection'] = connection;
												// get competitor info
												tools.requestCompetitor(userId);
												// send question
												tools.requestQuestion(userId);
											}
										}
									}
								});
							}
						}
					});
				}

			} else if (msg['type'] === 'quit') {
				tools.leaveWaiting(userId);
				tools.endFight(userId);

			} else if (msg['type'] === 'answer'){
				if(typeof fightUsers[userId] === 'undefined'){
					// ...
				} else {
					// send answer status to another user
					// tools.sendStatusToAnother(userId, msg.data['ans'])

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
