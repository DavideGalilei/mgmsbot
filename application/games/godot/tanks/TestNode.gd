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

	console.log("log", Action, room, payload)


onready var _callback = JavaScript.create_callback(self, "_roomcallback")


func _ready():
	window._roomcallback = _callback

	print("Loading %s" % window._lib_url)
	_loadscript(window._lib_url)
	print("%s loaded" % window._lib_url)
