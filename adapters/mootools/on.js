define([], function(){
	function on(target, type, listener){
		if(type.indexOf(',') > -1){
			var types = type.split(/\s*,\s*/),
				events = {};

			types.each(function(type){
				var l = listener;
				if(type.indexOf(":") > -1){
					type = type.split(":");
					type.reverse();
					type = type.join(":");
					l = function(event, clicked){
						return listener.call(clicked, event.event);
					};
				}

				events[type] = function(event){
					return listener.call(this, event.event);
				};
			});

			target.addEvents(events);

			return {
				remove: function(){
					target.removeEvents(events);
				}
			};
		}
		var l = function(event){
			return listener.call(this, event.event);
		};
		if(type.indexOf(":") > -1){
			type = type.split(":");
			type.reverse();
			type = type.join(":");
			l = function(event, clicked){
				return listener.call(clicked, event.event);
			};
		}
		target.addEvent(type, l);

		return {
			remove: function(){
				target.removeEvent(type, l);
			}
		};
	}

	on.once = function(target, type, listener){
		var signal = on(target, type, function(){
			// remove this listener
			signal.remove();
			// proceed to call the listener
			return listener.apply(this, arguments);
		});
		return signal;
	};

	return on;
});
