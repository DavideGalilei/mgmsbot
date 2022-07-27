extends Node2D


func _loadscript(url: String):
	var document = JavaScript.get_interface("document")

	var tag = document.createElement("script")
	tag.src = url
	var firstScriptTag = document.getElementsByTagName('script')[0]
	firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)


var window = JavaScript.get_interface("window")
var object = JavaScript.get_interface("Object")
var console = JavaScript.get_interface("console")


func _roomcallback(args):
	var Action = window.Action
	var room = args[0]
	var payload = args[1]
	
	# room.sendUser(window.room.data.decrypted.i, {"a": 123})

	match payload.action:
		Action.NO_OP:
			# Ignore
			pass
		Action.RECEIVE:
			# Message from the server
			pass
		Action.SEND_USER:
			# Whisper received from a user
			pass
		Action.BROADCAST:
			# Received broadcast from an user
			pass
		Action.INFO_LIST:
			# Received users list from the server
			# this occurs only once at the beginning
			pass
		Action.JOINED:
			# A user joined
			var id = payload.id
			var name = payload.name
			var photo = payload.photo
			
			if photo == null:
				pass
		Action.KICK:
			# You have been kicked
			pass
		Action.LEFT:
			# A user left
			pass

	console.log("log", Action, room, payload)


onready var _callback = JavaScript.create_callback(self, "_roomcallback")


func _ready():
	window._roomcallback = _callback

	print("Loading %s" % window._lib_url)
	_loadscript(window._lib_url)
	print("%s loaded" % window._lib_url)
