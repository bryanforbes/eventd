define(["../has"], 
		function(has){	
"use strict";
// summary:
//		A small lightweight query selector engine
var testDiv = document.createElement("div");
var matchesSelector = testDiv.matchesSelector || testDiv.webkitMatchesSelector || testDiv.mozMatchesSelector || testDiv.msMatchesSelector || testDiv.oMatchesSelector; // IE9, WebKit, Firefox have this, but not Opera yet
var querySelectorAll = testDiv.querySelectorAll;
has.add({
	"dom-matches-selector": !!matchesSelector,
	"dom-qsa": !!querySelectorAll 
});

// this is a simple query engine. It has handles basic selectors, and for simple
// common selectors is extremely fast
var liteEngine = function(selector, root){
	if(combine && selector.indexOf(',') > -1){
		return combine(selector, root);
	}
	var match = (querySelectorAll ? 
		/^#([\w\-]+$)|^(\.)([\w\-\*]+$)|^(\w+$)/ : // this one only matches on simple queries where we can beat qSA with specific methods
		/^#([\w\-]+)(?:\s+(.*))?$|(?:^|(.+\s+))([\w\-\*]+)(\S*$)/) // this one matches parts of the query that we can use to speed up manual filtering
			.exec(selector);
	root = root || document;
	if(match){
		// fast path regardless of whether or not querySelectorAll exists
		if(match[1] && root == document){
			// an #id
			root = root.getElementById(match[1]);
			return root && root.parentNode ? 
				match[2] ?
					liteEngine(match[2], root) 
					: [root] 
						: [];
		}
		if(match[2] && root.getElementsByClassName){
			// a .class
			return root.getElementsByClassName(match[3]);
		}
		var found;
		if(match[4]){
			// a tag
			found = root.getElementsByTagName(match[4]);
			if(match[3] || match[5]){
				selector = (match[3] || "") + match[5];
			}else{
				// that was the entirety of the query, return results
				return found;
			}
		}
	}
	if(querySelectorAll){
		// qSA works strangely on Element-rooted queries
		// We can work around this by specifying an extra ID on the root
		// and working up from there (Thanks to Andrew Dupont for the technique)
		// IE 8 doesn't work on object elements
		if (root.nodeType === 1 && root.nodeName.toLowerCase() !== "object"){				
			return useRoot(root, selector, root.querySelectorAll);
		}else{
			// we can use the native qSA
			return root.querySelectorAll(selector);
		}
	}else if(!found){
		// search all children and then filter
		found = root.getElementsByTagName("*");
	}
	// now we filter the nodes that were found using the matchesSelector
	var results = [];
	for(var i = 0, l = found.length; i < l; i++){
		var node = found[i];
		if(jsMatchesSelector(node, selector, root)){
			// keep the nodes that match the selector
			results.push(node);
		}
	}
	return results;
};
var useRoot = function(context, query, method){
	// this function creates a temporary id so we can do rooted qSA queries, this is taken from sizzle
	var oldContext = context,
		old = context.getAttribute( "id" ),
		nid = old || "__dojo__",
		hasParent = context.parentNode,
		relativeHierarchySelector = /^\s*[+~]/.test( query );

	if(relativeHierarchySelector && !hasParent){
		return [];
	}
	if(!old){
		context.setAttribute("id", nid);
	}else{
		nid = nid.replace(/'/g, "\\$&");
	}
	if(relativeHierarchySelector && hasParent){
		context = context.parentNode;
	}

	try {
		return method.call(context, "[id='" + nid + "'] " + query );
	} finally {
		if ( !old ) {
			oldContext.removeAttribute( "id" );
		}
	}
};

if(!has("dom-matches-selector")){
	var jsMatchesSelector = (function(){
		// a JS implementation of CSS selector matching, first we start with the various handlers
		var caseFix = testDiv.tagName == "div" ? "toLowerCase" : "toUpperCase";
		function tag(tagName){
			tagName = tagName[caseFix]();
			return function(node){
				return node.tagName == tagName;
			}
		}
		function className(className){
			var classNameSpaced = ' ' + className + ' ';
			return function(node){
				return node.className.indexOf(className) > -1 && (' ' + node.className + ' ').indexOf(classNameSpaced) > -1;
			}
		}
		function attr(name, value, type){
			value = value.replace(/'|"/g,''); // what are you supposed to do with quotes, do they follow JS rules for escaping?
			return type == "^=" ? function(node){
				var thisValue = node.getAttribute(name);
				return thisValue && thisValue.substring(0, value.length) == value;
			} :
			type == "$=" ? function(node){
				var thisValue = node.getAttribute(name);
				return thisValue && thisValue.substring(thisValue.length - value.length, thisValue.length) == value;
			} :
			type == "=" ? function(node){
				return node.getAttribute(name) == value;
			}:
			!type ? function(node){
				return node.getAttribute(name);
			} : function(){
				throw new Error("Unknown attribute comparison " + type);
			}
		}
		function ancestor(matcher){
			return function(node, root){
				while((node = node.parentNode) != root){
					if(matcher(node, root)){
						return true;
					}
				}
			};
		}
		function parent(matcher){
			return function(node, root){
				node = node.parentNode;
				return matcher ? 
					node != root && matcher(node, root)
					: node == root;
			};
		}
		var cache = {};
		function and(matcher, next){
			return matcher ?
				function(node, root){
					return next(node) && matcher(node, root);
				}
				: next;
		}
		return function(node, selector, root){
			// this returns true or false based on if the node matches the selector (optionally within the given root)
			var matcher = cache[selector]; // check to see if we have created a matcher function for the given selector
			if(!matcher){
				// create a matcher function for the given selector
				// parse the selectors
				if(selector.replace(/(\s*>\s*)|(\s+)|(.)?([\w-]+)|\[([\w-]+)\s*(.?=)?\s*([^\]]*)\]/g, function(t, desc, space, type, value, attrName, attrType, attrValue){
					if(value){
						if(type == "."){
							matcher = and(matcher, className(value));
						}
						else{
							matcher = and(matcher, tag(value));
						}
					}
					else if(space){
						matcher = ancestor(matcher);
					}
					else if(desc){
						matcher = parent(matcher);
					}
					else if(attrName){
						matcher = and(matcher, attr(attrName, attrValue, attrType));
					}
					return "";
				})){
					throw new Error("Syntax error in query");
				}
				if(!matcher){
					return true;
				}
				cache[selector] = matcher;
			}
			// now run the matcher function on the node
			return matcher(node, root);
		};
	})();
}
if(!has("dom-qsa")){
	var combine = function(selector, root){
		// combined queries
		selector = selector.split(/\s*,\s*/);
		var totalResults = [];
		var unique = {};
		// add all results and keep unique ones
		for(var i = 0; i < selector.length; i++){
			var results = defaultEngine(selector[i], root);
			for(var j = 0, l = results.length; j < l; j++){
				var node = results[j];
				var id = node.uniqueID;
				// only add it if unique
				if(!(id in unique)){
					totalResults.push(node);
					unique[id] = true;
				}
			}
		}
		return totalResults;
	};
}

liteEngine.match = matchesSelector ? function(node, selector, root){
	if(root){
		// doesn't support three args, use rooted id trick
		return useRoot(root, selector, function(query){
			return matchesSelector.call(node, query);
		});
	}
	// we have a native matchesSelector, use that
	return matchesSelector.call(node, selector);
} : jsMatchesSelector; // otherwise use the JS matches impl

return liteEngine;
});
