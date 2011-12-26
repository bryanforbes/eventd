define([
	'./listen',
	'eventd-adapter!query',
	'eventd-adapter!has'
], function(listen, query, has){
	var captures = {};
	if(has('dom-addeventlistener')){
		captures = {
			focusin: "focus",
			focusout: "blur",
			focus: "focus",
			blur: "blur"
		};
	}
	function delegate(node, type, selector, listener){
		var capture = type in captures;

		return listen(node, type, function(event){
			var target = event.target;

			while(!query.matches(target, selector, node)){
				if(target == node || !(target = target.parentNode)){
					return null;
				}
			}

			return listener.call(target, event);
		}, capture);
	}

	return delegate;
});
