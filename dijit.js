define(["./main"], function(eventd){
	// Modify `getNode` to be able to pass a Dijit into eventd functions
	var getNode = eventd.getNode;
	eventd.getNode = function(node){
		if(typeof node != "string"){
			return node.focusNode || node.domNode || node;
		}
		return getNode(node);
	};

	return eventd;
});
