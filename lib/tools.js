waitingUsers = {};
fightRooms   = {};
fightUsers   = {};
ROOM_ID      = 0;
AI_ID        = 0;

exports.getWaitUser = function(){
	return waitingUsers;
}

exports.getFightUser = function(){
	return fightUsers;
}

// when people come into fight room
exports.newWaitingUser = function(userId, userInfo){
	waitingUsers[userId] = userInfo;
	return judgeLength(waitingUsers);
}

// a user in waiting mode, then he want to leave
// del it in waiting_users hash
exports.leaveWaiting = function(userId){
	if (typeof waitingUsers[userId] === "undefined"){
		// ... nothing
	} else {
		delete waitingUsers[userId]
	}
}

// refactor it!!!
// init the room and send message to client
// for ROOM_USER_LSMIT = 2 only!!!!!!!!!!!!!!!!!!!!!!!!!
exports.initRoomTwo = function(room, client){
	initRoom(room, client);
}

function initRoom (room, client){
	for (var i=0; i<room.member.length; ++i){
		var his = fightUsers[fightUsers[room.member[i]].fight_with[0]]
		var his_data = {
			name: his.name,
			exp: his.exp,
			pic: his.pic,
			rank: his.rank
		}

		var send_info = {
			type: 'competitor',
			data: his_data
		}

		if(fightUsers[room.member[i]].type === 'user'){
			fightUsers[room.member[i]].connection.send(JSON.stringify(send_info));
		}
	}

	var tempTimer = setTimeout(function(){
		battle(orderRoom.id, client);
	}, 3000);

	room['temp_timer'] = tempTimer;
	fightRooms[room.id] = room;

	// init answer order
	var orderRoom = initFightOrderTwo(room);
}

exports.intoAIMode = function(userId, client){
	var roomUser = {};
	var roomUsersId = [];

	roomUser[userId] = waitingUsers[userId];
	roomUsersId.push(userId);
	delete waitingUsers[userId]

	// select x user from waiting users and del it
	client.srandmember('set:usr:vrtl', function(err, data){
		client.hgetall(data, function(err, userInfo){
			var ai = {};
			ai['name'] = userInfo['name'];
			ai['pic']  = userInfo['pic'];
			ai['rank'] = userInfo['rank'];
			ai['exp']  = userInfo['exp'];
			ai['right_num']  = 0;
			ai['wrong_num']  = 0;
			ai['type'] = 'AI'

			var aiId = 'AI' + (++AI_ID).toString();
			roomUsersId.push(aiId);
			roomUser[aiId] = ai

			var room = new FightRoom(roomUser, roomUsersId, 'AI');

			fightRooms[room.id] = room;

			initRoom(room, client);
		})
	})
}

// select x people to create a fight room, and delete it in the waiting_users
exports.selectXPeopleToFight = function(number){
	var inc = 0;
	var roomUser = {};
	var roomUsersId = [];

	// select x user from waiting users and del it
	for(var i in waitingUsers){
		++inc
		if(inc > number){
			break;
		}else{
			roomUsersId.push(i)
			roomUser[i] = waitingUsers[i];

			// clear timeout, if it exist!
			clearTimeout(waitingUsers[i]['ai_timer']);
			delete waitingUsers[i];
		}
	}

	// new a fight room object
	// include x users and room id
	var room = new FightRoom(roomUser, roomUsersId, 'VS');

	// push the room to fightRooms
	fightRooms[room.id] = room;
	return room
}

// check the point!
exports.computePoint = function(userId, answer){
	var go_on = computeThePoint(userId, answer)
	return go_on;
}

function computeThePoint(userId, answer){
	// 曾经有一个bug在这里出现，但是我一直没办法还原问题（是在机器人对战模式中出现的情况）
    // if (!process.listeners('uncaughtException').length) throw e;
    // TypeError: Cannot read property 'room_id' of undefined
	var room_id = fightUsers[userId].room_id;

	var room = fightRooms[room_id];
	// answer is right, plus one point
	if (room.right_answer === parseInt(answer)){
		fightUsers[userId].right_num ++;
		return true;
	} else {
		// answer is not right, plus one for wrong
		fightUsers[userId].wrong_num ++;

		if(fightUsers[userId].wrong_num >= 3){
			return false;
		}
		return true;
	}
}

exports.requestCompetitor = function(userId){
	var his = fightUsers[fightUsers[userId].fight_with[0]]
	var his_data = {
		name: his.name,
		exp: his.exp,
		pic: his.pic,
		rank: his.rank
	}

	var send_info = {
		type: 'competitor',
		data: his_data
	}

	if(fightUsers[userId].type === 'user'){
		fightUsers[userId].connection.send(JSON.stringify(send_info));	
	}
}

