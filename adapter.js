define(["require"], function(require){
	var adapter, adapters, undef;
	
	adapters = {};

	return {
		load: function(id, parentRequire, loaded, config){
			if (adapter == undef) {
				adapter = (require.rawConfig || config).eventAdapter || "dojo";
			}
			if(adapters[id]){
				loaded(adapters[id]);
			}else{
				require(["eventd/adapters/" + adapter + "/" + id], function(module){
					loaded(adapters[id] = module);
				});
			}
		}
	};
});
