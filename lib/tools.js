online_user = {};
waiting_fight_user = {};

exports.new_user = function(user_id, user_info){
	online_user[user_id] = user_info;
}

// when people come into fight room
exports.new_fight_user = function(user_id, user_info){
	waiting_fight_user[user_id] = user_info;
	return judge_length(waiting_fight_user);
}

exports.new_room = function(){

}

exports.del_user = function(){

}

exports.del_fight_user = function(){

}

exports.battle = function(){

}

// select x people to create a fight room
exports.select_x_people_to_fight = function(number){
	
}

// judge the length for hash
function judge_length(obj){
	var len = 0;
	for(x in a){
		len++;
	}
	return len;
}