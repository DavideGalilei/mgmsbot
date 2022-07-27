extends Node2D


var player = preload("res://Player.tscn")
var rand_generate = RandomNumberGenerator.new()
var players = {}


func set_photo(instance, photo):
	if photo == null:
		console.warn("Invalid null photo for player")
		return

	var png_data = Marshalls.base64_to_raw(photo)
	var image = Image.new()
	image.load_jpg_from_buffer(png_data)
	var texture = ImageTexture.new()
	texture.create_from_image(image)
	instance.get_node("TextureRect").texture = texture


func create_player(id: int, name: String, photo, main := false):
	console.warn("Adding player")

	var instance = player.instance()
	players[id] = instance

	instance.is_main = main
	instance.name = name

	if photo != null:
		set_photo(instance, photo)

	var viewport = get_viewport().size
	instance.position.x = rand_generate.randi_range(0, viewport.x)
	instance.position.y = rand_generate.randi_range(0, viewport.y)

	add_child(instance)


func _js_create_player(args):
	var user = args[0]
	console.log("Adding user:", user)

	create_player(user.id, user.name, user.photo, user.id == window.room.data.decrypted.i)
	
	#if user.photo != null:
	#	set_photo(players[user.id], user.photo)

onready var _create_player_ref = JavaScript.create_callback(self, "_js_create_player")


func _loadscript(url: String):
	var document = JavaScript.get_interface("document")

	var tag = document.createElement("script")
	tag.src = url
	var firstScriptTag = document.getElementsByTagName('script')[0]
	firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)


var window = JavaScript.get_interface("window")
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
			# console.log("Received broadcast:", payload)
			var player = players[payload.data.u]
			var data = payload.data.data
			
			player.position.x = data.pos.x
			player.position.y = data.pos.y
			player.rotation = data.rot
		Action.INFO_LIST:
			# Received users list from the server
			# this occurs only once at the beginning
			payload.data.users.forEach(window._add_player)
		Action.JOINED:
			# A user joined
			console.log("User joined:", payload)

			var id = payload.data.id
			var name = payload.data.name
			var photo = payload.data.photo

			create_player(id, name, photo)
		Action.KICK:
			# You have been kicked
			pass
		Action.LEFT:
			# A user left
			console.log("User left:", payload)
			players[payload.data.id].queue_free()
			players.erase(payload.data.id)

	# console.log("log", Action, room, payload)


onready var _callback_ref = JavaScript.create_callback(self, "_roomcallback")


func _ready():
	rand_generate.randomize()

	if OS.has_feature("JavaScript"):
		window.DEBUG = false

		window._roomcallback = _callback_ref
		window._add_player = _create_player_ref

		print("Loading %s" % window._lib_url)
		_loadscript(window._lib_url)
		print("%s loaded" % window._lib_url)
	else:
		create_player(0, "asd", null, true)