exports.requestQuestion = function(userId){
	var room = fightRooms[fightUsers[userId].room_id]
	if(room['start']===true){
		var send_info = room['send_info'];
		if(fightRooms[room.id].answerUserId === userId){
			send_info.data['respondent'] = false;
		} else {
			send_info.data['respondent'] = true;
		}
		if(fightUsers[userId].type === 'user'){
			fightUsers[userId].connection.send(JSON.stringify(send_info));	
		}
	}
}

// refactor it!!!
// init the room and send message to client
// for ROOM_USER_LSMIT = 2 only!!!!!!!!!!!!!!!!!!!!!!!!!
exports.sendStatusToAnother = function(userId, answer){
	// send the result to another fight user
	var oppoUserId = fightUsers[userId].fight_with[0];
	var send_info = {
		type: 'answer',
		data: {
			ans: answer,
			correct: true
		}
	}
	if(fightUsers[userId].type === 'user'){
		fightUsers[userId].connection.send(JSON.stringify(send_info));
	}
	if(fightUsers[oppoUserId].type === 'user'){
		fightUsers[oppoUserId].connection.send(JSON.stringify(send_info));
	}
}

exports.goOnBattle = function(userId, client){
	goOnTheBattle(userId, client);
}

function goOnTheBattle (userId, client){
	// find the room
	var roomId = fightUsers[userId].room_id

	// use function battle
	battle(roomId, client);
}

exports.endFight = function(userId, client){
	endTheFight(userId, client)
}

function endTheFight(userId, client){

	if (typeof fightUsers[userId] === "undefined"){
		// ... nothing
	} else {
		// check point and tell to the user
		var oppoUserId = fightUsers[userId].fight_with[0];
		send_info = {
			type: 'result',
			data: {
				winner: fightUsers[oppoUserId].name,
				loser: fightUsers[userId].name
			}
		}

		checkPointToPg(oppoUserId, userId, client);

		var room = fightRooms[fightUsers[userId].room_id];

		for(var i=0; i<room.member.length; ++i){
			if(fightUsers[room.member[i]].type === 'user'){
				fightUsers[room.member[i]].connection.send(JSON.stringify(send_info));
			}
		}

		var theRoomId = fightUsers[userId].room_id;

		// clear timeout, if it exist!
		clearTimeout(fightRooms[theRoomId].timer);
		clearTimeout(fightRooms[theRoomId].ai_timer);
		clearTimeout(fightRooms[theRoomId].temp_timer);

		// delete the loser man
		delete fightUsers[userId];
		// delete another man
		delete fightUsers[oppoUserId];
		// delete the room
		delete fightRooms[theRoomId];
	}
}

// check final points!
// and send the message to pg!
function checkPointToPg(winnerId, loserId, client){
	var wexp = parseInt(fightUsers[winnerId]['right_num']);
	var wwrong = parseInt(fightUsers[winnerId]['wrong_num']);
	var wcnt = wexp + wwrong;

	var lexp = parseInt(fightUsers[loserId]['right_num']);
	var lwrong = parseInt(fightUsers[loserId]['wrong_num']);
	var lcnt = lexp + lwrong;

	var flag = 1;

	if(wwrong < 3 || lwrong < 3){
		flag = 0;
	}

	var send_info = 'wid:' + winnerId + '|wexp:' + wexp.toString() + '|wwrong:' + wwrong.toString() + 
	  '|wcnt:' + wcnt.toString() + '|lid:' + loserId + '|lexp:' + lexp.toString() + '|lwrong:' + lwrong.toString() +
	  '|lcnt:' + lcnt.toString() + '|flag:' + flag.toString();

	// send to redis
	client.multi()
	      .lpush('list:challenge', send_info)
		  .publish('msg', 'challenge')
		  .exec();
}

function battle(room_id, client){
	var room = fightRooms[room_id];
	getQuestion(1, 1, room, client);
}

function getQuestion(level, category, room, client){
	// get it for redis 
	var allQuestionNumber = Math.floor(Math.random()*999) + 1;

	client.hgetall('qid:'+allQuestionNumber.toString(), function(err, data){
		if(err){
			console.log(err);
		}else{
			var question = data;
			if(question === null){
				var question = {
					q: 'How many member we have in our teams?',
					h: ['21', '24', '27', '29'],
					a: '3',
					c: 'cop',
					d: 9,
					ans_id: room.answerUserId
				}
			}else{
				question['h']      = JSON.parse(question['h']);
				question['ans_id'] = room.answerUserId;
			}

			if(room.type === 'AI' && fightUsers[room.answerUserId].type === 'AI'){
				var temp_answer = room.answerUserId;
				var aiTimer = setTimeout(function(){
					var go_on = true;

					if (Math.floor(Math.random()*5) >= 3){
						go_on = computeThePoint(temp_answer, (room.right_answer).toString());
					} else {
						// answer a question and check right answer
						go_on = computeThePoint(temp_answer, (Math.floor(Math.random()*7)+3).toString());
					}

					if(go_on){
						// go on battle
						goOnTheBattle(temp_answer, client);
					} else {
						// end the battle
						endTheFight(temp_answer, client);
					}
		
				}, (Math.floor(Math.random()*5)+2)*1000)

				room['ai_timer'] = aiTimer;
			}
			
			room.right_answer = parseInt(question['a']);
			fightRooms[room.id] = room;

			// send question
			sendQuestion(question, room.id, client);

			// change next question answer'er
			changeAnswerUserId(room.id);
		}
	})
}

