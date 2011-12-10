define(["exports"], function(exports){
	exports.forEach = function(array, callback, bind){
		return array.each(callback, bind);
	};
	exports.map = function(array, callback, bind){
		return array.map(callback, bind);
	};
	exports.indexOf = function(array, item, from){
		return array.indexOf(item, from);
	};
});
