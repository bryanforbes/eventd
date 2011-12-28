define([
	'./main',
	'./Deferred',
	'./mouse',
	'compose/compose',
	'eventd-adapter!has',
	'./utils/timer'
], function(eventd, Deferred, mouse, Compose, has, timer){
	var MouseMove = mouse.events.MouseMove = Compose(mouse.Event, {
		type: "mousemove"
	});

	var fromName = has("event-create-event") ? "relatedTarget" : "fromElement",
		toName = has("event-create-event") ? "relatedTarget" : "toElement";

	function XYLine(startX, endX, startY, endY){
		return function(n){
			n = 0.5 + ((Math.sin((n + 1.5) * Math.PI)) / 2); // perform easing
			return {
				x: ((endX - startX) * n) + startX,
				y: ((endY - startY) * n) + startY
			};
		};
	}

	function outOver(last, current){
		var outOpts = {},
			overOpts = {};

		outOpts[toName] = current;
		overOpts[fromName] = last;
		return mouse.mouseout(last, outOpts).then(function(){
			return mouse.mouseover(current, overOpts);
		});
	}

	function move(node, x, y){
		return mouse.mousemove(node, { clientX: x, clientY: y });
	}

	function mover(line, onCycle, onEnd, duration){
		var percent = 0,
			startTime = -1;

		duration = duration || mouse._defaultDuration;

		var init = function(){
			startTime = +(new Date);
			init = null;
		};
		function cycle(){
			init && init();

			var curr = +(new Date),
				step = (curr - startTime) / duration;

			if(step >= 1){
				step = 1;
			}

			percent = step;

			onCycle(line(step));

			if(percent >= 1){
				onEnd();
				remover();
			}
		}

		var remover = timer(cycle);

		return remover;
	}

	return Compose.call(mouse, {
		mousemove: eventd.wrapDispatcher(MouseMove, mouse.addPosition),
		_current: { x: 0, y: 0 },
		_defaultDuration: 350,
		move: function(clientX, clientY, duration, trace){
			var current = mouse._current,
				lastNode = eventd.document.elementFromPoint(current.x, current.y),
				d, res = new Deferred(function(){
					remover && remover();
					remover = null;
				});

			var remover = mover(
				XYLine(mouse._current.x, clientX, mouse._current.y, clientY),
				function(values){
					var node = eventd.document.elementFromPoint(values.x, values.y);
					if(lastNode){
						if(lastNode !== node){
							d = Deferred.when(d, function(){
								return outOver(lastNode, node);
							});
							lastNode = node;
						}
					}else{
						lastNode = node;
					}

					d = Deferred.when(d, function(){
						return move(lastNode, values.x, values.y);
					});

					if(trace){
						d.then(function(){
							var n = eventd.document.createElement("div");
							n.style.cssText = "width: 2px; height: 2px; background-color: blue; position: absolute; left: " + values.x + "px; top: " + values.y + "px;";
							eventd.body().appendChild(n);
						});
					}
				},
				function(){
					d.then(function(){
						res.resolve();
					});
				},
				duration
			);

			return res.promise;
		}
	});
});
