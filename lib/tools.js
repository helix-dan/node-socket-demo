waiting_users = {};
fight_rooms = {};
fight_users = {};
ROOM_ID = 0

// check number, how many people in waiting_users
exports.wait_people = function(){
	return waiting_users
}

// when people come into fight room
exports.new_waiting_user = function(user_id, user_info){
	waiting_users[user_id] = user_info;
	return judge_length(waiting_users);
}

// a user in waiting mode, then he want to leave
// del it in waiting_users hash
exports.leave_waiting = function(user_id){
	if (typeof waiting_users[user_id] === "undefined"){
		// ... nothing
	} else {
		delete waiting_users[user_id]
	}
}

// a user in fight mode, then he want to force leave
// del room, fight_users
exports.leave_fight = function(user_id){
	end_the_fight(user_id);

	if (typeof fight_users[user_id] === "undefined"){
		// nothing
	} else {
		var enemy = fight_users[user_id].fight_with;
		var the_room_id = fight_users[user_id].room_id;

		// delete the fuck man
		delete fight_users[user_id]
		// delete his enemy and send message
		for(var i=0; i<enemy.length; ++i){
			delete fight_users[enemy[i]];
		}
	}
}

// refactor it!!!
// init the room and send message to client
// for ROOM_USER_LSMIT = 2 only!!!!!!!!!!!!!!!!!!!!!!!!!
exports.init_room_two = function(room, client){
	for (var i=0; i<room.member.length; ++i){
		var his = fight_users[fight_users[room.member[i]].fight_with[0]]
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
		fight_users[room.member[i]].connection.send(JSON.stringify(send_info));
	}

	var temp_timer = setTimeout(function(){
		battle(order_room.id, client);
	}, 10000);

	room['temp_timer'] = temp_timer;
	fight_rooms[room.id] = room;

	// init answer order
	var order_room = init_fight_order_two(room);
}

// select x people to create a fight room, and delete it in the waiting_users
exports.select_x_people_to_fight = function(number){
	var inc = 0;
	var room_user = {};
	var users_id = [];

	// select x user from waiting users and del it
	for(var i in waiting_users){
		++inc
		if(inc > number){
			break;
		}else{
			users_id.push(i)
			room_user[i] = waiting_users[i];
			delete waiting_users[i];
		}
	}

	// new a fight room object
	// include x users and room id
	var room = new FightRoom(room_user, users_id);

	// push the room to fight_rooms
	fight_rooms[room.id] = room.member;

	return room
}

// check the point!
exports.compute_point = function(user_id, answer){
	var room_id = fight_users[user_id].room_id;
	var room = fight_rooms[room_id];

	// answer is right, plus one point
	if (room.right_answer === answer){
		fight_users[user_id].right_num ++;
		return true;
	} else {
		// answer is not right, plus one for wrong
		fight_users[user_id].wrong_num ++;

		if(fight_users[user_id].wrong_num >= 3){
			return false;
		}
		return true;
	}
}

// refactor it!!!
// init the room and send message to client
// for ROOM_USER_LSMIT = 2 only!!!!!!!!!!!!!!!!!!!!!!!!!
exports.send_status_to_another = function(user_id, answer){
	// send the result to another fight user
	var oppo_user_id = fight_users[user_id].fight_with[0];
	var send_info = {
		type: 'answer',
		data: {
			ans: answer,
			current: true
		}
	}

	fight_users[oppo_user_id].connection.send(JSON.stringify(send_info));
	fight_users[user_id].connection.send(JSON.stringify(send_info));
}

exports.go_on_battle = function(user_id, client){
	// find the room
	var room_id = fight_users[user_id].room_id

	// use function battle
	battle(room_id, client);
}

exports.end_fight = function(user_id){
	// usr function end_the_fight
	end_the_fight(user_id)
}

function end_the_fight(user_id){
	// check point and tell to the user
	var oppo_user_id = fight_users[user_id].fight_with[0];
	send_info = {
		type: 'result',
		data: {
			winner: oppo_user_id,
			loser: user_id,
			point: '100'
		}
	}

	var room = fight_rooms[fight_users[user_id].room_id];

	for(var i=0; i<room.member.length; ++i){
		fight_users[room.member[i]].connection.send(JSON.stringify(send_info));
	}

	var the_room_id = fight_users[user_id].room_id;

	// clear timeout, if it exist!
	clearTimeout(fight_rooms[the_room_id].timer);
	clearTimeout(fight_rooms[the_room_id].temp_timer);

	// delete the loser man
	delete fight_users[user_id];
	// delete another man
	delete fight_users[oppo_user_id];
	// delete the room
	delete fight_rooms[the_room_id];
}

function battle(room_id, client){
	var room = fight_rooms[room_id];

	var question = get_question(1, 1, room, client);

	// send question
	send_question(question, room_id, client);

	// change next question answer'er
	change_answer_user_id(room_id);
}

function get_question(level, category, room){
	// get it for redis 
	//......
	var all_question_number = Math.floor(Math.random()*59) + 1

	client.hgetall('qid:'+all_question_number.toString(), function(err. data){
		if(err){
			console.log(err);
			
			
		}else{
			var question = data;
			question['ans_id'] = room.answer_user_id

			room.right_answer = question['h'][parseInt(question['a'])-1]
			fight_rooms[room.id] = room;

			return question;
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
function change_answer_user_id(room_id){
	var room = fight_rooms[room_id];
	for(var i=0; i<room.member.length; ++i){
		if(room.member[i] === room.answer_user_id){
			// nothing change
		} else {
			room.answer_user_id = room.member[i]
			break;
		}
	}

	fight_rooms[room_id] = room;
}

// refactor it!!!!!
// for use only 2 people!!!!!!
function send_question(question, room_id, client){
	// clear the time out
	clearTimeout(fight_rooms[room_id].timer);

	var room = fight_rooms[room_id];

	var uid1     = room.member[0];
	var wrong1   = fight_users[uid1].wrong_num;
	var current1 = fight_users[uid1].right_num;

	var uid2     = room.member[1];
	var wrong2   = fight_users[uid2].wrong_num;
	var current2 = fight_users[uid2].right_num;

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
			fight_users[room.member[i]].connection.send(JSON.stringify(send_info));
		} else {
			// the user is wait'er
			send_info.data['respondent'] = false;
			fight_users[room.member[i]].connection.send(JSON.stringify(send_info));
		}
	}

	room = set_question_timeout(room, 19000, client);
	fight_rooms[room.id] = room;
}

//
function set_question_timeout(room, time, client){
	var timer = setTimeout(function(){
		var out_user_id = fight_users[room.answer_user_id].fight_with

		if((++(fight_users[out_user_id].wrong_num)) >= 3){
			end_the_fight(out_user_id);
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
	if (fight_users[room.member[0]].iq >= fight_users[room.member[1]].iq){
		fight_users[room.member[0]].answer = true;
		room.answer_user_id = room.member[0]
	} else {
		fight_users[room.member[1]].answer = true;
		room.answer_user_id = room.member[1];
	}

	fight_rooms[room.id] = room;
	
	return room
}

// judge the length for hash
function judge_length(obj){
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

		// add this user to fight_users
		fight_users[member] = room_user[member];
	}

	this.member = member_ids;
	this.answer_user_id = '0';
}