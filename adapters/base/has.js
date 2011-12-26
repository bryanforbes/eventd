define(['exports'], function(exports){
	var isBrowser =
			// the most fundamental decision: are we in the browser?
			typeof window != "undefined" &&
			typeof location != "undefined" &&
			typeof document != "undefined" &&
			window.location == location && window.document == document,
		global = (this === exports ? window : this),
		doc = isBrowser && document,
		element = doc && doc.createElement("DiV"),
		cache = has.cache = {};

	function has(name){
		return cache[name] = typeof cache[name] == "function" ? cache[name](global, doc, element) : cache[name]; // Boolean
	}

	var addtest = has.add = function(name, test, now, force){
		(typeof cache[name]=="undefined" || force) && (cache[name]= test);
		return now && has(name);
	};
	addtest("host-browser", isBrowser);
	addtest("dom", isBrowser);

	has.clearElement = function(element) {
		// summary:
		//	 Deletes the contents of the element passed to test functions.
		element.innerHTML= "";
		return element;
	};

	has.normalize = function(id, toAbsMid){
		// summary:
		//	 Resolves id into a module id based on possibly-nested tenary expression that branches on has feature test value(s).
		//
		// toAbsMid: Function
		//	 Resolves a relative module id into an absolute module id
		var tokens = id.match(/[\?:]|[^:\?]*/g), i = 0,
			get = function(skip){
				var term = tokens[i++];
				if(term == ":"){
					// empty string module name, resolves to 0
					return 0;
				}else{
					// postfixed with a ? means it is a feature to branch on, the term is the name of the feature
					if(tokens[i++] == "?"){
						if(!skip && has(term)){
							// matched the feature, get the first value from the options
							return get();
						}else{
							// did not match, get the second value, passing over the first
							get(true);
							return get(skip);
						}
					}
					// a module
					return term || 0;
				}
			};
		id = get();
		return id && toAbsMid(id);
	};

	has.load = function(id, parentRequire, loaded){
		// summary:
		//	 Conditional loading of AMD modules based on a has feature test value.
		//
		// id: String
		//	 Gives the resolved module id to load.
		//
		// parentRequire: Function
		//	 The loader require function with respect to the module that contained the plugin resource in it's
		//	 dependency list.
		//
		// loaded: Function
		//	 Callback to loader that consumes result of plugin demand.

		if(id){
			parentRequire([id], function(module){ loaded(module); });
		}else{
			loaded();
		}
	};

	return has;
});
