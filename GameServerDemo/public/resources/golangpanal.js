var vue_golangpanal = new Vue({
	el : '#golangpanal',
	data : {
		isActive : false,
		players : new Array(2),
		playerNum : 0,
		
		status : 0,
		nowTurn : 0,
		board : null,
		
		
		roomTitle: "五子棋游戏",
		gameTips : "欢乐五子棋",
		player1Status : "",
		player2Status : ""
	},
	methods : {
		onActive : function() {
			// 进入房间请求房间信息
			this.requestRoomInfo();
		},
		onSleep : function() {

		},
		onConnect : function() {

		},
		onDisconnect : function() {

		},
		onServerMsg : function(data) {

		},
		onGameMsg : function(data) {
			switch (data.type) {
			case "roominfo":
				this.initGameRoom(data.content);
				break;
			case "playerupdate":
				this.updatePlayer(data.content);
				break;
			case "gamestart":
				this.gameStart(data.content);
				break;
			case "boardchange":
				this.boardChange(data.content);
				break;
			case "gameover":
				this.gameOver(data.content);
				break;
			}
		},

		// 游戏功能
		quitGame : function() {
			var data = {
				type : "leaveroom",
				content : {}
			};
			sendServerMsg(data);
			setActivePanal(vue_roompanal);
		},
		requestRoomInfo : function() {
			var data = {
				type : "requestroominfo",
				content : {}
			};
			sendGameMsg(data);
		},
		initGameRoom : function(roominfo) {
			this.players = roominfo.players;
			this.playerNum = roominfo.playerNum;
			this.status = roominfo.status;
			this.board = roominfo.board;
			this.roomTitle = "五子棋游戏——" + roominfo.roomName;
			this.gameTips = "点击【准备】按钮开始游戏";
			if(this.players[0]){
				this.player1Status = this.players[0].isReady ? "已准备" : "未准备";
			}
			if(this.players[1]){
				this.player2Status = this.players[1].isReady ? "已准备" : "未准备";
			}
			this.drawBoard();
		},
		updatePlayer : function(playerinfo) {
			var num = playerinfo.number;
			Vue.set(this.players, num, playerinfo.player);
			if(this.players[0]){
				this.player1Status = this.players[0].isReady ? "已准备" : "未准备";
			}
			if(this.players[1]){
				this.player2Status = this.players[1].isReady ? "已准备" : "未准备";
			}
		},
		gameReady : function(flag) {
			var data = {
				type : "gameready",
				content : flag
			};
			sendGameMsg(data);
		},
		gameStart : function(startinfo){
			this.players[0].isReady = false;
			this.players[1].isReady = false;
			this.players[0].side = startinfo.player1Side;
			this.players[1].side = startinfo.player2Side;
			this.status = 1;
			this.nowTurn = startinfo.nowTurn;
			this.board = new Array(15);
			for(let i=0; i<this.board.length; i++){
				this.board[i] = new Array(15);
				for(let j=0; j<this.board[i].length; j++){
					this.board[i][j] = 0;
				}
			}

			if(this.nowTurn == 0){
				this.player1Status = "执棋中";
				this.player2Status = "等待";
			}else if(this.nowTurn == 1){
				this.player1Status = "等待";	
				this.player2Status = "执棋中";
			}
			var mySide = this.players[this.playerNum].side;
			if(mySide == 1){
				this.gameTips = "游戏开始！你是黑方";
			}else if(mySide == 2){
				this.gameTips = "游戏开始！你是白方";
			}
			this.drawBoard();
		},
		drawBoard : function(){
			var canvas = this.$refs.boardcanvas;
			var ctx = canvas.getContext("2d");
			// 绘制棋盘
			ctx.fillStyle="#FF9933";
			ctx.fillRect(0,0,300,300);
			for(var i=0; i<15; i++){
				var posX = 24 + i * 18;
				ctx.beginPath();
				ctx.moveTo(posX, 24);
				ctx.lineTo(posX, 14 * 18 + 24);
				ctx.stroke();
			}
			for(var i=0; i<15; i++){
				var posY = 24 + i * 18;
				ctx.beginPath();
				ctx.moveTo(24, posY);
				ctx.lineTo(14 * 18 + 24, posY);
				ctx.stroke();
			}
			for(var i=0; i<3; i++){
				for(var j=0; j<3; j++){
					var posX = 24 + 3 * 18 + 4 * 18 * i;
					var posY = 24 + 3 * 18 + 4 * 18 * j;
					ctx.beginPath();
					ctx.arc(posX, posY, 3, 0, 2 * Math.PI);
					ctx.fillStyle = "#000000";
					ctx.fill();
				}
			}
			// 绘制棋子
			if(this.board){
				var board = this.board;
				for(var i=0; i<board.length; i++){
					for(var j=0; j<board[i].length; j++){
						var posX = 24 + 18 * i;
						var posY = 24 + 18 * j;
						if(board[i][j] == 1){
							ctx.beginPath();
							ctx.arc(posX, posY, 8, 0, 2 * Math.PI);
							ctx.fillStyle = "#000000";
							ctx.fill();							
						}
						if(board[i][j] == 2){
							ctx.beginPath();
							ctx.arc(posX, posY, 8, 0, 2 * Math.PI);
							ctx.fillStyle = "#FFFFFF";
							ctx.fill();							
						}
					}
				}
			}
		},
		playerBoardOperation : function(name,$event){
			var offsetX = $event.offsetX;
			var offsetY = $event.offsetY;
			if(this.status == 1){
				if(offsetX > 24-8 && offsetX < 300-24+8 && offsetY > 24-8 && offsetY < 300-24+8){
					var x = Math.floor((offsetX - 16) / 18);
					var y = Math.floor((offsetY - 16) / 18);
					if(this.board[x][y] == 0){
						var data = {
							type : "playerboardoperation",
							content : { "x":x, "y":y }
						};
						sendGameMsg(data);
					}
				}
			}
		},
		boardChange : function(changeData){
			var x = changeData.x;
			var y = changeData.y;
			var type = changeData.side;
			this.board[x][y] = type;
			this.nowTurn = changeData.nextTurn;
			if(this.nowTurn == 0){
				this.player1Status = "执棋中";
				this.player2Status = "等待";
			}else if(this.nowTurn == 1){
				this.player1Status = "等待";	
				this.player2Status = "执棋中";
			}
			var nowSide = this.players[this.nowTurn].side;
			if(nowSide == 1){
				this.gameTips = "黑方思考中……";
			}else if(nowSide == 2){
				this.gameTips = "白方思考中……";
			}

			// 绘制棋子
			var canvas = this.$refs.boardcanvas;
			var ctx = canvas.getContext("2d");
			ctx.beginPath();
			var drawX = 24 + x * 18;
			var drawY = 24 + y * 18;
			ctx.arc(drawX, drawY, 8, 0, 2 * Math.PI);
			if(type == 1)
				ctx.fillStyle = "#000000";
			if(type == 2)
				ctx.fillStyle = "#FFFFFF";
			ctx.fill();	
		},
		gameOver: function(result){
			this.status = 0;
			this.nowTurn = 0;
			
			if(result.winner == 0){
				this.gameTips = "游戏结束！黑方胜";
			}else if(result.winner == 1){
				this.gameTips = "游戏结束！白方胜";
			}else{
				this.gameTips = "游戏结束！平局";
			}
			if(this.players[0]){
				this.player1Status = this.players[0].isReady ? "已准备" : "未准备";
			}
			if(this.players[1]){
				this.player2Status = this.players[1].isReady ? "已准备" : "未准备";
			}
		}
	},
	computed : {
		
	}
});