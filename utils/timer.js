define(["eventd-adapter!aspect"], function(aspect){
	var count = 0,
		interval = null,
		runner = { cycle: function(){} };

	function timer(callback){
		var handle = aspect.after(runner, "cycle", callback);
		count++;
		if(!interval){
			interval = setInterval(function(){
				runner.cycle();
			}, 20);
		}
		return function(){
			if(handle){
				handle.remove();
				handle = null;
				count--;
			}
			if(count <= 0){
				clearInterval(interval);
				interval = null;
				count = 0;
			}
		};
	}

	return timer;
});
