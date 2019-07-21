var vue_roompanal = new Vue({
	el : '#roompanal',
	data : {
		isActive : false,
		pageSize : 4,
		roomTimer : null,
		roomList : [],
		pageCount : 1,
		currentPage : 1,
		msgList : [],
		chatInput : "",
		createRoomModelData : {
			show : false,
			roomName : "",
			roomPwd : "",
			gameId : "golang"
		},
		joinRoomModelData : {
			show : false,
			room : null,
			roomPwd : ""
		},
		alertModelData : {
			show : false,
			content : ""
		}
	},
	methods : {
		onActive : function() {
			// 打开轮询房间计时器
			var self = this;
			this.roomTimer = setInterval(function() {
				self.refreshRoom();
			}, 5000);
		},
		onSleep : function() {
			// 注销计时器
			clearInterval(this.roomTimer);
		},
		onConnect : function() {
			this.refreshRoom();
		},
		onDisconnect : function() {
			
		},
		onServerMsg : function(data) {
			switch (data.type) {
			case "roominfo":
				this.updateRoom(data.content.roomList, data.content.roomCount);
				break;
			case "hallmsg":
				this.appendHallMsg(data.content);
				break;
			case "alert":
				this.alertModel("show", data.content.alert);
				break;
			case "joinroom":
				this.beInRoom(data.content.gameId);
				break;
			}
		},
		onGameMsg : function(data) {
			
		},
		createRoomModel : function(code, data) {
			var modelData = this.createRoomModelData;
			if (code == "show") {
				modelData.roomName = "";
				modelData.roomPwd = "";
				modelData.gameId = "golang";
				modelData.show = true;
			} else if (code == "ok") {
				this.createRoom(modelData.roomName, modelData.roomPwd, modelData.gameId);
				modelData.show = false;
			} else if (code == "cancel") {
				modelData.show = false;
			}
		},
		joinRoomModel : function(code, data) {
			var modelData = this.joinRoomModelData;
			if (code == "show") {
				modelData.room = data;
				modelData.roomPwd = "";
				modelData.show = true;
			} else if (code == "ok") {
				this.joinRoom(modelData.room, modelData.roomPwd);
				modelData.show = false;
			} else if (code == "cancel") {
				modelData.show = false;
			}
		},
		alertModel : function(code, data) {
			var modelData = this.alertModelData;
			if (code == "show") {
				modelData.content = data;
				modelData.show = true;
			} else if (code == "ok") {
				modelData.show = false;
			}
		},
		tryJoinRoom : function(room) {
			if (!room.hasPwd) {
				this.joinRoom(room, "");
			} else {
				this.joinRoomModel("show", room);
			}
		},
		joinRoom : function(room, password) {
			var data = {
				type : "joinroom",
				content : {
					"roomId" : room.roomId,
					"roomPwd" : password
				}
			};
			sendServerMsg(data);
		},
		createRoom : function(name, password, gameId) {
			if (!this.checkRoomName(name)) {
				this.alertModel("show", "房间名称格式错误");
				return;
			}
			if (!this.checkRoomPwd(password)) {
				this.alertModel("show", "密码太长（超过16位）");
				return;
			}
			var data = {
				type : "createroom",
				content : {
					"roomName" : name,
					"roomPwd" : password,
					"gameId": gameId
				}
			};
			sendServerMsg(data);
		},
		beInRoom : function(gameId){
			switch(gameId){
			case "golang":
				setActivePanal(vue_golangpanal);
				break;
			}
		},
		sendChatMsg : function() {
			if (this.chatInput.length > 0) {
				var date = new Date();
				var timestr = this.formatTime(date);
				var data = {
					type : "hallchat",
					content : {
						"time" : timestr,
						"txt" : this.chatInput
					}
				};
				this.chatInput = "";
				sendServerMsg(data);
			}
		},
		appendHallMsg : function(msg) {
			this.msgList.push(msg);
			// 延迟更新 跳转底部
			var dom = this.$refs.msgListBox;
			setTimeout(function() {
				dom.scrollTop = dom.scrollHeight;
			}, 10);
		},
		refreshRoom : function() {
			var begin = (this.currentPage - 1) * this.pageSize;
			var end = (this.currentPage - 1) * this.pageSize + this.pageSize;
			var data = {
				type : "roominfo",
				content : {
					"begin" : begin,
					"end" : end
				}
			};
			sendServerMsg(data);
		},
		updateRoom : function(roomList, roomCount) {
			this.roomList = roomList;
			this.pageCount = roomList.length > 0 ? Math.ceil(roomCount
					/ this.pageSize) : 1;
			if (this.currentPage > this.pageCount)
				this.currentPage = this.pageCount;
		},
		prevPage : function() {
			if (this.currentPage > 1) {
				this.currentPage--;
				this.refreshRoom();
			}
		},
		nextPage : function() {
			if (this.currentPage < this.pageCount) {
				this.currentPage++;
				this.refreshRoom();
			}
		},
		
		// 工具函数
		checkRoomName : function(name) {
			var patt = /^[\u4E00-\u9FA5A-Za-z0-9_]{3,16}$/;
			return patt.test(name);
		},
		checkRoomPwd : function(password) {
			var patt = /^.{0,16}$/;
			return patt.test(password);
		},
		getStatusText : function(status) {
			if (status == 0)
				return "可用";
			else if (status == 1)
				return "已满";
			else if (status == 2)
				return "游戏中";
			else
				return "";
		},
		formatTime : function(date) {
			var hour = date.getHours().toString();
			var min = date.getMinutes();
			min = (min < 10 ? "0" + min : min).toString();
			var second = date.getSeconds();
			second = (second < 10 ? "0" + second : second).toString();
			return hour + ":" + min + ":" + second;
		}
	},
	computed : {}
});