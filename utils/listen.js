define([
	'eventd/adapter!has',
	'eventd/adapter!has!dom-addeventlistener?:eventd/utils/aspect'
], function(has, aspect){
    var aslice = [].slice;
    function toArray(arrLike, offset, startWith){
        return (startWith||[]).concat(aslice.call(arrLike, offset||0));
    }

	function bind(func, scope){
		var pre = toArray(arguments, 2);
		return function(){
			return func.apply(scope, toArray(arguments, 0, pre));
		};
	}

	has.add("jscript", function(global){
		var major = global.ScriptEngineMajorVersion;

		return major && (major() + global.ScriptEngineMinorVersion() / 10);
	});

	function getDocument(element){
		// based on work by John-David Dalton
		return element.ownerDocument || element.document ||
			(element.nodeType == 9 ? element : document);
	}

	var global = this;
	function getWindow(element){
		// based on work by Diego Perini and John-David Dalton
		var frame, i = -1, doc = getDocument(element), frames = global.frames;
		if(document != doc){
			while((frame = frames[++i])){
				if(frame.document == doc){
					return frame;
				}
			}
		}
		return global;
	}

	var listen = function(target, type, listener, capture){
		target.addEventListener(type, listener, capture||false);

		return {
			remove: function(){
				target.removeEventListener(type, listener, capture||false);
			}
		};
	};

	if(!has("dom-addeventlistener")){
		if(has("jscript")){
			var fixEvent = function(evt){
				evt = getWindow(getDocument(this)).event;
				evt.target = evt.srcElement;

				return [evt];
			};
		}

		var attach = function(target, type, listener){
			var existing = target[type],
				needHandler = (!existing || !existing.eventdAttached);

			if(fixEvent && needHandler){
				aspect.before(target, type, bind(fixEvent, target));
			}
			return aspect.after(target, type, bind(listener, target), true);
		};

		if(has("jscript") < 5.8 && !has("config-_allow_leaks")){
			__eventdIEListeners__ = {
				'0': {}, // window
				'1': {}  // document
			};
			attach = (function(){
				function createHandler(id, event){
					return function(){
						if(__eventdIEListeners__[id] && __eventdIEListeners__[id][event]){
							__eventdIEListeners[id][event].call(this);
						}
					};
				}

				var nodeId = 2;
				function getNodeId(node){
					// Based on work by John-David Dalton in FuseJS
					var id = node.uniqueNumber, win;

					if(!id){
						// In IE window == document is true but not document == window.
						// Use loose comparison because different `window` references for
						// the same window may not strictly equal each other.
						win = getWindow(node);
						if (node == win) {
							id = node == global ? '0' : getNodeId(node.frameElement) + '-0';
						}else if(node.nodeType == 9){ // document node
							// quick return for common case OR
							// calculate id for foreign document objects
							id = node == document ? '1' : getNodeId(win.frameElement) + '-1';
						}else{
							id = node._eventdId = nodeId++;
						}
					}

					return id;
				}

				return function(target, type, listener){
					var nodeId = getNodeId(target),
						data = __eventdIEListeners__[nodeId],
						existing = target[type],
						needHandler = (!existing || !existing.eventdAttached);

					if(!data){
						data = __eventdIEListeners__[nodeId] = {};
					}

					if(existing && needHandler){
						aspect.after(data, type, existing, true);
					}

					var signal = aspect.after(data, type, bind(listener, target));

					if(needHandler){
						aspect.before(data, type, bind(fixEvent, target));
						var handler = target[type] = createHandler(nodeId, type);
						handler.eventdAttached = 1;
					}

					return signal;
				};
			})();
		}
		listen = (function(listen){
			return function(target, type, listener, capture){
				if(target.addEventListener){
					return listen(target, type, listener, capture);
				}

				return attach(target, "on" + type, listener, capture);
			};
		})(listen);
	}

	listen.once = function(target, type, listener, capture){
		var signal = listen(target, type, function(){
			signal.remove();

			return listener.apply(this, arguments);
		}, capture);

		return signal;
	};
	return listen;
});
