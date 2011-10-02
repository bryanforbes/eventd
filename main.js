define([
	'exports',
	'./Deferred',
	'compose',
	'dojo/dom',
	'dojo/_base/sniff'
], function(exports, Deferred, Compose, dom, has){
	var op = Object.prototype,
		opts = op.toString,
		cname = "constructor",
		global = this;

	function Dispatcher(event){
		return function(node, options){
			return (new event(node, options)).dispatch();
		};
	}

	function dispatch(event, node, options){
		return (new event(node, options))._dispatch();
	}

	has.add("event-create-event", function(g, d){
		return !!d.createEvent;
	});

	has.add("event-events", function(g, d){
		if(!has("event-create-event")){
			return;
		}
		try{
			d.createEvent("Events");
			return 1;
		}catch(e){
			return 0;
		}
	});

	var Event = Compose(function(node, options){
		this.node = dom.byId(node);
		this.setOptions(options);

		this._event = this.create();
	},{
		node: null,
		type: null,
		options: null,
		asyncDeferred: false,

		_event: null,

		baseOptions: {
			bubbles: true,
			cancelable: true,
			view: global
		},

		setOptions: function(options){
			this.options = Compose.create(this.baseOptions, options);
		},
		copyOptions: function(event){
			// this doesn't need to look for shadowed properties since
			// they are all functions
			var name, t, options = this.options;
			// only copy primitive values
			for(name in options){
				t = options[name];
				if((t !== op[name] || !(name in op)) && name != cname){
					switch(opts.call(t)){
						case "[object Function]":
						case "[object Object]":
						case "[object Array]":
							// skip objects, arrays, and functions
							break;
						default:
							// copy primitives
							try{
								event[name] = t;
							}catch(e){}
							break;
					}
				}
			}
		},

		preDispatch: null,
		dispatch: function(){
			var d = Deferred.on(this.node, this.type, this.asyncDeferred);

			this.preDispatch && this.preDispatch();
			var res = this._dispatch();
			this.postDispatch && res && this.postDispatch(d);

			return d;
		},
		postDispatch: null
	});

	if(has("event-create-event")){
		var eventName = "Events";
		if(!has("event-events")){
			eventName = "UIEvents";
		}
		Compose.call(Event.prototype, {
			create: function(){
				var event = this.node.ownerDocument.createEvent(eventName);
				event.initEvent(this.type, this.options.bubbles, this.options.cancelable);
				this.copyOptions(event);
				return event;
			},
			_dispatch: function(){
				var event = this._event,
					preventDefault = event.preventDefault,
					prevented = 0;

				event.preventDefault = function(){
					event._prevented = 1;
					preventDefault.call(event);
					prevented++;
				};
				this.node.dispatchEvent(event);

				return prevented === 0;
			}
		});
	}else{
		Compose.call(Event.prototype, {
			create: function(){
				var event = this.node.ownerDocument.createEventObject();
				this.copyOptions(event);
				return event;
			},
			_dispatch: function(){
				try{
					global.event = this._event;
				}catch(e){}
				// a sourceIndex greater than 0 means the node is in the document
				if(this.node.sourceIndex > 0){
					return this.node.fireEvent("on"+this.type, this._event);
				}
				return 0;
			}
		});
	}

	var events = {
		Change: Compose(Event, {
			type: "change"
		}),
		Focus: Compose(Event, {
			type: "focus",
			asyncDeferred: !!has("ie"),
			create: function(){},
			_dispatch: function(){
				this.node.focus();
			}
		}),
		Blur: Compose(Event, {
			type: "blur",
			create: function(){},
			_dispatch: function(){
				this.node.blur();
			}
		})
	};

	Compose.call(exports, {
		global: global,
		document: global.document,
		body: function body(){
			return exports.document.body || exports.document.getElementsByTagName("body")[0];
		},

		change: Dispatcher(events.Change),
		focus: Dispatcher(events.Focus),
		blur: Dispatcher(events.Blur),

		delegateProperty: function delegateProperty(from, opts){
			if(!opts){
				opts = from;
				from = Event;
			}
			return Compose.Decorator(function(key){
				this[key] = Compose.create(from.prototype[key], opts);
			});
		},
		recursiveMix: function recursiveMix(object, overrides){
			if(overrides){
				for(var key in object){
					var objValue = object[key],
						ovrValue = overrides[key];
					if(objValue && typeof objValue == "object" && ovrValue && typeof ovrValue == "object"){
						exports.recursiveMix(objValue, ovrValue);
					}else if(ovrValue !== op[key]){
						object[key] = ovrValue;
					}
				}
			}

			return object;
		},

		getNode: function getNode(node){
			if(typeof node != "string"){
				return node.focusNode || node.domNode || node;
			}else{
				return dom.byId(node);
			}
		},

		wrapEvent: function wrapEvent(func, modifier){
			return function(node, options){
				node = exports.getNode(node);
				options = options || {};
				modifier && modifier(node, options);

				return func(node, options);
			};
		},
		wrapDispatcher: function wrapDispatcher(event, modifier){
			return exports.wrapEvent(exports.Dispatcher(event), modifier);
		},

		Event: Event,
		Dispatcher: Dispatcher,
		dispatch: dispatch,
		events: events
	});
});
