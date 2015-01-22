(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/home/meandave/Code/metastaseis/node_modules/audio-fft/index.js":[function(require,module,exports){
/**
 * pulled from @jsantell
 *
 * https://github.com/jsantell/dsp-with-web-audio-presentation/blob/gh-pages/examples/FFT.js
 *
 */

var MAX_UINT8 = 255;

module.exports = FFT;

function FFT (ctx, options) {
  var module = this;
  this.canvas = options.canvas;
  this.onBeat = options.onBeat;
  this.offBeat = options.offBeat;
  this.type = options.type || 'frequency';
  this.spacing = options.spacing || 1;
  this.width = options.width || 1;
  this.count = options.count || 512;
  this.input = this.output = ctx.createAnalyser();
  this.proc = ctx.createScriptProcessor(256, 1, 1);
  this.data = new Uint8Array(this.input.frequencyBinCount);
  this.ctx = this.canvas.getContext('2d');

  this.decay = options.decay || 0.002;
  this.threshold = options.threshold || 0.5;
  this.range = options.range || [0, this.data.length-1];
  this.wait = options.wait || 512;

  this.h = this.canvas.height;
  this.w = this.canvas.width;

  this.input.connect(this.proc);
  this.proc.onaudioprocess = process.bind(null, module);
  this.ctx.lineWidth = module.width;
}

FFT.prototype.connect = function (node) {
  this.output.connect(node);
  this.proc.connect(node);
}

function process (module) {

  var ctx = module.ctx;
  var data = module.data;
  ctx.clearRect(0, 0, module.w, module.h);
  ctx.fillStyle = module.fillStyle || '#000000';
  ctx.strokeStyle = module.strokeStyle || '#000000';

  if (module.type === 'frequency') {
    module.input.getByteFrequencyData(data);
    // Abort if no data coming through, quick hack, needs fixed
    if (module.data[3] < 5) return;

    for (var i= 0, l = data.length; i < l && i < module.count; i++) {
      ctx.fillRect(
        i * (module.spacing + module.width),
        module.h,
        module.width,
        -(module.h / MAX_UINT8) * data[i]
      );
    }
  }
  else if (module.type === 'time') {
    module.input.getByteTimeDomainData(data);
    ctx.beginPath();
    ctx.moveTo(0, module.h / 2);
    for (var i= 0, l = data.length; i < l && i < module.count; i++) {
      ctx.lineTo(
        i * (module.spacing + module.width),
        (module.h / MAX_UINT8) * data[i]
      );
    }
    ctx.stroke();
    ctx.closePath();
  }
}

},{}],"/home/meandave/Code/metastaseis/node_modules/audiocontext/src/audiocontext.js":[function(require,module,exports){
/*
 * Web Audio API AudioContext shim
 */
(function (definition) {
    if (typeof exports === "object") {
        module.exports = definition();
    }
})(function () {
  return window.AudioContext || window.webkitAudioContext;
});

},{}],"/home/meandave/Code/metastaseis/node_modules/audiosource/index.js":[function(require,module,exports){
/*
 * AudioSource
 *
 * * MUST pass an audio context
 *
 */
function AudioSource (context, opts) {
  if (!context) {
    throw new Error('You must pass an audio context to use this module');
  }
  if (opts === undefined) opts = {};

  this.context = context;
  this.buffer = undefined;
  this.url = opts.url ? opts.url : undefined;
  this.ffts = opts.ffts ? opts.ffts : [];
  this.gainNode = opts.gainNode ? opts.gainNode : undefined;
}

AudioSource.prototype = {
  needBuffer: function() {
    return this.buffer === undefined;
  },
  loadSound: function(url, cb) {
    var req = new XMLHttpRequest();
    req.open('GET', url, true);
    req.responseType = 'arraybuffer';
    var self = this;
    req.onloadend = function() {
      self.decode.call(self, req.response, cb);
    };
    req.send();
  },
  getBuffer: function(cb) {
    if (!this.needBuffer()) return;
    var self = this;
    this.loadSound(this.url, function(data) {
      self.onLoaded.call(self, data, true);
    });
  },
  getSource: function(cb) {
    if (this.source) {
      cb(this.source);
    } else {
      var self = this;
      this.disconnect();
      this.loadSound(this.url, function(data) {
        this.source = self.createSource.call(self, data, true);
        cb(this.source);
      });
    }
  },
  onLoaded: function(source, silent) {
    this.buffer = source;
    this.disconnect();
    this.source = this.context.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.connect(this.gainNode);
    this.ffts.forEach(function(fft) {
      this.gainNode.connect(fft.input);
    }, this);
    this.gainNode.connect(this.context.destination);
    this.ffts.forEach(function(fft) {
      fft.connect(this.context.destination);
    }, this);
    if (!silent) this.playSound();
  },
  disconnect: function() {
    if (this.source) {
      this.source.disconnect(this.context.destination);
    }
  },
  playSound: function() {
    if (this.playTime) {
      this.source.start(0, this.offset);
    }

    this.playTime = this.context.currentTime;
  },
  loadSilent: function() {
    if (!this.needBuffer()) return;
    var self = this;
    this.loadSound(this.url, function(data) {
      self.onLoaded.call(self, data, true);
    });
  },
  play: function(starttime, offset) {
    this.playTime = starttime ? starttime : this.context.currentTime;
    this.offset = offset ? offset : 0;

    if (this.needBuffer()) {
      var self = this;
      this.loadSound(this.url, function(data) {
        self.onLoaded.call(self, data);
      });
    } else {
      this.onLoaded(this.buffer);
    }
  },
  stop: function() {
    this.source.stop(this.context.currentTime);
  },
  decode: function(data, success, error) {
    this.context.decodeAudioData(data, success, error);
  }
};

module.exports = AudioSource;

},{}],"/home/meandave/Code/metastaseis/node_modules/drag-drop/index.js":[function(require,module,exports){
module.exports = DragDrop

var throttle = require('lodash.throttle')

function DragDrop (elem, cb) {
  if (typeof elem === 'string') elem = document.querySelector(elem)
  elem.addEventListener('dragenter', killEvent, false)
  elem.addEventListener('dragover', makeOnDragOver(elem), false)
  elem.addEventListener('drop', onDrop.bind(undefined, elem, cb), false)
}

function killEvent (e) {
  e.stopPropagation()
  e.preventDefault()
  return false
}

function makeOnDragOver (elem) {
  var fn = throttle(function () {
    elem.classList.add('drag')

    if (elem.timeout) clearTimeout(elem.timeout)
    elem.timeout = setTimeout(function () {
      elem.classList.remove('drag')
    }, 150)
  }, 100, {trailing: false})

  return function (e) {
    e.stopPropagation()
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    fn()
  }
}

function onDrop (elem, cb, e) {
  e.stopPropagation()
  e.preventDefault()
  elem.classList.remove('drag')
  cb(Array.prototype.slice.call(e.dataTransfer.files), { x: e.clientX, y: e.clientY })
  return false
}

},{"lodash.throttle":"/home/meandave/Code/metastaseis/node_modules/drag-drop/node_modules/lodash.throttle/index.js"}],"/home/meandave/Code/metastaseis/node_modules/drag-drop/node_modules/lodash.throttle/index.js":[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var debounce = require('lodash.debounce'),
    isFunction = require('lodash.isfunction'),
    isObject = require('lodash.isobject');

/** Used as an internal `_.debounce` options object */
var debounceOptions = {
  'leading': false,
  'maxWait': 0,
  'trailing': false
};

/**
 * Creates a function that, when executed, will only call the `func` function
 * at most once per every `wait` milliseconds. Provide an options object to
 * indicate that `func` should be invoked on the leading and/or trailing edge
 * of the `wait` timeout. Subsequent calls to the throttled function will
 * return the result of the last `func` call.
 *
 * Note: If `leading` and `trailing` options are `true` `func` will be called
 * on the trailing edge of the timeout only if the the throttled function is
 * invoked more than once during the `wait` timeout.
 *
 * @static
 * @memberOf _
 * @category Functions
 * @param {Function} func The function to throttle.
 * @param {number} wait The number of milliseconds to throttle executions to.
 * @param {Object} [options] The options object.
 * @param {boolean} [options.leading=true] Specify execution on the leading edge of the timeout.
 * @param {boolean} [options.trailing=true] Specify execution on the trailing edge of the timeout.
 * @returns {Function} Returns the new throttled function.
 * @example
 *
 * // avoid excessively updating the position while scrolling
 * var throttled = _.throttle(updatePosition, 100);
 * jQuery(window).on('scroll', throttled);
 *
 * // execute `renewToken` when the click event is fired, but not more than once every 5 minutes
 * jQuery('.interactive').on('click', _.throttle(renewToken, 300000, {
 *   'trailing': false
 * }));
 */
function throttle(func, wait, options) {
  var leading = true,
      trailing = true;

  if (!isFunction(func)) {
    throw new TypeError;
  }
  if (options === false) {
    leading = false;
  } else if (isObject(options)) {
    leading = 'leading' in options ? options.leading : leading;
    trailing = 'trailing' in options ? options.trailing : trailing;
  }
  debounceOptions.leading = leading;
  debounceOptions.maxWait = wait;
  debounceOptions.trailing = trailing;

  return debounce(func, wait, debounceOptions);
}

module.exports = throttle;

},{"lodash.debounce":"/home/meandave/Code/metastaseis/node_modules/drag-drop/node_modules/lodash.throttle/node_modules/lodash.debounce/index.js","lodash.isfunction":"/home/meandave/Code/metastaseis/node_modules/drag-drop/node_modules/lodash.throttle/node_modules/lodash.isfunction/index.js","lodash.isobject":"/home/meandave/Code/metastaseis/node_modules/drag-drop/node_modules/lodash.throttle/node_modules/lodash.isobject/index.js"}],"/home/meandave/Code/metastaseis/node_modules/drag-drop/node_modules/lodash.throttle/node_modules/lodash.debounce/index.js":[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var isFunction = require('lodash.isfunction'),
    isObject = require('lodash.isobject'),
    now = require('lodash.now');

/* Native method shortcuts for methods with the same name as other `lodash` methods */
var nativeMax = Math.max;

/**
 * Creates a function that will delay the execution of `func` until after
 * `wait` milliseconds have elapsed since the last time it was invoked.
 * Provide an options object to indicate that `func` should be invoked on
 * the leading and/or trailing edge of the `wait` timeout. Subsequent calls
 * to the debounced function will return the result of the last `func` call.
 *
 * Note: If `leading` and `trailing` options are `true` `func` will be called
 * on the trailing edge of the timeout only if the the debounced function is
 * invoked more than once during the `wait` timeout.
 *
 * @static
 * @memberOf _
 * @category Functions
 * @param {Function} func The function to debounce.
 * @param {number} wait The number of milliseconds to delay.
 * @param {Object} [options] The options object.
 * @param {boolean} [options.leading=false] Specify execution on the leading edge of the timeout.
 * @param {number} [options.maxWait] The maximum time `func` is allowed to be delayed before it's called.
 * @param {boolean} [options.trailing=true] Specify execution on the trailing edge of the timeout.
 * @returns {Function} Returns the new debounced function.
 * @example
 *
 * // avoid costly calculations while the window size is in flux
 * var lazyLayout = _.debounce(calculateLayout, 150);
 * jQuery(window).on('resize', lazyLayout);
 *
 * // execute `sendMail` when the click event is fired, debouncing subsequent calls
 * jQuery('#postbox').on('click', _.debounce(sendMail, 300, {
 *   'leading': true,
 *   'trailing': false
 * });
 *
 * // ensure `batchLog` is executed once after 1 second of debounced calls
 * var source = new EventSource('/stream');
 * source.addEventListener('message', _.debounce(batchLog, 250, {
 *   'maxWait': 1000
 * }, false);
 */
function debounce(func, wait, options) {
  var args,
      maxTimeoutId,
      result,
      stamp,
      thisArg,
      timeoutId,
      trailingCall,
      lastCalled = 0,
      maxWait = false,
      trailing = true;

  if (!isFunction(func)) {
    throw new TypeError;
  }
  wait = nativeMax(0, wait) || 0;
  if (options === true) {
    var leading = true;
    trailing = false;
  } else if (isObject(options)) {
    leading = options.leading;
    maxWait = 'maxWait' in options && (nativeMax(wait, options.maxWait) || 0);
    trailing = 'trailing' in options ? options.trailing : trailing;
  }
  var delayed = function() {
    var remaining = wait - (now() - stamp);
    if (remaining <= 0) {
      if (maxTimeoutId) {
        clearTimeout(maxTimeoutId);
      }
      var isCalled = trailingCall;
      maxTimeoutId = timeoutId = trailingCall = undefined;
      if (isCalled) {
        lastCalled = now();
        result = func.apply(thisArg, args);
        if (!timeoutId && !maxTimeoutId) {
          args = thisArg = null;
        }
      }
    } else {
      timeoutId = setTimeout(delayed, remaining);
    }
  };

  var maxDelayed = function() {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    maxTimeoutId = timeoutId = trailingCall = undefined;
    if (trailing || (maxWait !== wait)) {
      lastCalled = now();
      result = func.apply(thisArg, args);
      if (!timeoutId && !maxTimeoutId) {
        args = thisArg = null;
      }
    }
  };

  return function() {
    args = arguments;
    stamp = now();
    thisArg = this;
    trailingCall = trailing && (timeoutId || !leading);

    if (maxWait === false) {
      var leadingCall = leading && !timeoutId;
    } else {
      if (!maxTimeoutId && !leading) {
        lastCalled = stamp;
      }
      var remaining = maxWait - (stamp - lastCalled),
          isCalled = remaining <= 0;

      if (isCalled) {
        if (maxTimeoutId) {
          maxTimeoutId = clearTimeout(maxTimeoutId);
        }
        lastCalled = stamp;
        result = func.apply(thisArg, args);
      }
      else if (!maxTimeoutId) {
        maxTimeoutId = setTimeout(maxDelayed, remaining);
      }
    }
    if (isCalled && timeoutId) {
      timeoutId = clearTimeout(timeoutId);
    }
    else if (!timeoutId && wait !== maxWait) {
      timeoutId = setTimeout(delayed, wait);
    }
    if (leadingCall) {
      isCalled = true;
      result = func.apply(thisArg, args);
    }
    if (isCalled && !timeoutId && !maxTimeoutId) {
      args = thisArg = null;
    }
    return result;
  };
}

module.exports = debounce;

},{"lodash.isfunction":"/home/meandave/Code/metastaseis/node_modules/drag-drop/node_modules/lodash.throttle/node_modules/lodash.isfunction/index.js","lodash.isobject":"/home/meandave/Code/metastaseis/node_modules/drag-drop/node_modules/lodash.throttle/node_modules/lodash.isobject/index.js","lodash.now":"/home/meandave/Code/metastaseis/node_modules/drag-drop/node_modules/lodash.throttle/node_modules/lodash.debounce/node_modules/lodash.now/index.js"}],"/home/meandave/Code/metastaseis/node_modules/drag-drop/node_modules/lodash.throttle/node_modules/lodash.debounce/node_modules/lodash.now/index.js":[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var isNative = require('lodash._isnative');

/**
 * Gets the number of milliseconds that have elapsed since the Unix epoch
 * (1 January 1970 00:00:00 UTC).
 *
 * @static
 * @memberOf _
 * @category Utilities
 * @example
 *
 * var stamp = _.now();
 * _.defer(function() { console.log(_.now() - stamp); });
 * // => logs the number of milliseconds it took for the deferred function to be called
 */
var now = isNative(now = Date.now) && now || function() {
  return new Date().getTime();
};

module.exports = now;

},{"lodash._isnative":"/home/meandave/Code/metastaseis/node_modules/drag-drop/node_modules/lodash.throttle/node_modules/lodash.debounce/node_modules/lodash.now/node_modules/lodash._isnative/index.js"}],"/home/meandave/Code/metastaseis/node_modules/drag-drop/node_modules/lodash.throttle/node_modules/lodash.debounce/node_modules/lodash.now/node_modules/lodash._isnative/index.js":[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */

/** Used for native method references */
var objectProto = Object.prototype;

/** Used to resolve the internal [[Class]] of values */
var toString = objectProto.toString;

/** Used to detect if a method is native */
var reNative = RegExp('^' +
  String(toString)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/toString| for [^\]]+/g, '.*?') + '$'
);

/**
 * Checks if `value` is a native function.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if the `value` is a native function, else `false`.
 */
function isNative(value) {
  return typeof value == 'function' && reNative.test(value);
}

