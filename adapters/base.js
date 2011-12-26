define(['require', 'exports'], function(require, exports){
	exports.adapter = 'dojo';

	exports.normalize = function(id, toAbsId){
		return "eventd/adapters/" + exports.adapter + "/" + id;
	};

	var adapters = {};
	exports.load = function(id, parentRequire, loaded, config){
		if(adapters[id]){
			loaded(adapters[id]);
		}else{
			require([id], function(module){
				loaded(adapters[id] = module);
			});
		}
	};
});
