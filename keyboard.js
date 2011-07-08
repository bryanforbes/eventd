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

	var specials = (function(){
		var specials = [];
		for(var key in dojo.keys){
			specials.push(dojo.keys[key]);
		}
		return specials;
	})();

	var KeyboardOptions = declare(eventd.Options, {
		ctrlKey: 0,
		altKey: 0,
		shiftKey: 0,
		metaKey: 0,
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
					if(key == dojo.keys.ENTER){
						key = '\r';
						keyOptions = defaults.Enter[type];
					}else if(key === dojo.keys.BACKSPACE){
						key = '\b';
						keyOptions = defaults.Backspace[type];
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
							event.keyCode = options.keyCode;
							event.charCode = options.charCode;
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
		dispatch(events.KeyPress, text1, { key: dojo.keys.ENTER });

		dispatch(events.KeyPress, text1, { key: "s" });
		tests.pressChars = text1.value == "s";

		text1.value = "s";

		dispatch(events.KeyPress, text1, { key: dojo.keys.BACKSPACE });
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

	if(!tests.pressBackspace){
		if(typeof document.getSelection != "undefined"){
			events.KeyDown.extend({
				postDispatch: function(deferred){
					if(this.options.key === dojo.keys.BACKSPACE || this.options.key == '\b'){
						var node = this.node;
						deferred.then(function(){
							node.selectionStart = node.selectionEnd - 1;
							document.execCommand("delete");
						});
					}
				}
			});
		}else{
			events.KeyDown.extend({
				postDispatch: function(deferred){
					if(this.options.key === dojo.keys.BACKSPACE || this.options.key == '\b'){
						var node = this.node;
						deferred.then(function(){
							var sel = document.selection.createRange();
							sel.moveStart("character", "-1");
							sel.select();
							document.execCommand("delete");
						});
					}
				}
			});
		}
	}

	var charRE = /^[A-Za-z0-9 !@#$%^&*()_+-={}[\]:;"'`~,.\/<>?]$/;
	function getSequence(node, character){
		var sequence = [],
			name = node.nodeName.toUpperCase();

		if(charRE.test(character)){
			sequence.push([events.KeyDown, { key: character }]);
			sequence.push([events.KeyPress, { key: character }]);
			if(tests.hasTextEvents){
				sequence.push([TextInput, { data: character }]);
				if(!tests.textEventFiresInput){
					sequence.push([Input]);
				}
			}
			sequence.push([events.KeyUp, { key: character }]);
		}else if(character == "\r" || character == dojo.keys.ENTER){
			sequence.push([events.KeyDown, { key: dojo.keys.ENTER }]);
			sequence.push([events.KeyPress, { key: dojo.keys.ENTER }]);
			if(name == "TEXTAREA" && tests.hasTextEvents){
				sequence.push([TextInput, { data: "\r\n" }]);
				if(!tests.textEventFiresInput){
					sequence.push([Input]);
				}
			}
			if(name == "INPUT" && !tests.pressEnterChange){
				sequence.push([eventd.events.Change]);
			}
			sequence.push([events.KeyUp, { key: dojo.keys.ENTER }]);
		}else if(character == "\b"){
			sequence.push([events.KeyDown, { key: dojo.keys.BACKSPACE }]);
			if(typeof defaults.Backspace.keypress != "undefined"){
				sequence.push([events.KeyPress, { key: dojo.keys.BACKSPACE }]);
			}
			sequence.push([events.KeyUp, { key: dojo.keys.BACKSPACE }]);
		}else if(character == "\t"){
			sequence.push([events.KeyDown, { key: "Tab" }]);
		}

		return sequence;
	}

	function generator(sequence, node){
		sequence = sequence.slice(0);
		function next(){
			var nextItem = sequence.shift(),
				options, res;
			if(nextItem){
				if(typeof nextItem[1] != "undefined"){
					options = nextItem[1];
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

	var upperRE = /^[A-Z~!@#$%^&*()_+{}":?><]$/,
		Dispatcher = eventd.Dispatcher;

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
			var sequence = getSequence(node, character);

			return generator(sequence, node);
		}),
		keystrokes: wrapEvent(function(node, characters, delayBetween){
			delayBetween = delayBetween || 50;
			var sequence = [],
				upper = false;
			for(var i=0, character; character=characters.charAt(i); i++){
				if(!upper && upperRE.test(character)){
					sequence.push([events.KeyDown, { key: dojo.keys.SHIFT }]);
					upper = true;
				}else if(upper && !upperRE.test(character)){
					sequence.push([events.KeyUp, { key: dojo.keys.SHIFT }]);
					upper = false;
				}

				// insert a delay between keystrokes
				if(sequence.length > 1 && delayBetween){
					sequence[sequence.length-1][2] = delayBetween;
				}

				sequence = sequence.concat(getSequence(node, character));
			}

			if(upper){
				sequence.push([events.KeyUp, { key: dojo.keys.SHIFT }]);
			}

			return generator(sequence, node);
		}),
		events: events,
		Defaults: KeyboardDefaults,
		Options: KeyboardOptions,
		tests: tests
	};
});
