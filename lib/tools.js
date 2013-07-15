waitingUsers = {};
fightRooms   = {};
fightUsers   = {};
ROOM_ID      = 0;

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
exports.init_room_two = function(room, client){
	for (var i=0; i<room.member.length; ++i){
		var his = fightUsers[fightUsers[room.member[i]].fight_with[0]]
		var his_data = {
			name: his.name,
			sex: his.sex,
			iq: his.iq
		}

		var send_info = {
			type: 'competitor',
			data: {
				room: room.id,
				oppo_data: his_data,
				text: '找到对手！等待10秒钟开始战斗!!'
			}
		}
		fightUsers[room.member[i]].connection.send(JSON.stringify(send_info));
	}

	var temp_timer = setTimeout(function(){
		battle(order_room.id, client);
	}, 10000);

	room['temp_timer'] = temp_timer;
	fightRooms[room.id] = room;

	// init answer order
	var order_room = init_fight_order_two(room);
}

// select x people to create a fight room, and delete it in the waiting_users
exports.select_x_people_to_fight = function(number){
	var inc = 0;
	var room_user = {};
	var users_id = [];

	// select x user from waiting users and del it
	for(var i in waitingUsers){
		++inc
		if(inc > number){
			break;
		}else{
			users_id.push(i)
			room_user[i] = waitingUsers[i];
			delete waitingUsers[i];
		}
	}

	// new a fight room object
	// include x users and room id
	var room = new FightRoom(room_user, users_id);

	// push the room to fightRooms
	fightRooms[room.id] = room.member;

	return room
}

// check the point!
exports.compute_point = function(userId, answer){
	var room_id = fightUsers[userId].room_id;
	var room = fightRooms[room_id];

	// answer is right, plus one point
	if (room.right_answer === answer){
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

// refactor it!!!
// init the room and send message to client
// for ROOM_USER_LSMIT = 2 only!!!!!!!!!!!!!!!!!!!!!!!!!
exports.send_status_to_another = function(userId, answer){
	// send the result to another fight user
	var oppoUserId = fightUsers[userId].fight_with[0];
	var send_info = {
		type: 'answer',
		data: {
			ans: answer,
			current: true
		}
	}

	fightUsers[oppoUserId].connection.send(JSON.stringify(send_info));
	fightUsers[userId].connection.send(JSON.stringify(send_info));
}

exports.go_on_battle = function(userId, client){
	// find the room
	var room_id = fightUsers[userId].room_id

	// use function battle
	battle(room_id, client);
}

exports.end_fight = function(userId){
	endTheFight(userId)
}

function endTheFight(userId){
	// check point and tell to the user
	var oppoUserId = fightUsers[userId].fight_with[0];
	send_info = {
		type: 'result',
		data: {
			winner: oppoUserId,
			loser: userId,
			point: '100'
		}
	}

	var room = fightRooms[fightUsers[userId].room_id];

	for(var i=0; i<room.member.length; ++i){
		fightUsers[room.member[i]].connection.send(JSON.stringify(send_info));
	}

	var the_room_id = fightUsers[userId].room_id;

	// clear timeout, if it exist!
	clearTimeout(fightRooms[the_room_id].timer);
	clearTimeout(fightRooms[the_room_id].temp_timer);

	// delete the loser man
	delete fightUsers[userId];
	// delete another man
	delete fightUsers[oppoUserId];
	// delete the room
	delete fightRooms[the_room_id];
}

function battle(room_id, client){
	var room = fightRooms[room_id];

	get_question(1, 1, room, client);

	// change next question answer'er
	changeAnswerUserId(room_id);
}

function get_question(level, category, room, client){
	// get it for redis 
	//......
	var all_question_number = Math.floor(Math.random()*59) + 1

	client.hgetall('qid:'+all_question_number.toString(), function(err, data){
		if(err){
			console.log(err);
			return question

		}else{
			var question = data;

			question['h']      = JSON.parse(question['h']);
			question['ans_id'] = room.answerUserId;

			room.right_answer = question['h'][parseInt(question['a'])-1]
			fightRooms[room.id] = room;

			// send question
			send_question(question, room.id, client);
		}
	})

	// var question = {
	// 	q: 'How many member we have in our teams?',
	// 	h: ['21', '24', '27', '29'],
	// 	a: '3',
	// 	c: 'cop',
	// 	d: 9,
	// 	ans_id: room.answer_user_id
	// }

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
function send_question(question, room_id, client){
	// clear the time out
	clearTimeout(fightRooms[room_id].timer);

	var room = fightRooms[room_id];

	var uid1     = room.member[0];
	var wrong1   = fightUsers[uid1].wrong_num;
	var current1 = fightUsers[uid1].right_num;

	var uid2     = room.member[1];
	var wrong2   = fightUsers[uid2].wrong_num;
	var current2 = fightUsers[uid2].right_num;

	var send_info = {
		type: 'question',
		data: {
			question: question,
			respondent: false,
			info: [{uid: uid1, wrong: wrong1, current: current1},
				   {uid: uid2, wrong: wrong2, current: current2}]
		}
	}

	for(var i=0; i<room.member.length; ++i){
		if(room.member[i] === question['ans_id']){
			// the user is answer'er
			send_info.data['respondent'] = true;
			fightUsers[room.member[i]].connection.send(JSON.stringify(send_info));
		} else {
			// the user is wait'er
			send_info.data['respondent'] = false;
			fightUsers[room.member[i]].connection.send(JSON.stringify(send_info));
		}
	}

	room = set_question_timeout(room, 19000, client);
	fightRooms[room.id] = room;
}

//
function set_question_timeout(room, time, client){
	var timer = setTimeout(function(){
		var outUserId = fightUsers[room.answerUserId].fight_with

		if((++(fightUsers[outUserId].wrong_num)) >= 3){
			endTheFight(outUserId);
		}else{
			battle(room.id, client);
		}
	}, time)

	room['timer'] = timer

	return room;
}

// init fight order
// for ROOM_USER_LSMIT = 2 only!!!!!!!!!!!!!!!!!!!!!!!!!
function init_fight_order_two(room){
	if (fightUsers[room.member[0]].iq >= fightUsers[room.member[1]].iq){
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
function FightRoom(room_user, users_id) {
	this.id = 'rid' + (++ROOM_ID).toString();

	var member_ids = []

	// assign a 'fight_with' property for fight user
	for(var member in room_user){
		var temp_id = [];
		member_ids.push(member);
		for(var i=0; i<users_id.length; ++i){

			if(users_id[i]===member){

			}else{
				temp_id.push(users_id[i]);
			}
		}
		room_user[member].id = room_user
		room_user[member].fight_with = temp_id
		room_user[member].room_id = this.id

		// add this user to fightUsers
		fightUsers[member] = room_user[member];
	}

	this.member = member_ids;
	this.answerUserId = '0';
}