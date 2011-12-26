define(['./base', 'dojo/_base/lang'], function(base, lang){
	base.adapter = 'dojo';

	// Since Dojo provides these modules, use them directly
	lang.mixin(base.map, {
		has:    'dojo/has',
		query:  'dojo/query',
		array:  'dojo/_base/array',
		ready:  'dojo/domReady',
		aspect: 'dojo/aspect'
	});

	return base;
});
