define(['compose', './utils/listen'], function(Compose, on){
    var freeze = Object.freeze || function(){};

    var Promise = Compose(function(){});

    var Deferred = Compose(Promise, function(canceller){
        this.fired = -1;

        var defd = this,
            promise = this.promise = new Promise,
            result, finished, isError, head, nextListener;

        function complete(value){
            if(finished){
                throw new Error("This deferred has already been resolved");                
            }
            result = value;
            finished = true;
            notify();
        }
        function notify(){
            while(nextListener){
                var listener = nextListener,
                    ld = listener.deferred;
                nextListener = nextListener.next;
                var func = (isError ? listener.error : listener.resolved);
                if(func){
                    try{
                        var newResult = func(result);
                        if(newResult && newResult instanceof Promise){
                            newResult.then(ld.resolve, ld.reject);
                            continue;
                        }
                        var unchanged = newResult === undefined;
                        ld[unchanged && isError ? "reject" : "resolve"](unchanged ? result : newResult);
                    }catch(e){
                        ld.reject(e);
                    }
                }else{
                    if(isError){
                        ld.reject(result);
                    }else{
                        ld.resolve(result);
                    }
                }
            }
        }

        function resolve(value){
            // summary:
            //        Fulfills the Deferred instance successfully with the provide value
            isError = false;
            this.fired = 0;
            this.results = [value, null];
            complete(value);
        }

        function reject(error){
            // summary:
            //        Fulfills the Deferred instance as an error with the provided error 
            isError = true;
            this.fired = 1;
            complete(error);
            this.results = [null, error];
            if(!error || error.log !== false){
                if(typeof console != "undefined"){
                    console.error(error);
                }
            }
        }

        function progress(update){
            // summary
            //        Send progress events to all listeners
            var listener = nextListener;
            while(listener){
                var progress = listener.progress;
                progress && progress(update);
                listener = listener.next;    
            }
        }

        function then(resolvedCb, errorCb, progressCb){
            var newDeferred = new Deferred(promise.cancel);
            var listener = {
                resolved: resolvedCb,
                error: errorCb,
                progress: progressCb,
                deferred: newDeferred
            };
            if(nextListener){
                head = head.next = listener;
            }else{
                nextListener = head = listener;
            }
            if(finished){
                notify();
            }
            return newDeferred.promise;
        }

		function delay(del){
			del = typeof del != "undefined" ? del : 300; 
			return then(function(value){
				var promise = Deferred.setTimeout(function(){
					return value;
				}, del);

				return promise;
			});
		}

        function cancel(){
            // summary:
            //        Cancels the asynchronous operation
            if(!finished){
                var error = canceller && canceller(defd);
                if(!finished){
                    if (!(error instanceof Error)) {
                        error = new Error(error);
                    }
                    error.log = false;
                    defd.reject(error);
                }
            }
        }

        this.resolve = resolve;
        this.reject = reject;
        this.progress = progress;
        this.cancel = promise.cancel = cancel;
        this.then = promise.then = then;
		this.delay = promise.delay = delay;

        freeze(promise);
    });

    Deferred.Promise = Promise;

	Deferred.on = function(node, type, async){
		var timeout,
			cancelled = 0,
			d = new Deferred(function(){
				if(async && timeout && !cancelled){
					cancelled = 1;
					clearTimeout(timeout);
					timeout = null;
				}
			});

		on.once(node, type,
			async ?
			function(evt){
				timeout = setTimeout(function(){
					if(cancelled){ return; }
					d.resolve(evt);
				},2);
			} : function(evt){
				d.resolve(evt);
			}
		);

		return d.promise;
	};

	Deferred.setTimeout = function(callback, delay){
		if(typeof callback == "number"){
			delay = callback;
			callback = undefined;
		}

		var cancelled = 0,
			timeout,
			d = new Deferred(function(){
				if(timeout && !cancelled){
					cancelled = 1;
					clearTimeout(timeout);
					timeout = null;
				}
			});

		timeout = setTimeout(function(){
			if(cancelled){ return; }
			d.resolve();
		}, delay);

		if(callback){
			return d.then(callback);
		}
		return d.promise;
	};

	Deferred.when = function when(promiseOrValue, callback, errback, progressHandler){
		if(promiseOrValue && typeof promiseOrValue.then === "function"){
			return promiseOrValue.then(callback, errback, progressHandler);
		}
		return callback(promiseOrValue);
	};

    return Deferred;
});