// refactor it!
// not found loog method so....
// for ROOM_USER_LSMIT = 2 only!!!!!!!!!!!!!!!!!!!!!!!!!
function changeAnswerUserId(roomId){
	var room = fightRooms[roomId];
	for(var i=0; i<room.member.length; ++i){
		if(room.member[i] === room.answerUserId){
			// nothing change
		} else {
			room.answerUserId = room.member[i]
			break;
		}
	}
	fightRooms[roomId] = room;
}

// refactor it!!!!!
// for use only 2 people!!!!!!
function sendQuestion(question, room_id, client){
	// clear the time out
	clearTimeout(fightRooms[room_id].timer);
	//clearTimeout(fightRooms[room_id].ai_timer);

	var room = fightRooms[room_id];

	var uid1     = room.member[0];
	var name1    = fightUsers[uid1].name
	var wrong1   = fightUsers[uid1].wrong_num;
	var correct1 = fightUsers[uid1].right_num;

	var uid2     = room.member[1];
	var name2    = fightUsers[uid2].name
	var wrong2   = fightUsers[uid2].wrong_num;
	var correct2 = fightUsers[uid2].right_num;
	var send_info = {
		type: 'question',
		data: {
			question: question,
			respondent: false,
			info: [{uid: name1, wrong: wrong1, correct: correct1},
				   {uid: name2, wrong: wrong2, correct: correct2}]
		}
	}

	for(var i=0; i<room.member.length; ++i){
		if(room.member[i] === question['ans_id']){
			// the user is answer'er
			send_info.data['respondent'] = true;
			if(fightUsers[room.member[i]].type === 'user'){
				fightUsers[room.member[i]].connection.send(JSON.stringify(send_info));
			}
		} else {
			// the user is wait'er
			send_info.data['respondent'] = false;
			if(fightUsers[room.member[i]].type === 'user'){
				fightUsers[room.member[i]].connection.send(JSON.stringify(send_info));
			}
		}
	}

	saveTempQuestionForDisconnectUser(room, send_info)

	room = setQuestionTimeout(room, 19000, client);
	room.start = true;
	fightRooms[room.id] = room;
}

function saveTempQuestionForDisconnectUser(room, send_info){
	room['send_info'] = send_info;
	fightRooms[room.id] = room;
}

//
function setQuestionTimeout(room, time, client){
	var timer = setTimeout(function(){
		var outUserId = fightUsers[room.answerUserId].fight_with

		if((++(fightUsers[outUserId].wrong_num)) >= 3){
			endTheFight(outUserId, client);
		}else{
			battle(room.id, client);
		}
	}, time)

	room['timer'] = timer

	return room;
}

// init fight order
// for ROOM_USER_LSMIT = 2 only!!!!!!!!!!!!!!!!!!!!!!!!!
function initFightOrderTwo(room){
	if (fightUsers[room.member[0]].exp >= fightUsers[room.member[1]].exp){
		fightUsers[room.member[0]].answer = true;
		room.answerUserId = room.member[0]
	} else {
		fightUsers[room.member[1]].answer = true;
		room.answerUserId = room.member[1];
	}

	fightRooms[room.id] = room;
	
	return room
}

// judge the length for hash
function judgeLength(obj){
	var len = 0;
	for(x in obj){
		len++;
	}
	return len;
}

// fight room class
function FightRoom(room_user, users_id, mode) {
	this.id = 'rid' + (++ROOM_ID).toString();
	this.start = false;
	var memberIds = []
	// assign a 'fight_with' property for fight user
	for(var member in room_user){
		var temp_id = [];
		memberIds.push(member);
		for(var i=0; i<users_id.length; ++i){

			if(users_id[i]===member){

			}else{
				temp_id.push(users_id[i]);
			}
		}

		room_user[member].fight_with = temp_id
		room_user[member].room_id = this.id

		// add this user to fightUsers
		fightUsers[member] = room_user[member];
	}

	this.member = memberIds;
	this.answerUserId = '0';
	this.type = mode;
}