define(["exports"], function(exports){
	exports.docScroll = function(){
		return document.getScroll();
	};
	exports.position = function(node){
		var element = new Element(node),
			size = element.getSize(),
			position = element.getPosition();
		return {
			x: position.x,
			y: position.y,
			w: size.x,
			h: size.y
		};
	};
	exports.byId = function(id){
		return document.id(id);
	};
});
