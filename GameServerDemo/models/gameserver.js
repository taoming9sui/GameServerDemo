let GolangGame = require('./golanggame.js');

class GameRoom {
	
	constructor(roomNumber, roomName, roomPwd, gameId){	
		this.number = roomNumber;
		this.name = roomName;
		this._playerInRoom = {};
		this._playerCount = 0;
		this._password = roomPwd;
		//TODO: 与游戏配置相关
		switch(gameId){
		case "golang":
			this._gameObj = new GolangGame(this);
			break;
		default:
			this._gameObj = new GolangGame(this);
			break;
		}
		this.maxPlayer = this._gameObj.getMaxPlayer();
	}
	
	// 面向大厅
	getGameName(){
		return this._gameObj.getGameName();
	}
	getGameId(){
		return this._gameObj.getGameId();
	}
	getRoomStatus(){
		if(!this._gameObj.isOpened()){
			return 2;
		}
		if(this._playerCount >= this.maxPlayer){
			return 1;
		}
		return 0;
	}
	getPlayerCount(){
		return this._playerCount;
	}
	isOpenedFor(params){
		if(params.needCheck){
			if(this.getRoomStatus() != 0){
				return false;
			}
			if(this._password != params.password){
				return false;
			}
		}
		return true;
	}
	hasRoomPwd(){
		return !this._password == "";
	}
	join(player, params){
		if(params.needCheck){
			if(this.getRoomStatus() != 0){
				throw { "log": `${player.id}：该房间不开放`, "alert": `该房间不开放` };
			}
			if(this._password != params.password){
				throw { "alert": `房间密码错误` };
			}			
		}
		this._playerInRoom[player.id] = player;
		this._playerCount += 1;
		this._gameObj.onPlayerJoin(player.id, player.name);
	}
	leave(playerId){
		let player = this._playerInRoom[playerId];
		this._gameObj.onPlayerLeave(player.id);
		delete this._playerInRoom[playerId];
		this._playerCount -= 1;
	}
	onGameMsg(playerId, data){
		this._gameObj.onGameMsg(playerId, data);
	}

	
	// 面向游戏客户端
	broadGameMsg(data){
		for(let playerId in this._playerInRoom){
			let player = this._playerInRoom[playerId];
			player.socket.emit("game-msg", data);
		}
	}
	sendGameMsg(playerId ,data){
		let player = this._playerInRoom[playerId];
		if(player){
			player.socket.emit("game-msg", data);
		}
	}
}


class GameServer {
	
	// 大厅运转维护
	constructor(socketio){	
		// TODO: 房间数配置
		this._io = socketio;
		this._maxRoom = 512;
		this._roomCounter = 0;
		this._rooms = {};
		this._roomInfo = [];
		this._playerSet = {};
		this._roomIdbyPlayerId = {};
		
		this._initServer();
	}		
	_initServer(){
		this._io.on('connection', (socket) => {		
			this.onConnect(socket);
		});
		
		// 周期更新房间信息
		setInterval(() => {
			this._updateRoomInfo();
		}, 1000);
	}
	_updateRoomInfo(){
		this._roomInfo = [];
		for(let idx in this._rooms){
			let inf = {};
			inf.roomId = idx;
			inf.roomName = this._rooms[idx].name;
			inf.hasPwd = this._rooms[idx].hasRoomPwd();
			inf.gameName = this._rooms[idx].getGameName();
			inf.playerCount = this._rooms[idx].getPlayerCount();
			inf.maxPlayer = this._rooms[idx].maxPlayer;
			inf.roomStatus = this._rooms[idx].getRoomStatus();
			this._roomInfo.push(inf);
		}	
	}
	

