define([], function(){
	return function(selector, root){
		var results = Slick.search(root || document, selector);
		results.forEach = results.each;

		return results;
	};
});
