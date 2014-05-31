(function(){
	
	var toString = Object.prototype.toString;
	
	
	function mixin(dest, sources){
		dest = dest || {};
		for(var i = 1, ii = arguments.length; i < ii; i++){
			_mixin(dest, arguments[i]);
		}
		return dest;
	}

	function extend(ctor, props){
		for(var i = 1, ii = arguments.length; i < ii; i++){
			_mixin(ctor.prototype, arguments[i]);
		}
		return ctor;
	}

	function _mixin(dest, source, copyFunc){
		var name, s, i, empty = {};
		for(name in source){
			s = source[name];
			if(!(name in dest) || (dest[name] !== s && (!(name in empty) || empty[name] !== s))){
				dest[name] = copyFunc ? copyFunc(s) : s;
			}
		}
		return dest; 
	}
	
	function hitch(scope, method){
		if(!method){
			method = scope;
			scope = null;
		}
		return !scope ? method : function(){ 
			return method.apply(scope, arguments || []); 
		};
	}
	
	function isString(it) {
		return (typeof it == "string" || it instanceof String);
	}

	function isArray(it) {
		return it && (it instanceof Array || typeof it == "array");
	}

	function isFunction(it){
		return toString.call(it) === "[object Function]";
	}

	function isObject(it){
		return it !== undefined && (it === null || typeof it == "object" || isArray(it) || isFunction(it));
	}
	
		
	var util = {
		mixin: mixin,
		extend: extend,
		hitch: hitch,
		isString: isString,
		isArray: isArray,
		isFunction: isFunction,
		isObject: isObject
	};

	window.jsutil = util;
})();

