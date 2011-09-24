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

	var XYLine = Compose(function(startX, endX, startY, endY){
		this.xLine = new fx._Line(startX, endX);
		this.yLine = new fx._Line(startY, endY);
	},{
		getValue: function(/* float */ n){
			return {
				x: this.xLine.getValue(n),
				y: this.yLine.getValue(n)
			};
		}
	});

	Compose.call(mouse, {
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
					curve: new XYLine(mouse._current.x, clientX, mouse._current.y, clientY),
					duration: duration || fx.Animation.prototype.duration,
					onAnimate: function(values){
						var node = eventd.document.elementFromPoint(values.x, values.y);
						if(lastNode){
							if(lastNode !== node){
								if(d){
									d = d.then(function(){
										return outOver(lastNode, node);
									});
								}else{
									d = outOver(lastNode);
								}
								lastNode = node;
							}
						}else{
							lastNode = node;
						}

						if(d){
							d.then(function(){
								move(lastNode, values.x, values.y);
							});
						}else{
							d = move(lastNode, values.x, values.y);
						}

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

	return mouse;
});
