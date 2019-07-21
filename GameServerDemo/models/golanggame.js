class GolangGame {
	constructor(room){
		this._serverRoom = room;
		this._playerSet = {};
		this._playerNums = new Array(2);
		
		this._board = null;
		this._status = 0;
		this._nowTurn = 0;
	}
	
	// 面向房间
	onPlayerJoin(playerId, playerName){
		this.playerJoin(playerId, playerName);
	}
	onPlayerLeave(playerId){
		this.playerLeave(playerId);
	}
	onGameMsg(playerId, data){
		switch(data.type){
		case "requestroominfo":
			this.sendRoomInfo(playerId);
			break;
		case "gameready":
			this.playerReady(playerId, data.content);
			break;
		case "playerboardoperation":
			this.playerBoardOperation(playerId, data.content);
			break;
		}
	}
	getGameName(){
		return "五子棋";
	}
	getGameId(){
		return "golang";
	}
	getMaxPlayer(){
		return 2;
	}
	isOpened(){
		return this._status == 0;
	}
	
	// 游戏功能
	playerJoin(playerId, playerName){
		let golangPlayer = {};
		let num = 0;
		if(this._playerNums[0]){
			num = 1;
		}
		golangPlayer.number = num;
		golangPlayer.name = playerName;
		golangPlayer.isReady = false;
		golangPlayer.side = 0;
		this._playerNums[num] = playerId;
		this._playerSet[playerId] = golangPlayer;
		
		let data = { "type": "playerupdate", "content": { "number":num, "player":{ "name":golangPlayer.name, "isReady":false, "side":0 } } };
		this._serverRoom.broadGameMsg(data);
	}
	playerLeave(playerId, playerName){
		let golangPlayer = this._playerSet[playerId];
		let num = golangPlayer.number; 
		delete this._playerSet[playerId];
		this._playerNums[num] = null;
		
		let data = { "type": "playerupdate", "content": { "number":num, "player":null } };
		this._serverRoom.broadGameMsg(data);
		
		let side = golangPlayer.side;
		if(this._status == 1){
			let result = 0;
			if(side == 2)
				result = 1;
			else if(side == 1)
				result = 2;
			this.gameOver(result);
		}
	}	
	sendRoomInfo(playerId){
		let content = {};
		let player1 = this._playerSet[this._playerNums[0]];
		let player2 = this._playerSet[this._playerNums[1]];
		content.playerNum = this._playerSet[playerId].number;
		content.players = [];
		content.players[0] = player1 ? { "name":player1.name, "isReady":player1.isReady } : null;
		content.players[1] = player2 ? { "name":player2.name, "isReady":player2.isReady } : null;
		content.roomName = this._serverRoom.name;
		content.status = this._status;
		content.board = this._board;
		let data = { "type": "roominfo", "content": content };
		this._serverRoom.sendGameMsg(playerId, data);
	}
	playerReady(playerId, flag){
		let golangPlayer = this._playerSet[playerId];
		let num = golangPlayer.number;
		golangPlayer.isReady = flag;
		
		let data = { "type": "playerupdate", "content": { "number":num, "player":{ "name":golangPlayer.name, "isReady":golangPlayer.isReady, "side":0 } } };
		this._serverRoom.broadGameMsg(data);
		
		let player1 = this._playerSet[this._playerNums[0]];
		let player2 = this._playerSet[this._playerNums[1]];
		if(player1 && player2){
			if(player1.isReady && player2.isReady){
				this.gameStart();
			}
		}
	}
	gameStart(){
		// 游戏正式开始
		let player1 = this._playerSet[this._playerNums[0]];
		let player2 = this._playerSet[this._playerNums[1]];
		player1.isReady = false;
		player2.isReady = false;
		this._status = 1;
		let random = this.randomInt(0, 1);
		if(random){
			this._nowTurn = 0;
			player1.side = 1;
			player2.side = 2;
		}else{
			this._nowTurn = 1;
			player1.side = 2;
			player2.side = 1;			
		}
		this._board = new Array(15);
		for(let i=0; i<this._board.length; i++){
			this._board[i] = new Array(15);
			for(let j=0; j<this._board[i].length; j++){
				this._board[i][j] = 0;
			}
		}
		
		let content = {};
		content.nowTurn = this._nowTurn;
		content.player1Side = player1.side;
		content.player2Side = player2.side;
		let data = { "type": "gamestart", "content": content };
		this._serverRoom.broadGameMsg(data);
	}
	playerBoardOperation(playerId, operation){
		// 玩家走棋
		let x = operation.x;
		let y = operation.y;		
		let golangPlayer = this._playerSet[playerId];
		let side = golangPlayer.side;
		let num = golangPlayer.number;
		if(this._nowTurn == num && this._status == 1){
			let boardPos = this._board[x][y];
			if(boardPos == 0){
				if(side == 1)
					this._board[x][y] = 1;  // 下黑棋
				else if(side == 2)
					this._board[x][y] = 2;  // 下白棋
				let nextTurn = this._nowTurn == 0 ? 1 : 0;
				this._nowTurn = nextTurn;
				
				let content1 = { "x":x, "y":y, "side":side, "nextTurn": nextTurn};
				let data1 = { "type": "boardchange", "content": content1 };
				this._serverRoom.broadGameMsg(data1);
				
				let result = this.judgeBoard(this._board, x, y);
				if(result >= 0){
					this.gameOver(result);
				}
			}
		}
	}
	gameOver(result){
		this._status = 0;
		this._nowTurn = 0;		
		
		let winner = -1;
		if(result == 1)
			winner = 0;
		else if(result == 2)
			winner = 1;
		let content = { "winner": winner };
		let data = { "type": "gameover", "content": content };
		this._serverRoom.broadGameMsg(data);
	}
	
	// 工具函数
	randomInt(min, max){
	      var range = max - min;
	      var rand = Math.random();
	      var num = min + Math.round(rand * range);
	      return num;
	}
	judgeBoard(board, x, y){
		let judgeFun = function(board, ox, oy, dx, dy, maxcount){
			let value = board[ox][oy];
			let count = 0;
			let movX = ox;
			let movY = oy;
			for(let i=0; i<maxcount; i++){
				if(movX >= 0 && movX < board.length && movY >= 0 && movY < board[0].length){
					let nowValue = board[movX][movY];
					if(value == nowValue){
						count++;
					}else{
						break;
					}
				}else{
					break;
				}
				movX += dx;
				movY += dy;
			}
			return count-1;
		};
		let boardVal = this._board[x][y];
		// 黑棋判断
		if(boardVal == 1){
			if(judgeFun(board, x, y, -1, 0, 5) + judgeFun(board, x, y, 1, 0, 5) >= 4)  // 左右
				return 1;
			if(judgeFun(board, x, y, 0, -1, 5) + judgeFun(board, x, y, 0, 1, 5) >= 4)  // 上下
				return 1;
			if(judgeFun(board, x, y, -1, -1, 5) + judgeFun(board, x, y, 1, 1, 5) >= 4)  // 斜向右
				return 1;
			if(judgeFun(board, x, y, 1, -1, 5) + judgeFun(board, x, y, -1, 1, 5) >= 4)  // 斜向左
				return 1;
		}
		// 白棋判断
		if(boardVal == 2){
			if(judgeFun(board, x, y, -1, 0, 5) + judgeFun(board, x, y, 1, 0, 5) >= 4)  // 左右
				return 2;
			if(judgeFun(board, x, y, 0, -1, 5) + judgeFun(board, x, y, 0, 1, 5) >= 4)  // 上下
				return 2;
			if(judgeFun(board, x, y, -1, -1, 5) + judgeFun(board, x, y, 1, 1, 5) >= 4)  // 斜向右
				return 2;
			if(judgeFun(board, x, y, 1, -1, 5) + judgeFun(board, x, y, -1, 1, 5) >= 4)  // 斜向左
				return 2;			
		}
		// 和局判断
		{
			let flag = true;
			for(let i=0; i<board.length; i++){
				for(let j=0; j<board[i].length; j++){
					if(board[i][j] == 0){
						flag = false;
						break;
					}
				}
			}
			if(flag)
				return 0;
		}

		return -1;
	}
}
module.exports = GolangGame;