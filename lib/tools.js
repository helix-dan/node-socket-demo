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
		waiting_users[user_id].connection.send(JSON.stringify({type: 'leave_success', data: 'you leave success' }));
		delete waiting_users[user_id]
	}
}

// a user in fight mode, then he want to force leave
// del room, fight_users
exports.leave_fight = function(user_id){
	if (typeof fight_users[user_id] === "undefined"){
		// nothing
	} else {
		fight_users[user_id].connection.send(JSON.stringify({type: 'force_leave', data: 'FUCK YOU!' }));
		var enemy = fight_users[user_id].fight_with;
		var the_room_id = fight_users[user_id].room_id;

		// delete the fuck man
		delete fight_users[user_id]
		// delete his enemy and send message
		for(var i=0; i<enemy.length; ++i){
			fight_users[enemy[i]].connection.send(JSON.stringify({type: 'another_leave', data: user_id + 'leave fight, you win!' }))
			delete fight_users[enemy[i]];
		}

		// delete the room
		delete fight_rooms[the_room_id]
	}
}

// init the room and send message to client
// for ROOM_USER_LSMIT = 2 only!!!!!!!!!!!!!!!!!!!!!!!!!
exports.init_room_two = function(room){
	for (var i=0; i<room.member.length; ++i){
		var his = fight_users[fight_users[room.member[i]].fight_with[0]]
		var his_data = {
			name: 'helix' + fight_users[room.member[i]].fight_with[0],
			sex: his.sex,
			iq: his.iq
		}

		var send_info = {
			type: 'find_user',
			data: {
				room: room.id,
				oppo_data: his_data,
				text: 'find people, left 3 second into fight!!'
			}
		}
		fight_users[room.member[i]].connection.send(JSON.stringify(send_info));
	}

	setTimeout(function(){
		battle(order_room.id);
	}, 3000)

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

exports.compute_point = function(user_id, answer){
	var room_id = fight_users[user_id].room_id;
	var room = fight_rooms[room_id];

	// answer is right
	if (room.right_answer === answer){
		fight_users[user_id].right_num ++;
		return true;
	} else {
		// answer is not right
		fight_users[user_id].wrong_num ++;
		if(fight_users[user_id].wrong_num >= 3){
			return false;
		}
		return true;
	}
}

exports.send_status_to_another = function(user_id, answer){
	// send the result to another fight user
	var oppo_user_id = fight_users[user_id].fight_with[0];
	var send_info = {
		type: 'answer_status',
		data: answer
	}
// console.log('answer' + send_info['data'])
	fight_users[oppo_user_id].connection.send(JSON.stringify(send_info));
}

exports.go_on_battle = function(user_id){
	// find the room
	var room_id = fight_users[user_id].room_id

	// use function battle
	battle(room_id);
}

exports.end_fight = function(user_id){
	// check point and tell to the user
	var send_info = {
		type: 'end_fight',
		data: {
			text: 'you are loser!!!',
			point: '0'
		}
	}
	fight_users[user_id].connection.send(JSON.stringify(send_info));

	var oppo_user_id = fight_users[user_id].fight_with[0];
	send_info = {
		type: 'end_fight',
		data: {
			text: 'you are winner!!!',
			point: '100'
		}
	}

	fight_users[oppo_user_id].connection.send(JSON.stringify(send_info));

	var the_room_id = fight_users[user_id].room_id;
	// delete the loser man
	delete fight_users[user_id]
	// delete another man
	delete fight_users[oppo_user_id];
	// delete the room
	delete fight_rooms[the_room_id]
console.dir(fight_rooms)
console.dir(fight_users)
}

function battle(room_id){
	var room = fight_rooms[room_id];

	var question = get_question(1, 1, room);

	// send question
	send_question(question, room_id);

	// change next question answer'er
	change_answer_user_id(room_id);
}

function get_question(level, category, room){
	// get it for redis
	//......

	var question = {
		q: 'A man have how many eggs?',
		h: ['one', 'two', 'what is eggs?', 'no one'],
		a: '2',
		c: 'biology',
		d: 9,
		ans: room.answer_user_id
	}

	room.right_answer = question['h'][parseInt(question['a'])-1]
	fight_rooms[room.id] = room;

	return question;
}

// not found loog method so....
// for ROOM_USER_LSMIT = 2 only!!!!!!!!!!!!!!!!!!!!!!!!!
function change_answer_user_id(room_id){
	var room = fight_rooms[room_id];
	for(var i=0; i<room.member.length; ++i){
		if(room.member[i] === room.answer_user_id){

		} else {
			room.answer_user_id = room.member[i]
			break;
		}
	}

	fight_rooms[room_id] = room;
}

function send_question(question, room_id){
	var room = fight_rooms[room_id];
	var send_info = {
		type: 'question',
		data: question
	}

	for(var i=0; i<room.member.length; ++i){
		fight_users[room.member[i]].connection.send(JSON.stringify(send_info));
	}
}

// init fight order
// for ROOM_USER_LSMIT = 2 only!!!!!!!!!!!!!!!!!!!!!!!!!
function init_fight_order_two(room){
// 	var fight_ids = []
// 	for(var men in room.member){
// 		fight_ids.push(men);
// 	}
// console.dir(room)
// console.dir(fight_ids);
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