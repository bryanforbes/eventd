define([
	'eventd/adapter!has!dom-addeventlistener?eventd/utils/listen/w3c:eventd/utils/listen/dom0'
], function(listen){
	listen.once = function(target, type, listener, capture){
		var signal = listen(target, type, function(){
			signal.remove();

			return listener.apply(this, arguments);
		}, capture);

		return signal;
	};

	return listen;
});
