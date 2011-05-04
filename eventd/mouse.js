define(['dojo', 'dojo/window', 'dojo/listen', './main', './Deferred', 'dojo/_base/window'], function(dojo, win, listen, eventd, Deferred){
	var MouseDefaults = dojo.declare(eventd.Defaults, {
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
		if(dojo.isIE){
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
		}else if(dojo.isOpera){
			return new MouseDefaults({
				contextmenu: undefined 
			});
		}else{
			return new MouseDefaults();
		}
	})();

	var MouseOptions = dojo.declare(eventd.Options, {
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
		relatedTarget: null,

		constructor: function(type, options){
			var docEl = dojo.doc.documentElement, viewport = win.getBox() || {};

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
		}
	});

	var MouseEvent = dojo.declare(eventd.Event, {
		optionsConstructor: MouseOptions
	});
	if(dojo.doc.createEvent){
		MouseEvent.extend({
			create: function(){
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
					event = this.inherited(arguments);
				}

				return event;
			}
		});
	}

	var events = {};

	dojo.forEach(["MouseDown", "MouseUp", "Click", "DblClick", "MouseMove", "MouseOver", "MouseOut"],
		function(name){
			events[name] = dojo.declare(MouseEvent, {
				type: name.toLowerCase()
			});
		}
	);

	if(defaults.contextmenu){
		events.ContextMenu = dojo.declare(MouseEvent, {
			type: "contextmenu"
		});
	}

	// Run feature tests
	var tests = {
		mouseUDClicks:false,
		clickFiresChange:false,
		clickChecks:false,
		changeChecks:false
	};
	(function(){
		var div = dojo.doc.createElement("div");
		div.innerHTML = "<input type='checkbox'/>";
		div.style.position = "absolute";
		div.style.top = "-4000px";
		div.style.left = "-4000px";

		dojo.doc.documentElement.appendChild(div);

		var h = listen(div, "click", function(){
			tests.mouseUDClicks = true;
		});

		(new events.MouseDown(div, {}))._dispatch();
		(new events.MouseUp(div, {}))._dispatch();

		h.cancel();

		var check = div.firstChild;

		h = listen(check, "change", function(){
			tests.clickFiresChange = true;
		});
		(new events.Click(check, {}))._dispatch();
		tests.clickChecks = !!check.checked;
		h.cancel();

		check.checked = false;
		h = listen(check, "change", function(){
			h.cancel();
			tests.changeChecks = !!check.checked;
		});
		(new eventd.events.Change(check, {}))._dispatch();

		dojo.doc.documentElement.removeChild(div);
	})();

	// These need to be attached after feature tests so they don't run
	// during the tests
	if(dojo.isSafari){
		events.MouseDown.extend({
			preCreate: function(){
				var name = this.node.nodeName.toLowerCase();
				if(name == "select" || name == "option"){
					var h = listen(this.node, "mousedown", function(evt){
						h.cancel();
						evt.preventDefault();
					});
				}
			}
		});
	}
	events.Click.extend({
		preCreate: function(){
			var name = this.node.nodeName.toLowerCase();

			if(name == "input" && !tests.clickChecks && !tests.clickChecks){
				// if firing click or change doesn't check the box, we have to do it manually
				if(this.node.type == "checkbox"){
					this.node.checked = !this.node.checked;
				}
			}
		},
		postDispatch: function(deferred){
			var node = this.node,
				name = node.nodeName.toLowerCase();

			if(name == "input"){
				if(node.type == "checkbox" && !tests.clickFiresChange){
					deferred.then(function(){
						eventd.change(node);
					});
				}
			}
		}
	});

	events.MouseDown.extend({
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
			var pos = dojo.position(node);
			options.pageX = pos.x + (pos.w / 2);
			options.pageY = pos.y + (pos.h / 2);
		}
	}

	var Dispatcher = eventd.Dispatcher,
		click = Dispatcher(events.Click),
		dblclick = Dispatcher(events.DblClick),
		mouseout = Dispatcher(events.MouseOut),
		mouseover = Dispatcher(events.MouseOver),
		mousemove = Dispatcher(events.MouseMove);

	function XYLine(startX, endX, startY, endY){
		this.xLine = new dojo._Line(startX, endX);
		this.yLine = new dojo._Line(startY, endY);
	}
	XYLine.prototype.getValue = function(/* float */ n){
		return {
			x: this.xLine.getValue(n),
			y: this.yLine.getValue(n)
		};
	};

	var mouse = {
		mousedown: Dispatcher(events.MouseDown),
		mouseup: Dispatcher(events.MouseUp),
		click: function(node, options){
			options = options || {};
			addPosition(node, options);

			if(tests.mouseUDClicks){
				// click fires automatically in Opera, so run
				// preCreate and postDispatch
				var d = Deferred.event(node, 'click');
				d.then(function(){
					var e = new events.Click(node, options, true);
					e.postDispatch(d);
				});
			}
			return mouse.mousedown(node, options).then(function(){
				return mouse.mouseup(node, options).then(function(){
					if(!tests.mouseUDClicks){
						return click(node, options);
					}else{
						return d;
					}
				});
			});
		},
		dblclick: function(node, options){
			options = options || {};
			addPosition(node, options);

			return mouse.click(node, options).then(function(){
				return mouse.click(node, options).then(function(){
					return dblclick(node, options);
				});
			});
		},
		_overTarget: null,
		mouseover: function(node, options){
			options = options || {};
			addPosition(node, options);

			if(mouse._overTarget){
				mouse.mouseout(mouse._overTarget);
			}
			return mouseover(node, options).then(function(){
				mouse._overTarget = node;
			});
		},
		mouseout: function(node, options){
			options = options || {};
			addPosition(node, options);

			return mouseout(node, options).then(function(){
				mouse._overTarget = null;
			});
		},
		mousemove: function(node, options){
			options = options || {};
			addPosition(node, options);

			return mousemove(node, options);
		},
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
				var a = new dojo.Animation({
					curve: new XYLine(mouse._current.x, clientX, mouse._current.y, clientY),
					duration: duration || dojo.Animation.prototype.duration,
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
								var n = dojo.create("div", {});
								n.style.cssText = "width: 2px; height: 2px; background-color: blue; position: absolute; left: " + values.x + "px; top: " + values.y + "px;";
								dojo.body().appendChild(n);
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
		Options: MouseOptions,
		tests: tests
	};

	return mouse;
});
