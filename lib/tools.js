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
exports.newWaitingUser = function(useSid, userInfo){
	// 保存 usr sid 到 waitingUsers
	waitingUsers[useSid] = userInfo;
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

// 进入房间，并且给房间里的人发送对手的资料
function initRoom (room, client){
	for (var i=0; i<room.member.length; ++i){
		// 这里的his表示对手的信息
		// fightUsers[room.member[i]].fight_with[0] return usrid
		var his = fightUsers[fightUsers[room.member[i]].fight_with[0]]
		// 拼装对手的信息
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

		// 发送对手信息（如果是机器人的话 type === 'AI'，就不用发了）
		if(fightUsers[room.member[i]].type === 'user'){
			fightUsers[room.member[i]].connection.send(JSON.stringify(send_info));
		}
	}

    // 设置一个set time out
    // 3秒钟后执行里面的事情（开始战斗）
	var tempTimer = setTimeout(function(){
		battle(orderRoom.id, client);
	}, 3000);

	// 将set time out作为room的一个属性，存起来
	// 存起来的作用就是，万一有人进入战斗了，然后在等待过程中强制退出的时候，要消除这个timer
	// 不然的话，执行的时候发生错误
	room['temp_timer'] = tempTimer;

	// 再存一次room, 主要是存 temp_timer
	fightRooms[room.id] = room;

	// 决定回答次序
	var orderRoom = initFightOrderTwo(room);
}

// init fight order
// for ROOM_USER_LSMIT = 2 only!!!!!!!!!!!!!!!!!!!!!!!!!
function initFightOrderTwo(room){
	// 暂时决定渊博值（exp）高的先答题, 不过市场不关注这件事无所谓谁先答
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

// 处理机器人模式
// 1. 删除等待队列的用户
// 2. 从 redis取出机器人并创建机器人房间，取出机器人信息
exports.intoAIMode = function(userId, client){
	var roomUser = {};
	var roomUsersId = [];

	roomUser[userId] = waitingUsers[userId];
	roomUsersId.push(userId);
	delete waitingUsers[userId];

	// select x user from waiting users and del it
	// AI ID   AI6uid:test
	// 'set:usr:vrtl' 存放机器人的集合
	//  redis 127.0.0.1:6381> smembers set:usr:vrtl
	client.srandmember('set:usr:vrtl', function(err, data){
		client.hgetall(data, function(err, userInfo){
			var ai = {};
			ai['name'] = userInfo['name'];
			ai['pic']  = userInfo['pic'];
			ai['rank'] = userInfo['rank'];
			ai['exp']  = userInfo['exp'];
			ai['rate'] = userInfo['cnt'];
			ai['right_num']  = 0;
			ai['wrong_num']  = 0;
			ai['type'] = 'AI'

            // aiSid 机器人的Sid
			var aiSid = 'AI' + (++AI_ID).toString() + data;
			roomUsersId.push(aiSid);
			roomUser[aiSid] = ai;

			var room = new FightRoom(roomUser, roomUsersId, 'AI');

			fightRooms[room.id] = room;

			initRoom(room, client);
		})
	})
}

// select x people to create a fight room, and delete it in the waiting_users
// 所有程序从这里开始执行，随机选择两个人开始对战
exports.selectXPeopleToFight = function(number){
	var inc = 0;
	var roomUser = {};
	var roomUsersSid = [];

	// select x user from waiting users and del it
	// sid 从客户端上传，从 waitingUsers 取
	for(var sid in waitingUsers){
		++inc;
		if(inc > number){
			break;
		}else{
			roomUsersSid.push(sid);
			roomUser[sid] = waitingUsers[sid];

			// clear timeout, if it exist!
			clearTimeout(waitingUsers[sid]['ai_timer']);
			delete waitingUsers[sid];
		}
	}

	// new a fight room object
	// include x users and room id
	var room = new FightRoom(roomUser, roomUsersSid, 'VS');

	// push the room to fightRooms
	fightRooms[room.id] = room;
	return room
}

// fight room class
// mode is 'VS' 人人对战; 'AI' 人机对战
function FightRoom(room_user, users_sid, mode) {
	// 为房间分配唯一room id
	this.id = 'rid' + (++ROOM_ID).toString();
	// 开始状态为 false: 未开始
	this.start = false;
	var memberIds = []
	// assign a 'fight_with' property for fight user
	// 初始化房间，以及初始化房间内两个人的信息
	for(var member in room_user){
		var temp_id = [];
		memberIds.push(member);
		for(var i=0; i<users_sid.length; ++i){
			if(users_sid[i]===member){

			}else{
				temp_id.push(users_sid[i]);
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

// check the point!
exports.computePoint = function(userId, answer){
	var go_on = computeThePoint(userId, answer)
	return go_on;
}

function computeThePoint(userId, answer){
	// 曾经有一个bug在这里出现，但是我一直没办法还原问题（是在机器人对战模式中出现的情况）
    // if (!process.listeners('uncaughtException').length) throw e;
    // TypeError: Cannot read property 'room_id' of undefined
    // !!!这里有一个看不见的坑
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
		// room['send_info'] 备份来源于 saveTempQuestionForDisconnectUser 函数
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
// exports.sendStatusToAnother = function(userId, answer){
// 	// send the result to another fight user
// 	var oppoUserId = fightUsers[userId].fight_with[0];
// 	var send_info = {
// 		type: 'answer',
// 		data: {
// 			ans: answer,
// 			correct: true
// 		}
// 	}
// 	if(fightUsers[userId].type === 'user'){
// 		fightUsers[userId].connection.send(JSON.stringify(send_info));
// 	}
// 	if(fightUsers[oppoUserId].type === 'user'){
// 		fightUsers[oppoUserId].connection.send(JSON.stringify(send_info));
// 	}
// }

// 继续答题
exports.goOnBattle = function(userId, client){
	goOnTheBattle(userId, client);
}

function goOnTheBattle (userId, client){
	// find the room
	// 找到这个roomid, 继续在这个房间里面答题
	var roomId = fightUsers[userId].room_id

	// use function battle
	battle(roomId, client);
}

// 结束对战
exports.endFight = function(userId, client){
	endTheFight(userId, client)
}

// 结束对战要做的事情
// 1.首先告诉双方的战果; 
// 2.清除所有timer; 
// 3.清理战场
function endTheFight(userId, client){
	if (typeof fightUsers[userId] === "undefined"){
		// 等待时离开会进入这里处理
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
   
        // 把对战结果写到redis
        // oppoUserId: 赢家 ; userId: 输家 
		checkPointToRedis(oppoUserId, userId, client);

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
function checkPointToRedis(winnerId, loserId, client){
	// w : winner, l : loser
	var wexp   = parseInt(fightUsers[winnerId]['right_num']);
	var wwrong = parseInt(fightUsers[winnerId]['wrong_num']);
	var wcnt   = wexp + wwrong;

	var lexp   = parseInt(fightUsers[loserId]['right_num']);
	var lwrong = parseInt(fightUsers[loserId]['wrong_num']);
	var lcnt   = lexp + lwrong;

	var flag = 0;   // 是否有用户逃跑，0: 有; 1: 没有

	if(wwrong >= 3 || lwrong >= 3){
		flag = 1;
	}

    // winnerId 对机器人来说就是 sid.
	if(fightUsers[winnerId]['type'] == 'AI'){
		client.hgetall('sid:' + loserId, function(err, sidData){
						var lid = sidData['NUID'];
						var wid = winnerId.match(/(:)(\w+)/)[2]

						var send_info = 'wid:' + wid + '|wexp:' + wexp.toString() + '|wcnt:' + wcnt.toString() + 
										'|lid:' + lid + '|lexp:' + lexp.toString() +
					  					'|lcnt:' + lcnt.toString() + '|flag:' + flag.toString();

						client.lpush('list:challenge', send_info, function(){
							client.publish('msg', 'challenge');
						})
					});

	} else if (fightUsers[loserId]['type'] == 'AI'){
		client.hgetall('sid:' + winnerId, function(err, sidData){
						var wid = sidData['NUID'];
						var lid = loserId.match(/(:)(\w+)/)[2]

						var send_info = 'wid:' + wid + '|wexp:' + wexp.toString() + '|wcnt:' + wcnt.toString() + 
										'|lid:' + lid + '|lexp:' + lexp.toString() +
					  					'|lcnt:' + lcnt.toString() + '|flag:' + flag.toString();

					  	client.lpush('list:challenge', send_info, function(){
							client.publish('msg', 'challenge');
						})
					})
	} else {
		client.hgetall('sid:' + winnerId, function(err, sidData){
						var wid = sidData['NUID'];
						client.hgetall('sid:' + loserId, function(err, sidData){
											var lid = sidData['NUID'];
											var send_info = 'wid:' + wid + '|wexp:' + wexp.toString() + '|wcnt:' + wcnt.toString() + 
															'|lid:' + lid + '|lexp:' + lexp.toString() +
										  					'|lcnt:' + lcnt.toString() + '|flag:' + flag.toString();

										  	client.lpush('list:challenge', send_info, function(){
												client.publish('msg', 'challenge');
											})
										})
					   })
	}

}

// 对战的函数
function battle(room_id, client){
	var room = fightRooms[room_id];
	getQuestion('1', '1', room, client);
}

// level: 题目难度（1-10）
// category: 分类
function getQuestion(level, category, room, client){
	// get it for redis 
	var allQuestionNumber = Math.floor(Math.random()*999) + 1; //取从 1-1000
	// floor 是取（参数）整数，不四舍五入，直接截掉小数点后的部分
    // example: 'qid:' + level + ':' + category + ':' + allQuestionNumber
	client.hgetall('qid:'+allQuestionNumber.toString(), function(err, data){
		// err: 可能是 redis err 或者 socket disconnect 网络错误
		if(err){
			console.log(err);
		}else{
			var question = data;
			if(question === null){
				// 实例问题
				var question = {
					q: '哪个城市从没被列入四大火炉？',
					h: ['南昌', '福州', '长沙', '杭州'],
					a: '3',
					c: 'cop',
					d: 9,
					ans_id: room.answerUserId    // 后门，谁来答这道题
				}
			}else{
				question['h']      = JSON.parse(question['h']);
				question['ans_id'] = room.answerUserId;
			}

            // 机器人回答，机器人模式 
			if(room.type === 'AI' && fightUsers[room.answerUserId].type === 'AI'){
				 // temp_rate 越小(取0-99)， 正确率越大
                 // 采用渊博值作为判断正确率的依据，渊博值越大的机器人rate应该越小 
                 // 可以理解为机器人答错的几率很高
				var temp_rate = fightUsers[room.answerUserId]['rate'];  //temp_rate = 60;
				var temp_answer = room.answerUserId;
				// 让机器人在 aiTimer (2-7s)内答题
				var aiTimer = setTimeout(function(){
					var go_on = true;
                    // 控制机器人的答题正确率
					if (Math.floor(Math.random()*100) >= temp_rate){
						// 机器人一定答对，60%的几率答对
						go_on = computeThePoint(temp_answer, (room.right_answer).toString());
					} else {
						// answer a question and check right answer
						// 在1\2\3\4中随机选择一个作为机器人选择的答案，机器人不一定答对
						go_on = computeThePoint(temp_answer, (Math.floor(Math.random()*4)+1).toString());
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
			// 送1题到client
			sendQuestion(question, room.id, client);

			// change next question answer'er
            // 更改回答用户的ID,即是当前谁回答
			changeAnswerUserId(room.id);
		}
	})
}

// refactor it!!!!!
// for use only 2 people!!!!!!
function sendQuestion(question, room_id, client){
	// clear the time out
	clearTimeout(fightRooms[room_id].timer);
	//clearTimeout(fightRooms[room_id].ai_timer);

	var room = fightRooms[room_id];
   
    // 生成send_info
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
    
    // 判断当前用户是否为答题用户，为真则答题，为假则看对方答题
	for(var i=0; i<room.member.length; ++i){
		if(room.member[i] === question['ans_id']){
			// the user is answer'er
			send_info.data['respondent'] = true;
			// 如果是user则送，如果是ai则不送
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

    // 存取一个临时，为掉线的用户
	saveTempQuestionForDisconnectUser(room, send_info)

	room = setQuestionTimeout(room, 19000, client);
	room.start = true;
	fightRooms[room.id] = room;
}

function saveTempQuestionForDisconnectUser(room, send_info){
	// 会覆盖原来的题,room['send_info'] 是备份
	room['send_info'] = send_info;
	fightRooms[room.id] = room;
}

function setQuestionTimeout(room, time, client){
	var timer = setTimeout(function(){
		var outUserId = fightUsers[room.answerUserId].fight_with
        // 谁先答错3道题则结束对战,18s过时后强制送题并判定上1道题答题失败
        // 否则继续对战
		if((++(fightUsers[outUserId].wrong_num)) >= 3){
			endTheFight(outUserId, client);
		}else{
			battle(room.id, client);
		}
	}, time)

	room['timer'] = timer
	return room;
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

// judge the length for hash
function judgeLength(obj){
	var len = 0;
	for(x in obj){
		len++;
	}
	return len;
}

