define([], function(){
	return function(target, type, listener, capture){
		target.addEventListener(type, listener, capture||false);

		return {
			remove: function(){
				target.removeEventListener(type, listener, capture||false);
			}
		};
	};
});
