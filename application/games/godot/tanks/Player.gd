extends KinematicBody2D

var speed := 15000 # original 600

var _jumps_made := 0
var _velocity := Vector2.ZERO
var normalzone = true
var life = 100
var can_inflict_damage = false
var attack_counter = 0

var is_main: bool = false


func _physics_process(delta):
	if not is_main:
		return

	# target
	look_at(get_global_mouse_position())
	# movement
	var _horizontal_direction = (
		Input.get_action_strength("right")
		- Input.get_action_strength("left")
	)

	var _vertical_direction = (
		Input.get_action_strength("down")
		- Input.get_action_strength("up")
	)

	_velocity.x = _horizontal_direction * speed
	_velocity.y = _vertical_direction * speed

	var is_right := Input.is_action_just_pressed("right")
	var is_left := Input.is_action_just_pressed("left")
	var is_attacking := Input.is_action_just_pressed("leftclick")

	_velocity = move_and_slide(_velocity * delta)


onready var _timer = null
onready var window = JavaScript.get_interface("window")
onready var console = JavaScript.get_interface("console")


func _ready():
	if self.is_main:
		_timer = Timer.new()
		add_child(_timer)

		_timer.connect("timeout", self, "_on_Timer_timeout")
		_timer.set_wait_time(0.05)
		_timer.set_one_shot(false) # Make sure it loops
		_timer.start()


func _obj_from_dict(dict: Dictionary) -> JavaScriptObject:
	var obj = JavaScript.create_object("Object")
	
	for key in dict.keys():
		var value = dict.get(key)

		if typeof(value) == TYPE_DICTIONARY:
			obj[key] = _obj_from_dict(value)
		else:
			obj[key] = value

	return obj


func _on_Timer_timeout():
	if window.room != null:
		window.room.broadcast(
			_obj_from_dict(
				{
					"pos": {
						"x": self.position.x,
						"y": self.position.y,
					},
					"rot": self.rotation,
				}
			)
		)
