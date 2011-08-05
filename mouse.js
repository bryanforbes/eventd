define([
	'./main',
	'./Deferred',
	'compose',
	'dojo/_base/sniff',
	'dojo/on',
	'dojo/_base/window',
	'dojo/window',
	'dojo/array',
	'dojo/dom-geometry',
	'dojo/_base/fx',
	'dojo/domReady!'
], function(eventd, Deferred, Compose, has, on, win, dwin, array, geom, fx){
	var MouseDefaults = Compose(eventd.Defaults, {
		click: {
			left: 0,
			right: 0
		},
		mousedown: {
			left: 0,
			right: 2
		},
		mouseup: {
			left: 0,
			right: 2
		},
		contextmenu: {
			left: 2,
			right: 2
		}
	});

	var defaults = (function(undefined){
		if(has("ie")){
			return new MouseDefaults({
				mousedown: {
					left: 1
				},
				mouseup: {
					left: 1
				},
				contextmenu: {
					right: 0
				}
			});
		}else if(has("opera")){
			return new MouseDefaults({
				contextmenu: undefined 
			});
		}else{
			return new MouseDefaults();
		}
	})();

	var MouseOptions = Compose(eventd.Options, function(type, options){
		var docEl = win.doc.documentElement, viewport = dwin.getBox();

		if(!this.clientX){
			this.clientX = (this.pageX || 0) - (viewport.l || 0);
		}
		if(!this.clientY){
			this.clientY = (this.pageY || 0) - (viewport.t || 0);
		}
		if(!this.relatedTarget){
			this.relatedTarget = docEl;
		}

		var event = defaults[type] || defaults["click"];
		if(this.button){
			this.button = (this.button in event ? event[this.button] : 0);
		}
	},{
		detail: 1,
		screenX: 1,
		screenY: 1,
		clientX: 0,
		clientY: 0,
		pageX: 0,
		pageY: 0,
		ctrlKey: 0,
		altKey: 0,
		shiftKey: 0,
		metaKey: 0,
		button: "left",
		relatedTarget: null
	});

	var MouseEvent = Compose(eventd.Event, {
		optionsConstructor: MouseOptions
	});

	if(has("event-create-event")){
		Compose.call(MouseEvent.prototype, {
			create: Compose.around(function(baseCreate){
				return function(){
					var event,
						options = this.options;
					try{
						event = this.node.ownerDocument.createEvent("MouseEvents");
						event.initMouseEvent(this.type, options.bubbles, options.cancelable, options.view,
							options.detail, options.screenX, options.screenY, options.clientX, options.clientY,
							options.ctrlKey, options.altKey, options.shiftKey, options.metaKey,
							options.button, options.relatedTarget);
						//options.copyToEvent(event);
					}catch(e){
						event = baseCreate.call(this, arguments);
					}

					return event;
				};
			})
		});
	}

	var events = {};

	array.forEach(["MouseDown", "MouseUp", "Click", "DblClick", "MouseMove", "MouseOver", "MouseOut"],
		function(name){
			events[name] = Compose(MouseEvent, {
				type: name.toLowerCase()
			});
		}
	);

	if(defaults.contextmenu){
		events.ContextMenu = Compose(MouseEvent, {
			type: "contextmenu"
		});
	}

	var dispatch = eventd.dispatch;
	(function(){
		var div = win.doc.createElement("div");
		div.innerHTML = "<form><input type='checkbox'/><input type='submit' name='s'/></form>";
		div.style.position = "absolute";
		div.style.top = "-4000px";
		div.style.left = "-4000px";

		win.doc.documentElement.appendChild(div);

		var h = on(div, "click", function(){
			has.add("mouse-up-down-clicks", 1);
		});

		dispatch(events.MouseDown, div, {});
		dispatch(events.MouseUp, div, {});

		h.remove();

		var check = div.firstChild.firstChild;

		h = on(check, "change", function(){
			has.add("mouse-click-fires-change", 1);
		});
		dispatch(events.Click, check, {});
		has.add("mouse-click-checks", !!check.checked);
		h.remove();

		check.checked = false;
		h = on(check, "change", function(){
			has.add("mouse-change-checks", !!check.checked);
		});
		dispatch(eventd.events.Change, check, {});
		h.remove();

		var submit = div.firstChild.firstChild.nextSibling;
		div.firstChild.onsubmit = function(e){
			if(e && e.preventDefault){
				e.preventDefault();
			}
			has.add("mouse-click-submits", 1);
			return false;
		};
		(new events.Click(submit, {}))._dispatch();

		win.doc.documentElement.removeChild(div);
	})();

	// These need to be attached after feature tests so they don't run
	// during the tests
	if(has("safari")){
		Compose.call(events.MouseDown.prototype, {
			preCreate: function(){
				var name = this.node.nodeName.toLowerCase();
				if(name == "select" || name == "option"){
					on.once(this.node, "mousedown", function(evt){
						evt.preventDefault();
					});
				}
			}
		});
	}
	Compose.call(events.Click.prototype, {
		preCreate: function(){
			var name = this.node.nodeName.toLowerCase();

			if(!has("mouse-click-checks")){
				if(name == "input"){
					// if firing click or change doesn't check the box, we have to do it manually
					if(this.node.type == "checkbox"){
						this.node.checked = !this.node.checked;
					}
				}
			}
		},
		postDispatch: function(deferred){
			var node = this.node,
				name = node.nodeName.toLowerCase();

			if(name == "input" && node.type == "checkbox"){
				if(!has("mouse-click-fires-change")){
					deferred.then(function(){
						eventd.change(node);
					});
				}
			}
		}
	});

	Compose.call(events.MouseDown.prototype, {
		postDispatch: function(deferred){
			var node = this.node;
			deferred.then(function(){
				return eventd.focus(node);
			});
		}
	});

	function addPosition(node, options){
		if(options &&
			typeof options.clientX == "undefined" &&
			typeof options.clientY == "undefined" &&
			typeof options.pageX == "undefined" &&
			typeof options.pageY == "undefined"){
			var pos = geom.position(node);
			options.pageX = pos.x + (pos.w / 2);
			options.pageY = pos.y + (pos.h / 2);
		}
	}

	var Dispatcher = eventd.Dispatcher,
		click = Dispatcher(events.Click),
		dblclick = Dispatcher(events.DblClick),
		mouseout = Dispatcher(events.MouseOut),
		mouseover = Dispatcher(events.MouseOver);

	var XYLine = Compose(function(startX, endX, startY, endY){
		this.xLine = new fx._Line(startX, endX);
		this.yLine = new fx._Line(startY, endY);
	},{
		getValue: function(/* float */ n){
			return {
				x: this.xLine.getValue(n),
				y: this.yLine.getValue(n)
			};
		}
	});

	function wrapEvent(func){
		return function(node, options){
			node = eventd.getNode(node);
			options = options || {};
			addPosition(node, options);

			return func(node, options);
		};
	}

	var mouse = {
		mousedown: wrapEvent(Dispatcher(events.MouseDown)),
		mouseup: wrapEvent(Dispatcher(events.MouseUp)),
		click: wrapEvent(function(node, options){
			if(has("mouse-up-down-clicks")){
				// click fires automatically in Opera, so run
				// preCreate and postDispatch
				var d = Deferred.event(node, 'click');
				d.then(function(){
					var e = new events.Click(node, options, 1);
					e.postDispatch(d);
				});
			}
			return mouse.mousedown(node, options).then(function(){
				return mouse.mouseup(node, options).then(function(){
					if(!has("mouse-up-down-clicks")){
						return click(node, options);
					}
					return d;
				});
			});
		}),
		dblclick: wrapEvent(function(node, options){
			return mouse.click(node, options).then(function(){
				return mouse.click(node, options).then(function(){
					return dblclick(node, options);
				});
			});
		}),
		_overTarget: null,
		mouseover: wrapEvent(function(node, options){
			if(mouse._overTarget){
				mouse.mouseout(mouse._overTarget);
			}
			return mouseover(node, options).then(function(){
				mouse._overTarget = node;
			});
		}),
		mouseout: wrapEvent(function(node, options){
			return mouseout(node, options).then(function(){
				mouse._overTarget = null;
			});
		}),
		mousemove: wrapEvent(Dispatcher(events.MouseMove)),
		_current: { x: 0, y: 0 },
		move: (function(){
			function outOver(last, current){
				return mouse.mouseout(last).then(function(){
					return mouse.mouseover(current);
				});
			}
			function move(node, x, y){
				return mouse.mousemove(node, { clientX: x, clientY: y });
			}
			return function(clientX, clientY, duration, trace){
				var current = mouse._current,
					lastNode = document.elementFromPoint(current.x, current.y),
					d, res = new Deferred(function(){
						a && a.stop();
					});
				var a = new fx.Animation({
					curve: new XYLine(mouse._current.x, clientX, mouse._current.y, clientY),
					duration: duration || fx.Animation.prototype.duration,
					onAnimate: function(values){
						var node = document.elementFromPoint(values.x, values.y);
						if(lastNode){
							if(lastNode !== node){
								if(d){
									d = d.then(function(){
										return outOver(lastNode, node);
									});
								}else{
									d = outOver(lastNode);
								}
								lastNode = node;
							}
						}else{
							lastNode = node;
						}

						if(d){
							d.then(function(){
								move(lastNode, values.x, values.y);
							});
						}else{
							d = move(lastNode, values.x, values.y);
						}

						if(trace){
							d.then(function(){
								var n = win.doc.createElement("div");
								n.style.cssText = "width: 2px; height: 2px; background-color: blue; position: absolute; left: " + values.x + "px; top: " + values.y + "px;";
								win.body().appendChild(n);
							});
						}
					},
					onEnd: function(){
						d.then(function(){
							res.resolve();
						});
					}
				});
				a.play();

				return res.promise;
			};
		})(),
		events: events,
		Defaults: MouseDefaults,
		Options: MouseOptions
	};

	return mouse;
});
