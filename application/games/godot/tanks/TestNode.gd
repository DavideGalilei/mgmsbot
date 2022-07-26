extends Node2D


func _loadscript(url: String):
	var document = JavaScript.get_interface("document")

	var tag = document.createElement("script")
	tag.src = url
	var firstScriptTag = document.getElementsByTagName('script')[0]
	firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)


func _roomcallback(room, payload):
	print("INSIDE CALLBACK")
	print(room, payload)


onready var _callback = JavaScript.create_callback(self, "_roomcallback")
var window = JavaScript.get_interface("window")


func _ready():
	JavaScript.eval("window.set = (p, v) => window[p] = v;", true)
	window.set("_roomcallback", _callback)
	window.set("test", 123)

	print("Loading %s" % window._lib_url)
	_loadscript(window._lib_url)
	print("%s loaded" % window._lib_url)
