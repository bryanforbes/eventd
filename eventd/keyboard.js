define([
	'./main',
	'compose',
	'dojo/on',
	'dojo/query',
	'dojo/dom-prop',
	'dojo/array',
	'dojo/_base/sniff',
	'dojo/keys',
	'dojo/_base/window',
	'dojo/domReady!'
], function(eventd, Compose, on, query, domProp, array, has, keys, win){
	var KEY_CODE			= 1, // keyCode set to key code
		KEY_CODE_CHAR_CODE	= 2, // keyCode set to character code
		CHAR_CODE			= 4, // charCode set to character code
		CHAR_CODE_ZERO		= 8; // charCode set to 0

	var KeyboardDefaults = Compose(eventd.Defaults, {
		characters: {
			keydown:  KEY_CODE,
			keypress: KEY_CODE_CHAR_CODE,
			keyup:    KEY_CODE
		},
		Enter: {
			keydown:  KEY_CODE,
			keypress: KEY_CODE,
			keyup:    KEY_CODE
		},
		Backspace: {
			keydown: KEY_CODE,
			keyup: KEY_CODE
		},
		Special: {
			keydown:  KEY_CODE,
			keyup:    KEY_CODE
		}
	});

	var defaults = (function(){
		var defaults = KeyboardDefaults.prototype,
			overrides;

		if(has("webKit")){
			overrides = {
				characters: {
					keydown:  defaults.characters.keydown  | CHAR_CODE_ZERO,
					keypress: defaults.characters.keypress | CHAR_CODE,
					keyup:	  defaults.characters.keyup    | CHAR_CODE_ZERO
				},
				Enter: {
					keydown:  defaults.Enter.keydown  | CHAR_CODE_ZERO,
					keypress: defaults.Enter.keypress | CHAR_CODE,
					keyup:	  defaults.Enter.keyup    | CHAR_CODE_ZERO
				},
				Backspace: {
					keydown: defaults.Backspace.keydown | CHAR_CODE_ZERO,
					keyup:	 defaults.Backspace.keyup	| CHAR_CODE_ZERO
				},
				Special: {
					keydown:  defaults.Enter.keydown  | CHAR_CODE_ZERO,
					keyup:	  defaults.Enter.keyup    | CHAR_CODE_ZERO
				}
			};
		}else if(has("ff")){
			overrides = {
				characters: {
					keydown:  defaults.characters.keydown  | CHAR_CODE_ZERO,
					keypress: /* keyCode set to 0 */		 CHAR_CODE,
					keyup:	  defaults.characters.keyup    | CHAR_CODE_ZERO
				},
				Enter: {
					keydown:  defaults.Enter.keydown  | CHAR_CODE_ZERO,
					keypress: defaults.Enter.keypress | CHAR_CODE_ZERO,
					keyup:	  defaults.Enter.keyup    | CHAR_CODE_ZERO
				},
				Backspace: {
					keydown:  defaults.Backspace.keydown | CHAR_CODE_ZERO,
					keypress: KEY_CODE					 | CHAR_CODE_ZERO,
					keyup:	  defaults.Backspace.keyup	 | CHAR_CODE_ZERO
				},
				Special: {
					keydown:  defaults.Enter.keydown  | CHAR_CODE_ZERO,
					keyup:	  defaults.Enter.keyup    | CHAR_CODE_ZERO
				}
			};
		}

		return new KeyboardDefaults(overrides);
	})();

	var specials = (function(){
		var specials = [];
		for(var key in keys){
			specials.push(keys[key]);
		}
		return specials;
	})();


	var KeyboardOptions = Compose(eventd.Options, function(){
		var key = this.key,
			type = this.type,
			keyOptions;

		if(typeof key != "undefined"){
			if(typeof key == "number" && array.indexOf(specials, key) > -1){
				// keys.*
				this.keyCode = key;
				if(key == keys.ENTER){
					key = '\r';
					keyOptions = defaults.Enter[type];
				}else if(key === keys.BACKSPACE){
					key = '\b';
					keyOptions = defaults.Backspace[type];
				}else if(key >= keys.LEFT_ARROW && key <= keys.DOWN_ARROW){
					keyOptions = defaults.Special[type];
				}else if(key === keys.SPACE){
					key = ' ';
					keyOptions = defaults.characters[type];
				}else{
					keyOptions = defaults.Special[type];
				}
			}else if(key == '\r'){
				keyOptions = defaults.Enter[type];
			}else if(key == '\b'){
				keyOptions = defaults.Backspace[type];
			}else{
				keyOptions = defaults.characters[type];
			}

			if(keyOptions & KEY_CODE){
				if(typeof key == "string"){
					this.keyCode = key.toUpperCase(0).charCodeAt(0);
				}else{
					this.keyCode = key;
				}
			}else if(keyOptions & KEY_CODE_CHAR_CODE){
				this.keyCode = key.charCodeAt(0);
			}else{
				this.keyCode = 0;
			}

			if(keyOptions & CHAR_CODE){
				this.charCode = key.charCodeAt(0);
			}else if(keyOptions & CHAR_CODE_ZERO){
				this.charCode = 0;
			}
		}
	},{
		ctrlKey: false,
		altKey: false,
		shiftKey: false,
		metaKey: false,
		keyCode: undefined,
		charCode: undefined
	});

	has.add("events-key-events", function(g, d){
		try{
			d.createEvent("KeyEvents");
			return 1;
		}catch(e){
			return 0;
		}
	});

	var KeyboardEvent = Compose(eventd.Event, {
		optionsConstructor: KeyboardOptions
	});

	if(has("event-create-event")){
		var createEvent;
		if(has("event-key-events")){
			createEvent = function(evtObj){
				var options = evtObj.options,
					event = event = evtObj.node.ownerDocument.createEvent("KeyEvents");

				event.initKeyEvent(evtObj.type, options.bubbles, options.cancelable, options.view,
					options.ctrlKey, options.altKey, options.shiftKey, options.metaKey,
					options.keyCode, options.charCode);

				return event;
			};
		}else{
			createEvent = function(evtObj){
				var options = evtObj.options,
					event = evtObj.node.ownerDocument.createEvent("Events");

				event.initEvent(evtObj.type, options.bubbles, options.cancelable, options.view);
				options.copyToEvent(event);

				return event;
			};
		}

		Compose.call(KeyboardEvent.prototype, {
			create: Compose.around(function(baseCreate){
				return function(){
					try{
						return createEvent(this);
					}catch(e){
						return baseEvent(this, arguments);
					}
				};
			})
		});
	}

	var events = {};
	array.forEach(["KeyUp", "KeyDown", "KeyPress"], function(name){
		events[name] = Compose(KeyboardEvent, {
			type: name.toLowerCase()
		});
	});

	var dispatch = eventd.dispatch;

	(function(){
		var div = win.doc.createElement("div");
		div.innerHTML = "<input type='input'/><input type='input'/>";

		win.doc.documentElement.appendChild(div);

		var text1 = div.firstChild,
			text2 = text1.nextSibling;

		text1.focus();
		dispatch(events.KeyPress, text1, { key: keys.ENTER });

		dispatch(events.KeyPress, text1, { key: "s" });
		has.add("kbd-press-chars", text1.value == "s");

		text1.value = "s";

		dispatch(events.KeyPress, text1, { key: keys.BACKSPACE });
		has.add("kbd-press-backspace-deletes", text1.value === "");

		text2.focus();
		dispatch(events.KeyPress, text1, { key: "p" });
		has.add("kbd-press-unfocused-chars", text1.value == "sp");

		text1.focus();
		text1.value = "";
		var h;
		try{
			var e = win.doc.createEvent("TextEvent");
			has.add("kbd-text-events", typeof e.initTextEvent != "undefined");
			try{
				e.initTextEvent("textInput", true, true, null, "asdf");
			}catch(teErr){
				// IE requires passing 2 extra arguments
				try{
					e.initTextEvent("textInput", true, true, null, "asdf", e.DOM_INPUT_METHOD_KEYBOARD, "en-US");
					has.add("kbd-ie-text-events", 1);
				}catch(ieErr){}
			}
			h = on(text1, "input", function(){
				has.add("kbd-text-event-fires-input", 1);
			});
			text1.dispatchEvent(e);
			h.remove();
		}catch(err){}
		has.add("kbd-text-event-sets-value", text1.value == "asdf");

		h = on(text1, "change", function(){
			has.add("kbd-press-enter-changes", 1);
		});
		text1.focus();
		text1.value = "";

		dispatch(events.KeyPress, text1, { key: 'f' });
		dispatch(events.KeyPress, text1, { key: '\r' });
		h.remove();

		win.doc.documentElement.removeChild(div);
	})();

	if(has("kbd-text-events")){
		var TextInputOptions = Compose(eventd.Options, {
			data: ""
		});

		var initTextEvent;
		if(has("kbd-ie-text-events")){
			initTextEvent = function(event, object, options){
				event.initTextEvent(object.type, options.bubbles, options.cancelable, options.view, options.data,
									event.DOM_INPUT_METHOD_KEYBOARD, "en-US");
			};
		}else{
			initTextEvent = function(event, object, options){
				event.initTextEvent(object.type, options.bubbles, options.cancelable, options.view, options.data);
			};
		}

		var TextInput = events.TextInput = Compose(eventd.Event, {
			type: "textInput",
			optionsConstructor: TextInputOptions,
			create: function(){
				var event = this.node.ownerDocument.createEvent("TextEvent");

				initTextEvent(event, this, this.options);

				return event;
			}
		});

		if(!has("kbd-text-event-sets-value")){
			Compose.call(TextInput.prototype, {
				postDispatch: function(deferred){
					var node = this.node,
						options = this.options;
					deferred.then(function(){
						node.value = (node.value||"") + options.data;
					});
				}
			});
		}
		if(!has("kbd-text-event-fires-input")){
			var Input = events.Input = Compose(eventd.Event, {
				type: "input",
				create: function(){
					var event = this.node.ownerDocument.createEvent("Event"),
						options = this.options;

					event.initEvent(this.type, options.bubbles, options.cancelable, options.view);

					return event;
				}
			});
		}
	}else if(!has("kbd-press-chars")){
		Compose.call(events.KeyPress.prototype, {
			postDispatch: function(deferred){
				var node = this.node,
					options = this.options;
				deferred.then(function(){
					node.value = (node.value||"") + String.fromCharCode(options.charCode || options.keyCode);
				});
			}
		});
	}

	has.add("kbd-get-selection", function(g, d){
		return typeof d.getSelection != "undefined";
	});
	var handleBackspace;
	if(!has("kbd-press-backspace-deletes")){
		if(has("kbd-get-selection")){
			handleBackspace = function(node){
				node.selectionStart = node.selectionEnd - 1;
				document.execCommand("delete");
			};
		}else{
			handleBackspace = function(node){
				var sel = document.selection.createRange();
				sel.moveStart("character", "-1");
				sel.select();
				document.execCommand("delete");
			};
		}
	}

	var handleArrows;
	if(has("kbd-get-selection")){
		handleArrows = function(key, node){
			switch(key){
				case keys.LEFT_ARROW:
					node.selectionStart = node.selectionEnd = node.selectionEnd - 1;
					break;
				case keys.RIGHT_ARROW:
					node.selectionStart = node.selectionEnd = node.selectionEnd + 1;
					break;
				default:
					break;
			}
		};
	}else{
		handleArrows = function(key, node){
			var sel = document.selection.createRange(),
				count;
			switch(key){
				case keys.LEFT_ARROW:
					count = "-1";
					break;
				case keys.RIGHT_ARROW:
					count = "1";
					break;
				default:
					break;
			}
			if(count){
				sel.moveStart("character", count);
				sel.collapse(true);
			}
		};
	}
	Compose.call(events.KeyDown.prototype, {
		postDispatch: function(deferred){
			var key = this.options.key,
				node = this.node;
			if(handleBackspace && (key === keys.BACKSPACE || key == '\b')){
				deferred.then(function(){
					handleBackspace(node);
				});
			}else if(key >= keys.LEFT_ARROW && key <= keys.DOWN_ARROW){
				var name = node.nodeName.toUpperCase();
				if(name == "INPUT" || name == "TEXTAREA"){
					deferred.then(function(){
						handleArrows(key, node);
					});
				}
			}
		}
	});

	var charRE = /^[A-Za-z0-9!@#$%^&*()_+-={}[\]:;"'`~,.\/<>?]$/,
		upperRE = /^[A-Z~!@#$%^&*()_+{}":?><]$/;
	function KeySequence(node, characters, delayBetween){
		var sequence = [],
			name = node.nodeName.toUpperCase();

		function add(){
			for(var i=0, tuple; tuple=arguments[i]; i++){
				sequence.push(tuple);
			}
		}

		function fromString(string){
			var lastUpper = 0, upper = 0;
			for(var i=0, character; character=string.charAt(i); i++){
				upper = upperRE.test(character);
				if(!lastUpper && upper){
					add([events.KeyDown, { key: keys.SHIFT }]);
					lastUpper = 1;
				}else if(lastUpper && !upper){
					add([events.KeyUp, { key: keys.SHIFT }]);
					lastUpper = 0;
				}

				fromCharacter(character, upper);
			}

			if(upper){
				add([events.KeyUp, { key: keys.SHIFT }]);
			}
		}

		function fromArray(arr){
			for(var i=0, l=arr.length, character; i<l; i++){
				character = arr[i];
				if(typeof character == "string"){
					fromString(character);
				}else if(typeof character == "number"){
					fromCharacter(character);
				}
			}
		}

		function fromCharacter(character, upper){
			// insert a delay between keystrokes
			if(sequence.length > 1 && delayBetween){
				sequence[sequence.length-1][2] = delayBetween;
			}

			var options;
			if(charRE.test(character)){
				options = { key: character, shiftKey: !!upper };
				add([events.KeyDown, options], [events.KeyPress, options]);
				if(has("kbd-text-events")){
					add([TextInput, { data: character }]);
					if(!has("kbd-text-event-fires-input")){
						add([Input]);
					}
				}
				add([events.KeyUp, options]);
			}else if(character == "\r" || character == keys.ENTER){
				options = { key: keys.ENTER };
				add([events.KeyDown, options], [events.KeyPress, options]);
				if(has("kbd-text-events")){
					if(name == "TEXTAREA"){
						add([TextInput, { data: "\r\n" }]);
						if(!has("kbd-text-event-fires-input")){
							add([Input]);
						}
					}
				}
				if(name == "INPUT" && !has("kbd-press-enter-changes")){
					add([eventd.events.Change]);
				}
				add([events.KeyUp, options]);
			}else if(character == " " || character == keys.SPACE){
				options = { key: keys.SPACE };
				add([events.KeyDown, options], [events.KeyPress, options]);
				if(has("kbd-text-events")){
					if((name == "TEXTAREA" || name == "INPUT")){
						add([TextInput, { data: " " }]);
						if(!has("kbd-text-event-fires-input")){
							add([Input]);
						}
					}
				}
				add([events.KeyUp, options]);
			}else if(character == "\b"){
				options = { key: keys.BACKSPACE };
				add([events.KeyDown, options]);
				if(typeof defaults.Backspace.keypress != "undefined"){
					add([events.KeyPress, options]);
				}
				add([events.KeyUp, options]);
			}else if(character == "\t"){
				add([events.KeyDown, { key: "Tab" }],
					[eventd.events.Blur, {}],
					[eventd.events.Focus, {}],
					[events.KeyUp, { key: "Tab" }]);
			}else if(typeof character == "number"){
				if(character >= keys.LEFT_ARROW && character <= keys.DOWN_ARROW){
					add([events.KeyDown, { key: character }], [events.KeyUp, { key: character }]);
				}
			}
		}

		if(typeof characters == "string"){
			if(characters.length == 1){
				fromCharacter(characters, upperRE.test(characters));
			}else{
				fromString(characters);
			}
		}else if(typeof characters == "number"){
			fromCharacter(characters);
		}else{
			fromArray(characters);
		}

		var lastBlur = 0;
		function next(){
			var nextItem = sequence.shift(),
				n = node;
			if(nextItem){
				if(typeof nextItem[1] != "undefined"){
					var options = nextItem[1];
				}
				if(nextItem[0] === eventd.events.Blur){
					lastBlur = 1;
				}else if(lastBlur){
					lastBlur = 0;
					if(nextItem[0] === eventd.events.Focus){
						n = node = getNextFocus();
					}
				}

				var d = (new nextItem[0](n, options)).dispatch();
				if(typeof nextItem[2] != "undefined"){
					return d.delay(nextItem[2]).then(next);
				}else{
					return d.then(next);
				}
			}
		}

		return next();
	}

	function getFocusableNodes(){
		var greater = [],
			zero = [],
			none = [];

		query("*[tabindex],a,area,button,input,object,select,textarea").forEach(function(node){
			var tabindex = parseInt(domProp.get(node, "tabIndex"), 10);

			if(isNaN(tabindex)){
				none.push(node);
			}else if(tabindex === 0){
				zero.push(node);
			}else if(tabindex > 0){
				greater.push([tabindex, node]);
			}
		});

		greater.sort(function(a,b){
			if(a[0]>b[0]){ return 1; }
			if(a[0]<b[0]){ return -1; }
			return 0;
		});

		greater = array.map(greater, function(item){
			return item[1];
		});

		return greater.concat(zero, none);
	}

	var _focusNode;
	on(win.body(), "*:focus", function(evt){
		_focusNode = this;
	});
	/*on(win.body(), "*:blur", function(evt){
		_focusNode = null;
	});*/

	function getNextFocus(){
		if(_focusNode){
			var nodes = getFocusableNodes(),
				idx = array.indexOf(nodes, _focusNode),
				next = idx + 1;

			if(idx == nodes.length){
				return null;
			}

			return nodes[next];
		}else{
			return getFocusableNodes()[0]||null;
		}
	}

	function getPrevFocus(){
		var nodes = getFocusableNodes();
		if(_focusNode){
			var idx = array.indexOf(nodes, _focusNode),
				next = idx - 1;

			if(next < 0){
				return null;
			}

			return nodes[next];
		}else{
			return nodes[nodes.length-1];
		}
	}

	var Dispatcher = eventd.Dispatcher;

	function wrapEvent(func){
		return function(node, options){
			node = eventd.getNode(node);

			return func(node, options);
		};
	}

	return {
		keydown: wrapEvent(Dispatcher(events.KeyDown)),
		keypress: wrapEvent(Dispatcher(events.KeyPress)),
		keyup: wrapEvent(Dispatcher(events.KeyUp)),
		keystroke: wrapEvent(function(node, character){
			return KeySequence(node, character);
		}),
		keystrokes: wrapEvent(function(node, characters, delayBetween){
			delayBetween = delayBetween || 50;
			return KeySequence(node, characters, delayBetween);
		}),
		events: events,
		Defaults: KeyboardDefaults,
		Options: KeyboardOptions
	};
});
