(function (global, undefined) {
    'use strict';

    var factory = function (window) {
        if (typeof window.document !== 'object') {
            throw new Error('Cookies.js requires a `window` with a `document` object');
        }

        var Cookies = function (key, value, options) {
            return arguments.length === 1 ?
                Cookies.get(key) : Cookies.set(key, value, options);
        };

        // Allows for setter injection in unit tests
        Cookies._document = window.document;

        // Used to ensure cookie keys do not collide with
        // built-in `Object` properties
        Cookies._cacheKeyPrefix = 'cookey.'; // Hurr hurr, :)
        
        Cookies._maxExpireDate = new Date('Fri, 31 Dec 9999 23:59:59 UTC');

        Cookies.defaults = {
            path: '/',
            secure: false
        };

        Cookies.get = function (key) {
            if (Cookies._cachedDocumentCookie !== Cookies._document.cookie) {
                Cookies._renewCache();
            }
            
            var value = Cookies._cache[Cookies._cacheKeyPrefix + key];

            return value === undefined ? undefined : decodeURIComponent(value);
        };

        Cookies.set = function (key, value, options) {
            options = Cookies._getExtendedOptions(options);
            options.expires = Cookies._getExpiresDate(value === undefined ? -1 : options.expires);

            Cookies._document.cookie = Cookies._generateCookieString(key, value, options);

            return Cookies;
        };

        Cookies.expire = function (key, options) {
            return Cookies.set(key, undefined, options);
        };

        Cookies._getExtendedOptions = function (options) {
            return {
                path: options && options.path || Cookies.defaults.path,
                domain: options && options.domain || Cookies.defaults.domain,
                expires: options && options.expires || Cookies.defaults.expires,
                secure: options && options.secure !== undefined ?  options.secure : Cookies.defaults.secure
            };
        };

        Cookies._isValidDate = function (date) {
            return Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date.getTime());
        };

        Cookies._getExpiresDate = function (expires, now) {
            now = now || new Date();

            if (typeof expires === 'number') {
                expires = expires === Infinity ?
                    Cookies._maxExpireDate : new Date(now.getTime() + expires * 1000);
            } else if (typeof expires === 'string') {
                expires = new Date(expires);
            }

            if (expires && !Cookies._isValidDate(expires)) {
                throw new Error('`expires` parameter cannot be converted to a valid Date instance');
            }

            return expires;
        };

        Cookies._generateCookieString = function (key, value, options) {
            key = key.replace(/[^#$&+\^`|]/g, encodeURIComponent);
            key = key.replace(/\(/g, '%28').replace(/\)/g, '%29');
            value = (value + '').replace(/[^!#$&-+\--:<-\[\]-~]/g, encodeURIComponent);
            options = options || {};

            var cookieString = key + '=' + value;
            cookieString += options.path ? ';path=' + options.path : '';
            cookieString += options.domain ? ';domain=' + options.domain : '';
            cookieString += options.expires ? ';expires=' + options.expires.toUTCString() : '';
            cookieString += options.secure ? ';secure' : '';

            return cookieString;
        };

        Cookies._getCacheFromString = function (documentCookie) {
            var cookieCache = {};
            var cookiesArray = documentCookie ? documentCookie.split('; ') : [];

            for (var i = 0; i < cookiesArray.length; i++) {
                var cookieKvp = Cookies._getKeyValuePairFromCookieString(cookiesArray[i]);

                if (cookieCache[Cookies._cacheKeyPrefix + cookieKvp.key] === undefined) {
                    cookieCache[Cookies._cacheKeyPrefix + cookieKvp.key] = cookieKvp.value;
                }
            }

            return cookieCache;
        };

        Cookies._getKeyValuePairFromCookieString = function (cookieString) {
            // "=" is a valid character in a cookie value according to RFC6265, so cannot `split('=')`
            var separatorIndex = cookieString.indexOf('=');

            // IE omits the "=" when the cookie value is an empty string
            separatorIndex = separatorIndex < 0 ? cookieString.length : separatorIndex;

            var key = cookieString.substr(0, separatorIndex);
            var decodedKey;
            try {
                decodedKey = decodeURIComponent(key);
            } catch (e) {
                if (console && typeof console.error === 'function') {
                    console.error('Could not decode cookie with key "' + key + '"', e);
                }
            }
            
            return {
                key: decodedKey,
                value: cookieString.substr(separatorIndex + 1) // Defer decoding value until accessed
            };
        };

        Cookies._renewCache = function () {
            Cookies._cache = Cookies._getCacheFromString(Cookies._document.cookie);
            Cookies._cachedDocumentCookie = Cookies._document.cookie;
        };

        Cookies._areEnabled = function () {
            var testKey = 'cookies.js';
            var areEnabled = Cookies.set(testKey, 1).get(testKey) === '1';
            Cookies.expire(testKey);
            return areEnabled;
        };

        Cookies.enabled = Cookies._areEnabled();

        return Cookies;
    };
    var cookiesExport = (global && typeof global.document === 'object') ? factory(global) : factory;

    // AMD support
    if (typeof define === 'function' && define.amd) {
        define(function () { return cookiesExport; });
    // CommonJS/Node.js support
    } else if (typeof exports === 'object') {
        // Support Node.js specific `module.exports` (which can be a function)
        if (typeof module === 'object' && typeof module.exports === 'object') {
            exports = module.exports = cookiesExport;
        }
        // But always support CommonJS module 1.1.1 spec (`exports` cannot be a function)
        exports.Cookies = cookiesExport;
    } else {
        global.Cookies = cookiesExport;
    }
})(typeof window === 'undefined' ? this : window);

(function(win) {
	
	var version = '1.0';
	
	var ofs = 'offset', cl = 'client';
	var noop = function(){};
	var _requestDomain = "//vli-platform.github.io/adb-analytics/cfg.json";
	var _statsDomain = "//stats.vlitag.com/abd";
	var _cookieName = '__vliadb';
	var objName = 'adbDetector';
	var testedOnce = false;
	var testExecuting = false;
	
	var isOldIEevents = (win.addEventListener === undefined);
	
	win['adblockDetector'] = win['adblockDetector'] || {};

	/**
	* Options set with default options initialized
	*
	*/	
	var _options = {
		id: null,
		loopDelay: 50,
		maxLoop: 5,
		debug: true,
		found: noop, 					// function to fire when adblock detected
		notfound: noop, 				// function to fire if adblock not detected after testing
		complete: noop,  				// function to fire after testing completes, passing result as parameter
		cookieExpire: 1440
	}
	
	function parseAsJson(data){
		var result, fnData;
		try{
			result = JSON.parse(data);
		}
		catch(ex){
			try{
				fnData = new Function("return " + data);
				result = fnData();
			}
			catch(ex){
				log('Failed secondary JSON parse', true);
			}			
		}
		
		return result;
	}
	
	/**
	* Ajax helper object to download external scripts.
	* Initialize object with an options object
	* Ex:
	  {
		  url : 'http://example.org/url_to_download',
		  method: 'POST|GET',
		  success: callback_function,
		  fail:  callback_function
	  }		
	*/
	var AjaxHelper = function(opts){
		var xhr = new XMLHttpRequest();
		
		this.success = opts.success || noop;
		this.fail = opts.fail || noop;
		var me = this;
		
		var method = opts.method || 'get';
		
		/**
		* Abort the request
		*/
		this.abort = function(){
			try{
				xhr.abort();
			}
			catch(ex){
			}
		}
		
		function stateChange(vals){
			if(xhr.readyState == 4){
				if(xhr.status == 200){
					me.success(xhr.response);
				}
				else{
					// failed
					me.fail(xhr.status);
				}				
			}
		}
		
		xhr.onreadystatechange = stateChange;
		
		function start(){
			xhr.open(method, opts.url, true);
			xhr.send();
		}
		
		start();
	}
	
	/**
	* Object tracking the various block lists
	*/
	var BlockListTracker = function(){
		var me = this;
		var externalBlocklistData = {};
		
		/**
		* Add a new external URL to track
		*/
		this.addUrl = function(url){
			externalBlocklistData[url] = {
				url: url,
				state: 'pending',
				format: null,
				data: null,
				result: null
			}
			
			return externalBlocklistData[url];
		}
		
		/**
		* Loads a block list definition
		*/
		this.setResult = function(urlKey, state, data){
			var obj = externalBlocklistData[urlKey];
			if(obj == null){
				obj = this.addUrl(urlKey);
			}
			
			obj.state = state;
			if(data == null){
				obj.result = null;
				return;
			}
			
			if(typeof data === 'string'){
				try{
					data = parseAsJson(data);
					obj.format = 'json';
				}
				catch(ex){
					obj.format = 'easylist';
					// parseEasyList(data);
				}
			}
			obj.data = data;
			
			return obj;
		}
		
	}
	
	var listeners = []; // event response listeners
	var baitNode = null;
	var quickBait = {
		cssClass: 'pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads text-ad-links ad-area ads_container adtag'	
	};
	var baitTriggers = {
		nullProps: [ofs + 'Parent'],
		zeroProps: []
	};
	
	baitTriggers.zeroProps = [
		ofs +'Height', ofs +'Left', ofs +'Top', ofs +'Width', ofs +'Height',
		cl + 'Height', cl + 'Width'
	];
	
	// result object
	var exeResult = {
		quick: null,
		remote: null
	};
	
	var findResult = null; // result of test for ad blocker
	
	var timerIds = {
		test: 0,
		download: 0
	};
	
	function isFunc(fn){
		return typeof(fn) == 'function';
	}
	
	/**
	* Make a DOM element
	*/
	function makeEl(tag, attributes){
		var k, v, el, attr = attributes;
		var d = document;
		
		el = d.createElement(tag);
		
		if(attr){
			for(k in attr){
				if(attr.hasOwnProperty(k)){
					el.setAttribute(k, attr[k]);
				}
			}
		}
		
		return el;
	}
	
	function attachEventListener(dom, eventName, handler){
		if(isOldIEevents){
			dom.attachEvent('on' + eventName, handler);
		}
		else{
			dom.addEventListener(eventName, handler, false);
		}
	}
	
	function log(message, isError){
		if(!_options.debug && !isError){
			return;
		}
		if(win.console && win.console.log){
			if(isError){
				console.error('[ABD] ' + message);
			}
			else{
				console.log('[ABD] ' + message);
			}
		}
	}
	function getDomainRequest() {
		var numberCall = 0;
		var requestEPDomain = () => {
			numberCall++;
			if (numberCall >= 5) {
				return _statsDomain;
			}
			let currencyURL = _requestDomain;
			const xhr = new XMLHttpRequest();
			xhr.onreadystatechange = () => {
				if (xhr.readyState === 4) {
					if (xhr.status === 200) {
						const response = JSON.parse(xhr.response);
						if (response && response.pixelHost) {
							_statsDomain = response.pixelHost;
						} else {
							requestEPDomain();
						}
					} else {
						requestEPDomain();
					}
				}
			};
			xhr.open("GET", currencyURL, true);
			xhr.timeout = 2000;
			xhr.ontimeout = () => {
				requestEPDomain();
			};
			xhr.send();
		}
		requestEPDomain();
	}
	
	var ajaxDownloads = [];
	
	/**
	* Load and execute the URL inside a closure function
	*/
	function loadExecuteUrl(url){
		var ajax, result;
		
		blockLists.addUrl(url);
		// setup call for remote list
		ajax = new AjaxHelper(
			{ 
				url: url,
				success: function(data){
					log('downloaded file ' + url); // todo - parse and store until use
					result = blockLists.setResult(url, 'success', data);
					try{
						var intervalId = 0,
							retryCount = 0;
						
						var tryExecuteTest = function(listData){
							if(!testExecuting){
								beginTest(listData, true);
								return true;
							}
							return false;			
						}
						
						if(findResult == true){
							return;
						}
						
						if(tryExecuteTest(result.data)){
							return;
						}
						else{							
							log('Pause before test execution');
							intervalId = setInterval(function(){
								if(tryExecuteTest(result.data) || retryCount++ > 5){
									clearInterval(intervalId);
								}
							}, 250);
						}
					}
					catch(ex){
						log(ex.message + ' url: ' + url, true);
					}
				},
				fail: function(status){
					log(status, true);
					blockLists.setResult(url, 'error', null);
				}
			});
			
		ajaxDownloads.push(ajax);
	}
	
	
	/**
	* Fetch the external lists and initiate the tests
	*/
	function fetchRemoteLists(){
		var i, url;
		var opts = _options;
		
		for(i=0;i<opts.blockLists.length;i++){
			url = opts.blockLists[i];
			loadExecuteUrl(url);			
		}
	}
	
	function cancelRemoteDownloads(){
		var i, aj;
		
		for(i=ajaxDownloads.length-1;i >= 0;i--){
			aj = ajaxDownloads.pop();
			aj.abort();
		}		
	}
	
	
	// =============================================================================
	/**
	* Begin execution of the test
	*/
	function beginTest(bait){
		log('start beginTest');
		if(findResult == true){
			return; // we found it. don't continue executing
		}
		testExecuting = true;
		castBait(bait);
		
		exeResult.quick = 'testing';
		
		timerIds.test = setTimeout(
			function(){ reelIn(bait, 1); },
			5);
	}
	
	/**
	* Create the bait node to see how the browser page reacts
	*/
	function castBait(bait){
		var i, d = document, b = d.body;
		var t;
		var baitStyle = 'width: 1px !important; height: 1px !important; position: absolute !important; left: -10000px !important; top: -1000px !important;'
		
		if(bait == null || typeof(bait) == 'string'){
			log('invalid bait being cast');
			return;
		}
		
		if(bait.style != null){
			baitStyle += bait.style;
		}
		
		baitNode = makeEl('div', {
			'class': bait.cssClass,
			'style': baitStyle
		});
		
		log('adding bait node to DOM');

		b.appendChild(baitNode);
		
		// touch these properties
		for(i=0;i<baitTriggers.nullProps.length;i++){
			t = baitNode[baitTriggers.nullProps[i]];
		}
		for(i=0;i<baitTriggers.zeroProps.length;i++){
			t = baitNode[baitTriggers.zeroProps[i]];
		}
	}
	
	/**
	* Run tests to see if browser has taken the bait and blocked the bait element
	*/
	function reelIn(bait, attemptNum){
		var i, k, v;
		var body = document.body;
		var found = false;
		
		if(baitNode == null){
			log('recast bait');
			castBait(bait || quickBait);
		}

		if(typeof(bait) == 'string'){
			log('invalid bait used', true);
			if(clearBaitNode()){
				setTimeout(function(){
					testExecuting = false;
				}, 5);
			}

			return;
		}

		if(timerIds.test > 0){
			clearTimeout(timerIds.test);
			timerIds.test = 0;
		}
		
		// test for issues

		if(body.getAttribute('abp') !== null){
			log('found adblock body attribute');
			found = true;
		}

		for(i=0;i<baitTriggers.nullProps.length;i++){
			if(baitNode[baitTriggers.nullProps[i]] == null){
				if(attemptNum>4)
				found = true;
				log('found adblock null attr: ' + baitTriggers.nullProps[i]);
				break;
			}
			if(found == true){
				break;
			}
		}
		
		for(i=0;i<baitTriggers.zeroProps.length;i++){
			if(found == true){
				break;
			}
			if(baitNode[baitTriggers.zeroProps[i]] == 0){
				if(attemptNum>4)
				found = true;
				log('found adblock zero attr: ' + baitTriggers.zeroProps[i]);
			}
		}

		if(window.getComputedStyle !== undefined) {
			var baitTemp = window.getComputedStyle(baitNode, null);
			if(baitTemp.getPropertyValue('display') == 'none'
			|| baitTemp.getPropertyValue('visibility') == 'hidden') {
				if(attemptNum>4)
				found = true;
				log('found adblock computedStyle indicator');
			}
		}

		testedOnce = true;
		
		if(found || attemptNum++ >= _options.maxLoop){
			findResult = found;
			log('exiting test loop - value: ' + findResult);
			notifyListeners();
			if(clearBaitNode()){
				setTimeout(function(){
					testExecuting = false;
				}, 5);
			}
		}
		else{
			timerIds.test = setTimeout(function(){
				reelIn(bait, attemptNum);
			}, _options.loopDelay);
		}
	}
	
	function clearBaitNode(){
		if(baitNode === null){
			return true;
		}
		
		try{
			if(isFunc(baitNode.remove)){
				baitNode.remove();
			}
			document.body.removeChild(baitNode);
		}
		catch(ex){
		}
		baitNode = null;
		
		return true;		
	}
	
	/**
	* Halt the test and any pending timeouts
	*/
	function stopFishing(){
		if(timerIds.test > 0){
			clearTimeout(timerIds.test);
		}
		if(timerIds.download > 0){
			clearTimeout(timerIds.download);
		}
		
		cancelRemoteDownloads();
		
		clearBaitNode();
	}
	
	/**
	* Fire all registered listeners
	*/
	function notifyListeners(){
		var i, funcs;
		if(findResult === null){
			return;
		}
		for(i=0;i<listeners.length;i++){
			funcs = listeners[i];
			try{			
				if(funcs != null){
					if(isFunc(funcs['complete'])){
						funcs['complete'](findResult);
					}
					
					if(findResult && isFunc(funcs['found'])){
						funcs['found']();
					}
					else if(findResult === false && isFunc(funcs['notfound'])){
						funcs['notfound']();
					}
				}
			}
			catch(ex){
				log('Failure in notify listeners ' + ex.Message, true);
			}
		}
	}
	
	/**
	* Attaches event listener or fires if events have already passed.
	*/
	function attachOrFire(){
		var fireNow = false;
		var fn;
		
		if(document.readyState){
			if(document.readyState == 'complete'){
				fireNow = true;
			}
		}
		
		fn = function(){
			beginTest(quickBait, false);
		}
		
		if(fireNow){
			fn();
		}
		else{
			attachEventListener(win, 'load', fn);
		}
    }
    
    function stats(type){
        if(type != 'found' && type != 'notfound'){
            return;
		}
		if(!_options.id){
			return;
		}

        var img = document.createElement('img');
        img.src = _statsDomain+'/?id=' + _options.id + '&detect=' + type;
        img.width = 0;
        img.height = 0;
        img.style = 'display:none';
        document.body.appendChild(img);
	}
	
	function mapConfig(defaultConfig, options){
		for(k in options){
			if(defaultConfig.hasOwnProperty(k)){
				defaultConfig[k] = options[k];
			}
		}
		return defaultConfig;
	}

	function alert(options){
		if(_options.cookieExpire > 0 && Cookies.get(_cookieName) !== undefined){
			return;
		}
		
		var config = {
			hiddenCloseButton : true,
			clickBackgroundToClose: false
		};

		mapConfig(config, options);
		var modal = document.getElementById('__vliadb83');
		var modal_bg = document.getElementById('__vliadb83-bg');
		var modal_close = document.getElementById('__vliadb83-cls');
		if(!modal){
			return;
		}
		
		modal.style.display = "block";
		if(modal_bg){
			modal_bg.style.display = "block";
		}

		if(_options.cookieExpire > 0){
			Cookies.set(_cookieName, '1', { expires: _options.cookieExpire * 60 });
		}

		var hiddenModal = function(){
			modal.style.display = "none";
			if(modal_bg){
				modal_bg.style.display = "none";
			}
		}

		if(modal_close){
			modal_close.addEventListener("click", hiddenModal);
			if(config.hiddenCloseButton == true){
				modal_close.style.display = "none";
			}
		}

		if(config.clickBackgroundToClose == true && modal_bg){
			modal_bg.addEventListener("click", hiddenModal);
		}
	}

	function initCmd(){
		win['adblockDetector'].push = function(a) {
			Array.prototype.push.apply(this, arguments);
			executeCmd(win['adblockDetector']);
		};
		executeCmd(win['adblockDetector']);
	}

	function executeCmd(abdObj){
		for (var k = 0; k < abdObj.length; k++) abdObj[k]();
		abdObj.length = 0;
	}
	
	var blockLists; // tracks external block lists
	
	/**
	* Public interface of adblock detector
	*/
	var impl = {
		/**
		* Version of the adblock detector package
		*/
		version: version,
        
		/**
		* Initialization function. See comments at top for options object
		*/
		init: function(options){
			var k, v, funcs;
			
			if(!options){
				return;
			}
			
			funcs = {
				complete: noop,
				found: noop,
				notfound: function(){
					stats('notfound');
				}
			};
			
			for(k in options){
				if(options.hasOwnProperty(k)){
					if(k == 'complete' || k == 'found'){
						funcs[k.toLowerCase()] = function(){
							options[k]();
							stats(k.toLowerCase());
						};
					}
					else{
						_options[k] = options[k];
					}					
				}
			}

			if(!_options.id){
				return;
			}

			listeners.push(funcs);
			blockLists = new BlockListTracker();
			attachOrFire();
		},
		
		alert: alert,
	}
	getDomainRequest();
	
	win[objName] = impl;
	initCmd();

})(window)	