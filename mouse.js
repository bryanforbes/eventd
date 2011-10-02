define([
	'exports',
	'./main',
	'./Deferred',
	'compose',
	'dojo/_base/sniff',
	'dojo/on',
	'dojo/dom-geometry',
	'dojo/domReady!'
], function(exports, eventd, Deferred, Compose, has, on, geom){
	var defaults = (function(undefined){
		var overrides;
		if(has("ie")){
			overrides = {
				mousedown: {
					left: 1
				},
				mouseup: {
					left: 1
				},
				contextmenu: {
					right: 0
				}
			};
		}else if(has("opera")){
			overrides = {
				contextmenu: undefined
			};
		}
		return eventd.recursiveMix({
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
		}, overrides);
	})();

	var MouseEvent = Compose(eventd.Event, {
		baseOptions: eventd.delegateProperty({
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
		}),
		setOptions: Compose.after(function(){
			var docEl = eventd.document.documentElement,
				scroll = geom.docScroll(),
				options = this.options;

			if(!options.clientX){
				options.clientX = (options.pageX || 0) - (scroll.l || 0);
			}
			if(!options.clientY){
				options.clientY = (options.pageY || 0) - (scroll.t || 0);
			}
			if(!options.relatedTarget){
				options.relatedTarget = docEl;
			}

			var event = defaults[this.type] || defaults["click"];
			if(options.button){
				options.button = (options.button in event ? event[options.button] : 0);
			}
		})
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

	(function(types){
		var i = types.length;
		while(i--){
			events[types[i]] = Compose(MouseEvent, {
				type: types[i].toLowerCase()
			});
		}
	})(["MouseDown", "MouseUp", "Click", "DblClick", "MouseOver", "MouseOut"]);

	if(defaults.contextmenu){
		events.ContextMenu = Compose(MouseEvent, {
			type: "contextmenu"
		});
	}

	var dispatch = eventd.dispatch;
	(function(){
		var div = eventd.document.createElement("div");
		div.innerHTML = "<form><input type='checkbox'/><input type='submit' name='s'/></form>";
		div.style.position = "absolute";
		div.style.top = "-4000px";
		div.style.left = "-4000px";

		eventd.document.documentElement.appendChild(div);

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

		eventd.document.documentElement.removeChild(div);
	})();

	// These need to be attached after feature tests so they don't run
	// during the tests
	if(has("safari")){
		Compose.call(events.MouseDown.prototype, {
			preDispatch: function(){
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
		preDispatch: function(){
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
		wrapEvent = eventd.wrapEvent,
		wrapDispatcher = eventd.wrapDispatcher,
		click = Dispatcher(events.Click),
		dblclick = Dispatcher(events.DblClick),
		mouseout = Dispatcher(events.MouseOut),
		mouseover = Dispatcher(events.MouseOver);

	Compose.call(exports, {
		Event: MouseEvent,
		mousedown: wrapDispatcher(events.MouseDown, addPosition),
		mouseup: wrapDispatcher(events.MouseUp, addPosition),
		click: wrapEvent(function(node, options){
			if(has("mouse-up-down-clicks")){
				// click fires automatically in Opera, so run
				// preDispatch and postDispatch
				var d = Deferred.on(node, 'click');
				d.then(function(){
					events.Click.prototype.preDispatch.call({
						node: node
					});
					events.Click.prototype.postDispatch.call({
						node: node
					}, d);
				});
			}
			return exports.mousedown(node, options).then(function(){
				return exports.mouseup(node, options).then(function(){
					if(!has("mouse-up-down-clicks")){
						return click(node, options);
					}
					return d;
				});
			});
		}, addPosition),
		dblclick: wrapEvent(function(node, options){
			return exports.click(node, options).then(function(){
				return exports.click(node, options).then(function(){
					return dblclick(node, options);
				});
			});
		}, addPosition),
		_overTarget: null,
		mouseover: wrapEvent(function(node, options){
			if(exports._overTarget){
				exports.mouseout(exports._overTarget);
			}
			return mouseover(node, options).then(function(){
				exports._overTarget = node;
			});
		}, addPosition),
		mouseout: wrapEvent(function(node, options){
			return mouseout(node, options).then(function(){
				exports._overTarget = null;
			});
		}, addPosition),
		addPosition: addPosition,
		events: events
	});
});
