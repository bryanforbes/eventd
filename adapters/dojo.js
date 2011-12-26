define(['./base'], function(base){
	base.adapter = 'dojo';

	// Since Dojo provides these modules, use them directly
	base.map.has   = 'dojo/has';
	base.map.query = 'dojo/query';
	base.map.array = 'dojo/_base/array';
	base.map.ready = 'dojo/domReady';

	return base;
});