	// 接收客户端
	onConnect(socket){
		// 创建用户 赋予id进入服务器
		this._addPlayer(socket);
	}
	onDisconnect(playerId){
		this._removePlayer(playerId);
	}
	onServerMsg(playerId, data){
		switch(data.type){
		case "hallchat":
			{
			this.hallChat(playerId, data.content.txt, data.content.time);
			}		
			break;
		case "joinroom":
			{
			this.joinRoom(playerId, data.content.roomId, data.content.roomPwd);
			}
			break;	
		case "leaveroom":
			{
			this.leaveRoom(playerId);
			}
			break;
		case "createroom":
			{
			this.createJoinRoom(playerId, data.content.roomName, data.content.roomPwd, data.content.gameId);
			}
			break;
		case "roominfo":
			{
			this.sendRoomInfo(playerId, data.content.begin, data.content.end);
			}
			break;
		}
	}
	onGameMsg(playerId, data){
		let player = this._playerSet[playerId];
		let roomId = this._roomIdbyPlayerId[playerId];
		if(roomId){
			let room = this._rooms[roomId];
			room.onGameMsg(playerId, data);
		}
	}
	_addPlayer(socket){
		let player = new GamePlayer(this, socket);
		this._playerSet[player.id] = player;
		this.hallNotify(`欢迎[${player.name}]加入服务器`);
		console.log(`${player.id}[${player.name}]加入服务器`);
	}
	_removePlayer(playerId){
		this.leaveRoom(playerId);
		delete this._playerSet[playerId];
		console.log(`${playerId}离开服务器`);
	}

	
	// 反馈客户端
	_sendServerMsg(player, data){
		player.socket.emit("server-msg", data);
	}
	_broadServerMsg(data){
		this._io.emit("server-msg", data);
	}
	
	// 大厅服务功能
	joinRoom(playerId, roomId, roomPwd){
		try{
			let player = this._playerSet[playerId];
			let room = this._rooms[roomId];
			if(!room){
				throw { "log": `${playerId}：无效的房间号` ,"alert":`该房间已失效` };
			}		
			let inRoomId = this._roomIdbyPlayerId[playerId];
			if(inRoomId){
				throw { "log": `${playerId}：已经加入一个房间` };
			}
						
			let params = { "needCheck": true, "password": roomPwd };
			room.join(player, params);
			this._roomIdbyPlayerId[playerId] = roomId;
			this._joinRoomMsg(playerId, room);
		}catch(err){
			if(err.log)
				console.log(err.log);
			if(err.alert)
				this.sendAlert(playerId, err.alert);
		}
	}
	createJoinRoom(playerId, roomName, roomPwd, gameId){
		try{
	        let count = Object.keys(this._rooms).length;
	        let player = this._playerSet[playerId];
			let roomId = this._roomIdbyPlayerId[playerId];
	        if(count > this._maxRoom) {
				throw { "log":`${playerId}：房间数已满，创建房间失败`, "alert":`房间数已满，创建房间失败` };
	        }
	        if(!this._checkRoomName(roomName)){
	        	throw { "log":`${playerId}：房间名格式非法`, "alert":`房间名格式非法` };
	        }
	        if(!this._checkRoomPwd(roomPwd)){
	        	throw { "log":`${playerId}：房间密码太长`, "alert":`房间密码太长（超过16位）` };
	        }
	        if(roomId){
	        	throw { "log":`${playerId}：已经加入一个房间` };
	        }
	        
	        // TODO:房间编号采用计数器
	        this._roomCounter++;
	        roomId = "room_" +  this._roomCounter.toString();
	        while(this._rooms[roomId]){
		        if(this._roomCounter >= this._maxRoom)
		        	this._roomCounter = 0;
		        this._roomCounter++;
		        roomId = "room_" +  this._roomCounter.toString();
	        }
	        let roomNumber = this._roomCounter;
			let room = new GameRoom(roomNumber, roomName, roomPwd, gameId);
			this._rooms[roomId] = room;
			this._roomIdbyPlayerId[playerId] = roomId;
			let params = { "needCheck": false };
			room.join(player, params);
			this._joinRoomMsg(playerId, room);
		}catch(err){
			if(err.log)
				console.log(err.log);
			if(err.alert)
				this.sendAlert(playerId, err.alert);
		}
	}
	leaveRoom(playerId){
		try{
			let player = this._playerSet[playerId];
			let roomId = this._roomIdbyPlayerId[playerId];
			this._leaveRoomMsg(playerId);
			if(roomId){
				let room = this._rooms[roomId];
				room.leave(playerId);
				delete this._roomIdbyPlayerId[playerId];
				if(room.getPlayerCount() == 0) {
					delete this._rooms[roomId];
				}
			}
		}catch(err){
			console.log(err);
		}
	}
	hallChat(playerId, txt, time){
		let player = this._playerSet[playerId];
		let data = { "type": "hallmsg", "content": { "msgType":1, "sender": player.name, "txt": txt, "time": time } };
		this._broadServerMsg(data);
	}
	hallNotify(txt){
		let data = { "type": "hallmsg", "content": { "msgType":2, "txt": txt } };
		this._broadServerMsg(data);
	}
	sendAlert(playerId, alert){
		let player = this._playerSet[playerId];
		let data = { "type": "alert", "content": { "alert": alert } };
		this._sendServerMsg(player, data);	
	}
	sendRoomInfo(playerId, begin, end){
		let player = this._playerSet[playerId];
		let count = this._roomInfo.length;
		let list = [];		
		for(let i=begin; i<this._roomInfo.length && i<end; i++){
			if(this._roomInfo[i])
				list.push(this._roomInfo[i]);
		}
		let data = {
			"type": "roominfo", 
			"content": { "roomList": list, "roomCount": count }
		};
		this._sendServerMsg(player, data);
	}
	_joinRoomMsg(playerId, room){
		let player = this._playerSet[playerId];
		let gameId = room.getGameId();
		let data = { "type": "joinroom", "content": { "gameId": gameId} };
		this._sendServerMsg(player, data);
	}
	_leaveRoomMsg(playerId){
		let player = this._playerSet[playerId];
		let data = { "type": "leaveroom", "content": ""};
		this._sendServerMsg(player, data);	
	}

	
	// 工具函数
	_checkRoomName(name) {
		let patt = /^[\u4E00-\u9FA5A-Za-z0-9_]{3,16}$/;
		return patt.test(name);
	}
	_checkRoomPwd(password) {
		let patt = /^.{0,16}$/;
		return patt.test(password);
	}
}


