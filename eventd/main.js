define(['dojo', 'dojo/listen', './Deferred'], function(dojo, listen, Deferred){

	var op = Object.prototype,
		opts = op.toString,
		cname = "constructor";

	var Options = dojo.declare(null, {
		bubbles: true,
		cancelable: true,
		view: null,

		constructor: function(type, options){
			this.type = type;

			options = options || {};

			for(var i in options){
				if(!(i in op)){
					this[i] = options[i];
				}
			}

			if(!this.view){
				this.view = dojo.global;
			}
		},

		copyToEvent: function(event){
			// this doesn't need to look for shadowed properties since
			// they are all functions
			var proto = this.constructor.prototype,
				name, t;
			// only copy primitive values of properties defined on the prototype
			for(name in proto){
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

	var Defaults = dojo.declare(null, {
		constructor: function(specifics){
			specifics = specifics || {};
			for(var def in this){
				if(!(def in op) && def in specifics){
					if(typeof this[def] == "object" && typeof specifics[def] == "object"){
						this[def] = dojo.delegate(this[def], specifics[def]);
					}else{
						this[def] = specifics[def];
					}
				}
			}
		}
	});

	function Dispatcher(event){
		return function(node, options){
			return (new event(node, options)).dispatch();
		};
	}

	var Event = dojo.declare(null, {
		node: null,
		type: null,
		originalOptions: null,
		options: null,
		asyncDeferred: false,

		_event: null,

		optionsConstructor: Options,

		constructor: function(node, options, dontCreate){
			this.node = dojo.byId(node);

			this.originalOptions = options;
			this.options = new this.optionsConstructor(this.type, options);

			this.preCreate();

			if(!dontCreate){
				this._event = this.create();
			}
		},

		preCreate: function(){},

		dispatch: function(){
			var d = Deferred.event(this.node, this.type, this.asyncDeferred);

			var res = this._dispatch();
			!res && this.postDispatch(d);

			return d;
		},
		postDispatch: function(){}
	});

	if(dojo.doc.createEventObject){
		Event.extend({
			create: function(){
				var event = this.node.ownerDocument.createEventObject();
				this.options.copyToEvent(event);
				return event;
			},
			_dispatch: function(){
				try{
					dojo.global.event = this._event;
				}catch(e){}
				// a sourceIndex greater than 0 means the node is in the document
				if(this.node.sourceIndex > 0){
					return this.node.fireEvent("on"+this.type, this._event);
				}
				return false;
			}
		});
	}else{
		Event.extend({
			create: function(){
				var event;
				try{
					event = dojo.doc.createEvent("Events");
				}catch(e){
					event = dojo.doc.createEvent("UIEvents");
				}
				event.initEvent(this.type, this.options.bubbles, this.options.cancelable);
				this.options.copyToEvent(event);
				return event;
			},
			_dispatch: function(){
				var event = this._event,
					preventDefault = event.preventDefault,
					prevented = 0;

				event.preventDefault = function(){
					event._prevented = true;
					preventDefault.call(event);
					prevented++;
				};
				this.node.dispatchEvent(event);

				return prevented > 0;
			}
		});
	}

	var events = {
		Change: dojo.declare(Event, {
			type: "change"
		}),
		Focus: dojo.declare(Event, {
			type: "focus",
			asyncDeferred: true,
			create: function(){},
			_dispatch: function(){
				this.node.focus();
			}
		})
	};

	return {
		change: Dispatcher(events.Change),
		focus: Dispatcher(events.Focus),

		Options: Options,
		Defaults: Defaults,
		Event: Event,
		Dispatcher: Dispatcher,
		events: events
	};
});
