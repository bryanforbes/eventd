define(["exports", "../main", "./has"], function(exports, eventd, has){
	// most of these function borrowed from Dojo 1.7.0b6
	function isBodyLtr(){
		return (eventd.body().dir || eventd.document.documentElement.dir || "ltr").toLowerCase() == "ltr"; // Boolean
	}

	var fixScrollLeft = function(scrollLeft){ return scrollLeft; };
	if(has("ie")){
		fixScrollLeft = function(/*Integer*/ scrollLeft){
			// In RTL direction, scrollLeft should be a negative value, but IE
			// returns a positive one. All codes using documentElement.scrollLeft
			// must call this function to fix this error, otherwise the position
			// will offset to right when there is a horizontal scrollbar.

			if(!isBodyLtr()){
				var ie = has("ie"),
					qk = has("quirks"),
					de = qk ? eventd.body() : eventd.document.documentElement;
				if(ie == 6 && !qk && eventd.global.frameElement && de.scrollHeight > de.clientHeight){
					scrollLeft += de.clientLeft; // workaround ie6+strict+rtl+iframe+vertical-scrollbar bug where clientWidth is too small by clientLeft pixels
				}
				return (ie < 8 || qk) ? (scrollLeft + de.clientWidth - de.scrollWidth) : -scrollLeft; // Integer
			}
			return scrollLeft; // Integer
		};
	}

	var getDocumentElementOffset = has("ie") < 8 ?
		function(){
			return {
				x: 0,
				y: 0
			};
		} :
		function(){
			var de = eventd.document.documentElement, // only deal with HTML element here, position() handles body/quirks
				r = de.getBoundingClientRect(), // works well for IE6+
				l = r.left, t = r.top;
			if(has("ie") < 7){
				l += de.clientLeft;	// scrollbar size in strict/RTL, or,
				t += de.clientTop;	// HTML border size in strict
			}
			return {
				x: l < 0 ? 0 : l, // FRAME element border size can lead to inaccurate negative values
				y: t < 0 ? 0 : t
			};
		};

    // true for IE < 9
    // http://msdn.microsoft.com/en-us/library/ms536389(VS.85).aspx vs
    // http://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-2141741547
    has.add("dom-create-attr", function(g, d){
        var input,
            supported = false;
        try{
            input = d.createElement("<input type='hidden' name='hasjs'>");
            supported = input.type == "hidden" && input.name == "hasjs";
        }catch(e){}
        return supported;
    });
    has.add("bug-getelementbyid-ids-names", function(g, d){
        var input,
            name = "__test_" + Number(new Date()),
            root = d.getElementsByTagName("head")[0] || d.documentElement,
            buggy = null;

        if(has("dom-create-attr")){
            input = d.createElement("<input name='"+ name +"'>");
        }else{
            input = d.createElement("input");
            input.name = name;
        }
        try{
            root.insertBefore(input, root.firstChild);
            buggy = d.getElementById(name) == input;
            root.removeChild(input);
        }catch(e){}
        return buggy;
    });
    has.add("bug-getelementbyid-ignores-case", function(g, d){
        var buggy,
            id = "__test_" + Number(new Date()),
            script = d.createElement("script"),
            root = d.getElementsByTagName("script")[0].parentNode;

        script.id = id;
        script.type = "text/javascript";
        root.insertBefore(script, root.firstChild);
        buggy = d.getElementById(id.toUpperCase()) == script;
        root.removeChild(script);
        return buggy;
    });

	exports.docScroll = function docScroll(){
		var node = eventd.document.parentWindow || eventd.document.defaultView;   // use UI window, not eventd.global window
		return "pageXOffset" in node ? {x: node.pageXOffset, y: node.pageYOffset } :
			(node = has("quirks") ? eventd.body() : eventd.document.documentElement,
				{x: fixScrollLeft(node.scrollLeft || 0), y: node.scrollTop || 0 });
	};

	var getDiffs;
	if(has("ie")){
		getDiffs = function(){
			var	db = eventd.body(),
				offset = getDocumentElementOffset();

			return {
				x: offset.x + (has("quirks") ? db.clientLeft + db.offsetLeft : 0),
				y: offset.y + (has("quirks") ? db.clientTop + db.offsetTop : 0)
			};
		};
	}else if(has("ff") == 3){
		var px = function(value){
			return parseFloat(value) || 0;
		};
		getDiffs = function(){
			var	db = eventd.body(),
				dh = db.parentNode;

			// In FF3 you have to subtract the document element margins.
			// Fixed in FF3.5 though.
			var cs = dh.ownerDocument.defaultView.getComputedStyle(dh, null);
			return {
				x: px(cs.marginLeft) + px(cs.borderLeftWidth),
				y: px(cs.marginTop) + px(cs.borderTopWidth)
			};
		};
	}
	exports.position = function(/*DomNode*/node, /*Boolean?*/includeScroll){
		node = exports.byId(node);

		var ret = node.getBoundingClientRect();
		ret = {x: ret.left, y: ret.top, w: ret.right - ret.left, h: ret.bottom - ret.top};

		if(getDiffs){
			var diffs = getDiffs();
			ret.x -= diffs.x;
			ret.y -= diffs.y;
		}

		// account for document scrolling
		// if offsetParent is used, ret value already includes scroll position
		// so we may have to actually remove that value if !includeScroll
		if(includeScroll){
			var scroll = exports.docScroll();
			ret.x += scroll.x;
			ret.y += scroll.y;
		}

		return ret; // Object
	};

	exports.byId = has("bug-getelementbyid-ids-names") || has("bug-getelementbyid-ignores-case") ?
		function(id, doc){
			if(typeof id != "string"){
				return id;
			}
			doc = doc || eventd.document;

			var e = doc.getElementById(id);
			if(id && e && (e.attributes.id.value != id && e.id != id)){
				var es = doc.all[id];
				if(!es || es.nodeName){
					es = [es];
				}
				var i = 0;
				while((e = es[i++])){
					if((e.attributes && e.attributes.id && e.attributes.id.value == id) || e.id == id){
						return e;
					}
				}
			}

			return e;
		} :
		function(id, doc){
			return typeof id == "string" ? (doc||eventd.document).getElementById(id) : id;
		};
});