module.exports = isNative;

},{}],"/home/meandave/Code/metastaseis/node_modules/drag-drop/node_modules/lodash.throttle/node_modules/lodash.isfunction/index.js":[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */

/**
 * Checks if `value` is a function.
 *
 * @static
 * @memberOf _
 * @category Objects
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if the `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 */
function isFunction(value) {
  return typeof value == 'function';
}

module.exports = isFunction;

},{}],"/home/meandave/Code/metastaseis/node_modules/drag-drop/node_modules/lodash.throttle/node_modules/lodash.isobject/index.js":[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var objectTypes = require('lodash._objecttypes');

/**
 * Checks if `value` is the language type of Object.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Objects
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if the `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // check if the value is the ECMAScript language type of Object
  // http://es5.github.io/#x8
  // and avoid a V8 bug
  // http://code.google.com/p/v8/issues/detail?id=2291
  return !!(value && objectTypes[typeof value]);
}

module.exports = isObject;

},{"lodash._objecttypes":"/home/meandave/Code/metastaseis/node_modules/drag-drop/node_modules/lodash.throttle/node_modules/lodash.isobject/node_modules/lodash._objecttypes/index.js"}],"/home/meandave/Code/metastaseis/node_modules/drag-drop/node_modules/lodash.throttle/node_modules/lodash.isobject/node_modules/lodash._objecttypes/index.js":[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */

/** Used to determine if values are of the language type Object */
var objectTypes = {
  'boolean': false,
  'function': true,
  'object': true,
  'number': false,
  'string': false,
  'undefined': false
};

module.exports = objectTypes;

},{}],"/home/meandave/Code/metastaseis/node_modules/hyperscript/index.js":[function(require,module,exports){
var split = require('browser-split')
var ClassList = require('class-list')
require('html-element')

function context () {

  var cleanupFuncs = []

  function h() {
    var args = [].slice.call(arguments), e = null
    function item (l) {
      var r
      function parseClass (string) {
        var m = split(string, /([\.#]?[a-zA-Z0-9_:-]+)/)
        if(/^\.|#/.test(m[1]))
          e = document.createElement('div')
        forEach(m, function (v) {
          var s = v.substring(1,v.length)
          if(!v) return
          if(!e)
            e = document.createElement(v)
          else if (v[0] === '.')
            ClassList(e).add(s)
          else if (v[0] === '#')
            e.setAttribute('id', s)
        })
      }

      if(l == null)
        ;
      else if('string' === typeof l) {
        if(!e)
          parseClass(l)
        else
          e.appendChild(r = document.createTextNode(l))
      }
      else if('number' === typeof l
        || 'boolean' === typeof l
        || l instanceof Date
        || l instanceof RegExp ) {
          e.appendChild(r = document.createTextNode(l.toString()))
      }
      //there might be a better way to handle this...
      else if (isArray(l))
        forEach(l, item)
      else if(isNode(l))
        e.appendChild(r = l)
      else if(l instanceof Text)
        e.appendChild(r = l)
      else if ('object' === typeof l) {
        for (var k in l) {
          if('function' === typeof l[k]) {
            if(/^on\w+/.test(k)) {
              if (e.addEventListener){
                e.addEventListener(k.substring(2), l[k], false)
                cleanupFuncs.push(function(){
                  e.removeEventListener(k.substring(2), l[k], false)
                })
              }else{
                e.attachEvent(k, l[k])
                cleanupFuncs.push(function(){
                  e.detachEvent(k, l[k])
                })
              }
            } else {
              // observable
              e[k] = l[k]()
              cleanupFuncs.push(l[k](function (v) {
                e[k] = v
              }))
            }
          }
          else if(k === 'style') {
            if('string' === typeof l[k]) {
              e.style.cssText = l[k]
            }else{
              for (var s in l[k]) (function(s, v) {
                if('function' === typeof v) {
                  // observable
                  e.style.setProperty(s, v())
                  cleanupFuncs.push(v(function (val) {
                    e.style.setProperty(s, val)
                  }))
                } else
                  e.style.setProperty(s, l[k][s])
              })(s, l[k][s])
            }
          } else if (k.substr(0, 5) === "data-") {
            e.setAttribute(k, l[k])
          } else {
            e[k] = l[k]
          }
        }
      } else if ('function' === typeof l) {
        //assume it's an observable!
        var v = l()
        e.appendChild(r = isNode(v) ? v : document.createTextNode(v))

        cleanupFuncs.push(l(function (v) {
          if(isNode(v) && r.parentElement)
            r.parentElement.replaceChild(v, r), r = v
          else
            r.textContent = v
        }))
      }

      return r
    }
    while(args.length)
      item(args.shift())

    return e
  }

  h.cleanup = function () {
    for (var i = 0; i < cleanupFuncs.length; i++){
      cleanupFuncs[i]()
    }
  }

  return h
}

var h = module.exports = context()
h.context = context

function isNode (el) {
  return el && el.nodeName && el.nodeType
}

function isText (el) {
  return el && el.nodeName === '#text' && el.nodeType == 3
}

function forEach (arr, fn) {
  if (arr.forEach) return arr.forEach(fn)
  for (var i = 0; i < arr.length; i++) fn(arr[i], i)
}

function isArray (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]'
}

},{"browser-split":"/home/meandave/Code/metastaseis/node_modules/hyperscript/node_modules/browser-split/index.js","class-list":"/home/meandave/Code/metastaseis/node_modules/hyperscript/node_modules/class-list/index.js","html-element":"/home/meandave/Code/metastaseis/node_modules/watchify/node_modules/browserify/node_modules/browser-resolve/empty.js"}],"/home/meandave/Code/metastaseis/node_modules/hyperscript/node_modules/browser-split/index.js":[function(require,module,exports){
/*!
 * Cross-Browser Split 1.1.1
 * Copyright 2007-2012 Steven Levithan <stevenlevithan.com>
 * Available under the MIT License
 * ECMAScript compliant, uniform cross-browser split method
 */

/**
 * Splits a string into an array of strings using a regex or string separator. Matches of the
 * separator are not included in the result array. However, if `separator` is a regex that contains
 * capturing groups, backreferences are spliced into the result each time `separator` is matched.
 * Fixes browser bugs compared to the native `String.prototype.split` and can be used reliably
 * cross-browser.
 * @param {String} str String to split.
 * @param {RegExp|String} separator Regex or string to use for separating the string.
 * @param {Number} [limit] Maximum number of items to include in the result array.
 * @returns {Array} Array of substrings.
 * @example
 *
 * // Basic use
 * split('a b c d', ' ');
 * // -> ['a', 'b', 'c', 'd']
 *
 * // With limit
 * split('a b c d', ' ', 2);
 * // -> ['a', 'b']
 *
 * // Backreferences in result array
 * split('..word1 word2..', /([a-z]+)(\d+)/i);
 * // -> ['..', 'word', '1', ' ', 'word', '2', '..']
 */
module.exports = (function split(undef) {

  var nativeSplit = String.prototype.split,
    compliantExecNpcg = /()??/.exec("")[1] === undef,
    // NPCG: nonparticipating capturing group
    self;

  self = function(str, separator, limit) {
    // If `separator` is not a regex, use `nativeSplit`
    if (Object.prototype.toString.call(separator) !== "[object RegExp]") {
      return nativeSplit.call(str, separator, limit);
    }
    var output = [],
      flags = (separator.ignoreCase ? "i" : "") + (separator.multiline ? "m" : "") + (separator.extended ? "x" : "") + // Proposed for ES6
      (separator.sticky ? "y" : ""),
      // Firefox 3+
      lastLastIndex = 0,
      // Make `global` and avoid `lastIndex` issues by working with a copy
      separator = new RegExp(separator.source, flags + "g"),
      separator2, match, lastIndex, lastLength;
    str += ""; // Type-convert
    if (!compliantExecNpcg) {
      // Doesn't need flags gy, but they don't hurt
      separator2 = new RegExp("^" + separator.source + "$(?!\\s)", flags);
    }
    /* Values for `limit`, per the spec:
     * If undefined: 4294967295 // Math.pow(2, 32) - 1
     * If 0, Infinity, or NaN: 0
     * If positive number: limit = Math.floor(limit); if (limit > 4294967295) limit -= 4294967296;
     * If negative number: 4294967296 - Math.floor(Math.abs(limit))
     * If other: Type-convert, then use the above rules
     */
    limit = limit === undef ? -1 >>> 0 : // Math.pow(2, 32) - 1
    limit >>> 0; // ToUint32(limit)
    while (match = separator.exec(str)) {
      // `separator.lastIndex` is not reliable cross-browser
      lastIndex = match.index + match[0].length;
      if (lastIndex > lastLastIndex) {
        output.push(str.slice(lastLastIndex, match.index));
        // Fix browsers whose `exec` methods don't consistently return `undefined` for
        // nonparticipating capturing groups
        if (!compliantExecNpcg && match.length > 1) {
          match[0].replace(separator2, function() {
            for (var i = 1; i < arguments.length - 2; i++) {
              if (arguments[i] === undef) {
                match[i] = undef;
              }
            }
          });
        }
        if (match.length > 1 && match.index < str.length) {
          Array.prototype.push.apply(output, match.slice(1));
        }
        lastLength = match[0].length;
        lastLastIndex = lastIndex;
        if (output.length >= limit) {
          break;
        }
      }
      if (separator.lastIndex === match.index) {
        separator.lastIndex++; // Avoid an infinite loop
      }
    }
    if (lastLastIndex === str.length) {
      if (lastLength || !separator.test("")) {
        output.push("");
      }
    } else {
      output.push(str.slice(lastLastIndex));
    }
    return output.length > limit ? output.slice(0, limit) : output;
  };

  return self;
})();

},{}],"/home/meandave/Code/metastaseis/node_modules/hyperscript/node_modules/class-list/index.js":[function(require,module,exports){
// contains, add, remove, toggle
var indexof = require('indexof')

module.exports = ClassList

function ClassList(elem) {
    var cl = elem.classList

    if (cl) {
        return cl
    }

    var classList = {
        add: add
        , remove: remove
        , contains: contains
        , toggle: toggle
        , toString: $toString
        , length: 0
        , item: item
    }

    return classList

    function add(token) {
        var list = getTokens()
        if (indexof(list, token) > -1) {
            return
        }
        list.push(token)
        setTokens(list)
    }

    function remove(token) {
        var list = getTokens()
            , index = indexof(list, token)

        if (index === -1) {
            return
        }

        list.splice(index, 1)
        setTokens(list)
    }

    function contains(token) {
        return indexof(getTokens(), token) > -1
    }

    function toggle(token) {
        if (contains(token)) {
            remove(token)
            return false
        } else {
            add(token)
            return true
        }
    }

    function $toString() {
        return elem.className
    }

    function item(index) {
        var tokens = getTokens()
        return tokens[index] || null
    }

    function getTokens() {
        var className = elem.className

        return filter(className.split(" "), isTruthy)
    }

    function setTokens(list) {
        var length = list.length

        elem.className = list.join(" ")
        classList.length = length

        for (var i = 0; i < list.length; i++) {
            classList[i] = list[i]
        }

        delete list[length]
    }
}

function filter (arr, fn) {
    var ret = []
    for (var i = 0; i < arr.length; i++) {
        if (fn(arr[i])) ret.push(arr[i])
    }
    return ret
}

function isTruthy(value) {
    return !!value
}

},{"indexof":"/home/meandave/Code/metastaseis/node_modules/hyperscript/node_modules/class-list/node_modules/indexof/index.js"}],"/home/meandave/Code/metastaseis/node_modules/hyperscript/node_modules/class-list/node_modules/indexof/index.js":[function(require,module,exports){

var indexOf = [].indexOf;

module.exports = function(arr, obj){
  if (indexOf) return arr.indexOf(obj);
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === obj) return i;
  }
  return -1;
};
},{}],"/home/meandave/Code/metastaseis/node_modules/raf/index.js":[function(require,module,exports){
var now = require('performance-now')
  , global = typeof window === 'undefined' ? {} : window
  , vendors = ['moz', 'webkit']
  , suffix = 'AnimationFrame'
  , raf = global['request' + suffix]
  , caf = global['cancel' + suffix] || global['cancelRequest' + suffix]
  , isNative = true

for(var i = 0; i < vendors.length && !raf; i++) {
  raf = global[vendors[i] + 'Request' + suffix]
  caf = global[vendors[i] + 'Cancel' + suffix]
      || global[vendors[i] + 'CancelRequest' + suffix]
}

// Some versions of FF have rAF but not cAF
if(!raf || !caf) {
  isNative = false

  var last = 0
    , id = 0
    , queue = []
    , frameDuration = 1000 / 60

  raf = function(callback) {
    if(queue.length === 0) {
      var _now = now()
        , next = Math.max(0, frameDuration - (_now - last))
      last = next + _now
      setTimeout(function() {
        var cp = queue.slice(0)
        // Clear queue here to prevent
        // callbacks from appending listeners
        // to the current frame's queue
        queue.length = 0
        for(var i = 0; i < cp.length; i++) {
          if(!cp[i].cancelled) {
            try{
              cp[i].callback(last)
            } catch(e) {
              setTimeout(function() { throw e }, 0)
            }
          }
        }
      }, Math.round(next))
    }
    queue.push({
      handle: ++id,
      callback: callback,
      cancelled: false
    })
    return id
  }

  caf = function(handle) {
    for(var i = 0; i < queue.length; i++) {
      if(queue[i].handle === handle) {
        queue[i].cancelled = true
      }
    }
  }
}

module.exports = function(fn) {
  // Wrap in a new function to prevent
  // `cancel` potentially being assigned
  // to the native rAF function
  if(!isNative) {
    return raf.call(global, fn)
  }
  return raf.call(global, function() {
    try{
      fn.apply(this, arguments)
    } catch(e) {
      setTimeout(function() { throw e }, 0)
    }
  })
}
module.exports.cancel = function() {
  caf.apply(global, arguments)
}

},{"performance-now":"/home/meandave/Code/metastaseis/node_modules/raf/node_modules/performance-now/lib/performance-now.js"}],"/home/meandave/Code/metastaseis/node_modules/raf/node_modules/performance-now/lib/performance-now.js":[function(require,module,exports){
(function (process){
// Generated by CoffeeScript 1.6.3
(function() {
  var getNanoSeconds, hrtime, loadTime;

  if ((typeof performance !== "undefined" && performance !== null) && performance.now) {
    module.exports = function() {
      return performance.now();
    };
  } else if ((typeof process !== "undefined" && process !== null) && process.hrtime) {
    module.exports = function() {
      return (getNanoSeconds() - loadTime) / 1e6;
    };
    hrtime = process.hrtime;
    getNanoSeconds = function() {
      var hr;
      hr = hrtime();
      return hr[0] * 1e9 + hr[1];
    };
    loadTime = getNanoSeconds();
  } else if (Date.now) {
    module.exports = function() {
      return Date.now() - loadTime;
    };
    loadTime = Date.now();
  } else {
    module.exports = function() {
      return new Date().getTime() - loadTime;
    };
    loadTime = new Date().getTime();
  }

}).call(this);

/*
//@ sourceMappingURL=performance-now.map
*/

}).call(this,require('_process'))
},{"_process":"/home/meandave/Code/metastaseis/node_modules/watchify/node_modules/browserify/node_modules/process/browser.js"}],"/home/meandave/Code/metastaseis/node_modules/watchify/node_modules/browserify/node_modules/browser-resolve/empty.js":[function(require,module,exports){

},{}],"/home/meandave/Code/metastaseis/node_modules/watchify/node_modules/browserify/node_modules/events/events.js":[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],"/home/meandave/Code/metastaseis/node_modules/watchify/node_modules/browserify/node_modules/process/browser.js":[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],"/home/meandave/Code/metastaseis/public/lib/colors.js":[function(require,module,exports){
var result = ['#30FFD6',
              '#72EED6',
              '#1DBF9F',
              '#65F0B9',
              '#57FC93',
              '#98FFBE',
              '#A0FF98'];
var myInterval;

module.exports = {
  start: start,
  end: end
}

function start(el, interval) {
  var l = 0;
  myInterval = setInterval(function() {
                 l++;
                 if (l >= result.length) l = 0;
                 el.style.color = result[l];
               }, interval);
}

function end() {
  clearInterval(myInterval);
  myInterval = null;
}
},{}],"/home/meandave/Code/metastaseis/public/lib/draw-buffer.js":[function(require,module,exports){
module.exports = drawBuffer;

function drawBuffer (canvas, buffer, color) {
  var ctx = canvas.getContext('2d');
  var width = canvas.width;
  var height = canvas.height;
  if (color) {
    ctx.fillStyle = color;
  }

    var data = buffer.getChannelData( 0 );
    var step = Math.ceil( data.length / width );
    var amp = height / 2;
    for(var i=0; i < width; i++){
        var min = 1.0;
        var max = -1.0;
        for (var j=0; j<step; j++) {
            var datum = data[(i*step)+j];
            if (datum < min)
                min = datum;
            if (datum > max)
                max = datum;
        }
      ctx.fillRect(i,(1+min)*amp,1,Math.max(1,(max-min)*amp));
    }
}
},{}],"/home/meandave/Code/metastaseis/public/lib/edits.js":[function(require,module,exports){
module.exports = {
  cut: cutBuffer,
  copy: copyBuffer,
  paste: pasteBuffer,
  reverse: reverseBuffer
};

function reverseBuffer(buffer, cb) {
  var chanNumber = buffer.numberOfChannels;
  for (var i = 0; i < chanNumber; ++i) {
    var data = buffer.getChannelData(i);
    Array.prototype.reverse.call(data);
  }
  cb();
}

// copy the buffer to our clipboard, without removing the original section from buffer.
function copyBuffer(context, clipboard, buffer, cb) {
  var start = Math.round(clipboard.start * buffer.sampleRate);
  var end = Math.round(clipboard.end * buffer.sampleRate);

  clipboard.buffer = context.createBuffer(2, end - start, buffer.sampleRate);

  clipboard.buffer.getChannelData(0).set(
    buffer.getChannelData(0).subarray(start, end), 0);
  clipboard.buffer.getChannelData(1).set(
    buffer.getChannelData(1).subarray(start, end), 0);

  cb();
}

// cut the buffer portion to our clipboard, sets empty space in place of the portion
// in the source buffer.
function cutBuffer(context, clipboard, buffer, cb) {
  var start = Math.round(clipboard.start * buffer.sampleRate);
  var end = Math.round(clipboard.end * buffer.sampleRate);

  clipboard.buffer = context.createBuffer(2, end - start, buffer.sampleRate);
  clipboard.buffer.getChannelData(0).set(buffer.getChannelData(0).subarray(start, end));
  clipboard.buffer.getChannelData(1).set(buffer.getChannelData(1).subarray(start, end));

  var nuOldBuffer = context.createBuffer(2, buffer.length, buffer.sampleRate);
  var emptyBuf = context.createBuffer(2, end - start, buffer.sampleRate);

  nuOldBuffer.getChannelData(0).set(buffer.getChannelData(0).subarray(0, start));
  nuOldBuffer.getChannelData(1).set(buffer.getChannelData(1).subarray(0, start))

  nuOldBuffer.getChannelData(0).set(emptyBuf.getChannelData(0), start);
  nuOldBuffer.getChannelData(1).set(emptyBuf.getChannelData(1), start);

  nuOldBuffer.getChannelData(0).set(buffer.getChannelData(0).subarray(end, buffer.length), end);
  nuOldBuffer.getChannelData(1).set(buffer.getChannelData(1).subarray(end, buffer.length), end);
  cb(nuOldBuffer);
}

// insert our clipboard at a specific point in buffer.
function pasteBuffer(context, clipboard, buffer, at, cb) {
  var start = Math.round(clipboard.start * buffer.sampleRate);
  var end = Math.round(clipboard.end * buffer.sampleRate);
  at = at * buffer.sampleRate;

  // create replacement buffer with enough space for cliboard part
  var nuPastedBuffer = context.createBuffer(2, buffer.length + (end - start), buffer.sampleRate);

  // if our clip start point is not at '0' then we need to set the original
  // chunk, up to the clip start point
  if (at > 0) {
    nuPastedBuffer.getChannelData(0).set(buffer.getChannelData(0).subarray(0, at));
    nuPastedBuffer.getChannelData(1).set(buffer.getChannelData(1).subarray(0, at));
  }

  // add the clip data
  nuPastedBuffer.getChannelData(0).set(clipboard.buffer.getChannelData(0), at);
  nuPastedBuffer.getChannelData(1).set(clipboard.buffer.getChannelData(1), at);

  // if our clip end point is not at the end of the original buffer then
  // we need to add remaining data from the original buffer;
  if (end < buffer.length) {
    var newAt = at + (end - start);
    nuPastedBuffer.getChannelData(0).set(buffer.getChannelData(0).subarray(newAt), newAt);
    nuPastedBuffer.getChannelData(1).set(buffer.getChannelData(1).subarray(newAt), newAt);
  }

  cb(nuPastedBuffer);
}
},{}],"/home/meandave/Code/metastaseis/public/lib/format-time.js":[function(require,module,exports){
module.exports = function (totalSec, ms) {
  var minutes = parseInt( totalSec / 60 ) % 60;
  var seconds = totalSec % 60;

  if (ms) {
    return ((minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds  < 10 ? "0" + seconds.toFixed(2) : seconds.toFixed(2))).replace('.', ':');
  } else {
    return ((minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds  < 10 ? "0" +  parseInt(seconds) : parseInt(seconds)));
  }
}
},{}],"/home/meandave/Code/metastaseis/public/lib/record.js":[function(require,module,exports){
var recorder;
module.exports = {
  start: start,
  stop: stop
}

function getStream(context, fft) {
  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
  window.URL = window.URL || window.webkitURL;

  navigator.getUserMedia({audio: true}, function(stream) {
    startUserMedia(context, stream, fft);
  }, function(err) {
    console.log('No live audio input: ' + err);
  });
}

function startUserMedia(context, stream, fft) {
  var input = context.createMediaStreamSource(stream);
  console.log('Media stream created.');

  if (fft) {
    input.connect(fft.input);
    // throw away gain node
    var gainNode = context.createGain();
    gainNode.gain.value = 0;
    fft.connect(gainNode);
    gainNode.connect(context.destination);
  }
  // input.connect(context.destination); // might not actually want to do this
  console.log('Input connected to audio context destination.');

  recorder = new Recorder(input);
  console.log('Recorder initialised.');
  start();
}

function start(context, fft) {
  if (recorder === undefined) {
    getStream(context, fft)
  } else {
    recorder.record();
  }
}

function stop(cb) {
  recorder.stop();
  recorder.exportWAV(cb);
  recorder.clear();
}
},{}],"/home/meandave/Code/metastaseis/public/lib/timeline.js":[function(require,module,exports){
// need to generate these points, like, way smarter
// need to be multiples of 5 but still representative of minutes
// need to adjust width of timelineEl based on this

var h = require('hyperscript');
var formatTime = require('./format-time');
var timelineEl = document.querySelector('.timeline');

function calculatePoints(duration) {
  return duration / 5;
}

function point(num) {
  return h('li',
           h('span', num));
}

function getPointLength() {
  return timelineEl.children.length
}

// fix formatTime to work with low numbers

function getPoints(cur, max) {
  if (cur < max) {
    cur = cur + 5;
    timelineEl.appendChild(point(formatTime(cur)));
    getPoints(cur, max);
  }
}

function update(duration) {
  console.log('duration::', duration);
  var nuPointLength = calculatePoints(duration);
  if (nuPointLength < getPointLength()) return;

  var w = timelineEl.offsetWidth;
  timelineEl.innerHTML = '';
  getPoints(-5, duration);
  if (timelineEl.children.length * 100 > w) {
    timelineEl.style.width = timelineEl.children.length * 100 + 'px';
  }
}

module.exports = {
  update: update
};
},{"./format-time":"/home/meandave/Code/metastaseis/public/lib/format-time.js","hyperscript":"/home/meandave/Code/metastaseis/node_modules/hyperscript/index.js"}],"/home/meandave/Code/metastaseis/public/lib/track.js":[function(require,module,exports){
// This file is a pit of new york city slarm, edit at your own risk


/*
4) make sure loading and wave rendering code is DRY
*/


var EE = require('events').EventEmitter;
var AudioSource = require('audiosource');
var raf = require('raf');

var timelineManage = require('./timeline');
var formatTime = require('./format-time');
var drawBuffer = require('./draw-buffer');
var colors = require('./colors');

module.exports = Track;

function Track(opts) {
  this.emitter = new EE();
  this.controlEl = opts.controlEl;
  this.trackEl = opts.trackEl;
  this.active = true;
  this.selecting = true;
  this.context = opts.context;
  this.audiosource = opts.audiosource;
  this.id = opts.id;
  this.title = opts.title;

  if (opts.gainNode) {
    this.gainNode = opts.gainNode;
  }

  this.clipboard = {
    start: 0,
    end: 0
  };

  this.playing = false;

  this.startOffset = 0;
  this.lastPlay = 0;

  // indicators
  this.fileIndicator = this.trackEl.querySelector('.track p');
  this.currentTimeEl = this.controlEl.querySelector('.cur');
  this.remainingEl = this.controlEl.querySelector('.rem');
  this.durationEl = this.controlEl.querySelector('.dur');

  // center file indicator
  var trackSpaceWidth = document.querySelector('.track-space').offsetWidth;
  this.fileIndicator.style.width = trackSpaceWidth + 'px';

  // controls
  this.gainEl = this.controlEl.querySelector('.volume');
  this.volumeBar = this.gainEl.querySelector('.volume-bar');

  // wave elements
  this.wave = this.trackEl.querySelector('.wave canvas');
  this.progressWave = this.trackEl.querySelector('.wave-progress');
  this.cursor = this.trackEl.querySelector('.play-cursor');
  this.selection = this.trackEl.querySelector('.selection');
  this.selectable = [].slice.call(this.trackEl.querySelectorAll('.selectable'));

  colors.start(this.fileIndicator, 300);

  this.gainEl.addEventListener('click', function(ev) {
    this.volumeBar.style.width = ev.offsetX + 'px';
    this.gainNode.gain.value = ev.offsetX / this.gainEl.offsetWidth;
  }.bind(this));

  this.controlEl.querySelector('.activate').addEventListener('click', function(ev) {
    var el = ev.target;

    if (el.classList.contains('active')) {
      this.active = false;
      el.classList.remove('active');
      this.trackEl.classList.remove('active');
    } else {
      this.active = true;
      el.classList.add('active');
      this.trackEl.classList.add('active');
    }
  }.bind(this));

  this.selectable.forEach(function(wave) {
    wave.addEventListener('click', this.initSelection.bind(this));
    wave.addEventListener('mousedown', this.startSelection.bind(this));
    wave.addEventListener('mousemove', this.updateSelection.bind(this));
  }, this);

  this.selection.addEventListener('mouseup', function(ev) {
    if (!this.selecting) return;
    var leftPercent = parseFloat(this.selection.style.left.replace('px', ''));
    var rightPercent = leftPercent + parseFloat(this.selection.style.width.replace('px', ''));
    this.clipboard.start = this.getTimeFromPosition(leftPercent);
    this.clipboard.end = this.getTimeFromPosition(rightPercent);
    this.moving = false;
  }.bind(this));

  this.controlEl.querySelector('.mute').addEventListener('click', function(ev) {
    var el = ev.target;

    if (el.classList.contains('active')) {
      this.gainNode.gain.value = this.lastGainValue;
      this.gainEl.value = this.lastGainValue;
      el.classList.remove('active');
    } else {
      this.lastGainValue = this.gainNode.gain.value;
      this.gainNode.gain.value = 0;
      this.gainEl.value = 0;
      el.classList.add('active');
    }
  }.bind(this));

  this.controlEl.querySelector('.edit').addEventListener('click', function(ev) {
    var el = ev.target;
    if (el.classList.contains('active')) {
      el.classList.remove('active');
      this.selecting = false;
      this.selection.style.display = 'none';
    } else {
      el.classList.add('active');
      this.selecting = true;
      this.selection.style.display = 'block';
    }
  }.bind(this));

  this.controlEl.querySelector('.collapse').addEventListener('click', function(ev) {
    var el = ev.target;
    if (el.classList.contains('active')) {
      el.classList.remove('active');
      this.trackEl.classList.add('collapsed');
    } else {
      el.classList.add('active')
      this.trackEl.classList.remove('collapsed');
    }
  }.bind(this));

  function playListen (ev) {
    if (this.active) this.play();
  }

  this.emitter.on('tracks:play', playListen.bind(this));

  function pauseListen(ev) {
    if (this.active) this.pause();
  }

  this.emitter.on('tracks:pause', pauseListen.bind(this));

  function stopListen(ev) {
    if (this.active) {
      this.stop();
      this.resetProgress();
    }
  }

  this.emitter.on('tracks:stop', stopListen.bind(this));

  this.controlEl.querySelector('.remove').addEventListener('click', function(ev) {
    this.stop();
    this.controlEl.remove();
    this.trackEl.remove();
    this.emitter.emit('tracks:remove', {id: this.id});
    this.emitter = null;
  }.bind(this));
}

Track.prototype = {
  updateSelection: function(ev) {
    if (!this.moving || !this.selecting) return;
    var leftPosition = this.getPositionFromCursor();
    var rightPosition = this.positionFromClick(ev);
    var diff = rightPosition - leftPosition;

    if (diff <= 0) {
      diff = leftPosition - rightPosition;
      this.cursor.style.left = rightPosition + 'px';
      this.selection.style.left = rightPosition + 'px';
    }

    this.selection.style.width = diff +'px';
  },
  startSelection: function(ev) {
    if (this.playing) return;
    if (!this.moving) {
      var leftPosition = this.positionFromClick(ev);
      if (this.selecting) {
        this.selection.style.left = leftPosition + 'px';
        this.selection.style.width = 0;
        this.moving = true;
      }

      this.cursor.style.left = leftPosition + 'px';
    }
  },
  initSelection: function(ev) {
    if (this.playing) return;
    this.cursor.style.left = this.positionFromClick(ev)+"px";
  },
  play: function() {
    this.lastPlay = this.context.currentTime;
    this.playTrack(this.startOffset % this.audiosource.buffer.duration);
    this.setCursorViewInterval();
  },
  setCursorViewInterval: function() {
    if (this.cursorViewInterval) {
      clearInterval(this.cursorViewInterval);
    }
    var self = this;
    this.cursorViewInterval = setInterval(function() {
                                self.cursor.scrollIntoViewIfNeeded();
                              }, 200);
  },
  positionFromClick: function(ev) {
    var x = ev.offsetX || ev.layerX;
    return x + 21;
  },
  getPositionFromCursor: function() {
    return parseFloat(this.cursor.style.left.replace('px', ''));
  },
  getTimeFromPosition: function(position) {
    return (position / 100) * 5;
  },
  stop: function() {
    this.playing = false;
    this.startOffset = 0;
    this.lastPlay = 0;
    clearInterval(this.cursorViewInterval);
    if (this.audiosource.source) this.audiosource.stop();
  },
  resetProgress: function() {
    this.progressWave.style.width = "0px";
    this.cursor.style.left = "0px";
  },
  pause: function() {
    this.audiosource.stop();
    this.startOffset += this.context.currentTime - this.lastPlay;
    this.playing = false;
  },
  skipForward: function() {},
  skipBackward: function() {},
  playTrack: function(offset, stopOffset) {
    if (this.playing) this.audiosource.stop();
    this.audiosource.play(0, offset);
    this.audiosource.play(0, offset);
    this.playing = true;
    raf(this.triggerPlaying.bind(this));
  },
  updateVisualProgress: function (pos) {
    this.progressWave.style.width = pos+"px";
    this.cursor.style.left = (21+pos)+"px"; // 21 is the padding-left from beginning of track element
  },
  triggerPlaying: function() {
    if (!this.playing) return;

    var dur = this.audiosource.buffer.duration;
    var currentTime = this.context.currentTime - this.lastPlay + this.startOffset;
    var remainingTime = dur - currentTime;

    // this is the same way we are caculating the width of the waves
    // to match up to the timeline
    this.updateVisualProgress(((currentTime) / 5) * 100);

    this.currentTimeEl.textContent = formatTime(currentTime, true);
    this.remainingEl.textContent = formatTime(remainingTime, true);

    if (remainingTime <= 0) {
      this.playing = !this.playing;
      clearInterval(this.cursorViewInterval);
      return;
    }
    raf(this.triggerPlaying.bind(this));
  },
  currentTimeToPercent: function (currentTime) {
    var dur = this.audiosource.buffer.duration;
    var cur = (currentTime - this.lastPlay + this.startOffset % 60) * 10;
    return ((cur / dur) * 10).toFixed(3);
  },
  resetVisual: function() {
    var ctx = this.wave.getContext('2d');
    ctx.clearRect(0, 0, this.wave.width, this.wave.height);
    ctx = this.progressWave.querySelector('canvas').getContext('2d');
    ctx.clearRect(0, 0, this.wave.width, this.wave.height);
  },
  loadWithAudioBuffer: function(audioBuffer) {
    this.gainNode = this.context.createGain();
    this.audiosource = new AudioSource(this.context, {
      gainNode: this.gainNode
    });
    this.drawWaves();
  },
  loadURL: function (url) {
    this.fileIndicator.textContent = 'loading file from url...';

    var req = new XMLHttpRequest();
    req.open('GET', url, true);
        req.responseType = 'arraybuffer';
    var self = this;
    req.onloadend = function(ev) {
      self.fileIndicator.textContent = 'decoding audio data...';

      self.context.decodeAudioData(req.response, function(buf) {
        self.fileIndicator.textContent = 'rendering wave...';

        self.gainNode = self.context.createGain();
        self.audiosource = new AudioSource(self.context, {
          gainNode: self.gainNode
        });

        self.durationEl.textContent = formatTime(buf.duration, true);
        self.remainingEl.textContent = formatTime(buf.duration, true);

        self.audiosource.buffer = buf;

        self.adjustWave();
        drawBuffer(self.wave, buf, '#52F6A4');
        drawBuffer(self.progressWave.querySelector('canvas'), buf, '#F445F0');
        self.fileIndicator.remove();
      });
    };

    req.send();
  },
  loadFile: function (file) {
    this.fileIndicator.textContent = 'loading file...';

    var self = this;
    var reader = new FileReader();
    reader.onloadend = function(ev) {
      self.fileIndicator.textContent = 'decoding audio data...';

      self.context.decodeAudioData(ev.target.result, function(buf) {
        self.fileIndicator.textContent = 'rendering wave...';

        self.gainNode = self.context.createGain();
        self.audiosource = new AudioSource(self.context, {
          gainNode: self.gainNode
        });

        self.durationEl.textContent = formatTime(buf.duration, true);
        self.remainingEl.textContent = formatTime(buf.duration, true);

        self.audiosource.buffer = buf;

        self.adjustWave();
        drawBuffer(self.wave, buf, '#52F6A4');
        drawBuffer(self.progressWave.querySelector('canvas'), buf, '#F445F0');
        self.fileIndicator.remove();
      });
    };

    reader.readAsArrayBuffer(file);
  },
  adjustWave: function() {
    timelineManage.update(this.audiosource.buffer.duration);
    // adjust the canvas and containers to fit with the buffer duration
    var w = (this.audiosource.buffer.duration / 5) * 100;
    this.wave.width = w;
    this.progressWave.querySelector('canvas').width = w;
  },
  drawWaves: function() {
    timelineManage.update(this.audiosource.buffer.duration);
    var prevLeft = 0;
    if (this.cursor.style.left) {
      prevLeft = parseFloat(this.cursor.style.left.replace('px', ''));
    }
    this.resetVisual();
    drawBuffer(this.wave, this.audiosource.buffer, '#52F6A4');
    drawBuffer(this.progressWave.querySelector('canvas'), this.audiosource.buffer, '#F445F0');
    colors.end();
    console.log('waves updated.')
  }
}
},{"./colors":"/home/meandave/Code/metastaseis/public/lib/colors.js","./draw-buffer":"/home/meandave/Code/metastaseis/public/lib/draw-buffer.js","./format-time":"/home/meandave/Code/metastaseis/public/lib/format-time.js","./timeline":"/home/meandave/Code/metastaseis/public/lib/timeline.js","audiosource":"/home/meandave/Code/metastaseis/node_modules/audiosource/index.js","events":"/home/meandave/Code/metastaseis/node_modules/watchify/node_modules/browserify/node_modules/events/events.js","raf":"/home/meandave/Code/metastaseis/node_modules/raf/index.js"}],"/home/meandave/Code/metastaseis/public/main.js":[function(require,module,exports){
var EE = require('events').EventEmitter;
var dragDrop = require('drag-drop');
var AudioContext = require('audiocontext');
var AudioSource = require('audiosource');
var FFT = require('audio-fft');

var editor = require('./lib/edits');
var recorder = require('./lib/record');
var Track = require('./lib/track');

var trackTmp = require('../templates/track-tmp');
var controlTmp = require('../templates/control-tmp');

var audioContext = new AudioContext();
var masterGainNode = audioContext.createGain();
var uniqId = function() {return Math.random().toString(16).slice(2)};

var drawer = document.querySelector('.drawer');
var fft = new FFT(audioContext, {canvas: drawer.querySelector('#fft')});

var controlSpaceEl = document.querySelector('.control-space');
var workspaceEl = document.querySelector('#workspace');
var trackSpaceEl = document.querySelector('.track-space');

// controls
var welcome = document.querySelector('.welcome');
var welcomeImportBtn = welcome.querySelector('.import');
var welcomeRecordBtn = document.querySelector('.record');
var importBtn = document.querySelector('.import');
var importInput = document.querySelector('#import');
var playBtn = document.querySelector('#play');
var pauseBtn = document.querySelector('#pause');
var stopBtn = document.querySelector('#stop');
var cutBtn = document.querySelector('#cut');
var copyBtn = document.querySelector('#copy');
var pasteBtn = document.querySelector('#paste');
var prependBtn = document.querySelector('#prepend');
var appendBtn = document.querySelector('#append');
var duplicateBtn = document.querySelector('#duplicate');
var reverseBtn = document.querySelector('#reverse');
var removeBtn = document.querySelector('#remove');
var recordBtn = document.querySelector('#record');
var tracks = {};

var recording = false;

recordBtn.addEventListener('click', function() {
  if (!recording) {
    recorder.start(audioContext, fft);
    recordBtn.innerText = 'stop recording';
    drawer.classList.add('active');
    recording = true;
  } else {
    drawer.classList.remove('active');
    recordBtn.innerText = 'record';
    recorder.stop(function(blob) {
               newTrackFromURL(URL.createObjectURL(blob));
             });
    recording = false;
  }
})

dragDrop('body', function (files) {
  welcome.style.display = 'none';
  newTrackFromFile(files[0]);
});

welcomeImportBtn.addEventListener('click', function() {
  document.querySelector('#import').click();
})

welcomeRecordBtn.addEventListener('click', function() {
  welcomeRecordBtn.querySelector('h4').innerText = 'stop recording';
  document.querySelector('#record').click();
})

importBtn.addEventListener('click', function() {
  document.querySelector('#import').click();
})

importInput.addEventListener('change', function(ev) {
  newTrackFromFile(ev.target.files[0]);
});

playBtn.addEventListener('click', function() {
  Object.keys(tracks).forEach(function(key) {
    tracks[key].emitter.emit('tracks:play', {});
  });
});

pauseBtn.addEventListener('click', function() {
  Object.keys(tracks).forEach(function(key) {
    tracks[key].emitter.emit('tracks:pause', {});
  });
});

stopBtn.addEventListener('click', function() {
  Object.keys(tracks).forEach(function(key) {
    tracks[key].emitter.emit('tracks:stop', {});
  });
});

function showPasteCursors() {
  var selections = document.querySelectorAll('.selection');
  for (var i=0; i < selections; i++) {
    selections[i].style.display = 'none';
  }
  var pasteCursors = document.querySelectorAll('.paste-cursor');
  for (var i=0; i < pasteCursors; i++) {
    pasteCursors[i].style.display = 'block';
  }
}

function hidePasteCursors() {
  var selections = document.querySelectorAll('.selection');
  for (var i=0; i < selections; i++) {
    selections[i].style.display = 'block';
  }
  var pasteCursors = document.querySelectorAll('.paste-cursor');
  for (var i=0; i < pasteCursors; i++) {
    pasteCursors[i].style.display = 'none';
  }
}

function enablePlaybackOpts() {
  playBtn.disabled = false;
  copyBtn.disabled = false;
  cutBtn.disabled = false;
  stopBtn.disabled = false;
  pauseBtn.disabled = false;
  reverseBtn.disabled = false;
}

function enableClipboardOpts() {
  prependBtn.disabled = false;
  appendBtn.disabled = false;
  pasteBtn.disabled = false;
  duplicateBtn.disabled = false;
}

copyBtn.addEventListener('click', function() {
  var activeTrack = getActiveTrack();
  if (!activeTrack) return;

  var onComplete = function() {
    console.log('copy buffer complete: ', activeTrack.clipboard.buffer);
  };

  showPasteCursors();
  enableClipboardOpts();
  editor.copy(audioContext, activeTrack.clipboard, activeTrack.audiosource.buffer, onComplete);
});

cutBtn.addEventListener('click', function() {
  var activeTrack = getActiveTrack();
  if (!activeTrack) return;

  var onComplete = function(buf) {
    activeTrack.audiosource.buffer = buf;
    activeTrack.drawWaves();
  };

  activeTrack.clipboard.start = activeTrack.clipboard.start + activeTrack.lastPlay;
  activeTrack.clipboard.end = activeTrack.clipboard.end + activeTrack.lastPlay;

  showPasteCursors();
  enableClipboardOpts();
  editor.cut(audioContext, activeTrack.clipboard, activeTrack.audiosource.buffer, onComplete);
});

pasteBtn.addEventListener('click', function() {
  var activeTrack = getActiveTrack();
  if (!activeTrack) return;
  var onComplete = function(buf) {
    activeTrack.audiosource.buffer = buf;
    console.log('cb called paste');
    activeTrack.drawWaves();
  };

  editor.paste(audioContext, activeTrack.clipboard, activeTrack.audiosource.buffer, activeTrack.clipboard.at, onComplete);
  hidePasteCursors();
});

prependBtn.addEventListener('click', function() {
  var activeTrack = getActiveTrack();
  if (!activeTrack) return;
  var onComplete = function(buf) {
    activeTrack.audiosource.buffer = buf;
    activeTrack.drawWaves();
  };

  editor.paste(audioContext, activeTrack.clipboard, activeTrack.audiosource.buffer, 0, onComplete);
});

appendBtn.addEventListener('click', function() {
  var activeTrack = getActiveTrack();
  if (!activeTrack) return;
  var onComplete = function(buf) {
    activeTrack.audiosource.buffer = buf;
    activeTrack.drawWaves();
  };

  editor.paste(audioContext, activeTrack.clipboard, activeTrack.audiosource.buffer, activeTrack.audiosource.buffer.duration, onComplete);
});

reverseBtn.addEventListener('click', function() {
  var activeTrack = getActiveTrack();
  if (!activeTrack) return;
  var onComplete = function() {
    activeTrack.drawWaves();
  };

  editor.reverse(activeTrack.audiosource.buffer, onComplete);
});

duplicateBtn.addEventListener('click', function() {
  var activeTrack = getActiveTrack();
  if (!activeTrack) return;

  var onComplete = function() {
    console.log('duplicating buffer: ', activeTrack.clipboard.buffer);
    newTrackFromAudioBuffer(activeTrack.clipboard.buffer);
  };

  if (activeTrack.clipboard.buffer) {
    onComplete();
  } else if (activeTrack.clipboard.start === 0 && activeTrack.clipboard.end === 0) {
    activeTrack.clipboard.end = activeTrack.audiosource.buffer.duration;
    editor.copy(audioContext, activeTrack.clipboard, activeTrack.audiosource.buffer, onComplete);
  } else {
    editor.copy(audioContext, activeTrack.clipboard, activeTrack.audiosource.buffer, onComplete);
  }
});

function getActiveTrack() {
  var activeTracks = [];
  Object.keys(tracks).forEach(function(key) {
    if (tracks[key].active) activeTracks.push(tracks[key]);
  });

  if (activeTracks.length > 1) {
    alert('You cannot have more than one activated track for this option');
  } else if(!activeTracks.length) {
    alert('There is no active track');
  } else {
    return activeTracks[0];
  }
}

function newTrackFromAudioBuffer(audioBuffer) {
  var containerEl = trackTmp({
    title: "Track 1"
  });
  var id = uniqId();
  workspaceEl.appendChild(containerEl);
  tracks[id] = new Track({
    id: id,
    containEl: containerEl,
    context: audioContext,
    gainNode: audioContext.createGain()
  });

  tracks[id].audiosource = new AudioSource(audioContext, {
    gainNode: tracks[id].gainNode
  });

  tracks[id].audiosource.buffer = audioBuffer;

  tracks[id].adjustWave();
  tracks[id].drawWaves();
  tracks[id].fileIndicator.remove();
}

function newTrackFromFile(file) {
  if (file === undefined) return;
  if (!~file.type.indexOf('audio')) {
    alert('audio files only please.');
    // alert(file.type + ' files are not supported.');
    return;
  }
  welcome.style.display = 'none';
  var trackEl = trackTmp();
  var id = uniqId();

  var controlEl = controlTmp({
    title: file.name
  });

  controlSpaceEl.appendChild(controlEl);
  trackSpaceEl.appendChild(trackEl);
  tracks[id] = new Track({
    title: file.name,
    id: id,
    trackEl: trackEl,
    controlEl: controlEl,
    context: audioContext
  });
  tracks[id].emitter.on('tracks:remove', function(ev) {
    tracks[ev.id] = null;
    delete tracks[ev.id];
    this.removeAllListeners();
    showWelcome();
  });
  tracks[id].loadFile(file);
  enablePlaybackOpts();
}

function newTrackFromURL(url) {
  welcome.style.display = 'none';
  var trackEl = trackTmp();
  var controlEl = controlTmp({
    title: "Recording 1"
  });
  var id = uniqId();

  controlSpaceEl.appendChild(controlEl);
  trackSpaceEl.appendChild(trackEl);
  tracks[id] = new Track({
    title: "Recording 1",
    id: id,
    trackEl: trackEl,
    controlEl: controlEl,
    context: audioContext
  });
  tracks[id].emitter.on('tracks:remove', function(ev) {
    tracks[ev.id] = null;
    delete tracks[ev.id];
    this.removeAllListeners();
    showWelcome();
  });
  tracks[id].loadURL(url);
  enablePlaybackOpts();
}

function showWelcome() {
  if (!Object.keys(tracks).length) welcome.style.display = 'block';
}

},{"../templates/control-tmp":"/home/meandave/Code/metastaseis/templates/control-tmp.js","../templates/track-tmp":"/home/meandave/Code/metastaseis/templates/track-tmp.js","./lib/edits":"/home/meandave/Code/metastaseis/public/lib/edits.js","./lib/record":"/home/meandave/Code/metastaseis/public/lib/record.js","./lib/track":"/home/meandave/Code/metastaseis/public/lib/track.js","audio-fft":"/home/meandave/Code/metastaseis/node_modules/audio-fft/index.js","audiocontext":"/home/meandave/Code/metastaseis/node_modules/audiocontext/src/audiocontext.js","audiosource":"/home/meandave/Code/metastaseis/node_modules/audiosource/index.js","drag-drop":"/home/meandave/Code/metastaseis/node_modules/drag-drop/index.js","events":"/home/meandave/Code/metastaseis/node_modules/watchify/node_modules/browserify/node_modules/events/events.js"}],"/home/meandave/Code/metastaseis/templates/control-tmp.js":[function(require,module,exports){
var h = require('hyperscript');

module.exports = function(data) {
  return h('div.control',
           h('header', {"data-tip-content": data.title, "data-has-tip": "right"},
             h('p', data.title)),
           h('ul.actions',
             h('li.activate.active', {"data-tip-content": "activate", "data-has-tip": "bottom"}),
             h('li.edit.active', {"data-tip-content": "edit", "data-has-tip": "bottom"}),
             h('li.mute', {"data-tip-content": "mute", "data-has-tip": "bottom"}),
             h('li.export', {"data-tip-content": "export", "data-has-tip": "bottom"}),
             h('li.collapse', {"data-tip-content": "collapse", "data-has-tip": "bottom"}),
             h('li.remove', {"data-tip-content": "remove", "data-has-tip": "bottom"})),

           h('article.info',
             h('div.volume',
               h('span.volume-bar')),
             h('p', "Current Time: ",
               h('i.cur', "00:00:00")),
             h('p', "Duration: ",
               h('i.dur', "00:00:00")),
             h('p', "Remaining: ",
               h('i.rem', "00:00:00"))));
}
},{"hyperscript":"/home/meandave/Code/metastaseis/node_modules/hyperscript/index.js"}],"/home/meandave/Code/metastaseis/templates/track-tmp.js":[function(require,module,exports){
var h = require('hyperscript');

module.exports = function() {
  return h('div.track.active',
           h('p',
             "drag file 2 edit"),
           h('div.play-cursor'),
           h('div.selection'),
           h('div.wave.selectable',
             h('canvas', {'height': '300', 'draggable': 'false'})),
           h('div.wave-progress.selectable',
             h('canvas', {'height': '300', 'draggable': 'false'})));
}

},{"hyperscript":"/home/meandave/Code/metastaseis/node_modules/hyperscript/index.js"}]},{},["/home/meandave/Code/metastaseis/public/main.js"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzL2F1ZGlvLWZmdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9hdWRpb2NvbnRleHQvc3JjL2F1ZGlvY29udGV4dC5qcyIsIm5vZGVfbW9kdWxlcy9hdWRpb3NvdXJjZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kcmFnLWRyb3AvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZHJhZy1kcm9wL25vZGVfbW9kdWxlcy9sb2Rhc2gudGhyb3R0bGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZHJhZy1kcm9wL25vZGVfbW9kdWxlcy9sb2Rhc2gudGhyb3R0bGUvbm9kZV9tb2R1bGVzL2xvZGFzaC5kZWJvdW5jZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kcmFnLWRyb3Avbm9kZV9tb2R1bGVzL2xvZGFzaC50aHJvdHRsZS9ub2RlX21vZHVsZXMvbG9kYXNoLmRlYm91bmNlL25vZGVfbW9kdWxlcy9sb2Rhc2gubm93L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2RyYWctZHJvcC9ub2RlX21vZHVsZXMvbG9kYXNoLnRocm90dGxlL25vZGVfbW9kdWxlcy9sb2Rhc2guZGVib3VuY2Uvbm9kZV9tb2R1bGVzL2xvZGFzaC5ub3cvbm9kZV9tb2R1bGVzL2xvZGFzaC5faXNuYXRpdmUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZHJhZy1kcm9wL25vZGVfbW9kdWxlcy9sb2Rhc2gudGhyb3R0bGUvbm9kZV9tb2R1bGVzL2xvZGFzaC5pc2Z1bmN0aW9uL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2RyYWctZHJvcC9ub2RlX21vZHVsZXMvbG9kYXNoLnRocm90dGxlL25vZGVfbW9kdWxlcy9sb2Rhc2guaXNvYmplY3QvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZHJhZy1kcm9wL25vZGVfbW9kdWxlcy9sb2Rhc2gudGhyb3R0bGUvbm9kZV9tb2R1bGVzL2xvZGFzaC5pc29iamVjdC9ub2RlX21vZHVsZXMvbG9kYXNoLl9vYmplY3R0eXBlcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9oeXBlcnNjcmlwdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9oeXBlcnNjcmlwdC9ub2RlX21vZHVsZXMvYnJvd3Nlci1zcGxpdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9oeXBlcnNjcmlwdC9ub2RlX21vZHVsZXMvY2xhc3MtbGlzdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9oeXBlcnNjcmlwdC9ub2RlX21vZHVsZXMvY2xhc3MtbGlzdC9ub2RlX21vZHVsZXMvaW5kZXhvZi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9yYWYvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcmFmL25vZGVfbW9kdWxlcy9wZXJmb3JtYW5jZS1ub3cvbGliL3BlcmZvcm1hbmNlLW5vdy5qcyIsIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIiwibm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJwdWJsaWMvbGliL2NvbG9ycy5qcyIsInB1YmxpYy9saWIvZHJhdy1idWZmZXIuanMiLCJwdWJsaWMvbGliL2VkaXRzLmpzIiwicHVibGljL2xpYi9mb3JtYXQtdGltZS5qcyIsInB1YmxpYy9saWIvcmVjb3JkLmpzIiwicHVibGljL2xpYi90aW1lbGluZS5qcyIsInB1YmxpYy9saWIvdHJhY2suanMiLCJwdWJsaWMvbWFpbi5qcyIsInRlbXBsYXRlcy9jb250cm9sLXRtcC5qcyIsInRlbXBsYXRlcy90cmFjay10bXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2WEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogcHVsbGVkIGZyb20gQGpzYW50ZWxsXG4gKlxuICogaHR0cHM6Ly9naXRodWIuY29tL2pzYW50ZWxsL2RzcC13aXRoLXdlYi1hdWRpby1wcmVzZW50YXRpb24vYmxvYi9naC1wYWdlcy9leGFtcGxlcy9GRlQuanNcbiAqXG4gKi9cblxudmFyIE1BWF9VSU5UOCA9IDI1NTtcblxubW9kdWxlLmV4cG9ydHMgPSBGRlQ7XG5cbmZ1bmN0aW9uIEZGVCAoY3R4LCBvcHRpb25zKSB7XG4gIHZhciBtb2R1bGUgPSB0aGlzO1xuICB0aGlzLmNhbnZhcyA9IG9wdGlvbnMuY2FudmFzO1xuICB0aGlzLm9uQmVhdCA9IG9wdGlvbnMub25CZWF0O1xuICB0aGlzLm9mZkJlYXQgPSBvcHRpb25zLm9mZkJlYXQ7XG4gIHRoaXMudHlwZSA9IG9wdGlvbnMudHlwZSB8fCAnZnJlcXVlbmN5JztcbiAgdGhpcy5zcGFjaW5nID0gb3B0aW9ucy5zcGFjaW5nIHx8IDE7XG4gIHRoaXMud2lkdGggPSBvcHRpb25zLndpZHRoIHx8IDE7XG4gIHRoaXMuY291bnQgPSBvcHRpb25zLmNvdW50IHx8IDUxMjtcbiAgdGhpcy5pbnB1dCA9IHRoaXMub3V0cHV0ID0gY3R4LmNyZWF0ZUFuYWx5c2VyKCk7XG4gIHRoaXMucHJvYyA9IGN0eC5jcmVhdGVTY3JpcHRQcm9jZXNzb3IoMjU2LCAxLCAxKTtcbiAgdGhpcy5kYXRhID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5pbnB1dC5mcmVxdWVuY3lCaW5Db3VudCk7XG4gIHRoaXMuY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuICB0aGlzLmRlY2F5ID0gb3B0aW9ucy5kZWNheSB8fCAwLjAwMjtcbiAgdGhpcy50aHJlc2hvbGQgPSBvcHRpb25zLnRocmVzaG9sZCB8fCAwLjU7XG4gIHRoaXMucmFuZ2UgPSBvcHRpb25zLnJhbmdlIHx8IFswLCB0aGlzLmRhdGEubGVuZ3RoLTFdO1xuICB0aGlzLndhaXQgPSBvcHRpb25zLndhaXQgfHwgNTEyO1xuXG4gIHRoaXMuaCA9IHRoaXMuY2FudmFzLmhlaWdodDtcbiAgdGhpcy53ID0gdGhpcy5jYW52YXMud2lkdGg7XG5cbiAgdGhpcy5pbnB1dC5jb25uZWN0KHRoaXMucHJvYyk7XG4gIHRoaXMucHJvYy5vbmF1ZGlvcHJvY2VzcyA9IHByb2Nlc3MuYmluZChudWxsLCBtb2R1bGUpO1xuICB0aGlzLmN0eC5saW5lV2lkdGggPSBtb2R1bGUud2lkdGg7XG59XG5cbkZGVC5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uIChub2RlKSB7XG4gIHRoaXMub3V0cHV0LmNvbm5lY3Qobm9kZSk7XG4gIHRoaXMucHJvYy5jb25uZWN0KG5vZGUpO1xufVxuXG5mdW5jdGlvbiBwcm9jZXNzIChtb2R1bGUpIHtcblxuICB2YXIgY3R4ID0gbW9kdWxlLmN0eDtcbiAgdmFyIGRhdGEgPSBtb2R1bGUuZGF0YTtcbiAgY3R4LmNsZWFyUmVjdCgwLCAwLCBtb2R1bGUudywgbW9kdWxlLmgpO1xuICBjdHguZmlsbFN0eWxlID0gbW9kdWxlLmZpbGxTdHlsZSB8fCAnIzAwMDAwMCc7XG4gIGN0eC5zdHJva2VTdHlsZSA9IG1vZHVsZS5zdHJva2VTdHlsZSB8fCAnIzAwMDAwMCc7XG5cbiAgaWYgKG1vZHVsZS50eXBlID09PSAnZnJlcXVlbmN5Jykge1xuICAgIG1vZHVsZS5pbnB1dC5nZXRCeXRlRnJlcXVlbmN5RGF0YShkYXRhKTtcbiAgICAvLyBBYm9ydCBpZiBubyBkYXRhIGNvbWluZyB0aHJvdWdoLCBxdWljayBoYWNrLCBuZWVkcyBmaXhlZFxuICAgIGlmIChtb2R1bGUuZGF0YVszXSA8IDUpIHJldHVybjtcblxuICAgIGZvciAodmFyIGk9IDAsIGwgPSBkYXRhLmxlbmd0aDsgaSA8IGwgJiYgaSA8IG1vZHVsZS5jb3VudDsgaSsrKSB7XG4gICAgICBjdHguZmlsbFJlY3QoXG4gICAgICAgIGkgKiAobW9kdWxlLnNwYWNpbmcgKyBtb2R1bGUud2lkdGgpLFxuICAgICAgICBtb2R1bGUuaCxcbiAgICAgICAgbW9kdWxlLndpZHRoLFxuICAgICAgICAtKG1vZHVsZS5oIC8gTUFYX1VJTlQ4KSAqIGRhdGFbaV1cbiAgICAgICk7XG4gICAgfVxuICB9XG4gIGVsc2UgaWYgKG1vZHVsZS50eXBlID09PSAndGltZScpIHtcbiAgICBtb2R1bGUuaW5wdXQuZ2V0Qnl0ZVRpbWVEb21haW5EYXRhKGRhdGEpO1xuICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICBjdHgubW92ZVRvKDAsIG1vZHVsZS5oIC8gMik7XG4gICAgZm9yICh2YXIgaT0gMCwgbCA9IGRhdGEubGVuZ3RoOyBpIDwgbCAmJiBpIDwgbW9kdWxlLmNvdW50OyBpKyspIHtcbiAgICAgIGN0eC5saW5lVG8oXG4gICAgICAgIGkgKiAobW9kdWxlLnNwYWNpbmcgKyBtb2R1bGUud2lkdGgpLFxuICAgICAgICAobW9kdWxlLmggLyBNQVhfVUlOVDgpICogZGF0YVtpXVxuICAgICAgKTtcbiAgICB9XG4gICAgY3R4LnN0cm9rZSgpO1xuICAgIGN0eC5jbG9zZVBhdGgoKTtcbiAgfVxufVxuIiwiLypcbiAqIFdlYiBBdWRpbyBBUEkgQXVkaW9Db250ZXh0IHNoaW1cbiAqL1xuKGZ1bmN0aW9uIChkZWZpbml0aW9uKSB7XG4gICAgaWYgKHR5cGVvZiBleHBvcnRzID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gZGVmaW5pdGlvbigpO1xuICAgIH1cbn0pKGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDtcbn0pO1xuIiwiLypcbiAqIEF1ZGlvU291cmNlXG4gKlxuICogKiBNVVNUIHBhc3MgYW4gYXVkaW8gY29udGV4dFxuICpcbiAqL1xuZnVuY3Rpb24gQXVkaW9Tb3VyY2UgKGNvbnRleHQsIG9wdHMpIHtcbiAgaWYgKCFjb250ZXh0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdZb3UgbXVzdCBwYXNzIGFuIGF1ZGlvIGNvbnRleHQgdG8gdXNlIHRoaXMgbW9kdWxlJyk7XG4gIH1cbiAgaWYgKG9wdHMgPT09IHVuZGVmaW5lZCkgb3B0cyA9IHt9O1xuXG4gIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gIHRoaXMuYnVmZmVyID0gdW5kZWZpbmVkO1xuICB0aGlzLnVybCA9IG9wdHMudXJsID8gb3B0cy51cmwgOiB1bmRlZmluZWQ7XG4gIHRoaXMuZmZ0cyA9IG9wdHMuZmZ0cyA/IG9wdHMuZmZ0cyA6IFtdO1xuICB0aGlzLmdhaW5Ob2RlID0gb3B0cy5nYWluTm9kZSA/IG9wdHMuZ2Fpbk5vZGUgOiB1bmRlZmluZWQ7XG59XG5cbkF1ZGlvU291cmNlLnByb3RvdHlwZSA9IHtcbiAgbmVlZEJ1ZmZlcjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuYnVmZmVyID09PSB1bmRlZmluZWQ7XG4gIH0sXG4gIGxvYWRTb3VuZDogZnVuY3Rpb24odXJsLCBjYikge1xuICAgIHZhciByZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICByZXEub3BlbignR0VUJywgdXJsLCB0cnVlKTtcbiAgICByZXEucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmVxLm9ubG9hZGVuZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgc2VsZi5kZWNvZGUuY2FsbChzZWxmLCByZXEucmVzcG9uc2UsIGNiKTtcbiAgICB9O1xuICAgIHJlcS5zZW5kKCk7XG4gIH0sXG4gIGdldEJ1ZmZlcjogZnVuY3Rpb24oY2IpIHtcbiAgICBpZiAoIXRoaXMubmVlZEJ1ZmZlcigpKSByZXR1cm47XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMubG9hZFNvdW5kKHRoaXMudXJsLCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICBzZWxmLm9uTG9hZGVkLmNhbGwoc2VsZiwgZGF0YSwgdHJ1ZSk7XG4gICAgfSk7XG4gIH0sXG4gIGdldFNvdXJjZTogZnVuY3Rpb24oY2IpIHtcbiAgICBpZiAodGhpcy5zb3VyY2UpIHtcbiAgICAgIGNiKHRoaXMuc291cmNlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdGhpcy5kaXNjb25uZWN0KCk7XG4gICAgICB0aGlzLmxvYWRTb3VuZCh0aGlzLnVybCwgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICB0aGlzLnNvdXJjZSA9IHNlbGYuY3JlYXRlU291cmNlLmNhbGwoc2VsZiwgZGF0YSwgdHJ1ZSk7XG4gICAgICAgIGNiKHRoaXMuc291cmNlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcbiAgb25Mb2FkZWQ6IGZ1bmN0aW9uKHNvdXJjZSwgc2lsZW50KSB7XG4gICAgdGhpcy5idWZmZXIgPSBzb3VyY2U7XG4gICAgdGhpcy5kaXNjb25uZWN0KCk7XG4gICAgdGhpcy5zb3VyY2UgPSB0aGlzLmNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG4gICAgdGhpcy5zb3VyY2UuYnVmZmVyID0gdGhpcy5idWZmZXI7XG4gICAgdGhpcy5zb3VyY2UuY29ubmVjdCh0aGlzLmdhaW5Ob2RlKTtcbiAgICB0aGlzLmZmdHMuZm9yRWFjaChmdW5jdGlvbihmZnQpIHtcbiAgICAgIHRoaXMuZ2Fpbk5vZGUuY29ubmVjdChmZnQuaW5wdXQpO1xuICAgIH0sIHRoaXMpO1xuICAgIHRoaXMuZ2Fpbk5vZGUuY29ubmVjdCh0aGlzLmNvbnRleHQuZGVzdGluYXRpb24pO1xuICAgIHRoaXMuZmZ0cy5mb3JFYWNoKGZ1bmN0aW9uKGZmdCkge1xuICAgICAgZmZ0LmNvbm5lY3QodGhpcy5jb250ZXh0LmRlc3RpbmF0aW9uKTtcbiAgICB9LCB0aGlzKTtcbiAgICBpZiAoIXNpbGVudCkgdGhpcy5wbGF5U291bmQoKTtcbiAgfSxcbiAgZGlzY29ubmVjdDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuc291cmNlKSB7XG4gICAgICB0aGlzLnNvdXJjZS5kaXNjb25uZWN0KHRoaXMuY29udGV4dC5kZXN0aW5hdGlvbik7XG4gICAgfVxuICB9LFxuICBwbGF5U291bmQ6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLnBsYXlUaW1lKSB7XG4gICAgICB0aGlzLnNvdXJjZS5zdGFydCgwLCB0aGlzLm9mZnNldCk7XG4gICAgfVxuXG4gICAgdGhpcy5wbGF5VGltZSA9IHRoaXMuY29udGV4dC5jdXJyZW50VGltZTtcbiAgfSxcbiAgbG9hZFNpbGVudDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLm5lZWRCdWZmZXIoKSkgcmV0dXJuO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmxvYWRTb3VuZCh0aGlzLnVybCwgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgc2VsZi5vbkxvYWRlZC5jYWxsKHNlbGYsIGRhdGEsIHRydWUpO1xuICAgIH0pO1xuICB9LFxuICBwbGF5OiBmdW5jdGlvbihzdGFydHRpbWUsIG9mZnNldCkge1xuICAgIHRoaXMucGxheVRpbWUgPSBzdGFydHRpbWUgPyBzdGFydHRpbWUgOiB0aGlzLmNvbnRleHQuY3VycmVudFRpbWU7XG4gICAgdGhpcy5vZmZzZXQgPSBvZmZzZXQgPyBvZmZzZXQgOiAwO1xuXG4gICAgaWYgKHRoaXMubmVlZEJ1ZmZlcigpKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB0aGlzLmxvYWRTb3VuZCh0aGlzLnVybCwgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICBzZWxmLm9uTG9hZGVkLmNhbGwoc2VsZiwgZGF0YSk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5vbkxvYWRlZCh0aGlzLmJ1ZmZlcik7XG4gICAgfVxuICB9LFxuICBzdG9wOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNvdXJjZS5zdG9wKHRoaXMuY29udGV4dC5jdXJyZW50VGltZSk7XG4gIH0sXG4gIGRlY29kZTogZnVuY3Rpb24oZGF0YSwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICB0aGlzLmNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKGRhdGEsIHN1Y2Nlc3MsIGVycm9yKTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBBdWRpb1NvdXJjZTtcbiIsIm1vZHVsZS5leHBvcnRzID0gRHJhZ0Ryb3BcblxudmFyIHRocm90dGxlID0gcmVxdWlyZSgnbG9kYXNoLnRocm90dGxlJylcblxuZnVuY3Rpb24gRHJhZ0Ryb3AgKGVsZW0sIGNiKSB7XG4gIGlmICh0eXBlb2YgZWxlbSA9PT0gJ3N0cmluZycpIGVsZW0gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGVsZW0pXG4gIGVsZW0uYWRkRXZlbnRMaXN0ZW5lcignZHJhZ2VudGVyJywga2lsbEV2ZW50LCBmYWxzZSlcbiAgZWxlbS5hZGRFdmVudExpc3RlbmVyKCdkcmFnb3ZlcicsIG1ha2VPbkRyYWdPdmVyKGVsZW0pLCBmYWxzZSlcbiAgZWxlbS5hZGRFdmVudExpc3RlbmVyKCdkcm9wJywgb25Ecm9wLmJpbmQodW5kZWZpbmVkLCBlbGVtLCBjYiksIGZhbHNlKVxufVxuXG5mdW5jdGlvbiBraWxsRXZlbnQgKGUpIHtcbiAgZS5zdG9wUHJvcGFnYXRpb24oKVxuICBlLnByZXZlbnREZWZhdWx0KClcbiAgcmV0dXJuIGZhbHNlXG59XG5cbmZ1bmN0aW9uIG1ha2VPbkRyYWdPdmVyIChlbGVtKSB7XG4gIHZhciBmbiA9IHRocm90dGxlKGZ1bmN0aW9uICgpIHtcbiAgICBlbGVtLmNsYXNzTGlzdC5hZGQoJ2RyYWcnKVxuXG4gICAgaWYgKGVsZW0udGltZW91dCkgY2xlYXJUaW1lb3V0KGVsZW0udGltZW91dClcbiAgICBlbGVtLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgIGVsZW0uY2xhc3NMaXN0LnJlbW92ZSgnZHJhZycpXG4gICAgfSwgMTUwKVxuICB9LCAxMDAsIHt0cmFpbGluZzogZmFsc2V9KVxuXG4gIHJldHVybiBmdW5jdGlvbiAoZSkge1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBlLmRhdGFUcmFuc2Zlci5kcm9wRWZmZWN0ID0gJ2NvcHknXG4gICAgZm4oKVxuICB9XG59XG5cbmZ1bmN0aW9uIG9uRHJvcCAoZWxlbSwgY2IsIGUpIHtcbiAgZS5zdG9wUHJvcGFnYXRpb24oKVxuICBlLnByZXZlbnREZWZhdWx0KClcbiAgZWxlbS5jbGFzc0xpc3QucmVtb3ZlKCdkcmFnJylcbiAgY2IoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZS5kYXRhVHJhbnNmZXIuZmlsZXMpLCB7IHg6IGUuY2xpZW50WCwgeTogZS5jbGllbnRZIH0pXG4gIHJldHVybiBmYWxzZVxufVxuIiwiLyoqXG4gKiBMby1EYXNoIDIuNC4xIChDdXN0b20gQnVpbGQpIDxodHRwOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIG1vZGVybiBleHBvcnRzPVwibnBtXCIgLW8gLi9ucG0vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxMyBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS41LjIgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHA6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cbnZhciBkZWJvdW5jZSA9IHJlcXVpcmUoJ2xvZGFzaC5kZWJvdW5jZScpLFxuICAgIGlzRnVuY3Rpb24gPSByZXF1aXJlKCdsb2Rhc2guaXNmdW5jdGlvbicpLFxuICAgIGlzT2JqZWN0ID0gcmVxdWlyZSgnbG9kYXNoLmlzb2JqZWN0Jyk7XG5cbi8qKiBVc2VkIGFzIGFuIGludGVybmFsIGBfLmRlYm91bmNlYCBvcHRpb25zIG9iamVjdCAqL1xudmFyIGRlYm91bmNlT3B0aW9ucyA9IHtcbiAgJ2xlYWRpbmcnOiBmYWxzZSxcbiAgJ21heFdhaXQnOiAwLFxuICAndHJhaWxpbmcnOiBmYWxzZVxufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgZnVuY3Rpb24gdGhhdCwgd2hlbiBleGVjdXRlZCwgd2lsbCBvbmx5IGNhbGwgdGhlIGBmdW5jYCBmdW5jdGlvblxuICogYXQgbW9zdCBvbmNlIHBlciBldmVyeSBgd2FpdGAgbWlsbGlzZWNvbmRzLiBQcm92aWRlIGFuIG9wdGlvbnMgb2JqZWN0IHRvXG4gKiBpbmRpY2F0ZSB0aGF0IGBmdW5jYCBzaG91bGQgYmUgaW52b2tlZCBvbiB0aGUgbGVhZGluZyBhbmQvb3IgdHJhaWxpbmcgZWRnZVxuICogb2YgdGhlIGB3YWl0YCB0aW1lb3V0LiBTdWJzZXF1ZW50IGNhbGxzIHRvIHRoZSB0aHJvdHRsZWQgZnVuY3Rpb24gd2lsbFxuICogcmV0dXJuIHRoZSByZXN1bHQgb2YgdGhlIGxhc3QgYGZ1bmNgIGNhbGwuXG4gKlxuICogTm90ZTogSWYgYGxlYWRpbmdgIGFuZCBgdHJhaWxpbmdgIG9wdGlvbnMgYXJlIGB0cnVlYCBgZnVuY2Agd2lsbCBiZSBjYWxsZWRcbiAqIG9uIHRoZSB0cmFpbGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0IG9ubHkgaWYgdGhlIHRoZSB0aHJvdHRsZWQgZnVuY3Rpb24gaXNcbiAqIGludm9rZWQgbW9yZSB0aGFuIG9uY2UgZHVyaW5nIHRoZSBgd2FpdGAgdGltZW91dC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IEZ1bmN0aW9uc1xuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gdGhyb3R0bGUuXG4gKiBAcGFyYW0ge251bWJlcn0gd2FpdCBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byB0aHJvdHRsZSBleGVjdXRpb25zIHRvLlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBUaGUgb3B0aW9ucyBvYmplY3QuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmxlYWRpbmc9dHJ1ZV0gU3BlY2lmeSBleGVjdXRpb24gb24gdGhlIGxlYWRpbmcgZWRnZSBvZiB0aGUgdGltZW91dC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHJhaWxpbmc9dHJ1ZV0gU3BlY2lmeSBleGVjdXRpb24gb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyB0aHJvdHRsZWQgZnVuY3Rpb24uXG4gKiBAZXhhbXBsZVxuICpcbiAqIC8vIGF2b2lkIGV4Y2Vzc2l2ZWx5IHVwZGF0aW5nIHRoZSBwb3NpdGlvbiB3aGlsZSBzY3JvbGxpbmdcbiAqIHZhciB0aHJvdHRsZWQgPSBfLnRocm90dGxlKHVwZGF0ZVBvc2l0aW9uLCAxMDApO1xuICogalF1ZXJ5KHdpbmRvdykub24oJ3Njcm9sbCcsIHRocm90dGxlZCk7XG4gKlxuICogLy8gZXhlY3V0ZSBgcmVuZXdUb2tlbmAgd2hlbiB0aGUgY2xpY2sgZXZlbnQgaXMgZmlyZWQsIGJ1dCBub3QgbW9yZSB0aGFuIG9uY2UgZXZlcnkgNSBtaW51dGVzXG4gKiBqUXVlcnkoJy5pbnRlcmFjdGl2ZScpLm9uKCdjbGljaycsIF8udGhyb3R0bGUocmVuZXdUb2tlbiwgMzAwMDAwLCB7XG4gKiAgICd0cmFpbGluZyc6IGZhbHNlXG4gKiB9KSk7XG4gKi9cbmZ1bmN0aW9uIHRocm90dGxlKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcbiAgdmFyIGxlYWRpbmcgPSB0cnVlLFxuICAgICAgdHJhaWxpbmcgPSB0cnVlO1xuXG4gIGlmICghaXNGdW5jdGlvbihmdW5jKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3I7XG4gIH1cbiAgaWYgKG9wdGlvbnMgPT09IGZhbHNlKSB7XG4gICAgbGVhZGluZyA9IGZhbHNlO1xuICB9IGVsc2UgaWYgKGlzT2JqZWN0KG9wdGlvbnMpKSB7XG4gICAgbGVhZGluZyA9ICdsZWFkaW5nJyBpbiBvcHRpb25zID8gb3B0aW9ucy5sZWFkaW5nIDogbGVhZGluZztcbiAgICB0cmFpbGluZyA9ICd0cmFpbGluZycgaW4gb3B0aW9ucyA/IG9wdGlvbnMudHJhaWxpbmcgOiB0cmFpbGluZztcbiAgfVxuICBkZWJvdW5jZU9wdGlvbnMubGVhZGluZyA9IGxlYWRpbmc7XG4gIGRlYm91bmNlT3B0aW9ucy5tYXhXYWl0ID0gd2FpdDtcbiAgZGVib3VuY2VPcHRpb25zLnRyYWlsaW5nID0gdHJhaWxpbmc7XG5cbiAgcmV0dXJuIGRlYm91bmNlKGZ1bmMsIHdhaXQsIGRlYm91bmNlT3B0aW9ucyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdGhyb3R0bGU7XG4iLCIvKipcbiAqIExvLURhc2ggMi40LjEgKEN1c3RvbSBCdWlsZCkgPGh0dHA6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZHVsYXJpemUgbW9kZXJuIGV4cG9ydHM9XCJucG1cIiAtbyAuL25wbS9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDEzIFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjUuMiA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTMgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cDovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xudmFyIGlzRnVuY3Rpb24gPSByZXF1aXJlKCdsb2Rhc2guaXNmdW5jdGlvbicpLFxuICAgIGlzT2JqZWN0ID0gcmVxdWlyZSgnbG9kYXNoLmlzb2JqZWN0JyksXG4gICAgbm93ID0gcmVxdWlyZSgnbG9kYXNoLm5vdycpO1xuXG4vKiBOYXRpdmUgbWV0aG9kIHNob3J0Y3V0cyBmb3IgbWV0aG9kcyB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgb3RoZXIgYGxvZGFzaGAgbWV0aG9kcyAqL1xudmFyIG5hdGl2ZU1heCA9IE1hdGgubWF4O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgZGVsYXkgdGhlIGV4ZWN1dGlvbiBvZiBgZnVuY2AgdW50aWwgYWZ0ZXJcbiAqIGB3YWl0YCBtaWxsaXNlY29uZHMgaGF2ZSBlbGFwc2VkIHNpbmNlIHRoZSBsYXN0IHRpbWUgaXQgd2FzIGludm9rZWQuXG4gKiBQcm92aWRlIGFuIG9wdGlvbnMgb2JqZWN0IHRvIGluZGljYXRlIHRoYXQgYGZ1bmNgIHNob3VsZCBiZSBpbnZva2VkIG9uXG4gKiB0aGUgbGVhZGluZyBhbmQvb3IgdHJhaWxpbmcgZWRnZSBvZiB0aGUgYHdhaXRgIHRpbWVvdXQuIFN1YnNlcXVlbnQgY2FsbHNcbiAqIHRvIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gd2lsbCByZXR1cm4gdGhlIHJlc3VsdCBvZiB0aGUgbGFzdCBgZnVuY2AgY2FsbC5cbiAqXG4gKiBOb3RlOiBJZiBgbGVhZGluZ2AgYW5kIGB0cmFpbGluZ2Agb3B0aW9ucyBhcmUgYHRydWVgIGBmdW5jYCB3aWxsIGJlIGNhbGxlZFxuICogb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQgb25seSBpZiB0aGUgdGhlIGRlYm91bmNlZCBmdW5jdGlvbiBpc1xuICogaW52b2tlZCBtb3JlIHRoYW4gb25jZSBkdXJpbmcgdGhlIGB3YWl0YCB0aW1lb3V0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgRnVuY3Rpb25zXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byBkZWJvdW5jZS5cbiAqIEBwYXJhbSB7bnVtYmVyfSB3YWl0IFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRvIGRlbGF5LlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBUaGUgb3B0aW9ucyBvYmplY3QuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmxlYWRpbmc9ZmFsc2VdIFNwZWNpZnkgZXhlY3V0aW9uIG9uIHRoZSBsZWFkaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMubWF4V2FpdF0gVGhlIG1heGltdW0gdGltZSBgZnVuY2AgaXMgYWxsb3dlZCB0byBiZSBkZWxheWVkIGJlZm9yZSBpdCdzIGNhbGxlZC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHJhaWxpbmc9dHJ1ZV0gU3BlY2lmeSBleGVjdXRpb24gb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBkZWJvdW5jZWQgZnVuY3Rpb24uXG4gKiBAZXhhbXBsZVxuICpcbiAqIC8vIGF2b2lkIGNvc3RseSBjYWxjdWxhdGlvbnMgd2hpbGUgdGhlIHdpbmRvdyBzaXplIGlzIGluIGZsdXhcbiAqIHZhciBsYXp5TGF5b3V0ID0gXy5kZWJvdW5jZShjYWxjdWxhdGVMYXlvdXQsIDE1MCk7XG4gKiBqUXVlcnkod2luZG93KS5vbigncmVzaXplJywgbGF6eUxheW91dCk7XG4gKlxuICogLy8gZXhlY3V0ZSBgc2VuZE1haWxgIHdoZW4gdGhlIGNsaWNrIGV2ZW50IGlzIGZpcmVkLCBkZWJvdW5jaW5nIHN1YnNlcXVlbnQgY2FsbHNcbiAqIGpRdWVyeSgnI3Bvc3Rib3gnKS5vbignY2xpY2snLCBfLmRlYm91bmNlKHNlbmRNYWlsLCAzMDAsIHtcbiAqICAgJ2xlYWRpbmcnOiB0cnVlLFxuICogICAndHJhaWxpbmcnOiBmYWxzZVxuICogfSk7XG4gKlxuICogLy8gZW5zdXJlIGBiYXRjaExvZ2AgaXMgZXhlY3V0ZWQgb25jZSBhZnRlciAxIHNlY29uZCBvZiBkZWJvdW5jZWQgY2FsbHNcbiAqIHZhciBzb3VyY2UgPSBuZXcgRXZlbnRTb3VyY2UoJy9zdHJlYW0nKTtcbiAqIHNvdXJjZS5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgXy5kZWJvdW5jZShiYXRjaExvZywgMjUwLCB7XG4gKiAgICdtYXhXYWl0JzogMTAwMFxuICogfSwgZmFsc2UpO1xuICovXG5mdW5jdGlvbiBkZWJvdW5jZShmdW5jLCB3YWl0LCBvcHRpb25zKSB7XG4gIHZhciBhcmdzLFxuICAgICAgbWF4VGltZW91dElkLFxuICAgICAgcmVzdWx0LFxuICAgICAgc3RhbXAsXG4gICAgICB0aGlzQXJnLFxuICAgICAgdGltZW91dElkLFxuICAgICAgdHJhaWxpbmdDYWxsLFxuICAgICAgbGFzdENhbGxlZCA9IDAsXG4gICAgICBtYXhXYWl0ID0gZmFsc2UsXG4gICAgICB0cmFpbGluZyA9IHRydWU7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGZ1bmMpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcjtcbiAgfVxuICB3YWl0ID0gbmF0aXZlTWF4KDAsIHdhaXQpIHx8IDA7XG4gIGlmIChvcHRpb25zID09PSB0cnVlKSB7XG4gICAgdmFyIGxlYWRpbmcgPSB0cnVlO1xuICAgIHRyYWlsaW5nID0gZmFsc2U7XG4gIH0gZWxzZSBpZiAoaXNPYmplY3Qob3B0aW9ucykpIHtcbiAgICBsZWFkaW5nID0gb3B0aW9ucy5sZWFkaW5nO1xuICAgIG1heFdhaXQgPSAnbWF4V2FpdCcgaW4gb3B0aW9ucyAmJiAobmF0aXZlTWF4KHdhaXQsIG9wdGlvbnMubWF4V2FpdCkgfHwgMCk7XG4gICAgdHJhaWxpbmcgPSAndHJhaWxpbmcnIGluIG9wdGlvbnMgPyBvcHRpb25zLnRyYWlsaW5nIDogdHJhaWxpbmc7XG4gIH1cbiAgdmFyIGRlbGF5ZWQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcmVtYWluaW5nID0gd2FpdCAtIChub3coKSAtIHN0YW1wKTtcbiAgICBpZiAocmVtYWluaW5nIDw9IDApIHtcbiAgICAgIGlmIChtYXhUaW1lb3V0SWQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KG1heFRpbWVvdXRJZCk7XG4gICAgICB9XG4gICAgICB2YXIgaXNDYWxsZWQgPSB0cmFpbGluZ0NhbGw7XG4gICAgICBtYXhUaW1lb3V0SWQgPSB0aW1lb3V0SWQgPSB0cmFpbGluZ0NhbGwgPSB1bmRlZmluZWQ7XG4gICAgICBpZiAoaXNDYWxsZWQpIHtcbiAgICAgICAgbGFzdENhbGxlZCA9IG5vdygpO1xuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xuICAgICAgICBpZiAoIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XG4gICAgICAgICAgYXJncyA9IHRoaXNBcmcgPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZGVsYXllZCwgcmVtYWluaW5nKTtcbiAgICB9XG4gIH07XG5cbiAgdmFyIG1heERlbGF5ZWQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGltZW91dElkKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICB9XG4gICAgbWF4VGltZW91dElkID0gdGltZW91dElkID0gdHJhaWxpbmdDYWxsID0gdW5kZWZpbmVkO1xuICAgIGlmICh0cmFpbGluZyB8fCAobWF4V2FpdCAhPT0gd2FpdCkpIHtcbiAgICAgIGxhc3RDYWxsZWQgPSBub3coKTtcbiAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XG4gICAgICBpZiAoIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XG4gICAgICAgIGFyZ3MgPSB0aGlzQXJnID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgc3RhbXAgPSBub3coKTtcbiAgICB0aGlzQXJnID0gdGhpcztcbiAgICB0cmFpbGluZ0NhbGwgPSB0cmFpbGluZyAmJiAodGltZW91dElkIHx8ICFsZWFkaW5nKTtcblxuICAgIGlmIChtYXhXYWl0ID09PSBmYWxzZSkge1xuICAgICAgdmFyIGxlYWRpbmdDYWxsID0gbGVhZGluZyAmJiAhdGltZW91dElkO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIW1heFRpbWVvdXRJZCAmJiAhbGVhZGluZykge1xuICAgICAgICBsYXN0Q2FsbGVkID0gc3RhbXA7XG4gICAgICB9XG4gICAgICB2YXIgcmVtYWluaW5nID0gbWF4V2FpdCAtIChzdGFtcCAtIGxhc3RDYWxsZWQpLFxuICAgICAgICAgIGlzQ2FsbGVkID0gcmVtYWluaW5nIDw9IDA7XG5cbiAgICAgIGlmIChpc0NhbGxlZCkge1xuICAgICAgICBpZiAobWF4VGltZW91dElkKSB7XG4gICAgICAgICAgbWF4VGltZW91dElkID0gY2xlYXJUaW1lb3V0KG1heFRpbWVvdXRJZCk7XG4gICAgICAgIH1cbiAgICAgICAgbGFzdENhbGxlZCA9IHN0YW1wO1xuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoIW1heFRpbWVvdXRJZCkge1xuICAgICAgICBtYXhUaW1lb3V0SWQgPSBzZXRUaW1lb3V0KG1heERlbGF5ZWQsIHJlbWFpbmluZyk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpc0NhbGxlZCAmJiB0aW1lb3V0SWQpIHtcbiAgICAgIHRpbWVvdXRJZCA9IGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgIH1cbiAgICBlbHNlIGlmICghdGltZW91dElkICYmIHdhaXQgIT09IG1heFdhaXQpIHtcbiAgICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZGVsYXllZCwgd2FpdCk7XG4gICAgfVxuICAgIGlmIChsZWFkaW5nQ2FsbCkge1xuICAgICAgaXNDYWxsZWQgPSB0cnVlO1xuICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcbiAgICB9XG4gICAgaWYgKGlzQ2FsbGVkICYmICF0aW1lb3V0SWQgJiYgIW1heFRpbWVvdXRJZCkge1xuICAgICAgYXJncyA9IHRoaXNBcmcgPSBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGRlYm91bmNlO1xuIiwiLyoqXG4gKiBMby1EYXNoIDIuNC4xIChDdXN0b20gQnVpbGQpIDxodHRwOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIG1vZGVybiBleHBvcnRzPVwibnBtXCIgLW8gLi9ucG0vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxMyBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS41LjIgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHA6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cbnZhciBpc05hdGl2ZSA9IHJlcXVpcmUoJ2xvZGFzaC5faXNuYXRpdmUnKTtcblxuLyoqXG4gKiBHZXRzIHRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRoYXQgaGF2ZSBlbGFwc2VkIHNpbmNlIHRoZSBVbml4IGVwb2NoXG4gKiAoMSBKYW51YXJ5IDE5NzAgMDA6MDA6MDAgVVRDKS5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IFV0aWxpdGllc1xuICogQGV4YW1wbGVcbiAqXG4gKiB2YXIgc3RhbXAgPSBfLm5vdygpO1xuICogXy5kZWZlcihmdW5jdGlvbigpIHsgY29uc29sZS5sb2coXy5ub3coKSAtIHN0YW1wKTsgfSk7XG4gKiAvLyA9PiBsb2dzIHRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIGl0IHRvb2sgZm9yIHRoZSBkZWZlcnJlZCBmdW5jdGlvbiB0byBiZSBjYWxsZWRcbiAqL1xudmFyIG5vdyA9IGlzTmF0aXZlKG5vdyA9IERhdGUubm93KSAmJiBub3cgfHwgZnVuY3Rpb24oKSB7XG4gIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbm93O1xuIiwiLyoqXG4gKiBMby1EYXNoIDIuNC4xIChDdXN0b20gQnVpbGQpIDxodHRwOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIG1vZGVybiBleHBvcnRzPVwibnBtXCIgLW8gLi9ucG0vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxMyBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS41LjIgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHA6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cblxuLyoqIFVzZWQgZm9yIG5hdGl2ZSBtZXRob2QgcmVmZXJlbmNlcyAqL1xudmFyIG9iamVjdFByb3RvID0gT2JqZWN0LnByb3RvdHlwZTtcblxuLyoqIFVzZWQgdG8gcmVzb2x2ZSB0aGUgaW50ZXJuYWwgW1tDbGFzc11dIG9mIHZhbHVlcyAqL1xudmFyIHRvU3RyaW5nID0gb2JqZWN0UHJvdG8udG9TdHJpbmc7XG5cbi8qKiBVc2VkIHRvIGRldGVjdCBpZiBhIG1ldGhvZCBpcyBuYXRpdmUgKi9cbnZhciByZU5hdGl2ZSA9IFJlZ0V4cCgnXicgK1xuICBTdHJpbmcodG9TdHJpbmcpXG4gICAgLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCAnXFxcXCQmJylcbiAgICAucmVwbGFjZSgvdG9TdHJpbmd8IGZvciBbXlxcXV0rL2csICcuKj8nKSArICckJ1xuKTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBhIG5hdGl2ZSBmdW5jdGlvbi5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGB2YWx1ZWAgaXMgYSBuYXRpdmUgZnVuY3Rpb24sIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gaXNOYXRpdmUodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PSAnZnVuY3Rpb24nICYmIHJlTmF0aXZlLnRlc3QodmFsdWUpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlzTmF0aXZlO1xuIiwiLyoqXG4gKiBMby1EYXNoIDIuNC4xIChDdXN0b20gQnVpbGQpIDxodHRwOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIG1vZGVybiBleHBvcnRzPVwibnBtXCIgLW8gLi9ucG0vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxMyBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS41LjIgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHA6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBhIGZ1bmN0aW9uLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGB2YWx1ZWAgaXMgYSBmdW5jdGlvbiwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzRnVuY3Rpb24oXyk7XG4gKiAvLyA9PiB0cnVlXG4gKi9cbmZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PSAnZnVuY3Rpb24nO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlzRnVuY3Rpb247XG4iLCIvKipcbiAqIExvLURhc2ggMi40LjEgKEN1c3RvbSBCdWlsZCkgPGh0dHA6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZHVsYXJpemUgbW9kZXJuIGV4cG9ydHM9XCJucG1cIiAtbyAuL25wbS9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDEzIFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjUuMiA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTMgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cDovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xudmFyIG9iamVjdFR5cGVzID0gcmVxdWlyZSgnbG9kYXNoLl9vYmplY3R0eXBlcycpO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIHRoZSBsYW5ndWFnZSB0eXBlIG9mIE9iamVjdC5cbiAqIChlLmcuIGFycmF5cywgZnVuY3Rpb25zLCBvYmplY3RzLCByZWdleGVzLCBgbmV3IE51bWJlcigwKWAsIGFuZCBgbmV3IFN0cmluZygnJylgKVxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGB2YWx1ZWAgaXMgYW4gb2JqZWN0LCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNPYmplY3Qoe30pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3QoWzEsIDIsIDNdKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0KDEpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNPYmplY3QodmFsdWUpIHtcbiAgLy8gY2hlY2sgaWYgdGhlIHZhbHVlIGlzIHRoZSBFQ01BU2NyaXB0IGxhbmd1YWdlIHR5cGUgb2YgT2JqZWN0XG4gIC8vIGh0dHA6Ly9lczUuZ2l0aHViLmlvLyN4OFxuICAvLyBhbmQgYXZvaWQgYSBWOCBidWdcbiAgLy8gaHR0cDovL2NvZGUuZ29vZ2xlLmNvbS9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MjI5MVxuICByZXR1cm4gISEodmFsdWUgJiYgb2JqZWN0VHlwZXNbdHlwZW9mIHZhbHVlXSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaXNPYmplY3Q7XG4iLCIvKipcbiAqIExvLURhc2ggMi40LjEgKEN1c3RvbSBCdWlsZCkgPGh0dHA6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZHVsYXJpemUgbW9kZXJuIGV4cG9ydHM9XCJucG1cIiAtbyAuL25wbS9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDEzIFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjUuMiA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTMgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cDovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xuXG4vKiogVXNlZCB0byBkZXRlcm1pbmUgaWYgdmFsdWVzIGFyZSBvZiB0aGUgbGFuZ3VhZ2UgdHlwZSBPYmplY3QgKi9cbnZhciBvYmplY3RUeXBlcyA9IHtcbiAgJ2Jvb2xlYW4nOiBmYWxzZSxcbiAgJ2Z1bmN0aW9uJzogdHJ1ZSxcbiAgJ29iamVjdCc6IHRydWUsXG4gICdudW1iZXInOiBmYWxzZSxcbiAgJ3N0cmluZyc6IGZhbHNlLFxuICAndW5kZWZpbmVkJzogZmFsc2Vcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gb2JqZWN0VHlwZXM7XG4iLCJ2YXIgc3BsaXQgPSByZXF1aXJlKCdicm93c2VyLXNwbGl0JylcbnZhciBDbGFzc0xpc3QgPSByZXF1aXJlKCdjbGFzcy1saXN0JylcbnJlcXVpcmUoJ2h0bWwtZWxlbWVudCcpXG5cbmZ1bmN0aW9uIGNvbnRleHQgKCkge1xuXG4gIHZhciBjbGVhbnVwRnVuY3MgPSBbXVxuXG4gIGZ1bmN0aW9uIGgoKSB7XG4gICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyksIGUgPSBudWxsXG4gICAgZnVuY3Rpb24gaXRlbSAobCkge1xuICAgICAgdmFyIHJcbiAgICAgIGZ1bmN0aW9uIHBhcnNlQ2xhc3MgKHN0cmluZykge1xuICAgICAgICB2YXIgbSA9IHNwbGl0KHN0cmluZywgLyhbXFwuI10/W2EtekEtWjAtOV86LV0rKS8pXG4gICAgICAgIGlmKC9eXFwufCMvLnRlc3QobVsxXSkpXG4gICAgICAgICAgZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgICAgIGZvckVhY2gobSwgZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICB2YXIgcyA9IHYuc3Vic3RyaW5nKDEsdi5sZW5ndGgpXG4gICAgICAgICAgaWYoIXYpIHJldHVyblxuICAgICAgICAgIGlmKCFlKVxuICAgICAgICAgICAgZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodilcbiAgICAgICAgICBlbHNlIGlmICh2WzBdID09PSAnLicpXG4gICAgICAgICAgICBDbGFzc0xpc3QoZSkuYWRkKHMpXG4gICAgICAgICAgZWxzZSBpZiAodlswXSA9PT0gJyMnKVxuICAgICAgICAgICAgZS5zZXRBdHRyaWJ1dGUoJ2lkJywgcylcbiAgICAgICAgfSlcbiAgICAgIH1cblxuICAgICAgaWYobCA9PSBudWxsKVxuICAgICAgICA7XG4gICAgICBlbHNlIGlmKCdzdHJpbmcnID09PSB0eXBlb2YgbCkge1xuICAgICAgICBpZighZSlcbiAgICAgICAgICBwYXJzZUNsYXNzKGwpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBlLmFwcGVuZENoaWxkKHIgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShsKSlcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYoJ251bWJlcicgPT09IHR5cGVvZiBsXG4gICAgICAgIHx8ICdib29sZWFuJyA9PT0gdHlwZW9mIGxcbiAgICAgICAgfHwgbCBpbnN0YW5jZW9mIERhdGVcbiAgICAgICAgfHwgbCBpbnN0YW5jZW9mIFJlZ0V4cCApIHtcbiAgICAgICAgICBlLmFwcGVuZENoaWxkKHIgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShsLnRvU3RyaW5nKCkpKVxuICAgICAgfVxuICAgICAgLy90aGVyZSBtaWdodCBiZSBhIGJldHRlciB3YXkgdG8gaGFuZGxlIHRoaXMuLi5cbiAgICAgIGVsc2UgaWYgKGlzQXJyYXkobCkpXG4gICAgICAgIGZvckVhY2gobCwgaXRlbSlcbiAgICAgIGVsc2UgaWYoaXNOb2RlKGwpKVxuICAgICAgICBlLmFwcGVuZENoaWxkKHIgPSBsKVxuICAgICAgZWxzZSBpZihsIGluc3RhbmNlb2YgVGV4dClcbiAgICAgICAgZS5hcHBlbmRDaGlsZChyID0gbClcbiAgICAgIGVsc2UgaWYgKCdvYmplY3QnID09PSB0eXBlb2YgbCkge1xuICAgICAgICBmb3IgKHZhciBrIGluIGwpIHtcbiAgICAgICAgICBpZignZnVuY3Rpb24nID09PSB0eXBlb2YgbFtrXSkge1xuICAgICAgICAgICAgaWYoL15vblxcdysvLnRlc3QoaykpIHtcbiAgICAgICAgICAgICAgaWYgKGUuYWRkRXZlbnRMaXN0ZW5lcil7XG4gICAgICAgICAgICAgICAgZS5hZGRFdmVudExpc3RlbmVyKGsuc3Vic3RyaW5nKDIpLCBsW2tdLCBmYWxzZSlcbiAgICAgICAgICAgICAgICBjbGVhbnVwRnVuY3MucHVzaChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgZS5yZW1vdmVFdmVudExpc3RlbmVyKGsuc3Vic3RyaW5nKDIpLCBsW2tdLCBmYWxzZSlcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICBlLmF0dGFjaEV2ZW50KGssIGxba10pXG4gICAgICAgICAgICAgICAgY2xlYW51cEZ1bmNzLnB1c2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgIGUuZGV0YWNoRXZlbnQoaywgbFtrXSlcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBvYnNlcnZhYmxlXG4gICAgICAgICAgICAgIGVba10gPSBsW2tdKClcbiAgICAgICAgICAgICAgY2xlYW51cEZ1bmNzLnB1c2gobFtrXShmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgICAgIGVba10gPSB2XG4gICAgICAgICAgICAgIH0pKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmKGsgPT09ICdzdHlsZScpIHtcbiAgICAgICAgICAgIGlmKCdzdHJpbmcnID09PSB0eXBlb2YgbFtrXSkge1xuICAgICAgICAgICAgICBlLnN0eWxlLmNzc1RleHQgPSBsW2tdXG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgZm9yICh2YXIgcyBpbiBsW2tdKSAoZnVuY3Rpb24ocywgdikge1xuICAgICAgICAgICAgICAgIGlmKCdmdW5jdGlvbicgPT09IHR5cGVvZiB2KSB7XG4gICAgICAgICAgICAgICAgICAvLyBvYnNlcnZhYmxlXG4gICAgICAgICAgICAgICAgICBlLnN0eWxlLnNldFByb3BlcnR5KHMsIHYoKSlcbiAgICAgICAgICAgICAgICAgIGNsZWFudXBGdW5jcy5wdXNoKHYoZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgICAgICAgICBlLnN0eWxlLnNldFByb3BlcnR5KHMsIHZhbClcbiAgICAgICAgICAgICAgICAgIH0pKVxuICAgICAgICAgICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgICAgICAgZS5zdHlsZS5zZXRQcm9wZXJ0eShzLCBsW2tdW3NdKVxuICAgICAgICAgICAgICB9KShzLCBsW2tdW3NdKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAoay5zdWJzdHIoMCwgNSkgPT09IFwiZGF0YS1cIikge1xuICAgICAgICAgICAgZS5zZXRBdHRyaWJ1dGUoaywgbFtrXSlcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZVtrXSA9IGxba11cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGwpIHtcbiAgICAgICAgLy9hc3N1bWUgaXQncyBhbiBvYnNlcnZhYmxlIVxuICAgICAgICB2YXIgdiA9IGwoKVxuICAgICAgICBlLmFwcGVuZENoaWxkKHIgPSBpc05vZGUodikgPyB2IDogZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUodikpXG5cbiAgICAgICAgY2xlYW51cEZ1bmNzLnB1c2gobChmdW5jdGlvbiAodikge1xuICAgICAgICAgIGlmKGlzTm9kZSh2KSAmJiByLnBhcmVudEVsZW1lbnQpXG4gICAgICAgICAgICByLnBhcmVudEVsZW1lbnQucmVwbGFjZUNoaWxkKHYsIHIpLCByID0gdlxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHIudGV4dENvbnRlbnQgPSB2XG4gICAgICAgIH0pKVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gclxuICAgIH1cbiAgICB3aGlsZShhcmdzLmxlbmd0aClcbiAgICAgIGl0ZW0oYXJncy5zaGlmdCgpKVxuXG4gICAgcmV0dXJuIGVcbiAgfVxuXG4gIGguY2xlYW51cCA9IGZ1bmN0aW9uICgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNsZWFudXBGdW5jcy5sZW5ndGg7IGkrKyl7XG4gICAgICBjbGVhbnVwRnVuY3NbaV0oKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBoXG59XG5cbnZhciBoID0gbW9kdWxlLmV4cG9ydHMgPSBjb250ZXh0KClcbmguY29udGV4dCA9IGNvbnRleHRcblxuZnVuY3Rpb24gaXNOb2RlIChlbCkge1xuICByZXR1cm4gZWwgJiYgZWwubm9kZU5hbWUgJiYgZWwubm9kZVR5cGVcbn1cblxuZnVuY3Rpb24gaXNUZXh0IChlbCkge1xuICByZXR1cm4gZWwgJiYgZWwubm9kZU5hbWUgPT09ICcjdGV4dCcgJiYgZWwubm9kZVR5cGUgPT0gM1xufVxuXG5mdW5jdGlvbiBmb3JFYWNoIChhcnIsIGZuKSB7XG4gIGlmIChhcnIuZm9yRWFjaCkgcmV0dXJuIGFyci5mb3JFYWNoKGZuKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykgZm4oYXJyW2ldLCBpKVxufVxuXG5mdW5jdGlvbiBpc0FycmF5IChhcnIpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhcnIpID09ICdbb2JqZWN0IEFycmF5XSdcbn1cbiIsIi8qIVxuICogQ3Jvc3MtQnJvd3NlciBTcGxpdCAxLjEuMVxuICogQ29weXJpZ2h0IDIwMDctMjAxMiBTdGV2ZW4gTGV2aXRoYW4gPHN0ZXZlbmxldml0aGFuLmNvbT5cbiAqIEF2YWlsYWJsZSB1bmRlciB0aGUgTUlUIExpY2Vuc2VcbiAqIEVDTUFTY3JpcHQgY29tcGxpYW50LCB1bmlmb3JtIGNyb3NzLWJyb3dzZXIgc3BsaXQgbWV0aG9kXG4gKi9cblxuLyoqXG4gKiBTcGxpdHMgYSBzdHJpbmcgaW50byBhbiBhcnJheSBvZiBzdHJpbmdzIHVzaW5nIGEgcmVnZXggb3Igc3RyaW5nIHNlcGFyYXRvci4gTWF0Y2hlcyBvZiB0aGVcbiAqIHNlcGFyYXRvciBhcmUgbm90IGluY2x1ZGVkIGluIHRoZSByZXN1bHQgYXJyYXkuIEhvd2V2ZXIsIGlmIGBzZXBhcmF0b3JgIGlzIGEgcmVnZXggdGhhdCBjb250YWluc1xuICogY2FwdHVyaW5nIGdyb3VwcywgYmFja3JlZmVyZW5jZXMgYXJlIHNwbGljZWQgaW50byB0aGUgcmVzdWx0IGVhY2ggdGltZSBgc2VwYXJhdG9yYCBpcyBtYXRjaGVkLlxuICogRml4ZXMgYnJvd3NlciBidWdzIGNvbXBhcmVkIHRvIHRoZSBuYXRpdmUgYFN0cmluZy5wcm90b3R5cGUuc3BsaXRgIGFuZCBjYW4gYmUgdXNlZCByZWxpYWJseVxuICogY3Jvc3MtYnJvd3Nlci5cbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHIgU3RyaW5nIHRvIHNwbGl0LlxuICogQHBhcmFtIHtSZWdFeHB8U3RyaW5nfSBzZXBhcmF0b3IgUmVnZXggb3Igc3RyaW5nIHRvIHVzZSBmb3Igc2VwYXJhdGluZyB0aGUgc3RyaW5nLlxuICogQHBhcmFtIHtOdW1iZXJ9IFtsaW1pdF0gTWF4aW11bSBudW1iZXIgb2YgaXRlbXMgdG8gaW5jbHVkZSBpbiB0aGUgcmVzdWx0IGFycmF5LlxuICogQHJldHVybnMge0FycmF5fSBBcnJheSBvZiBzdWJzdHJpbmdzLlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBCYXNpYyB1c2VcbiAqIHNwbGl0KCdhIGIgYyBkJywgJyAnKTtcbiAqIC8vIC0+IFsnYScsICdiJywgJ2MnLCAnZCddXG4gKlxuICogLy8gV2l0aCBsaW1pdFxuICogc3BsaXQoJ2EgYiBjIGQnLCAnICcsIDIpO1xuICogLy8gLT4gWydhJywgJ2InXVxuICpcbiAqIC8vIEJhY2tyZWZlcmVuY2VzIGluIHJlc3VsdCBhcnJheVxuICogc3BsaXQoJy4ud29yZDEgd29yZDIuLicsIC8oW2Etel0rKShcXGQrKS9pKTtcbiAqIC8vIC0+IFsnLi4nLCAnd29yZCcsICcxJywgJyAnLCAnd29yZCcsICcyJywgJy4uJ11cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24gc3BsaXQodW5kZWYpIHtcblxuICB2YXIgbmF0aXZlU3BsaXQgPSBTdHJpbmcucHJvdG90eXBlLnNwbGl0LFxuICAgIGNvbXBsaWFudEV4ZWNOcGNnID0gLygpPz8vLmV4ZWMoXCJcIilbMV0gPT09IHVuZGVmLFxuICAgIC8vIE5QQ0c6IG5vbnBhcnRpY2lwYXRpbmcgY2FwdHVyaW5nIGdyb3VwXG4gICAgc2VsZjtcblxuICBzZWxmID0gZnVuY3Rpb24oc3RyLCBzZXBhcmF0b3IsIGxpbWl0KSB7XG4gICAgLy8gSWYgYHNlcGFyYXRvcmAgaXMgbm90IGEgcmVnZXgsIHVzZSBgbmF0aXZlU3BsaXRgXG4gICAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChzZXBhcmF0b3IpICE9PSBcIltvYmplY3QgUmVnRXhwXVwiKSB7XG4gICAgICByZXR1cm4gbmF0aXZlU3BsaXQuY2FsbChzdHIsIHNlcGFyYXRvciwgbGltaXQpO1xuICAgIH1cbiAgICB2YXIgb3V0cHV0ID0gW10sXG4gICAgICBmbGFncyA9IChzZXBhcmF0b3IuaWdub3JlQ2FzZSA/IFwiaVwiIDogXCJcIikgKyAoc2VwYXJhdG9yLm11bHRpbGluZSA/IFwibVwiIDogXCJcIikgKyAoc2VwYXJhdG9yLmV4dGVuZGVkID8gXCJ4XCIgOiBcIlwiKSArIC8vIFByb3Bvc2VkIGZvciBFUzZcbiAgICAgIChzZXBhcmF0b3Iuc3RpY2t5ID8gXCJ5XCIgOiBcIlwiKSxcbiAgICAgIC8vIEZpcmVmb3ggMytcbiAgICAgIGxhc3RMYXN0SW5kZXggPSAwLFxuICAgICAgLy8gTWFrZSBgZ2xvYmFsYCBhbmQgYXZvaWQgYGxhc3RJbmRleGAgaXNzdWVzIGJ5IHdvcmtpbmcgd2l0aCBhIGNvcHlcbiAgICAgIHNlcGFyYXRvciA9IG5ldyBSZWdFeHAoc2VwYXJhdG9yLnNvdXJjZSwgZmxhZ3MgKyBcImdcIiksXG4gICAgICBzZXBhcmF0b3IyLCBtYXRjaCwgbGFzdEluZGV4LCBsYXN0TGVuZ3RoO1xuICAgIHN0ciArPSBcIlwiOyAvLyBUeXBlLWNvbnZlcnRcbiAgICBpZiAoIWNvbXBsaWFudEV4ZWNOcGNnKSB7XG4gICAgICAvLyBEb2Vzbid0IG5lZWQgZmxhZ3MgZ3ksIGJ1dCB0aGV5IGRvbid0IGh1cnRcbiAgICAgIHNlcGFyYXRvcjIgPSBuZXcgUmVnRXhwKFwiXlwiICsgc2VwYXJhdG9yLnNvdXJjZSArIFwiJCg/IVxcXFxzKVwiLCBmbGFncyk7XG4gICAgfVxuICAgIC8qIFZhbHVlcyBmb3IgYGxpbWl0YCwgcGVyIHRoZSBzcGVjOlxuICAgICAqIElmIHVuZGVmaW5lZDogNDI5NDk2NzI5NSAvLyBNYXRoLnBvdygyLCAzMikgLSAxXG4gICAgICogSWYgMCwgSW5maW5pdHksIG9yIE5hTjogMFxuICAgICAqIElmIHBvc2l0aXZlIG51bWJlcjogbGltaXQgPSBNYXRoLmZsb29yKGxpbWl0KTsgaWYgKGxpbWl0ID4gNDI5NDk2NzI5NSkgbGltaXQgLT0gNDI5NDk2NzI5NjtcbiAgICAgKiBJZiBuZWdhdGl2ZSBudW1iZXI6IDQyOTQ5NjcyOTYgLSBNYXRoLmZsb29yKE1hdGguYWJzKGxpbWl0KSlcbiAgICAgKiBJZiBvdGhlcjogVHlwZS1jb252ZXJ0LCB0aGVuIHVzZSB0aGUgYWJvdmUgcnVsZXNcbiAgICAgKi9cbiAgICBsaW1pdCA9IGxpbWl0ID09PSB1bmRlZiA/IC0xID4+PiAwIDogLy8gTWF0aC5wb3coMiwgMzIpIC0gMVxuICAgIGxpbWl0ID4+PiAwOyAvLyBUb1VpbnQzMihsaW1pdClcbiAgICB3aGlsZSAobWF0Y2ggPSBzZXBhcmF0b3IuZXhlYyhzdHIpKSB7XG4gICAgICAvLyBgc2VwYXJhdG9yLmxhc3RJbmRleGAgaXMgbm90IHJlbGlhYmxlIGNyb3NzLWJyb3dzZXJcbiAgICAgIGxhc3RJbmRleCA9IG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoO1xuICAgICAgaWYgKGxhc3RJbmRleCA+IGxhc3RMYXN0SW5kZXgpIHtcbiAgICAgICAgb3V0cHV0LnB1c2goc3RyLnNsaWNlKGxhc3RMYXN0SW5kZXgsIG1hdGNoLmluZGV4KSk7XG4gICAgICAgIC8vIEZpeCBicm93c2VycyB3aG9zZSBgZXhlY2AgbWV0aG9kcyBkb24ndCBjb25zaXN0ZW50bHkgcmV0dXJuIGB1bmRlZmluZWRgIGZvclxuICAgICAgICAvLyBub25wYXJ0aWNpcGF0aW5nIGNhcHR1cmluZyBncm91cHNcbiAgICAgICAgaWYgKCFjb21wbGlhbnRFeGVjTnBjZyAmJiBtYXRjaC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgbWF0Y2hbMF0ucmVwbGFjZShzZXBhcmF0b3IyLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aCAtIDI7IGkrKykge1xuICAgICAgICAgICAgICBpZiAoYXJndW1lbnRzW2ldID09PSB1bmRlZikge1xuICAgICAgICAgICAgICAgIG1hdGNoW2ldID0gdW5kZWY7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobWF0Y2gubGVuZ3RoID4gMSAmJiBtYXRjaC5pbmRleCA8IHN0ci5sZW5ndGgpIHtcbiAgICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShvdXRwdXQsIG1hdGNoLnNsaWNlKDEpKTtcbiAgICAgICAgfVxuICAgICAgICBsYXN0TGVuZ3RoID0gbWF0Y2hbMF0ubGVuZ3RoO1xuICAgICAgICBsYXN0TGFzdEluZGV4ID0gbGFzdEluZGV4O1xuICAgICAgICBpZiAob3V0cHV0Lmxlbmd0aCA+PSBsaW1pdCkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoc2VwYXJhdG9yLmxhc3RJbmRleCA9PT0gbWF0Y2guaW5kZXgpIHtcbiAgICAgICAgc2VwYXJhdG9yLmxhc3RJbmRleCsrOyAvLyBBdm9pZCBhbiBpbmZpbml0ZSBsb29wXG4gICAgICB9XG4gICAgfVxuICAgIGlmIChsYXN0TGFzdEluZGV4ID09PSBzdHIubGVuZ3RoKSB7XG4gICAgICBpZiAobGFzdExlbmd0aCB8fCAhc2VwYXJhdG9yLnRlc3QoXCJcIikpIHtcbiAgICAgICAgb3V0cHV0LnB1c2goXCJcIik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dC5wdXNoKHN0ci5zbGljZShsYXN0TGFzdEluZGV4KSk7XG4gICAgfVxuICAgIHJldHVybiBvdXRwdXQubGVuZ3RoID4gbGltaXQgPyBvdXRwdXQuc2xpY2UoMCwgbGltaXQpIDogb3V0cHV0O1xuICB9O1xuXG4gIHJldHVybiBzZWxmO1xufSkoKTtcbiIsIi8vIGNvbnRhaW5zLCBhZGQsIHJlbW92ZSwgdG9nZ2xlXG52YXIgaW5kZXhvZiA9IHJlcXVpcmUoJ2luZGV4b2YnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IENsYXNzTGlzdFxuXG5mdW5jdGlvbiBDbGFzc0xpc3QoZWxlbSkge1xuICAgIHZhciBjbCA9IGVsZW0uY2xhc3NMaXN0XG5cbiAgICBpZiAoY2wpIHtcbiAgICAgICAgcmV0dXJuIGNsXG4gICAgfVxuXG4gICAgdmFyIGNsYXNzTGlzdCA9IHtcbiAgICAgICAgYWRkOiBhZGRcbiAgICAgICAgLCByZW1vdmU6IHJlbW92ZVxuICAgICAgICAsIGNvbnRhaW5zOiBjb250YWluc1xuICAgICAgICAsIHRvZ2dsZTogdG9nZ2xlXG4gICAgICAgICwgdG9TdHJpbmc6ICR0b1N0cmluZ1xuICAgICAgICAsIGxlbmd0aDogMFxuICAgICAgICAsIGl0ZW06IGl0ZW1cbiAgICB9XG5cbiAgICByZXR1cm4gY2xhc3NMaXN0XG5cbiAgICBmdW5jdGlvbiBhZGQodG9rZW4pIHtcbiAgICAgICAgdmFyIGxpc3QgPSBnZXRUb2tlbnMoKVxuICAgICAgICBpZiAoaW5kZXhvZihsaXN0LCB0b2tlbikgPiAtMSkge1xuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgICAgbGlzdC5wdXNoKHRva2VuKVxuICAgICAgICBzZXRUb2tlbnMobGlzdClcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZW1vdmUodG9rZW4pIHtcbiAgICAgICAgdmFyIGxpc3QgPSBnZXRUb2tlbnMoKVxuICAgICAgICAgICAgLCBpbmRleCA9IGluZGV4b2YobGlzdCwgdG9rZW4pXG5cbiAgICAgICAgaWYgKGluZGV4ID09PSAtMSkge1xuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cblxuICAgICAgICBsaXN0LnNwbGljZShpbmRleCwgMSlcbiAgICAgICAgc2V0VG9rZW5zKGxpc3QpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29udGFpbnModG9rZW4pIHtcbiAgICAgICAgcmV0dXJuIGluZGV4b2YoZ2V0VG9rZW5zKCksIHRva2VuKSA+IC0xXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdG9nZ2xlKHRva2VuKSB7XG4gICAgICAgIGlmIChjb250YWlucyh0b2tlbikpIHtcbiAgICAgICAgICAgIHJlbW92ZSh0b2tlbilcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWRkKHRva2VuKVxuICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICR0b1N0cmluZygpIHtcbiAgICAgICAgcmV0dXJuIGVsZW0uY2xhc3NOYW1lXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXRlbShpbmRleCkge1xuICAgICAgICB2YXIgdG9rZW5zID0gZ2V0VG9rZW5zKClcbiAgICAgICAgcmV0dXJuIHRva2Vuc1tpbmRleF0gfHwgbnVsbFxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFRva2VucygpIHtcbiAgICAgICAgdmFyIGNsYXNzTmFtZSA9IGVsZW0uY2xhc3NOYW1lXG5cbiAgICAgICAgcmV0dXJuIGZpbHRlcihjbGFzc05hbWUuc3BsaXQoXCIgXCIpLCBpc1RydXRoeSlcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRUb2tlbnMobGlzdCkge1xuICAgICAgICB2YXIgbGVuZ3RoID0gbGlzdC5sZW5ndGhcblxuICAgICAgICBlbGVtLmNsYXNzTmFtZSA9IGxpc3Quam9pbihcIiBcIilcbiAgICAgICAgY2xhc3NMaXN0Lmxlbmd0aCA9IGxlbmd0aFxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY2xhc3NMaXN0W2ldID0gbGlzdFtpXVxuICAgICAgICB9XG5cbiAgICAgICAgZGVsZXRlIGxpc3RbbGVuZ3RoXVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZmlsdGVyIChhcnIsIGZuKSB7XG4gICAgdmFyIHJldCA9IFtdXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGZuKGFycltpXSkpIHJldC5wdXNoKGFycltpXSlcbiAgICB9XG4gICAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBpc1RydXRoeSh2YWx1ZSkge1xuICAgIHJldHVybiAhIXZhbHVlXG59XG4iLCJcbnZhciBpbmRleE9mID0gW10uaW5kZXhPZjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhcnIsIG9iail7XG4gIGlmIChpbmRleE9mKSByZXR1cm4gYXJyLmluZGV4T2Yob2JqKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoYXJyW2ldID09PSBvYmopIHJldHVybiBpO1xuICB9XG4gIHJldHVybiAtMTtcbn07IiwidmFyIG5vdyA9IHJlcXVpcmUoJ3BlcmZvcm1hbmNlLW5vdycpXG4gICwgZ2xvYmFsID0gdHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyB7fSA6IHdpbmRvd1xuICAsIHZlbmRvcnMgPSBbJ21veicsICd3ZWJraXQnXVxuICAsIHN1ZmZpeCA9ICdBbmltYXRpb25GcmFtZSdcbiAgLCByYWYgPSBnbG9iYWxbJ3JlcXVlc3QnICsgc3VmZml4XVxuICAsIGNhZiA9IGdsb2JhbFsnY2FuY2VsJyArIHN1ZmZpeF0gfHwgZ2xvYmFsWydjYW5jZWxSZXF1ZXN0JyArIHN1ZmZpeF1cbiAgLCBpc05hdGl2ZSA9IHRydWVcblxuZm9yKHZhciBpID0gMDsgaSA8IHZlbmRvcnMubGVuZ3RoICYmICFyYWY7IGkrKykge1xuICByYWYgPSBnbG9iYWxbdmVuZG9yc1tpXSArICdSZXF1ZXN0JyArIHN1ZmZpeF1cbiAgY2FmID0gZ2xvYmFsW3ZlbmRvcnNbaV0gKyAnQ2FuY2VsJyArIHN1ZmZpeF1cbiAgICAgIHx8IGdsb2JhbFt2ZW5kb3JzW2ldICsgJ0NhbmNlbFJlcXVlc3QnICsgc3VmZml4XVxufVxuXG4vLyBTb21lIHZlcnNpb25zIG9mIEZGIGhhdmUgckFGIGJ1dCBub3QgY0FGXG5pZighcmFmIHx8ICFjYWYpIHtcbiAgaXNOYXRpdmUgPSBmYWxzZVxuXG4gIHZhciBsYXN0ID0gMFxuICAgICwgaWQgPSAwXG4gICAgLCBxdWV1ZSA9IFtdXG4gICAgLCBmcmFtZUR1cmF0aW9uID0gMTAwMCAvIDYwXG5cbiAgcmFmID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICBpZihxdWV1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIHZhciBfbm93ID0gbm93KClcbiAgICAgICAgLCBuZXh0ID0gTWF0aC5tYXgoMCwgZnJhbWVEdXJhdGlvbiAtIChfbm93IC0gbGFzdCkpXG4gICAgICBsYXN0ID0gbmV4dCArIF9ub3dcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBjcCA9IHF1ZXVlLnNsaWNlKDApXG4gICAgICAgIC8vIENsZWFyIHF1ZXVlIGhlcmUgdG8gcHJldmVudFxuICAgICAgICAvLyBjYWxsYmFja3MgZnJvbSBhcHBlbmRpbmcgbGlzdGVuZXJzXG4gICAgICAgIC8vIHRvIHRoZSBjdXJyZW50IGZyYW1lJ3MgcXVldWVcbiAgICAgICAgcXVldWUubGVuZ3RoID0gMFxuICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgY3AubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZighY3BbaV0uY2FuY2VsbGVkKSB7XG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgIGNwW2ldLmNhbGxiYWNrKGxhc3QpXG4gICAgICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgdGhyb3cgZSB9LCAwKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSwgTWF0aC5yb3VuZChuZXh0KSlcbiAgICB9XG4gICAgcXVldWUucHVzaCh7XG4gICAgICBoYW5kbGU6ICsraWQsXG4gICAgICBjYWxsYmFjazogY2FsbGJhY2ssXG4gICAgICBjYW5jZWxsZWQ6IGZhbHNlXG4gICAgfSlcbiAgICByZXR1cm4gaWRcbiAgfVxuXG4gIGNhZiA9IGZ1bmN0aW9uKGhhbmRsZSkge1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBxdWV1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYocXVldWVbaV0uaGFuZGxlID09PSBoYW5kbGUpIHtcbiAgICAgICAgcXVldWVbaV0uY2FuY2VsbGVkID0gdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGZuKSB7XG4gIC8vIFdyYXAgaW4gYSBuZXcgZnVuY3Rpb24gdG8gcHJldmVudFxuICAvLyBgY2FuY2VsYCBwb3RlbnRpYWxseSBiZWluZyBhc3NpZ25lZFxuICAvLyB0byB0aGUgbmF0aXZlIHJBRiBmdW5jdGlvblxuICBpZighaXNOYXRpdmUpIHtcbiAgICByZXR1cm4gcmFmLmNhbGwoZ2xvYmFsLCBmbilcbiAgfVxuICByZXR1cm4gcmFmLmNhbGwoZ2xvYmFsLCBmdW5jdGlvbigpIHtcbiAgICB0cnl7XG4gICAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyB0aHJvdyBlIH0sIDApXG4gICAgfVxuICB9KVxufVxubW9kdWxlLmV4cG9ydHMuY2FuY2VsID0gZnVuY3Rpb24oKSB7XG4gIGNhZi5hcHBseShnbG9iYWwsIGFyZ3VtZW50cylcbn1cbiIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG4vLyBHZW5lcmF0ZWQgYnkgQ29mZmVlU2NyaXB0IDEuNi4zXG4oZnVuY3Rpb24oKSB7XG4gIHZhciBnZXROYW5vU2Vjb25kcywgaHJ0aW1lLCBsb2FkVGltZTtcblxuICBpZiAoKHR5cGVvZiBwZXJmb3JtYW5jZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBwZXJmb3JtYW5jZSAhPT0gbnVsbCkgJiYgcGVyZm9ybWFuY2Uubm93KSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICB9O1xuICB9IGVsc2UgaWYgKCh0eXBlb2YgcHJvY2VzcyAhPT0gXCJ1bmRlZmluZWRcIiAmJiBwcm9jZXNzICE9PSBudWxsKSAmJiBwcm9jZXNzLmhydGltZSkge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gKGdldE5hbm9TZWNvbmRzKCkgLSBsb2FkVGltZSkgLyAxZTY7XG4gICAgfTtcbiAgICBocnRpbWUgPSBwcm9jZXNzLmhydGltZTtcbiAgICBnZXROYW5vU2Vjb25kcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGhyO1xuICAgICAgaHIgPSBocnRpbWUoKTtcbiAgICAgIHJldHVybiBoclswXSAqIDFlOSArIGhyWzFdO1xuICAgIH07XG4gICAgbG9hZFRpbWUgPSBnZXROYW5vU2Vjb25kcygpO1xuICB9IGVsc2UgaWYgKERhdGUubm93KSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBEYXRlLm5vdygpIC0gbG9hZFRpbWU7XG4gICAgfTtcbiAgICBsb2FkVGltZSA9IERhdGUubm93KCk7XG4gIH0gZWxzZSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIGxvYWRUaW1lO1xuICAgIH07XG4gICAgbG9hZFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgfVxuXG59KS5jYWxsKHRoaXMpO1xuXG4vKlxuLy9AIHNvdXJjZU1hcHBpbmdVUkw9cGVyZm9ybWFuY2Utbm93Lm1hcFxuKi9cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoJ19wcm9jZXNzJykpIixudWxsLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5NdXRhdGlvbk9ic2VydmVyID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuTXV0YXRpb25PYnNlcnZlcjtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICB2YXIgcXVldWUgPSBbXTtcblxuICAgIGlmIChjYW5NdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgICAgIHZhciBoaWRkZW5EaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcXVldWVMaXN0ID0gcXVldWUuc2xpY2UoKTtcbiAgICAgICAgICAgIHF1ZXVlLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICBxdWV1ZUxpc3QuZm9yRWFjaChmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIG9ic2VydmVyLm9ic2VydmUoaGlkZGVuRGl2LCB7IGF0dHJpYnV0ZXM6IHRydWUgfSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBpZiAoIXF1ZXVlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGhpZGRlbkRpdi5zZXRBdHRyaWJ1dGUoJ3llcycsICdubycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwidmFyIHJlc3VsdCA9IFsnIzMwRkZENicsXG4gICAgICAgICAgICAgICcjNzJFRUQ2JyxcbiAgICAgICAgICAgICAgJyMxREJGOUYnLFxuICAgICAgICAgICAgICAnIzY1RjBCOScsXG4gICAgICAgICAgICAgICcjNTdGQzkzJyxcbiAgICAgICAgICAgICAgJyM5OEZGQkUnLFxuICAgICAgICAgICAgICAnI0EwRkY5OCddO1xudmFyIG15SW50ZXJ2YWw7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBzdGFydDogc3RhcnQsXG4gIGVuZDogZW5kXG59XG5cbmZ1bmN0aW9uIHN0YXJ0KGVsLCBpbnRlcnZhbCkge1xuICB2YXIgbCA9IDA7XG4gIG15SW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgbCsrO1xuICAgICAgICAgICAgICAgICBpZiAobCA+PSByZXN1bHQubGVuZ3RoKSBsID0gMDtcbiAgICAgICAgICAgICAgICAgZWwuc3R5bGUuY29sb3IgPSByZXN1bHRbbF07XG4gICAgICAgICAgICAgICB9LCBpbnRlcnZhbCk7XG59XG5cbmZ1bmN0aW9uIGVuZCgpIHtcbiAgY2xlYXJJbnRlcnZhbChteUludGVydmFsKTtcbiAgbXlJbnRlcnZhbCA9IG51bGw7XG59IiwibW9kdWxlLmV4cG9ydHMgPSBkcmF3QnVmZmVyO1xuXG5mdW5jdGlvbiBkcmF3QnVmZmVyIChjYW52YXMsIGJ1ZmZlciwgY29sb3IpIHtcbiAgdmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICB2YXIgd2lkdGggPSBjYW52YXMud2lkdGg7XG4gIHZhciBoZWlnaHQgPSBjYW52YXMuaGVpZ2h0O1xuICBpZiAoY29sb3IpIHtcbiAgICBjdHguZmlsbFN0eWxlID0gY29sb3I7XG4gIH1cblxuICAgIHZhciBkYXRhID0gYnVmZmVyLmdldENoYW5uZWxEYXRhKCAwICk7XG4gICAgdmFyIHN0ZXAgPSBNYXRoLmNlaWwoIGRhdGEubGVuZ3RoIC8gd2lkdGggKTtcbiAgICB2YXIgYW1wID0gaGVpZ2h0IC8gMjtcbiAgICBmb3IodmFyIGk9MDsgaSA8IHdpZHRoOyBpKyspe1xuICAgICAgICB2YXIgbWluID0gMS4wO1xuICAgICAgICB2YXIgbWF4ID0gLTEuMDtcbiAgICAgICAgZm9yICh2YXIgaj0wOyBqPHN0ZXA7IGorKykge1xuICAgICAgICAgICAgdmFyIGRhdHVtID0gZGF0YVsoaSpzdGVwKStqXTtcbiAgICAgICAgICAgIGlmIChkYXR1bSA8IG1pbilcbiAgICAgICAgICAgICAgICBtaW4gPSBkYXR1bTtcbiAgICAgICAgICAgIGlmIChkYXR1bSA+IG1heClcbiAgICAgICAgICAgICAgICBtYXggPSBkYXR1bTtcbiAgICAgICAgfVxuICAgICAgY3R4LmZpbGxSZWN0KGksKDErbWluKSphbXAsMSxNYXRoLm1heCgxLChtYXgtbWluKSphbXApKTtcbiAgICB9XG59IiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIGN1dDogY3V0QnVmZmVyLFxuICBjb3B5OiBjb3B5QnVmZmVyLFxuICBwYXN0ZTogcGFzdGVCdWZmZXIsXG4gIHJldmVyc2U6IHJldmVyc2VCdWZmZXJcbn07XG5cbmZ1bmN0aW9uIHJldmVyc2VCdWZmZXIoYnVmZmVyLCBjYikge1xuICB2YXIgY2hhbk51bWJlciA9IGJ1ZmZlci5udW1iZXJPZkNoYW5uZWxzO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGNoYW5OdW1iZXI7ICsraSkge1xuICAgIHZhciBkYXRhID0gYnVmZmVyLmdldENoYW5uZWxEYXRhKGkpO1xuICAgIEFycmF5LnByb3RvdHlwZS5yZXZlcnNlLmNhbGwoZGF0YSk7XG4gIH1cbiAgY2IoKTtcbn1cblxuLy8gY29weSB0aGUgYnVmZmVyIHRvIG91ciBjbGlwYm9hcmQsIHdpdGhvdXQgcmVtb3ZpbmcgdGhlIG9yaWdpbmFsIHNlY3Rpb24gZnJvbSBidWZmZXIuXG5mdW5jdGlvbiBjb3B5QnVmZmVyKGNvbnRleHQsIGNsaXBib2FyZCwgYnVmZmVyLCBjYikge1xuICB2YXIgc3RhcnQgPSBNYXRoLnJvdW5kKGNsaXBib2FyZC5zdGFydCAqIGJ1ZmZlci5zYW1wbGVSYXRlKTtcbiAgdmFyIGVuZCA9IE1hdGgucm91bmQoY2xpcGJvYXJkLmVuZCAqIGJ1ZmZlci5zYW1wbGVSYXRlKTtcblxuICBjbGlwYm9hcmQuYnVmZmVyID0gY29udGV4dC5jcmVhdGVCdWZmZXIoMiwgZW5kIC0gc3RhcnQsIGJ1ZmZlci5zYW1wbGVSYXRlKTtcblxuICBjbGlwYm9hcmQuYnVmZmVyLmdldENoYW5uZWxEYXRhKDApLnNldChcbiAgICBidWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCkuc3ViYXJyYXkoc3RhcnQsIGVuZCksIDApO1xuICBjbGlwYm9hcmQuYnVmZmVyLmdldENoYW5uZWxEYXRhKDEpLnNldChcbiAgICBidWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkuc3ViYXJyYXkoc3RhcnQsIGVuZCksIDApO1xuXG4gIGNiKCk7XG59XG5cbi8vIGN1dCB0aGUgYnVmZmVyIHBvcnRpb24gdG8gb3VyIGNsaXBib2FyZCwgc2V0cyBlbXB0eSBzcGFjZSBpbiBwbGFjZSBvZiB0aGUgcG9ydGlvblxuLy8gaW4gdGhlIHNvdXJjZSBidWZmZXIuXG5mdW5jdGlvbiBjdXRCdWZmZXIoY29udGV4dCwgY2xpcGJvYXJkLCBidWZmZXIsIGNiKSB7XG4gIHZhciBzdGFydCA9IE1hdGgucm91bmQoY2xpcGJvYXJkLnN0YXJ0ICogYnVmZmVyLnNhbXBsZVJhdGUpO1xuICB2YXIgZW5kID0gTWF0aC5yb3VuZChjbGlwYm9hcmQuZW5kICogYnVmZmVyLnNhbXBsZVJhdGUpO1xuXG4gIGNsaXBib2FyZC5idWZmZXIgPSBjb250ZXh0LmNyZWF0ZUJ1ZmZlcigyLCBlbmQgLSBzdGFydCwgYnVmZmVyLnNhbXBsZVJhdGUpO1xuICBjbGlwYm9hcmQuYnVmZmVyLmdldENoYW5uZWxEYXRhKDApLnNldChidWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCkuc3ViYXJyYXkoc3RhcnQsIGVuZCkpO1xuICBjbGlwYm9hcmQuYnVmZmVyLmdldENoYW5uZWxEYXRhKDEpLnNldChidWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkuc3ViYXJyYXkoc3RhcnQsIGVuZCkpO1xuXG4gIHZhciBudU9sZEJ1ZmZlciA9IGNvbnRleHQuY3JlYXRlQnVmZmVyKDIsIGJ1ZmZlci5sZW5ndGgsIGJ1ZmZlci5zYW1wbGVSYXRlKTtcbiAgdmFyIGVtcHR5QnVmID0gY29udGV4dC5jcmVhdGVCdWZmZXIoMiwgZW5kIC0gc3RhcnQsIGJ1ZmZlci5zYW1wbGVSYXRlKTtcblxuICBudU9sZEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zZXQoYnVmZmVyLmdldENoYW5uZWxEYXRhKDApLnN1YmFycmF5KDAsIHN0YXJ0KSk7XG4gIG51T2xkQnVmZmVyLmdldENoYW5uZWxEYXRhKDEpLnNldChidWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkuc3ViYXJyYXkoMCwgc3RhcnQpKVxuXG4gIG51T2xkQnVmZmVyLmdldENoYW5uZWxEYXRhKDApLnNldChlbXB0eUJ1Zi5nZXRDaGFubmVsRGF0YSgwKSwgc3RhcnQpO1xuICBudU9sZEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKS5zZXQoZW1wdHlCdWYuZ2V0Q2hhbm5lbERhdGEoMSksIHN0YXJ0KTtcblxuICBudU9sZEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zZXQoYnVmZmVyLmdldENoYW5uZWxEYXRhKDApLnN1YmFycmF5KGVuZCwgYnVmZmVyLmxlbmd0aCksIGVuZCk7XG4gIG51T2xkQnVmZmVyLmdldENoYW5uZWxEYXRhKDEpLnNldChidWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkuc3ViYXJyYXkoZW5kLCBidWZmZXIubGVuZ3RoKSwgZW5kKTtcbiAgY2IobnVPbGRCdWZmZXIpO1xufVxuXG4vLyBpbnNlcnQgb3VyIGNsaXBib2FyZCBhdCBhIHNwZWNpZmljIHBvaW50IGluIGJ1ZmZlci5cbmZ1bmN0aW9uIHBhc3RlQnVmZmVyKGNvbnRleHQsIGNsaXBib2FyZCwgYnVmZmVyLCBhdCwgY2IpIHtcbiAgdmFyIHN0YXJ0ID0gTWF0aC5yb3VuZChjbGlwYm9hcmQuc3RhcnQgKiBidWZmZXIuc2FtcGxlUmF0ZSk7XG4gIHZhciBlbmQgPSBNYXRoLnJvdW5kKGNsaXBib2FyZC5lbmQgKiBidWZmZXIuc2FtcGxlUmF0ZSk7XG4gIGF0ID0gYXQgKiBidWZmZXIuc2FtcGxlUmF0ZTtcblxuICAvLyBjcmVhdGUgcmVwbGFjZW1lbnQgYnVmZmVyIHdpdGggZW5vdWdoIHNwYWNlIGZvciBjbGlib2FyZCBwYXJ0XG4gIHZhciBudVBhc3RlZEJ1ZmZlciA9IGNvbnRleHQuY3JlYXRlQnVmZmVyKDIsIGJ1ZmZlci5sZW5ndGggKyAoZW5kIC0gc3RhcnQpLCBidWZmZXIuc2FtcGxlUmF0ZSk7XG5cbiAgLy8gaWYgb3VyIGNsaXAgc3RhcnQgcG9pbnQgaXMgbm90IGF0ICcwJyB0aGVuIHdlIG5lZWQgdG8gc2V0IHRoZSBvcmlnaW5hbFxuICAvLyBjaHVuaywgdXAgdG8gdGhlIGNsaXAgc3RhcnQgcG9pbnRcbiAgaWYgKGF0ID4gMCkge1xuICAgIG51UGFzdGVkQnVmZmVyLmdldENoYW5uZWxEYXRhKDApLnNldChidWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCkuc3ViYXJyYXkoMCwgYXQpKTtcbiAgICBudVBhc3RlZEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKS5zZXQoYnVmZmVyLmdldENoYW5uZWxEYXRhKDEpLnN1YmFycmF5KDAsIGF0KSk7XG4gIH1cblxuICAvLyBhZGQgdGhlIGNsaXAgZGF0YVxuICBudVBhc3RlZEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zZXQoY2xpcGJvYXJkLmJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKSwgYXQpO1xuICBudVBhc3RlZEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKS5zZXQoY2xpcGJvYXJkLmJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKSwgYXQpO1xuXG4gIC8vIGlmIG91ciBjbGlwIGVuZCBwb2ludCBpcyBub3QgYXQgdGhlIGVuZCBvZiB0aGUgb3JpZ2luYWwgYnVmZmVyIHRoZW5cbiAgLy8gd2UgbmVlZCB0byBhZGQgcmVtYWluaW5nIGRhdGEgZnJvbSB0aGUgb3JpZ2luYWwgYnVmZmVyO1xuICBpZiAoZW5kIDwgYnVmZmVyLmxlbmd0aCkge1xuICAgIHZhciBuZXdBdCA9IGF0ICsgKGVuZCAtIHN0YXJ0KTtcbiAgICBudVBhc3RlZEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zZXQoYnVmZmVyLmdldENoYW5uZWxEYXRhKDApLnN1YmFycmF5KG5ld0F0KSwgbmV3QXQpO1xuICAgIG51UGFzdGVkQnVmZmVyLmdldENoYW5uZWxEYXRhKDEpLnNldChidWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkuc3ViYXJyYXkobmV3QXQpLCBuZXdBdCk7XG4gIH1cblxuICBjYihudVBhc3RlZEJ1ZmZlcik7XG59IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAodG90YWxTZWMsIG1zKSB7XG4gIHZhciBtaW51dGVzID0gcGFyc2VJbnQoIHRvdGFsU2VjIC8gNjAgKSAlIDYwO1xuICB2YXIgc2Vjb25kcyA9IHRvdGFsU2VjICUgNjA7XG5cbiAgaWYgKG1zKSB7XG4gICAgcmV0dXJuICgobWludXRlcyA8IDEwID8gXCIwXCIgKyBtaW51dGVzIDogbWludXRlcykgKyBcIjpcIiArIChzZWNvbmRzICA8IDEwID8gXCIwXCIgKyBzZWNvbmRzLnRvRml4ZWQoMikgOiBzZWNvbmRzLnRvRml4ZWQoMikpKS5yZXBsYWNlKCcuJywgJzonKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gKChtaW51dGVzIDwgMTAgPyBcIjBcIiArIG1pbnV0ZXMgOiBtaW51dGVzKSArIFwiOlwiICsgKHNlY29uZHMgIDwgMTAgPyBcIjBcIiArICBwYXJzZUludChzZWNvbmRzKSA6IHBhcnNlSW50KHNlY29uZHMpKSk7XG4gIH1cbn0iLCJ2YXIgcmVjb3JkZXI7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgc3RhcnQ6IHN0YXJ0LFxuICBzdG9wOiBzdG9wXG59XG5cbmZ1bmN0aW9uIGdldFN0cmVhbShjb250ZXh0LCBmZnQpIHtcbiAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSA9IG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgfHwgbmF2aWdhdG9yLndlYmtpdEdldFVzZXJNZWRpYTtcbiAgd2luZG93LlVSTCA9IHdpbmRvdy5VUkwgfHwgd2luZG93LndlYmtpdFVSTDtcblxuICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhKHthdWRpbzogdHJ1ZX0sIGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgIHN0YXJ0VXNlck1lZGlhKGNvbnRleHQsIHN0cmVhbSwgZmZ0KTtcbiAgfSwgZnVuY3Rpb24oZXJyKSB7XG4gICAgY29uc29sZS5sb2coJ05vIGxpdmUgYXVkaW8gaW5wdXQ6ICcgKyBlcnIpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gc3RhcnRVc2VyTWVkaWEoY29udGV4dCwgc3RyZWFtLCBmZnQpIHtcbiAgdmFyIGlucHV0ID0gY29udGV4dC5jcmVhdGVNZWRpYVN0cmVhbVNvdXJjZShzdHJlYW0pO1xuICBjb25zb2xlLmxvZygnTWVkaWEgc3RyZWFtIGNyZWF0ZWQuJyk7XG5cbiAgaWYgKGZmdCkge1xuICAgIGlucHV0LmNvbm5lY3QoZmZ0LmlucHV0KTtcbiAgICAvLyB0aHJvdyBhd2F5IGdhaW4gbm9kZVxuICAgIHZhciBnYWluTm9kZSA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIGdhaW5Ob2RlLmdhaW4udmFsdWUgPSAwO1xuICAgIGZmdC5jb25uZWN0KGdhaW5Ob2RlKTtcbiAgICBnYWluTm9kZS5jb25uZWN0KGNvbnRleHQuZGVzdGluYXRpb24pO1xuICB9XG4gIC8vIGlucHV0LmNvbm5lY3QoY29udGV4dC5kZXN0aW5hdGlvbik7IC8vIG1pZ2h0IG5vdCBhY3R1YWxseSB3YW50IHRvIGRvIHRoaXNcbiAgY29uc29sZS5sb2coJ0lucHV0IGNvbm5lY3RlZCB0byBhdWRpbyBjb250ZXh0IGRlc3RpbmF0aW9uLicpO1xuXG4gIHJlY29yZGVyID0gbmV3IFJlY29yZGVyKGlucHV0KTtcbiAgY29uc29sZS5sb2coJ1JlY29yZGVyIGluaXRpYWxpc2VkLicpO1xuICBzdGFydCgpO1xufVxuXG5mdW5jdGlvbiBzdGFydChjb250ZXh0LCBmZnQpIHtcbiAgaWYgKHJlY29yZGVyID09PSB1bmRlZmluZWQpIHtcbiAgICBnZXRTdHJlYW0oY29udGV4dCwgZmZ0KVxuICB9IGVsc2Uge1xuICAgIHJlY29yZGVyLnJlY29yZCgpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHN0b3AoY2IpIHtcbiAgcmVjb3JkZXIuc3RvcCgpO1xuICByZWNvcmRlci5leHBvcnRXQVYoY2IpO1xuICByZWNvcmRlci5jbGVhcigpO1xufSIsIi8vIG5lZWQgdG8gZ2VuZXJhdGUgdGhlc2UgcG9pbnRzLCBsaWtlLCB3YXkgc21hcnRlclxuLy8gbmVlZCB0byBiZSBtdWx0aXBsZXMgb2YgNSBidXQgc3RpbGwgcmVwcmVzZW50YXRpdmUgb2YgbWludXRlc1xuLy8gbmVlZCB0byBhZGp1c3Qgd2lkdGggb2YgdGltZWxpbmVFbCBiYXNlZCBvbiB0aGlzXG5cbnZhciBoID0gcmVxdWlyZSgnaHlwZXJzY3JpcHQnKTtcbnZhciBmb3JtYXRUaW1lID0gcmVxdWlyZSgnLi9mb3JtYXQtdGltZScpO1xudmFyIHRpbWVsaW5lRWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcudGltZWxpbmUnKTtcblxuZnVuY3Rpb24gY2FsY3VsYXRlUG9pbnRzKGR1cmF0aW9uKSB7XG4gIHJldHVybiBkdXJhdGlvbiAvIDU7XG59XG5cbmZ1bmN0aW9uIHBvaW50KG51bSkge1xuICByZXR1cm4gaCgnbGknLFxuICAgICAgICAgICBoKCdzcGFuJywgbnVtKSk7XG59XG5cbmZ1bmN0aW9uIGdldFBvaW50TGVuZ3RoKCkge1xuICByZXR1cm4gdGltZWxpbmVFbC5jaGlsZHJlbi5sZW5ndGhcbn1cblxuLy8gZml4IGZvcm1hdFRpbWUgdG8gd29yayB3aXRoIGxvdyBudW1iZXJzXG5cbmZ1bmN0aW9uIGdldFBvaW50cyhjdXIsIG1heCkge1xuICBpZiAoY3VyIDwgbWF4KSB7XG4gICAgY3VyID0gY3VyICsgNTtcbiAgICB0aW1lbGluZUVsLmFwcGVuZENoaWxkKHBvaW50KGZvcm1hdFRpbWUoY3VyKSkpO1xuICAgIGdldFBvaW50cyhjdXIsIG1heCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlKGR1cmF0aW9uKSB7XG4gIGNvbnNvbGUubG9nKCdkdXJhdGlvbjo6JywgZHVyYXRpb24pO1xuICB2YXIgbnVQb2ludExlbmd0aCA9IGNhbGN1bGF0ZVBvaW50cyhkdXJhdGlvbik7XG4gIGlmIChudVBvaW50TGVuZ3RoIDwgZ2V0UG9pbnRMZW5ndGgoKSkgcmV0dXJuO1xuXG4gIHZhciB3ID0gdGltZWxpbmVFbC5vZmZzZXRXaWR0aDtcbiAgdGltZWxpbmVFbC5pbm5lckhUTUwgPSAnJztcbiAgZ2V0UG9pbnRzKC01LCBkdXJhdGlvbik7XG4gIGlmICh0aW1lbGluZUVsLmNoaWxkcmVuLmxlbmd0aCAqIDEwMCA+IHcpIHtcbiAgICB0aW1lbGluZUVsLnN0eWxlLndpZHRoID0gdGltZWxpbmVFbC5jaGlsZHJlbi5sZW5ndGggKiAxMDAgKyAncHgnO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICB1cGRhdGU6IHVwZGF0ZVxufTsiLCIvLyBUaGlzIGZpbGUgaXMgYSBwaXQgb2YgbmV3IHlvcmsgY2l0eSBzbGFybSwgZWRpdCBhdCB5b3VyIG93biByaXNrXG5cblxuLypcbjQpIG1ha2Ugc3VyZSBsb2FkaW5nIGFuZCB3YXZlIHJlbmRlcmluZyBjb2RlIGlzIERSWVxuKi9cblxuXG52YXIgRUUgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG52YXIgQXVkaW9Tb3VyY2UgPSByZXF1aXJlKCdhdWRpb3NvdXJjZScpO1xudmFyIHJhZiA9IHJlcXVpcmUoJ3JhZicpO1xuXG52YXIgdGltZWxpbmVNYW5hZ2UgPSByZXF1aXJlKCcuL3RpbWVsaW5lJyk7XG52YXIgZm9ybWF0VGltZSA9IHJlcXVpcmUoJy4vZm9ybWF0LXRpbWUnKTtcbnZhciBkcmF3QnVmZmVyID0gcmVxdWlyZSgnLi9kcmF3LWJ1ZmZlcicpO1xudmFyIGNvbG9ycyA9IHJlcXVpcmUoJy4vY29sb3JzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gVHJhY2s7XG5cbmZ1bmN0aW9uIFRyYWNrKG9wdHMpIHtcbiAgdGhpcy5lbWl0dGVyID0gbmV3IEVFKCk7XG4gIHRoaXMuY29udHJvbEVsID0gb3B0cy5jb250cm9sRWw7XG4gIHRoaXMudHJhY2tFbCA9IG9wdHMudHJhY2tFbDtcbiAgdGhpcy5hY3RpdmUgPSB0cnVlO1xuICB0aGlzLnNlbGVjdGluZyA9IHRydWU7XG4gIHRoaXMuY29udGV4dCA9IG9wdHMuY29udGV4dDtcbiAgdGhpcy5hdWRpb3NvdXJjZSA9IG9wdHMuYXVkaW9zb3VyY2U7XG4gIHRoaXMuaWQgPSBvcHRzLmlkO1xuICB0aGlzLnRpdGxlID0gb3B0cy50aXRsZTtcblxuICBpZiAob3B0cy5nYWluTm9kZSkge1xuICAgIHRoaXMuZ2Fpbk5vZGUgPSBvcHRzLmdhaW5Ob2RlO1xuICB9XG5cbiAgdGhpcy5jbGlwYm9hcmQgPSB7XG4gICAgc3RhcnQ6IDAsXG4gICAgZW5kOiAwXG4gIH07XG5cbiAgdGhpcy5wbGF5aW5nID0gZmFsc2U7XG5cbiAgdGhpcy5zdGFydE9mZnNldCA9IDA7XG4gIHRoaXMubGFzdFBsYXkgPSAwO1xuXG4gIC8vIGluZGljYXRvcnNcbiAgdGhpcy5maWxlSW5kaWNhdG9yID0gdGhpcy50cmFja0VsLnF1ZXJ5U2VsZWN0b3IoJy50cmFjayBwJyk7XG4gIHRoaXMuY3VycmVudFRpbWVFbCA9IHRoaXMuY29udHJvbEVsLnF1ZXJ5U2VsZWN0b3IoJy5jdXInKTtcbiAgdGhpcy5yZW1haW5pbmdFbCA9IHRoaXMuY29udHJvbEVsLnF1ZXJ5U2VsZWN0b3IoJy5yZW0nKTtcbiAgdGhpcy5kdXJhdGlvbkVsID0gdGhpcy5jb250cm9sRWwucXVlcnlTZWxlY3RvcignLmR1cicpO1xuXG4gIC8vIGNlbnRlciBmaWxlIGluZGljYXRvclxuICB2YXIgdHJhY2tTcGFjZVdpZHRoID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnRyYWNrLXNwYWNlJykub2Zmc2V0V2lkdGg7XG4gIHRoaXMuZmlsZUluZGljYXRvci5zdHlsZS53aWR0aCA9IHRyYWNrU3BhY2VXaWR0aCArICdweCc7XG5cbiAgLy8gY29udHJvbHNcbiAgdGhpcy5nYWluRWwgPSB0aGlzLmNvbnRyb2xFbC5xdWVyeVNlbGVjdG9yKCcudm9sdW1lJyk7XG4gIHRoaXMudm9sdW1lQmFyID0gdGhpcy5nYWluRWwucXVlcnlTZWxlY3RvcignLnZvbHVtZS1iYXInKTtcblxuICAvLyB3YXZlIGVsZW1lbnRzXG4gIHRoaXMud2F2ZSA9IHRoaXMudHJhY2tFbC5xdWVyeVNlbGVjdG9yKCcud2F2ZSBjYW52YXMnKTtcbiAgdGhpcy5wcm9ncmVzc1dhdmUgPSB0aGlzLnRyYWNrRWwucXVlcnlTZWxlY3RvcignLndhdmUtcHJvZ3Jlc3MnKTtcbiAgdGhpcy5jdXJzb3IgPSB0aGlzLnRyYWNrRWwucXVlcnlTZWxlY3RvcignLnBsYXktY3Vyc29yJyk7XG4gIHRoaXMuc2VsZWN0aW9uID0gdGhpcy50cmFja0VsLnF1ZXJ5U2VsZWN0b3IoJy5zZWxlY3Rpb24nKTtcbiAgdGhpcy5zZWxlY3RhYmxlID0gW10uc2xpY2UuY2FsbCh0aGlzLnRyYWNrRWwucXVlcnlTZWxlY3RvckFsbCgnLnNlbGVjdGFibGUnKSk7XG5cbiAgY29sb3JzLnN0YXJ0KHRoaXMuZmlsZUluZGljYXRvciwgMzAwKTtcblxuICB0aGlzLmdhaW5FbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGV2KSB7XG4gICAgdGhpcy52b2x1bWVCYXIuc3R5bGUud2lkdGggPSBldi5vZmZzZXRYICsgJ3B4JztcbiAgICB0aGlzLmdhaW5Ob2RlLmdhaW4udmFsdWUgPSBldi5vZmZzZXRYIC8gdGhpcy5nYWluRWwub2Zmc2V0V2lkdGg7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgdGhpcy5jb250cm9sRWwucXVlcnlTZWxlY3RvcignLmFjdGl2YXRlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihldikge1xuICAgIHZhciBlbCA9IGV2LnRhcmdldDtcblxuICAgIGlmIChlbC5jbGFzc0xpc3QuY29udGFpbnMoJ2FjdGl2ZScpKSB7XG4gICAgICB0aGlzLmFjdGl2ZSA9IGZhbHNlO1xuICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG4gICAgICB0aGlzLnRyYWNrRWwuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYWN0aXZlID0gdHJ1ZTtcbiAgICAgIGVsLmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuICAgICAgdGhpcy50cmFja0VsLmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuICAgIH1cbiAgfS5iaW5kKHRoaXMpKTtcblxuICB0aGlzLnNlbGVjdGFibGUuZm9yRWFjaChmdW5jdGlvbih3YXZlKSB7XG4gICAgd2F2ZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuaW5pdFNlbGVjdGlvbi5iaW5kKHRoaXMpKTtcbiAgICB3YXZlLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIHRoaXMuc3RhcnRTZWxlY3Rpb24uYmluZCh0aGlzKSk7XG4gICAgd2F2ZS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCB0aGlzLnVwZGF0ZVNlbGVjdGlvbi5iaW5kKHRoaXMpKTtcbiAgfSwgdGhpcyk7XG5cbiAgdGhpcy5zZWxlY3Rpb24uYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIGZ1bmN0aW9uKGV2KSB7XG4gICAgaWYgKCF0aGlzLnNlbGVjdGluZykgcmV0dXJuO1xuICAgIHZhciBsZWZ0UGVyY2VudCA9IHBhcnNlRmxvYXQodGhpcy5zZWxlY3Rpb24uc3R5bGUubGVmdC5yZXBsYWNlKCdweCcsICcnKSk7XG4gICAgdmFyIHJpZ2h0UGVyY2VudCA9IGxlZnRQZXJjZW50ICsgcGFyc2VGbG9hdCh0aGlzLnNlbGVjdGlvbi5zdHlsZS53aWR0aC5yZXBsYWNlKCdweCcsICcnKSk7XG4gICAgdGhpcy5jbGlwYm9hcmQuc3RhcnQgPSB0aGlzLmdldFRpbWVGcm9tUG9zaXRpb24obGVmdFBlcmNlbnQpO1xuICAgIHRoaXMuY2xpcGJvYXJkLmVuZCA9IHRoaXMuZ2V0VGltZUZyb21Qb3NpdGlvbihyaWdodFBlcmNlbnQpO1xuICAgIHRoaXMubW92aW5nID0gZmFsc2U7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgdGhpcy5jb250cm9sRWwucXVlcnlTZWxlY3RvcignLm11dGUnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGV2KSB7XG4gICAgdmFyIGVsID0gZXYudGFyZ2V0O1xuXG4gICAgaWYgKGVsLmNsYXNzTGlzdC5jb250YWlucygnYWN0aXZlJykpIHtcbiAgICAgIHRoaXMuZ2Fpbk5vZGUuZ2Fpbi52YWx1ZSA9IHRoaXMubGFzdEdhaW5WYWx1ZTtcbiAgICAgIHRoaXMuZ2FpbkVsLnZhbHVlID0gdGhpcy5sYXN0R2FpblZhbHVlO1xuICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubGFzdEdhaW5WYWx1ZSA9IHRoaXMuZ2Fpbk5vZGUuZ2Fpbi52YWx1ZTtcbiAgICAgIHRoaXMuZ2Fpbk5vZGUuZ2Fpbi52YWx1ZSA9IDA7XG4gICAgICB0aGlzLmdhaW5FbC52YWx1ZSA9IDA7XG4gICAgICBlbC5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtcbiAgICB9XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgdGhpcy5jb250cm9sRWwucXVlcnlTZWxlY3RvcignLmVkaXQnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGV2KSB7XG4gICAgdmFyIGVsID0gZXYudGFyZ2V0O1xuICAgIGlmIChlbC5jbGFzc0xpc3QuY29udGFpbnMoJ2FjdGl2ZScpKSB7XG4gICAgICBlbC5jbGFzc0xpc3QucmVtb3ZlKCdhY3RpdmUnKTtcbiAgICAgIHRoaXMuc2VsZWN0aW5nID0gZmFsc2U7XG4gICAgICB0aGlzLnNlbGVjdGlvbi5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbC5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtcbiAgICAgIHRoaXMuc2VsZWN0aW5nID0gdHJ1ZTtcbiAgICAgIHRoaXMuc2VsZWN0aW9uLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xuICAgIH1cbiAgfS5iaW5kKHRoaXMpKTtcblxuICB0aGlzLmNvbnRyb2xFbC5xdWVyeVNlbGVjdG9yKCcuY29sbGFwc2UnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGV2KSB7XG4gICAgdmFyIGVsID0gZXYudGFyZ2V0O1xuICAgIGlmIChlbC5jbGFzc0xpc3QuY29udGFpbnMoJ2FjdGl2ZScpKSB7XG4gICAgICBlbC5jbGFzc0xpc3QucmVtb3ZlKCdhY3RpdmUnKTtcbiAgICAgIHRoaXMudHJhY2tFbC5jbGFzc0xpc3QuYWRkKCdjb2xsYXBzZWQnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZWwuY2xhc3NMaXN0LmFkZCgnYWN0aXZlJylcbiAgICAgIHRoaXMudHJhY2tFbC5jbGFzc0xpc3QucmVtb3ZlKCdjb2xsYXBzZWQnKTtcbiAgICB9XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgZnVuY3Rpb24gcGxheUxpc3RlbiAoZXYpIHtcbiAgICBpZiAodGhpcy5hY3RpdmUpIHRoaXMucGxheSgpO1xuICB9XG5cbiAgdGhpcy5lbWl0dGVyLm9uKCd0cmFja3M6cGxheScsIHBsYXlMaXN0ZW4uYmluZCh0aGlzKSk7XG5cbiAgZnVuY3Rpb24gcGF1c2VMaXN0ZW4oZXYpIHtcbiAgICBpZiAodGhpcy5hY3RpdmUpIHRoaXMucGF1c2UoKTtcbiAgfVxuXG4gIHRoaXMuZW1pdHRlci5vbigndHJhY2tzOnBhdXNlJywgcGF1c2VMaXN0ZW4uYmluZCh0aGlzKSk7XG5cbiAgZnVuY3Rpb24gc3RvcExpc3Rlbihldikge1xuICAgIGlmICh0aGlzLmFjdGl2ZSkge1xuICAgICAgdGhpcy5zdG9wKCk7XG4gICAgICB0aGlzLnJlc2V0UHJvZ3Jlc3MoKTtcbiAgICB9XG4gIH1cblxuICB0aGlzLmVtaXR0ZXIub24oJ3RyYWNrczpzdG9wJywgc3RvcExpc3Rlbi5iaW5kKHRoaXMpKTtcblxuICB0aGlzLmNvbnRyb2xFbC5xdWVyeVNlbGVjdG9yKCcucmVtb3ZlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihldikge1xuICAgIHRoaXMuc3RvcCgpO1xuICAgIHRoaXMuY29udHJvbEVsLnJlbW92ZSgpO1xuICAgIHRoaXMudHJhY2tFbC5yZW1vdmUoKTtcbiAgICB0aGlzLmVtaXR0ZXIuZW1pdCgndHJhY2tzOnJlbW92ZScsIHtpZDogdGhpcy5pZH0pO1xuICAgIHRoaXMuZW1pdHRlciA9IG51bGw7XG4gIH0uYmluZCh0aGlzKSk7XG59XG5cblRyYWNrLnByb3RvdHlwZSA9IHtcbiAgdXBkYXRlU2VsZWN0aW9uOiBmdW5jdGlvbihldikge1xuICAgIGlmICghdGhpcy5tb3ZpbmcgfHwgIXRoaXMuc2VsZWN0aW5nKSByZXR1cm47XG4gICAgdmFyIGxlZnRQb3NpdGlvbiA9IHRoaXMuZ2V0UG9zaXRpb25Gcm9tQ3Vyc29yKCk7XG4gICAgdmFyIHJpZ2h0UG9zaXRpb24gPSB0aGlzLnBvc2l0aW9uRnJvbUNsaWNrKGV2KTtcbiAgICB2YXIgZGlmZiA9IHJpZ2h0UG9zaXRpb24gLSBsZWZ0UG9zaXRpb247XG5cbiAgICBpZiAoZGlmZiA8PSAwKSB7XG4gICAgICBkaWZmID0gbGVmdFBvc2l0aW9uIC0gcmlnaHRQb3NpdGlvbjtcbiAgICAgIHRoaXMuY3Vyc29yLnN0eWxlLmxlZnQgPSByaWdodFBvc2l0aW9uICsgJ3B4JztcbiAgICAgIHRoaXMuc2VsZWN0aW9uLnN0eWxlLmxlZnQgPSByaWdodFBvc2l0aW9uICsgJ3B4JztcbiAgICB9XG5cbiAgICB0aGlzLnNlbGVjdGlvbi5zdHlsZS53aWR0aCA9IGRpZmYgKydweCc7XG4gIH0sXG4gIHN0YXJ0U2VsZWN0aW9uOiBmdW5jdGlvbihldikge1xuICAgIGlmICh0aGlzLnBsYXlpbmcpIHJldHVybjtcbiAgICBpZiAoIXRoaXMubW92aW5nKSB7XG4gICAgICB2YXIgbGVmdFBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbkZyb21DbGljayhldik7XG4gICAgICBpZiAodGhpcy5zZWxlY3RpbmcpIHtcbiAgICAgICAgdGhpcy5zZWxlY3Rpb24uc3R5bGUubGVmdCA9IGxlZnRQb3NpdGlvbiArICdweCc7XG4gICAgICAgIHRoaXMuc2VsZWN0aW9uLnN0eWxlLndpZHRoID0gMDtcbiAgICAgICAgdGhpcy5tb3ZpbmcgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmN1cnNvci5zdHlsZS5sZWZ0ID0gbGVmdFBvc2l0aW9uICsgJ3B4JztcbiAgICB9XG4gIH0sXG4gIGluaXRTZWxlY3Rpb246IGZ1bmN0aW9uKGV2KSB7XG4gICAgaWYgKHRoaXMucGxheWluZykgcmV0dXJuO1xuICAgIHRoaXMuY3Vyc29yLnN0eWxlLmxlZnQgPSB0aGlzLnBvc2l0aW9uRnJvbUNsaWNrKGV2KStcInB4XCI7XG4gIH0sXG4gIHBsYXk6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMubGFzdFBsYXkgPSB0aGlzLmNvbnRleHQuY3VycmVudFRpbWU7XG4gICAgdGhpcy5wbGF5VHJhY2sodGhpcy5zdGFydE9mZnNldCAlIHRoaXMuYXVkaW9zb3VyY2UuYnVmZmVyLmR1cmF0aW9uKTtcbiAgICB0aGlzLnNldEN1cnNvclZpZXdJbnRlcnZhbCgpO1xuICB9LFxuICBzZXRDdXJzb3JWaWV3SW50ZXJ2YWw6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmN1cnNvclZpZXdJbnRlcnZhbCkge1xuICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLmN1cnNvclZpZXdJbnRlcnZhbCk7XG4gICAgfVxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmN1cnNvclZpZXdJbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmN1cnNvci5zY3JvbGxJbnRvVmlld0lmTmVlZGVkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCAyMDApO1xuICB9LFxuICBwb3NpdGlvbkZyb21DbGljazogZnVuY3Rpb24oZXYpIHtcbiAgICB2YXIgeCA9IGV2Lm9mZnNldFggfHwgZXYubGF5ZXJYO1xuICAgIHJldHVybiB4ICsgMjE7XG4gIH0sXG4gIGdldFBvc2l0aW9uRnJvbUN1cnNvcjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHBhcnNlRmxvYXQodGhpcy5jdXJzb3Iuc3R5bGUubGVmdC5yZXBsYWNlKCdweCcsICcnKSk7XG4gIH0sXG4gIGdldFRpbWVGcm9tUG9zaXRpb246IGZ1bmN0aW9uKHBvc2l0aW9uKSB7XG4gICAgcmV0dXJuIChwb3NpdGlvbiAvIDEwMCkgKiA1O1xuICB9LFxuICBzdG9wOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnBsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLnN0YXJ0T2Zmc2V0ID0gMDtcbiAgICB0aGlzLmxhc3RQbGF5ID0gMDtcbiAgICBjbGVhckludGVydmFsKHRoaXMuY3Vyc29yVmlld0ludGVydmFsKTtcbiAgICBpZiAodGhpcy5hdWRpb3NvdXJjZS5zb3VyY2UpIHRoaXMuYXVkaW9zb3VyY2Uuc3RvcCgpO1xuICB9LFxuICByZXNldFByb2dyZXNzOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnByb2dyZXNzV2F2ZS5zdHlsZS53aWR0aCA9IFwiMHB4XCI7XG4gICAgdGhpcy5jdXJzb3Iuc3R5bGUubGVmdCA9IFwiMHB4XCI7XG4gIH0sXG4gIHBhdXNlOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmF1ZGlvc291cmNlLnN0b3AoKTtcbiAgICB0aGlzLnN0YXJ0T2Zmc2V0ICs9IHRoaXMuY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMubGFzdFBsYXk7XG4gICAgdGhpcy5wbGF5aW5nID0gZmFsc2U7XG4gIH0sXG4gIHNraXBGb3J3YXJkOiBmdW5jdGlvbigpIHt9LFxuICBza2lwQmFja3dhcmQ6IGZ1bmN0aW9uKCkge30sXG4gIHBsYXlUcmFjazogZnVuY3Rpb24ob2Zmc2V0LCBzdG9wT2Zmc2V0KSB7XG4gICAgaWYgKHRoaXMucGxheWluZykgdGhpcy5hdWRpb3NvdXJjZS5zdG9wKCk7XG4gICAgdGhpcy5hdWRpb3NvdXJjZS5wbGF5KDAsIG9mZnNldCk7XG4gICAgdGhpcy5hdWRpb3NvdXJjZS5wbGF5KDAsIG9mZnNldCk7XG4gICAgdGhpcy5wbGF5aW5nID0gdHJ1ZTtcbiAgICByYWYodGhpcy50cmlnZ2VyUGxheWluZy5iaW5kKHRoaXMpKTtcbiAgfSxcbiAgdXBkYXRlVmlzdWFsUHJvZ3Jlc3M6IGZ1bmN0aW9uIChwb3MpIHtcbiAgICB0aGlzLnByb2dyZXNzV2F2ZS5zdHlsZS53aWR0aCA9IHBvcytcInB4XCI7XG4gICAgdGhpcy5jdXJzb3Iuc3R5bGUubGVmdCA9ICgyMStwb3MpK1wicHhcIjsgLy8gMjEgaXMgdGhlIHBhZGRpbmctbGVmdCBmcm9tIGJlZ2lubmluZyBvZiB0cmFjayBlbGVtZW50XG4gIH0sXG4gIHRyaWdnZXJQbGF5aW5nOiBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMucGxheWluZykgcmV0dXJuO1xuXG4gICAgdmFyIGR1ciA9IHRoaXMuYXVkaW9zb3VyY2UuYnVmZmVyLmR1cmF0aW9uO1xuICAgIHZhciBjdXJyZW50VGltZSA9IHRoaXMuY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMubGFzdFBsYXkgKyB0aGlzLnN0YXJ0T2Zmc2V0O1xuICAgIHZhciByZW1haW5pbmdUaW1lID0gZHVyIC0gY3VycmVudFRpbWU7XG5cbiAgICAvLyB0aGlzIGlzIHRoZSBzYW1lIHdheSB3ZSBhcmUgY2FjdWxhdGluZyB0aGUgd2lkdGggb2YgdGhlIHdhdmVzXG4gICAgLy8gdG8gbWF0Y2ggdXAgdG8gdGhlIHRpbWVsaW5lXG4gICAgdGhpcy51cGRhdGVWaXN1YWxQcm9ncmVzcygoKGN1cnJlbnRUaW1lKSAvIDUpICogMTAwKTtcblxuICAgIHRoaXMuY3VycmVudFRpbWVFbC50ZXh0Q29udGVudCA9IGZvcm1hdFRpbWUoY3VycmVudFRpbWUsIHRydWUpO1xuICAgIHRoaXMucmVtYWluaW5nRWwudGV4dENvbnRlbnQgPSBmb3JtYXRUaW1lKHJlbWFpbmluZ1RpbWUsIHRydWUpO1xuXG4gICAgaWYgKHJlbWFpbmluZ1RpbWUgPD0gMCkge1xuICAgICAgdGhpcy5wbGF5aW5nID0gIXRoaXMucGxheWluZztcbiAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5jdXJzb3JWaWV3SW50ZXJ2YWwpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByYWYodGhpcy50cmlnZ2VyUGxheWluZy5iaW5kKHRoaXMpKTtcbiAgfSxcbiAgY3VycmVudFRpbWVUb1BlcmNlbnQ6IGZ1bmN0aW9uIChjdXJyZW50VGltZSkge1xuICAgIHZhciBkdXIgPSB0aGlzLmF1ZGlvc291cmNlLmJ1ZmZlci5kdXJhdGlvbjtcbiAgICB2YXIgY3VyID0gKGN1cnJlbnRUaW1lIC0gdGhpcy5sYXN0UGxheSArIHRoaXMuc3RhcnRPZmZzZXQgJSA2MCkgKiAxMDtcbiAgICByZXR1cm4gKChjdXIgLyBkdXIpICogMTApLnRvRml4ZWQoMyk7XG4gIH0sXG4gIHJlc2V0VmlzdWFsOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgY3R4ID0gdGhpcy53YXZlLmdldENvbnRleHQoJzJkJyk7XG4gICAgY3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLndhdmUud2lkdGgsIHRoaXMud2F2ZS5oZWlnaHQpO1xuICAgIGN0eCA9IHRoaXMucHJvZ3Jlc3NXYXZlLnF1ZXJ5U2VsZWN0b3IoJ2NhbnZhcycpLmdldENvbnRleHQoJzJkJyk7XG4gICAgY3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLndhdmUud2lkdGgsIHRoaXMud2F2ZS5oZWlnaHQpO1xuICB9LFxuICBsb2FkV2l0aEF1ZGlvQnVmZmVyOiBmdW5jdGlvbihhdWRpb0J1ZmZlcikge1xuICAgIHRoaXMuZ2Fpbk5vZGUgPSB0aGlzLmNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIHRoaXMuYXVkaW9zb3VyY2UgPSBuZXcgQXVkaW9Tb3VyY2UodGhpcy5jb250ZXh0LCB7XG4gICAgICBnYWluTm9kZTogdGhpcy5nYWluTm9kZVxuICAgIH0pO1xuICAgIHRoaXMuZHJhd1dhdmVzKCk7XG4gIH0sXG4gIGxvYWRVUkw6IGZ1bmN0aW9uICh1cmwpIHtcbiAgICB0aGlzLmZpbGVJbmRpY2F0b3IudGV4dENvbnRlbnQgPSAnbG9hZGluZyBmaWxlIGZyb20gdXJsLi4uJztcblxuICAgIHZhciByZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICByZXEub3BlbignR0VUJywgdXJsLCB0cnVlKTtcbiAgICAgICAgcmVxLnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJlcS5vbmxvYWRlbmQgPSBmdW5jdGlvbihldikge1xuICAgICAgc2VsZi5maWxlSW5kaWNhdG9yLnRleHRDb250ZW50ID0gJ2RlY29kaW5nIGF1ZGlvIGRhdGEuLi4nO1xuXG4gICAgICBzZWxmLmNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKHJlcS5yZXNwb25zZSwgZnVuY3Rpb24oYnVmKSB7XG4gICAgICAgIHNlbGYuZmlsZUluZGljYXRvci50ZXh0Q29udGVudCA9ICdyZW5kZXJpbmcgd2F2ZS4uLic7XG5cbiAgICAgICAgc2VsZi5nYWluTm9kZSA9IHNlbGYuY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgIHNlbGYuYXVkaW9zb3VyY2UgPSBuZXcgQXVkaW9Tb3VyY2Uoc2VsZi5jb250ZXh0LCB7XG4gICAgICAgICAgZ2Fpbk5vZGU6IHNlbGYuZ2Fpbk5vZGVcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2VsZi5kdXJhdGlvbkVsLnRleHRDb250ZW50ID0gZm9ybWF0VGltZShidWYuZHVyYXRpb24sIHRydWUpO1xuICAgICAgICBzZWxmLnJlbWFpbmluZ0VsLnRleHRDb250ZW50ID0gZm9ybWF0VGltZShidWYuZHVyYXRpb24sIHRydWUpO1xuXG4gICAgICAgIHNlbGYuYXVkaW9zb3VyY2UuYnVmZmVyID0gYnVmO1xuXG4gICAgICAgIHNlbGYuYWRqdXN0V2F2ZSgpO1xuICAgICAgICBkcmF3QnVmZmVyKHNlbGYud2F2ZSwgYnVmLCAnIzUyRjZBNCcpO1xuICAgICAgICBkcmF3QnVmZmVyKHNlbGYucHJvZ3Jlc3NXYXZlLnF1ZXJ5U2VsZWN0b3IoJ2NhbnZhcycpLCBidWYsICcjRjQ0NUYwJyk7XG4gICAgICAgIHNlbGYuZmlsZUluZGljYXRvci5yZW1vdmUoKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXEuc2VuZCgpO1xuICB9LFxuICBsb2FkRmlsZTogZnVuY3Rpb24gKGZpbGUpIHtcbiAgICB0aGlzLmZpbGVJbmRpY2F0b3IudGV4dENvbnRlbnQgPSAnbG9hZGluZyBmaWxlLi4uJztcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICByZWFkZXIub25sb2FkZW5kID0gZnVuY3Rpb24oZXYpIHtcbiAgICAgIHNlbGYuZmlsZUluZGljYXRvci50ZXh0Q29udGVudCA9ICdkZWNvZGluZyBhdWRpbyBkYXRhLi4uJztcblxuICAgICAgc2VsZi5jb250ZXh0LmRlY29kZUF1ZGlvRGF0YShldi50YXJnZXQucmVzdWx0LCBmdW5jdGlvbihidWYpIHtcbiAgICAgICAgc2VsZi5maWxlSW5kaWNhdG9yLnRleHRDb250ZW50ID0gJ3JlbmRlcmluZyB3YXZlLi4uJztcblxuICAgICAgICBzZWxmLmdhaW5Ob2RlID0gc2VsZi5jb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgc2VsZi5hdWRpb3NvdXJjZSA9IG5ldyBBdWRpb1NvdXJjZShzZWxmLmNvbnRleHQsIHtcbiAgICAgICAgICBnYWluTm9kZTogc2VsZi5nYWluTm9kZVxuICAgICAgICB9KTtcblxuICAgICAgICBzZWxmLmR1cmF0aW9uRWwudGV4dENvbnRlbnQgPSBmb3JtYXRUaW1lKGJ1Zi5kdXJhdGlvbiwgdHJ1ZSk7XG4gICAgICAgIHNlbGYucmVtYWluaW5nRWwudGV4dENvbnRlbnQgPSBmb3JtYXRUaW1lKGJ1Zi5kdXJhdGlvbiwgdHJ1ZSk7XG5cbiAgICAgICAgc2VsZi5hdWRpb3NvdXJjZS5idWZmZXIgPSBidWY7XG5cbiAgICAgICAgc2VsZi5hZGp1c3RXYXZlKCk7XG4gICAgICAgIGRyYXdCdWZmZXIoc2VsZi53YXZlLCBidWYsICcjNTJGNkE0Jyk7XG4gICAgICAgIGRyYXdCdWZmZXIoc2VsZi5wcm9ncmVzc1dhdmUucXVlcnlTZWxlY3RvcignY2FudmFzJyksIGJ1ZiwgJyNGNDQ1RjAnKTtcbiAgICAgICAgc2VsZi5maWxlSW5kaWNhdG9yLnJlbW92ZSgpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihmaWxlKTtcbiAgfSxcbiAgYWRqdXN0V2F2ZTogZnVuY3Rpb24oKSB7XG4gICAgdGltZWxpbmVNYW5hZ2UudXBkYXRlKHRoaXMuYXVkaW9zb3VyY2UuYnVmZmVyLmR1cmF0aW9uKTtcbiAgICAvLyBhZGp1c3QgdGhlIGNhbnZhcyBhbmQgY29udGFpbmVycyB0byBmaXQgd2l0aCB0aGUgYnVmZmVyIGR1cmF0aW9uXG4gICAgdmFyIHcgPSAodGhpcy5hdWRpb3NvdXJjZS5idWZmZXIuZHVyYXRpb24gLyA1KSAqIDEwMDtcbiAgICB0aGlzLndhdmUud2lkdGggPSB3O1xuICAgIHRoaXMucHJvZ3Jlc3NXYXZlLnF1ZXJ5U2VsZWN0b3IoJ2NhbnZhcycpLndpZHRoID0gdztcbiAgfSxcbiAgZHJhd1dhdmVzOiBmdW5jdGlvbigpIHtcbiAgICB0aW1lbGluZU1hbmFnZS51cGRhdGUodGhpcy5hdWRpb3NvdXJjZS5idWZmZXIuZHVyYXRpb24pO1xuICAgIHZhciBwcmV2TGVmdCA9IDA7XG4gICAgaWYgKHRoaXMuY3Vyc29yLnN0eWxlLmxlZnQpIHtcbiAgICAgIHByZXZMZWZ0ID0gcGFyc2VGbG9hdCh0aGlzLmN1cnNvci5zdHlsZS5sZWZ0LnJlcGxhY2UoJ3B4JywgJycpKTtcbiAgICB9XG4gICAgdGhpcy5yZXNldFZpc3VhbCgpO1xuICAgIGRyYXdCdWZmZXIodGhpcy53YXZlLCB0aGlzLmF1ZGlvc291cmNlLmJ1ZmZlciwgJyM1MkY2QTQnKTtcbiAgICBkcmF3QnVmZmVyKHRoaXMucHJvZ3Jlc3NXYXZlLnF1ZXJ5U2VsZWN0b3IoJ2NhbnZhcycpLCB0aGlzLmF1ZGlvc291cmNlLmJ1ZmZlciwgJyNGNDQ1RjAnKTtcbiAgICBjb2xvcnMuZW5kKCk7XG4gICAgY29uc29sZS5sb2coJ3dhdmVzIHVwZGF0ZWQuJylcbiAgfVxufSIsInZhciBFRSA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcbnZhciBkcmFnRHJvcCA9IHJlcXVpcmUoJ2RyYWctZHJvcCcpO1xudmFyIEF1ZGlvQ29udGV4dCA9IHJlcXVpcmUoJ2F1ZGlvY29udGV4dCcpO1xudmFyIEF1ZGlvU291cmNlID0gcmVxdWlyZSgnYXVkaW9zb3VyY2UnKTtcbnZhciBGRlQgPSByZXF1aXJlKCdhdWRpby1mZnQnKTtcblxudmFyIGVkaXRvciA9IHJlcXVpcmUoJy4vbGliL2VkaXRzJyk7XG52YXIgcmVjb3JkZXIgPSByZXF1aXJlKCcuL2xpYi9yZWNvcmQnKTtcbnZhciBUcmFjayA9IHJlcXVpcmUoJy4vbGliL3RyYWNrJyk7XG5cbnZhciB0cmFja1RtcCA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy90cmFjay10bXAnKTtcbnZhciBjb250cm9sVG1wID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL2NvbnRyb2wtdG1wJyk7XG5cbnZhciBhdWRpb0NvbnRleHQgPSBuZXcgQXVkaW9Db250ZXh0KCk7XG52YXIgbWFzdGVyR2Fpbk5vZGUgPSBhdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xudmFyIHVuaXFJZCA9IGZ1bmN0aW9uKCkge3JldHVybiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDE2KS5zbGljZSgyKX07XG5cbnZhciBkcmF3ZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuZHJhd2VyJyk7XG52YXIgZmZ0ID0gbmV3IEZGVChhdWRpb0NvbnRleHQsIHtjYW52YXM6IGRyYXdlci5xdWVyeVNlbGVjdG9yKCcjZmZ0Jyl9KTtcblxudmFyIGNvbnRyb2xTcGFjZUVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmNvbnRyb2wtc3BhY2UnKTtcbnZhciB3b3Jrc3BhY2VFbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyN3b3Jrc3BhY2UnKTtcbnZhciB0cmFja1NwYWNlRWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcudHJhY2stc3BhY2UnKTtcblxuLy8gY29udHJvbHNcbnZhciB3ZWxjb21lID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLndlbGNvbWUnKTtcbnZhciB3ZWxjb21lSW1wb3J0QnRuID0gd2VsY29tZS5xdWVyeVNlbGVjdG9yKCcuaW1wb3J0Jyk7XG52YXIgd2VsY29tZVJlY29yZEJ0biA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5yZWNvcmQnKTtcbnZhciBpbXBvcnRCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuaW1wb3J0Jyk7XG52YXIgaW1wb3J0SW5wdXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjaW1wb3J0Jyk7XG52YXIgcGxheUJ0biA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNwbGF5Jyk7XG52YXIgcGF1c2VCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcGF1c2UnKTtcbnZhciBzdG9wQnRuID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3N0b3AnKTtcbnZhciBjdXRCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjY3V0Jyk7XG52YXIgY29weUJ0biA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNjb3B5Jyk7XG52YXIgcGFzdGVCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcGFzdGUnKTtcbnZhciBwcmVwZW5kQnRuID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3ByZXBlbmQnKTtcbnZhciBhcHBlbmRCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjYXBwZW5kJyk7XG52YXIgZHVwbGljYXRlQnRuID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2R1cGxpY2F0ZScpO1xudmFyIHJldmVyc2VCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcmV2ZXJzZScpO1xudmFyIHJlbW92ZUJ0biA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNyZW1vdmUnKTtcbnZhciByZWNvcmRCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcmVjb3JkJyk7XG52YXIgdHJhY2tzID0ge307XG5cbnZhciByZWNvcmRpbmcgPSBmYWxzZTtcblxucmVjb3JkQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gIGlmICghcmVjb3JkaW5nKSB7XG4gICAgcmVjb3JkZXIuc3RhcnQoYXVkaW9Db250ZXh0LCBmZnQpO1xuICAgIHJlY29yZEJ0bi5pbm5lclRleHQgPSAnc3RvcCByZWNvcmRpbmcnO1xuICAgIGRyYXdlci5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtcbiAgICByZWNvcmRpbmcgPSB0cnVlO1xuICB9IGVsc2Uge1xuICAgIGRyYXdlci5jbGFzc0xpc3QucmVtb3ZlKCdhY3RpdmUnKTtcbiAgICByZWNvcmRCdG4uaW5uZXJUZXh0ID0gJ3JlY29yZCc7XG4gICAgcmVjb3JkZXIuc3RvcChmdW5jdGlvbihibG9iKSB7XG4gICAgICAgICAgICAgICBuZXdUcmFja0Zyb21VUkwoVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKSk7XG4gICAgICAgICAgICAgfSk7XG4gICAgcmVjb3JkaW5nID0gZmFsc2U7XG4gIH1cbn0pXG5cbmRyYWdEcm9wKCdib2R5JywgZnVuY3Rpb24gKGZpbGVzKSB7XG4gIHdlbGNvbWUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgbmV3VHJhY2tGcm9tRmlsZShmaWxlc1swXSk7XG59KTtcblxud2VsY29tZUltcG9ydEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjaW1wb3J0JykuY2xpY2soKTtcbn0pXG5cbndlbGNvbWVSZWNvcmRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgd2VsY29tZVJlY29yZEJ0bi5xdWVyeVNlbGVjdG9yKCdoNCcpLmlubmVyVGV4dCA9ICdzdG9wIHJlY29yZGluZyc7XG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNyZWNvcmQnKS5jbGljaygpO1xufSlcblxuaW1wb3J0QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNpbXBvcnQnKS5jbGljaygpO1xufSlcblxuaW1wb3J0SW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3Rpb24oZXYpIHtcbiAgbmV3VHJhY2tGcm9tRmlsZShldi50YXJnZXQuZmlsZXNbMF0pO1xufSk7XG5cbnBsYXlCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgT2JqZWN0LmtleXModHJhY2tzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIHRyYWNrc1trZXldLmVtaXR0ZXIuZW1pdCgndHJhY2tzOnBsYXknLCB7fSk7XG4gIH0pO1xufSk7XG5cbnBhdXNlQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gIE9iamVjdC5rZXlzKHRyYWNrcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICB0cmFja3Nba2V5XS5lbWl0dGVyLmVtaXQoJ3RyYWNrczpwYXVzZScsIHt9KTtcbiAgfSk7XG59KTtcblxuc3RvcEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICBPYmplY3Qua2V5cyh0cmFja3MpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgdHJhY2tzW2tleV0uZW1pdHRlci5lbWl0KCd0cmFja3M6c3RvcCcsIHt9KTtcbiAgfSk7XG59KTtcblxuZnVuY3Rpb24gc2hvd1Bhc3RlQ3Vyc29ycygpIHtcbiAgdmFyIHNlbGVjdGlvbnMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuc2VsZWN0aW9uJyk7XG4gIGZvciAodmFyIGk9MDsgaSA8IHNlbGVjdGlvbnM7IGkrKykge1xuICAgIHNlbGVjdGlvbnNbaV0uc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgfVxuICB2YXIgcGFzdGVDdXJzb3JzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnBhc3RlLWN1cnNvcicpO1xuICBmb3IgKHZhciBpPTA7IGkgPCBwYXN0ZUN1cnNvcnM7IGkrKykge1xuICAgIHBhc3RlQ3Vyc29yc1tpXS5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcbiAgfVxufVxuXG5mdW5jdGlvbiBoaWRlUGFzdGVDdXJzb3JzKCkge1xuICB2YXIgc2VsZWN0aW9ucyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5zZWxlY3Rpb24nKTtcbiAgZm9yICh2YXIgaT0wOyBpIDwgc2VsZWN0aW9uczsgaSsrKSB7XG4gICAgc2VsZWN0aW9uc1tpXS5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcbiAgfVxuICB2YXIgcGFzdGVDdXJzb3JzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnBhc3RlLWN1cnNvcicpO1xuICBmb3IgKHZhciBpPTA7IGkgPCBwYXN0ZUN1cnNvcnM7IGkrKykge1xuICAgIHBhc3RlQ3Vyc29yc1tpXS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICB9XG59XG5cbmZ1bmN0aW9uIGVuYWJsZVBsYXliYWNrT3B0cygpIHtcbiAgcGxheUJ0bi5kaXNhYmxlZCA9IGZhbHNlO1xuICBjb3B5QnRuLmRpc2FibGVkID0gZmFsc2U7XG4gIGN1dEJ0bi5kaXNhYmxlZCA9IGZhbHNlO1xuICBzdG9wQnRuLmRpc2FibGVkID0gZmFsc2U7XG4gIHBhdXNlQnRuLmRpc2FibGVkID0gZmFsc2U7XG4gIHJldmVyc2VCdG4uZGlzYWJsZWQgPSBmYWxzZTtcbn1cblxuZnVuY3Rpb24gZW5hYmxlQ2xpcGJvYXJkT3B0cygpIHtcbiAgcHJlcGVuZEJ0bi5kaXNhYmxlZCA9IGZhbHNlO1xuICBhcHBlbmRCdG4uZGlzYWJsZWQgPSBmYWxzZTtcbiAgcGFzdGVCdG4uZGlzYWJsZWQgPSBmYWxzZTtcbiAgZHVwbGljYXRlQnRuLmRpc2FibGVkID0gZmFsc2U7XG59XG5cbmNvcHlCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgdmFyIGFjdGl2ZVRyYWNrID0gZ2V0QWN0aXZlVHJhY2soKTtcbiAgaWYgKCFhY3RpdmVUcmFjaykgcmV0dXJuO1xuXG4gIHZhciBvbkNvbXBsZXRlID0gZnVuY3Rpb24oKSB7XG4gICAgY29uc29sZS5sb2coJ2NvcHkgYnVmZmVyIGNvbXBsZXRlOiAnLCBhY3RpdmVUcmFjay5jbGlwYm9hcmQuYnVmZmVyKTtcbiAgfTtcblxuICBzaG93UGFzdGVDdXJzb3JzKCk7XG4gIGVuYWJsZUNsaXBib2FyZE9wdHMoKTtcbiAgZWRpdG9yLmNvcHkoYXVkaW9Db250ZXh0LCBhY3RpdmVUcmFjay5jbGlwYm9hcmQsIGFjdGl2ZVRyYWNrLmF1ZGlvc291cmNlLmJ1ZmZlciwgb25Db21wbGV0ZSk7XG59KTtcblxuY3V0QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gIHZhciBhY3RpdmVUcmFjayA9IGdldEFjdGl2ZVRyYWNrKCk7XG4gIGlmICghYWN0aXZlVHJhY2spIHJldHVybjtcblxuICB2YXIgb25Db21wbGV0ZSA9IGZ1bmN0aW9uKGJ1Zikge1xuICAgIGFjdGl2ZVRyYWNrLmF1ZGlvc291cmNlLmJ1ZmZlciA9IGJ1ZjtcbiAgICBhY3RpdmVUcmFjay5kcmF3V2F2ZXMoKTtcbiAgfTtcblxuICBhY3RpdmVUcmFjay5jbGlwYm9hcmQuc3RhcnQgPSBhY3RpdmVUcmFjay5jbGlwYm9hcmQuc3RhcnQgKyBhY3RpdmVUcmFjay5sYXN0UGxheTtcbiAgYWN0aXZlVHJhY2suY2xpcGJvYXJkLmVuZCA9IGFjdGl2ZVRyYWNrLmNsaXBib2FyZC5lbmQgKyBhY3RpdmVUcmFjay5sYXN0UGxheTtcblxuICBzaG93UGFzdGVDdXJzb3JzKCk7XG4gIGVuYWJsZUNsaXBib2FyZE9wdHMoKTtcbiAgZWRpdG9yLmN1dChhdWRpb0NvbnRleHQsIGFjdGl2ZVRyYWNrLmNsaXBib2FyZCwgYWN0aXZlVHJhY2suYXVkaW9zb3VyY2UuYnVmZmVyLCBvbkNvbXBsZXRlKTtcbn0pO1xuXG5wYXN0ZUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICB2YXIgYWN0aXZlVHJhY2sgPSBnZXRBY3RpdmVUcmFjaygpO1xuICBpZiAoIWFjdGl2ZVRyYWNrKSByZXR1cm47XG4gIHZhciBvbkNvbXBsZXRlID0gZnVuY3Rpb24oYnVmKSB7XG4gICAgYWN0aXZlVHJhY2suYXVkaW9zb3VyY2UuYnVmZmVyID0gYnVmO1xuICAgIGNvbnNvbGUubG9nKCdjYiBjYWxsZWQgcGFzdGUnKTtcbiAgICBhY3RpdmVUcmFjay5kcmF3V2F2ZXMoKTtcbiAgfTtcblxuICBlZGl0b3IucGFzdGUoYXVkaW9Db250ZXh0LCBhY3RpdmVUcmFjay5jbGlwYm9hcmQsIGFjdGl2ZVRyYWNrLmF1ZGlvc291cmNlLmJ1ZmZlciwgYWN0aXZlVHJhY2suY2xpcGJvYXJkLmF0LCBvbkNvbXBsZXRlKTtcbiAgaGlkZVBhc3RlQ3Vyc29ycygpO1xufSk7XG5cbnByZXBlbmRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgdmFyIGFjdGl2ZVRyYWNrID0gZ2V0QWN0aXZlVHJhY2soKTtcbiAgaWYgKCFhY3RpdmVUcmFjaykgcmV0dXJuO1xuICB2YXIgb25Db21wbGV0ZSA9IGZ1bmN0aW9uKGJ1Zikge1xuICAgIGFjdGl2ZVRyYWNrLmF1ZGlvc291cmNlLmJ1ZmZlciA9IGJ1ZjtcbiAgICBhY3RpdmVUcmFjay5kcmF3V2F2ZXMoKTtcbiAgfTtcblxuICBlZGl0b3IucGFzdGUoYXVkaW9Db250ZXh0LCBhY3RpdmVUcmFjay5jbGlwYm9hcmQsIGFjdGl2ZVRyYWNrLmF1ZGlvc291cmNlLmJ1ZmZlciwgMCwgb25Db21wbGV0ZSk7XG59KTtcblxuYXBwZW5kQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gIHZhciBhY3RpdmVUcmFjayA9IGdldEFjdGl2ZVRyYWNrKCk7XG4gIGlmICghYWN0aXZlVHJhY2spIHJldHVybjtcbiAgdmFyIG9uQ29tcGxldGUgPSBmdW5jdGlvbihidWYpIHtcbiAgICBhY3RpdmVUcmFjay5hdWRpb3NvdXJjZS5idWZmZXIgPSBidWY7XG4gICAgYWN0aXZlVHJhY2suZHJhd1dhdmVzKCk7XG4gIH07XG5cbiAgZWRpdG9yLnBhc3RlKGF1ZGlvQ29udGV4dCwgYWN0aXZlVHJhY2suY2xpcGJvYXJkLCBhY3RpdmVUcmFjay5hdWRpb3NvdXJjZS5idWZmZXIsIGFjdGl2ZVRyYWNrLmF1ZGlvc291cmNlLmJ1ZmZlci5kdXJhdGlvbiwgb25Db21wbGV0ZSk7XG59KTtcblxucmV2ZXJzZUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICB2YXIgYWN0aXZlVHJhY2sgPSBnZXRBY3RpdmVUcmFjaygpO1xuICBpZiAoIWFjdGl2ZVRyYWNrKSByZXR1cm47XG4gIHZhciBvbkNvbXBsZXRlID0gZnVuY3Rpb24oKSB7XG4gICAgYWN0aXZlVHJhY2suZHJhd1dhdmVzKCk7XG4gIH07XG5cbiAgZWRpdG9yLnJldmVyc2UoYWN0aXZlVHJhY2suYXVkaW9zb3VyY2UuYnVmZmVyLCBvbkNvbXBsZXRlKTtcbn0pO1xuXG5kdXBsaWNhdGVCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgdmFyIGFjdGl2ZVRyYWNrID0gZ2V0QWN0aXZlVHJhY2soKTtcbiAgaWYgKCFhY3RpdmVUcmFjaykgcmV0dXJuO1xuXG4gIHZhciBvbkNvbXBsZXRlID0gZnVuY3Rpb24oKSB7XG4gICAgY29uc29sZS5sb2coJ2R1cGxpY2F0aW5nIGJ1ZmZlcjogJywgYWN0aXZlVHJhY2suY2xpcGJvYXJkLmJ1ZmZlcik7XG4gICAgbmV3VHJhY2tGcm9tQXVkaW9CdWZmZXIoYWN0aXZlVHJhY2suY2xpcGJvYXJkLmJ1ZmZlcik7XG4gIH07XG5cbiAgaWYgKGFjdGl2ZVRyYWNrLmNsaXBib2FyZC5idWZmZXIpIHtcbiAgICBvbkNvbXBsZXRlKCk7XG4gIH0gZWxzZSBpZiAoYWN0aXZlVHJhY2suY2xpcGJvYXJkLnN0YXJ0ID09PSAwICYmIGFjdGl2ZVRyYWNrLmNsaXBib2FyZC5lbmQgPT09IDApIHtcbiAgICBhY3RpdmVUcmFjay5jbGlwYm9hcmQuZW5kID0gYWN0aXZlVHJhY2suYXVkaW9zb3VyY2UuYnVmZmVyLmR1cmF0aW9uO1xuICAgIGVkaXRvci5jb3B5KGF1ZGlvQ29udGV4dCwgYWN0aXZlVHJhY2suY2xpcGJvYXJkLCBhY3RpdmVUcmFjay5hdWRpb3NvdXJjZS5idWZmZXIsIG9uQ29tcGxldGUpO1xuICB9IGVsc2Uge1xuICAgIGVkaXRvci5jb3B5KGF1ZGlvQ29udGV4dCwgYWN0aXZlVHJhY2suY2xpcGJvYXJkLCBhY3RpdmVUcmFjay5hdWRpb3NvdXJjZS5idWZmZXIsIG9uQ29tcGxldGUpO1xuICB9XG59KTtcblxuZnVuY3Rpb24gZ2V0QWN0aXZlVHJhY2soKSB7XG4gIHZhciBhY3RpdmVUcmFja3MgPSBbXTtcbiAgT2JqZWN0LmtleXModHJhY2tzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmICh0cmFja3Nba2V5XS5hY3RpdmUpIGFjdGl2ZVRyYWNrcy5wdXNoKHRyYWNrc1trZXldKTtcbiAgfSk7XG5cbiAgaWYgKGFjdGl2ZVRyYWNrcy5sZW5ndGggPiAxKSB7XG4gICAgYWxlcnQoJ1lvdSBjYW5ub3QgaGF2ZSBtb3JlIHRoYW4gb25lIGFjdGl2YXRlZCB0cmFjayBmb3IgdGhpcyBvcHRpb24nKTtcbiAgfSBlbHNlIGlmKCFhY3RpdmVUcmFja3MubGVuZ3RoKSB7XG4gICAgYWxlcnQoJ1RoZXJlIGlzIG5vIGFjdGl2ZSB0cmFjaycpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBhY3RpdmVUcmFja3NbMF07XG4gIH1cbn1cblxuZnVuY3Rpb24gbmV3VHJhY2tGcm9tQXVkaW9CdWZmZXIoYXVkaW9CdWZmZXIpIHtcbiAgdmFyIGNvbnRhaW5lckVsID0gdHJhY2tUbXAoe1xuICAgIHRpdGxlOiBcIlRyYWNrIDFcIlxuICB9KTtcbiAgdmFyIGlkID0gdW5pcUlkKCk7XG4gIHdvcmtzcGFjZUVsLmFwcGVuZENoaWxkKGNvbnRhaW5lckVsKTtcbiAgdHJhY2tzW2lkXSA9IG5ldyBUcmFjayh7XG4gICAgaWQ6IGlkLFxuICAgIGNvbnRhaW5FbDogY29udGFpbmVyRWwsXG4gICAgY29udGV4dDogYXVkaW9Db250ZXh0LFxuICAgIGdhaW5Ob2RlOiBhdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpXG4gIH0pO1xuXG4gIHRyYWNrc1tpZF0uYXVkaW9zb3VyY2UgPSBuZXcgQXVkaW9Tb3VyY2UoYXVkaW9Db250ZXh0LCB7XG4gICAgZ2Fpbk5vZGU6IHRyYWNrc1tpZF0uZ2Fpbk5vZGVcbiAgfSk7XG5cbiAgdHJhY2tzW2lkXS5hdWRpb3NvdXJjZS5idWZmZXIgPSBhdWRpb0J1ZmZlcjtcblxuICB0cmFja3NbaWRdLmFkanVzdFdhdmUoKTtcbiAgdHJhY2tzW2lkXS5kcmF3V2F2ZXMoKTtcbiAgdHJhY2tzW2lkXS5maWxlSW5kaWNhdG9yLnJlbW92ZSgpO1xufVxuXG5mdW5jdGlvbiBuZXdUcmFja0Zyb21GaWxlKGZpbGUpIHtcbiAgaWYgKGZpbGUgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuICBpZiAoIX5maWxlLnR5cGUuaW5kZXhPZignYXVkaW8nKSkge1xuICAgIGFsZXJ0KCdhdWRpbyBmaWxlcyBvbmx5IHBsZWFzZS4nKTtcbiAgICAvLyBhbGVydChmaWxlLnR5cGUgKyAnIGZpbGVzIGFyZSBub3Qgc3VwcG9ydGVkLicpO1xuICAgIHJldHVybjtcbiAgfVxuICB3ZWxjb21lLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gIHZhciB0cmFja0VsID0gdHJhY2tUbXAoKTtcbiAgdmFyIGlkID0gdW5pcUlkKCk7XG5cbiAgdmFyIGNvbnRyb2xFbCA9IGNvbnRyb2xUbXAoe1xuICAgIHRpdGxlOiBmaWxlLm5hbWVcbiAgfSk7XG5cbiAgY29udHJvbFNwYWNlRWwuYXBwZW5kQ2hpbGQoY29udHJvbEVsKTtcbiAgdHJhY2tTcGFjZUVsLmFwcGVuZENoaWxkKHRyYWNrRWwpO1xuICB0cmFja3NbaWRdID0gbmV3IFRyYWNrKHtcbiAgICB0aXRsZTogZmlsZS5uYW1lLFxuICAgIGlkOiBpZCxcbiAgICB0cmFja0VsOiB0cmFja0VsLFxuICAgIGNvbnRyb2xFbDogY29udHJvbEVsLFxuICAgIGNvbnRleHQ6IGF1ZGlvQ29udGV4dFxuICB9KTtcbiAgdHJhY2tzW2lkXS5lbWl0dGVyLm9uKCd0cmFja3M6cmVtb3ZlJywgZnVuY3Rpb24oZXYpIHtcbiAgICB0cmFja3NbZXYuaWRdID0gbnVsbDtcbiAgICBkZWxldGUgdHJhY2tzW2V2LmlkXTtcbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygpO1xuICAgIHNob3dXZWxjb21lKCk7XG4gIH0pO1xuICB0cmFja3NbaWRdLmxvYWRGaWxlKGZpbGUpO1xuICBlbmFibGVQbGF5YmFja09wdHMoKTtcbn1cblxuZnVuY3Rpb24gbmV3VHJhY2tGcm9tVVJMKHVybCkge1xuICB3ZWxjb21lLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gIHZhciB0cmFja0VsID0gdHJhY2tUbXAoKTtcbiAgdmFyIGNvbnRyb2xFbCA9IGNvbnRyb2xUbXAoe1xuICAgIHRpdGxlOiBcIlJlY29yZGluZyAxXCJcbiAgfSk7XG4gIHZhciBpZCA9IHVuaXFJZCgpO1xuXG4gIGNvbnRyb2xTcGFjZUVsLmFwcGVuZENoaWxkKGNvbnRyb2xFbCk7XG4gIHRyYWNrU3BhY2VFbC5hcHBlbmRDaGlsZCh0cmFja0VsKTtcbiAgdHJhY2tzW2lkXSA9IG5ldyBUcmFjayh7XG4gICAgdGl0bGU6IFwiUmVjb3JkaW5nIDFcIixcbiAgICBpZDogaWQsXG4gICAgdHJhY2tFbDogdHJhY2tFbCxcbiAgICBjb250cm9sRWw6IGNvbnRyb2xFbCxcbiAgICBjb250ZXh0OiBhdWRpb0NvbnRleHRcbiAgfSk7XG4gIHRyYWNrc1tpZF0uZW1pdHRlci5vbigndHJhY2tzOnJlbW92ZScsIGZ1bmN0aW9uKGV2KSB7XG4gICAgdHJhY2tzW2V2LmlkXSA9IG51bGw7XG4gICAgZGVsZXRlIHRyYWNrc1tldi5pZF07XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcbiAgICBzaG93V2VsY29tZSgpO1xuICB9KTtcbiAgdHJhY2tzW2lkXS5sb2FkVVJMKHVybCk7XG4gIGVuYWJsZVBsYXliYWNrT3B0cygpO1xufVxuXG5mdW5jdGlvbiBzaG93V2VsY29tZSgpIHtcbiAgaWYgKCFPYmplY3Qua2V5cyh0cmFja3MpLmxlbmd0aCkgd2VsY29tZS5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcbn1cbiIsInZhciBoID0gcmVxdWlyZSgnaHlwZXJzY3JpcHQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihkYXRhKSB7XG4gIHJldHVybiBoKCdkaXYuY29udHJvbCcsXG4gICAgICAgICAgIGgoJ2hlYWRlcicsIHtcImRhdGEtdGlwLWNvbnRlbnRcIjogZGF0YS50aXRsZSwgXCJkYXRhLWhhcy10aXBcIjogXCJyaWdodFwifSxcbiAgICAgICAgICAgICBoKCdwJywgZGF0YS50aXRsZSkpLFxuICAgICAgICAgICBoKCd1bC5hY3Rpb25zJyxcbiAgICAgICAgICAgICBoKCdsaS5hY3RpdmF0ZS5hY3RpdmUnLCB7XCJkYXRhLXRpcC1jb250ZW50XCI6IFwiYWN0aXZhdGVcIiwgXCJkYXRhLWhhcy10aXBcIjogXCJib3R0b21cIn0pLFxuICAgICAgICAgICAgIGgoJ2xpLmVkaXQuYWN0aXZlJywge1wiZGF0YS10aXAtY29udGVudFwiOiBcImVkaXRcIiwgXCJkYXRhLWhhcy10aXBcIjogXCJib3R0b21cIn0pLFxuICAgICAgICAgICAgIGgoJ2xpLm11dGUnLCB7XCJkYXRhLXRpcC1jb250ZW50XCI6IFwibXV0ZVwiLCBcImRhdGEtaGFzLXRpcFwiOiBcImJvdHRvbVwifSksXG4gICAgICAgICAgICAgaCgnbGkuZXhwb3J0Jywge1wiZGF0YS10aXAtY29udGVudFwiOiBcImV4cG9ydFwiLCBcImRhdGEtaGFzLXRpcFwiOiBcImJvdHRvbVwifSksXG4gICAgICAgICAgICAgaCgnbGkuY29sbGFwc2UnLCB7XCJkYXRhLXRpcC1jb250ZW50XCI6IFwiY29sbGFwc2VcIiwgXCJkYXRhLWhhcy10aXBcIjogXCJib3R0b21cIn0pLFxuICAgICAgICAgICAgIGgoJ2xpLnJlbW92ZScsIHtcImRhdGEtdGlwLWNvbnRlbnRcIjogXCJyZW1vdmVcIiwgXCJkYXRhLWhhcy10aXBcIjogXCJib3R0b21cIn0pKSxcblxuICAgICAgICAgICBoKCdhcnRpY2xlLmluZm8nLFxuICAgICAgICAgICAgIGgoJ2Rpdi52b2x1bWUnLFxuICAgICAgICAgICAgICAgaCgnc3Bhbi52b2x1bWUtYmFyJykpLFxuICAgICAgICAgICAgIGgoJ3AnLCBcIkN1cnJlbnQgVGltZTogXCIsXG4gICAgICAgICAgICAgICBoKCdpLmN1cicsIFwiMDA6MDA6MDBcIikpLFxuICAgICAgICAgICAgIGgoJ3AnLCBcIkR1cmF0aW9uOiBcIixcbiAgICAgICAgICAgICAgIGgoJ2kuZHVyJywgXCIwMDowMDowMFwiKSksXG4gICAgICAgICAgICAgaCgncCcsIFwiUmVtYWluaW5nOiBcIixcbiAgICAgICAgICAgICAgIGgoJ2kucmVtJywgXCIwMDowMDowMFwiKSkpKTtcbn0iLCJ2YXIgaCA9IHJlcXVpcmUoJ2h5cGVyc2NyaXB0Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBoKCdkaXYudHJhY2suYWN0aXZlJyxcbiAgICAgICAgICAgaCgncCcsXG4gICAgICAgICAgICAgXCJkcmFnIGZpbGUgMiBlZGl0XCIpLFxuICAgICAgICAgICBoKCdkaXYucGxheS1jdXJzb3InKSxcbiAgICAgICAgICAgaCgnZGl2LnNlbGVjdGlvbicpLFxuICAgICAgICAgICBoKCdkaXYud2F2ZS5zZWxlY3RhYmxlJyxcbiAgICAgICAgICAgICBoKCdjYW52YXMnLCB7J2hlaWdodCc6ICczMDAnLCAnZHJhZ2dhYmxlJzogJ2ZhbHNlJ30pKSxcbiAgICAgICAgICAgaCgnZGl2LndhdmUtcHJvZ3Jlc3Muc2VsZWN0YWJsZScsXG4gICAgICAgICAgICAgaCgnY2FudmFzJywgeydoZWlnaHQnOiAnMzAwJywgJ2RyYWdnYWJsZSc6ICdmYWxzZSd9KSkpO1xufVxuIl19
