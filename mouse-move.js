define([
	'./main',
	'./Deferred',
	'./mouse',
	'compose',
	'dojo/_base/fx'
], function(eventd, Deferred, mouse, Compose, fx){
	var MouseMove = mouse.events.MouseMove = Compose(mouse.Event, {
		type: "mousemove"
	});

	function XYLine(startX, endX, startY, endY){
		var xLine = new fx._Line(startX, endX);
		var yLine = new fx._Line(startY, endY);
		return {
			getValue: function(/* float */ n){
				return {
					x: xLine.getValue(n),
					y: yLine.getValue(n)
				};
			}
		};
	}

	return Compose.call(mouse, {
		mousemove: eventd.wrapDispatcher(MouseMove, mouse.addPosition),
		_current: { x: 0, y: 0 },
		move: (function(){
			function outOver(last, current){
				return mouse.mouseout(last).then(function(){
					return mouse.mouseover(current);
				});
			}
			function move(node, x, y){
				return mouse.mousemove(node, { clientX: x, clientY: y });
			}
			return function(clientX, clientY, duration, trace){
				var current = mouse._current,
					lastNode = eventd.document.elementFromPoint(current.x, current.y),
					d, res = new Deferred(function(){
						a && a.stop();
					});
				var a = new fx.Animation({
					curve: XYLine(mouse._current.x, clientX, mouse._current.y, clientY),
					duration: duration || fx.Animation.prototype.duration,
					onAnimate: function(values){
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
					onEnd: function(){
						d.then(function(){
							res.resolve();
						});
					}
				});
				a.play();

				return res.promise;
			};
		})()
	});
});
