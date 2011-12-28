define(['../base/has'], function(has){
	var addtest = has.add;

	if(has("host-browser")){
		var n = navigator,
			dua = n.userAgent,
			dav = n.appVersion,
			tv = parseFloat(dav);

		// Common application level tests
		addtest("dom-addeventlistener", !!document.addEventListener);
		addtest("touch", "ontouchstart" in document);
		// I don't know if any of these tests are really correct, just a rough guess
		addtest("device-width", screen.availWidth || innerWidth);
		addtest("agent-ios", Browser.Platform.ios);
		addtest("agent-android", Browser.Platform.android);

		addtest("air", Browser.Features.air);
		addtest("khtml", ~dav.indexOf("Konqueror") ? tv : 0);
		addtest("webkit", parseFloat(dua.split("WebKit/")[1]) || undefined);
		addtest("chrome", Browser.chrome && Browser.version);
		addtest("mac", Browser.Platform.mac);
		addtest("ios", Browser.Platform.ios);
		addtest("android", parseFloat(dua.split("Android ")[1]) || undefined);
		addtest("wii", typeof opera != "undefined" && opera.wiiremote);

		// safari detection derived from:
		//		http://developer.apple.com/internet/safari/faq.html#anchor2
		//		http://developer.apple.com/internet/safari/uamatrix.html
		var index = Math.max(dav.indexOf("WebKit"), dav.indexOf("Safari"), 0);
		addtest("safari", function(){
			var isSafari;
			if(index && !has("chrome")){
				// try to grab the explicit Safari version first. If we don't get
				// one, look for less than 419.3 as the indication that we're on something
				// "Safari 2-ish".
				isSafari = parseFloat(dav.split("Version/")[1]);
				if(!isSafari || parseFloat(dav.substr(index + 7)) <= 419.3){
					isSafari = 2;
				}
			}
			return isSafari;
		});

		if(!has("webkit")){
			addtest("opera", function(){
				var isOpera;
				if(~dua.indexOf("Opera")){
					isOpera = tv;
					// see http://dev.opera.com/articles/view/opera-ua-string-changes and http://www.useragentstring.com/pages/Opera/
					// 9.8 has both styles; <9.8, 9.9 only old style
					if(isOpera >= 9.8){
						isOpera = parseFloat(dua.split("Version/")[1]) || tv;
					}
				}
				return isOpera;
			});

			addtest("mozilla", function(){
				var isMozilla;
				if(~dua.indexOf("Gecko") && !has("khtml") && !has("webkit")){
					isMozilla = tv;
				}
				return isMozilla;
			});

			addtest("ie", function(){
				var isIE;
				if(document.all && !has("opera")){
					isIE = parseFloat(dav.split("MSIE ")[1]) || undefined;
					//In cases where the page has an HTTP header or META tag with
					//X-UA-Compatible, then it is in emulation mode.
					//Make sure isIE reflects the desired version.
					//document.documentMode of 5 means quirks mode.
					//Only switch the value if documentMode's major version
					//is different from isIE's major version.
					var mode = document.documentMode;
					if(mode && mode != 5 && Math.floor(isIE) != mode){
						isIE = mode;
					}
				}
				return isIE;
			});

			//We really need to get away from this. Consider a sane isGecko approach for the future.
			addtest("ff", has("mozilla") && parseFloat(dua.split("Firefox/")[1] || dua.split("Minefield/")[1]) || undefined);
		}

		addtest("quirks", document.compatMode == "BackCompat");
	}

	return has;
});
