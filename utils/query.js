define(["exports", "require"], function(exports, require){
	exports.load = function(id, parentRequire, loaded){
		if(!require.rawConfig.queryModule){
			throw Error("A query module must be specified in your loader's configuration");
		}
		parentRequire([require.rawConfig.queryModule], function(module){
			loaded(module);
		});
	};
});
