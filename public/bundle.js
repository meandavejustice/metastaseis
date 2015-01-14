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

var EE = require('events').EventEmitter;
var raf = require('raf');
var timelineManage = require('./timeline');
var AudioSource = require('audiosource');
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
    end: 0,
    at: 0
  };

  this.playing = false;

  this.startOffset = 0;
  this.lastPlay = 0;

  // indicators
  this.fileIndicator = this.trackEl.querySelector('.track p');
  this.currentTimeEl = this.controlEl.querySelector('.cur');
  this.remainingEl = this.controlEl.querySelector('.rem');
  this.durationEl = this.controlEl.querySelector('.dur');

  // controls
  this.gainEl = this.controlEl.querySelector('.volume input');

  // wave elements
  this.wave = this.trackEl.querySelector('.wave canvas');
  this.progressWave = this.trackEl.querySelector('.wave-progress');
  this.cursor = this.trackEl.querySelector('.play-cursor');
  this.selection = this.trackEl.querySelector('.selection');
  this.selectable = [].slice.call(document.querySelectorAll('.selectable'));

  colors.start(this.fileIndicator, 300);

  this.gainEl.addEventListener('change', function(ev) {
    this.gainNode.gain.value = parseFloat(ev.target.value);
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

  var self = this;
  this.selectable.forEach(function(wave) {
    wave.addEventListener('click', function(ev) {
      if (this.playing) return;
      this.cursor.style.left = this.percentFromClick(ev)+"%";
    }.bind(self));

    wave.addEventListener('click', function(ev) {
      if (this.playing) return;
      this.cursor.style.left = this.percentFromClick(ev)+"%";
    }.bind(this));

    wave.addEventListener('mousedown', function(ev) {
      if (this.playing) return;
      if (!this.moving) {
        var leftPercent = this.percentFromClick(ev) + '%';

        if (this.selecting) {
          this.selection.style.left = leftPercent;
          this.selection.style.width = 0;
          this.moving = true;
        }

        this.cursor.style.left = leftPercent;
        this.clipboard.at = this.getOffsetFromPercent(leftPercent.replace('%', ''));
      }
    }.bind(this));

    wave.addEventListener('mousemove', function(ev) {
      if (!this.moving || !this.selecting) return;
      var leftPercent = this.getPercentFromCursor();
      var rightPercent = this.percentFromClick(ev);
      var diff = rightPercent - leftPercent;

      if (diff > 0) {
        diff += '%';
      } else {
        this.cursor.style.left = rightPercent +'%';
        diff = leftPercent - rightPercent;
        if (diff > 0) {
          diff +='%';
        } else diff = 0;
      }

      this.selection.style.width = diff;
    }.bind(this));

  }, this);

  // this.selection.addEventListener('mouseout', function(ev) {
  //   var leftPercent = this.getPercentFromCursor();
  //   var rightPercent = this.percentFromClick(ev);
  //   this.clipboard.start = this.getOffsetFromPercent(leftPercent);
  //   this.clipboard.end = this.getOffsetFromPercent(rightPercent);
  //   this.moving = false;
  // }.bind(this));

  this.selection.addEventListener('mouseup', function(ev) {
    if (!this.selecting) return;
    var leftPercent = this.getPercentFromCursor();
    var rightPercent = this.percentFromClick(ev);
    this.clipboard.start = this.getOffsetFromPercent(leftPercent);
    this.clipboard.end = this.clipboard.start + this.getOffsetFromPercent(rightPercent);
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
  remove: function() {

  },
  percentFromClick: function(ev) {
    var x = ev.offsetX || ev.layerX;
    return (x / this.wave.offsetWidth) * 100;
  },
  getPercentFromCursor: function() {
    return (parseFloat(this.cursor.style.left.replace('px', '')) / this.wave.offsetWidth) * 100;
  },
  getOffsetFromPercent: function(percent) {
    if (percent === 0) return 0;
    var inter = this.audiosource.buffer.duration / 100;
    return inter * percent;
  },
  stop: function() {
    this.playing = false;
    this.startOffset = 0;
    this.lastPlay = 0;
    clearInterval(this.cursorViewInterval);
    if (this.audiosource.source) this.audiosource.stop();
  },
  resetProgress: function() {
    this.progressWave.style.width = "0%";
    this.cursor.style.left = "0%";
  },
  pause: function() {
    this.audiosource.stop();
    this.startOffset += this.context.currentTime - this.lastPlay;
    this.playing = false;
  },
  skipForward: function() {},
  skipBackward: function() {},
  updateProgress: function(percent) {
    this.progressWave.style.width = percent+"%";
    this.cursor.style.left = percent+"%";
  },
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
      prevLeft = parseFloat(this.cursor.style.left.replace('%', ''));
    }
    this.resetVisual();
    drawBuffer(this.wave, this.audiosource.buffer, '#52F6A4');
    drawBuffer(this.progressWave.querySelector('canvas'), this.audiosource.buffer, '#F445F0');
    console.log('waves updated.')
  }
}
},{"./colors":"/home/meandave/Code/metastaseis/public/lib/colors.js","./draw-buffer":"/home/meandave/Code/metastaseis/public/lib/draw-buffer.js","./format-time":"/home/meandave/Code/metastaseis/public/lib/format-time.js","./timeline":"/home/meandave/Code/metastaseis/public/lib/timeline.js","audiosource":"/home/meandave/Code/metastaseis/node_modules/audiosource/index.js","events":"/home/meandave/Code/metastaseis/node_modules/watchify/node_modules/browserify/node_modules/events/events.js","raf":"/home/meandave/Code/metastaseis/node_modules/raf/index.js"}],"/home/meandave/Code/metastaseis/public/main.js":[function(require,module,exports){
var EE = require('events').EventEmitter;
var dragDrop = require('drag-drop');
var AudioContext = require('audiocontext');
var AudioSource = require('audiosource');
var FFT = require('audio-fft');

// var colors = require('./lib/colors');
var editor = require('./lib/edits');
var recorder = require('./lib/record');
var Track = require('./lib/track');

var trackTmp = require('../templates/track-tmp');
var controlTmp = require('../templates/control-tmp');

// var emitter = new EE();
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
    // showWelcome();
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
               h('span.volume-bar'),
               h('input', {"type": 'range', "min": '0', "max": '1', "step": ".05", "value": ".50", "style": "display: hidden;"})),
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
             h('canvas', {'height': '300'})),
           h('div.wave-progress.selectable',
             h('canvas', {'height': '300'})));
}

},{"hyperscript":"/home/meandave/Code/metastaseis/node_modules/hyperscript/index.js"}]},{},["/home/meandave/Code/metastaseis/public/main.js"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzL2F1ZGlvLWZmdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9hdWRpb2NvbnRleHQvc3JjL2F1ZGlvY29udGV4dC5qcyIsIm5vZGVfbW9kdWxlcy9hdWRpb3NvdXJjZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kcmFnLWRyb3AvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZHJhZy1kcm9wL25vZGVfbW9kdWxlcy9sb2Rhc2gudGhyb3R0bGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZHJhZy1kcm9wL25vZGVfbW9kdWxlcy9sb2Rhc2gudGhyb3R0bGUvbm9kZV9tb2R1bGVzL2xvZGFzaC5kZWJvdW5jZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kcmFnLWRyb3Avbm9kZV9tb2R1bGVzL2xvZGFzaC50aHJvdHRsZS9ub2RlX21vZHVsZXMvbG9kYXNoLmRlYm91bmNlL25vZGVfbW9kdWxlcy9sb2Rhc2gubm93L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2RyYWctZHJvcC9ub2RlX21vZHVsZXMvbG9kYXNoLnRocm90dGxlL25vZGVfbW9kdWxlcy9sb2Rhc2guZGVib3VuY2Uvbm9kZV9tb2R1bGVzL2xvZGFzaC5ub3cvbm9kZV9tb2R1bGVzL2xvZGFzaC5faXNuYXRpdmUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZHJhZy1kcm9wL25vZGVfbW9kdWxlcy9sb2Rhc2gudGhyb3R0bGUvbm9kZV9tb2R1bGVzL2xvZGFzaC5pc2Z1bmN0aW9uL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2RyYWctZHJvcC9ub2RlX21vZHVsZXMvbG9kYXNoLnRocm90dGxlL25vZGVfbW9kdWxlcy9sb2Rhc2guaXNvYmplY3QvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZHJhZy1kcm9wL25vZGVfbW9kdWxlcy9sb2Rhc2gudGhyb3R0bGUvbm9kZV9tb2R1bGVzL2xvZGFzaC5pc29iamVjdC9ub2RlX21vZHVsZXMvbG9kYXNoLl9vYmplY3R0eXBlcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9oeXBlcnNjcmlwdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9oeXBlcnNjcmlwdC9ub2RlX21vZHVsZXMvYnJvd3Nlci1zcGxpdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9oeXBlcnNjcmlwdC9ub2RlX21vZHVsZXMvY2xhc3MtbGlzdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9oeXBlcnNjcmlwdC9ub2RlX21vZHVsZXMvY2xhc3MtbGlzdC9ub2RlX21vZHVsZXMvaW5kZXhvZi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9yYWYvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcmFmL25vZGVfbW9kdWxlcy9wZXJmb3JtYW5jZS1ub3cvbGliL3BlcmZvcm1hbmNlLW5vdy5qcyIsIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIiwibm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJwdWJsaWMvbGliL2NvbG9ycy5qcyIsInB1YmxpYy9saWIvZHJhdy1idWZmZXIuanMiLCJwdWJsaWMvbGliL2VkaXRzLmpzIiwicHVibGljL2xpYi9mb3JtYXQtdGltZS5qcyIsInB1YmxpYy9saWIvcmVjb3JkLmpzIiwicHVibGljL2xpYi90aW1lbGluZS5qcyIsInB1YmxpYy9saWIvdHJhY2suanMiLCJwdWJsaWMvbWFpbi5qcyIsInRlbXBsYXRlcy9jb250cm9sLXRtcC5qcyIsInRlbXBsYXRlcy90cmFjay10bXAuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBwdWxsZWQgZnJvbSBAanNhbnRlbGxcbiAqXG4gKiBodHRwczovL2dpdGh1Yi5jb20vanNhbnRlbGwvZHNwLXdpdGgtd2ViLWF1ZGlvLXByZXNlbnRhdGlvbi9ibG9iL2doLXBhZ2VzL2V4YW1wbGVzL0ZGVC5qc1xuICpcbiAqL1xuXG52YXIgTUFYX1VJTlQ4ID0gMjU1O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZGVDtcblxuZnVuY3Rpb24gRkZUIChjdHgsIG9wdGlvbnMpIHtcbiAgdmFyIG1vZHVsZSA9IHRoaXM7XG4gIHRoaXMuY2FudmFzID0gb3B0aW9ucy5jYW52YXM7XG4gIHRoaXMub25CZWF0ID0gb3B0aW9ucy5vbkJlYXQ7XG4gIHRoaXMub2ZmQmVhdCA9IG9wdGlvbnMub2ZmQmVhdDtcbiAgdGhpcy50eXBlID0gb3B0aW9ucy50eXBlIHx8ICdmcmVxdWVuY3knO1xuICB0aGlzLnNwYWNpbmcgPSBvcHRpb25zLnNwYWNpbmcgfHwgMTtcbiAgdGhpcy53aWR0aCA9IG9wdGlvbnMud2lkdGggfHwgMTtcbiAgdGhpcy5jb3VudCA9IG9wdGlvbnMuY291bnQgfHwgNTEyO1xuICB0aGlzLmlucHV0ID0gdGhpcy5vdXRwdXQgPSBjdHguY3JlYXRlQW5hbHlzZXIoKTtcbiAgdGhpcy5wcm9jID0gY3R4LmNyZWF0ZVNjcmlwdFByb2Nlc3NvcigyNTYsIDEsIDEpO1xuICB0aGlzLmRhdGEgPSBuZXcgVWludDhBcnJheSh0aGlzLmlucHV0LmZyZXF1ZW5jeUJpbkNvdW50KTtcbiAgdGhpcy5jdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuXG4gIHRoaXMuZGVjYXkgPSBvcHRpb25zLmRlY2F5IHx8IDAuMDAyO1xuICB0aGlzLnRocmVzaG9sZCA9IG9wdGlvbnMudGhyZXNob2xkIHx8IDAuNTtcbiAgdGhpcy5yYW5nZSA9IG9wdGlvbnMucmFuZ2UgfHwgWzAsIHRoaXMuZGF0YS5sZW5ndGgtMV07XG4gIHRoaXMud2FpdCA9IG9wdGlvbnMud2FpdCB8fCA1MTI7XG5cbiAgdGhpcy5oID0gdGhpcy5jYW52YXMuaGVpZ2h0O1xuICB0aGlzLncgPSB0aGlzLmNhbnZhcy53aWR0aDtcblxuICB0aGlzLmlucHV0LmNvbm5lY3QodGhpcy5wcm9jKTtcbiAgdGhpcy5wcm9jLm9uYXVkaW9wcm9jZXNzID0gcHJvY2Vzcy5iaW5kKG51bGwsIG1vZHVsZSk7XG4gIHRoaXMuY3R4LmxpbmVXaWR0aCA9IG1vZHVsZS53aWR0aDtcbn1cblxuRkZULnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24gKG5vZGUpIHtcbiAgdGhpcy5vdXRwdXQuY29ubmVjdChub2RlKTtcbiAgdGhpcy5wcm9jLmNvbm5lY3Qobm9kZSk7XG59XG5cbmZ1bmN0aW9uIHByb2Nlc3MgKG1vZHVsZSkge1xuXG4gIHZhciBjdHggPSBtb2R1bGUuY3R4O1xuICB2YXIgZGF0YSA9IG1vZHVsZS5kYXRhO1xuICBjdHguY2xlYXJSZWN0KDAsIDAsIG1vZHVsZS53LCBtb2R1bGUuaCk7XG4gIGN0eC5maWxsU3R5bGUgPSBtb2R1bGUuZmlsbFN0eWxlIHx8ICcjMDAwMDAwJztcbiAgY3R4LnN0cm9rZVN0eWxlID0gbW9kdWxlLnN0cm9rZVN0eWxlIHx8ICcjMDAwMDAwJztcblxuICBpZiAobW9kdWxlLnR5cGUgPT09ICdmcmVxdWVuY3knKSB7XG4gICAgbW9kdWxlLmlucHV0LmdldEJ5dGVGcmVxdWVuY3lEYXRhKGRhdGEpO1xuICAgIC8vIEFib3J0IGlmIG5vIGRhdGEgY29taW5nIHRocm91Z2gsIHF1aWNrIGhhY2ssIG5lZWRzIGZpeGVkXG4gICAgaWYgKG1vZHVsZS5kYXRhWzNdIDwgNSkgcmV0dXJuO1xuXG4gICAgZm9yICh2YXIgaT0gMCwgbCA9IGRhdGEubGVuZ3RoOyBpIDwgbCAmJiBpIDwgbW9kdWxlLmNvdW50OyBpKyspIHtcbiAgICAgIGN0eC5maWxsUmVjdChcbiAgICAgICAgaSAqIChtb2R1bGUuc3BhY2luZyArIG1vZHVsZS53aWR0aCksXG4gICAgICAgIG1vZHVsZS5oLFxuICAgICAgICBtb2R1bGUud2lkdGgsXG4gICAgICAgIC0obW9kdWxlLmggLyBNQVhfVUlOVDgpICogZGF0YVtpXVxuICAgICAgKTtcbiAgICB9XG4gIH1cbiAgZWxzZSBpZiAobW9kdWxlLnR5cGUgPT09ICd0aW1lJykge1xuICAgIG1vZHVsZS5pbnB1dC5nZXRCeXRlVGltZURvbWFpbkRhdGEoZGF0YSk7XG4gICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgIGN0eC5tb3ZlVG8oMCwgbW9kdWxlLmggLyAyKTtcbiAgICBmb3IgKHZhciBpPSAwLCBsID0gZGF0YS5sZW5ndGg7IGkgPCBsICYmIGkgPCBtb2R1bGUuY291bnQ7IGkrKykge1xuICAgICAgY3R4LmxpbmVUbyhcbiAgICAgICAgaSAqIChtb2R1bGUuc3BhY2luZyArIG1vZHVsZS53aWR0aCksXG4gICAgICAgIChtb2R1bGUuaCAvIE1BWF9VSU5UOCkgKiBkYXRhW2ldXG4gICAgICApO1xuICAgIH1cbiAgICBjdHguc3Ryb2tlKCk7XG4gICAgY3R4LmNsb3NlUGF0aCgpO1xuICB9XG59XG4iLCIvKlxuICogV2ViIEF1ZGlvIEFQSSBBdWRpb0NvbnRleHQgc2hpbVxuICovXG4oZnVuY3Rpb24gKGRlZmluaXRpb24pIHtcbiAgICBpZiAodHlwZW9mIGV4cG9ydHMgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBkZWZpbml0aW9uKCk7XG4gICAgfVxufSkoZnVuY3Rpb24gKCkge1xuICByZXR1cm4gd2luZG93LkF1ZGlvQ29udGV4dCB8fCB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0O1xufSk7XG4iLCIvKlxuICogQXVkaW9Tb3VyY2VcbiAqXG4gKiAqIE1VU1QgcGFzcyBhbiBhdWRpbyBjb250ZXh0XG4gKlxuICovXG5mdW5jdGlvbiBBdWRpb1NvdXJjZSAoY29udGV4dCwgb3B0cykge1xuICBpZiAoIWNvbnRleHQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYW4gYXVkaW8gY29udGV4dCB0byB1c2UgdGhpcyBtb2R1bGUnKTtcbiAgfVxuICBpZiAob3B0cyA9PT0gdW5kZWZpbmVkKSBvcHRzID0ge307XG5cbiAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcbiAgdGhpcy5idWZmZXIgPSB1bmRlZmluZWQ7XG4gIHRoaXMudXJsID0gb3B0cy51cmwgPyBvcHRzLnVybCA6IHVuZGVmaW5lZDtcbiAgdGhpcy5mZnRzID0gb3B0cy5mZnRzID8gb3B0cy5mZnRzIDogW107XG4gIHRoaXMuZ2Fpbk5vZGUgPSBvcHRzLmdhaW5Ob2RlID8gb3B0cy5nYWluTm9kZSA6IHVuZGVmaW5lZDtcbn1cblxuQXVkaW9Tb3VyY2UucHJvdG90eXBlID0ge1xuICBuZWVkQnVmZmVyOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5idWZmZXIgPT09IHVuZGVmaW5lZDtcbiAgfSxcbiAgbG9hZFNvdW5kOiBmdW5jdGlvbih1cmwsIGNiKSB7XG4gICAgdmFyIHJlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgIHJlcS5vcGVuKCdHRVQnLCB1cmwsIHRydWUpO1xuICAgIHJlcS5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXEub25sb2FkZW5kID0gZnVuY3Rpb24oKSB7XG4gICAgICBzZWxmLmRlY29kZS5jYWxsKHNlbGYsIHJlcS5yZXNwb25zZSwgY2IpO1xuICAgIH07XG4gICAgcmVxLnNlbmQoKTtcbiAgfSxcbiAgZ2V0QnVmZmVyOiBmdW5jdGlvbihjYikge1xuICAgIGlmICghdGhpcy5uZWVkQnVmZmVyKCkpIHJldHVybjtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5sb2FkU291bmQodGhpcy51cmwsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIHNlbGYub25Mb2FkZWQuY2FsbChzZWxmLCBkYXRhLCB0cnVlKTtcbiAgICB9KTtcbiAgfSxcbiAgZ2V0U291cmNlOiBmdW5jdGlvbihjYikge1xuICAgIGlmICh0aGlzLnNvdXJjZSkge1xuICAgICAgY2IodGhpcy5zb3VyY2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB0aGlzLmRpc2Nvbm5lY3QoKTtcbiAgICAgIHRoaXMubG9hZFNvdW5kKHRoaXMudXJsLCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIHRoaXMuc291cmNlID0gc2VsZi5jcmVhdGVTb3VyY2UuY2FsbChzZWxmLCBkYXRhLCB0cnVlKTtcbiAgICAgICAgY2IodGhpcy5zb3VyY2UpO1xuICAgICAgfSk7XG4gICAgfVxuICB9LFxuICBvbkxvYWRlZDogZnVuY3Rpb24oc291cmNlLCBzaWxlbnQpIHtcbiAgICB0aGlzLmJ1ZmZlciA9IHNvdXJjZTtcbiAgICB0aGlzLmRpc2Nvbm5lY3QoKTtcbiAgICB0aGlzLnNvdXJjZSA9IHRoaXMuY29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgICB0aGlzLnNvdXJjZS5idWZmZXIgPSB0aGlzLmJ1ZmZlcjtcbiAgICB0aGlzLnNvdXJjZS5jb25uZWN0KHRoaXMuZ2Fpbk5vZGUpO1xuICAgIHRoaXMuZmZ0cy5mb3JFYWNoKGZ1bmN0aW9uKGZmdCkge1xuICAgICAgdGhpcy5nYWluTm9kZS5jb25uZWN0KGZmdC5pbnB1dCk7XG4gICAgfSwgdGhpcyk7XG4gICAgdGhpcy5nYWluTm9kZS5jb25uZWN0KHRoaXMuY29udGV4dC5kZXN0aW5hdGlvbik7XG4gICAgdGhpcy5mZnRzLmZvckVhY2goZnVuY3Rpb24oZmZ0KSB7XG4gICAgICBmZnQuY29ubmVjdCh0aGlzLmNvbnRleHQuZGVzdGluYXRpb24pO1xuICAgIH0sIHRoaXMpO1xuICAgIGlmICghc2lsZW50KSB0aGlzLnBsYXlTb3VuZCgpO1xuICB9LFxuICBkaXNjb25uZWN0OiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5zb3VyY2UpIHtcbiAgICAgIHRoaXMuc291cmNlLmRpc2Nvbm5lY3QodGhpcy5jb250ZXh0LmRlc3RpbmF0aW9uKTtcbiAgICB9XG4gIH0sXG4gIHBsYXlTb3VuZDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMucGxheVRpbWUpIHtcbiAgICAgIHRoaXMuc291cmNlLnN0YXJ0KDAsIHRoaXMub2Zmc2V0KTtcbiAgICB9XG5cbiAgICB0aGlzLnBsYXlUaW1lID0gdGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lO1xuICB9LFxuICBsb2FkU2lsZW50OiBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMubmVlZEJ1ZmZlcigpKSByZXR1cm47XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMubG9hZFNvdW5kKHRoaXMudXJsLCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICBzZWxmLm9uTG9hZGVkLmNhbGwoc2VsZiwgZGF0YSwgdHJ1ZSk7XG4gICAgfSk7XG4gIH0sXG4gIHBsYXk6IGZ1bmN0aW9uKHN0YXJ0dGltZSwgb2Zmc2V0KSB7XG4gICAgdGhpcy5wbGF5VGltZSA9IHN0YXJ0dGltZSA/IHN0YXJ0dGltZSA6IHRoaXMuY29udGV4dC5jdXJyZW50VGltZTtcbiAgICB0aGlzLm9mZnNldCA9IG9mZnNldCA/IG9mZnNldCA6IDA7XG5cbiAgICBpZiAodGhpcy5uZWVkQnVmZmVyKCkpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHRoaXMubG9hZFNvdW5kKHRoaXMudXJsLCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIHNlbGYub25Mb2FkZWQuY2FsbChzZWxmLCBkYXRhKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm9uTG9hZGVkKHRoaXMuYnVmZmVyKTtcbiAgICB9XG4gIH0sXG4gIHN0b3A6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc291cmNlLnN0b3AodGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lKTtcbiAgfSxcbiAgZGVjb2RlOiBmdW5jdGlvbihkYXRhLCBzdWNjZXNzLCBlcnJvcikge1xuICAgIHRoaXMuY29udGV4dC5kZWNvZGVBdWRpb0RhdGEoZGF0YSwgc3VjY2VzcywgZXJyb3IpO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEF1ZGlvU291cmNlO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBEcmFnRHJvcFxuXG52YXIgdGhyb3R0bGUgPSByZXF1aXJlKCdsb2Rhc2gudGhyb3R0bGUnKVxuXG5mdW5jdGlvbiBEcmFnRHJvcCAoZWxlbSwgY2IpIHtcbiAgaWYgKHR5cGVvZiBlbGVtID09PSAnc3RyaW5nJykgZWxlbSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoZWxlbSlcbiAgZWxlbS5hZGRFdmVudExpc3RlbmVyKCdkcmFnZW50ZXInLCBraWxsRXZlbnQsIGZhbHNlKVxuICBlbGVtLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdvdmVyJywgbWFrZU9uRHJhZ092ZXIoZWxlbSksIGZhbHNlKVxuICBlbGVtLmFkZEV2ZW50TGlzdGVuZXIoJ2Ryb3AnLCBvbkRyb3AuYmluZCh1bmRlZmluZWQsIGVsZW0sIGNiKSwgZmFsc2UpXG59XG5cbmZ1bmN0aW9uIGtpbGxFdmVudCAoZSkge1xuICBlLnN0b3BQcm9wYWdhdGlvbigpXG4gIGUucHJldmVudERlZmF1bHQoKVxuICByZXR1cm4gZmFsc2Vcbn1cblxuZnVuY3Rpb24gbWFrZU9uRHJhZ092ZXIgKGVsZW0pIHtcbiAgdmFyIGZuID0gdGhyb3R0bGUoZnVuY3Rpb24gKCkge1xuICAgIGVsZW0uY2xhc3NMaXN0LmFkZCgnZHJhZycpXG5cbiAgICBpZiAoZWxlbS50aW1lb3V0KSBjbGVhclRpbWVvdXQoZWxlbS50aW1lb3V0KVxuICAgIGVsZW0udGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgZWxlbS5jbGFzc0xpc3QucmVtb3ZlKCdkcmFnJylcbiAgICB9LCAxNTApXG4gIH0sIDEwMCwge3RyYWlsaW5nOiBmYWxzZX0pXG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChlKSB7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKVxuICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgIGUuZGF0YVRyYW5zZmVyLmRyb3BFZmZlY3QgPSAnY29weSdcbiAgICBmbigpXG4gIH1cbn1cblxuZnVuY3Rpb24gb25Ecm9wIChlbGVtLCBjYiwgZSkge1xuICBlLnN0b3BQcm9wYWdhdGlvbigpXG4gIGUucHJldmVudERlZmF1bHQoKVxuICBlbGVtLmNsYXNzTGlzdC5yZW1vdmUoJ2RyYWcnKVxuICBjYihBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChlLmRhdGFUcmFuc2Zlci5maWxlcyksIHsgeDogZS5jbGllbnRYLCB5OiBlLmNsaWVudFkgfSlcbiAgcmV0dXJuIGZhbHNlXG59XG4iLCIvKipcbiAqIExvLURhc2ggMi40LjEgKEN1c3RvbSBCdWlsZCkgPGh0dHA6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZHVsYXJpemUgbW9kZXJuIGV4cG9ydHM9XCJucG1cIiAtbyAuL25wbS9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDEzIFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjUuMiA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTMgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cDovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xudmFyIGRlYm91bmNlID0gcmVxdWlyZSgnbG9kYXNoLmRlYm91bmNlJyksXG4gICAgaXNGdW5jdGlvbiA9IHJlcXVpcmUoJ2xvZGFzaC5pc2Z1bmN0aW9uJyksXG4gICAgaXNPYmplY3QgPSByZXF1aXJlKCdsb2Rhc2guaXNvYmplY3QnKTtcblxuLyoqIFVzZWQgYXMgYW4gaW50ZXJuYWwgYF8uZGVib3VuY2VgIG9wdGlvbnMgb2JqZWN0ICovXG52YXIgZGVib3VuY2VPcHRpb25zID0ge1xuICAnbGVhZGluZyc6IGZhbHNlLFxuICAnbWF4V2FpdCc6IDAsXG4gICd0cmFpbGluZyc6IGZhbHNlXG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBmdW5jdGlvbiB0aGF0LCB3aGVuIGV4ZWN1dGVkLCB3aWxsIG9ubHkgY2FsbCB0aGUgYGZ1bmNgIGZ1bmN0aW9uXG4gKiBhdCBtb3N0IG9uY2UgcGVyIGV2ZXJ5IGB3YWl0YCBtaWxsaXNlY29uZHMuIFByb3ZpZGUgYW4gb3B0aW9ucyBvYmplY3QgdG9cbiAqIGluZGljYXRlIHRoYXQgYGZ1bmNgIHNob3VsZCBiZSBpbnZva2VkIG9uIHRoZSBsZWFkaW5nIGFuZC9vciB0cmFpbGluZyBlZGdlXG4gKiBvZiB0aGUgYHdhaXRgIHRpbWVvdXQuIFN1YnNlcXVlbnQgY2FsbHMgdG8gdGhlIHRocm90dGxlZCBmdW5jdGlvbiB3aWxsXG4gKiByZXR1cm4gdGhlIHJlc3VsdCBvZiB0aGUgbGFzdCBgZnVuY2AgY2FsbC5cbiAqXG4gKiBOb3RlOiBJZiBgbGVhZGluZ2AgYW5kIGB0cmFpbGluZ2Agb3B0aW9ucyBhcmUgYHRydWVgIGBmdW5jYCB3aWxsIGJlIGNhbGxlZFxuICogb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQgb25seSBpZiB0aGUgdGhlIHRocm90dGxlZCBmdW5jdGlvbiBpc1xuICogaW52b2tlZCBtb3JlIHRoYW4gb25jZSBkdXJpbmcgdGhlIGB3YWl0YCB0aW1lb3V0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgRnVuY3Rpb25zXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byB0aHJvdHRsZS5cbiAqIEBwYXJhbSB7bnVtYmVyfSB3YWl0IFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRvIHRocm90dGxlIGV4ZWN1dGlvbnMgdG8uXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIFRoZSBvcHRpb25zIG9iamVjdC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGVhZGluZz10cnVlXSBTcGVjaWZ5IGV4ZWN1dGlvbiBvbiB0aGUgbGVhZGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0LlxuICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy50cmFpbGluZz10cnVlXSBTcGVjaWZ5IGV4ZWN1dGlvbiBvbiB0aGUgdHJhaWxpbmcgZWRnZSBvZiB0aGUgdGltZW91dC5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IHRocm90dGxlZCBmdW5jdGlvbi5cbiAqIEBleGFtcGxlXG4gKlxuICogLy8gYXZvaWQgZXhjZXNzaXZlbHkgdXBkYXRpbmcgdGhlIHBvc2l0aW9uIHdoaWxlIHNjcm9sbGluZ1xuICogdmFyIHRocm90dGxlZCA9IF8udGhyb3R0bGUodXBkYXRlUG9zaXRpb24sIDEwMCk7XG4gKiBqUXVlcnkod2luZG93KS5vbignc2Nyb2xsJywgdGhyb3R0bGVkKTtcbiAqXG4gKiAvLyBleGVjdXRlIGByZW5ld1Rva2VuYCB3aGVuIHRoZSBjbGljayBldmVudCBpcyBmaXJlZCwgYnV0IG5vdCBtb3JlIHRoYW4gb25jZSBldmVyeSA1IG1pbnV0ZXNcbiAqIGpRdWVyeSgnLmludGVyYWN0aXZlJykub24oJ2NsaWNrJywgXy50aHJvdHRsZShyZW5ld1Rva2VuLCAzMDAwMDAsIHtcbiAqICAgJ3RyYWlsaW5nJzogZmFsc2VcbiAqIH0pKTtcbiAqL1xuZnVuY3Rpb24gdGhyb3R0bGUoZnVuYywgd2FpdCwgb3B0aW9ucykge1xuICB2YXIgbGVhZGluZyA9IHRydWUsXG4gICAgICB0cmFpbGluZyA9IHRydWU7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGZ1bmMpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcjtcbiAgfVxuICBpZiAob3B0aW9ucyA9PT0gZmFsc2UpIHtcbiAgICBsZWFkaW5nID0gZmFsc2U7XG4gIH0gZWxzZSBpZiAoaXNPYmplY3Qob3B0aW9ucykpIHtcbiAgICBsZWFkaW5nID0gJ2xlYWRpbmcnIGluIG9wdGlvbnMgPyBvcHRpb25zLmxlYWRpbmcgOiBsZWFkaW5nO1xuICAgIHRyYWlsaW5nID0gJ3RyYWlsaW5nJyBpbiBvcHRpb25zID8gb3B0aW9ucy50cmFpbGluZyA6IHRyYWlsaW5nO1xuICB9XG4gIGRlYm91bmNlT3B0aW9ucy5sZWFkaW5nID0gbGVhZGluZztcbiAgZGVib3VuY2VPcHRpb25zLm1heFdhaXQgPSB3YWl0O1xuICBkZWJvdW5jZU9wdGlvbnMudHJhaWxpbmcgPSB0cmFpbGluZztcblxuICByZXR1cm4gZGVib3VuY2UoZnVuYywgd2FpdCwgZGVib3VuY2VPcHRpb25zKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB0aHJvdHRsZTtcbiIsIi8qKlxuICogTG8tRGFzaCAyLjQuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cDovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBtb2Rlcm4gZXhwb3J0cz1cIm5wbVwiIC1vIC4vbnBtL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuNS4yIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG52YXIgaXNGdW5jdGlvbiA9IHJlcXVpcmUoJ2xvZGFzaC5pc2Z1bmN0aW9uJyksXG4gICAgaXNPYmplY3QgPSByZXF1aXJlKCdsb2Rhc2guaXNvYmplY3QnKSxcbiAgICBub3cgPSByZXF1aXJlKCdsb2Rhc2gubm93Jyk7XG5cbi8qIE5hdGl2ZSBtZXRob2Qgc2hvcnRjdXRzIGZvciBtZXRob2RzIHdpdGggdGhlIHNhbWUgbmFtZSBhcyBvdGhlciBgbG9kYXNoYCBtZXRob2RzICovXG52YXIgbmF0aXZlTWF4ID0gTWF0aC5tYXg7XG5cbi8qKlxuICogQ3JlYXRlcyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCBkZWxheSB0aGUgZXhlY3V0aW9uIG9mIGBmdW5jYCB1bnRpbCBhZnRlclxuICogYHdhaXRgIG1pbGxpc2Vjb25kcyBoYXZlIGVsYXBzZWQgc2luY2UgdGhlIGxhc3QgdGltZSBpdCB3YXMgaW52b2tlZC5cbiAqIFByb3ZpZGUgYW4gb3B0aW9ucyBvYmplY3QgdG8gaW5kaWNhdGUgdGhhdCBgZnVuY2Agc2hvdWxkIGJlIGludm9rZWQgb25cbiAqIHRoZSBsZWFkaW5nIGFuZC9vciB0cmFpbGluZyBlZGdlIG9mIHRoZSBgd2FpdGAgdGltZW91dC4gU3Vic2VxdWVudCBjYWxsc1xuICogdG8gdGhlIGRlYm91bmNlZCBmdW5jdGlvbiB3aWxsIHJldHVybiB0aGUgcmVzdWx0IG9mIHRoZSBsYXN0IGBmdW5jYCBjYWxsLlxuICpcbiAqIE5vdGU6IElmIGBsZWFkaW5nYCBhbmQgYHRyYWlsaW5nYCBvcHRpb25zIGFyZSBgdHJ1ZWAgYGZ1bmNgIHdpbGwgYmUgY2FsbGVkXG4gKiBvbiB0aGUgdHJhaWxpbmcgZWRnZSBvZiB0aGUgdGltZW91dCBvbmx5IGlmIHRoZSB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIGlzXG4gKiBpbnZva2VkIG1vcmUgdGhhbiBvbmNlIGR1cmluZyB0aGUgYHdhaXRgIHRpbWVvdXQuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBGdW5jdGlvbnNcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGRlYm91bmNlLlxuICogQHBhcmFtIHtudW1iZXJ9IHdhaXQgVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gZGVsYXkuXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdIFRoZSBvcHRpb25zIG9iamVjdC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGVhZGluZz1mYWxzZV0gU3BlY2lmeSBleGVjdXRpb24gb24gdGhlIGxlYWRpbmcgZWRnZSBvZiB0aGUgdGltZW91dC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBbb3B0aW9ucy5tYXhXYWl0XSBUaGUgbWF4aW11bSB0aW1lIGBmdW5jYCBpcyBhbGxvd2VkIHRvIGJlIGRlbGF5ZWQgYmVmb3JlIGl0J3MgY2FsbGVkLlxuICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy50cmFpbGluZz10cnVlXSBTcGVjaWZ5IGV4ZWN1dGlvbiBvbiB0aGUgdHJhaWxpbmcgZWRnZSBvZiB0aGUgdGltZW91dC5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGRlYm91bmNlZCBmdW5jdGlvbi5cbiAqIEBleGFtcGxlXG4gKlxuICogLy8gYXZvaWQgY29zdGx5IGNhbGN1bGF0aW9ucyB3aGlsZSB0aGUgd2luZG93IHNpemUgaXMgaW4gZmx1eFxuICogdmFyIGxhenlMYXlvdXQgPSBfLmRlYm91bmNlKGNhbGN1bGF0ZUxheW91dCwgMTUwKTtcbiAqIGpRdWVyeSh3aW5kb3cpLm9uKCdyZXNpemUnLCBsYXp5TGF5b3V0KTtcbiAqXG4gKiAvLyBleGVjdXRlIGBzZW5kTWFpbGAgd2hlbiB0aGUgY2xpY2sgZXZlbnQgaXMgZmlyZWQsIGRlYm91bmNpbmcgc3Vic2VxdWVudCBjYWxsc1xuICogalF1ZXJ5KCcjcG9zdGJveCcpLm9uKCdjbGljaycsIF8uZGVib3VuY2Uoc2VuZE1haWwsIDMwMCwge1xuICogICAnbGVhZGluZyc6IHRydWUsXG4gKiAgICd0cmFpbGluZyc6IGZhbHNlXG4gKiB9KTtcbiAqXG4gKiAvLyBlbnN1cmUgYGJhdGNoTG9nYCBpcyBleGVjdXRlZCBvbmNlIGFmdGVyIDEgc2Vjb25kIG9mIGRlYm91bmNlZCBjYWxsc1xuICogdmFyIHNvdXJjZSA9IG5ldyBFdmVudFNvdXJjZSgnL3N0cmVhbScpO1xuICogc291cmNlLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBfLmRlYm91bmNlKGJhdGNoTG9nLCAyNTAsIHtcbiAqICAgJ21heFdhaXQnOiAxMDAwXG4gKiB9LCBmYWxzZSk7XG4gKi9cbmZ1bmN0aW9uIGRlYm91bmNlKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcbiAgdmFyIGFyZ3MsXG4gICAgICBtYXhUaW1lb3V0SWQsXG4gICAgICByZXN1bHQsXG4gICAgICBzdGFtcCxcbiAgICAgIHRoaXNBcmcsXG4gICAgICB0aW1lb3V0SWQsXG4gICAgICB0cmFpbGluZ0NhbGwsXG4gICAgICBsYXN0Q2FsbGVkID0gMCxcbiAgICAgIG1heFdhaXQgPSBmYWxzZSxcbiAgICAgIHRyYWlsaW5nID0gdHJ1ZTtcblxuICBpZiAoIWlzRnVuY3Rpb24oZnVuYykpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yO1xuICB9XG4gIHdhaXQgPSBuYXRpdmVNYXgoMCwgd2FpdCkgfHwgMDtcbiAgaWYgKG9wdGlvbnMgPT09IHRydWUpIHtcbiAgICB2YXIgbGVhZGluZyA9IHRydWU7XG4gICAgdHJhaWxpbmcgPSBmYWxzZTtcbiAgfSBlbHNlIGlmIChpc09iamVjdChvcHRpb25zKSkge1xuICAgIGxlYWRpbmcgPSBvcHRpb25zLmxlYWRpbmc7XG4gICAgbWF4V2FpdCA9ICdtYXhXYWl0JyBpbiBvcHRpb25zICYmIChuYXRpdmVNYXgod2FpdCwgb3B0aW9ucy5tYXhXYWl0KSB8fCAwKTtcbiAgICB0cmFpbGluZyA9ICd0cmFpbGluZycgaW4gb3B0aW9ucyA/IG9wdGlvbnMudHJhaWxpbmcgOiB0cmFpbGluZztcbiAgfVxuICB2YXIgZGVsYXllZCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciByZW1haW5pbmcgPSB3YWl0IC0gKG5vdygpIC0gc3RhbXApO1xuICAgIGlmIChyZW1haW5pbmcgPD0gMCkge1xuICAgICAgaWYgKG1heFRpbWVvdXRJZCkge1xuICAgICAgICBjbGVhclRpbWVvdXQobWF4VGltZW91dElkKTtcbiAgICAgIH1cbiAgICAgIHZhciBpc0NhbGxlZCA9IHRyYWlsaW5nQ2FsbDtcbiAgICAgIG1heFRpbWVvdXRJZCA9IHRpbWVvdXRJZCA9IHRyYWlsaW5nQ2FsbCA9IHVuZGVmaW5lZDtcbiAgICAgIGlmIChpc0NhbGxlZCkge1xuICAgICAgICBsYXN0Q2FsbGVkID0gbm93KCk7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XG4gICAgICAgIGlmICghdGltZW91dElkICYmICFtYXhUaW1lb3V0SWQpIHtcbiAgICAgICAgICBhcmdzID0gdGhpc0FyZyA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChkZWxheWVkLCByZW1haW5pbmcpO1xuICAgIH1cbiAgfTtcblxuICB2YXIgbWF4RGVsYXllZCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aW1lb3V0SWQpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgIH1cbiAgICBtYXhUaW1lb3V0SWQgPSB0aW1lb3V0SWQgPSB0cmFpbGluZ0NhbGwgPSB1bmRlZmluZWQ7XG4gICAgaWYgKHRyYWlsaW5nIHx8IChtYXhXYWl0ICE9PSB3YWl0KSkge1xuICAgICAgbGFzdENhbGxlZCA9IG5vdygpO1xuICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcbiAgICAgIGlmICghdGltZW91dElkICYmICFtYXhUaW1lb3V0SWQpIHtcbiAgICAgICAgYXJncyA9IHRoaXNBcmcgPSBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgYXJncyA9IGFyZ3VtZW50cztcbiAgICBzdGFtcCA9IG5vdygpO1xuICAgIHRoaXNBcmcgPSB0aGlzO1xuICAgIHRyYWlsaW5nQ2FsbCA9IHRyYWlsaW5nICYmICh0aW1lb3V0SWQgfHwgIWxlYWRpbmcpO1xuXG4gICAgaWYgKG1heFdhaXQgPT09IGZhbHNlKSB7XG4gICAgICB2YXIgbGVhZGluZ0NhbGwgPSBsZWFkaW5nICYmICF0aW1lb3V0SWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghbWF4VGltZW91dElkICYmICFsZWFkaW5nKSB7XG4gICAgICAgIGxhc3RDYWxsZWQgPSBzdGFtcDtcbiAgICAgIH1cbiAgICAgIHZhciByZW1haW5pbmcgPSBtYXhXYWl0IC0gKHN0YW1wIC0gbGFzdENhbGxlZCksXG4gICAgICAgICAgaXNDYWxsZWQgPSByZW1haW5pbmcgPD0gMDtcblxuICAgICAgaWYgKGlzQ2FsbGVkKSB7XG4gICAgICAgIGlmIChtYXhUaW1lb3V0SWQpIHtcbiAgICAgICAgICBtYXhUaW1lb3V0SWQgPSBjbGVhclRpbWVvdXQobWF4VGltZW91dElkKTtcbiAgICAgICAgfVxuICAgICAgICBsYXN0Q2FsbGVkID0gc3RhbXA7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmICghbWF4VGltZW91dElkKSB7XG4gICAgICAgIG1heFRpbWVvdXRJZCA9IHNldFRpbWVvdXQobWF4RGVsYXllZCwgcmVtYWluaW5nKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGlzQ2FsbGVkICYmIHRpbWVvdXRJZCkge1xuICAgICAgdGltZW91dElkID0gY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgfVxuICAgIGVsc2UgaWYgKCF0aW1lb3V0SWQgJiYgd2FpdCAhPT0gbWF4V2FpdCkge1xuICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChkZWxheWVkLCB3YWl0KTtcbiAgICB9XG4gICAgaWYgKGxlYWRpbmdDYWxsKSB7XG4gICAgICBpc0NhbGxlZCA9IHRydWU7XG4gICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xuICAgIH1cbiAgICBpZiAoaXNDYWxsZWQgJiYgIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XG4gICAgICBhcmdzID0gdGhpc0FyZyA9IG51bGw7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZGVib3VuY2U7XG4iLCIvKipcbiAqIExvLURhc2ggMi40LjEgKEN1c3RvbSBCdWlsZCkgPGh0dHA6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZHVsYXJpemUgbW9kZXJuIGV4cG9ydHM9XCJucG1cIiAtbyAuL25wbS9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDEzIFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjUuMiA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTMgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cDovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xudmFyIGlzTmF0aXZlID0gcmVxdWlyZSgnbG9kYXNoLl9pc25hdGl2ZScpO1xuXG4vKipcbiAqIEdldHMgdGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdGhhdCBoYXZlIGVsYXBzZWQgc2luY2UgdGhlIFVuaXggZXBvY2hcbiAqICgxIEphbnVhcnkgMTk3MCAwMDowMDowMCBVVEMpLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgVXRpbGl0aWVzXG4gKiBAZXhhbXBsZVxuICpcbiAqIHZhciBzdGFtcCA9IF8ubm93KCk7XG4gKiBfLmRlZmVyKGZ1bmN0aW9uKCkgeyBjb25zb2xlLmxvZyhfLm5vdygpIC0gc3RhbXApOyB9KTtcbiAqIC8vID0+IGxvZ3MgdGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgaXQgdG9vayBmb3IgdGhlIGRlZmVycmVkIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZFxuICovXG52YXIgbm93ID0gaXNOYXRpdmUobm93ID0gRGF0ZS5ub3cpICYmIG5vdyB8fCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBub3c7XG4iLCIvKipcbiAqIExvLURhc2ggMi40LjEgKEN1c3RvbSBCdWlsZCkgPGh0dHA6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZHVsYXJpemUgbW9kZXJuIGV4cG9ydHM9XCJucG1cIiAtbyAuL25wbS9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDEzIFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjUuMiA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTMgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cDovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xuXG4vKiogVXNlZCBmb3IgbmF0aXZlIG1ldGhvZCByZWZlcmVuY2VzICovXG52YXIgb2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlO1xuXG4vKiogVXNlZCB0byByZXNvbHZlIHRoZSBpbnRlcm5hbCBbW0NsYXNzXV0gb2YgdmFsdWVzICovXG52YXIgdG9TdHJpbmcgPSBvYmplY3RQcm90by50b1N0cmluZztcblxuLyoqIFVzZWQgdG8gZGV0ZWN0IGlmIGEgbWV0aG9kIGlzIG5hdGl2ZSAqL1xudmFyIHJlTmF0aXZlID0gUmVnRXhwKCdeJyArXG4gIFN0cmluZyh0b1N0cmluZylcbiAgICAucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csICdcXFxcJCYnKVxuICAgIC5yZXBsYWNlKC90b1N0cmluZ3wgZm9yIFteXFxdXSsvZywgJy4qPycpICsgJyQnXG4pO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgbmF0aXZlIGZ1bmN0aW9uLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgYHZhbHVlYCBpcyBhIG5hdGl2ZSBmdW5jdGlvbiwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBpc05hdGl2ZSh2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09ICdmdW5jdGlvbicgJiYgcmVOYXRpdmUudGVzdCh2YWx1ZSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaXNOYXRpdmU7XG4iLCIvKipcbiAqIExvLURhc2ggMi40LjEgKEN1c3RvbSBCdWlsZCkgPGh0dHA6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZHVsYXJpemUgbW9kZXJuIGV4cG9ydHM9XCJucG1cIiAtbyAuL25wbS9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDEzIFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjUuMiA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTMgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cDovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgZnVuY3Rpb24uXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBPYmplY3RzXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgYHZhbHVlYCBpcyBhIGZ1bmN0aW9uLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNGdW5jdGlvbihfKTtcbiAqIC8vID0+IHRydWVcbiAqL1xuZnVuY3Rpb24gaXNGdW5jdGlvbih2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09ICdmdW5jdGlvbic7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaXNGdW5jdGlvbjtcbiIsIi8qKlxuICogTG8tRGFzaCAyLjQuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cDovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBtb2Rlcm4gZXhwb3J0cz1cIm5wbVwiIC1vIC4vbnBtL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuNS4yIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG52YXIgb2JqZWN0VHlwZXMgPSByZXF1aXJlKCdsb2Rhc2guX29iamVjdHR5cGVzJyk7XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgdGhlIGxhbmd1YWdlIHR5cGUgb2YgT2JqZWN0LlxuICogKGUuZy4gYXJyYXlzLCBmdW5jdGlvbnMsIG9iamVjdHMsIHJlZ2V4ZXMsIGBuZXcgTnVtYmVyKDApYCwgYW5kIGBuZXcgU3RyaW5nKCcnKWApXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBPYmplY3RzXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgYHZhbHVlYCBpcyBhbiBvYmplY3QsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc09iamVjdCh7fSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdChbMSwgMiwgM10pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3QoMSk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xuICAvLyBjaGVjayBpZiB0aGUgdmFsdWUgaXMgdGhlIEVDTUFTY3JpcHQgbGFuZ3VhZ2UgdHlwZSBvZiBPYmplY3RcbiAgLy8gaHR0cDovL2VzNS5naXRodWIuaW8vI3g4XG4gIC8vIGFuZCBhdm9pZCBhIFY4IGJ1Z1xuICAvLyBodHRwOi8vY29kZS5nb29nbGUuY29tL3AvdjgvaXNzdWVzL2RldGFpbD9pZD0yMjkxXG4gIHJldHVybiAhISh2YWx1ZSAmJiBvYmplY3RUeXBlc1t0eXBlb2YgdmFsdWVdKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpc09iamVjdDtcbiIsIi8qKlxuICogTG8tRGFzaCAyLjQuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cDovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBtb2Rlcm4gZXhwb3J0cz1cIm5wbVwiIC1vIC4vbnBtL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuNS4yIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG5cbi8qKiBVc2VkIHRvIGRldGVybWluZSBpZiB2YWx1ZXMgYXJlIG9mIHRoZSBsYW5ndWFnZSB0eXBlIE9iamVjdCAqL1xudmFyIG9iamVjdFR5cGVzID0ge1xuICAnYm9vbGVhbic6IGZhbHNlLFxuICAnZnVuY3Rpb24nOiB0cnVlLFxuICAnb2JqZWN0JzogdHJ1ZSxcbiAgJ251bWJlcic6IGZhbHNlLFxuICAnc3RyaW5nJzogZmFsc2UsXG4gICd1bmRlZmluZWQnOiBmYWxzZVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBvYmplY3RUeXBlcztcbiIsInZhciBzcGxpdCA9IHJlcXVpcmUoJ2Jyb3dzZXItc3BsaXQnKVxudmFyIENsYXNzTGlzdCA9IHJlcXVpcmUoJ2NsYXNzLWxpc3QnKVxucmVxdWlyZSgnaHRtbC1lbGVtZW50JylcblxuZnVuY3Rpb24gY29udGV4dCAoKSB7XG5cbiAgdmFyIGNsZWFudXBGdW5jcyA9IFtdXG5cbiAgZnVuY3Rpb24gaCgpIHtcbiAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKSwgZSA9IG51bGxcbiAgICBmdW5jdGlvbiBpdGVtIChsKSB7XG4gICAgICB2YXIgclxuICAgICAgZnVuY3Rpb24gcGFyc2VDbGFzcyAoc3RyaW5nKSB7XG4gICAgICAgIHZhciBtID0gc3BsaXQoc3RyaW5nLCAvKFtcXC4jXT9bYS16QS1aMC05XzotXSspLylcbiAgICAgICAgaWYoL15cXC58Iy8udGVzdChtWzFdKSlcbiAgICAgICAgICBlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICAgICAgZm9yRWFjaChtLCBmdW5jdGlvbiAodikge1xuICAgICAgICAgIHZhciBzID0gdi5zdWJzdHJpbmcoMSx2Lmxlbmd0aClcbiAgICAgICAgICBpZighdikgcmV0dXJuXG4gICAgICAgICAgaWYoIWUpXG4gICAgICAgICAgICBlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh2KVxuICAgICAgICAgIGVsc2UgaWYgKHZbMF0gPT09ICcuJylcbiAgICAgICAgICAgIENsYXNzTGlzdChlKS5hZGQocylcbiAgICAgICAgICBlbHNlIGlmICh2WzBdID09PSAnIycpXG4gICAgICAgICAgICBlLnNldEF0dHJpYnV0ZSgnaWQnLCBzKVxuICAgICAgICB9KVxuICAgICAgfVxuXG4gICAgICBpZihsID09IG51bGwpXG4gICAgICAgIDtcbiAgICAgIGVsc2UgaWYoJ3N0cmluZycgPT09IHR5cGVvZiBsKSB7XG4gICAgICAgIGlmKCFlKVxuICAgICAgICAgIHBhcnNlQ2xhc3MobClcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGUuYXBwZW5kQ2hpbGQociA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGwpKVxuICAgICAgfVxuICAgICAgZWxzZSBpZignbnVtYmVyJyA9PT0gdHlwZW9mIGxcbiAgICAgICAgfHwgJ2Jvb2xlYW4nID09PSB0eXBlb2YgbFxuICAgICAgICB8fCBsIGluc3RhbmNlb2YgRGF0ZVxuICAgICAgICB8fCBsIGluc3RhbmNlb2YgUmVnRXhwICkge1xuICAgICAgICAgIGUuYXBwZW5kQ2hpbGQociA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGwudG9TdHJpbmcoKSkpXG4gICAgICB9XG4gICAgICAvL3RoZXJlIG1pZ2h0IGJlIGEgYmV0dGVyIHdheSB0byBoYW5kbGUgdGhpcy4uLlxuICAgICAgZWxzZSBpZiAoaXNBcnJheShsKSlcbiAgICAgICAgZm9yRWFjaChsLCBpdGVtKVxuICAgICAgZWxzZSBpZihpc05vZGUobCkpXG4gICAgICAgIGUuYXBwZW5kQ2hpbGQociA9IGwpXG4gICAgICBlbHNlIGlmKGwgaW5zdGFuY2VvZiBUZXh0KVxuICAgICAgICBlLmFwcGVuZENoaWxkKHIgPSBsKVxuICAgICAgZWxzZSBpZiAoJ29iamVjdCcgPT09IHR5cGVvZiBsKSB7XG4gICAgICAgIGZvciAodmFyIGsgaW4gbCkge1xuICAgICAgICAgIGlmKCdmdW5jdGlvbicgPT09IHR5cGVvZiBsW2tdKSB7XG4gICAgICAgICAgICBpZigvXm9uXFx3Ky8udGVzdChrKSkge1xuICAgICAgICAgICAgICBpZiAoZS5hZGRFdmVudExpc3RlbmVyKXtcbiAgICAgICAgICAgICAgICBlLmFkZEV2ZW50TGlzdGVuZXIoay5zdWJzdHJpbmcoMiksIGxba10sIGZhbHNlKVxuICAgICAgICAgICAgICAgIGNsZWFudXBGdW5jcy5wdXNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICBlLnJlbW92ZUV2ZW50TGlzdGVuZXIoay5zdWJzdHJpbmcoMiksIGxba10sIGZhbHNlKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIGUuYXR0YWNoRXZlbnQoaywgbFtrXSlcbiAgICAgICAgICAgICAgICBjbGVhbnVwRnVuY3MucHVzaChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgZS5kZXRhY2hFdmVudChrLCBsW2tdKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIG9ic2VydmFibGVcbiAgICAgICAgICAgICAgZVtrXSA9IGxba10oKVxuICAgICAgICAgICAgICBjbGVhbnVwRnVuY3MucHVzaChsW2tdKGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgZVtrXSA9IHZcbiAgICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYoayA9PT0gJ3N0eWxlJykge1xuICAgICAgICAgICAgaWYoJ3N0cmluZycgPT09IHR5cGVvZiBsW2tdKSB7XG4gICAgICAgICAgICAgIGUuc3R5bGUuY3NzVGV4dCA9IGxba11cbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICBmb3IgKHZhciBzIGluIGxba10pIChmdW5jdGlvbihzLCB2KSB7XG4gICAgICAgICAgICAgICAgaWYoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHYpIHtcbiAgICAgICAgICAgICAgICAgIC8vIG9ic2VydmFibGVcbiAgICAgICAgICAgICAgICAgIGUuc3R5bGUuc2V0UHJvcGVydHkocywgdigpKVxuICAgICAgICAgICAgICAgICAgY2xlYW51cEZ1bmNzLnB1c2godihmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIGUuc3R5bGUuc2V0UHJvcGVydHkocywgdmFsKVxuICAgICAgICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICAgICAgICBlLnN0eWxlLnNldFByb3BlcnR5KHMsIGxba11bc10pXG4gICAgICAgICAgICAgIH0pKHMsIGxba11bc10pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmIChrLnN1YnN0cigwLCA1KSA9PT0gXCJkYXRhLVwiKSB7XG4gICAgICAgICAgICBlLnNldEF0dHJpYnV0ZShrLCBsW2tdKVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlW2tdID0gbFtrXVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgbCkge1xuICAgICAgICAvL2Fzc3VtZSBpdCdzIGFuIG9ic2VydmFibGUhXG4gICAgICAgIHZhciB2ID0gbCgpXG4gICAgICAgIGUuYXBwZW5kQ2hpbGQociA9IGlzTm9kZSh2KSA/IHYgOiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh2KSlcblxuICAgICAgICBjbGVhbnVwRnVuY3MucHVzaChsKGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgaWYoaXNOb2RlKHYpICYmIHIucGFyZW50RWxlbWVudClcbiAgICAgICAgICAgIHIucGFyZW50RWxlbWVudC5yZXBsYWNlQ2hpbGQodiwgciksIHIgPSB2XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgci50ZXh0Q29udGVudCA9IHZcbiAgICAgICAgfSkpXG4gICAgICB9XG5cbiAgICAgIHJldHVybiByXG4gICAgfVxuICAgIHdoaWxlKGFyZ3MubGVuZ3RoKVxuICAgICAgaXRlbShhcmdzLnNoaWZ0KCkpXG5cbiAgICByZXR1cm4gZVxuICB9XG5cbiAgaC5jbGVhbnVwID0gZnVuY3Rpb24gKCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2xlYW51cEZ1bmNzLmxlbmd0aDsgaSsrKXtcbiAgICAgIGNsZWFudXBGdW5jc1tpXSgpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGhcbn1cblxudmFyIGggPSBtb2R1bGUuZXhwb3J0cyA9IGNvbnRleHQoKVxuaC5jb250ZXh0ID0gY29udGV4dFxuXG5mdW5jdGlvbiBpc05vZGUgKGVsKSB7XG4gIHJldHVybiBlbCAmJiBlbC5ub2RlTmFtZSAmJiBlbC5ub2RlVHlwZVxufVxuXG5mdW5jdGlvbiBpc1RleHQgKGVsKSB7XG4gIHJldHVybiBlbCAmJiBlbC5ub2RlTmFtZSA9PT0gJyN0ZXh0JyAmJiBlbC5ub2RlVHlwZSA9PSAzXG59XG5cbmZ1bmN0aW9uIGZvckVhY2ggKGFyciwgZm4pIHtcbiAgaWYgKGFyci5mb3JFYWNoKSByZXR1cm4gYXJyLmZvckVhY2goZm4pXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBmbihhcnJbaV0sIGkpXG59XG5cbmZ1bmN0aW9uIGlzQXJyYXkgKGFycikge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGFycikgPT0gJ1tvYmplY3QgQXJyYXldJ1xufVxuIiwiLyohXG4gKiBDcm9zcy1Ccm93c2VyIFNwbGl0IDEuMS4xXG4gKiBDb3B5cmlnaHQgMjAwNy0yMDEyIFN0ZXZlbiBMZXZpdGhhbiA8c3RldmVubGV2aXRoYW4uY29tPlxuICogQXZhaWxhYmxlIHVuZGVyIHRoZSBNSVQgTGljZW5zZVxuICogRUNNQVNjcmlwdCBjb21wbGlhbnQsIHVuaWZvcm0gY3Jvc3MtYnJvd3NlciBzcGxpdCBtZXRob2RcbiAqL1xuXG4vKipcbiAqIFNwbGl0cyBhIHN0cmluZyBpbnRvIGFuIGFycmF5IG9mIHN0cmluZ3MgdXNpbmcgYSByZWdleCBvciBzdHJpbmcgc2VwYXJhdG9yLiBNYXRjaGVzIG9mIHRoZVxuICogc2VwYXJhdG9yIGFyZSBub3QgaW5jbHVkZWQgaW4gdGhlIHJlc3VsdCBhcnJheS4gSG93ZXZlciwgaWYgYHNlcGFyYXRvcmAgaXMgYSByZWdleCB0aGF0IGNvbnRhaW5zXG4gKiBjYXB0dXJpbmcgZ3JvdXBzLCBiYWNrcmVmZXJlbmNlcyBhcmUgc3BsaWNlZCBpbnRvIHRoZSByZXN1bHQgZWFjaCB0aW1lIGBzZXBhcmF0b3JgIGlzIG1hdGNoZWQuXG4gKiBGaXhlcyBicm93c2VyIGJ1Z3MgY29tcGFyZWQgdG8gdGhlIG5hdGl2ZSBgU3RyaW5nLnByb3RvdHlwZS5zcGxpdGAgYW5kIGNhbiBiZSB1c2VkIHJlbGlhYmx5XG4gKiBjcm9zcy1icm93c2VyLlxuICogQHBhcmFtIHtTdHJpbmd9IHN0ciBTdHJpbmcgdG8gc3BsaXQuXG4gKiBAcGFyYW0ge1JlZ0V4cHxTdHJpbmd9IHNlcGFyYXRvciBSZWdleCBvciBzdHJpbmcgdG8gdXNlIGZvciBzZXBhcmF0aW5nIHRoZSBzdHJpbmcuXG4gKiBAcGFyYW0ge051bWJlcn0gW2xpbWl0XSBNYXhpbXVtIG51bWJlciBvZiBpdGVtcyB0byBpbmNsdWRlIGluIHRoZSByZXN1bHQgYXJyYXkuXG4gKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIHN1YnN0cmluZ3MuXG4gKiBAZXhhbXBsZVxuICpcbiAqIC8vIEJhc2ljIHVzZVxuICogc3BsaXQoJ2EgYiBjIGQnLCAnICcpO1xuICogLy8gLT4gWydhJywgJ2InLCAnYycsICdkJ11cbiAqXG4gKiAvLyBXaXRoIGxpbWl0XG4gKiBzcGxpdCgnYSBiIGMgZCcsICcgJywgMik7XG4gKiAvLyAtPiBbJ2EnLCAnYiddXG4gKlxuICogLy8gQmFja3JlZmVyZW5jZXMgaW4gcmVzdWx0IGFycmF5XG4gKiBzcGxpdCgnLi53b3JkMSB3b3JkMi4uJywgLyhbYS16XSspKFxcZCspL2kpO1xuICogLy8gLT4gWycuLicsICd3b3JkJywgJzEnLCAnICcsICd3b3JkJywgJzInLCAnLi4nXVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbiBzcGxpdCh1bmRlZikge1xuXG4gIHZhciBuYXRpdmVTcGxpdCA9IFN0cmluZy5wcm90b3R5cGUuc3BsaXQsXG4gICAgY29tcGxpYW50RXhlY05wY2cgPSAvKCk/Py8uZXhlYyhcIlwiKVsxXSA9PT0gdW5kZWYsXG4gICAgLy8gTlBDRzogbm9ucGFydGljaXBhdGluZyBjYXB0dXJpbmcgZ3JvdXBcbiAgICBzZWxmO1xuXG4gIHNlbGYgPSBmdW5jdGlvbihzdHIsIHNlcGFyYXRvciwgbGltaXQpIHtcbiAgICAvLyBJZiBgc2VwYXJhdG9yYCBpcyBub3QgYSByZWdleCwgdXNlIGBuYXRpdmVTcGxpdGBcbiAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHNlcGFyYXRvcikgIT09IFwiW29iamVjdCBSZWdFeHBdXCIpIHtcbiAgICAgIHJldHVybiBuYXRpdmVTcGxpdC5jYWxsKHN0ciwgc2VwYXJhdG9yLCBsaW1pdCk7XG4gICAgfVxuICAgIHZhciBvdXRwdXQgPSBbXSxcbiAgICAgIGZsYWdzID0gKHNlcGFyYXRvci5pZ25vcmVDYXNlID8gXCJpXCIgOiBcIlwiKSArIChzZXBhcmF0b3IubXVsdGlsaW5lID8gXCJtXCIgOiBcIlwiKSArIChzZXBhcmF0b3IuZXh0ZW5kZWQgPyBcInhcIiA6IFwiXCIpICsgLy8gUHJvcG9zZWQgZm9yIEVTNlxuICAgICAgKHNlcGFyYXRvci5zdGlja3kgPyBcInlcIiA6IFwiXCIpLFxuICAgICAgLy8gRmlyZWZveCAzK1xuICAgICAgbGFzdExhc3RJbmRleCA9IDAsXG4gICAgICAvLyBNYWtlIGBnbG9iYWxgIGFuZCBhdm9pZCBgbGFzdEluZGV4YCBpc3N1ZXMgYnkgd29ya2luZyB3aXRoIGEgY29weVxuICAgICAgc2VwYXJhdG9yID0gbmV3IFJlZ0V4cChzZXBhcmF0b3Iuc291cmNlLCBmbGFncyArIFwiZ1wiKSxcbiAgICAgIHNlcGFyYXRvcjIsIG1hdGNoLCBsYXN0SW5kZXgsIGxhc3RMZW5ndGg7XG4gICAgc3RyICs9IFwiXCI7IC8vIFR5cGUtY29udmVydFxuICAgIGlmICghY29tcGxpYW50RXhlY05wY2cpIHtcbiAgICAgIC8vIERvZXNuJ3QgbmVlZCBmbGFncyBneSwgYnV0IHRoZXkgZG9uJ3QgaHVydFxuICAgICAgc2VwYXJhdG9yMiA9IG5ldyBSZWdFeHAoXCJeXCIgKyBzZXBhcmF0b3Iuc291cmNlICsgXCIkKD8hXFxcXHMpXCIsIGZsYWdzKTtcbiAgICB9XG4gICAgLyogVmFsdWVzIGZvciBgbGltaXRgLCBwZXIgdGhlIHNwZWM6XG4gICAgICogSWYgdW5kZWZpbmVkOiA0Mjk0OTY3Mjk1IC8vIE1hdGgucG93KDIsIDMyKSAtIDFcbiAgICAgKiBJZiAwLCBJbmZpbml0eSwgb3IgTmFOOiAwXG4gICAgICogSWYgcG9zaXRpdmUgbnVtYmVyOiBsaW1pdCA9IE1hdGguZmxvb3IobGltaXQpOyBpZiAobGltaXQgPiA0Mjk0OTY3Mjk1KSBsaW1pdCAtPSA0Mjk0OTY3Mjk2O1xuICAgICAqIElmIG5lZ2F0aXZlIG51bWJlcjogNDI5NDk2NzI5NiAtIE1hdGguZmxvb3IoTWF0aC5hYnMobGltaXQpKVxuICAgICAqIElmIG90aGVyOiBUeXBlLWNvbnZlcnQsIHRoZW4gdXNlIHRoZSBhYm92ZSBydWxlc1xuICAgICAqL1xuICAgIGxpbWl0ID0gbGltaXQgPT09IHVuZGVmID8gLTEgPj4+IDAgOiAvLyBNYXRoLnBvdygyLCAzMikgLSAxXG4gICAgbGltaXQgPj4+IDA7IC8vIFRvVWludDMyKGxpbWl0KVxuICAgIHdoaWxlIChtYXRjaCA9IHNlcGFyYXRvci5leGVjKHN0cikpIHtcbiAgICAgIC8vIGBzZXBhcmF0b3IubGFzdEluZGV4YCBpcyBub3QgcmVsaWFibGUgY3Jvc3MtYnJvd3NlclxuICAgICAgbGFzdEluZGV4ID0gbWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGg7XG4gICAgICBpZiAobGFzdEluZGV4ID4gbGFzdExhc3RJbmRleCkge1xuICAgICAgICBvdXRwdXQucHVzaChzdHIuc2xpY2UobGFzdExhc3RJbmRleCwgbWF0Y2guaW5kZXgpKTtcbiAgICAgICAgLy8gRml4IGJyb3dzZXJzIHdob3NlIGBleGVjYCBtZXRob2RzIGRvbid0IGNvbnNpc3RlbnRseSByZXR1cm4gYHVuZGVmaW5lZGAgZm9yXG4gICAgICAgIC8vIG5vbnBhcnRpY2lwYXRpbmcgY2FwdHVyaW5nIGdyb3Vwc1xuICAgICAgICBpZiAoIWNvbXBsaWFudEV4ZWNOcGNnICYmIG1hdGNoLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICBtYXRjaFswXS5yZXBsYWNlKHNlcGFyYXRvcjIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoIC0gMjsgaSsrKSB7XG4gICAgICAgICAgICAgIGlmIChhcmd1bWVudHNbaV0gPT09IHVuZGVmKSB7XG4gICAgICAgICAgICAgICAgbWF0Y2hbaV0gPSB1bmRlZjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtYXRjaC5sZW5ndGggPiAxICYmIG1hdGNoLmluZGV4IDwgc3RyLmxlbmd0aCkge1xuICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KG91dHB1dCwgbWF0Y2guc2xpY2UoMSkpO1xuICAgICAgICB9XG4gICAgICAgIGxhc3RMZW5ndGggPSBtYXRjaFswXS5sZW5ndGg7XG4gICAgICAgIGxhc3RMYXN0SW5kZXggPSBsYXN0SW5kZXg7XG4gICAgICAgIGlmIChvdXRwdXQubGVuZ3RoID49IGxpbWl0KSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChzZXBhcmF0b3IubGFzdEluZGV4ID09PSBtYXRjaC5pbmRleCkge1xuICAgICAgICBzZXBhcmF0b3IubGFzdEluZGV4Kys7IC8vIEF2b2lkIGFuIGluZmluaXRlIGxvb3BcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGxhc3RMYXN0SW5kZXggPT09IHN0ci5sZW5ndGgpIHtcbiAgICAgIGlmIChsYXN0TGVuZ3RoIHx8ICFzZXBhcmF0b3IudGVzdChcIlwiKSkge1xuICAgICAgICBvdXRwdXQucHVzaChcIlwiKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0LnB1c2goc3RyLnNsaWNlKGxhc3RMYXN0SW5kZXgpKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dHB1dC5sZW5ndGggPiBsaW1pdCA/IG91dHB1dC5zbGljZSgwLCBsaW1pdCkgOiBvdXRwdXQ7XG4gIH07XG5cbiAgcmV0dXJuIHNlbGY7XG59KSgpO1xuIiwiLy8gY29udGFpbnMsIGFkZCwgcmVtb3ZlLCB0b2dnbGVcbnZhciBpbmRleG9mID0gcmVxdWlyZSgnaW5kZXhvZicpXG5cbm1vZHVsZS5leHBvcnRzID0gQ2xhc3NMaXN0XG5cbmZ1bmN0aW9uIENsYXNzTGlzdChlbGVtKSB7XG4gICAgdmFyIGNsID0gZWxlbS5jbGFzc0xpc3RcblxuICAgIGlmIChjbCkge1xuICAgICAgICByZXR1cm4gY2xcbiAgICB9XG5cbiAgICB2YXIgY2xhc3NMaXN0ID0ge1xuICAgICAgICBhZGQ6IGFkZFxuICAgICAgICAsIHJlbW92ZTogcmVtb3ZlXG4gICAgICAgICwgY29udGFpbnM6IGNvbnRhaW5zXG4gICAgICAgICwgdG9nZ2xlOiB0b2dnbGVcbiAgICAgICAgLCB0b1N0cmluZzogJHRvU3RyaW5nXG4gICAgICAgICwgbGVuZ3RoOiAwXG4gICAgICAgICwgaXRlbTogaXRlbVxuICAgIH1cblxuICAgIHJldHVybiBjbGFzc0xpc3RcblxuICAgIGZ1bmN0aW9uIGFkZCh0b2tlbikge1xuICAgICAgICB2YXIgbGlzdCA9IGdldFRva2VucygpXG4gICAgICAgIGlmIChpbmRleG9mKGxpc3QsIHRva2VuKSA+IC0xKSB7XG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuICAgICAgICBsaXN0LnB1c2godG9rZW4pXG4gICAgICAgIHNldFRva2VucyhsaXN0KVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlbW92ZSh0b2tlbikge1xuICAgICAgICB2YXIgbGlzdCA9IGdldFRva2VucygpXG4gICAgICAgICAgICAsIGluZGV4ID0gaW5kZXhvZihsaXN0LCB0b2tlbilcblxuICAgICAgICBpZiAoaW5kZXggPT09IC0xKSB7XG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuXG4gICAgICAgIGxpc3Quc3BsaWNlKGluZGV4LCAxKVxuICAgICAgICBzZXRUb2tlbnMobGlzdClcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb250YWlucyh0b2tlbikge1xuICAgICAgICByZXR1cm4gaW5kZXhvZihnZXRUb2tlbnMoKSwgdG9rZW4pID4gLTFcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0b2dnbGUodG9rZW4pIHtcbiAgICAgICAgaWYgKGNvbnRhaW5zKHRva2VuKSkge1xuICAgICAgICAgICAgcmVtb3ZlKHRva2VuKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhZGQodG9rZW4pXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJHRvU3RyaW5nKCkge1xuICAgICAgICByZXR1cm4gZWxlbS5jbGFzc05hbWVcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpdGVtKGluZGV4KSB7XG4gICAgICAgIHZhciB0b2tlbnMgPSBnZXRUb2tlbnMoKVxuICAgICAgICByZXR1cm4gdG9rZW5zW2luZGV4XSB8fCBudWxsXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0VG9rZW5zKCkge1xuICAgICAgICB2YXIgY2xhc3NOYW1lID0gZWxlbS5jbGFzc05hbWVcblxuICAgICAgICByZXR1cm4gZmlsdGVyKGNsYXNzTmFtZS5zcGxpdChcIiBcIiksIGlzVHJ1dGh5KVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldFRva2VucyhsaXN0KSB7XG4gICAgICAgIHZhciBsZW5ndGggPSBsaXN0Lmxlbmd0aFxuXG4gICAgICAgIGVsZW0uY2xhc3NOYW1lID0gbGlzdC5qb2luKFwiIFwiKVxuICAgICAgICBjbGFzc0xpc3QubGVuZ3RoID0gbGVuZ3RoXG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjbGFzc0xpc3RbaV0gPSBsaXN0W2ldXG4gICAgICAgIH1cblxuICAgICAgICBkZWxldGUgbGlzdFtsZW5ndGhdXG4gICAgfVxufVxuXG5mdW5jdGlvbiBmaWx0ZXIgKGFyciwgZm4pIHtcbiAgICB2YXIgcmV0ID0gW11cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoZm4oYXJyW2ldKSkgcmV0LnB1c2goYXJyW2ldKVxuICAgIH1cbiAgICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGlzVHJ1dGh5KHZhbHVlKSB7XG4gICAgcmV0dXJuICEhdmFsdWVcbn1cbiIsIlxudmFyIGluZGV4T2YgPSBbXS5pbmRleE9mO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFyciwgb2JqKXtcbiAgaWYgKGluZGV4T2YpIHJldHVybiBhcnIuaW5kZXhPZihvYmopO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7ICsraSkge1xuICAgIGlmIChhcnJbaV0gPT09IG9iaikgcmV0dXJuIGk7XG4gIH1cbiAgcmV0dXJuIC0xO1xufTsiLCJ2YXIgbm93ID0gcmVxdWlyZSgncGVyZm9ybWFuY2Utbm93JylcbiAgLCBnbG9iYWwgPSB0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJyA/IHt9IDogd2luZG93XG4gICwgdmVuZG9ycyA9IFsnbW96JywgJ3dlYmtpdCddXG4gICwgc3VmZml4ID0gJ0FuaW1hdGlvbkZyYW1lJ1xuICAsIHJhZiA9IGdsb2JhbFsncmVxdWVzdCcgKyBzdWZmaXhdXG4gICwgY2FmID0gZ2xvYmFsWydjYW5jZWwnICsgc3VmZml4XSB8fCBnbG9iYWxbJ2NhbmNlbFJlcXVlc3QnICsgc3VmZml4XVxuICAsIGlzTmF0aXZlID0gdHJ1ZVxuXG5mb3IodmFyIGkgPSAwOyBpIDwgdmVuZG9ycy5sZW5ndGggJiYgIXJhZjsgaSsrKSB7XG4gIHJhZiA9IGdsb2JhbFt2ZW5kb3JzW2ldICsgJ1JlcXVlc3QnICsgc3VmZml4XVxuICBjYWYgPSBnbG9iYWxbdmVuZG9yc1tpXSArICdDYW5jZWwnICsgc3VmZml4XVxuICAgICAgfHwgZ2xvYmFsW3ZlbmRvcnNbaV0gKyAnQ2FuY2VsUmVxdWVzdCcgKyBzdWZmaXhdXG59XG5cbi8vIFNvbWUgdmVyc2lvbnMgb2YgRkYgaGF2ZSByQUYgYnV0IG5vdCBjQUZcbmlmKCFyYWYgfHwgIWNhZikge1xuICBpc05hdGl2ZSA9IGZhbHNlXG5cbiAgdmFyIGxhc3QgPSAwXG4gICAgLCBpZCA9IDBcbiAgICAsIHF1ZXVlID0gW11cbiAgICAsIGZyYW1lRHVyYXRpb24gPSAxMDAwIC8gNjBcblxuICByYWYgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgIGlmKHF1ZXVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdmFyIF9ub3cgPSBub3coKVxuICAgICAgICAsIG5leHQgPSBNYXRoLm1heCgwLCBmcmFtZUR1cmF0aW9uIC0gKF9ub3cgLSBsYXN0KSlcbiAgICAgIGxhc3QgPSBuZXh0ICsgX25vd1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGNwID0gcXVldWUuc2xpY2UoMClcbiAgICAgICAgLy8gQ2xlYXIgcXVldWUgaGVyZSB0byBwcmV2ZW50XG4gICAgICAgIC8vIGNhbGxiYWNrcyBmcm9tIGFwcGVuZGluZyBsaXN0ZW5lcnNcbiAgICAgICAgLy8gdG8gdGhlIGN1cnJlbnQgZnJhbWUncyBxdWV1ZVxuICAgICAgICBxdWV1ZS5sZW5ndGggPSAwXG4gICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBjcC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmKCFjcFtpXS5jYW5jZWxsZWQpIHtcbiAgICAgICAgICAgIHRyeXtcbiAgICAgICAgICAgICAgY3BbaV0uY2FsbGJhY2sobGFzdClcbiAgICAgICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyB0aHJvdyBlIH0sIDApXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LCBNYXRoLnJvdW5kKG5leHQpKVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKHtcbiAgICAgIGhhbmRsZTogKytpZCxcbiAgICAgIGNhbGxiYWNrOiBjYWxsYmFjayxcbiAgICAgIGNhbmNlbGxlZDogZmFsc2VcbiAgICB9KVxuICAgIHJldHVybiBpZFxuICB9XG5cbiAgY2FmID0gZnVuY3Rpb24oaGFuZGxlKSB7XG4gICAgZm9yKHZhciBpID0gMDsgaSA8IHF1ZXVlLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZihxdWV1ZVtpXS5oYW5kbGUgPT09IGhhbmRsZSkge1xuICAgICAgICBxdWV1ZVtpXS5jYW5jZWxsZWQgPSB0cnVlXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZm4pIHtcbiAgLy8gV3JhcCBpbiBhIG5ldyBmdW5jdGlvbiB0byBwcmV2ZW50XG4gIC8vIGBjYW5jZWxgIHBvdGVudGlhbGx5IGJlaW5nIGFzc2lnbmVkXG4gIC8vIHRvIHRoZSBuYXRpdmUgckFGIGZ1bmN0aW9uXG4gIGlmKCFpc05hdGl2ZSkge1xuICAgIHJldHVybiByYWYuY2FsbChnbG9iYWwsIGZuKVxuICB9XG4gIHJldHVybiByYWYuY2FsbChnbG9iYWwsIGZ1bmN0aW9uKCkge1xuICAgIHRyeXtcbiAgICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IHRocm93IGUgfSwgMClcbiAgICB9XG4gIH0pXG59XG5tb2R1bGUuZXhwb3J0cy5jYW5jZWwgPSBmdW5jdGlvbigpIHtcbiAgY2FmLmFwcGx5KGdsb2JhbCwgYXJndW1lbnRzKVxufVxuIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcbi8vIEdlbmVyYXRlZCBieSBDb2ZmZWVTY3JpcHQgMS42LjNcbihmdW5jdGlvbigpIHtcbiAgdmFyIGdldE5hbm9TZWNvbmRzLCBocnRpbWUsIGxvYWRUaW1lO1xuXG4gIGlmICgodHlwZW9mIHBlcmZvcm1hbmNlICE9PSBcInVuZGVmaW5lZFwiICYmIHBlcmZvcm1hbmNlICE9PSBudWxsKSAmJiBwZXJmb3JtYW5jZS5ub3cpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHBlcmZvcm1hbmNlLm5vdygpO1xuICAgIH07XG4gIH0gZWxzZSBpZiAoKHR5cGVvZiBwcm9jZXNzICE9PSBcInVuZGVmaW5lZFwiICYmIHByb2Nlc3MgIT09IG51bGwpICYmIHByb2Nlc3MuaHJ0aW1lKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAoZ2V0TmFub1NlY29uZHMoKSAtIGxvYWRUaW1lKSAvIDFlNjtcbiAgICB9O1xuICAgIGhydGltZSA9IHByb2Nlc3MuaHJ0aW1lO1xuICAgIGdldE5hbm9TZWNvbmRzID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgaHI7XG4gICAgICBociA9IGhydGltZSgpO1xuICAgICAgcmV0dXJuIGhyWzBdICogMWU5ICsgaHJbMV07XG4gICAgfTtcbiAgICBsb2FkVGltZSA9IGdldE5hbm9TZWNvbmRzKCk7XG4gIH0gZWxzZSBpZiAoRGF0ZS5ub3cpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIERhdGUubm93KCkgLSBsb2FkVGltZTtcbiAgICB9O1xuICAgIGxvYWRUaW1lID0gRGF0ZS5ub3coKTtcbiAgfSBlbHNlIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpIC0gbG9hZFRpbWU7XG4gICAgfTtcbiAgICBsb2FkVGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICB9XG5cbn0pLmNhbGwodGhpcyk7XG5cbi8qXG4vL0Agc291cmNlTWFwcGluZ1VSTD1wZXJmb3JtYW5jZS1ub3cubWFwXG4qL1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZSgnX3Byb2Nlc3MnKSkiLG51bGwsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhbk11dGF0aW9uT2JzZXJ2ZXIgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5NdXRhdGlvbk9ic2VydmVyO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIHZhciBxdWV1ZSA9IFtdO1xuXG4gICAgaWYgKGNhbk11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgICAgICAgdmFyIGhpZGRlbkRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIHZhciBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBxdWV1ZUxpc3QgPSBxdWV1ZS5zbGljZSgpO1xuICAgICAgICAgICAgcXVldWUubGVuZ3RoID0gMDtcbiAgICAgICAgICAgIHF1ZXVlTGlzdC5mb3JFYWNoKGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgb2JzZXJ2ZXIub2JzZXJ2ZShoaWRkZW5EaXYsIHsgYXR0cmlidXRlczogdHJ1ZSB9KTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIGlmICghcXVldWUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaGlkZGVuRGl2LnNldEF0dHJpYnV0ZSgneWVzJywgJ25vJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCJ2YXIgcmVzdWx0ID0gWycjMzBGRkQ2JyxcbiAgICAgICAgICAgICAgJyM3MkVFRDYnLFxuICAgICAgICAgICAgICAnIzFEQkY5RicsXG4gICAgICAgICAgICAgICcjNjVGMEI5JyxcbiAgICAgICAgICAgICAgJyM1N0ZDOTMnLFxuICAgICAgICAgICAgICAnIzk4RkZCRScsXG4gICAgICAgICAgICAgICcjQTBGRjk4J107XG52YXIgbXlJbnRlcnZhbDtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHN0YXJ0OiBzdGFydCxcbiAgZW5kOiBlbmRcbn1cblxuZnVuY3Rpb24gc3RhcnQoZWwsIGludGVydmFsKSB7XG4gIHZhciBsID0gMDtcbiAgbXlJbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICBsKys7XG4gICAgICAgICAgICAgICAgIGlmIChsID49IHJlc3VsdC5sZW5ndGgpIGwgPSAwO1xuICAgICAgICAgICAgICAgICBlbC5zdHlsZS5jb2xvciA9IHJlc3VsdFtsXTtcbiAgICAgICAgICAgICAgIH0sIGludGVydmFsKTtcbn1cblxuZnVuY3Rpb24gZW5kKCkge1xuICBjbGVhckludGVydmFsKG15SW50ZXJ2YWwpO1xuICBteUludGVydmFsID0gbnVsbDtcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IGRyYXdCdWZmZXI7XG5cbmZ1bmN0aW9uIGRyYXdCdWZmZXIgKGNhbnZhcywgYnVmZmVyLCBjb2xvcikge1xuICB2YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gIHZhciB3aWR0aCA9IGNhbnZhcy53aWR0aDtcbiAgdmFyIGhlaWdodCA9IGNhbnZhcy5oZWlnaHQ7XG4gIGlmIChjb2xvcikge1xuICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvcjtcbiAgfVxuXG4gICAgdmFyIGRhdGEgPSBidWZmZXIuZ2V0Q2hhbm5lbERhdGEoIDAgKTtcbiAgICB2YXIgc3RlcCA9IE1hdGguY2VpbCggZGF0YS5sZW5ndGggLyB3aWR0aCApO1xuICAgIHZhciBhbXAgPSBoZWlnaHQgLyAyO1xuICAgIGZvcih2YXIgaT0wOyBpIDwgd2lkdGg7IGkrKyl7XG4gICAgICAgIHZhciBtaW4gPSAxLjA7XG4gICAgICAgIHZhciBtYXggPSAtMS4wO1xuICAgICAgICBmb3IgKHZhciBqPTA7IGo8c3RlcDsgaisrKSB7XG4gICAgICAgICAgICB2YXIgZGF0dW0gPSBkYXRhWyhpKnN0ZXApK2pdO1xuICAgICAgICAgICAgaWYgKGRhdHVtIDwgbWluKVxuICAgICAgICAgICAgICAgIG1pbiA9IGRhdHVtO1xuICAgICAgICAgICAgaWYgKGRhdHVtID4gbWF4KVxuICAgICAgICAgICAgICAgIG1heCA9IGRhdHVtO1xuICAgICAgICB9XG4gICAgICBjdHguZmlsbFJlY3QoaSwoMSttaW4pKmFtcCwxLE1hdGgubWF4KDEsKG1heC1taW4pKmFtcCkpO1xuICAgIH1cbn0iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgY3V0OiBjdXRCdWZmZXIsXG4gIGNvcHk6IGNvcHlCdWZmZXIsXG4gIHBhc3RlOiBwYXN0ZUJ1ZmZlcixcbiAgcmV2ZXJzZTogcmV2ZXJzZUJ1ZmZlclxufTtcblxuZnVuY3Rpb24gcmV2ZXJzZUJ1ZmZlcihidWZmZXIsIGNiKSB7XG4gIHZhciBjaGFuTnVtYmVyID0gYnVmZmVyLm51bWJlck9mQ2hhbm5lbHM7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY2hhbk51bWJlcjsgKytpKSB7XG4gICAgdmFyIGRhdGEgPSBidWZmZXIuZ2V0Q2hhbm5lbERhdGEoaSk7XG4gICAgQXJyYXkucHJvdG90eXBlLnJldmVyc2UuY2FsbChkYXRhKTtcbiAgfVxuICBjYigpO1xufVxuXG4vLyBjb3B5IHRoZSBidWZmZXIgdG8gb3VyIGNsaXBib2FyZCwgd2l0aG91dCByZW1vdmluZyB0aGUgb3JpZ2luYWwgc2VjdGlvbiBmcm9tIGJ1ZmZlci5cbmZ1bmN0aW9uIGNvcHlCdWZmZXIoY29udGV4dCwgY2xpcGJvYXJkLCBidWZmZXIsIGNiKSB7XG4gIHZhciBzdGFydCA9IE1hdGgucm91bmQoY2xpcGJvYXJkLnN0YXJ0ICogYnVmZmVyLnNhbXBsZVJhdGUpO1xuICB2YXIgZW5kID0gTWF0aC5yb3VuZChjbGlwYm9hcmQuZW5kICogYnVmZmVyLnNhbXBsZVJhdGUpO1xuXG4gIGNsaXBib2FyZC5idWZmZXIgPSBjb250ZXh0LmNyZWF0ZUJ1ZmZlcigyLCBlbmQgLSBzdGFydCwgYnVmZmVyLnNhbXBsZVJhdGUpO1xuXG4gIGNsaXBib2FyZC5idWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCkuc2V0KFxuICAgIGJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zdWJhcnJheShzdGFydCwgZW5kKSwgMCk7XG4gIGNsaXBib2FyZC5idWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkuc2V0KFxuICAgIGJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKS5zdWJhcnJheShzdGFydCwgZW5kKSwgMCk7XG5cbiAgY2IoKTtcbn1cblxuLy8gY3V0IHRoZSBidWZmZXIgcG9ydGlvbiB0byBvdXIgY2xpcGJvYXJkLCBzZXRzIGVtcHR5IHNwYWNlIGluIHBsYWNlIG9mIHRoZSBwb3J0aW9uXG4vLyBpbiB0aGUgc291cmNlIGJ1ZmZlci5cbmZ1bmN0aW9uIGN1dEJ1ZmZlcihjb250ZXh0LCBjbGlwYm9hcmQsIGJ1ZmZlciwgY2IpIHtcbiAgdmFyIHN0YXJ0ID0gTWF0aC5yb3VuZChjbGlwYm9hcmQuc3RhcnQgKiBidWZmZXIuc2FtcGxlUmF0ZSk7XG4gIHZhciBlbmQgPSBNYXRoLnJvdW5kKGNsaXBib2FyZC5lbmQgKiBidWZmZXIuc2FtcGxlUmF0ZSk7XG5cbiAgY2xpcGJvYXJkLmJ1ZmZlciA9IGNvbnRleHQuY3JlYXRlQnVmZmVyKDIsIGVuZCAtIHN0YXJ0LCBidWZmZXIuc2FtcGxlUmF0ZSk7XG4gIGNsaXBib2FyZC5idWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCkuc2V0KGJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zdWJhcnJheShzdGFydCwgZW5kKSk7XG4gIGNsaXBib2FyZC5idWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkuc2V0KGJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKS5zdWJhcnJheShzdGFydCwgZW5kKSk7XG5cbiAgdmFyIG51T2xkQnVmZmVyID0gY29udGV4dC5jcmVhdGVCdWZmZXIoMiwgYnVmZmVyLmxlbmd0aCwgYnVmZmVyLnNhbXBsZVJhdGUpO1xuICB2YXIgZW1wdHlCdWYgPSBjb250ZXh0LmNyZWF0ZUJ1ZmZlcigyLCBlbmQgLSBzdGFydCwgYnVmZmVyLnNhbXBsZVJhdGUpO1xuXG4gIG51T2xkQnVmZmVyLmdldENoYW5uZWxEYXRhKDApLnNldChidWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCkuc3ViYXJyYXkoMCwgc3RhcnQpKTtcbiAgbnVPbGRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkuc2V0KGJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKS5zdWJhcnJheSgwLCBzdGFydCkpXG5cbiAgbnVPbGRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCkuc2V0KGVtcHR5QnVmLmdldENoYW5uZWxEYXRhKDApLCBzdGFydCk7XG4gIG51T2xkQnVmZmVyLmdldENoYW5uZWxEYXRhKDEpLnNldChlbXB0eUJ1Zi5nZXRDaGFubmVsRGF0YSgxKSwgc3RhcnQpO1xuXG4gIG51T2xkQnVmZmVyLmdldENoYW5uZWxEYXRhKDApLnNldChidWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCkuc3ViYXJyYXkoZW5kLCBidWZmZXIubGVuZ3RoKSwgZW5kKTtcbiAgbnVPbGRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkuc2V0KGJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKS5zdWJhcnJheShlbmQsIGJ1ZmZlci5sZW5ndGgpLCBlbmQpO1xuICBjYihudU9sZEJ1ZmZlcik7XG59XG5cbi8vIGluc2VydCBvdXIgY2xpcGJvYXJkIGF0IGEgc3BlY2lmaWMgcG9pbnQgaW4gYnVmZmVyLlxuZnVuY3Rpb24gcGFzdGVCdWZmZXIoY29udGV4dCwgY2xpcGJvYXJkLCBidWZmZXIsIGF0LCBjYikge1xuICB2YXIgc3RhcnQgPSBNYXRoLnJvdW5kKGNsaXBib2FyZC5zdGFydCAqIGJ1ZmZlci5zYW1wbGVSYXRlKTtcbiAgdmFyIGVuZCA9IE1hdGgucm91bmQoY2xpcGJvYXJkLmVuZCAqIGJ1ZmZlci5zYW1wbGVSYXRlKTtcbiAgYXQgPSBhdCAqIGJ1ZmZlci5zYW1wbGVSYXRlO1xuXG4gIC8vIGNyZWF0ZSByZXBsYWNlbWVudCBidWZmZXIgd2l0aCBlbm91Z2ggc3BhY2UgZm9yIGNsaWJvYXJkIHBhcnRcbiAgdmFyIG51UGFzdGVkQnVmZmVyID0gY29udGV4dC5jcmVhdGVCdWZmZXIoMiwgYnVmZmVyLmxlbmd0aCArIChlbmQgLSBzdGFydCksIGJ1ZmZlci5zYW1wbGVSYXRlKTtcblxuICAvLyBpZiBvdXIgY2xpcCBzdGFydCBwb2ludCBpcyBub3QgYXQgJzAnIHRoZW4gd2UgbmVlZCB0byBzZXQgdGhlIG9yaWdpbmFsXG4gIC8vIGNodW5rLCB1cCB0byB0aGUgY2xpcCBzdGFydCBwb2ludFxuICBpZiAoYXQgPiAwKSB7XG4gICAgbnVQYXN0ZWRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCkuc2V0KGJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zdWJhcnJheSgwLCBhdCkpO1xuICAgIG51UGFzdGVkQnVmZmVyLmdldENoYW5uZWxEYXRhKDEpLnNldChidWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkuc3ViYXJyYXkoMCwgYXQpKTtcbiAgfVxuXG4gIC8vIGFkZCB0aGUgY2xpcCBkYXRhXG4gIG51UGFzdGVkQnVmZmVyLmdldENoYW5uZWxEYXRhKDApLnNldChjbGlwYm9hcmQuYnVmZmVyLmdldENoYW5uZWxEYXRhKDApLCBhdCk7XG4gIG51UGFzdGVkQnVmZmVyLmdldENoYW5uZWxEYXRhKDEpLnNldChjbGlwYm9hcmQuYnVmZmVyLmdldENoYW5uZWxEYXRhKDEpLCBhdCk7XG5cbiAgLy8gaWYgb3VyIGNsaXAgZW5kIHBvaW50IGlzIG5vdCBhdCB0aGUgZW5kIG9mIHRoZSBvcmlnaW5hbCBidWZmZXIgdGhlblxuICAvLyB3ZSBuZWVkIHRvIGFkZCByZW1haW5pbmcgZGF0YSBmcm9tIHRoZSBvcmlnaW5hbCBidWZmZXI7XG4gIGlmIChlbmQgPCBidWZmZXIubGVuZ3RoKSB7XG4gICAgdmFyIG5ld0F0ID0gYXQgKyAoZW5kIC0gc3RhcnQpO1xuICAgIG51UGFzdGVkQnVmZmVyLmdldENoYW5uZWxEYXRhKDApLnNldChidWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCkuc3ViYXJyYXkobmV3QXQpLCBuZXdBdCk7XG4gICAgbnVQYXN0ZWRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkuc2V0KGJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKS5zdWJhcnJheShuZXdBdCksIG5ld0F0KTtcbiAgfVxuXG4gIGNiKG51UGFzdGVkQnVmZmVyKTtcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh0b3RhbFNlYywgbXMpIHtcbiAgdmFyIG1pbnV0ZXMgPSBwYXJzZUludCggdG90YWxTZWMgLyA2MCApICUgNjA7XG4gIHZhciBzZWNvbmRzID0gdG90YWxTZWMgJSA2MDtcblxuICBpZiAobXMpIHtcbiAgICByZXR1cm4gKChtaW51dGVzIDwgMTAgPyBcIjBcIiArIG1pbnV0ZXMgOiBtaW51dGVzKSArIFwiOlwiICsgKHNlY29uZHMgIDwgMTAgPyBcIjBcIiArIHNlY29uZHMudG9GaXhlZCgyKSA6IHNlY29uZHMudG9GaXhlZCgyKSkpLnJlcGxhY2UoJy4nLCAnOicpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAoKG1pbnV0ZXMgPCAxMCA/IFwiMFwiICsgbWludXRlcyA6IG1pbnV0ZXMpICsgXCI6XCIgKyAoc2Vjb25kcyAgPCAxMCA/IFwiMFwiICsgIHBhcnNlSW50KHNlY29uZHMpIDogcGFyc2VJbnQoc2Vjb25kcykpKTtcbiAgfVxufSIsInZhciByZWNvcmRlcjtcbm1vZHVsZS5leHBvcnRzID0ge1xuICBzdGFydDogc3RhcnQsXG4gIHN0b3A6IHN0b3Bcbn1cblxuZnVuY3Rpb24gZ2V0U3RyZWFtKGNvbnRleHQsIGZmdCkge1xuICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhID0gbmF2aWdhdG9yLmdldFVzZXJNZWRpYSB8fCBuYXZpZ2F0b3Iud2Via2l0R2V0VXNlck1lZGlhO1xuICB3aW5kb3cuVVJMID0gd2luZG93LlVSTCB8fCB3aW5kb3cud2Via2l0VVJMO1xuXG4gIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEoe2F1ZGlvOiB0cnVlfSwgZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgc3RhcnRVc2VyTWVkaWEoY29udGV4dCwgc3RyZWFtLCBmZnQpO1xuICB9LCBmdW5jdGlvbihlcnIpIHtcbiAgICBjb25zb2xlLmxvZygnTm8gbGl2ZSBhdWRpbyBpbnB1dDogJyArIGVycik7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBzdGFydFVzZXJNZWRpYShjb250ZXh0LCBzdHJlYW0sIGZmdCkge1xuICB2YXIgaW5wdXQgPSBjb250ZXh0LmNyZWF0ZU1lZGlhU3RyZWFtU291cmNlKHN0cmVhbSk7XG4gIGNvbnNvbGUubG9nKCdNZWRpYSBzdHJlYW0gY3JlYXRlZC4nKTtcblxuICBpZiAoZmZ0KSB7XG4gICAgaW5wdXQuY29ubmVjdChmZnQuaW5wdXQpO1xuICAgIC8vIHRocm93IGF3YXkgZ2FpbiBub2RlXG4gICAgdmFyIGdhaW5Ob2RlID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgZ2Fpbk5vZGUuZ2Fpbi52YWx1ZSA9IDA7XG4gICAgZmZ0LmNvbm5lY3QoZ2Fpbk5vZGUpO1xuICAgIGdhaW5Ob2RlLmNvbm5lY3QoY29udGV4dC5kZXN0aW5hdGlvbik7XG4gIH1cbiAgLy8gaW5wdXQuY29ubmVjdChjb250ZXh0LmRlc3RpbmF0aW9uKTsgLy8gbWlnaHQgbm90IGFjdHVhbGx5IHdhbnQgdG8gZG8gdGhpc1xuICBjb25zb2xlLmxvZygnSW5wdXQgY29ubmVjdGVkIHRvIGF1ZGlvIGNvbnRleHQgZGVzdGluYXRpb24uJyk7XG5cbiAgcmVjb3JkZXIgPSBuZXcgUmVjb3JkZXIoaW5wdXQpO1xuICBjb25zb2xlLmxvZygnUmVjb3JkZXIgaW5pdGlhbGlzZWQuJyk7XG4gIHN0YXJ0KCk7XG59XG5cbmZ1bmN0aW9uIHN0YXJ0KGNvbnRleHQsIGZmdCkge1xuICBpZiAocmVjb3JkZXIgPT09IHVuZGVmaW5lZCkge1xuICAgIGdldFN0cmVhbShjb250ZXh0LCBmZnQpXG4gIH0gZWxzZSB7XG4gICAgcmVjb3JkZXIucmVjb3JkKCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc3RvcChjYikge1xuICByZWNvcmRlci5zdG9wKCk7XG4gIHJlY29yZGVyLmV4cG9ydFdBVihjYik7XG4gIHJlY29yZGVyLmNsZWFyKCk7XG59IiwiLy8gbmVlZCB0byBnZW5lcmF0ZSB0aGVzZSBwb2ludHMsIGxpa2UsIHdheSBzbWFydGVyXG4vLyBuZWVkIHRvIGJlIG11bHRpcGxlcyBvZiA1IGJ1dCBzdGlsbCByZXByZXNlbnRhdGl2ZSBvZiBtaW51dGVzXG4vLyBuZWVkIHRvIGFkanVzdCB3aWR0aCBvZiB0aW1lbGluZUVsIGJhc2VkIG9uIHRoaXNcblxudmFyIGggPSByZXF1aXJlKCdoeXBlcnNjcmlwdCcpO1xudmFyIGZvcm1hdFRpbWUgPSByZXF1aXJlKCcuL2Zvcm1hdC10aW1lJyk7XG52YXIgdGltZWxpbmVFbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy50aW1lbGluZScpO1xuXG5mdW5jdGlvbiBjYWxjdWxhdGVQb2ludHMoZHVyYXRpb24pIHtcbiAgcmV0dXJuIGR1cmF0aW9uIC8gNTtcbn1cblxuZnVuY3Rpb24gcG9pbnQobnVtKSB7XG4gIHJldHVybiBoKCdsaScsXG4gICAgICAgICAgIGgoJ3NwYW4nLCBudW0pKTtcbn1cblxuZnVuY3Rpb24gZ2V0UG9pbnRMZW5ndGgoKSB7XG4gIHJldHVybiB0aW1lbGluZUVsLmNoaWxkcmVuLmxlbmd0aFxufVxuXG4vLyBmaXggZm9ybWF0VGltZSB0byB3b3JrIHdpdGggbG93IG51bWJlcnNcblxuZnVuY3Rpb24gZ2V0UG9pbnRzKGN1ciwgbWF4KSB7XG4gIGlmIChjdXIgPCBtYXgpIHtcbiAgICBjdXIgPSBjdXIgKyA1O1xuICAgIHRpbWVsaW5lRWwuYXBwZW5kQ2hpbGQocG9pbnQoZm9ybWF0VGltZShjdXIpKSk7XG4gICAgZ2V0UG9pbnRzKGN1ciwgbWF4KTtcbiAgfVxufVxuXG5mdW5jdGlvbiB1cGRhdGUoZHVyYXRpb24pIHtcbiAgY29uc29sZS5sb2coJ2R1cmF0aW9uOjonLCBkdXJhdGlvbik7XG4gIHZhciBudVBvaW50TGVuZ3RoID0gY2FsY3VsYXRlUG9pbnRzKGR1cmF0aW9uKTtcbiAgaWYgKG51UG9pbnRMZW5ndGggPCBnZXRQb2ludExlbmd0aCgpKSByZXR1cm47XG5cbiAgdmFyIHcgPSB0aW1lbGluZUVsLm9mZnNldFdpZHRoO1xuICB0aW1lbGluZUVsLmlubmVySFRNTCA9ICcnO1xuICBnZXRQb2ludHMoLTUsIGR1cmF0aW9uKTtcbiAgaWYgKHRpbWVsaW5lRWwuY2hpbGRyZW4ubGVuZ3RoICogMTAwID4gdykge1xuICAgIHRpbWVsaW5lRWwuc3R5bGUud2lkdGggPSB0aW1lbGluZUVsLmNoaWxkcmVuLmxlbmd0aCAqIDEwMCArICdweCc7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHVwZGF0ZTogdXBkYXRlXG59OyIsIi8vIFRoaXMgZmlsZSBpcyBhIHBpdCBvZiBuZXcgeW9yayBjaXR5IHNsYXJtLCBlZGl0IGF0IHlvdXIgb3duIHJpc2tcblxudmFyIEVFID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xudmFyIHJhZiA9IHJlcXVpcmUoJ3JhZicpO1xudmFyIHRpbWVsaW5lTWFuYWdlID0gcmVxdWlyZSgnLi90aW1lbGluZScpO1xudmFyIEF1ZGlvU291cmNlID0gcmVxdWlyZSgnYXVkaW9zb3VyY2UnKTtcbnZhciBmb3JtYXRUaW1lID0gcmVxdWlyZSgnLi9mb3JtYXQtdGltZScpO1xudmFyIGRyYXdCdWZmZXIgPSByZXF1aXJlKCcuL2RyYXctYnVmZmVyJyk7XG52YXIgY29sb3JzID0gcmVxdWlyZSgnLi9jb2xvcnMnKTtcbm1vZHVsZS5leHBvcnRzID0gVHJhY2s7XG5cbmZ1bmN0aW9uIFRyYWNrKG9wdHMpIHtcbiAgdGhpcy5lbWl0dGVyID0gbmV3IEVFKCk7XG4gIHRoaXMuY29udHJvbEVsID0gb3B0cy5jb250cm9sRWw7XG4gIHRoaXMudHJhY2tFbCA9IG9wdHMudHJhY2tFbDtcbiAgdGhpcy5hY3RpdmUgPSB0cnVlO1xuICB0aGlzLnNlbGVjdGluZyA9IHRydWU7XG4gIHRoaXMuY29udGV4dCA9IG9wdHMuY29udGV4dDtcbiAgdGhpcy5hdWRpb3NvdXJjZSA9IG9wdHMuYXVkaW9zb3VyY2U7XG4gIHRoaXMuaWQgPSBvcHRzLmlkO1xuICB0aGlzLnRpdGxlID0gb3B0cy50aXRsZTtcblxuICBpZiAob3B0cy5nYWluTm9kZSkge1xuICAgIHRoaXMuZ2Fpbk5vZGUgPSBvcHRzLmdhaW5Ob2RlO1xuICB9XG5cbiAgdGhpcy5jbGlwYm9hcmQgPSB7XG4gICAgc3RhcnQ6IDAsXG4gICAgZW5kOiAwLFxuICAgIGF0OiAwXG4gIH07XG5cbiAgdGhpcy5wbGF5aW5nID0gZmFsc2U7XG5cbiAgdGhpcy5zdGFydE9mZnNldCA9IDA7XG4gIHRoaXMubGFzdFBsYXkgPSAwO1xuXG4gIC8vIGluZGljYXRvcnNcbiAgdGhpcy5maWxlSW5kaWNhdG9yID0gdGhpcy50cmFja0VsLnF1ZXJ5U2VsZWN0b3IoJy50cmFjayBwJyk7XG4gIHRoaXMuY3VycmVudFRpbWVFbCA9IHRoaXMuY29udHJvbEVsLnF1ZXJ5U2VsZWN0b3IoJy5jdXInKTtcbiAgdGhpcy5yZW1haW5pbmdFbCA9IHRoaXMuY29udHJvbEVsLnF1ZXJ5U2VsZWN0b3IoJy5yZW0nKTtcbiAgdGhpcy5kdXJhdGlvbkVsID0gdGhpcy5jb250cm9sRWwucXVlcnlTZWxlY3RvcignLmR1cicpO1xuXG4gIC8vIGNvbnRyb2xzXG4gIHRoaXMuZ2FpbkVsID0gdGhpcy5jb250cm9sRWwucXVlcnlTZWxlY3RvcignLnZvbHVtZSBpbnB1dCcpO1xuXG4gIC8vIHdhdmUgZWxlbWVudHNcbiAgdGhpcy53YXZlID0gdGhpcy50cmFja0VsLnF1ZXJ5U2VsZWN0b3IoJy53YXZlIGNhbnZhcycpO1xuICB0aGlzLnByb2dyZXNzV2F2ZSA9IHRoaXMudHJhY2tFbC5xdWVyeVNlbGVjdG9yKCcud2F2ZS1wcm9ncmVzcycpO1xuICB0aGlzLmN1cnNvciA9IHRoaXMudHJhY2tFbC5xdWVyeVNlbGVjdG9yKCcucGxheS1jdXJzb3InKTtcbiAgdGhpcy5zZWxlY3Rpb24gPSB0aGlzLnRyYWNrRWwucXVlcnlTZWxlY3RvcignLnNlbGVjdGlvbicpO1xuICB0aGlzLnNlbGVjdGFibGUgPSBbXS5zbGljZS5jYWxsKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5zZWxlY3RhYmxlJykpO1xuXG4gIGNvbG9ycy5zdGFydCh0aGlzLmZpbGVJbmRpY2F0b3IsIDMwMCk7XG5cbiAgdGhpcy5nYWluRWwuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3Rpb24oZXYpIHtcbiAgICB0aGlzLmdhaW5Ob2RlLmdhaW4udmFsdWUgPSBwYXJzZUZsb2F0KGV2LnRhcmdldC52YWx1ZSk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgdGhpcy5jb250cm9sRWwucXVlcnlTZWxlY3RvcignLmFjdGl2YXRlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihldikge1xuICAgIHZhciBlbCA9IGV2LnRhcmdldDtcblxuICAgIGlmIChlbC5jbGFzc0xpc3QuY29udGFpbnMoJ2FjdGl2ZScpKSB7XG4gICAgICB0aGlzLmFjdGl2ZSA9IGZhbHNlO1xuICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG4gICAgICB0aGlzLnRyYWNrRWwuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYWN0aXZlID0gdHJ1ZTtcbiAgICAgIGVsLmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuICAgICAgdGhpcy50cmFja0VsLmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuICAgIH1cbiAgfS5iaW5kKHRoaXMpKTtcblxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuc2VsZWN0YWJsZS5mb3JFYWNoKGZ1bmN0aW9uKHdhdmUpIHtcbiAgICB3YXZlLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZXYpIHtcbiAgICAgIGlmICh0aGlzLnBsYXlpbmcpIHJldHVybjtcbiAgICAgIHRoaXMuY3Vyc29yLnN0eWxlLmxlZnQgPSB0aGlzLnBlcmNlbnRGcm9tQ2xpY2soZXYpK1wiJVwiO1xuICAgIH0uYmluZChzZWxmKSk7XG5cbiAgICB3YXZlLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZXYpIHtcbiAgICAgIGlmICh0aGlzLnBsYXlpbmcpIHJldHVybjtcbiAgICAgIHRoaXMuY3Vyc29yLnN0eWxlLmxlZnQgPSB0aGlzLnBlcmNlbnRGcm9tQ2xpY2soZXYpK1wiJVwiO1xuICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICB3YXZlLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGZ1bmN0aW9uKGV2KSB7XG4gICAgICBpZiAodGhpcy5wbGF5aW5nKSByZXR1cm47XG4gICAgICBpZiAoIXRoaXMubW92aW5nKSB7XG4gICAgICAgIHZhciBsZWZ0UGVyY2VudCA9IHRoaXMucGVyY2VudEZyb21DbGljayhldikgKyAnJSc7XG5cbiAgICAgICAgaWYgKHRoaXMuc2VsZWN0aW5nKSB7XG4gICAgICAgICAgdGhpcy5zZWxlY3Rpb24uc3R5bGUubGVmdCA9IGxlZnRQZXJjZW50O1xuICAgICAgICAgIHRoaXMuc2VsZWN0aW9uLnN0eWxlLndpZHRoID0gMDtcbiAgICAgICAgICB0aGlzLm1vdmluZyA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmN1cnNvci5zdHlsZS5sZWZ0ID0gbGVmdFBlcmNlbnQ7XG4gICAgICAgIHRoaXMuY2xpcGJvYXJkLmF0ID0gdGhpcy5nZXRPZmZzZXRGcm9tUGVyY2VudChsZWZ0UGVyY2VudC5yZXBsYWNlKCclJywgJycpKTtcbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcykpO1xuXG4gICAgd2F2ZS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBmdW5jdGlvbihldikge1xuICAgICAgaWYgKCF0aGlzLm1vdmluZyB8fCAhdGhpcy5zZWxlY3RpbmcpIHJldHVybjtcbiAgICAgIHZhciBsZWZ0UGVyY2VudCA9IHRoaXMuZ2V0UGVyY2VudEZyb21DdXJzb3IoKTtcbiAgICAgIHZhciByaWdodFBlcmNlbnQgPSB0aGlzLnBlcmNlbnRGcm9tQ2xpY2soZXYpO1xuICAgICAgdmFyIGRpZmYgPSByaWdodFBlcmNlbnQgLSBsZWZ0UGVyY2VudDtcblxuICAgICAgaWYgKGRpZmYgPiAwKSB7XG4gICAgICAgIGRpZmYgKz0gJyUnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5jdXJzb3Iuc3R5bGUubGVmdCA9IHJpZ2h0UGVyY2VudCArJyUnO1xuICAgICAgICBkaWZmID0gbGVmdFBlcmNlbnQgLSByaWdodFBlcmNlbnQ7XG4gICAgICAgIGlmIChkaWZmID4gMCkge1xuICAgICAgICAgIGRpZmYgKz0nJSc7XG4gICAgICAgIH0gZWxzZSBkaWZmID0gMDtcbiAgICAgIH1cblxuICAgICAgdGhpcy5zZWxlY3Rpb24uc3R5bGUud2lkdGggPSBkaWZmO1xuICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgfSwgdGhpcyk7XG5cbiAgLy8gdGhpcy5zZWxlY3Rpb24uYWRkRXZlbnRMaXN0ZW5lcignbW91c2VvdXQnLCBmdW5jdGlvbihldikge1xuICAvLyAgIHZhciBsZWZ0UGVyY2VudCA9IHRoaXMuZ2V0UGVyY2VudEZyb21DdXJzb3IoKTtcbiAgLy8gICB2YXIgcmlnaHRQZXJjZW50ID0gdGhpcy5wZXJjZW50RnJvbUNsaWNrKGV2KTtcbiAgLy8gICB0aGlzLmNsaXBib2FyZC5zdGFydCA9IHRoaXMuZ2V0T2Zmc2V0RnJvbVBlcmNlbnQobGVmdFBlcmNlbnQpO1xuICAvLyAgIHRoaXMuY2xpcGJvYXJkLmVuZCA9IHRoaXMuZ2V0T2Zmc2V0RnJvbVBlcmNlbnQocmlnaHRQZXJjZW50KTtcbiAgLy8gICB0aGlzLm1vdmluZyA9IGZhbHNlO1xuICAvLyB9LmJpbmQodGhpcykpO1xuXG4gIHRoaXMuc2VsZWN0aW9uLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBmdW5jdGlvbihldikge1xuICAgIGlmICghdGhpcy5zZWxlY3RpbmcpIHJldHVybjtcbiAgICB2YXIgbGVmdFBlcmNlbnQgPSB0aGlzLmdldFBlcmNlbnRGcm9tQ3Vyc29yKCk7XG4gICAgdmFyIHJpZ2h0UGVyY2VudCA9IHRoaXMucGVyY2VudEZyb21DbGljayhldik7XG4gICAgdGhpcy5jbGlwYm9hcmQuc3RhcnQgPSB0aGlzLmdldE9mZnNldEZyb21QZXJjZW50KGxlZnRQZXJjZW50KTtcbiAgICB0aGlzLmNsaXBib2FyZC5lbmQgPSB0aGlzLmNsaXBib2FyZC5zdGFydCArIHRoaXMuZ2V0T2Zmc2V0RnJvbVBlcmNlbnQocmlnaHRQZXJjZW50KTtcbiAgICB0aGlzLm1vdmluZyA9IGZhbHNlO1xuICB9LmJpbmQodGhpcykpO1xuXG4gIHRoaXMuY29udHJvbEVsLnF1ZXJ5U2VsZWN0b3IoJy5tdXRlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihldikge1xuICAgIHZhciBlbCA9IGV2LnRhcmdldDtcblxuICAgIGlmIChlbC5jbGFzc0xpc3QuY29udGFpbnMoJ2FjdGl2ZScpKSB7XG4gICAgICB0aGlzLmdhaW5Ob2RlLmdhaW4udmFsdWUgPSB0aGlzLmxhc3RHYWluVmFsdWU7XG4gICAgICB0aGlzLmdhaW5FbC52YWx1ZSA9IHRoaXMubGFzdEdhaW5WYWx1ZTtcbiAgICAgIGVsLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmxhc3RHYWluVmFsdWUgPSB0aGlzLmdhaW5Ob2RlLmdhaW4udmFsdWU7XG4gICAgICB0aGlzLmdhaW5Ob2RlLmdhaW4udmFsdWUgPSAwO1xuICAgICAgdGhpcy5nYWluRWwudmFsdWUgPSAwO1xuICAgICAgZWwuY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG4gICAgfVxuICB9LmJpbmQodGhpcykpO1xuXG4gIHRoaXMuY29udHJvbEVsLnF1ZXJ5U2VsZWN0b3IoJy5lZGl0JykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihldikge1xuICAgIHZhciBlbCA9IGV2LnRhcmdldDtcbiAgICBpZiAoZWwuY2xhc3NMaXN0LmNvbnRhaW5zKCdhY3RpdmUnKSkge1xuICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG4gICAgICB0aGlzLnNlbGVjdGluZyA9IGZhbHNlO1xuICAgICAgdGhpcy5zZWxlY3Rpb24uc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICB9IGVsc2Uge1xuICAgICAgZWwuY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG4gICAgICB0aGlzLnNlbGVjdGluZyA9IHRydWU7XG4gICAgICB0aGlzLnNlbGVjdGlvbi5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcbiAgICB9XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgdGhpcy5jb250cm9sRWwucXVlcnlTZWxlY3RvcignLmNvbGxhcHNlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihldikge1xuICAgIHZhciBlbCA9IGV2LnRhcmdldDtcbiAgICBpZiAoZWwuY2xhc3NMaXN0LmNvbnRhaW5zKCdhY3RpdmUnKSkge1xuICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG4gICAgICB0aGlzLnRyYWNrRWwuY2xhc3NMaXN0LmFkZCgnY29sbGFwc2VkJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsLmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpXG4gICAgICB0aGlzLnRyYWNrRWwuY2xhc3NMaXN0LnJlbW92ZSgnY29sbGFwc2VkJyk7XG4gICAgfVxuICB9LmJpbmQodGhpcykpO1xuXG4gIGZ1bmN0aW9uIHBsYXlMaXN0ZW4gKGV2KSB7XG4gICAgaWYgKHRoaXMuYWN0aXZlKSB0aGlzLnBsYXkoKTtcbiAgfVxuXG4gIHRoaXMuZW1pdHRlci5vbigndHJhY2tzOnBsYXknLCBwbGF5TGlzdGVuLmJpbmQodGhpcykpO1xuXG4gIGZ1bmN0aW9uIHBhdXNlTGlzdGVuKGV2KSB7XG4gICAgaWYgKHRoaXMuYWN0aXZlKSB0aGlzLnBhdXNlKCk7XG4gIH1cblxuICB0aGlzLmVtaXR0ZXIub24oJ3RyYWNrczpwYXVzZScsIHBhdXNlTGlzdGVuLmJpbmQodGhpcykpO1xuXG4gIGZ1bmN0aW9uIHN0b3BMaXN0ZW4oZXYpIHtcbiAgICBpZiAodGhpcy5hY3RpdmUpIHtcbiAgICAgIHRoaXMuc3RvcCgpO1xuICAgICAgdGhpcy5yZXNldFByb2dyZXNzKCk7XG4gICAgfVxuICB9XG5cbiAgdGhpcy5lbWl0dGVyLm9uKCd0cmFja3M6c3RvcCcsIHN0b3BMaXN0ZW4uYmluZCh0aGlzKSk7XG5cbiAgdGhpcy5jb250cm9sRWwucXVlcnlTZWxlY3RvcignLnJlbW92ZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZXYpIHtcbiAgICB0aGlzLnN0b3AoKTtcbiAgICB0aGlzLmNvbnRyb2xFbC5yZW1vdmUoKTtcbiAgICB0aGlzLnRyYWNrRWwucmVtb3ZlKCk7XG4gICAgdGhpcy5lbWl0dGVyLmVtaXQoJ3RyYWNrczpyZW1vdmUnLCB7aWQ6IHRoaXMuaWR9KTtcbiAgICB0aGlzLmVtaXR0ZXIgPSBudWxsO1xuICB9LmJpbmQodGhpcykpO1xufVxuXG5UcmFjay5wcm90b3R5cGUgPSB7XG4gIHBsYXk6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMubGFzdFBsYXkgPSB0aGlzLmNvbnRleHQuY3VycmVudFRpbWU7XG4gICAgdGhpcy5wbGF5VHJhY2sodGhpcy5zdGFydE9mZnNldCAlIHRoaXMuYXVkaW9zb3VyY2UuYnVmZmVyLmR1cmF0aW9uKTtcbiAgICB0aGlzLnNldEN1cnNvclZpZXdJbnRlcnZhbCgpO1xuICB9LFxuICBzZXRDdXJzb3JWaWV3SW50ZXJ2YWw6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmN1cnNvclZpZXdJbnRlcnZhbCkge1xuICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLmN1cnNvclZpZXdJbnRlcnZhbCk7XG4gICAgfVxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmN1cnNvclZpZXdJbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmN1cnNvci5zY3JvbGxJbnRvVmlld0lmTmVlZGVkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCAyMDApO1xuICB9LFxuICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuXG4gIH0sXG4gIHBlcmNlbnRGcm9tQ2xpY2s6IGZ1bmN0aW9uKGV2KSB7XG4gICAgdmFyIHggPSBldi5vZmZzZXRYIHx8IGV2LmxheWVyWDtcbiAgICByZXR1cm4gKHggLyB0aGlzLndhdmUub2Zmc2V0V2lkdGgpICogMTAwO1xuICB9LFxuICBnZXRQZXJjZW50RnJvbUN1cnNvcjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIChwYXJzZUZsb2F0KHRoaXMuY3Vyc29yLnN0eWxlLmxlZnQucmVwbGFjZSgncHgnLCAnJykpIC8gdGhpcy53YXZlLm9mZnNldFdpZHRoKSAqIDEwMDtcbiAgfSxcbiAgZ2V0T2Zmc2V0RnJvbVBlcmNlbnQ6IGZ1bmN0aW9uKHBlcmNlbnQpIHtcbiAgICBpZiAocGVyY2VudCA9PT0gMCkgcmV0dXJuIDA7XG4gICAgdmFyIGludGVyID0gdGhpcy5hdWRpb3NvdXJjZS5idWZmZXIuZHVyYXRpb24gLyAxMDA7XG4gICAgcmV0dXJuIGludGVyICogcGVyY2VudDtcbiAgfSxcbiAgc3RvcDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5zdGFydE9mZnNldCA9IDA7XG4gICAgdGhpcy5sYXN0UGxheSA9IDA7XG4gICAgY2xlYXJJbnRlcnZhbCh0aGlzLmN1cnNvclZpZXdJbnRlcnZhbCk7XG4gICAgaWYgKHRoaXMuYXVkaW9zb3VyY2Uuc291cmNlKSB0aGlzLmF1ZGlvc291cmNlLnN0b3AoKTtcbiAgfSxcbiAgcmVzZXRQcm9ncmVzczogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5wcm9ncmVzc1dhdmUuc3R5bGUud2lkdGggPSBcIjAlXCI7XG4gICAgdGhpcy5jdXJzb3Iuc3R5bGUubGVmdCA9IFwiMCVcIjtcbiAgfSxcbiAgcGF1c2U6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuYXVkaW9zb3VyY2Uuc3RvcCgpO1xuICAgIHRoaXMuc3RhcnRPZmZzZXQgKz0gdGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5sYXN0UGxheTtcbiAgICB0aGlzLnBsYXlpbmcgPSBmYWxzZTtcbiAgfSxcbiAgc2tpcEZvcndhcmQ6IGZ1bmN0aW9uKCkge30sXG4gIHNraXBCYWNrd2FyZDogZnVuY3Rpb24oKSB7fSxcbiAgdXBkYXRlUHJvZ3Jlc3M6IGZ1bmN0aW9uKHBlcmNlbnQpIHtcbiAgICB0aGlzLnByb2dyZXNzV2F2ZS5zdHlsZS53aWR0aCA9IHBlcmNlbnQrXCIlXCI7XG4gICAgdGhpcy5jdXJzb3Iuc3R5bGUubGVmdCA9IHBlcmNlbnQrXCIlXCI7XG4gIH0sXG4gIHBsYXlUcmFjazogZnVuY3Rpb24ob2Zmc2V0LCBzdG9wT2Zmc2V0KSB7XG4gICAgaWYgKHRoaXMucGxheWluZykgdGhpcy5hdWRpb3NvdXJjZS5zdG9wKCk7XG4gICAgdGhpcy5hdWRpb3NvdXJjZS5wbGF5KDAsIG9mZnNldCk7XG4gICAgdGhpcy5hdWRpb3NvdXJjZS5wbGF5KDAsIG9mZnNldCk7XG4gICAgdGhpcy5wbGF5aW5nID0gdHJ1ZTtcbiAgICByYWYodGhpcy50cmlnZ2VyUGxheWluZy5iaW5kKHRoaXMpKTtcbiAgfSxcbiAgdXBkYXRlVmlzdWFsUHJvZ3Jlc3M6IGZ1bmN0aW9uIChwb3MpIHtcbiAgICB0aGlzLnByb2dyZXNzV2F2ZS5zdHlsZS53aWR0aCA9IHBvcytcInB4XCI7XG4gICAgdGhpcy5jdXJzb3Iuc3R5bGUubGVmdCA9ICgyMStwb3MpK1wicHhcIjsgLy8gMjEgaXMgdGhlIHBhZGRpbmctbGVmdCBmcm9tIGJlZ2lubmluZyBvZiB0cmFjayBlbGVtZW50XG4gIH0sXG4gIHRyaWdnZXJQbGF5aW5nOiBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMucGxheWluZykgcmV0dXJuO1xuXG4gICAgdmFyIGR1ciA9IHRoaXMuYXVkaW9zb3VyY2UuYnVmZmVyLmR1cmF0aW9uO1xuICAgIHZhciBjdXJyZW50VGltZSA9IHRoaXMuY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMubGFzdFBsYXkgKyB0aGlzLnN0YXJ0T2Zmc2V0O1xuICAgIHZhciByZW1haW5pbmdUaW1lID0gZHVyIC0gY3VycmVudFRpbWU7XG5cbiAgICAvLyB0aGlzIGlzIHRoZSBzYW1lIHdheSB3ZSBhcmUgY2FjdWxhdGluZyB0aGUgd2lkdGggb2YgdGhlIHdhdmVzXG4gICAgLy8gdG8gbWF0Y2ggdXAgdG8gdGhlIHRpbWVsaW5lXG4gICAgdGhpcy51cGRhdGVWaXN1YWxQcm9ncmVzcygoKGN1cnJlbnRUaW1lKSAvIDUpICogMTAwKTtcblxuICAgIHRoaXMuY3VycmVudFRpbWVFbC50ZXh0Q29udGVudCA9IGZvcm1hdFRpbWUoY3VycmVudFRpbWUsIHRydWUpO1xuICAgIHRoaXMucmVtYWluaW5nRWwudGV4dENvbnRlbnQgPSBmb3JtYXRUaW1lKHJlbWFpbmluZ1RpbWUsIHRydWUpO1xuXG4gICAgaWYgKHJlbWFpbmluZ1RpbWUgPD0gMCkge1xuICAgICAgdGhpcy5wbGF5aW5nID0gIXRoaXMucGxheWluZztcbiAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5jdXJzb3JWaWV3SW50ZXJ2YWwpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByYWYodGhpcy50cmlnZ2VyUGxheWluZy5iaW5kKHRoaXMpKTtcbiAgfSxcbiAgY3VycmVudFRpbWVUb1BlcmNlbnQ6IGZ1bmN0aW9uIChjdXJyZW50VGltZSkge1xuICAgIHZhciBkdXIgPSB0aGlzLmF1ZGlvc291cmNlLmJ1ZmZlci5kdXJhdGlvbjtcbiAgICB2YXIgY3VyID0gKGN1cnJlbnRUaW1lIC0gdGhpcy5sYXN0UGxheSArIHRoaXMuc3RhcnRPZmZzZXQgJSA2MCkgKiAxMDtcbiAgICByZXR1cm4gKChjdXIgLyBkdXIpICogMTApLnRvRml4ZWQoMyk7XG4gIH0sXG4gIHJlc2V0VmlzdWFsOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgY3R4ID0gdGhpcy53YXZlLmdldENvbnRleHQoJzJkJyk7XG4gICAgY3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLndhdmUud2lkdGgsIHRoaXMud2F2ZS5oZWlnaHQpO1xuICAgIGN0eCA9IHRoaXMucHJvZ3Jlc3NXYXZlLnF1ZXJ5U2VsZWN0b3IoJ2NhbnZhcycpLmdldENvbnRleHQoJzJkJyk7XG4gICAgY3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLndhdmUud2lkdGgsIHRoaXMud2F2ZS5oZWlnaHQpO1xuICB9LFxuICBsb2FkV2l0aEF1ZGlvQnVmZmVyOiBmdW5jdGlvbihhdWRpb0J1ZmZlcikge1xuICAgIHRoaXMuZ2Fpbk5vZGUgPSB0aGlzLmNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIHRoaXMuYXVkaW9zb3VyY2UgPSBuZXcgQXVkaW9Tb3VyY2UodGhpcy5jb250ZXh0LCB7XG4gICAgICBnYWluTm9kZTogdGhpcy5nYWluTm9kZVxuICAgIH0pO1xuICAgIHRoaXMuZHJhd1dhdmVzKCk7XG4gIH0sXG4gIGxvYWRVUkw6IGZ1bmN0aW9uICh1cmwpIHtcbiAgICB0aGlzLmZpbGVJbmRpY2F0b3IudGV4dENvbnRlbnQgPSAnbG9hZGluZyBmaWxlIGZyb20gdXJsLi4uJztcblxuICAgIHZhciByZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICByZXEub3BlbignR0VUJywgdXJsLCB0cnVlKTtcbiAgICAgICAgcmVxLnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJlcS5vbmxvYWRlbmQgPSBmdW5jdGlvbihldikge1xuICAgICAgICAgICBzZWxmLmZpbGVJbmRpY2F0b3IudGV4dENvbnRlbnQgPSAnZGVjb2RpbmcgYXVkaW8gZGF0YS4uLic7XG5cbiAgICAgICAgICAgc2VsZi5jb250ZXh0LmRlY29kZUF1ZGlvRGF0YShyZXEucmVzcG9uc2UsIGZ1bmN0aW9uKGJ1Zikge1xuICAgICAgICAgICBzZWxmLmZpbGVJbmRpY2F0b3IudGV4dENvbnRlbnQgPSAncmVuZGVyaW5nIHdhdmUuLi4nO1xuXG4gICAgICAgICAgIHNlbGYuZ2Fpbk5vZGUgPSBzZWxmLmNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgICAgICAgICBzZWxmLmF1ZGlvc291cmNlID0gbmV3IEF1ZGlvU291cmNlKHNlbGYuY29udGV4dCwge1xuICAgICAgICAgICAgIGdhaW5Ob2RlOiBzZWxmLmdhaW5Ob2RlXG4gICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgIHNlbGYuZHVyYXRpb25FbC50ZXh0Q29udGVudCA9IGZvcm1hdFRpbWUoYnVmLmR1cmF0aW9uLCB0cnVlKTtcblxuICAgICAgICAgICBzZWxmLmF1ZGlvc291cmNlLmJ1ZmZlciA9IGJ1ZjtcblxuICAgICAgICAgICBzZWxmLmFkanVzdFdhdmUoKTtcbiAgICAgICAgICAgZHJhd0J1ZmZlcihzZWxmLndhdmUsIGJ1ZiwgJyM1MkY2QTQnKTtcbiAgICAgICAgICAgZHJhd0J1ZmZlcihzZWxmLnByb2dyZXNzV2F2ZS5xdWVyeVNlbGVjdG9yKCdjYW52YXMnKSwgYnVmLCAnI0Y0NDVGMCcpO1xuICAgICAgICAgICBzZWxmLmZpbGVJbmRpY2F0b3IucmVtb3ZlKCk7XG4gICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmVxLnNlbmQoKTtcbiAgfSxcbiAgbG9hZEZpbGU6IGZ1bmN0aW9uIChmaWxlKSB7XG4gICAgdGhpcy5maWxlSW5kaWNhdG9yLnRleHRDb250ZW50ID0gJ2xvYWRpbmcgZmlsZS4uLic7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgcmVhZGVyLm9ubG9hZGVuZCA9IGZ1bmN0aW9uKGV2KSB7XG4gICAgICBzZWxmLmZpbGVJbmRpY2F0b3IudGV4dENvbnRlbnQgPSAnZGVjb2RpbmcgYXVkaW8gZGF0YS4uLic7XG5cbiAgICAgIHNlbGYuY29udGV4dC5kZWNvZGVBdWRpb0RhdGEoZXYudGFyZ2V0LnJlc3VsdCwgZnVuY3Rpb24oYnVmKSB7XG4gICAgICAgIHNlbGYuZmlsZUluZGljYXRvci50ZXh0Q29udGVudCA9ICdyZW5kZXJpbmcgd2F2ZS4uLic7XG5cbiAgICAgICAgc2VsZi5nYWluTm9kZSA9IHNlbGYuY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgIHNlbGYuYXVkaW9zb3VyY2UgPSBuZXcgQXVkaW9Tb3VyY2Uoc2VsZi5jb250ZXh0LCB7XG4gICAgICAgICAgZ2Fpbk5vZGU6IHNlbGYuZ2Fpbk5vZGVcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2VsZi5kdXJhdGlvbkVsLnRleHRDb250ZW50ID0gZm9ybWF0VGltZShidWYuZHVyYXRpb24sIHRydWUpO1xuXG4gICAgICAgIHNlbGYuYXVkaW9zb3VyY2UuYnVmZmVyID0gYnVmO1xuXG4gICAgICAgIHNlbGYuYWRqdXN0V2F2ZSgpO1xuICAgICAgICBkcmF3QnVmZmVyKHNlbGYud2F2ZSwgYnVmLCAnIzUyRjZBNCcpO1xuICAgICAgICBkcmF3QnVmZmVyKHNlbGYucHJvZ3Jlc3NXYXZlLnF1ZXJ5U2VsZWN0b3IoJ2NhbnZhcycpLCBidWYsICcjRjQ0NUYwJyk7XG4gICAgICAgIHNlbGYuZmlsZUluZGljYXRvci5yZW1vdmUoKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoZmlsZSk7XG4gIH0sXG4gIGFkanVzdFdhdmU6IGZ1bmN0aW9uKCkge1xuICAgIHRpbWVsaW5lTWFuYWdlLnVwZGF0ZSh0aGlzLmF1ZGlvc291cmNlLmJ1ZmZlci5kdXJhdGlvbik7XG4gICAgLy8gYWRqdXN0IHRoZSBjYW52YXMgYW5kIGNvbnRhaW5lcnMgdG8gZml0IHdpdGggdGhlIGJ1ZmZlciBkdXJhdGlvblxuICAgIHZhciB3ID0gKHRoaXMuYXVkaW9zb3VyY2UuYnVmZmVyLmR1cmF0aW9uIC8gNSkgKiAxMDA7XG4gICAgdGhpcy53YXZlLndpZHRoID0gdztcbiAgICB0aGlzLnByb2dyZXNzV2F2ZS5xdWVyeVNlbGVjdG9yKCdjYW52YXMnKS53aWR0aCA9IHc7XG4gIH0sXG4gIGRyYXdXYXZlczogZnVuY3Rpb24oKSB7XG4gICAgdGltZWxpbmVNYW5hZ2UudXBkYXRlKHRoaXMuYXVkaW9zb3VyY2UuYnVmZmVyLmR1cmF0aW9uKTtcbiAgICB2YXIgcHJldkxlZnQgPSAwO1xuICAgIGlmICh0aGlzLmN1cnNvci5zdHlsZS5sZWZ0KSB7XG4gICAgICBwcmV2TGVmdCA9IHBhcnNlRmxvYXQodGhpcy5jdXJzb3Iuc3R5bGUubGVmdC5yZXBsYWNlKCclJywgJycpKTtcbiAgICB9XG4gICAgdGhpcy5yZXNldFZpc3VhbCgpO1xuICAgIGRyYXdCdWZmZXIodGhpcy53YXZlLCB0aGlzLmF1ZGlvc291cmNlLmJ1ZmZlciwgJyM1MkY2QTQnKTtcbiAgICBkcmF3QnVmZmVyKHRoaXMucHJvZ3Jlc3NXYXZlLnF1ZXJ5U2VsZWN0b3IoJ2NhbnZhcycpLCB0aGlzLmF1ZGlvc291cmNlLmJ1ZmZlciwgJyNGNDQ1RjAnKTtcbiAgICBjb25zb2xlLmxvZygnd2F2ZXMgdXBkYXRlZC4nKVxuICB9XG59IiwidmFyIEVFID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xudmFyIGRyYWdEcm9wID0gcmVxdWlyZSgnZHJhZy1kcm9wJyk7XG52YXIgQXVkaW9Db250ZXh0ID0gcmVxdWlyZSgnYXVkaW9jb250ZXh0Jyk7XG52YXIgQXVkaW9Tb3VyY2UgPSByZXF1aXJlKCdhdWRpb3NvdXJjZScpO1xudmFyIEZGVCA9IHJlcXVpcmUoJ2F1ZGlvLWZmdCcpO1xuXG4vLyB2YXIgY29sb3JzID0gcmVxdWlyZSgnLi9saWIvY29sb3JzJyk7XG52YXIgZWRpdG9yID0gcmVxdWlyZSgnLi9saWIvZWRpdHMnKTtcbnZhciByZWNvcmRlciA9IHJlcXVpcmUoJy4vbGliL3JlY29yZCcpO1xudmFyIFRyYWNrID0gcmVxdWlyZSgnLi9saWIvdHJhY2snKTtcblxudmFyIHRyYWNrVG1wID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3RyYWNrLXRtcCcpO1xudmFyIGNvbnRyb2xUbXAgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvY29udHJvbC10bXAnKTtcblxuLy8gdmFyIGVtaXR0ZXIgPSBuZXcgRUUoKTtcbnZhciBhdWRpb0NvbnRleHQgPSBuZXcgQXVkaW9Db250ZXh0KCk7XG52YXIgbWFzdGVyR2Fpbk5vZGUgPSBhdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xudmFyIHVuaXFJZCA9IGZ1bmN0aW9uKCkge3JldHVybiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDE2KS5zbGljZSgyKX07XG5cbnZhciBkcmF3ZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuZHJhd2VyJyk7XG52YXIgZmZ0ID0gbmV3IEZGVChhdWRpb0NvbnRleHQsIHtjYW52YXM6IGRyYXdlci5xdWVyeVNlbGVjdG9yKCcjZmZ0Jyl9KTtcblxudmFyIGNvbnRyb2xTcGFjZUVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmNvbnRyb2wtc3BhY2UnKTtcbnZhciB3b3Jrc3BhY2VFbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyN3b3Jrc3BhY2UnKTtcbnZhciB0cmFja1NwYWNlRWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcudHJhY2stc3BhY2UnKTtcblxuLy8gY29udHJvbHNcbnZhciB3ZWxjb21lID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLndlbGNvbWUnKTtcbnZhciB3ZWxjb21lSW1wb3J0QnRuID0gd2VsY29tZS5xdWVyeVNlbGVjdG9yKCcuaW1wb3J0Jyk7XG52YXIgd2VsY29tZVJlY29yZEJ0biA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5yZWNvcmQnKTtcbnZhciBpbXBvcnRCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuaW1wb3J0Jyk7XG52YXIgaW1wb3J0SW5wdXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjaW1wb3J0Jyk7XG52YXIgcGxheUJ0biA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNwbGF5Jyk7XG52YXIgcGF1c2VCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcGF1c2UnKTtcbnZhciBzdG9wQnRuID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3N0b3AnKTtcbnZhciBjdXRCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjY3V0Jyk7XG52YXIgY29weUJ0biA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNjb3B5Jyk7XG52YXIgcGFzdGVCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcGFzdGUnKTtcbnZhciBwcmVwZW5kQnRuID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3ByZXBlbmQnKTtcbnZhciBhcHBlbmRCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjYXBwZW5kJyk7XG52YXIgZHVwbGljYXRlQnRuID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2R1cGxpY2F0ZScpO1xudmFyIHJldmVyc2VCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcmV2ZXJzZScpO1xudmFyIHJlbW92ZUJ0biA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNyZW1vdmUnKTtcbnZhciByZWNvcmRCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcmVjb3JkJyk7XG52YXIgdHJhY2tzID0ge307XG5cbnZhciByZWNvcmRpbmcgPSBmYWxzZTtcblxucmVjb3JkQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gIGlmICghcmVjb3JkaW5nKSB7XG4gICAgcmVjb3JkZXIuc3RhcnQoYXVkaW9Db250ZXh0LCBmZnQpO1xuICAgIHJlY29yZEJ0bi5pbm5lclRleHQgPSAnc3RvcCByZWNvcmRpbmcnO1xuICAgIGRyYXdlci5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtcbiAgICByZWNvcmRpbmcgPSB0cnVlO1xuICB9IGVsc2Uge1xuICAgIGRyYXdlci5jbGFzc0xpc3QucmVtb3ZlKCdhY3RpdmUnKTtcbiAgICByZWNvcmRCdG4uaW5uZXJUZXh0ID0gJ3JlY29yZCc7XG4gICAgcmVjb3JkZXIuc3RvcChmdW5jdGlvbihibG9iKSB7XG4gICAgICAgICAgICAgICBuZXdUcmFja0Zyb21VUkwoVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKSk7XG4gICAgICAgICAgICAgfSk7XG4gICAgcmVjb3JkaW5nID0gZmFsc2U7XG4gIH1cbn0pXG5cbmRyYWdEcm9wKCdib2R5JywgZnVuY3Rpb24gKGZpbGVzKSB7XG4gIHdlbGNvbWUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgbmV3VHJhY2tGcm9tRmlsZShmaWxlc1swXSk7XG59KTtcblxud2VsY29tZUltcG9ydEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjaW1wb3J0JykuY2xpY2soKTtcbn0pXG5cbndlbGNvbWVSZWNvcmRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgd2VsY29tZVJlY29yZEJ0bi5xdWVyeVNlbGVjdG9yKCdoNCcpLmlubmVyVGV4dCA9ICdzdG9wIHJlY29yZGluZyc7XG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNyZWNvcmQnKS5jbGljaygpO1xufSlcblxuaW1wb3J0QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNpbXBvcnQnKS5jbGljaygpO1xufSlcblxuaW1wb3J0SW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3Rpb24oZXYpIHtcbiAgbmV3VHJhY2tGcm9tRmlsZShldi50YXJnZXQuZmlsZXNbMF0pO1xufSk7XG5cbnBsYXlCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgT2JqZWN0LmtleXModHJhY2tzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIHRyYWNrc1trZXldLmVtaXR0ZXIuZW1pdCgndHJhY2tzOnBsYXknLCB7fSk7XG4gIH0pO1xufSk7XG5cbnBhdXNlQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gIE9iamVjdC5rZXlzKHRyYWNrcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICB0cmFja3Nba2V5XS5lbWl0dGVyLmVtaXQoJ3RyYWNrczpwYXVzZScsIHt9KTtcbiAgfSk7XG59KTtcblxuc3RvcEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICBPYmplY3Qua2V5cyh0cmFja3MpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgdHJhY2tzW2tleV0uZW1pdHRlci5lbWl0KCd0cmFja3M6c3RvcCcsIHt9KTtcbiAgfSk7XG59KTtcblxuZnVuY3Rpb24gc2hvd1Bhc3RlQ3Vyc29ycygpIHtcbiAgdmFyIHNlbGVjdGlvbnMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuc2VsZWN0aW9uJyk7XG4gIGZvciAodmFyIGk9MDsgaSA8IHNlbGVjdGlvbnM7IGkrKykge1xuICAgIHNlbGVjdGlvbnNbaV0uc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgfVxuICB2YXIgcGFzdGVDdXJzb3JzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnBhc3RlLWN1cnNvcicpO1xuICBmb3IgKHZhciBpPTA7IGkgPCBwYXN0ZUN1cnNvcnM7IGkrKykge1xuICAgIHBhc3RlQ3Vyc29yc1tpXS5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcbiAgfVxufVxuXG5mdW5jdGlvbiBoaWRlUGFzdGVDdXJzb3JzKCkge1xuICB2YXIgc2VsZWN0aW9ucyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5zZWxlY3Rpb24nKTtcbiAgZm9yICh2YXIgaT0wOyBpIDwgc2VsZWN0aW9uczsgaSsrKSB7XG4gICAgc2VsZWN0aW9uc1tpXS5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcbiAgfVxuICB2YXIgcGFzdGVDdXJzb3JzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnBhc3RlLWN1cnNvcicpO1xuICBmb3IgKHZhciBpPTA7IGkgPCBwYXN0ZUN1cnNvcnM7IGkrKykge1xuICAgIHBhc3RlQ3Vyc29yc1tpXS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICB9XG59XG5cbmZ1bmN0aW9uIGVuYWJsZVBsYXliYWNrT3B0cygpIHtcbiAgcGxheUJ0bi5kaXNhYmxlZCA9IGZhbHNlO1xuICBjb3B5QnRuLmRpc2FibGVkID0gZmFsc2U7XG4gIGN1dEJ0bi5kaXNhYmxlZCA9IGZhbHNlO1xuICBzdG9wQnRuLmRpc2FibGVkID0gZmFsc2U7XG4gIHBhdXNlQnRuLmRpc2FibGVkID0gZmFsc2U7XG4gIHJldmVyc2VCdG4uZGlzYWJsZWQgPSBmYWxzZTtcbn1cblxuZnVuY3Rpb24gZW5hYmxlQ2xpcGJvYXJkT3B0cygpIHtcbiAgcHJlcGVuZEJ0bi5kaXNhYmxlZCA9IGZhbHNlO1xuICBhcHBlbmRCdG4uZGlzYWJsZWQgPSBmYWxzZTtcbiAgcGFzdGVCdG4uZGlzYWJsZWQgPSBmYWxzZTtcbiAgZHVwbGljYXRlQnRuLmRpc2FibGVkID0gZmFsc2U7XG59XG5cbmNvcHlCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgdmFyIGFjdGl2ZVRyYWNrID0gZ2V0QWN0aXZlVHJhY2soKTtcbiAgaWYgKCFhY3RpdmVUcmFjaykgcmV0dXJuO1xuXG4gIHZhciBvbkNvbXBsZXRlID0gZnVuY3Rpb24oKSB7XG4gICAgY29uc29sZS5sb2coJ2NvcHkgYnVmZmVyIGNvbXBsZXRlOiAnLCBhY3RpdmVUcmFjay5jbGlwYm9hcmQuYnVmZmVyKTtcbiAgfTtcblxuICBzaG93UGFzdGVDdXJzb3JzKCk7XG4gIGVuYWJsZUNsaXBib2FyZE9wdHMoKTtcbiAgZWRpdG9yLmNvcHkoYXVkaW9Db250ZXh0LCBhY3RpdmVUcmFjay5jbGlwYm9hcmQsIGFjdGl2ZVRyYWNrLmF1ZGlvc291cmNlLmJ1ZmZlciwgb25Db21wbGV0ZSk7XG59KTtcblxuY3V0QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gIHZhciBhY3RpdmVUcmFjayA9IGdldEFjdGl2ZVRyYWNrKCk7XG4gIGlmICghYWN0aXZlVHJhY2spIHJldHVybjtcblxuICB2YXIgb25Db21wbGV0ZSA9IGZ1bmN0aW9uKGJ1Zikge1xuICAgIGFjdGl2ZVRyYWNrLmF1ZGlvc291cmNlLmJ1ZmZlciA9IGJ1ZjtcbiAgICBhY3RpdmVUcmFjay5kcmF3V2F2ZXMoKTtcbiAgfTtcblxuICBhY3RpdmVUcmFjay5jbGlwYm9hcmQuc3RhcnQgPSBhY3RpdmVUcmFjay5jbGlwYm9hcmQuc3RhcnQgKyBhY3RpdmVUcmFjay5sYXN0UGxheTtcbiAgYWN0aXZlVHJhY2suY2xpcGJvYXJkLmVuZCA9IGFjdGl2ZVRyYWNrLmNsaXBib2FyZC5lbmQgKyBhY3RpdmVUcmFjay5sYXN0UGxheTtcblxuICBzaG93UGFzdGVDdXJzb3JzKCk7XG4gIGVuYWJsZUNsaXBib2FyZE9wdHMoKTtcbiAgZWRpdG9yLmN1dChhdWRpb0NvbnRleHQsIGFjdGl2ZVRyYWNrLmNsaXBib2FyZCwgYWN0aXZlVHJhY2suYXVkaW9zb3VyY2UuYnVmZmVyLCBvbkNvbXBsZXRlKTtcbn0pO1xuXG5wYXN0ZUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICB2YXIgYWN0aXZlVHJhY2sgPSBnZXRBY3RpdmVUcmFjaygpO1xuICBpZiAoIWFjdGl2ZVRyYWNrKSByZXR1cm47XG4gIHZhciBvbkNvbXBsZXRlID0gZnVuY3Rpb24oYnVmKSB7XG4gICAgYWN0aXZlVHJhY2suYXVkaW9zb3VyY2UuYnVmZmVyID0gYnVmO1xuICAgIGNvbnNvbGUubG9nKCdjYiBjYWxsZWQgcGFzdGUnKTtcbiAgICBhY3RpdmVUcmFjay5kcmF3V2F2ZXMoKTtcbiAgfTtcblxuICBlZGl0b3IucGFzdGUoYXVkaW9Db250ZXh0LCBhY3RpdmVUcmFjay5jbGlwYm9hcmQsIGFjdGl2ZVRyYWNrLmF1ZGlvc291cmNlLmJ1ZmZlciwgYWN0aXZlVHJhY2suY2xpcGJvYXJkLmF0LCBvbkNvbXBsZXRlKTtcbiAgaGlkZVBhc3RlQ3Vyc29ycygpO1xufSk7XG5cbnByZXBlbmRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgdmFyIGFjdGl2ZVRyYWNrID0gZ2V0QWN0aXZlVHJhY2soKTtcbiAgaWYgKCFhY3RpdmVUcmFjaykgcmV0dXJuO1xuICB2YXIgb25Db21wbGV0ZSA9IGZ1bmN0aW9uKGJ1Zikge1xuICAgIGFjdGl2ZVRyYWNrLmF1ZGlvc291cmNlLmJ1ZmZlciA9IGJ1ZjtcbiAgICBhY3RpdmVUcmFjay5kcmF3V2F2ZXMoKTtcbiAgfTtcblxuICBlZGl0b3IucGFzdGUoYXVkaW9Db250ZXh0LCBhY3RpdmVUcmFjay5jbGlwYm9hcmQsIGFjdGl2ZVRyYWNrLmF1ZGlvc291cmNlLmJ1ZmZlciwgMCwgb25Db21wbGV0ZSk7XG59KTtcblxuYXBwZW5kQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gIHZhciBhY3RpdmVUcmFjayA9IGdldEFjdGl2ZVRyYWNrKCk7XG4gIGlmICghYWN0aXZlVHJhY2spIHJldHVybjtcbiAgdmFyIG9uQ29tcGxldGUgPSBmdW5jdGlvbihidWYpIHtcbiAgICBhY3RpdmVUcmFjay5hdWRpb3NvdXJjZS5idWZmZXIgPSBidWY7XG4gICAgYWN0aXZlVHJhY2suZHJhd1dhdmVzKCk7XG4gIH07XG5cbiAgZWRpdG9yLnBhc3RlKGF1ZGlvQ29udGV4dCwgYWN0aXZlVHJhY2suY2xpcGJvYXJkLCBhY3RpdmVUcmFjay5hdWRpb3NvdXJjZS5idWZmZXIsIGFjdGl2ZVRyYWNrLmF1ZGlvc291cmNlLmJ1ZmZlci5kdXJhdGlvbiwgb25Db21wbGV0ZSk7XG59KTtcblxucmV2ZXJzZUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICB2YXIgYWN0aXZlVHJhY2sgPSBnZXRBY3RpdmVUcmFjaygpO1xuICBpZiAoIWFjdGl2ZVRyYWNrKSByZXR1cm47XG4gIHZhciBvbkNvbXBsZXRlID0gZnVuY3Rpb24oKSB7XG4gICAgYWN0aXZlVHJhY2suZHJhd1dhdmVzKCk7XG4gIH07XG5cbiAgZWRpdG9yLnJldmVyc2UoYWN0aXZlVHJhY2suYXVkaW9zb3VyY2UuYnVmZmVyLCBvbkNvbXBsZXRlKTtcbn0pO1xuXG5kdXBsaWNhdGVCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgdmFyIGFjdGl2ZVRyYWNrID0gZ2V0QWN0aXZlVHJhY2soKTtcbiAgaWYgKCFhY3RpdmVUcmFjaykgcmV0dXJuO1xuXG4gIHZhciBvbkNvbXBsZXRlID0gZnVuY3Rpb24oKSB7XG4gICAgY29uc29sZS5sb2coJ2R1cGxpY2F0aW5nIGJ1ZmZlcjogJywgYWN0aXZlVHJhY2suY2xpcGJvYXJkLmJ1ZmZlcik7XG4gICAgbmV3VHJhY2tGcm9tQXVkaW9CdWZmZXIoYWN0aXZlVHJhY2suY2xpcGJvYXJkLmJ1ZmZlcik7XG4gIH07XG5cbiAgaWYgKGFjdGl2ZVRyYWNrLmNsaXBib2FyZC5idWZmZXIpIHtcbiAgICBvbkNvbXBsZXRlKCk7XG4gIH0gZWxzZSBpZiAoYWN0aXZlVHJhY2suY2xpcGJvYXJkLnN0YXJ0ID09PSAwICYmIGFjdGl2ZVRyYWNrLmNsaXBib2FyZC5lbmQgPT09IDApIHtcbiAgICBhY3RpdmVUcmFjay5jbGlwYm9hcmQuZW5kID0gYWN0aXZlVHJhY2suYXVkaW9zb3VyY2UuYnVmZmVyLmR1cmF0aW9uO1xuICAgIGVkaXRvci5jb3B5KGF1ZGlvQ29udGV4dCwgYWN0aXZlVHJhY2suY2xpcGJvYXJkLCBhY3RpdmVUcmFjay5hdWRpb3NvdXJjZS5idWZmZXIsIG9uQ29tcGxldGUpO1xuICB9IGVsc2Uge1xuICAgIGVkaXRvci5jb3B5KGF1ZGlvQ29udGV4dCwgYWN0aXZlVHJhY2suY2xpcGJvYXJkLCBhY3RpdmVUcmFjay5hdWRpb3NvdXJjZS5idWZmZXIsIG9uQ29tcGxldGUpO1xuICB9XG59KTtcblxuZnVuY3Rpb24gZ2V0QWN0aXZlVHJhY2soKSB7XG4gIHZhciBhY3RpdmVUcmFja3MgPSBbXTtcbiAgT2JqZWN0LmtleXModHJhY2tzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmICh0cmFja3Nba2V5XS5hY3RpdmUpIGFjdGl2ZVRyYWNrcy5wdXNoKHRyYWNrc1trZXldKTtcbiAgfSk7XG5cbiAgaWYgKGFjdGl2ZVRyYWNrcy5sZW5ndGggPiAxKSB7XG4gICAgYWxlcnQoJ1lvdSBjYW5ub3QgaGF2ZSBtb3JlIHRoYW4gb25lIGFjdGl2YXRlZCB0cmFjayBmb3IgdGhpcyBvcHRpb24nKTtcbiAgfSBlbHNlIGlmKCFhY3RpdmVUcmFja3MubGVuZ3RoKSB7XG4gICAgYWxlcnQoJ1RoZXJlIGlzIG5vIGFjdGl2ZSB0cmFjaycpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBhY3RpdmVUcmFja3NbMF07XG4gIH1cbn1cblxuZnVuY3Rpb24gbmV3VHJhY2tGcm9tQXVkaW9CdWZmZXIoYXVkaW9CdWZmZXIpIHtcbiAgdmFyIGNvbnRhaW5lckVsID0gdHJhY2tUbXAoe1xuICAgIHRpdGxlOiBcIlRyYWNrIDFcIlxuICB9KTtcbiAgdmFyIGlkID0gdW5pcUlkKCk7XG4gIHdvcmtzcGFjZUVsLmFwcGVuZENoaWxkKGNvbnRhaW5lckVsKTtcbiAgdHJhY2tzW2lkXSA9IG5ldyBUcmFjayh7XG4gICAgaWQ6IGlkLFxuICAgIGNvbnRhaW5FbDogY29udGFpbmVyRWwsXG4gICAgY29udGV4dDogYXVkaW9Db250ZXh0LFxuICAgIGdhaW5Ob2RlOiBhdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpXG4gIH0pO1xuXG4gIHRyYWNrc1tpZF0uYXVkaW9zb3VyY2UgPSBuZXcgQXVkaW9Tb3VyY2UoYXVkaW9Db250ZXh0LCB7XG4gICAgZ2Fpbk5vZGU6IHRyYWNrc1tpZF0uZ2Fpbk5vZGVcbiAgfSk7XG5cbiAgdHJhY2tzW2lkXS5hdWRpb3NvdXJjZS5idWZmZXIgPSBhdWRpb0J1ZmZlcjtcblxuICB0cmFja3NbaWRdLmFkanVzdFdhdmUoKTtcbiAgdHJhY2tzW2lkXS5kcmF3V2F2ZXMoKTtcbiAgdHJhY2tzW2lkXS5maWxlSW5kaWNhdG9yLnJlbW92ZSgpO1xufVxuXG5mdW5jdGlvbiBuZXdUcmFja0Zyb21GaWxlKGZpbGUpIHtcbiAgaWYgKGZpbGUgPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuICBpZiAoIX5maWxlLnR5cGUuaW5kZXhPZignYXVkaW8nKSkge1xuICAgIGFsZXJ0KCdhdWRpbyBmaWxlcyBvbmx5IHBsZWFzZS4nKTtcbiAgICAvLyBhbGVydChmaWxlLnR5cGUgKyAnIGZpbGVzIGFyZSBub3Qgc3VwcG9ydGVkLicpO1xuICAgIHJldHVybjtcbiAgfVxuICB3ZWxjb21lLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gIHZhciB0cmFja0VsID0gdHJhY2tUbXAoKTtcbiAgdmFyIGlkID0gdW5pcUlkKCk7XG5cbiAgdmFyIGNvbnRyb2xFbCA9IGNvbnRyb2xUbXAoe1xuICAgIHRpdGxlOiBmaWxlLm5hbWVcbiAgfSk7XG5cbiAgY29udHJvbFNwYWNlRWwuYXBwZW5kQ2hpbGQoY29udHJvbEVsKTtcbiAgdHJhY2tTcGFjZUVsLmFwcGVuZENoaWxkKHRyYWNrRWwpO1xuICB0cmFja3NbaWRdID0gbmV3IFRyYWNrKHtcbiAgICB0aXRsZTogZmlsZS5uYW1lLFxuICAgIGlkOiBpZCxcbiAgICB0cmFja0VsOiB0cmFja0VsLFxuICAgIGNvbnRyb2xFbDogY29udHJvbEVsLFxuICAgIGNvbnRleHQ6IGF1ZGlvQ29udGV4dFxuICB9KTtcbiAgdHJhY2tzW2lkXS5lbWl0dGVyLm9uKCd0cmFja3M6cmVtb3ZlJywgZnVuY3Rpb24oZXYpIHtcbiAgICB0cmFja3NbZXYuaWRdID0gbnVsbDtcbiAgICBkZWxldGUgdHJhY2tzW2V2LmlkXTtcbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygpO1xuICAgIC8vIHNob3dXZWxjb21lKCk7XG4gIH0pO1xuICB0cmFja3NbaWRdLmxvYWRGaWxlKGZpbGUpO1xuICBlbmFibGVQbGF5YmFja09wdHMoKTtcbn1cblxuZnVuY3Rpb24gbmV3VHJhY2tGcm9tVVJMKHVybCkge1xuICB3ZWxjb21lLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gIHZhciB0cmFja0VsID0gdHJhY2tUbXAoKTtcbiAgdmFyIGNvbnRyb2xFbCA9IGNvbnRyb2xUbXAoe1xuICAgIHRpdGxlOiBcIlJlY29yZGluZyAxXCJcbiAgfSk7XG4gIHZhciBpZCA9IHVuaXFJZCgpO1xuXG4gIGNvbnRyb2xTcGFjZUVsLmFwcGVuZENoaWxkKGNvbnRyb2xFbCk7XG4gIHRyYWNrU3BhY2VFbC5hcHBlbmRDaGlsZCh0cmFja0VsKTtcbiAgdHJhY2tzW2lkXSA9IG5ldyBUcmFjayh7XG4gICAgdGl0bGU6IFwiUmVjb3JkaW5nIDFcIixcbiAgICBpZDogaWQsXG4gICAgdHJhY2tFbDogdHJhY2tFbCxcbiAgICBjb250cm9sRWw6IGNvbnRyb2xFbCxcbiAgICBjb250ZXh0OiBhdWRpb0NvbnRleHRcbiAgfSk7XG4gIHRyYWNrc1tpZF0uZW1pdHRlci5vbigndHJhY2tzOnJlbW92ZScsIGZ1bmN0aW9uKGV2KSB7XG4gICAgdHJhY2tzW2V2LmlkXSA9IG51bGw7XG4gICAgZGVsZXRlIHRyYWNrc1tldi5pZF07XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcbiAgICBzaG93V2VsY29tZSgpO1xuICB9KTtcbiAgdHJhY2tzW2lkXS5sb2FkVVJMKHVybCk7XG4gIGVuYWJsZVBsYXliYWNrT3B0cygpO1xufVxuXG5mdW5jdGlvbiBzaG93V2VsY29tZSgpIHtcbiAgaWYgKCFPYmplY3Qua2V5cyh0cmFja3MpLmxlbmd0aCkgd2VsY29tZS5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcbn1cbiIsInZhciBoID0gcmVxdWlyZSgnaHlwZXJzY3JpcHQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihkYXRhKSB7XG4gIHJldHVybiBoKCdkaXYuY29udHJvbCcsXG4gICAgICAgICAgIGgoJ2hlYWRlcicsIHtcImRhdGEtdGlwLWNvbnRlbnRcIjogZGF0YS50aXRsZSwgXCJkYXRhLWhhcy10aXBcIjogXCJyaWdodFwifSxcbiAgICAgICAgICAgICBoKCdwJywgZGF0YS50aXRsZSkpLFxuICAgICAgICAgICBoKCd1bC5hY3Rpb25zJyxcbiAgICAgICAgICAgICBoKCdsaS5hY3RpdmF0ZS5hY3RpdmUnLCB7XCJkYXRhLXRpcC1jb250ZW50XCI6IFwiYWN0aXZhdGVcIiwgXCJkYXRhLWhhcy10aXBcIjogXCJib3R0b21cIn0pLFxuICAgICAgICAgICAgIGgoJ2xpLmVkaXQuYWN0aXZlJywge1wiZGF0YS10aXAtY29udGVudFwiOiBcImVkaXRcIiwgXCJkYXRhLWhhcy10aXBcIjogXCJib3R0b21cIn0pLFxuICAgICAgICAgICAgIGgoJ2xpLm11dGUnLCB7XCJkYXRhLXRpcC1jb250ZW50XCI6IFwibXV0ZVwiLCBcImRhdGEtaGFzLXRpcFwiOiBcImJvdHRvbVwifSksXG4gICAgICAgICAgICAgaCgnbGkuZXhwb3J0Jywge1wiZGF0YS10aXAtY29udGVudFwiOiBcImV4cG9ydFwiLCBcImRhdGEtaGFzLXRpcFwiOiBcImJvdHRvbVwifSksXG4gICAgICAgICAgICAgaCgnbGkuY29sbGFwc2UnLCB7XCJkYXRhLXRpcC1jb250ZW50XCI6IFwiY29sbGFwc2VcIiwgXCJkYXRhLWhhcy10aXBcIjogXCJib3R0b21cIn0pLFxuICAgICAgICAgICAgIGgoJ2xpLnJlbW92ZScsIHtcImRhdGEtdGlwLWNvbnRlbnRcIjogXCJyZW1vdmVcIiwgXCJkYXRhLWhhcy10aXBcIjogXCJib3R0b21cIn0pKSxcblxuICAgICAgICAgICBoKCdhcnRpY2xlLmluZm8nLFxuICAgICAgICAgICAgIGgoJ2Rpdi52b2x1bWUnLFxuICAgICAgICAgICAgICAgaCgnc3Bhbi52b2x1bWUtYmFyJyksXG4gICAgICAgICAgICAgICBoKCdpbnB1dCcsIHtcInR5cGVcIjogJ3JhbmdlJywgXCJtaW5cIjogJzAnLCBcIm1heFwiOiAnMScsIFwic3RlcFwiOiBcIi4wNVwiLCBcInZhbHVlXCI6IFwiLjUwXCIsIFwic3R5bGVcIjogXCJkaXNwbGF5OiBoaWRkZW47XCJ9KSksXG4gICAgICAgICAgICAgaCgncCcsIFwiQ3VycmVudCBUaW1lOiBcIixcbiAgICAgICAgICAgICAgIGgoJ2kuY3VyJywgXCIwMDowMDowMFwiKSksXG4gICAgICAgICAgICAgaCgncCcsIFwiRHVyYXRpb246IFwiLFxuICAgICAgICAgICAgICAgaCgnaS5kdXInLCBcIjAwOjAwOjAwXCIpKSxcbiAgICAgICAgICAgICBoKCdwJywgXCJSZW1haW5pbmc6IFwiLFxuICAgICAgICAgICAgICAgaCgnaS5yZW0nLCBcIjAwOjAwOjAwXCIpKSkpO1xufSIsInZhciBoID0gcmVxdWlyZSgnaHlwZXJzY3JpcHQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIGgoJ2Rpdi50cmFjay5hY3RpdmUnLFxuICAgICAgICAgICBoKCdwJyxcbiAgICAgICAgICAgICBcImRyYWcgZmlsZSAyIGVkaXRcIiksXG4gICAgICAgICAgIGgoJ2Rpdi5wbGF5LWN1cnNvcicpLFxuICAgICAgICAgICBoKCdkaXYuc2VsZWN0aW9uJyksXG4gICAgICAgICAgIGgoJ2Rpdi53YXZlLnNlbGVjdGFibGUnLFxuICAgICAgICAgICAgIGgoJ2NhbnZhcycsIHsnaGVpZ2h0JzogJzMwMCd9KSksXG4gICAgICAgICAgIGgoJ2Rpdi53YXZlLXByb2dyZXNzLnNlbGVjdGFibGUnLFxuICAgICAgICAgICAgIGgoJ2NhbnZhcycsIHsnaGVpZ2h0JzogJzMwMCd9KSkpO1xufVxuIl19
