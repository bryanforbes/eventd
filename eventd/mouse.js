define([
	'./main',
	'./Deferred',
	'dojo/_base/declare',
	'dojo/_base/sniff',
	'dojo/on',
	'dojo/_base/window',
	'dojo/window',
	'dojo/_base/array',
	'dojo/dom-geometry',
	'dojo/dom-construct',
	'dojo/_base/fx',
	'dojo/domReady!'
], function(eventd, Deferred, declare, has, on, win, dwin, array, geom, constr, fx){
	var MouseDefaults = declare(eventd.Defaults, {
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

	var getBox = (function(){
		var body;
		return function(){
			if(win.body()){
				getBox = function(){
					return dwin.getBox();
				};
				return getBox();
			}
			return {};
		};
	})();
	var MouseOptions = declare(eventd.Options, {
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
			var docEl = win.doc.documentElement, viewport = getBox();

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

	var MouseEvent = declare(eventd.Event, {
		optionsConstructor: MouseOptions
	});
	if(win.doc.createEvent){
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

	array.forEach(["MouseDown", "MouseUp", "Click", "DblClick", "MouseMove", "MouseOver", "MouseOut"],
		function(name){
			events[name] = declare(MouseEvent, {
				type: name.toLowerCase()
			});
		}
	);

	if(defaults.contextmenu){
		events.ContextMenu = declare(MouseEvent, {
			type: "contextmenu"
		});
	}

	// Run feature tests
	var tests = {
		mouseUDClicks:false,
		clickFiresChange:false,
		clickChecks:false,
		clickSubmits:false,
		changeChecks:false
	};
	var dispatch = eventd.dispatch;
	(function(){
		var div = win.doc.createElement("div");
		div.innerHTML = "<form><input type='checkbox'/><input type='submit' name='s'/></form>";
		div.style.position = "absolute";
		div.style.top = "-4000px";
		div.style.left = "-4000px";

		win.doc.documentElement.appendChild(div);

		var h = on(div, "click", function(){
			tests.mouseUDClicks = true;
		});

		dispatch(events.MouseDown, div, {});
		dispatch(events.MouseUp, div, {});

		h.remove();

		var check = div.firstChild.firstChild;

		h = on(check, "change", function(){
			tests.clickFiresChange = true;
		});
		dispatch(events.Click, check, {});
		tests.clickChecks = !!check.checked;
		h.remove();

		check.checked = false;
		h = on(check, "change", function(){
			h.remove();
			tests.changeChecks = !!check.checked;
		});
		dispatch(eventd.events.Change, check, {});

		var submit = div.firstChild.firstChild.nextSibling;
		div.firstChild.onsubmit = function(e){
			if(e.preventDefault){
				e.preventDefault();
			}
			tests.clickSubmits = true;
			return false;
		};
		(new events.Click(submit, {}))._dispatch();

		win.doc.documentElement.removeChild(div);
	})();

	// These need to be attached after feature tests so they don't run
	// during the tests
	if(has("safari")){
		events.MouseDown.extend({
			preCreate: function(){
				var name = this.node.nodeName.toLowerCase();
				if(name == "select" || name == "option"){
					var h = on(this.node, "mousedown", function(evt){
						h.remove();
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

	function XYLine(startX, endX, startY, endY){
		this.xLine = new fx._Line(startX, endX);
		this.yLine = new fx._Line(startY, endY);
	}
	XYLine.prototype.getValue = function(/* float */ n){
		return {
			x: this.xLine.getValue(n),
			y: this.yLine.getValue(n)
		};
	};

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
								var n = constr.create("div", {});
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
		Options: MouseOptions,
		tests: tests
	};

	return mouse;
});
