define([], function(){
	function query(selector, root){
		var results = Slick.search(root || document, selector);
		results.forEach = results.each;

		return results;
	}

	query.matches = Slick.match;
	query.filter = Slick.filter;

	return query;
});
