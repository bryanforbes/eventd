define([
	'./Deferred',
	'compose',
	'dojo/dom',
	'dojo/_base/sniff'
], function(Deferred, Compose, dom, has){
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

	function getNode(node){
		if(typeof node != "string"){
			return node.focusNode || node.domNode || node;
		}else{
			return dom.byId(node);
		}
	}

	function wrapEvent(func, modifier){
		return function(node, options){
			node = eventd.getNode(node);
			options = options || {};
			modifier && modifier(node, options);

			return func(node, options);
		};
	}

	function wrapDispatcher(event, modifier){
		return eventd.wrapEvent(Dispatcher(event), modifier);
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

	var Event = Compose(function(node, options, dontCreate){
		this.node = dom.byId(node);

		this.setOptions(options);

		this.preCreate();

		if(!dontCreate){
			this._event = this.create();
		}
	},{
		node: null,
		type: null,
		originalOptions: null,
		options: null,
		asyncDeferred: false,

		_event: null,

		baseOptions: {
			bubbles: true,
			cancelable: true,
			view: global
		},

		setOptions: function(options){
			this.originalOptions = options;
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

		preCreate: function(){},

		dispatch: function(){
			var d = Deferred.event(this.node, this.type, this.asyncDeferred);

			var res = this._dispatch();
			res && this.postDispatch(d);

			return d;
		},
		postDispatch: function(){}
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

	function recursiveDelegate(object, source){
		source = source || {};
		var result = Compose.create(object, source);
		for(var def in object){
			if(typeof object[def] == "object" && typeof source[def] == "object"){
				result[def] = recursiveDelegate(object[def], source[def]);
			}
		}
		return result;
	}

	var eventd = {
		global: global,
		document: global.document,
		body: function body(){
			return eventd.document.body || eventd.document.getElementsByTagName("body")[0];
		},

		change: Dispatcher(events.Change),
		focus: Dispatcher(events.Focus),
		blur: Dispatcher(events.Blur),

		delegateProperty: function(from, opts){
			if(!opts){
				opts = from;
				from = Event;
			}
			return Compose.Decorator(function(key){
				this[key] = Compose.create(from.prototype[key], opts);
			});
		},
		recursiveDelegate: recursiveDelegate,
		getNode: getNode,
		wrapEvent: wrapEvent,
		wrapDispatcher: wrapDispatcher,
		Event: Event,
		Dispatcher: Dispatcher,
		dispatch: dispatch,
		events: events
	};

	return eventd;
});
