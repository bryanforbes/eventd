define(['require', 'exports'], function(require, exports){
	exports.adapter = 'base';
	exports.map = {
		aspect: "aop/aop"
	};

	exports.normalize = function(id, toAbsId){
		var idx, end = "";
		if(~(idx = id.indexOf("!"))){
			end = id.slice(idx);
			id = id.substring(0, idx);
		}
		if(id in exports.map){
			return exports.map[id] + end;
		}
		return "eventd/adapters/" + exports.adapter + "/" + id + end;
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