// 客户端玩家
class GamePlayer {
	
	constructor(server, socket){
		this._server = server;
		this.socket = socket;
		this.id = null;
		this.name = null;
		
		this._initPlayer();
	}
	_initPlayer(){
		this.id = this.socket.id;
		let _getName = function(uid){
			uid = uid.replace(/[_\-]/g, "");
			let name = "";
			let fun = ["", "李", "维", "斯", "安", "因", "特", "", "瑞", "姆", "勒", "泽", "阿", ""
				, "达", "瑟", "克", "摩", "尔", "罗", ""
				, "圣", "弗", "玛", "洛", "奎", "杰", "尼", "德", "蒙", "提", "西", ""
				, "奥", "丁", "塔", "利", "索"];
			for(let i=0; i<uid.length; i++){
				if((i + 1) % 4 == 0 && i - 3 >= 0){
					let str = uid.substring(i-3, i+1);
					let code = parseInt(str, 36) % fun.length;
					name = name + fun[code];
				}
			}
			return name;
		};
		this.name = _getName(this.id);

		this.socket.on("game-msg", (data)=>{
			this.onGameMsg(data);
		});
		this.socket.on("server-msg", (data)=> {
			this.onServerMsg(data);
		});
		this.socket.on("disconnect", (data)=> {
			this.onDisconnect();
		});
	}
	
	
	onDisconnect(){
		this._server.onDisconnect(this.id);
	}
	onGameMsg(data){
		this._server.onGameMsg(this.id, data);
	}
	onServerMsg(data){
		this._server.onServerMsg(this.id, data);	
	}
}


module.exports = function(socketio){
	return new GameServer(socketio);
};