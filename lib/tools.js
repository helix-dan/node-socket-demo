waiting_users = {};
fight_rooms = {};
fight_users = {};
ROOM_ID = 0

// when people come into fight room
exports.new_waiting_user = function(user_id, user_info){
	waiting_users[user_id] = user_info;
	return judge_length(waiting_users);
}

exports.del_fight_user = function(){
	
}

exports.battle = function(){

}

exports.leave_waiting = function(users_id){
	console.log('---leave_waiting---')
	console.dir(waiting_users);
	waiting_users[users_id].connection.send(JSON.stringify({type: 'leave_success', data: 'you leave success' }));
	delete waiting_users[users_id]
	console.dir(waiting_users);
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
	// assign a 'fight_with' property for fight user
	for(var member in room_user){
		var temp_id = [];
		for(var i=0; i<users_id.length; ++i){
			if(users_id[i]===member){

			}else{
				temp_id.push(users_id[i]);
			}
		}
		room_user[member].fight_with = temp_id
		// add this user to fight_users
		fight_users[member] = room_user[member];
	}

	this.id = 'rid' + (++ROOM_ID).toString();
	this.member = room_user;
}