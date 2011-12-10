define([], function(){
	// imported from Dojo 1.7.0b6 (dojo/has and dojo/sniff)
	var isBrowser =
			// the most fundamental decision: are we in the browser?
			typeof window != "undefined" &&
			typeof location != "undefined" &&
			typeof document != "undefined" &&
			window.location == location && window.document == document,
		global = this,
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

	if(has("host-browser")){
		var n = navigator,
			dua = n.userAgent,
			dav = n.appVersion,
			tv = parseFloat(dav);

		// Common application level tests
		addtest("dom-addeventlistener", !!document.addEventListener);
		addtest("touch", "ontouchstart" in document);
		// I don't know if any of these tests are really correct, just a rough guess
		addtest("device-width", screen.availWidth || innerWidth);
		addtest("agent-ios", Browser.Platform.ios);
		addtest("agent-android", Browser.Platform.android);

		addtest("air", Browser.Features.air);
		addtest("khtml", dav.indexOf("Konqueror") >= 0 ? tv : 0);
		addtest("webkit", parseFloat(dua.split("WebKit/")[1]) || undefined);
		addtest("chrome", Browser.chrome && Browser.version);
		addtest("mac", Browser.Platform.mac);
		addtest("ios", Browser.Platform.ios);
		addtest("android", parseFloat(dua.split("Android ")[1]) || undefined);
		addtest("wii", typeof opera != "undefined" && opera.wiiremote);

		// safari detection derived from:
		//		http://developer.apple.com/internet/safari/faq.html#anchor2
		//		http://developer.apple.com/internet/safari/uamatrix.html
		var index = Math.max(dav.indexOf("WebKit"), dav.indexOf("Safari"), 0);
		addtest("safari", function(){
			var isSafari;
			if(index && !has("chrome")){
				// try to grab the explicit Safari version first. If we don't get
				// one, look for less than 419.3 as the indication that we're on something
				// "Safari 2-ish".
				isSafari = parseFloat(dav.split("Version/")[1]);
				if(!isSafari || parseFloat(dav.substr(index + 7)) <= 419.3){
					isSafari = 2;
				}
			}
			return isSafari;
		});

		if(!has("webkit")){
			addtest("opera", function(){
				var isOpera;
				if(dua.indexOf("Opera") >= 0){
					isOpera = tv;
					// see http://dev.opera.com/articles/view/opera-ua-string-changes and http://www.useragentstring.com/pages/Opera/
					// 9.8 has both styles; <9.8, 9.9 only old style
					if(isOpera >= 9.8){
						isOpera = parseFloat(dua.split("Version/")[1]) || tv;
					}
				}
				return isOpera;
			});

			addtest("mozilla", function(){
				var isMozilla;
				if(dua.indexOf("Gecko") >= 0 && !has("khtml") && !has("webkit")){
					isMozilla = tv;
				}
				return isMozilla;
			});

			addtest("ie", function(){
				var isIE;
				if(document.all && !has("opera")){
					isIE = parseFloat(dav.split("MSIE ")[1]) || undefined;
					//In cases where the page has an HTTP header or META tag with
					//X-UA-Compatible, then it is in emulation mode.
					//Make sure isIE reflects the desired version.
					//document.documentMode of 5 means quirks mode.
					//Only switch the value if documentMode's major version
					//is different from isIE's major version.
					var mode = document.documentMode;
					if(mode && mode != 5 && Math.floor(isIE) != mode){
						isIE = mode;
					}
				}
				return isIE;
			});

			//We really need to get away from this. Consider a sane isGecko approach for the future.
			addtest("ff", has("mozilla") && parseFloat(dua.split("Firefox/")[1] || dua.split("Minefield/")[1]) || undefined);
		}

		addtest("quirks", document.compatMode == "BackCompat");
	}

	has.clearElement = function(element) {
		// summary:
		//	 Deletes the contents of the element passed to test functions.
		element.innerHTML= "";
		return element;
	};

	has.load = function(id, parentRequire, loaded){
		// summary:
		//	 Conditional loading of AMD modules based on a has feature test value.
		//
		// id: String
		//	 Gives the has feature name, a module to load when the feature exists, and optionally a module
		//	 to load when the feature is false. The string had the format `"feature-name!path/to/module!path/to/other/module"`
		//
		// parentRequire: Function
		//	 The loader require function with respect to the module that contained the plugin resource in it's
		//	 dependency list.
		//
		// loaded: Function
		//	 Callback to loader that consumes result of plugin demand.

		var tokens = id.match(/[\?:]|[^:\?]*/g), i = 0,
			get = function(skip){
				var term = tokens[i++];
				if(term == ":"){
					// empty string module name, resolves to undefined
					return undefined;
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
					return term;
				}
			};
		id = get();
		if(id){
			parentRequire([id], loaded);
		}else{
			loaded();
		}
	};

	return has;
});
