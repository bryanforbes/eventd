define(["require"], function(require){
	var adapter = (require.rawConfig || ((typeof curl != "undefined" && curl) || {})).eventdAdapter || "dojo",
		adapters = {};

	return {
		load: function(id, parentRequire, loaded, config){
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
