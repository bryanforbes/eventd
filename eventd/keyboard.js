define([
	'./main',
	'dojo/_base/kernel', // to get the dojo object
	'dojo/_base/declare',
	'dojo/on',
	'dojo/_base/array',
	'dojo/_base/sniff',
	'dojo/_base/window',
	'dojo/_base/connect', // for dojo.keys
	'dojo/domReady!'
], function(eventd, dojo, declare, on, array, has, win){
	var KEY_CODE			= 1, // keyCode set to key code
		KEY_CODE_CHAR_CODE	= 2, // keyCode set to character code
		CHAR_CODE			= 4, // charCode set to character code
		CHAR_CODE_ZERO		= 8; // charCode set to 0

	var KeyboardDefaults = declare(eventd.Defaults, {
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

	var keys = dojo.keys,
		specials = (function(){
			var specials = [];
			for(var key in keys){
				specials.push(keys[key]);
			}
			return specials;
		})();


	var KeyboardOptions = declare(eventd.Options, {
		ctrlKey: false,
		altKey: false,
		shiftKey: false,
		metaKey: false,
		keyCode: undefined,
		charCode: undefined,

		constructor: function(){
			var key = this.key,
				type = this.type,
				keyOptions;

			if(typeof key != "undefined"){
				if(typeof key == "number" && array.indexOf(specials, key) > -1){
					// dojo.keys.*
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
		}
	});

	var KeyboardEvent = declare(eventd.Event, {
		optionsConstructor: KeyboardOptions
	});

	if(win.doc.createEvent){
		try{
			win.doc.createEvent("KeyEvents");
			KeyboardEvent.extend({
				create: function(){
					var event, options = this.options;
					try{
						event = this.node.ownerDocument.createEvent("KeyEvents");
						event.initKeyEvent(this.type, options.bubbles, options.cancelable, options.view,
							options.ctrlKey, options.altKey, options.shiftKey, options.metaKey,
							options.keyCode, options.charCode);
						//options.copyToEvent(event);
					}catch(e){
						event = this.inherited(arguments);
					}

					return event;
				}
			});
		}catch(e){
			try{
				win.doc.createEvent("Events");
				KeyboardEvent.extend({
					create: function(){
						var event, options = this.options;
						try{
							event = this.node.ownerDocument.createEvent("Events");
							event.initEvent(this.type, options.bubbles, options.cancelable, options.view);
							this.options.copyToEvent(event);
						}catch(e){
							event = this.inherited(arguments);
						}

						return event;
					}
				});
			}catch(e){}
		}
	}

	var events = {};
	array.forEach(["KeyUp", "KeyDown", "KeyPress"], function(name){
		events[name] = declare(KeyboardEvent, {
			type: name.toLowerCase()
		});
	});

	var tests = {
		pressChars: false,
		pressCharsUnfocused: false,
		pressEnterChange: false,
		pressBackspace: false,
		hasTextEvents: false,
		textEventSetsValue: false,
		textEventFiresInput: false
	};

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
		tests.pressChars = text1.value == "s";

		text1.value = "s";

		dispatch(events.KeyPress, text1, { key: keys.BACKSPACE });
		tests.pressBackspace = text1.value === "";

		text2.focus();
		dispatch(events.KeyPress, text1, { key: "p" });
		tests.pressCharsUnfocused = text1.value == "sp";

		text1.focus();
		text1.value = "";
		var h;
		try{
			var e = win.doc.createEvent("TextEvent");
			tests.hasTextEvents = typeof e.initTextEvent != "undefined";
			e.initTextEvent("textInput", true, true, null, "asdf");
			h = on(text1, "input", function(){
				tests.textEventFiresInput = true;
			});
			text1.dispatchEvent(e);
			h.remove();
		}catch(err){}
		tests.textEventSetsValue = text1.value == "asdf";

		h = on(text1, "change", function(){
			tests.pressEnterChange = true;
		});
		text1.focus();
		text1.value = "";

		dispatch(events.KeyPress, text1, { key: 'f' });
		dispatch(events.KeyPress, text1, { key: '\r' });
		h.remove();

		win.doc.documentElement.removeChild(div);
	})();

	if(tests.hasTextEvents){
		var TextInputOptions = declare(eventd.Options, {
			data: ""
		});

		var initTextEvent = function(event, object, options){
			event.initTextEvent(object.type, options.bubbles, options.cancelable, options.view, options.data);
		};
		if(has("ie")){
			initTextEvent = function(event, object, options){
				event.initTextEvent(object.type, options.bubbles, options.cancelable, options.view, options.data, event.DOM_INPUT_METHOD_KEYBOARD, "en-US");
			};
		}
		var TextInput = declare(eventd.Event, {
			type: "textInput",
			optionsConstructor: TextInputOptions,
			create: function(){
				var event = this.node.ownerDocument.createEvent("TextEvent"),
					options = this.options;
				initTextEvent(event, this, options);

				return event;
			}
		});
		events.TextInput = TextInput;
		if(!tests.textEventSetsValue){
			TextInput.extend({
				postDispatch: function(deferred){
					var node = this.node,
						options = this.options;
					deferred.then(function(){
						node.value = (node.value||"") + options.data;
					});
				}
			});
		}
		if(!tests.textEventFiresInput){
			var Input = declare(eventd.Event, {
				type: "input",
				create: function(){
					var event = this.node.ownerDocument.createEvent("Event"),
						options = this.options;

					event.initEvent(this.type, options.bubbles, options.cancelable, options.view);

					return event;
				}
			});
			events.Input = Input;
		}
	}else if(!tests.pressChars){
		events.KeyPress.extend({
			postDispatch: function(deferred){
				var node = this.node,
					options = this.options;
				deferred.then(function(){
					node.value = (node.value||"") + String.fromCharCode(options.charCode || options.keyCode);
				});
			}
		});
	}

	var handleBackspace;
	if(!tests.pressBackspace){
		if(typeof document.getSelection != "undefined"){
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

	var handleArrows = typeof document.getSelection != "undefined" ?
		function(key, node){
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
		} :
		function(key, node){
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
	events.KeyDown.extend({
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
				if(tests.hasTextEvents){
					add([TextInput, { data: character }]);
					if(!tests.textEventFiresInput){
						add([Input]);
					}
				}
				add([events.KeyUp, options]);
			}else if(character == "\r" || character == keys.ENTER){
				options = { key: keys.ENTER };
				add([events.KeyDown, options], [events.KeyPress, options]);
				if(name == "TEXTAREA" && tests.hasTextEvents){
					add([TextInput, { data: "\r\n" }]);
					if(!tests.textEventFiresInput){
						add([Input]);
					}
				}
				if(name == "INPUT" && !tests.pressEnterChange){
					add([eventd.events.Change]);
				}
				add([events.KeyUp, options]);
			}else if(character == " " || character == keys.SPACE){
				options = { key: keys.SPACE };
				add([events.KeyDown, options], [events.KeyPress, options]);
				if((name == "TEXTAREA" || name == "INPUT") && tests.hasTextEvents){
					add([TextInput, { data: " " }]);
					if(!tests.textEventFiresInput){
						add([Input]);
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
				add([events.KeyDown, { key: "Tab" }]);
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

		function next(){
			var nextItem = sequence.shift();
			if(nextItem){
				if(typeof nextItem[1] != "undefined"){
					var options = nextItem[1];
				}

				var d = (new nextItem[0](node, options)).dispatch();
				if(typeof nextItem[2] != "undefined"){
					return d.then.delay(next, nextItem[2]);
				}else{
					return d.then(next);
				}
			}
		}

		return next();
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
		Options: KeyboardOptions,
		tests: tests
	};
});
