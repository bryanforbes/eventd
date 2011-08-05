define([
	'./Deferred',
	'compose',
	'dojo/on',
	'dojo/dom',
	'dojo/_base/window',
	'dojo/_base/sniff'
], function(Deferred, Compose, on, dom, win, has){

	var op = Object.prototype,
		opts = op.toString,
		cname = "constructor";

	var Options = Compose(function(type, options){
		this.type = type;

		options = options || {};

		for(var i in options){
			if(!(i in op)){
				this[i] = options[i];
			}
		}

		if(!this.view){
			this.view = win.global;
		}
	},{
		bubbles: true,
		cancelable: true,
		view: null,

		copyToEvent: function(event){
			// this doesn't need to look for shadowed properties since
			// they are all functions
			var name, t;
			// only copy primitive values
			for(name in this){
				t = this[name];
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
		}
	});

	var Defaults = Compose(function(specifics){
		specifics = specifics || {};
		for(var def in this){
			if(!(def in op) && def in specifics){
				if(typeof this[def] == "object" && typeof specifics[def] == "object"){
					this[def] = Compose.create(this[def], specifics[def]);
				}else{
					this[def] = specifics[def];
				}
			}
		}
	});

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

		this.originalOptions = options;
		this.options = new this.optionsConstructor(this.type, options);

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

		optionsConstructor: Options,

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
				var event = win.doc.createEvent(eventName);
				event.initEvent(this.type, this.options.bubbles, this.options.cancelable);
				this.options.copyToEvent(event);
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
				this.options.copyToEvent(event);
				return event;
			},
			_dispatch: function(){
				try{
					win.global.event = this._event;
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

	return {
		change: Dispatcher(events.Change),
		focus: Dispatcher(events.Focus),
		blur: Dispatcher(events.Blur),

		getNode: getNode,
		Options: Options,
		Defaults: Defaults,
		Event: Event,
		Dispatcher: Dispatcher,
		dispatch: dispatch,
		events: events
	};
});
