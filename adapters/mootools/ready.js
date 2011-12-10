define([], function(){
	var ready = 0,
		readyQ = [];

	window.addEvent('domready', function(){
		ready = 1;
		while(readyQ.length){
			(readyQ.shift())();
		}
	});

	function domReady(callback){
		if(ready){
			callback(1);
		}else{
			readyQ.push(callback);
		}
	}

	domReady.load = function(id, req, load){
		domReady(load);
	};

	return domReady;
});
