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

},{"browser-split":"/home/meandave/Code/metastaseis/node_modules/hyperscript/node_modules/browser-split/index.js","class-list":"/home/meandave/Code/metastaseis/node_modules/hyperscript/node_modules/class-list/index.js","html-element":"/usr/lib/node_modules/watchify/node_modules/browserify/node_modules/browser-resolve/empty.js"}],"/home/meandave/Code/metastaseis/node_modules/hyperscript/node_modules/browser-split/index.js":[function(require,module,exports){
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
},{"_process":"/usr/lib/node_modules/watchify/node_modules/browserify/node_modules/process/browser.js"}],"/home/meandave/Code/metastaseis/public/lib/colors.js":[function(require,module,exports){
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
module.exports = function (totalSec) {
  var minutes = parseInt( totalSec / 60 ) % 60;
  var seconds = totalSec % 60;

  return ((minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds  < 10 ? "0" + seconds.toFixed(2) : seconds.toFixed(2))).replace('.', ':');
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
},{}],"/home/meandave/Code/metastaseis/public/lib/track.js":[function(require,module,exports){
var EE = require('events').EventEmitter;
var raf = require('raf');
var AudioSource = require('audiosource');
var formatTime = require('./format-time');
var drawBuffer = require('./draw-buffer');
var colors = require('./colors');
module.exports = Track;

function Track(opts) {
  this.emitter = new EE();
  this.containEl = opts.containEl;
  this.trackEl = this.containEl.querySelector('.track');
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

  this.currentTime = this.context.currentTime;
  this.playing = false;

  this.startOffset = 0;
  this.lastPlay = 0;
  this.lastPause = 0;
  this.pausedSum = 0;
  this.actualCurrentTime = 0;
  this.initialPlay = true;
  this.initStartTime = 0;

  // indicators
  this.fileIndicator = this.containEl.querySelector('.track p');
  this.currentTimeEl = this.containEl.querySelector('.cur');
  this.remainingEl = this.containEl.querySelector('.rem');
  this.durationEl = this.containEl.querySelector('.dur');

  // controls
  this.gainEl = this.containEl.querySelector('.volume input');

  // wave elements
  this.wave = this.containEl.querySelector('.wave canvas');
  this.progressWave = this.containEl.querySelector('.wave-progress');
  this.cursor = this.containEl.querySelector('.play-cursor');
  this.selection = this.containEl.querySelector('.selection');
  this.selectable = [].slice.call(document.querySelectorAll('.selectable'));

  colors.start(this.fileIndicator, 300);

  this.gainEl.addEventListener('change', function(ev) {
    this.gainNode.gain.value = parseFloat(ev.target.value);
  }.bind(this));

  this.containEl.querySelector('.activate').addEventListener('click', function(ev) {
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

  this.containEl.querySelector('.mute').addEventListener('click', function(ev) {
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

  this.containEl.querySelector('.edit').addEventListener('click', function(ev) {
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

  this.containEl.querySelector('.collapse').addEventListener('click', function(ev) {
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

  this.containEl.querySelector('.remove').addEventListener('click', function(ev) {
    this.stop();
    ev.target.parentElement.parentNode.parentNode.remove();
    this.emitter.emit('tracks:remove', {id: this.id});
    this.emitter = null;
  }.bind(this));
}

Track.prototype = {
  play: function() {
    this.stop();
    this.lastPlay = this.context.currentTime;
    this.updateStartOffset();
    this.playTrack(this.startOffset % this.audiosource.buffer.duration);
  },
  remove: function() {

  },
  percentFromClick: function(ev) {
    var x = ev.offsetX || ev.layerX;
    return (x / this.wave.offsetWidth) * 100;
  },
  getPercentFromCursor: function() {
    return parseFloat(this.cursor.style.left.replace('%', ''));
  },
  getOffsetFromPercent: function(percent) {
    if (percent === 0) return 0;
    var inter = this.audiosource.buffer.duration / 100;
    return inter * percent;
  },
  updateStartOffset: function() {
    if (this.cursor.style.left !== '') {
      var percent = this.getPercentFromCursor();
      this.startOffset = this.getOffsetFromPercent(percent);
    } else {
      this.resetProgress();
    }
  },
  updatePaused: function() {
    this.pausedSum = this.pausedSum + (this.lastPlay - this.lastPause);
  },
  stop: function() {
    this.playing = false;
    this.initialPlay = true;
    this.startOffset = 0;
    this.lastPlay = 0;
    this.lastPause = 0;
    this.pausedSum = 0;
    if (this.audiosource.source) this.audiosource.stop();
  },
  resetProgress: function() {
    this.progressWave.style.width = "0%";
    this.cursor.style.left = "0%";
  },
  pause: function() {
    this.lastPause = this.context.currentTime;
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
  updateVisualProgress: function (percent) {
    this.progressWave.style.width = percent+"%";
    this.cursor.style.left = percent+"%";
  },
  triggerPlaying: function() {
    if (!this.playing) {
      return;
    }

    var dur = this.audiosource.buffer.duration;
    var x = this.currentTimeToPercent(this.context.currentTime);

    this.updateVisualProgress(x);

    this.currentTimeEl.textContent = formatTime(this.context.currentTime - this.lastPlay);
    this.remainingEl.textContent = formatTime((this.audiosource.buffer.duration - this.lastPlay) - (this.context.currentTime - this.lastPlay));

    if (parseInt(x) >= 100) {
      this.playing = !this.playing;
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

           self.durationEl.textContent = formatTime(buf.duration);

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
    // set status and id3
    var reader = new FileReader();
    reader.onloadend = function(ev) {
      self.fileIndicator.textContent = 'decoding audio data...';

      self.context.decodeAudioData(ev.target.result, function(buf) {
        self.fileIndicator.textContent = 'rendering wave...';

        self.gainNode = self.context.createGain();
        self.audiosource = new AudioSource(self.context, {
          gainNode: self.gainNode
        });

        self.durationEl.textContent = formatTime(buf.duration);

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
    var w = this.wave.parentNode.offsetWidth;
    this.wave.width = w;
    this.progressWave.querySelector('canvas').width = w;
  },
  drawWaves: function() {
    var prevLeft = 0;
    if (this.cursor.style.left) {
      prevLeft = parseFloat(this.cursor.style.left.replace('%', ''));
    }
    this.resetVisual();
    drawBuffer(this.wave, this.audiosource.buffer, '#52F6A4');
    drawBuffer(this.progressWave.querySelector('canvas'), this.audiosource.buffer, '#F445F0');
    console.log('waves updated.')
    // this.updateProgress(prevLeft);
  }
}
},{"./colors":"/home/meandave/Code/metastaseis/public/lib/colors.js","./draw-buffer":"/home/meandave/Code/metastaseis/public/lib/draw-buffer.js","./format-time":"/home/meandave/Code/metastaseis/public/lib/format-time.js","audiosource":"/home/meandave/Code/metastaseis/node_modules/audiosource/index.js","events":"/usr/lib/node_modules/watchify/node_modules/browserify/node_modules/events/events.js","raf":"/home/meandave/Code/metastaseis/node_modules/raf/index.js"}],"/home/meandave/Code/metastaseis/public/main.js":[function(require,module,exports){
var EE = require('events').EventEmitter;
var dragDrop = require('drag-drop');
var AudioContext = require('audiocontext');
var AudioSource = require('audiosource');
var FFT = require('audio-fft');

var colors = require('./lib/colors');
var editor = require('./lib/edits');
var recorder = require('./lib/record');
var Track = require('./lib/track');

var trackTmp = require('../templates/track-tmp');

var emitter = new EE();
var audioContext = new AudioContext();
var masterGainNode = audioContext.createGain();
var uniqId = function() {return Math.random().toString(16).slice(2)};

var drawer = document.querySelector('.drawer');
var fft = new FFT(audioContext, {canvas: drawer.querySelector('#fft')});

var workspaceEl = document.querySelector('#workspace');

// controls
var welcome = document.querySelector('.welcome');
var welcomeImportBtn = welcome.querySelector('.import');
var welcomeRecordBtn = document.querySelector('.record');
var importBtn = document.querySelector('.import');
var importInput = document.querySelector('#import')
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

var vips = welcome.querySelectorAll('span');

for(var i=0; i<vips.length; i++){
  colors.start(vips[i], 300);
}

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
  var containerEl = trackTmp({
    title: file.name
  });
  var id = uniqId();

  workspaceEl.appendChild(containerEl);
  tracks[id] = new Track({
    title: file.name,
    id: id,
    containEl: containerEl,
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
  var containerEl = trackTmp({
    title: "Recording 1"
  });
  var id = uniqId();

  workspaceEl.appendChild(containerEl);
  tracks[id] = new Track({
    title: "Recording 1",
    id: id,
    containEl: containerEl,
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

},{"../templates/track-tmp":"/home/meandave/Code/metastaseis/templates/track-tmp.js","./lib/colors":"/home/meandave/Code/metastaseis/public/lib/colors.js","./lib/edits":"/home/meandave/Code/metastaseis/public/lib/edits.js","./lib/record":"/home/meandave/Code/metastaseis/public/lib/record.js","./lib/track":"/home/meandave/Code/metastaseis/public/lib/track.js","audio-fft":"/home/meandave/Code/metastaseis/node_modules/audio-fft/index.js","audiocontext":"/home/meandave/Code/metastaseis/node_modules/audiocontext/src/audiocontext.js","audiosource":"/home/meandave/Code/metastaseis/node_modules/audiosource/index.js","drag-drop":"/home/meandave/Code/metastaseis/node_modules/drag-drop/index.js","events":"/usr/lib/node_modules/watchify/node_modules/browserify/node_modules/events/events.js"}],"/home/meandave/Code/metastaseis/templates/control-tmp.js":[function(require,module,exports){
var h = require('hyperscript');

module.exports = function(data) {
  return h('div.control',
           h('header',
             h('p', data.title, {"contenteditable": "true"})),
           h('ul.actions',
             h('li.activate.active', {"title": "activate"}),
             h('li.edit.active', {"title": "edit"}),
             h('li.mute', {"title": "mute"}),
             h('li.export', {"title": "export"}),
             h('li.collapse', {"title": "collapse"}),
             h('li.remove', {"title": "remove"})),
           h('div.volume',
             h('input', {"type": 'range', "min": '0', "max": '1', "step": ".05", "value": ".50"})),
           h('article.info',
             h('p', "Current Time: ",
               h('i.cur', "00:00:00")),
             h('p', "Duration: ",
               h('i.dur', "00:00:00")),
             h('p', "Remaining: ",
               h('i.rem', "00:00:00"))));
  // h('br'),
  // h('span.upload', "upload to soundcloud"));
}

// module.exports = function(data) {
//   return h('div.control',
//            h('span.de', "deactivate"),
//            h('div.volume',
//              h('input', {"type": 'range', "min": '0', "max": '1', "step": ".05", "value": ".50"})),
//            h('span.mute', "mute"),
//            h('span.selecting', "hide selection"),
//            h('div.info',
//              h('p', "Title: ",
//                h('i.title', {'contentEditable': true}, data.title)),
//              h('article.info',
//                h('p', "Current Time: ",
//                  h('i.cur', "00:00:00")),
//                h('p', "Duration: ",
//                  h('i.dur', "00:00:00")),
//                h('p', "Remaining: ",
//                  h('i.rem', "00:00:00")))),
//            h('span.collapse', "collapse"),
//            h('span.remove', "remove"),
//            h('span.export', "export"));
//   // h('br'),
//   // h('span.upload', "upload to soundcloud"));
// }

},{"hyperscript":"/home/meandave/Code/metastaseis/node_modules/hyperscript/index.js"}],"/home/meandave/Code/metastaseis/templates/track-tmp.js":[function(require,module,exports){
var h = require('hyperscript');
var controlTmp = require('./control-tmp');

module.exports = function(data) {
  return h('div.track-space',
           controlTmp(data),
           h('div.track.active',
             h('p',
               "drag file 2 edit"),
             h('div.play-cursor'),
             h('div.selection'),
             h('div.wave.selectable',
               h('canvas', {'height': '300'})),
             h('div.wave-progress.selectable',
               h('canvas', {'height': '300'}))));
}

},{"./control-tmp":"/home/meandave/Code/metastaseis/templates/control-tmp.js","hyperscript":"/home/meandave/Code/metastaseis/node_modules/hyperscript/index.js"}],"/usr/lib/node_modules/watchify/node_modules/browserify/node_modules/browser-resolve/empty.js":[function(require,module,exports){

},{}],"/usr/lib/node_modules/watchify/node_modules/browserify/node_modules/events/events.js":[function(require,module,exports){
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
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
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

},{}],"/usr/lib/node_modules/watchify/node_modules/browserify/node_modules/process/browser.js":[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
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
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}]},{},["/home/meandave/Code/metastaseis/public/main.js"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbGliL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL2hvbWUvbWVhbmRhdmUvQ29kZS9tZXRhc3Rhc2Vpcy9ub2RlX21vZHVsZXMvYXVkaW8tZmZ0L2luZGV4LmpzIiwiL2hvbWUvbWVhbmRhdmUvQ29kZS9tZXRhc3Rhc2Vpcy9ub2RlX21vZHVsZXMvYXVkaW9jb250ZXh0L3NyYy9hdWRpb2NvbnRleHQuanMiLCIvaG9tZS9tZWFuZGF2ZS9Db2RlL21ldGFzdGFzZWlzL25vZGVfbW9kdWxlcy9hdWRpb3NvdXJjZS9pbmRleC5qcyIsIi9ob21lL21lYW5kYXZlL0NvZGUvbWV0YXN0YXNlaXMvbm9kZV9tb2R1bGVzL2RyYWctZHJvcC9pbmRleC5qcyIsIi9ob21lL21lYW5kYXZlL0NvZGUvbWV0YXN0YXNlaXMvbm9kZV9tb2R1bGVzL2RyYWctZHJvcC9ub2RlX21vZHVsZXMvbG9kYXNoLnRocm90dGxlL2luZGV4LmpzIiwiL2hvbWUvbWVhbmRhdmUvQ29kZS9tZXRhc3Rhc2Vpcy9ub2RlX21vZHVsZXMvZHJhZy1kcm9wL25vZGVfbW9kdWxlcy9sb2Rhc2gudGhyb3R0bGUvbm9kZV9tb2R1bGVzL2xvZGFzaC5kZWJvdW5jZS9pbmRleC5qcyIsIi9ob21lL21lYW5kYXZlL0NvZGUvbWV0YXN0YXNlaXMvbm9kZV9tb2R1bGVzL2RyYWctZHJvcC9ub2RlX21vZHVsZXMvbG9kYXNoLnRocm90dGxlL25vZGVfbW9kdWxlcy9sb2Rhc2guZGVib3VuY2Uvbm9kZV9tb2R1bGVzL2xvZGFzaC5ub3cvaW5kZXguanMiLCIvaG9tZS9tZWFuZGF2ZS9Db2RlL21ldGFzdGFzZWlzL25vZGVfbW9kdWxlcy9kcmFnLWRyb3Avbm9kZV9tb2R1bGVzL2xvZGFzaC50aHJvdHRsZS9ub2RlX21vZHVsZXMvbG9kYXNoLmRlYm91bmNlL25vZGVfbW9kdWxlcy9sb2Rhc2gubm93L25vZGVfbW9kdWxlcy9sb2Rhc2guX2lzbmF0aXZlL2luZGV4LmpzIiwiL2hvbWUvbWVhbmRhdmUvQ29kZS9tZXRhc3Rhc2Vpcy9ub2RlX21vZHVsZXMvZHJhZy1kcm9wL25vZGVfbW9kdWxlcy9sb2Rhc2gudGhyb3R0bGUvbm9kZV9tb2R1bGVzL2xvZGFzaC5pc2Z1bmN0aW9uL2luZGV4LmpzIiwiL2hvbWUvbWVhbmRhdmUvQ29kZS9tZXRhc3Rhc2Vpcy9ub2RlX21vZHVsZXMvZHJhZy1kcm9wL25vZGVfbW9kdWxlcy9sb2Rhc2gudGhyb3R0bGUvbm9kZV9tb2R1bGVzL2xvZGFzaC5pc29iamVjdC9pbmRleC5qcyIsIi9ob21lL21lYW5kYXZlL0NvZGUvbWV0YXN0YXNlaXMvbm9kZV9tb2R1bGVzL2RyYWctZHJvcC9ub2RlX21vZHVsZXMvbG9kYXNoLnRocm90dGxlL25vZGVfbW9kdWxlcy9sb2Rhc2guaXNvYmplY3Qvbm9kZV9tb2R1bGVzL2xvZGFzaC5fb2JqZWN0dHlwZXMvaW5kZXguanMiLCIvaG9tZS9tZWFuZGF2ZS9Db2RlL21ldGFzdGFzZWlzL25vZGVfbW9kdWxlcy9oeXBlcnNjcmlwdC9pbmRleC5qcyIsIi9ob21lL21lYW5kYXZlL0NvZGUvbWV0YXN0YXNlaXMvbm9kZV9tb2R1bGVzL2h5cGVyc2NyaXB0L25vZGVfbW9kdWxlcy9icm93c2VyLXNwbGl0L2luZGV4LmpzIiwiL2hvbWUvbWVhbmRhdmUvQ29kZS9tZXRhc3Rhc2Vpcy9ub2RlX21vZHVsZXMvaHlwZXJzY3JpcHQvbm9kZV9tb2R1bGVzL2NsYXNzLWxpc3QvaW5kZXguanMiLCIvaG9tZS9tZWFuZGF2ZS9Db2RlL21ldGFzdGFzZWlzL25vZGVfbW9kdWxlcy9oeXBlcnNjcmlwdC9ub2RlX21vZHVsZXMvY2xhc3MtbGlzdC9ub2RlX21vZHVsZXMvaW5kZXhvZi9pbmRleC5qcyIsIi9ob21lL21lYW5kYXZlL0NvZGUvbWV0YXN0YXNlaXMvbm9kZV9tb2R1bGVzL3JhZi9pbmRleC5qcyIsIi9ob21lL21lYW5kYXZlL0NvZGUvbWV0YXN0YXNlaXMvbm9kZV9tb2R1bGVzL3JhZi9ub2RlX21vZHVsZXMvcGVyZm9ybWFuY2Utbm93L2xpYi9wZXJmb3JtYW5jZS1ub3cuanMiLCIvaG9tZS9tZWFuZGF2ZS9Db2RlL21ldGFzdGFzZWlzL3B1YmxpYy9saWIvY29sb3JzLmpzIiwiL2hvbWUvbWVhbmRhdmUvQ29kZS9tZXRhc3Rhc2Vpcy9wdWJsaWMvbGliL2RyYXctYnVmZmVyLmpzIiwiL2hvbWUvbWVhbmRhdmUvQ29kZS9tZXRhc3Rhc2Vpcy9wdWJsaWMvbGliL2VkaXRzLmpzIiwiL2hvbWUvbWVhbmRhdmUvQ29kZS9tZXRhc3Rhc2Vpcy9wdWJsaWMvbGliL2Zvcm1hdC10aW1lLmpzIiwiL2hvbWUvbWVhbmRhdmUvQ29kZS9tZXRhc3Rhc2Vpcy9wdWJsaWMvbGliL3JlY29yZC5qcyIsIi9ob21lL21lYW5kYXZlL0NvZGUvbWV0YXN0YXNlaXMvcHVibGljL2xpYi90cmFjay5qcyIsIi9ob21lL21lYW5kYXZlL0NvZGUvbWV0YXN0YXNlaXMvcHVibGljL21haW4uanMiLCIvaG9tZS9tZWFuZGF2ZS9Db2RlL21ldGFzdGFzZWlzL3RlbXBsYXRlcy9jb250cm9sLXRtcC5qcyIsIi9ob21lL21lYW5kYXZlL0NvZGUvbWV0YXN0YXNlaXMvdGVtcGxhdGVzL3RyYWNrLXRtcC5qcyIsIi91c3IvbGliL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwiL3Vzci9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIiwiL3Vzci9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9TQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcbiAqIHB1bGxlZCBmcm9tIEBqc2FudGVsbFxuICpcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9qc2FudGVsbC9kc3Atd2l0aC13ZWItYXVkaW8tcHJlc2VudGF0aW9uL2Jsb2IvZ2gtcGFnZXMvZXhhbXBsZXMvRkZULmpzXG4gKlxuICovXG5cbnZhciBNQVhfVUlOVDggPSAyNTU7XG5cbm1vZHVsZS5leHBvcnRzID0gRkZUO1xuXG5mdW5jdGlvbiBGRlQgKGN0eCwgb3B0aW9ucykge1xuICB2YXIgbW9kdWxlID0gdGhpcztcbiAgdGhpcy5jYW52YXMgPSBvcHRpb25zLmNhbnZhcztcbiAgdGhpcy5vbkJlYXQgPSBvcHRpb25zLm9uQmVhdDtcbiAgdGhpcy5vZmZCZWF0ID0gb3B0aW9ucy5vZmZCZWF0O1xuICB0aGlzLnR5cGUgPSBvcHRpb25zLnR5cGUgfHwgJ2ZyZXF1ZW5jeSc7XG4gIHRoaXMuc3BhY2luZyA9IG9wdGlvbnMuc3BhY2luZyB8fCAxO1xuICB0aGlzLndpZHRoID0gb3B0aW9ucy53aWR0aCB8fCAxO1xuICB0aGlzLmNvdW50ID0gb3B0aW9ucy5jb3VudCB8fCA1MTI7XG4gIHRoaXMuaW5wdXQgPSB0aGlzLm91dHB1dCA9IGN0eC5jcmVhdGVBbmFseXNlcigpO1xuICB0aGlzLnByb2MgPSBjdHguY3JlYXRlU2NyaXB0UHJvY2Vzc29yKDI1NiwgMSwgMSk7XG4gIHRoaXMuZGF0YSA9IG5ldyBVaW50OEFycmF5KHRoaXMuaW5wdXQuZnJlcXVlbmN5QmluQ291bnQpO1xuICB0aGlzLmN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbiAgdGhpcy5kZWNheSA9IG9wdGlvbnMuZGVjYXkgfHwgMC4wMDI7XG4gIHRoaXMudGhyZXNob2xkID0gb3B0aW9ucy50aHJlc2hvbGQgfHwgMC41O1xuICB0aGlzLnJhbmdlID0gb3B0aW9ucy5yYW5nZSB8fCBbMCwgdGhpcy5kYXRhLmxlbmd0aC0xXTtcbiAgdGhpcy53YWl0ID0gb3B0aW9ucy53YWl0IHx8IDUxMjtcblxuICB0aGlzLmggPSB0aGlzLmNhbnZhcy5oZWlnaHQ7XG4gIHRoaXMudyA9IHRoaXMuY2FudmFzLndpZHRoO1xuXG4gIHRoaXMuaW5wdXQuY29ubmVjdCh0aGlzLnByb2MpO1xuICB0aGlzLnByb2Mub25hdWRpb3Byb2Nlc3MgPSBwcm9jZXNzLmJpbmQobnVsbCwgbW9kdWxlKTtcbiAgdGhpcy5jdHgubGluZVdpZHRoID0gbW9kdWxlLndpZHRoO1xufVxuXG5GRlQucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbiAobm9kZSkge1xuICB0aGlzLm91dHB1dC5jb25uZWN0KG5vZGUpO1xuICB0aGlzLnByb2MuY29ubmVjdChub2RlKTtcbn1cblxuZnVuY3Rpb24gcHJvY2VzcyAobW9kdWxlKSB7XG5cbiAgdmFyIGN0eCA9IG1vZHVsZS5jdHg7XG4gIHZhciBkYXRhID0gbW9kdWxlLmRhdGE7XG4gIGN0eC5jbGVhclJlY3QoMCwgMCwgbW9kdWxlLncsIG1vZHVsZS5oKTtcbiAgY3R4LmZpbGxTdHlsZSA9IG1vZHVsZS5maWxsU3R5bGUgfHwgJyMwMDAwMDAnO1xuICBjdHguc3Ryb2tlU3R5bGUgPSBtb2R1bGUuc3Ryb2tlU3R5bGUgfHwgJyMwMDAwMDAnO1xuXG4gIGlmIChtb2R1bGUudHlwZSA9PT0gJ2ZyZXF1ZW5jeScpIHtcbiAgICBtb2R1bGUuaW5wdXQuZ2V0Qnl0ZUZyZXF1ZW5jeURhdGEoZGF0YSk7XG4gICAgLy8gQWJvcnQgaWYgbm8gZGF0YSBjb21pbmcgdGhyb3VnaCwgcXVpY2sgaGFjaywgbmVlZHMgZml4ZWRcbiAgICBpZiAobW9kdWxlLmRhdGFbM10gPCA1KSByZXR1cm47XG5cbiAgICBmb3IgKHZhciBpPSAwLCBsID0gZGF0YS5sZW5ndGg7IGkgPCBsICYmIGkgPCBtb2R1bGUuY291bnQ7IGkrKykge1xuICAgICAgY3R4LmZpbGxSZWN0KFxuICAgICAgICBpICogKG1vZHVsZS5zcGFjaW5nICsgbW9kdWxlLndpZHRoKSxcbiAgICAgICAgbW9kdWxlLmgsXG4gICAgICAgIG1vZHVsZS53aWR0aCxcbiAgICAgICAgLShtb2R1bGUuaCAvIE1BWF9VSU5UOCkgKiBkYXRhW2ldXG4gICAgICApO1xuICAgIH1cbiAgfVxuICBlbHNlIGlmIChtb2R1bGUudHlwZSA9PT0gJ3RpbWUnKSB7XG4gICAgbW9kdWxlLmlucHV0LmdldEJ5dGVUaW1lRG9tYWluRGF0YShkYXRhKTtcbiAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgY3R4Lm1vdmVUbygwLCBtb2R1bGUuaCAvIDIpO1xuICAgIGZvciAodmFyIGk9IDAsIGwgPSBkYXRhLmxlbmd0aDsgaSA8IGwgJiYgaSA8IG1vZHVsZS5jb3VudDsgaSsrKSB7XG4gICAgICBjdHgubGluZVRvKFxuICAgICAgICBpICogKG1vZHVsZS5zcGFjaW5nICsgbW9kdWxlLndpZHRoKSxcbiAgICAgICAgKG1vZHVsZS5oIC8gTUFYX1VJTlQ4KSAqIGRhdGFbaV1cbiAgICAgICk7XG4gICAgfVxuICAgIGN0eC5zdHJva2UoKTtcbiAgICBjdHguY2xvc2VQYXRoKCk7XG4gIH1cbn1cbiIsIi8qXG4gKiBXZWIgQXVkaW8gQVBJIEF1ZGlvQ29udGV4dCBzaGltXG4gKi9cbihmdW5jdGlvbiAoZGVmaW5pdGlvbikge1xuICAgIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGRlZmluaXRpb24oKTtcbiAgICB9XG59KShmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQ7XG59KTtcbiIsIi8qXG4gKiBBdWRpb1NvdXJjZVxuICpcbiAqICogTVVTVCBwYXNzIGFuIGF1ZGlvIGNvbnRleHRcbiAqXG4gKi9cbmZ1bmN0aW9uIEF1ZGlvU291cmNlIChjb250ZXh0LCBvcHRzKSB7XG4gIGlmICghY29udGV4dCkge1xuICAgIHRocm93IG5ldyBFcnJvcignWW91IG11c3QgcGFzcyBhbiBhdWRpbyBjb250ZXh0IHRvIHVzZSB0aGlzIG1vZHVsZScpO1xuICB9XG4gIGlmIChvcHRzID09PSB1bmRlZmluZWQpIG9wdHMgPSB7fTtcblxuICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICB0aGlzLmJ1ZmZlciA9IHVuZGVmaW5lZDtcbiAgdGhpcy51cmwgPSBvcHRzLnVybCA/IG9wdHMudXJsIDogdW5kZWZpbmVkO1xuICB0aGlzLmZmdHMgPSBvcHRzLmZmdHMgPyBvcHRzLmZmdHMgOiBbXTtcbiAgdGhpcy5nYWluTm9kZSA9IG9wdHMuZ2Fpbk5vZGUgPyBvcHRzLmdhaW5Ob2RlIDogdW5kZWZpbmVkO1xufVxuXG5BdWRpb1NvdXJjZS5wcm90b3R5cGUgPSB7XG4gIG5lZWRCdWZmZXI6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmJ1ZmZlciA9PT0gdW5kZWZpbmVkO1xuICB9LFxuICBsb2FkU291bmQ6IGZ1bmN0aW9uKHVybCwgY2IpIHtcbiAgICB2YXIgcmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgcmVxLm9wZW4oJ0dFVCcsIHVybCwgdHJ1ZSk7XG4gICAgcmVxLnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJlcS5vbmxvYWRlbmQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuZGVjb2RlLmNhbGwoc2VsZiwgcmVxLnJlc3BvbnNlLCBjYik7XG4gICAgfTtcbiAgICByZXEuc2VuZCgpO1xuICB9LFxuICBnZXRCdWZmZXI6IGZ1bmN0aW9uKGNiKSB7XG4gICAgaWYgKCF0aGlzLm5lZWRCdWZmZXIoKSkgcmV0dXJuO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmxvYWRTb3VuZCh0aGlzLnVybCwgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgc2VsZi5vbkxvYWRlZC5jYWxsKHNlbGYsIGRhdGEsIHRydWUpO1xuICAgIH0pO1xuICB9LFxuICBnZXRTb3VyY2U6IGZ1bmN0aW9uKGNiKSB7XG4gICAgaWYgKHRoaXMuc291cmNlKSB7XG4gICAgICBjYih0aGlzLnNvdXJjZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHRoaXMuZGlzY29ubmVjdCgpO1xuICAgICAgdGhpcy5sb2FkU291bmQodGhpcy51cmwsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgdGhpcy5zb3VyY2UgPSBzZWxmLmNyZWF0ZVNvdXJjZS5jYWxsKHNlbGYsIGRhdGEsIHRydWUpO1xuICAgICAgICBjYih0aGlzLnNvdXJjZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG4gIG9uTG9hZGVkOiBmdW5jdGlvbihzb3VyY2UsIHNpbGVudCkge1xuICAgIHRoaXMuYnVmZmVyID0gc291cmNlO1xuICAgIHRoaXMuZGlzY29ubmVjdCgpO1xuICAgIHRoaXMuc291cmNlID0gdGhpcy5jb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuICAgIHRoaXMuc291cmNlLmJ1ZmZlciA9IHRoaXMuYnVmZmVyO1xuICAgIHRoaXMuc291cmNlLmNvbm5lY3QodGhpcy5nYWluTm9kZSk7XG4gICAgdGhpcy5mZnRzLmZvckVhY2goZnVuY3Rpb24oZmZ0KSB7XG4gICAgICB0aGlzLmdhaW5Ob2RlLmNvbm5lY3QoZmZ0LmlucHV0KTtcbiAgICB9LCB0aGlzKTtcbiAgICB0aGlzLmdhaW5Ob2RlLmNvbm5lY3QodGhpcy5jb250ZXh0LmRlc3RpbmF0aW9uKTtcbiAgICB0aGlzLmZmdHMuZm9yRWFjaChmdW5jdGlvbihmZnQpIHtcbiAgICAgIGZmdC5jb25uZWN0KHRoaXMuY29udGV4dC5kZXN0aW5hdGlvbik7XG4gICAgfSwgdGhpcyk7XG4gICAgaWYgKCFzaWxlbnQpIHRoaXMucGxheVNvdW5kKCk7XG4gIH0sXG4gIGRpc2Nvbm5lY3Q6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLnNvdXJjZSkge1xuICAgICAgdGhpcy5zb3VyY2UuZGlzY29ubmVjdCh0aGlzLmNvbnRleHQuZGVzdGluYXRpb24pO1xuICAgIH1cbiAgfSxcbiAgcGxheVNvdW5kOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5wbGF5VGltZSkge1xuICAgICAgdGhpcy5zb3VyY2Uuc3RhcnQoMCwgdGhpcy5vZmZzZXQpO1xuICAgIH1cblxuICAgIHRoaXMucGxheVRpbWUgPSB0aGlzLmNvbnRleHQuY3VycmVudFRpbWU7XG4gIH0sXG4gIGxvYWRTaWxlbnQ6IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5uZWVkQnVmZmVyKCkpIHJldHVybjtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5sb2FkU291bmQodGhpcy51cmwsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIHNlbGYub25Mb2FkZWQuY2FsbChzZWxmLCBkYXRhLCB0cnVlKTtcbiAgICB9KTtcbiAgfSxcbiAgcGxheTogZnVuY3Rpb24oc3RhcnR0aW1lLCBvZmZzZXQpIHtcbiAgICB0aGlzLnBsYXlUaW1lID0gc3RhcnR0aW1lID8gc3RhcnR0aW1lIDogdGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lO1xuICAgIHRoaXMub2Zmc2V0ID0gb2Zmc2V0ID8gb2Zmc2V0IDogMDtcblxuICAgIGlmICh0aGlzLm5lZWRCdWZmZXIoKSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdGhpcy5sb2FkU291bmQodGhpcy51cmwsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgc2VsZi5vbkxvYWRlZC5jYWxsKHNlbGYsIGRhdGEpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub25Mb2FkZWQodGhpcy5idWZmZXIpO1xuICAgIH1cbiAgfSxcbiAgc3RvcDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zb3VyY2Uuc3RvcCh0aGlzLmNvbnRleHQuY3VycmVudFRpbWUpO1xuICB9LFxuICBkZWNvZGU6IGZ1bmN0aW9uKGRhdGEsIHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgdGhpcy5jb250ZXh0LmRlY29kZUF1ZGlvRGF0YShkYXRhLCBzdWNjZXNzLCBlcnJvcik7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQXVkaW9Tb3VyY2U7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IERyYWdEcm9wXG5cbnZhciB0aHJvdHRsZSA9IHJlcXVpcmUoJ2xvZGFzaC50aHJvdHRsZScpXG5cbmZ1bmN0aW9uIERyYWdEcm9wIChlbGVtLCBjYikge1xuICBpZiAodHlwZW9mIGVsZW0gPT09ICdzdHJpbmcnKSBlbGVtID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihlbGVtKVxuICBlbGVtLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdlbnRlcicsIGtpbGxFdmVudCwgZmFsc2UpXG4gIGVsZW0uYWRkRXZlbnRMaXN0ZW5lcignZHJhZ292ZXInLCBtYWtlT25EcmFnT3ZlcihlbGVtKSwgZmFsc2UpXG4gIGVsZW0uYWRkRXZlbnRMaXN0ZW5lcignZHJvcCcsIG9uRHJvcC5iaW5kKHVuZGVmaW5lZCwgZWxlbSwgY2IpLCBmYWxzZSlcbn1cblxuZnVuY3Rpb24ga2lsbEV2ZW50IChlKSB7XG4gIGUuc3RvcFByb3BhZ2F0aW9uKClcbiAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gIHJldHVybiBmYWxzZVxufVxuXG5mdW5jdGlvbiBtYWtlT25EcmFnT3ZlciAoZWxlbSkge1xuICB2YXIgZm4gPSB0aHJvdHRsZShmdW5jdGlvbiAoKSB7XG4gICAgZWxlbS5jbGFzc0xpc3QuYWRkKCdkcmFnJylcblxuICAgIGlmIChlbGVtLnRpbWVvdXQpIGNsZWFyVGltZW91dChlbGVtLnRpbWVvdXQpXG4gICAgZWxlbS50aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICBlbGVtLmNsYXNzTGlzdC5yZW1vdmUoJ2RyYWcnKVxuICAgIH0sIDE1MClcbiAgfSwgMTAwLCB7dHJhaWxpbmc6IGZhbHNlfSlcblxuICByZXR1cm4gZnVuY3Rpb24gKGUpIHtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgZS5kYXRhVHJhbnNmZXIuZHJvcEVmZmVjdCA9ICdjb3B5J1xuICAgIGZuKClcbiAgfVxufVxuXG5mdW5jdGlvbiBvbkRyb3AgKGVsZW0sIGNiLCBlKSB7XG4gIGUuc3RvcFByb3BhZ2F0aW9uKClcbiAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gIGVsZW0uY2xhc3NMaXN0LnJlbW92ZSgnZHJhZycpXG4gIGNiKEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGUuZGF0YVRyYW5zZmVyLmZpbGVzKSwgeyB4OiBlLmNsaWVudFgsIHk6IGUuY2xpZW50WSB9KVxuICByZXR1cm4gZmFsc2Vcbn1cbiIsIi8qKlxuICogTG8tRGFzaCAyLjQuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cDovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBtb2Rlcm4gZXhwb3J0cz1cIm5wbVwiIC1vIC4vbnBtL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuNS4yIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG52YXIgZGVib3VuY2UgPSByZXF1aXJlKCdsb2Rhc2guZGVib3VuY2UnKSxcbiAgICBpc0Z1bmN0aW9uID0gcmVxdWlyZSgnbG9kYXNoLmlzZnVuY3Rpb24nKSxcbiAgICBpc09iamVjdCA9IHJlcXVpcmUoJ2xvZGFzaC5pc29iamVjdCcpO1xuXG4vKiogVXNlZCBhcyBhbiBpbnRlcm5hbCBgXy5kZWJvdW5jZWAgb3B0aW9ucyBvYmplY3QgKi9cbnZhciBkZWJvdW5jZU9wdGlvbnMgPSB7XG4gICdsZWFkaW5nJzogZmFsc2UsXG4gICdtYXhXYWl0JzogMCxcbiAgJ3RyYWlsaW5nJzogZmFsc2Vcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIGZ1bmN0aW9uIHRoYXQsIHdoZW4gZXhlY3V0ZWQsIHdpbGwgb25seSBjYWxsIHRoZSBgZnVuY2AgZnVuY3Rpb25cbiAqIGF0IG1vc3Qgb25jZSBwZXIgZXZlcnkgYHdhaXRgIG1pbGxpc2Vjb25kcy4gUHJvdmlkZSBhbiBvcHRpb25zIG9iamVjdCB0b1xuICogaW5kaWNhdGUgdGhhdCBgZnVuY2Agc2hvdWxkIGJlIGludm9rZWQgb24gdGhlIGxlYWRpbmcgYW5kL29yIHRyYWlsaW5nIGVkZ2VcbiAqIG9mIHRoZSBgd2FpdGAgdGltZW91dC4gU3Vic2VxdWVudCBjYWxscyB0byB0aGUgdGhyb3R0bGVkIGZ1bmN0aW9uIHdpbGxcbiAqIHJldHVybiB0aGUgcmVzdWx0IG9mIHRoZSBsYXN0IGBmdW5jYCBjYWxsLlxuICpcbiAqIE5vdGU6IElmIGBsZWFkaW5nYCBhbmQgYHRyYWlsaW5nYCBvcHRpb25zIGFyZSBgdHJ1ZWAgYGZ1bmNgIHdpbGwgYmUgY2FsbGVkXG4gKiBvbiB0aGUgdHJhaWxpbmcgZWRnZSBvZiB0aGUgdGltZW91dCBvbmx5IGlmIHRoZSB0aGUgdGhyb3R0bGVkIGZ1bmN0aW9uIGlzXG4gKiBpbnZva2VkIG1vcmUgdGhhbiBvbmNlIGR1cmluZyB0aGUgYHdhaXRgIHRpbWVvdXQuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBGdW5jdGlvbnNcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIHRocm90dGxlLlxuICogQHBhcmFtIHtudW1iZXJ9IHdhaXQgVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gdGhyb3R0bGUgZXhlY3V0aW9ucyB0by5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gVGhlIG9wdGlvbnMgb2JqZWN0LlxuICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5sZWFkaW5nPXRydWVdIFNwZWNpZnkgZXhlY3V0aW9uIG9uIHRoZSBsZWFkaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnRyYWlsaW5nPXRydWVdIFNwZWNpZnkgZXhlY3V0aW9uIG9uIHRoZSB0cmFpbGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0LlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgdGhyb3R0bGVkIGZ1bmN0aW9uLlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBhdm9pZCBleGNlc3NpdmVseSB1cGRhdGluZyB0aGUgcG9zaXRpb24gd2hpbGUgc2Nyb2xsaW5nXG4gKiB2YXIgdGhyb3R0bGVkID0gXy50aHJvdHRsZSh1cGRhdGVQb3NpdGlvbiwgMTAwKTtcbiAqIGpRdWVyeSh3aW5kb3cpLm9uKCdzY3JvbGwnLCB0aHJvdHRsZWQpO1xuICpcbiAqIC8vIGV4ZWN1dGUgYHJlbmV3VG9rZW5gIHdoZW4gdGhlIGNsaWNrIGV2ZW50IGlzIGZpcmVkLCBidXQgbm90IG1vcmUgdGhhbiBvbmNlIGV2ZXJ5IDUgbWludXRlc1xuICogalF1ZXJ5KCcuaW50ZXJhY3RpdmUnKS5vbignY2xpY2snLCBfLnRocm90dGxlKHJlbmV3VG9rZW4sIDMwMDAwMCwge1xuICogICAndHJhaWxpbmcnOiBmYWxzZVxuICogfSkpO1xuICovXG5mdW5jdGlvbiB0aHJvdHRsZShmdW5jLCB3YWl0LCBvcHRpb25zKSB7XG4gIHZhciBsZWFkaW5nID0gdHJ1ZSxcbiAgICAgIHRyYWlsaW5nID0gdHJ1ZTtcblxuICBpZiAoIWlzRnVuY3Rpb24oZnVuYykpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yO1xuICB9XG4gIGlmIChvcHRpb25zID09PSBmYWxzZSkge1xuICAgIGxlYWRpbmcgPSBmYWxzZTtcbiAgfSBlbHNlIGlmIChpc09iamVjdChvcHRpb25zKSkge1xuICAgIGxlYWRpbmcgPSAnbGVhZGluZycgaW4gb3B0aW9ucyA/IG9wdGlvbnMubGVhZGluZyA6IGxlYWRpbmc7XG4gICAgdHJhaWxpbmcgPSAndHJhaWxpbmcnIGluIG9wdGlvbnMgPyBvcHRpb25zLnRyYWlsaW5nIDogdHJhaWxpbmc7XG4gIH1cbiAgZGVib3VuY2VPcHRpb25zLmxlYWRpbmcgPSBsZWFkaW5nO1xuICBkZWJvdW5jZU9wdGlvbnMubWF4V2FpdCA9IHdhaXQ7XG4gIGRlYm91bmNlT3B0aW9ucy50cmFpbGluZyA9IHRyYWlsaW5nO1xuXG4gIHJldHVybiBkZWJvdW5jZShmdW5jLCB3YWl0LCBkZWJvdW5jZU9wdGlvbnMpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHRocm90dGxlO1xuIiwiLyoqXG4gKiBMby1EYXNoIDIuNC4xIChDdXN0b20gQnVpbGQpIDxodHRwOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIG1vZGVybiBleHBvcnRzPVwibnBtXCIgLW8gLi9ucG0vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxMyBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS41LjIgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHA6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cbnZhciBpc0Z1bmN0aW9uID0gcmVxdWlyZSgnbG9kYXNoLmlzZnVuY3Rpb24nKSxcbiAgICBpc09iamVjdCA9IHJlcXVpcmUoJ2xvZGFzaC5pc29iamVjdCcpLFxuICAgIG5vdyA9IHJlcXVpcmUoJ2xvZGFzaC5ub3cnKTtcblxuLyogTmF0aXZlIG1ldGhvZCBzaG9ydGN1dHMgZm9yIG1ldGhvZHMgd2l0aCB0aGUgc2FtZSBuYW1lIGFzIG90aGVyIGBsb2Rhc2hgIG1ldGhvZHMgKi9cbnZhciBuYXRpdmVNYXggPSBNYXRoLm1heDtcblxuLyoqXG4gKiBDcmVhdGVzIGEgZnVuY3Rpb24gdGhhdCB3aWxsIGRlbGF5IHRoZSBleGVjdXRpb24gb2YgYGZ1bmNgIHVudGlsIGFmdGVyXG4gKiBgd2FpdGAgbWlsbGlzZWNvbmRzIGhhdmUgZWxhcHNlZCBzaW5jZSB0aGUgbGFzdCB0aW1lIGl0IHdhcyBpbnZva2VkLlxuICogUHJvdmlkZSBhbiBvcHRpb25zIG9iamVjdCB0byBpbmRpY2F0ZSB0aGF0IGBmdW5jYCBzaG91bGQgYmUgaW52b2tlZCBvblxuICogdGhlIGxlYWRpbmcgYW5kL29yIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIGB3YWl0YCB0aW1lb3V0LiBTdWJzZXF1ZW50IGNhbGxzXG4gKiB0byB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHdpbGwgcmV0dXJuIHRoZSByZXN1bHQgb2YgdGhlIGxhc3QgYGZ1bmNgIGNhbGwuXG4gKlxuICogTm90ZTogSWYgYGxlYWRpbmdgIGFuZCBgdHJhaWxpbmdgIG9wdGlvbnMgYXJlIGB0cnVlYCBgZnVuY2Agd2lsbCBiZSBjYWxsZWRcbiAqIG9uIHRoZSB0cmFpbGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0IG9ubHkgaWYgdGhlIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gaXNcbiAqIGludm9rZWQgbW9yZSB0aGFuIG9uY2UgZHVyaW5nIHRoZSBgd2FpdGAgdGltZW91dC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IEZ1bmN0aW9uc1xuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gZGVib3VuY2UuXG4gKiBAcGFyYW0ge251bWJlcn0gd2FpdCBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byBkZWxheS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gVGhlIG9wdGlvbnMgb2JqZWN0LlxuICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5sZWFkaW5nPWZhbHNlXSBTcGVjaWZ5IGV4ZWN1dGlvbiBvbiB0aGUgbGVhZGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0LlxuICogQHBhcmFtIHtudW1iZXJ9IFtvcHRpb25zLm1heFdhaXRdIFRoZSBtYXhpbXVtIHRpbWUgYGZ1bmNgIGlzIGFsbG93ZWQgdG8gYmUgZGVsYXllZCBiZWZvcmUgaXQncyBjYWxsZWQuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnRyYWlsaW5nPXRydWVdIFNwZWNpZnkgZXhlY3V0aW9uIG9uIHRoZSB0cmFpbGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0LlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZGVib3VuY2VkIGZ1bmN0aW9uLlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBhdm9pZCBjb3N0bHkgY2FsY3VsYXRpb25zIHdoaWxlIHRoZSB3aW5kb3cgc2l6ZSBpcyBpbiBmbHV4XG4gKiB2YXIgbGF6eUxheW91dCA9IF8uZGVib3VuY2UoY2FsY3VsYXRlTGF5b3V0LCAxNTApO1xuICogalF1ZXJ5KHdpbmRvdykub24oJ3Jlc2l6ZScsIGxhenlMYXlvdXQpO1xuICpcbiAqIC8vIGV4ZWN1dGUgYHNlbmRNYWlsYCB3aGVuIHRoZSBjbGljayBldmVudCBpcyBmaXJlZCwgZGVib3VuY2luZyBzdWJzZXF1ZW50IGNhbGxzXG4gKiBqUXVlcnkoJyNwb3N0Ym94Jykub24oJ2NsaWNrJywgXy5kZWJvdW5jZShzZW5kTWFpbCwgMzAwLCB7XG4gKiAgICdsZWFkaW5nJzogdHJ1ZSxcbiAqICAgJ3RyYWlsaW5nJzogZmFsc2VcbiAqIH0pO1xuICpcbiAqIC8vIGVuc3VyZSBgYmF0Y2hMb2dgIGlzIGV4ZWN1dGVkIG9uY2UgYWZ0ZXIgMSBzZWNvbmQgb2YgZGVib3VuY2VkIGNhbGxzXG4gKiB2YXIgc291cmNlID0gbmV3IEV2ZW50U291cmNlKCcvc3RyZWFtJyk7XG4gKiBzb3VyY2UuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIF8uZGVib3VuY2UoYmF0Y2hMb2csIDI1MCwge1xuICogICAnbWF4V2FpdCc6IDEwMDBcbiAqIH0sIGZhbHNlKTtcbiAqL1xuZnVuY3Rpb24gZGVib3VuY2UoZnVuYywgd2FpdCwgb3B0aW9ucykge1xuICB2YXIgYXJncyxcbiAgICAgIG1heFRpbWVvdXRJZCxcbiAgICAgIHJlc3VsdCxcbiAgICAgIHN0YW1wLFxuICAgICAgdGhpc0FyZyxcbiAgICAgIHRpbWVvdXRJZCxcbiAgICAgIHRyYWlsaW5nQ2FsbCxcbiAgICAgIGxhc3RDYWxsZWQgPSAwLFxuICAgICAgbWF4V2FpdCA9IGZhbHNlLFxuICAgICAgdHJhaWxpbmcgPSB0cnVlO1xuXG4gIGlmICghaXNGdW5jdGlvbihmdW5jKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3I7XG4gIH1cbiAgd2FpdCA9IG5hdGl2ZU1heCgwLCB3YWl0KSB8fCAwO1xuICBpZiAob3B0aW9ucyA9PT0gdHJ1ZSkge1xuICAgIHZhciBsZWFkaW5nID0gdHJ1ZTtcbiAgICB0cmFpbGluZyA9IGZhbHNlO1xuICB9IGVsc2UgaWYgKGlzT2JqZWN0KG9wdGlvbnMpKSB7XG4gICAgbGVhZGluZyA9IG9wdGlvbnMubGVhZGluZztcbiAgICBtYXhXYWl0ID0gJ21heFdhaXQnIGluIG9wdGlvbnMgJiYgKG5hdGl2ZU1heCh3YWl0LCBvcHRpb25zLm1heFdhaXQpIHx8IDApO1xuICAgIHRyYWlsaW5nID0gJ3RyYWlsaW5nJyBpbiBvcHRpb25zID8gb3B0aW9ucy50cmFpbGluZyA6IHRyYWlsaW5nO1xuICB9XG4gIHZhciBkZWxheWVkID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJlbWFpbmluZyA9IHdhaXQgLSAobm93KCkgLSBzdGFtcCk7XG4gICAgaWYgKHJlbWFpbmluZyA8PSAwKSB7XG4gICAgICBpZiAobWF4VGltZW91dElkKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChtYXhUaW1lb3V0SWQpO1xuICAgICAgfVxuICAgICAgdmFyIGlzQ2FsbGVkID0gdHJhaWxpbmdDYWxsO1xuICAgICAgbWF4VGltZW91dElkID0gdGltZW91dElkID0gdHJhaWxpbmdDYWxsID0gdW5kZWZpbmVkO1xuICAgICAgaWYgKGlzQ2FsbGVkKSB7XG4gICAgICAgIGxhc3RDYWxsZWQgPSBub3coKTtcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcbiAgICAgICAgaWYgKCF0aW1lb3V0SWQgJiYgIW1heFRpbWVvdXRJZCkge1xuICAgICAgICAgIGFyZ3MgPSB0aGlzQXJnID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGRlbGF5ZWQsIHJlbWFpbmluZyk7XG4gICAgfVxuICB9O1xuXG4gIHZhciBtYXhEZWxheWVkID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRpbWVvdXRJZCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgfVxuICAgIG1heFRpbWVvdXRJZCA9IHRpbWVvdXRJZCA9IHRyYWlsaW5nQ2FsbCA9IHVuZGVmaW5lZDtcbiAgICBpZiAodHJhaWxpbmcgfHwgKG1heFdhaXQgIT09IHdhaXQpKSB7XG4gICAgICBsYXN0Q2FsbGVkID0gbm93KCk7XG4gICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xuICAgICAgaWYgKCF0aW1lb3V0SWQgJiYgIW1heFRpbWVvdXRJZCkge1xuICAgICAgICBhcmdzID0gdGhpc0FyZyA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgIHN0YW1wID0gbm93KCk7XG4gICAgdGhpc0FyZyA9IHRoaXM7XG4gICAgdHJhaWxpbmdDYWxsID0gdHJhaWxpbmcgJiYgKHRpbWVvdXRJZCB8fCAhbGVhZGluZyk7XG5cbiAgICBpZiAobWF4V2FpdCA9PT0gZmFsc2UpIHtcbiAgICAgIHZhciBsZWFkaW5nQ2FsbCA9IGxlYWRpbmcgJiYgIXRpbWVvdXRJZDtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCFtYXhUaW1lb3V0SWQgJiYgIWxlYWRpbmcpIHtcbiAgICAgICAgbGFzdENhbGxlZCA9IHN0YW1wO1xuICAgICAgfVxuICAgICAgdmFyIHJlbWFpbmluZyA9IG1heFdhaXQgLSAoc3RhbXAgLSBsYXN0Q2FsbGVkKSxcbiAgICAgICAgICBpc0NhbGxlZCA9IHJlbWFpbmluZyA8PSAwO1xuXG4gICAgICBpZiAoaXNDYWxsZWQpIHtcbiAgICAgICAgaWYgKG1heFRpbWVvdXRJZCkge1xuICAgICAgICAgIG1heFRpbWVvdXRJZCA9IGNsZWFyVGltZW91dChtYXhUaW1lb3V0SWQpO1xuICAgICAgICB9XG4gICAgICAgIGxhc3RDYWxsZWQgPSBzdGFtcDtcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKCFtYXhUaW1lb3V0SWQpIHtcbiAgICAgICAgbWF4VGltZW91dElkID0gc2V0VGltZW91dChtYXhEZWxheWVkLCByZW1haW5pbmcpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXNDYWxsZWQgJiYgdGltZW91dElkKSB7XG4gICAgICB0aW1lb3V0SWQgPSBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoIXRpbWVvdXRJZCAmJiB3YWl0ICE9PSBtYXhXYWl0KSB7XG4gICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGRlbGF5ZWQsIHdhaXQpO1xuICAgIH1cbiAgICBpZiAobGVhZGluZ0NhbGwpIHtcbiAgICAgIGlzQ2FsbGVkID0gdHJ1ZTtcbiAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XG4gICAgfVxuICAgIGlmIChpc0NhbGxlZCAmJiAhdGltZW91dElkICYmICFtYXhUaW1lb3V0SWQpIHtcbiAgICAgIGFyZ3MgPSB0aGlzQXJnID0gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBkZWJvdW5jZTtcbiIsIi8qKlxuICogTG8tRGFzaCAyLjQuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cDovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBtb2Rlcm4gZXhwb3J0cz1cIm5wbVwiIC1vIC4vbnBtL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuNS4yIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG52YXIgaXNOYXRpdmUgPSByZXF1aXJlKCdsb2Rhc2guX2lzbmF0aXZlJyk7XG5cbi8qKlxuICogR2V0cyB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0aGF0IGhhdmUgZWxhcHNlZCBzaW5jZSB0aGUgVW5peCBlcG9jaFxuICogKDEgSmFudWFyeSAxOTcwIDAwOjAwOjAwIFVUQykuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBVdGlsaXRpZXNcbiAqIEBleGFtcGxlXG4gKlxuICogdmFyIHN0YW1wID0gXy5ub3coKTtcbiAqIF8uZGVmZXIoZnVuY3Rpb24oKSB7IGNvbnNvbGUubG9nKF8ubm93KCkgLSBzdGFtcCk7IH0pO1xuICogLy8gPT4gbG9ncyB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBpdCB0b29rIGZvciB0aGUgZGVmZXJyZWQgZnVuY3Rpb24gdG8gYmUgY2FsbGVkXG4gKi9cbnZhciBub3cgPSBpc05hdGl2ZShub3cgPSBEYXRlLm5vdykgJiYgbm93IHx8IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5vdztcbiIsIi8qKlxuICogTG8tRGFzaCAyLjQuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cDovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBtb2Rlcm4gZXhwb3J0cz1cIm5wbVwiIC1vIC4vbnBtL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuNS4yIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG5cbi8qKiBVc2VkIGZvciBuYXRpdmUgbWV0aG9kIHJlZmVyZW5jZXMgKi9cbnZhciBvYmplY3RQcm90byA9IE9iamVjdC5wcm90b3R5cGU7XG5cbi8qKiBVc2VkIHRvIHJlc29sdmUgdGhlIGludGVybmFsIFtbQ2xhc3NdXSBvZiB2YWx1ZXMgKi9cbnZhciB0b1N0cmluZyA9IG9iamVjdFByb3RvLnRvU3RyaW5nO1xuXG4vKiogVXNlZCB0byBkZXRlY3QgaWYgYSBtZXRob2QgaXMgbmF0aXZlICovXG52YXIgcmVOYXRpdmUgPSBSZWdFeHAoJ14nICtcbiAgU3RyaW5nKHRvU3RyaW5nKVxuICAgIC5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxdXFxcXF0vZywgJ1xcXFwkJicpXG4gICAgLnJlcGxhY2UoL3RvU3RyaW5nfCBmb3IgW15cXF1dKy9nLCAnLio/JykgKyAnJCdcbik7XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYSBuYXRpdmUgZnVuY3Rpb24uXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBgdmFsdWVgIGlzIGEgbmF0aXZlIGZ1bmN0aW9uLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGlzTmF0aXZlKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ2Z1bmN0aW9uJyAmJiByZU5hdGl2ZS50ZXN0KHZhbHVlKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpc05hdGl2ZTtcbiIsIi8qKlxuICogTG8tRGFzaCAyLjQuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cDovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBtb2Rlcm4gZXhwb3J0cz1cIm5wbVwiIC1vIC4vbnBtL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuNS4yIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYSBmdW5jdGlvbi5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IE9iamVjdHNcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBgdmFsdWVgIGlzIGEgZnVuY3Rpb24sIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc0Z1bmN0aW9uKF8pO1xuICogLy8gPT4gdHJ1ZVxuICovXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ2Z1bmN0aW9uJztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpc0Z1bmN0aW9uO1xuIiwiLyoqXG4gKiBMby1EYXNoIDIuNC4xIChDdXN0b20gQnVpbGQpIDxodHRwOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIG1vZGVybiBleHBvcnRzPVwibnBtXCIgLW8gLi9ucG0vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxMyBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS41LjIgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHA6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cbnZhciBvYmplY3RUeXBlcyA9IHJlcXVpcmUoJ2xvZGFzaC5fb2JqZWN0dHlwZXMnKTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyB0aGUgbGFuZ3VhZ2UgdHlwZSBvZiBPYmplY3QuXG4gKiAoZS5nLiBhcnJheXMsIGZ1bmN0aW9ucywgb2JqZWN0cywgcmVnZXhlcywgYG5ldyBOdW1iZXIoMClgLCBhbmQgYG5ldyBTdHJpbmcoJycpYClcbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IE9iamVjdHNcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBgdmFsdWVgIGlzIGFuIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzT2JqZWN0KHt9KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0KFsxLCAyLCAzXSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdCgxKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gIC8vIGNoZWNrIGlmIHRoZSB2YWx1ZSBpcyB0aGUgRUNNQVNjcmlwdCBsYW5ndWFnZSB0eXBlIG9mIE9iamVjdFxuICAvLyBodHRwOi8vZXM1LmdpdGh1Yi5pby8jeDhcbiAgLy8gYW5kIGF2b2lkIGEgVjggYnVnXG4gIC8vIGh0dHA6Ly9jb2RlLmdvb2dsZS5jb20vcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTIyOTFcbiAgcmV0dXJuICEhKHZhbHVlICYmIG9iamVjdFR5cGVzW3R5cGVvZiB2YWx1ZV0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlzT2JqZWN0O1xuIiwiLyoqXG4gKiBMby1EYXNoIDIuNC4xIChDdXN0b20gQnVpbGQpIDxodHRwOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIG1vZGVybiBleHBvcnRzPVwibnBtXCIgLW8gLi9ucG0vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxMyBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS41LjIgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHA6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cblxuLyoqIFVzZWQgdG8gZGV0ZXJtaW5lIGlmIHZhbHVlcyBhcmUgb2YgdGhlIGxhbmd1YWdlIHR5cGUgT2JqZWN0ICovXG52YXIgb2JqZWN0VHlwZXMgPSB7XG4gICdib29sZWFuJzogZmFsc2UsXG4gICdmdW5jdGlvbic6IHRydWUsXG4gICdvYmplY3QnOiB0cnVlLFxuICAnbnVtYmVyJzogZmFsc2UsXG4gICdzdHJpbmcnOiBmYWxzZSxcbiAgJ3VuZGVmaW5lZCc6IGZhbHNlXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG9iamVjdFR5cGVzO1xuIiwidmFyIHNwbGl0ID0gcmVxdWlyZSgnYnJvd3Nlci1zcGxpdCcpXG52YXIgQ2xhc3NMaXN0ID0gcmVxdWlyZSgnY2xhc3MtbGlzdCcpXG5yZXF1aXJlKCdodG1sLWVsZW1lbnQnKVxuXG5mdW5jdGlvbiBjb250ZXh0ICgpIHtcblxuICB2YXIgY2xlYW51cEZ1bmNzID0gW11cblxuICBmdW5jdGlvbiBoKCkge1xuICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpLCBlID0gbnVsbFxuICAgIGZ1bmN0aW9uIGl0ZW0gKGwpIHtcbiAgICAgIHZhciByXG4gICAgICBmdW5jdGlvbiBwYXJzZUNsYXNzIChzdHJpbmcpIHtcbiAgICAgICAgdmFyIG0gPSBzcGxpdChzdHJpbmcsIC8oW1xcLiNdP1thLXpBLVowLTlfOi1dKykvKVxuICAgICAgICBpZigvXlxcLnwjLy50ZXN0KG1bMV0pKVxuICAgICAgICAgIGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgICAgICBmb3JFYWNoKG0sIGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgdmFyIHMgPSB2LnN1YnN0cmluZygxLHYubGVuZ3RoKVxuICAgICAgICAgIGlmKCF2KSByZXR1cm5cbiAgICAgICAgICBpZighZSlcbiAgICAgICAgICAgIGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHYpXG4gICAgICAgICAgZWxzZSBpZiAodlswXSA9PT0gJy4nKVxuICAgICAgICAgICAgQ2xhc3NMaXN0KGUpLmFkZChzKVxuICAgICAgICAgIGVsc2UgaWYgKHZbMF0gPT09ICcjJylcbiAgICAgICAgICAgIGUuc2V0QXR0cmlidXRlKCdpZCcsIHMpXG4gICAgICAgIH0pXG4gICAgICB9XG5cbiAgICAgIGlmKGwgPT0gbnVsbClcbiAgICAgICAgO1xuICAgICAgZWxzZSBpZignc3RyaW5nJyA9PT0gdHlwZW9mIGwpIHtcbiAgICAgICAgaWYoIWUpXG4gICAgICAgICAgcGFyc2VDbGFzcyhsKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgZS5hcHBlbmRDaGlsZChyID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUobCkpXG4gICAgICB9XG4gICAgICBlbHNlIGlmKCdudW1iZXInID09PSB0eXBlb2YgbFxuICAgICAgICB8fCAnYm9vbGVhbicgPT09IHR5cGVvZiBsXG4gICAgICAgIHx8IGwgaW5zdGFuY2VvZiBEYXRlXG4gICAgICAgIHx8IGwgaW5zdGFuY2VvZiBSZWdFeHAgKSB7XG4gICAgICAgICAgZS5hcHBlbmRDaGlsZChyID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUobC50b1N0cmluZygpKSlcbiAgICAgIH1cbiAgICAgIC8vdGhlcmUgbWlnaHQgYmUgYSBiZXR0ZXIgd2F5IHRvIGhhbmRsZSB0aGlzLi4uXG4gICAgICBlbHNlIGlmIChpc0FycmF5KGwpKVxuICAgICAgICBmb3JFYWNoKGwsIGl0ZW0pXG4gICAgICBlbHNlIGlmKGlzTm9kZShsKSlcbiAgICAgICAgZS5hcHBlbmRDaGlsZChyID0gbClcbiAgICAgIGVsc2UgaWYobCBpbnN0YW5jZW9mIFRleHQpXG4gICAgICAgIGUuYXBwZW5kQ2hpbGQociA9IGwpXG4gICAgICBlbHNlIGlmICgnb2JqZWN0JyA9PT0gdHlwZW9mIGwpIHtcbiAgICAgICAgZm9yICh2YXIgayBpbiBsKSB7XG4gICAgICAgICAgaWYoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGxba10pIHtcbiAgICAgICAgICAgIGlmKC9eb25cXHcrLy50ZXN0KGspKSB7XG4gICAgICAgICAgICAgIGlmIChlLmFkZEV2ZW50TGlzdGVuZXIpe1xuICAgICAgICAgICAgICAgIGUuYWRkRXZlbnRMaXN0ZW5lcihrLnN1YnN0cmluZygyKSwgbFtrXSwgZmFsc2UpXG4gICAgICAgICAgICAgICAgY2xlYW51cEZ1bmNzLnB1c2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgIGUucmVtb3ZlRXZlbnRMaXN0ZW5lcihrLnN1YnN0cmluZygyKSwgbFtrXSwgZmFsc2UpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgICAgZS5hdHRhY2hFdmVudChrLCBsW2tdKVxuICAgICAgICAgICAgICAgIGNsZWFudXBGdW5jcy5wdXNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICBlLmRldGFjaEV2ZW50KGssIGxba10pXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gb2JzZXJ2YWJsZVxuICAgICAgICAgICAgICBlW2tdID0gbFtrXSgpXG4gICAgICAgICAgICAgIGNsZWFudXBGdW5jcy5wdXNoKGxba10oZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgICAgICBlW2tdID0gdlxuICAgICAgICAgICAgICB9KSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgZWxzZSBpZihrID09PSAnc3R5bGUnKSB7XG4gICAgICAgICAgICBpZignc3RyaW5nJyA9PT0gdHlwZW9mIGxba10pIHtcbiAgICAgICAgICAgICAgZS5zdHlsZS5jc3NUZXh0ID0gbFtrXVxuICAgICAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAgIGZvciAodmFyIHMgaW4gbFtrXSkgKGZ1bmN0aW9uKHMsIHYpIHtcbiAgICAgICAgICAgICAgICBpZignZnVuY3Rpb24nID09PSB0eXBlb2Ygdikge1xuICAgICAgICAgICAgICAgICAgLy8gb2JzZXJ2YWJsZVxuICAgICAgICAgICAgICAgICAgZS5zdHlsZS5zZXRQcm9wZXJ0eShzLCB2KCkpXG4gICAgICAgICAgICAgICAgICBjbGVhbnVwRnVuY3MucHVzaCh2KGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgZS5zdHlsZS5zZXRQcm9wZXJ0eShzLCB2YWwpXG4gICAgICAgICAgICAgICAgICB9KSlcbiAgICAgICAgICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgICAgICAgIGUuc3R5bGUuc2V0UHJvcGVydHkocywgbFtrXVtzXSlcbiAgICAgICAgICAgICAgfSkocywgbFtrXVtzXSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgaWYgKGsuc3Vic3RyKDAsIDUpID09PSBcImRhdGEtXCIpIHtcbiAgICAgICAgICAgIGUuc2V0QXR0cmlidXRlKGssIGxba10pXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVba10gPSBsW2tdXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBsKSB7XG4gICAgICAgIC8vYXNzdW1lIGl0J3MgYW4gb2JzZXJ2YWJsZSFcbiAgICAgICAgdmFyIHYgPSBsKClcbiAgICAgICAgZS5hcHBlbmRDaGlsZChyID0gaXNOb2RlKHYpID8gdiA6IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHYpKVxuXG4gICAgICAgIGNsZWFudXBGdW5jcy5wdXNoKGwoZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICBpZihpc05vZGUodikgJiYgci5wYXJlbnRFbGVtZW50KVxuICAgICAgICAgICAgci5wYXJlbnRFbGVtZW50LnJlcGxhY2VDaGlsZCh2LCByKSwgciA9IHZcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICByLnRleHRDb250ZW50ID0gdlxuICAgICAgICB9KSlcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJcbiAgICB9XG4gICAgd2hpbGUoYXJncy5sZW5ndGgpXG4gICAgICBpdGVtKGFyZ3Muc2hpZnQoKSlcblxuICAgIHJldHVybiBlXG4gIH1cblxuICBoLmNsZWFudXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjbGVhbnVwRnVuY3MubGVuZ3RoOyBpKyspe1xuICAgICAgY2xlYW51cEZ1bmNzW2ldKClcbiAgICB9XG4gIH1cblxuICByZXR1cm4gaFxufVxuXG52YXIgaCA9IG1vZHVsZS5leHBvcnRzID0gY29udGV4dCgpXG5oLmNvbnRleHQgPSBjb250ZXh0XG5cbmZ1bmN0aW9uIGlzTm9kZSAoZWwpIHtcbiAgcmV0dXJuIGVsICYmIGVsLm5vZGVOYW1lICYmIGVsLm5vZGVUeXBlXG59XG5cbmZ1bmN0aW9uIGlzVGV4dCAoZWwpIHtcbiAgcmV0dXJuIGVsICYmIGVsLm5vZGVOYW1lID09PSAnI3RleHQnICYmIGVsLm5vZGVUeXBlID09IDNcbn1cblxuZnVuY3Rpb24gZm9yRWFjaCAoYXJyLCBmbikge1xuICBpZiAoYXJyLmZvckVhY2gpIHJldHVybiBhcnIuZm9yRWFjaChmbilcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIGZuKGFycltpXSwgaSlcbn1cblxuZnVuY3Rpb24gaXNBcnJheSAoYXJyKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJyKSA9PSAnW29iamVjdCBBcnJheV0nXG59XG4iLCIvKiFcbiAqIENyb3NzLUJyb3dzZXIgU3BsaXQgMS4xLjFcbiAqIENvcHlyaWdodCAyMDA3LTIwMTIgU3RldmVuIExldml0aGFuIDxzdGV2ZW5sZXZpdGhhbi5jb20+XG4gKiBBdmFpbGFibGUgdW5kZXIgdGhlIE1JVCBMaWNlbnNlXG4gKiBFQ01BU2NyaXB0IGNvbXBsaWFudCwgdW5pZm9ybSBjcm9zcy1icm93c2VyIHNwbGl0IG1ldGhvZFxuICovXG5cbi8qKlxuICogU3BsaXRzIGEgc3RyaW5nIGludG8gYW4gYXJyYXkgb2Ygc3RyaW5ncyB1c2luZyBhIHJlZ2V4IG9yIHN0cmluZyBzZXBhcmF0b3IuIE1hdGNoZXMgb2YgdGhlXG4gKiBzZXBhcmF0b3IgYXJlIG5vdCBpbmNsdWRlZCBpbiB0aGUgcmVzdWx0IGFycmF5LiBIb3dldmVyLCBpZiBgc2VwYXJhdG9yYCBpcyBhIHJlZ2V4IHRoYXQgY29udGFpbnNcbiAqIGNhcHR1cmluZyBncm91cHMsIGJhY2tyZWZlcmVuY2VzIGFyZSBzcGxpY2VkIGludG8gdGhlIHJlc3VsdCBlYWNoIHRpbWUgYHNlcGFyYXRvcmAgaXMgbWF0Y2hlZC5cbiAqIEZpeGVzIGJyb3dzZXIgYnVncyBjb21wYXJlZCB0byB0aGUgbmF0aXZlIGBTdHJpbmcucHJvdG90eXBlLnNwbGl0YCBhbmQgY2FuIGJlIHVzZWQgcmVsaWFibHlcbiAqIGNyb3NzLWJyb3dzZXIuXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyIFN0cmluZyB0byBzcGxpdC5cbiAqIEBwYXJhbSB7UmVnRXhwfFN0cmluZ30gc2VwYXJhdG9yIFJlZ2V4IG9yIHN0cmluZyB0byB1c2UgZm9yIHNlcGFyYXRpbmcgdGhlIHN0cmluZy5cbiAqIEBwYXJhbSB7TnVtYmVyfSBbbGltaXRdIE1heGltdW0gbnVtYmVyIG9mIGl0ZW1zIHRvIGluY2x1ZGUgaW4gdGhlIHJlc3VsdCBhcnJheS5cbiAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2Ygc3Vic3RyaW5ncy5cbiAqIEBleGFtcGxlXG4gKlxuICogLy8gQmFzaWMgdXNlXG4gKiBzcGxpdCgnYSBiIGMgZCcsICcgJyk7XG4gKiAvLyAtPiBbJ2EnLCAnYicsICdjJywgJ2QnXVxuICpcbiAqIC8vIFdpdGggbGltaXRcbiAqIHNwbGl0KCdhIGIgYyBkJywgJyAnLCAyKTtcbiAqIC8vIC0+IFsnYScsICdiJ11cbiAqXG4gKiAvLyBCYWNrcmVmZXJlbmNlcyBpbiByZXN1bHQgYXJyYXlcbiAqIHNwbGl0KCcuLndvcmQxIHdvcmQyLi4nLCAvKFthLXpdKykoXFxkKykvaSk7XG4gKiAvLyAtPiBbJy4uJywgJ3dvcmQnLCAnMScsICcgJywgJ3dvcmQnLCAnMicsICcuLiddXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uIHNwbGl0KHVuZGVmKSB7XG5cbiAgdmFyIG5hdGl2ZVNwbGl0ID0gU3RyaW5nLnByb3RvdHlwZS5zcGxpdCxcbiAgICBjb21wbGlhbnRFeGVjTnBjZyA9IC8oKT8/Ly5leGVjKFwiXCIpWzFdID09PSB1bmRlZixcbiAgICAvLyBOUENHOiBub25wYXJ0aWNpcGF0aW5nIGNhcHR1cmluZyBncm91cFxuICAgIHNlbGY7XG5cbiAgc2VsZiA9IGZ1bmN0aW9uKHN0ciwgc2VwYXJhdG9yLCBsaW1pdCkge1xuICAgIC8vIElmIGBzZXBhcmF0b3JgIGlzIG5vdCBhIHJlZ2V4LCB1c2UgYG5hdGl2ZVNwbGl0YFxuICAgIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoc2VwYXJhdG9yKSAhPT0gXCJbb2JqZWN0IFJlZ0V4cF1cIikge1xuICAgICAgcmV0dXJuIG5hdGl2ZVNwbGl0LmNhbGwoc3RyLCBzZXBhcmF0b3IsIGxpbWl0KTtcbiAgICB9XG4gICAgdmFyIG91dHB1dCA9IFtdLFxuICAgICAgZmxhZ3MgPSAoc2VwYXJhdG9yLmlnbm9yZUNhc2UgPyBcImlcIiA6IFwiXCIpICsgKHNlcGFyYXRvci5tdWx0aWxpbmUgPyBcIm1cIiA6IFwiXCIpICsgKHNlcGFyYXRvci5leHRlbmRlZCA/IFwieFwiIDogXCJcIikgKyAvLyBQcm9wb3NlZCBmb3IgRVM2XG4gICAgICAoc2VwYXJhdG9yLnN0aWNreSA/IFwieVwiIDogXCJcIiksXG4gICAgICAvLyBGaXJlZm94IDMrXG4gICAgICBsYXN0TGFzdEluZGV4ID0gMCxcbiAgICAgIC8vIE1ha2UgYGdsb2JhbGAgYW5kIGF2b2lkIGBsYXN0SW5kZXhgIGlzc3VlcyBieSB3b3JraW5nIHdpdGggYSBjb3B5XG4gICAgICBzZXBhcmF0b3IgPSBuZXcgUmVnRXhwKHNlcGFyYXRvci5zb3VyY2UsIGZsYWdzICsgXCJnXCIpLFxuICAgICAgc2VwYXJhdG9yMiwgbWF0Y2gsIGxhc3RJbmRleCwgbGFzdExlbmd0aDtcbiAgICBzdHIgKz0gXCJcIjsgLy8gVHlwZS1jb252ZXJ0XG4gICAgaWYgKCFjb21wbGlhbnRFeGVjTnBjZykge1xuICAgICAgLy8gRG9lc24ndCBuZWVkIGZsYWdzIGd5LCBidXQgdGhleSBkb24ndCBodXJ0XG4gICAgICBzZXBhcmF0b3IyID0gbmV3IFJlZ0V4cChcIl5cIiArIHNlcGFyYXRvci5zb3VyY2UgKyBcIiQoPyFcXFxccylcIiwgZmxhZ3MpO1xuICAgIH1cbiAgICAvKiBWYWx1ZXMgZm9yIGBsaW1pdGAsIHBlciB0aGUgc3BlYzpcbiAgICAgKiBJZiB1bmRlZmluZWQ6IDQyOTQ5NjcyOTUgLy8gTWF0aC5wb3coMiwgMzIpIC0gMVxuICAgICAqIElmIDAsIEluZmluaXR5LCBvciBOYU46IDBcbiAgICAgKiBJZiBwb3NpdGl2ZSBudW1iZXI6IGxpbWl0ID0gTWF0aC5mbG9vcihsaW1pdCk7IGlmIChsaW1pdCA+IDQyOTQ5NjcyOTUpIGxpbWl0IC09IDQyOTQ5NjcyOTY7XG4gICAgICogSWYgbmVnYXRpdmUgbnVtYmVyOiA0Mjk0OTY3Mjk2IC0gTWF0aC5mbG9vcihNYXRoLmFicyhsaW1pdCkpXG4gICAgICogSWYgb3RoZXI6IFR5cGUtY29udmVydCwgdGhlbiB1c2UgdGhlIGFib3ZlIHJ1bGVzXG4gICAgICovXG4gICAgbGltaXQgPSBsaW1pdCA9PT0gdW5kZWYgPyAtMSA+Pj4gMCA6IC8vIE1hdGgucG93KDIsIDMyKSAtIDFcbiAgICBsaW1pdCA+Pj4gMDsgLy8gVG9VaW50MzIobGltaXQpXG4gICAgd2hpbGUgKG1hdGNoID0gc2VwYXJhdG9yLmV4ZWMoc3RyKSkge1xuICAgICAgLy8gYHNlcGFyYXRvci5sYXN0SW5kZXhgIGlzIG5vdCByZWxpYWJsZSBjcm9zcy1icm93c2VyXG4gICAgICBsYXN0SW5kZXggPSBtYXRjaC5pbmRleCArIG1hdGNoWzBdLmxlbmd0aDtcbiAgICAgIGlmIChsYXN0SW5kZXggPiBsYXN0TGFzdEluZGV4KSB7XG4gICAgICAgIG91dHB1dC5wdXNoKHN0ci5zbGljZShsYXN0TGFzdEluZGV4LCBtYXRjaC5pbmRleCkpO1xuICAgICAgICAvLyBGaXggYnJvd3NlcnMgd2hvc2UgYGV4ZWNgIG1ldGhvZHMgZG9uJ3QgY29uc2lzdGVudGx5IHJldHVybiBgdW5kZWZpbmVkYCBmb3JcbiAgICAgICAgLy8gbm9ucGFydGljaXBhdGluZyBjYXB0dXJpbmcgZ3JvdXBzXG4gICAgICAgIGlmICghY29tcGxpYW50RXhlY05wY2cgJiYgbWF0Y2gubGVuZ3RoID4gMSkge1xuICAgICAgICAgIG1hdGNoWzBdLnJlcGxhY2Uoc2VwYXJhdG9yMiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGggLSAyOyBpKyspIHtcbiAgICAgICAgICAgICAgaWYgKGFyZ3VtZW50c1tpXSA9PT0gdW5kZWYpIHtcbiAgICAgICAgICAgICAgICBtYXRjaFtpXSA9IHVuZGVmO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1hdGNoLmxlbmd0aCA+IDEgJiYgbWF0Y2guaW5kZXggPCBzdHIubGVuZ3RoKSB7XG4gICAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkob3V0cHV0LCBtYXRjaC5zbGljZSgxKSk7XG4gICAgICAgIH1cbiAgICAgICAgbGFzdExlbmd0aCA9IG1hdGNoWzBdLmxlbmd0aDtcbiAgICAgICAgbGFzdExhc3RJbmRleCA9IGxhc3RJbmRleDtcbiAgICAgICAgaWYgKG91dHB1dC5sZW5ndGggPj0gbGltaXQpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHNlcGFyYXRvci5sYXN0SW5kZXggPT09IG1hdGNoLmluZGV4KSB7XG4gICAgICAgIHNlcGFyYXRvci5sYXN0SW5kZXgrKzsgLy8gQXZvaWQgYW4gaW5maW5pdGUgbG9vcFxuICAgICAgfVxuICAgIH1cbiAgICBpZiAobGFzdExhc3RJbmRleCA9PT0gc3RyLmxlbmd0aCkge1xuICAgICAgaWYgKGxhc3RMZW5ndGggfHwgIXNlcGFyYXRvci50ZXN0KFwiXCIpKSB7XG4gICAgICAgIG91dHB1dC5wdXNoKFwiXCIpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXQucHVzaChzdHIuc2xpY2UobGFzdExhc3RJbmRleCkpO1xuICAgIH1cbiAgICByZXR1cm4gb3V0cHV0Lmxlbmd0aCA+IGxpbWl0ID8gb3V0cHV0LnNsaWNlKDAsIGxpbWl0KSA6IG91dHB1dDtcbiAgfTtcblxuICByZXR1cm4gc2VsZjtcbn0pKCk7XG4iLCIvLyBjb250YWlucywgYWRkLCByZW1vdmUsIHRvZ2dsZVxudmFyIGluZGV4b2YgPSByZXF1aXJlKCdpbmRleG9mJylcblxubW9kdWxlLmV4cG9ydHMgPSBDbGFzc0xpc3RcblxuZnVuY3Rpb24gQ2xhc3NMaXN0KGVsZW0pIHtcbiAgICB2YXIgY2wgPSBlbGVtLmNsYXNzTGlzdFxuXG4gICAgaWYgKGNsKSB7XG4gICAgICAgIHJldHVybiBjbFxuICAgIH1cblxuICAgIHZhciBjbGFzc0xpc3QgPSB7XG4gICAgICAgIGFkZDogYWRkXG4gICAgICAgICwgcmVtb3ZlOiByZW1vdmVcbiAgICAgICAgLCBjb250YWluczogY29udGFpbnNcbiAgICAgICAgLCB0b2dnbGU6IHRvZ2dsZVxuICAgICAgICAsIHRvU3RyaW5nOiAkdG9TdHJpbmdcbiAgICAgICAgLCBsZW5ndGg6IDBcbiAgICAgICAgLCBpdGVtOiBpdGVtXG4gICAgfVxuXG4gICAgcmV0dXJuIGNsYXNzTGlzdFxuXG4gICAgZnVuY3Rpb24gYWRkKHRva2VuKSB7XG4gICAgICAgIHZhciBsaXN0ID0gZ2V0VG9rZW5zKClcbiAgICAgICAgaWYgKGluZGV4b2YobGlzdCwgdG9rZW4pID4gLTEpIHtcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICAgIGxpc3QucHVzaCh0b2tlbilcbiAgICAgICAgc2V0VG9rZW5zKGxpc3QpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVtb3ZlKHRva2VuKSB7XG4gICAgICAgIHZhciBsaXN0ID0gZ2V0VG9rZW5zKClcbiAgICAgICAgICAgICwgaW5kZXggPSBpbmRleG9mKGxpc3QsIHRva2VuKVxuXG4gICAgICAgIGlmIChpbmRleCA9PT0gLTEpIHtcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG5cbiAgICAgICAgbGlzdC5zcGxpY2UoaW5kZXgsIDEpXG4gICAgICAgIHNldFRva2VucyhsaXN0KVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbnRhaW5zKHRva2VuKSB7XG4gICAgICAgIHJldHVybiBpbmRleG9mKGdldFRva2VucygpLCB0b2tlbikgPiAtMVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRvZ2dsZSh0b2tlbikge1xuICAgICAgICBpZiAoY29udGFpbnModG9rZW4pKSB7XG4gICAgICAgICAgICByZW1vdmUodG9rZW4pXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFkZCh0b2tlbilcbiAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiAkdG9TdHJpbmcoKSB7XG4gICAgICAgIHJldHVybiBlbGVtLmNsYXNzTmFtZVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGl0ZW0oaW5kZXgpIHtcbiAgICAgICAgdmFyIHRva2VucyA9IGdldFRva2VucygpXG4gICAgICAgIHJldHVybiB0b2tlbnNbaW5kZXhdIHx8IG51bGxcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRUb2tlbnMoKSB7XG4gICAgICAgIHZhciBjbGFzc05hbWUgPSBlbGVtLmNsYXNzTmFtZVxuXG4gICAgICAgIHJldHVybiBmaWx0ZXIoY2xhc3NOYW1lLnNwbGl0KFwiIFwiKSwgaXNUcnV0aHkpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0VG9rZW5zKGxpc3QpIHtcbiAgICAgICAgdmFyIGxlbmd0aCA9IGxpc3QubGVuZ3RoXG5cbiAgICAgICAgZWxlbS5jbGFzc05hbWUgPSBsaXN0LmpvaW4oXCIgXCIpXG4gICAgICAgIGNsYXNzTGlzdC5sZW5ndGggPSBsZW5ndGhcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGNsYXNzTGlzdFtpXSA9IGxpc3RbaV1cbiAgICAgICAgfVxuXG4gICAgICAgIGRlbGV0ZSBsaXN0W2xlbmd0aF1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIGZpbHRlciAoYXJyLCBmbikge1xuICAgIHZhciByZXQgPSBbXVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChmbihhcnJbaV0pKSByZXQucHVzaChhcnJbaV0pXG4gICAgfVxuICAgIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gaXNUcnV0aHkodmFsdWUpIHtcbiAgICByZXR1cm4gISF2YWx1ZVxufVxuIiwiXG52YXIgaW5kZXhPZiA9IFtdLmluZGV4T2Y7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oYXJyLCBvYmope1xuICBpZiAoaW5kZXhPZikgcmV0dXJuIGFyci5pbmRleE9mKG9iaik7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgKytpKSB7XG4gICAgaWYgKGFycltpXSA9PT0gb2JqKSByZXR1cm4gaTtcbiAgfVxuICByZXR1cm4gLTE7XG59OyIsInZhciBub3cgPSByZXF1aXJlKCdwZXJmb3JtYW5jZS1ub3cnKVxuICAsIGdsb2JhbCA9IHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnID8ge30gOiB3aW5kb3dcbiAgLCB2ZW5kb3JzID0gWydtb3onLCAnd2Via2l0J11cbiAgLCBzdWZmaXggPSAnQW5pbWF0aW9uRnJhbWUnXG4gICwgcmFmID0gZ2xvYmFsWydyZXF1ZXN0JyArIHN1ZmZpeF1cbiAgLCBjYWYgPSBnbG9iYWxbJ2NhbmNlbCcgKyBzdWZmaXhdIHx8IGdsb2JhbFsnY2FuY2VsUmVxdWVzdCcgKyBzdWZmaXhdXG4gICwgaXNOYXRpdmUgPSB0cnVlXG5cbmZvcih2YXIgaSA9IDA7IGkgPCB2ZW5kb3JzLmxlbmd0aCAmJiAhcmFmOyBpKyspIHtcbiAgcmFmID0gZ2xvYmFsW3ZlbmRvcnNbaV0gKyAnUmVxdWVzdCcgKyBzdWZmaXhdXG4gIGNhZiA9IGdsb2JhbFt2ZW5kb3JzW2ldICsgJ0NhbmNlbCcgKyBzdWZmaXhdXG4gICAgICB8fCBnbG9iYWxbdmVuZG9yc1tpXSArICdDYW5jZWxSZXF1ZXN0JyArIHN1ZmZpeF1cbn1cblxuLy8gU29tZSB2ZXJzaW9ucyBvZiBGRiBoYXZlIHJBRiBidXQgbm90IGNBRlxuaWYoIXJhZiB8fCAhY2FmKSB7XG4gIGlzTmF0aXZlID0gZmFsc2VcblxuICB2YXIgbGFzdCA9IDBcbiAgICAsIGlkID0gMFxuICAgICwgcXVldWUgPSBbXVxuICAgICwgZnJhbWVEdXJhdGlvbiA9IDEwMDAgLyA2MFxuXG4gIHJhZiA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgaWYocXVldWUubGVuZ3RoID09PSAwKSB7XG4gICAgICB2YXIgX25vdyA9IG5vdygpXG4gICAgICAgICwgbmV4dCA9IE1hdGgubWF4KDAsIGZyYW1lRHVyYXRpb24gLSAoX25vdyAtIGxhc3QpKVxuICAgICAgbGFzdCA9IG5leHQgKyBfbm93XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgY3AgPSBxdWV1ZS5zbGljZSgwKVxuICAgICAgICAvLyBDbGVhciBxdWV1ZSBoZXJlIHRvIHByZXZlbnRcbiAgICAgICAgLy8gY2FsbGJhY2tzIGZyb20gYXBwZW5kaW5nIGxpc3RlbmVyc1xuICAgICAgICAvLyB0byB0aGUgY3VycmVudCBmcmFtZSdzIHF1ZXVlXG4gICAgICAgIHF1ZXVlLmxlbmd0aCA9IDBcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGNwLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYoIWNwW2ldLmNhbmNlbGxlZCkge1xuICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICBjcFtpXS5jYWxsYmFjayhsYXN0KVxuICAgICAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IHRocm93IGUgfSwgMClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sIE1hdGgucm91bmQobmV4dCkpXG4gICAgfVxuICAgIHF1ZXVlLnB1c2goe1xuICAgICAgaGFuZGxlOiArK2lkLFxuICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrLFxuICAgICAgY2FuY2VsbGVkOiBmYWxzZVxuICAgIH0pXG4gICAgcmV0dXJuIGlkXG4gIH1cblxuICBjYWYgPSBmdW5jdGlvbihoYW5kbGUpIHtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgcXVldWUubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmKHF1ZXVlW2ldLmhhbmRsZSA9PT0gaGFuZGxlKSB7XG4gICAgICAgIHF1ZXVlW2ldLmNhbmNlbGxlZCA9IHRydWVcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihmbikge1xuICAvLyBXcmFwIGluIGEgbmV3IGZ1bmN0aW9uIHRvIHByZXZlbnRcbiAgLy8gYGNhbmNlbGAgcG90ZW50aWFsbHkgYmVpbmcgYXNzaWduZWRcbiAgLy8gdG8gdGhlIG5hdGl2ZSByQUYgZnVuY3Rpb25cbiAgaWYoIWlzTmF0aXZlKSB7XG4gICAgcmV0dXJuIHJhZi5jYWxsKGdsb2JhbCwgZm4pXG4gIH1cbiAgcmV0dXJuIHJhZi5jYWxsKGdsb2JhbCwgZnVuY3Rpb24oKSB7XG4gICAgdHJ5e1xuICAgICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgIH0gY2F0Y2goZSkge1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgdGhyb3cgZSB9LCAwKVxuICAgIH1cbiAgfSlcbn1cbm1vZHVsZS5leHBvcnRzLmNhbmNlbCA9IGZ1bmN0aW9uKCkge1xuICBjYWYuYXBwbHkoZ2xvYmFsLCBhcmd1bWVudHMpXG59XG4iLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuLy8gR2VuZXJhdGVkIGJ5IENvZmZlZVNjcmlwdCAxLjYuM1xuKGZ1bmN0aW9uKCkge1xuICB2YXIgZ2V0TmFub1NlY29uZHMsIGhydGltZSwgbG9hZFRpbWU7XG5cbiAgaWYgKCh0eXBlb2YgcGVyZm9ybWFuY2UgIT09IFwidW5kZWZpbmVkXCIgJiYgcGVyZm9ybWFuY2UgIT09IG51bGwpICYmIHBlcmZvcm1hbmNlLm5vdykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgfTtcbiAgfSBlbHNlIGlmICgodHlwZW9mIHByb2Nlc3MgIT09IFwidW5kZWZpbmVkXCIgJiYgcHJvY2VzcyAhPT0gbnVsbCkgJiYgcHJvY2Vzcy5ocnRpbWUpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIChnZXROYW5vU2Vjb25kcygpIC0gbG9hZFRpbWUpIC8gMWU2O1xuICAgIH07XG4gICAgaHJ0aW1lID0gcHJvY2Vzcy5ocnRpbWU7XG4gICAgZ2V0TmFub1NlY29uZHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBocjtcbiAgICAgIGhyID0gaHJ0aW1lKCk7XG4gICAgICByZXR1cm4gaHJbMF0gKiAxZTkgKyBoclsxXTtcbiAgICB9O1xuICAgIGxvYWRUaW1lID0gZ2V0TmFub1NlY29uZHMoKTtcbiAgfSBlbHNlIGlmIChEYXRlLm5vdykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gRGF0ZS5ub3coKSAtIGxvYWRUaW1lO1xuICAgIH07XG4gICAgbG9hZFRpbWUgPSBEYXRlLm5vdygpO1xuICB9IGVsc2Uge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCkgLSBsb2FkVGltZTtcbiAgICB9O1xuICAgIGxvYWRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIH1cblxufSkuY2FsbCh0aGlzKTtcblxuLypcbi8vQCBzb3VyY2VNYXBwaW5nVVJMPXBlcmZvcm1hbmNlLW5vdy5tYXBcbiovXG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKCdfcHJvY2VzcycpKSIsInZhciByZXN1bHQgPSBbJyMzMEZGRDYnLFxuICAgICAgICAgICAgICAnIzcyRUVENicsXG4gICAgICAgICAgICAgICcjMURCRjlGJyxcbiAgICAgICAgICAgICAgJyM2NUYwQjknLFxuICAgICAgICAgICAgICAnIzU3RkM5MycsXG4gICAgICAgICAgICAgICcjOThGRkJFJyxcbiAgICAgICAgICAgICAgJyNBMEZGOTgnXTtcbnZhciBteUludGVydmFsO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgc3RhcnQ6IHN0YXJ0LFxuICBlbmQ6IGVuZFxufVxuXG5mdW5jdGlvbiBzdGFydChlbCwgaW50ZXJ2YWwpIHtcbiAgdmFyIGwgPSAwO1xuICBteUludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgIGwrKztcbiAgICAgICAgICAgICAgICAgaWYgKGwgPj0gcmVzdWx0Lmxlbmd0aCkgbCA9IDA7XG4gICAgICAgICAgICAgICAgIGVsLnN0eWxlLmNvbG9yID0gcmVzdWx0W2xdO1xuICAgICAgICAgICAgICAgfSwgaW50ZXJ2YWwpO1xufVxuXG5mdW5jdGlvbiBlbmQoKSB7XG4gIGNsZWFySW50ZXJ2YWwobXlJbnRlcnZhbCk7XG4gIG15SW50ZXJ2YWwgPSBudWxsO1xufSIsIm1vZHVsZS5leHBvcnRzID0gZHJhd0J1ZmZlcjtcblxuZnVuY3Rpb24gZHJhd0J1ZmZlciAoY2FudmFzLCBidWZmZXIsIGNvbG9yKSB7XG4gIHZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgdmFyIHdpZHRoID0gY2FudmFzLndpZHRoO1xuICB2YXIgaGVpZ2h0ID0gY2FudmFzLmhlaWdodDtcbiAgaWYgKGNvbG9yKSB7XG4gICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yO1xuICB9XG5cbiAgICB2YXIgZGF0YSA9IGJ1ZmZlci5nZXRDaGFubmVsRGF0YSggMCApO1xuICAgIHZhciBzdGVwID0gTWF0aC5jZWlsKCBkYXRhLmxlbmd0aCAvIHdpZHRoICk7XG4gICAgdmFyIGFtcCA9IGhlaWdodCAvIDI7XG4gICAgZm9yKHZhciBpPTA7IGkgPCB3aWR0aDsgaSsrKXtcbiAgICAgICAgdmFyIG1pbiA9IDEuMDtcbiAgICAgICAgdmFyIG1heCA9IC0xLjA7XG4gICAgICAgIGZvciAodmFyIGo9MDsgajxzdGVwOyBqKyspIHtcbiAgICAgICAgICAgIHZhciBkYXR1bSA9IGRhdGFbKGkqc3RlcCkral07XG4gICAgICAgICAgICBpZiAoZGF0dW0gPCBtaW4pXG4gICAgICAgICAgICAgICAgbWluID0gZGF0dW07XG4gICAgICAgICAgICBpZiAoZGF0dW0gPiBtYXgpXG4gICAgICAgICAgICAgICAgbWF4ID0gZGF0dW07XG4gICAgICAgIH1cbiAgICAgIGN0eC5maWxsUmVjdChpLCgxK21pbikqYW1wLDEsTWF0aC5tYXgoMSwobWF4LW1pbikqYW1wKSk7XG4gICAgfVxufSIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBjdXQ6IGN1dEJ1ZmZlcixcbiAgY29weTogY29weUJ1ZmZlcixcbiAgcGFzdGU6IHBhc3RlQnVmZmVyLFxuICByZXZlcnNlOiByZXZlcnNlQnVmZmVyXG59O1xuXG5mdW5jdGlvbiByZXZlcnNlQnVmZmVyKGJ1ZmZlciwgY2IpIHtcbiAgdmFyIGNoYW5OdW1iZXIgPSBidWZmZXIubnVtYmVyT2ZDaGFubmVscztcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGFuTnVtYmVyOyArK2kpIHtcbiAgICB2YXIgZGF0YSA9IGJ1ZmZlci5nZXRDaGFubmVsRGF0YShpKTtcbiAgICBBcnJheS5wcm90b3R5cGUucmV2ZXJzZS5jYWxsKGRhdGEpO1xuICB9XG4gIGNiKCk7XG59XG5cbi8vIGNvcHkgdGhlIGJ1ZmZlciB0byBvdXIgY2xpcGJvYXJkLCB3aXRob3V0IHJlbW92aW5nIHRoZSBvcmlnaW5hbCBzZWN0aW9uIGZyb20gYnVmZmVyLlxuZnVuY3Rpb24gY29weUJ1ZmZlcihjb250ZXh0LCBjbGlwYm9hcmQsIGJ1ZmZlciwgY2IpIHtcbiAgdmFyIHN0YXJ0ID0gTWF0aC5yb3VuZChjbGlwYm9hcmQuc3RhcnQgKiBidWZmZXIuc2FtcGxlUmF0ZSk7XG4gIHZhciBlbmQgPSBNYXRoLnJvdW5kKGNsaXBib2FyZC5lbmQgKiBidWZmZXIuc2FtcGxlUmF0ZSk7XG5cbiAgY2xpcGJvYXJkLmJ1ZmZlciA9IGNvbnRleHQuY3JlYXRlQnVmZmVyKDIsIGVuZCAtIHN0YXJ0LCBidWZmZXIuc2FtcGxlUmF0ZSk7XG5cbiAgY2xpcGJvYXJkLmJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zZXQoXG4gICAgYnVmZmVyLmdldENoYW5uZWxEYXRhKDApLnN1YmFycmF5KHN0YXJ0LCBlbmQpLCAwKTtcbiAgY2xpcGJvYXJkLmJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKS5zZXQoXG4gICAgYnVmZmVyLmdldENoYW5uZWxEYXRhKDEpLnN1YmFycmF5KHN0YXJ0LCBlbmQpLCAwKTtcblxuICBjYigpO1xufVxuXG4vLyBjdXQgdGhlIGJ1ZmZlciBwb3J0aW9uIHRvIG91ciBjbGlwYm9hcmQsIHNldHMgZW1wdHkgc3BhY2UgaW4gcGxhY2Ugb2YgdGhlIHBvcnRpb25cbi8vIGluIHRoZSBzb3VyY2UgYnVmZmVyLlxuZnVuY3Rpb24gY3V0QnVmZmVyKGNvbnRleHQsIGNsaXBib2FyZCwgYnVmZmVyLCBjYikge1xuICB2YXIgc3RhcnQgPSBNYXRoLnJvdW5kKGNsaXBib2FyZC5zdGFydCAqIGJ1ZmZlci5zYW1wbGVSYXRlKTtcbiAgdmFyIGVuZCA9IE1hdGgucm91bmQoY2xpcGJvYXJkLmVuZCAqIGJ1ZmZlci5zYW1wbGVSYXRlKTtcblxuICBjbGlwYm9hcmQuYnVmZmVyID0gY29udGV4dC5jcmVhdGVCdWZmZXIoMiwgZW5kIC0gc3RhcnQsIGJ1ZmZlci5zYW1wbGVSYXRlKTtcbiAgY2xpcGJvYXJkLmJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zZXQoYnVmZmVyLmdldENoYW5uZWxEYXRhKDApLnN1YmFycmF5KHN0YXJ0LCBlbmQpKTtcbiAgY2xpcGJvYXJkLmJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKS5zZXQoYnVmZmVyLmdldENoYW5uZWxEYXRhKDEpLnN1YmFycmF5KHN0YXJ0LCBlbmQpKTtcblxuICB2YXIgbnVPbGRCdWZmZXIgPSBjb250ZXh0LmNyZWF0ZUJ1ZmZlcigyLCBidWZmZXIubGVuZ3RoLCBidWZmZXIuc2FtcGxlUmF0ZSk7XG4gIHZhciBlbXB0eUJ1ZiA9IGNvbnRleHQuY3JlYXRlQnVmZmVyKDIsIGVuZCAtIHN0YXJ0LCBidWZmZXIuc2FtcGxlUmF0ZSk7XG5cbiAgbnVPbGRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCkuc2V0KGJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zdWJhcnJheSgwLCBzdGFydCkpO1xuICBudU9sZEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKS5zZXQoYnVmZmVyLmdldENoYW5uZWxEYXRhKDEpLnN1YmFycmF5KDAsIHN0YXJ0KSlcblxuICBudU9sZEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zZXQoZW1wdHlCdWYuZ2V0Q2hhbm5lbERhdGEoMCksIHN0YXJ0KTtcbiAgbnVPbGRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkuc2V0KGVtcHR5QnVmLmdldENoYW5uZWxEYXRhKDEpLCBzdGFydCk7XG5cbiAgbnVPbGRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCkuc2V0KGJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zdWJhcnJheShlbmQsIGJ1ZmZlci5sZW5ndGgpLCBlbmQpO1xuICBudU9sZEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKS5zZXQoYnVmZmVyLmdldENoYW5uZWxEYXRhKDEpLnN1YmFycmF5KGVuZCwgYnVmZmVyLmxlbmd0aCksIGVuZCk7XG4gIGNiKG51T2xkQnVmZmVyKTtcbn1cblxuLy8gaW5zZXJ0IG91ciBjbGlwYm9hcmQgYXQgYSBzcGVjaWZpYyBwb2ludCBpbiBidWZmZXIuXG5mdW5jdGlvbiBwYXN0ZUJ1ZmZlcihjb250ZXh0LCBjbGlwYm9hcmQsIGJ1ZmZlciwgYXQsIGNiKSB7XG4gIHZhciBzdGFydCA9IE1hdGgucm91bmQoY2xpcGJvYXJkLnN0YXJ0ICogYnVmZmVyLnNhbXBsZVJhdGUpO1xuICB2YXIgZW5kID0gTWF0aC5yb3VuZChjbGlwYm9hcmQuZW5kICogYnVmZmVyLnNhbXBsZVJhdGUpO1xuICBhdCA9IGF0ICogYnVmZmVyLnNhbXBsZVJhdGU7XG5cbiAgLy8gY3JlYXRlIHJlcGxhY2VtZW50IGJ1ZmZlciB3aXRoIGVub3VnaCBzcGFjZSBmb3IgY2xpYm9hcmQgcGFydFxuICB2YXIgbnVQYXN0ZWRCdWZmZXIgPSBjb250ZXh0LmNyZWF0ZUJ1ZmZlcigyLCBidWZmZXIubGVuZ3RoICsgKGVuZCAtIHN0YXJ0KSwgYnVmZmVyLnNhbXBsZVJhdGUpO1xuXG4gIC8vIGlmIG91ciBjbGlwIHN0YXJ0IHBvaW50IGlzIG5vdCBhdCAnMCcgdGhlbiB3ZSBuZWVkIHRvIHNldCB0aGUgb3JpZ2luYWxcbiAgLy8gY2h1bmssIHVwIHRvIHRoZSBjbGlwIHN0YXJ0IHBvaW50XG4gIGlmIChhdCA+IDApIHtcbiAgICBudVBhc3RlZEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zZXQoYnVmZmVyLmdldENoYW5uZWxEYXRhKDApLnN1YmFycmF5KDAsIGF0KSk7XG4gICAgbnVQYXN0ZWRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkuc2V0KGJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKS5zdWJhcnJheSgwLCBhdCkpO1xuICB9XG5cbiAgLy8gYWRkIHRoZSBjbGlwIGRhdGFcbiAgbnVQYXN0ZWRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCkuc2V0KGNsaXBib2FyZC5idWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCksIGF0KTtcbiAgbnVQYXN0ZWRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkuc2V0KGNsaXBib2FyZC5idWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSksIGF0KTtcblxuICAvLyBpZiBvdXIgY2xpcCBlbmQgcG9pbnQgaXMgbm90IGF0IHRoZSBlbmQgb2YgdGhlIG9yaWdpbmFsIGJ1ZmZlciB0aGVuXG4gIC8vIHdlIG5lZWQgdG8gYWRkIHJlbWFpbmluZyBkYXRhIGZyb20gdGhlIG9yaWdpbmFsIGJ1ZmZlcjtcbiAgaWYgKGVuZCA8IGJ1ZmZlci5sZW5ndGgpIHtcbiAgICB2YXIgbmV3QXQgPSBhdCArIChlbmQgLSBzdGFydCk7XG4gICAgbnVQYXN0ZWRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCkuc2V0KGJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zdWJhcnJheShuZXdBdCksIG5ld0F0KTtcbiAgICBudVBhc3RlZEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKS5zZXQoYnVmZmVyLmdldENoYW5uZWxEYXRhKDEpLnN1YmFycmF5KG5ld0F0KSwgbmV3QXQpO1xuICB9XG5cbiAgY2IobnVQYXN0ZWRCdWZmZXIpO1xufSIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHRvdGFsU2VjKSB7XG4gIHZhciBtaW51dGVzID0gcGFyc2VJbnQoIHRvdGFsU2VjIC8gNjAgKSAlIDYwO1xuICB2YXIgc2Vjb25kcyA9IHRvdGFsU2VjICUgNjA7XG5cbiAgcmV0dXJuICgobWludXRlcyA8IDEwID8gXCIwXCIgKyBtaW51dGVzIDogbWludXRlcykgKyBcIjpcIiArIChzZWNvbmRzICA8IDEwID8gXCIwXCIgKyBzZWNvbmRzLnRvRml4ZWQoMikgOiBzZWNvbmRzLnRvRml4ZWQoMikpKS5yZXBsYWNlKCcuJywgJzonKTtcbn0iLCJ2YXIgcmVjb3JkZXI7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgc3RhcnQ6IHN0YXJ0LFxuICBzdG9wOiBzdG9wXG59XG5cbmZ1bmN0aW9uIGdldFN0cmVhbShjb250ZXh0LCBmZnQpIHtcbiAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSA9IG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgfHwgbmF2aWdhdG9yLndlYmtpdEdldFVzZXJNZWRpYTtcbiAgd2luZG93LlVSTCA9IHdpbmRvdy5VUkwgfHwgd2luZG93LndlYmtpdFVSTDtcblxuICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhKHthdWRpbzogdHJ1ZX0sIGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgIHN0YXJ0VXNlck1lZGlhKGNvbnRleHQsIHN0cmVhbSwgZmZ0KTtcbiAgfSwgZnVuY3Rpb24oZXJyKSB7XG4gICAgY29uc29sZS5sb2coJ05vIGxpdmUgYXVkaW8gaW5wdXQ6ICcgKyBlcnIpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gc3RhcnRVc2VyTWVkaWEoY29udGV4dCwgc3RyZWFtLCBmZnQpIHtcbiAgdmFyIGlucHV0ID0gY29udGV4dC5jcmVhdGVNZWRpYVN0cmVhbVNvdXJjZShzdHJlYW0pO1xuICBjb25zb2xlLmxvZygnTWVkaWEgc3RyZWFtIGNyZWF0ZWQuJyk7XG5cbiAgaWYgKGZmdCkge1xuICAgIGlucHV0LmNvbm5lY3QoZmZ0LmlucHV0KTtcbiAgICAvLyB0aHJvdyBhd2F5IGdhaW4gbm9kZVxuICAgIHZhciBnYWluTm9kZSA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIGdhaW5Ob2RlLmdhaW4udmFsdWUgPSAwO1xuICAgIGZmdC5jb25uZWN0KGdhaW5Ob2RlKTtcbiAgICBnYWluTm9kZS5jb25uZWN0KGNvbnRleHQuZGVzdGluYXRpb24pO1xuICB9XG4gIC8vIGlucHV0LmNvbm5lY3QoY29udGV4dC5kZXN0aW5hdGlvbik7IC8vIG1pZ2h0IG5vdCBhY3R1YWxseSB3YW50IHRvIGRvIHRoaXNcbiAgY29uc29sZS5sb2coJ0lucHV0IGNvbm5lY3RlZCB0byBhdWRpbyBjb250ZXh0IGRlc3RpbmF0aW9uLicpO1xuXG4gIHJlY29yZGVyID0gbmV3IFJlY29yZGVyKGlucHV0KTtcbiAgY29uc29sZS5sb2coJ1JlY29yZGVyIGluaXRpYWxpc2VkLicpO1xuICBzdGFydCgpO1xufVxuXG5mdW5jdGlvbiBzdGFydChjb250ZXh0LCBmZnQpIHtcbiAgaWYgKHJlY29yZGVyID09PSB1bmRlZmluZWQpIHtcbiAgICBnZXRTdHJlYW0oY29udGV4dCwgZmZ0KVxuICB9IGVsc2Uge1xuICAgIHJlY29yZGVyLnJlY29yZCgpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHN0b3AoY2IpIHtcbiAgcmVjb3JkZXIuc3RvcCgpO1xuICByZWNvcmRlci5leHBvcnRXQVYoY2IpO1xuICByZWNvcmRlci5jbGVhcigpO1xufSIsInZhciBFRSA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcbnZhciByYWYgPSByZXF1aXJlKCdyYWYnKTtcbnZhciBBdWRpb1NvdXJjZSA9IHJlcXVpcmUoJ2F1ZGlvc291cmNlJyk7XG52YXIgZm9ybWF0VGltZSA9IHJlcXVpcmUoJy4vZm9ybWF0LXRpbWUnKTtcbnZhciBkcmF3QnVmZmVyID0gcmVxdWlyZSgnLi9kcmF3LWJ1ZmZlcicpO1xudmFyIGNvbG9ycyA9IHJlcXVpcmUoJy4vY29sb3JzJyk7XG5tb2R1bGUuZXhwb3J0cyA9IFRyYWNrO1xuXG5mdW5jdGlvbiBUcmFjayhvcHRzKSB7XG4gIHRoaXMuZW1pdHRlciA9IG5ldyBFRSgpO1xuICB0aGlzLmNvbnRhaW5FbCA9IG9wdHMuY29udGFpbkVsO1xuICB0aGlzLnRyYWNrRWwgPSB0aGlzLmNvbnRhaW5FbC5xdWVyeVNlbGVjdG9yKCcudHJhY2snKTtcbiAgdGhpcy5hY3RpdmUgPSB0cnVlO1xuICB0aGlzLnNlbGVjdGluZyA9IHRydWU7XG4gIHRoaXMuY29udGV4dCA9IG9wdHMuY29udGV4dDtcbiAgdGhpcy5hdWRpb3NvdXJjZSA9IG9wdHMuYXVkaW9zb3VyY2U7XG4gIHRoaXMuaWQgPSBvcHRzLmlkO1xuICB0aGlzLnRpdGxlID0gb3B0cy50aXRsZTtcblxuICBpZiAob3B0cy5nYWluTm9kZSkge1xuICAgIHRoaXMuZ2Fpbk5vZGUgPSBvcHRzLmdhaW5Ob2RlO1xuICB9XG5cbiAgdGhpcy5jbGlwYm9hcmQgPSB7XG4gICAgc3RhcnQ6IDAsXG4gICAgZW5kOiAwLFxuICAgIGF0OiAwXG4gIH07XG5cbiAgdGhpcy5jdXJyZW50VGltZSA9IHRoaXMuY29udGV4dC5jdXJyZW50VGltZTtcbiAgdGhpcy5wbGF5aW5nID0gZmFsc2U7XG5cbiAgdGhpcy5zdGFydE9mZnNldCA9IDA7XG4gIHRoaXMubGFzdFBsYXkgPSAwO1xuICB0aGlzLmxhc3RQYXVzZSA9IDA7XG4gIHRoaXMucGF1c2VkU3VtID0gMDtcbiAgdGhpcy5hY3R1YWxDdXJyZW50VGltZSA9IDA7XG4gIHRoaXMuaW5pdGlhbFBsYXkgPSB0cnVlO1xuICB0aGlzLmluaXRTdGFydFRpbWUgPSAwO1xuXG4gIC8vIGluZGljYXRvcnNcbiAgdGhpcy5maWxlSW5kaWNhdG9yID0gdGhpcy5jb250YWluRWwucXVlcnlTZWxlY3RvcignLnRyYWNrIHAnKTtcbiAgdGhpcy5jdXJyZW50VGltZUVsID0gdGhpcy5jb250YWluRWwucXVlcnlTZWxlY3RvcignLmN1cicpO1xuICB0aGlzLnJlbWFpbmluZ0VsID0gdGhpcy5jb250YWluRWwucXVlcnlTZWxlY3RvcignLnJlbScpO1xuICB0aGlzLmR1cmF0aW9uRWwgPSB0aGlzLmNvbnRhaW5FbC5xdWVyeVNlbGVjdG9yKCcuZHVyJyk7XG5cbiAgLy8gY29udHJvbHNcbiAgdGhpcy5nYWluRWwgPSB0aGlzLmNvbnRhaW5FbC5xdWVyeVNlbGVjdG9yKCcudm9sdW1lIGlucHV0Jyk7XG5cbiAgLy8gd2F2ZSBlbGVtZW50c1xuICB0aGlzLndhdmUgPSB0aGlzLmNvbnRhaW5FbC5xdWVyeVNlbGVjdG9yKCcud2F2ZSBjYW52YXMnKTtcbiAgdGhpcy5wcm9ncmVzc1dhdmUgPSB0aGlzLmNvbnRhaW5FbC5xdWVyeVNlbGVjdG9yKCcud2F2ZS1wcm9ncmVzcycpO1xuICB0aGlzLmN1cnNvciA9IHRoaXMuY29udGFpbkVsLnF1ZXJ5U2VsZWN0b3IoJy5wbGF5LWN1cnNvcicpO1xuICB0aGlzLnNlbGVjdGlvbiA9IHRoaXMuY29udGFpbkVsLnF1ZXJ5U2VsZWN0b3IoJy5zZWxlY3Rpb24nKTtcbiAgdGhpcy5zZWxlY3RhYmxlID0gW10uc2xpY2UuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuc2VsZWN0YWJsZScpKTtcblxuICBjb2xvcnMuc3RhcnQodGhpcy5maWxlSW5kaWNhdG9yLCAzMDApO1xuXG4gIHRoaXMuZ2FpbkVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGZ1bmN0aW9uKGV2KSB7XG4gICAgdGhpcy5nYWluTm9kZS5nYWluLnZhbHVlID0gcGFyc2VGbG9hdChldi50YXJnZXQudmFsdWUpO1xuICB9LmJpbmQodGhpcykpO1xuXG4gIHRoaXMuY29udGFpbkVsLnF1ZXJ5U2VsZWN0b3IoJy5hY3RpdmF0ZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZXYpIHtcbiAgICB2YXIgZWwgPSBldi50YXJnZXQ7XG5cbiAgICBpZiAoZWwuY2xhc3NMaXN0LmNvbnRhaW5zKCdhY3RpdmUnKSkge1xuICAgICAgdGhpcy5hY3RpdmUgPSBmYWxzZTtcbiAgICAgIGVsLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuICAgICAgdGhpcy50cmFja0VsLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmFjdGl2ZSA9IHRydWU7XG4gICAgICBlbC5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtcbiAgICAgIHRoaXMudHJhY2tFbC5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtcbiAgICB9XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB0aGlzLnNlbGVjdGFibGUuZm9yRWFjaChmdW5jdGlvbih3YXZlKSB7XG4gICAgd2F2ZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGV2KSB7XG4gICAgICBpZiAodGhpcy5wbGF5aW5nKSByZXR1cm47XG4gICAgICB0aGlzLmN1cnNvci5zdHlsZS5sZWZ0ID0gdGhpcy5wZXJjZW50RnJvbUNsaWNrKGV2KStcIiVcIjtcbiAgICB9LmJpbmQoc2VsZikpO1xuXG4gICAgd2F2ZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGV2KSB7XG4gICAgICBpZiAodGhpcy5wbGF5aW5nKSByZXR1cm47XG4gICAgICB0aGlzLmN1cnNvci5zdHlsZS5sZWZ0ID0gdGhpcy5wZXJjZW50RnJvbUNsaWNrKGV2KStcIiVcIjtcbiAgICB9LmJpbmQodGhpcykpO1xuXG4gICAgd2F2ZS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBmdW5jdGlvbihldikge1xuICAgICAgaWYgKHRoaXMucGxheWluZykgcmV0dXJuO1xuICAgICAgaWYgKCF0aGlzLm1vdmluZykge1xuICAgICAgICB2YXIgbGVmdFBlcmNlbnQgPSB0aGlzLnBlcmNlbnRGcm9tQ2xpY2soZXYpICsgJyUnO1xuXG4gICAgICAgIGlmICh0aGlzLnNlbGVjdGluZykge1xuICAgICAgICAgIHRoaXMuc2VsZWN0aW9uLnN0eWxlLmxlZnQgPSBsZWZ0UGVyY2VudDtcbiAgICAgICAgICB0aGlzLnNlbGVjdGlvbi5zdHlsZS53aWR0aCA9IDA7XG4gICAgICAgICAgdGhpcy5tb3ZpbmcgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jdXJzb3Iuc3R5bGUubGVmdCA9IGxlZnRQZXJjZW50O1xuICAgICAgICB0aGlzLmNsaXBib2FyZC5hdCA9IHRoaXMuZ2V0T2Zmc2V0RnJvbVBlcmNlbnQobGVmdFBlcmNlbnQucmVwbGFjZSgnJScsICcnKSk7XG4gICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKTtcblxuICAgIHdhdmUuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgZnVuY3Rpb24oZXYpIHtcbiAgICAgIGlmICghdGhpcy5tb3ZpbmcgfHwgIXRoaXMuc2VsZWN0aW5nKSByZXR1cm47XG4gICAgICB2YXIgbGVmdFBlcmNlbnQgPSB0aGlzLmdldFBlcmNlbnRGcm9tQ3Vyc29yKCk7XG4gICAgICB2YXIgcmlnaHRQZXJjZW50ID0gdGhpcy5wZXJjZW50RnJvbUNsaWNrKGV2KTtcbiAgICAgIHZhciBkaWZmID0gcmlnaHRQZXJjZW50IC0gbGVmdFBlcmNlbnQ7XG5cbiAgICAgIGlmIChkaWZmID4gMCkge1xuICAgICAgICBkaWZmICs9ICclJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuY3Vyc29yLnN0eWxlLmxlZnQgPSByaWdodFBlcmNlbnQgKyclJztcbiAgICAgICAgZGlmZiA9IGxlZnRQZXJjZW50IC0gcmlnaHRQZXJjZW50O1xuICAgICAgICBpZiAoZGlmZiA+IDApIHtcbiAgICAgICAgICBkaWZmICs9JyUnO1xuICAgICAgICB9IGVsc2UgZGlmZiA9IDA7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuc2VsZWN0aW9uLnN0eWxlLndpZHRoID0gZGlmZjtcbiAgICB9LmJpbmQodGhpcykpO1xuXG4gIH0sIHRoaXMpO1xuXG4gIC8vIHRoaXMuc2VsZWN0aW9uLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlb3V0JywgZnVuY3Rpb24oZXYpIHtcbiAgLy8gICB2YXIgbGVmdFBlcmNlbnQgPSB0aGlzLmdldFBlcmNlbnRGcm9tQ3Vyc29yKCk7XG4gIC8vICAgdmFyIHJpZ2h0UGVyY2VudCA9IHRoaXMucGVyY2VudEZyb21DbGljayhldik7XG4gIC8vICAgdGhpcy5jbGlwYm9hcmQuc3RhcnQgPSB0aGlzLmdldE9mZnNldEZyb21QZXJjZW50KGxlZnRQZXJjZW50KTtcbiAgLy8gICB0aGlzLmNsaXBib2FyZC5lbmQgPSB0aGlzLmdldE9mZnNldEZyb21QZXJjZW50KHJpZ2h0UGVyY2VudCk7XG4gIC8vICAgdGhpcy5tb3ZpbmcgPSBmYWxzZTtcbiAgLy8gfS5iaW5kKHRoaXMpKTtcblxuICB0aGlzLnNlbGVjdGlvbi5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZnVuY3Rpb24oZXYpIHtcbiAgICBpZiAoIXRoaXMuc2VsZWN0aW5nKSByZXR1cm47XG4gICAgdmFyIGxlZnRQZXJjZW50ID0gdGhpcy5nZXRQZXJjZW50RnJvbUN1cnNvcigpO1xuICAgIHZhciByaWdodFBlcmNlbnQgPSB0aGlzLnBlcmNlbnRGcm9tQ2xpY2soZXYpO1xuICAgIHRoaXMuY2xpcGJvYXJkLnN0YXJ0ID0gdGhpcy5nZXRPZmZzZXRGcm9tUGVyY2VudChsZWZ0UGVyY2VudCk7XG4gICAgdGhpcy5jbGlwYm9hcmQuZW5kID0gdGhpcy5jbGlwYm9hcmQuc3RhcnQgKyB0aGlzLmdldE9mZnNldEZyb21QZXJjZW50KHJpZ2h0UGVyY2VudCk7XG4gICAgdGhpcy5tb3ZpbmcgPSBmYWxzZTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICB0aGlzLmNvbnRhaW5FbC5xdWVyeVNlbGVjdG9yKCcubXV0ZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZXYpIHtcbiAgICB2YXIgZWwgPSBldi50YXJnZXQ7XG5cbiAgICBpZiAoZWwuY2xhc3NMaXN0LmNvbnRhaW5zKCdhY3RpdmUnKSkge1xuICAgICAgdGhpcy5nYWluTm9kZS5nYWluLnZhbHVlID0gdGhpcy5sYXN0R2FpblZhbHVlO1xuICAgICAgdGhpcy5nYWluRWwudmFsdWUgPSB0aGlzLmxhc3RHYWluVmFsdWU7XG4gICAgICBlbC5jbGFzc0xpc3QucmVtb3ZlKCdhY3RpdmUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5sYXN0R2FpblZhbHVlID0gdGhpcy5nYWluTm9kZS5nYWluLnZhbHVlO1xuICAgICAgdGhpcy5nYWluTm9kZS5nYWluLnZhbHVlID0gMDtcbiAgICAgIHRoaXMuZ2FpbkVsLnZhbHVlID0gMDtcbiAgICAgIGVsLmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuICAgIH1cbiAgfS5iaW5kKHRoaXMpKTtcblxuICB0aGlzLmNvbnRhaW5FbC5xdWVyeVNlbGVjdG9yKCcuZWRpdCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZXYpIHtcbiAgICB2YXIgZWwgPSBldi50YXJnZXQ7XG4gICAgaWYgKGVsLmNsYXNzTGlzdC5jb250YWlucygnYWN0aXZlJykpIHtcbiAgICAgIGVsLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuICAgICAgdGhpcy5zZWxlY3RpbmcgPSBmYWxzZTtcbiAgICAgIHRoaXMuc2VsZWN0aW9uLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsLmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuICAgICAgdGhpcy5zZWxlY3RpbmcgPSB0cnVlO1xuICAgICAgdGhpcy5zZWxlY3Rpb24uc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG4gICAgfVxuICB9LmJpbmQodGhpcykpO1xuXG4gIHRoaXMuY29udGFpbkVsLnF1ZXJ5U2VsZWN0b3IoJy5jb2xsYXBzZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZXYpIHtcbiAgICB2YXIgZWwgPSBldi50YXJnZXQ7XG4gICAgaWYgKGVsLmNsYXNzTGlzdC5jb250YWlucygnYWN0aXZlJykpIHtcbiAgICAgIGVsLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuICAgICAgdGhpcy50cmFja0VsLmNsYXNzTGlzdC5hZGQoJ2NvbGxhcHNlZCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbC5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKVxuICAgICAgdGhpcy50cmFja0VsLmNsYXNzTGlzdC5yZW1vdmUoJ2NvbGxhcHNlZCcpO1xuICAgIH1cbiAgfS5iaW5kKHRoaXMpKTtcblxuICBmdW5jdGlvbiBwbGF5TGlzdGVuIChldikge1xuICAgIGlmICh0aGlzLmFjdGl2ZSkgdGhpcy5wbGF5KCk7XG4gIH1cblxuICB0aGlzLmVtaXR0ZXIub24oJ3RyYWNrczpwbGF5JywgcGxheUxpc3Rlbi5iaW5kKHRoaXMpKTtcblxuICBmdW5jdGlvbiBwYXVzZUxpc3Rlbihldikge1xuICAgIGlmICh0aGlzLmFjdGl2ZSkgdGhpcy5wYXVzZSgpO1xuICB9XG5cbiAgdGhpcy5lbWl0dGVyLm9uKCd0cmFja3M6cGF1c2UnLCBwYXVzZUxpc3Rlbi5iaW5kKHRoaXMpKTtcblxuICBmdW5jdGlvbiBzdG9wTGlzdGVuKGV2KSB7XG4gICAgaWYgKHRoaXMuYWN0aXZlKSB7XG4gICAgICB0aGlzLnN0b3AoKTtcbiAgICAgIHRoaXMucmVzZXRQcm9ncmVzcygpO1xuICAgIH1cbiAgfVxuXG4gIHRoaXMuZW1pdHRlci5vbigndHJhY2tzOnN0b3AnLCBzdG9wTGlzdGVuLmJpbmQodGhpcykpO1xuXG4gIHRoaXMuY29udGFpbkVsLnF1ZXJ5U2VsZWN0b3IoJy5yZW1vdmUnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGV2KSB7XG4gICAgdGhpcy5zdG9wKCk7XG4gICAgZXYudGFyZ2V0LnBhcmVudEVsZW1lbnQucGFyZW50Tm9kZS5wYXJlbnROb2RlLnJlbW92ZSgpO1xuICAgIHRoaXMuZW1pdHRlci5lbWl0KCd0cmFja3M6cmVtb3ZlJywge2lkOiB0aGlzLmlkfSk7XG4gICAgdGhpcy5lbWl0dGVyID0gbnVsbDtcbiAgfS5iaW5kKHRoaXMpKTtcbn1cblxuVHJhY2sucHJvdG90eXBlID0ge1xuICBwbGF5OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN0b3AoKTtcbiAgICB0aGlzLmxhc3RQbGF5ID0gdGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lO1xuICAgIHRoaXMudXBkYXRlU3RhcnRPZmZzZXQoKTtcbiAgICB0aGlzLnBsYXlUcmFjayh0aGlzLnN0YXJ0T2Zmc2V0ICUgdGhpcy5hdWRpb3NvdXJjZS5idWZmZXIuZHVyYXRpb24pO1xuICB9LFxuICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuXG4gIH0sXG4gIHBlcmNlbnRGcm9tQ2xpY2s6IGZ1bmN0aW9uKGV2KSB7XG4gICAgdmFyIHggPSBldi5vZmZzZXRYIHx8IGV2LmxheWVyWDtcbiAgICByZXR1cm4gKHggLyB0aGlzLndhdmUub2Zmc2V0V2lkdGgpICogMTAwO1xuICB9LFxuICBnZXRQZXJjZW50RnJvbUN1cnNvcjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHBhcnNlRmxvYXQodGhpcy5jdXJzb3Iuc3R5bGUubGVmdC5yZXBsYWNlKCclJywgJycpKTtcbiAgfSxcbiAgZ2V0T2Zmc2V0RnJvbVBlcmNlbnQ6IGZ1bmN0aW9uKHBlcmNlbnQpIHtcbiAgICBpZiAocGVyY2VudCA9PT0gMCkgcmV0dXJuIDA7XG4gICAgdmFyIGludGVyID0gdGhpcy5hdWRpb3NvdXJjZS5idWZmZXIuZHVyYXRpb24gLyAxMDA7XG4gICAgcmV0dXJuIGludGVyICogcGVyY2VudDtcbiAgfSxcbiAgdXBkYXRlU3RhcnRPZmZzZXQ6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmN1cnNvci5zdHlsZS5sZWZ0ICE9PSAnJykge1xuICAgICAgdmFyIHBlcmNlbnQgPSB0aGlzLmdldFBlcmNlbnRGcm9tQ3Vyc29yKCk7XG4gICAgICB0aGlzLnN0YXJ0T2Zmc2V0ID0gdGhpcy5nZXRPZmZzZXRGcm9tUGVyY2VudChwZXJjZW50KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5yZXNldFByb2dyZXNzKCk7XG4gICAgfVxuICB9LFxuICB1cGRhdGVQYXVzZWQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucGF1c2VkU3VtID0gdGhpcy5wYXVzZWRTdW0gKyAodGhpcy5sYXN0UGxheSAtIHRoaXMubGFzdFBhdXNlKTtcbiAgfSxcbiAgc3RvcDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5pbml0aWFsUGxheSA9IHRydWU7XG4gICAgdGhpcy5zdGFydE9mZnNldCA9IDA7XG4gICAgdGhpcy5sYXN0UGxheSA9IDA7XG4gICAgdGhpcy5sYXN0UGF1c2UgPSAwO1xuICAgIHRoaXMucGF1c2VkU3VtID0gMDtcbiAgICBpZiAodGhpcy5hdWRpb3NvdXJjZS5zb3VyY2UpIHRoaXMuYXVkaW9zb3VyY2Uuc3RvcCgpO1xuICB9LFxuICByZXNldFByb2dyZXNzOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnByb2dyZXNzV2F2ZS5zdHlsZS53aWR0aCA9IFwiMCVcIjtcbiAgICB0aGlzLmN1cnNvci5zdHlsZS5sZWZ0ID0gXCIwJVwiO1xuICB9LFxuICBwYXVzZTogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5sYXN0UGF1c2UgPSB0aGlzLmNvbnRleHQuY3VycmVudFRpbWU7XG4gICAgdGhpcy5hdWRpb3NvdXJjZS5zdG9wKCk7XG4gICAgdGhpcy5zdGFydE9mZnNldCArPSB0aGlzLmNvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLmxhc3RQbGF5O1xuICAgIHRoaXMucGxheWluZyA9IGZhbHNlO1xuICB9LFxuICBza2lwRm9yd2FyZDogZnVuY3Rpb24oKSB7fSxcbiAgc2tpcEJhY2t3YXJkOiBmdW5jdGlvbigpIHt9LFxuICB1cGRhdGVQcm9ncmVzczogZnVuY3Rpb24ocGVyY2VudCkge1xuICAgIHRoaXMucHJvZ3Jlc3NXYXZlLnN0eWxlLndpZHRoID0gcGVyY2VudCtcIiVcIjtcbiAgICB0aGlzLmN1cnNvci5zdHlsZS5sZWZ0ID0gcGVyY2VudCtcIiVcIjtcbiAgfSxcbiAgcGxheVRyYWNrOiBmdW5jdGlvbihvZmZzZXQsIHN0b3BPZmZzZXQpIHtcbiAgICBpZiAodGhpcy5wbGF5aW5nKSB0aGlzLmF1ZGlvc291cmNlLnN0b3AoKTtcbiAgICB0aGlzLmF1ZGlvc291cmNlLnBsYXkoMCwgb2Zmc2V0KTtcbiAgICB0aGlzLmF1ZGlvc291cmNlLnBsYXkoMCwgb2Zmc2V0KTtcbiAgICB0aGlzLnBsYXlpbmcgPSB0cnVlO1xuICAgIHJhZih0aGlzLnRyaWdnZXJQbGF5aW5nLmJpbmQodGhpcykpO1xuICB9LFxuICB1cGRhdGVWaXN1YWxQcm9ncmVzczogZnVuY3Rpb24gKHBlcmNlbnQpIHtcbiAgICB0aGlzLnByb2dyZXNzV2F2ZS5zdHlsZS53aWR0aCA9IHBlcmNlbnQrXCIlXCI7XG4gICAgdGhpcy5jdXJzb3Iuc3R5bGUubGVmdCA9IHBlcmNlbnQrXCIlXCI7XG4gIH0sXG4gIHRyaWdnZXJQbGF5aW5nOiBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMucGxheWluZykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBkdXIgPSB0aGlzLmF1ZGlvc291cmNlLmJ1ZmZlci5kdXJhdGlvbjtcbiAgICB2YXIgeCA9IHRoaXMuY3VycmVudFRpbWVUb1BlcmNlbnQodGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lKTtcblxuICAgIHRoaXMudXBkYXRlVmlzdWFsUHJvZ3Jlc3MoeCk7XG5cbiAgICB0aGlzLmN1cnJlbnRUaW1lRWwudGV4dENvbnRlbnQgPSBmb3JtYXRUaW1lKHRoaXMuY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMubGFzdFBsYXkpO1xuICAgIHRoaXMucmVtYWluaW5nRWwudGV4dENvbnRlbnQgPSBmb3JtYXRUaW1lKCh0aGlzLmF1ZGlvc291cmNlLmJ1ZmZlci5kdXJhdGlvbiAtIHRoaXMubGFzdFBsYXkpIC0gKHRoaXMuY29udGV4dC5jdXJyZW50VGltZSAtIHRoaXMubGFzdFBsYXkpKTtcblxuICAgIGlmIChwYXJzZUludCh4KSA+PSAxMDApIHtcbiAgICAgIHRoaXMucGxheWluZyA9ICF0aGlzLnBsYXlpbmc7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJhZih0aGlzLnRyaWdnZXJQbGF5aW5nLmJpbmQodGhpcykpO1xuICB9LFxuICBjdXJyZW50VGltZVRvUGVyY2VudDogZnVuY3Rpb24gKGN1cnJlbnRUaW1lKSB7XG4gICAgdmFyIGR1ciA9IHRoaXMuYXVkaW9zb3VyY2UuYnVmZmVyLmR1cmF0aW9uO1xuICAgIHZhciBjdXIgPSAoY3VycmVudFRpbWUgLSB0aGlzLmxhc3RQbGF5ICsgdGhpcy5zdGFydE9mZnNldCAlIDYwKSAqIDEwO1xuICAgIHJldHVybiAoKGN1ciAvIGR1cikgKiAxMCkudG9GaXhlZCgzKTtcbiAgfSxcbiAgcmVzZXRWaXN1YWw6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBjdHggPSB0aGlzLndhdmUuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMud2F2ZS53aWR0aCwgdGhpcy53YXZlLmhlaWdodCk7XG4gICAgY3R4ID0gdGhpcy5wcm9ncmVzc1dhdmUucXVlcnlTZWxlY3RvcignY2FudmFzJykuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMud2F2ZS53aWR0aCwgdGhpcy53YXZlLmhlaWdodCk7XG4gIH0sXG4gIGxvYWRXaXRoQXVkaW9CdWZmZXI6IGZ1bmN0aW9uKGF1ZGlvQnVmZmVyKSB7XG4gICAgdGhpcy5nYWluTm9kZSA9IHRoaXMuY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdGhpcy5hdWRpb3NvdXJjZSA9IG5ldyBBdWRpb1NvdXJjZSh0aGlzLmNvbnRleHQsIHtcbiAgICAgIGdhaW5Ob2RlOiB0aGlzLmdhaW5Ob2RlXG4gICAgfSk7XG4gICAgdGhpcy5kcmF3V2F2ZXMoKTtcbiAgfSxcbiAgbG9hZFVSTDogZnVuY3Rpb24gKHVybCkge1xuICAgIHRoaXMuZmlsZUluZGljYXRvci50ZXh0Q29udGVudCA9ICdsb2FkaW5nIGZpbGUgZnJvbSB1cmwuLi4nO1xuXG4gICAgdmFyIHJlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgIHJlcS5vcGVuKCdHRVQnLCB1cmwsIHRydWUpO1xuICAgICAgICByZXEucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmVxLm9ubG9hZGVuZCA9IGZ1bmN0aW9uKGV2KSB7XG4gICAgICAgICAgIHNlbGYuZmlsZUluZGljYXRvci50ZXh0Q29udGVudCA9ICdkZWNvZGluZyBhdWRpbyBkYXRhLi4uJztcblxuICAgICAgICAgICBzZWxmLmNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKHJlcS5yZXNwb25zZSwgZnVuY3Rpb24oYnVmKSB7XG4gICAgICAgICAgIHNlbGYuZmlsZUluZGljYXRvci50ZXh0Q29udGVudCA9ICdyZW5kZXJpbmcgd2F2ZS4uLic7XG5cbiAgICAgICAgICAgc2VsZi5nYWluTm9kZSA9IHNlbGYuY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgICAgIHNlbGYuYXVkaW9zb3VyY2UgPSBuZXcgQXVkaW9Tb3VyY2Uoc2VsZi5jb250ZXh0LCB7XG4gICAgICAgICAgICAgZ2Fpbk5vZGU6IHNlbGYuZ2Fpbk5vZGVcbiAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgc2VsZi5kdXJhdGlvbkVsLnRleHRDb250ZW50ID0gZm9ybWF0VGltZShidWYuZHVyYXRpb24pO1xuXG4gICAgICAgICAgIHNlbGYuYXVkaW9zb3VyY2UuYnVmZmVyID0gYnVmO1xuXG4gICAgICAgICAgIHNlbGYuYWRqdXN0V2F2ZSgpO1xuICAgICAgICAgICBkcmF3QnVmZmVyKHNlbGYud2F2ZSwgYnVmLCAnIzUyRjZBNCcpO1xuICAgICAgICAgICBkcmF3QnVmZmVyKHNlbGYucHJvZ3Jlc3NXYXZlLnF1ZXJ5U2VsZWN0b3IoJ2NhbnZhcycpLCBidWYsICcjRjQ0NUYwJyk7XG4gICAgICAgICAgIHNlbGYuZmlsZUluZGljYXRvci5yZW1vdmUoKTtcbiAgICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXEuc2VuZCgpO1xuICB9LFxuICBsb2FkRmlsZTogZnVuY3Rpb24gKGZpbGUpIHtcbiAgICB0aGlzLmZpbGVJbmRpY2F0b3IudGV4dENvbnRlbnQgPSAnbG9hZGluZyBmaWxlLi4uJztcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBzZXQgc3RhdHVzIGFuZCBpZDNcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICByZWFkZXIub25sb2FkZW5kID0gZnVuY3Rpb24oZXYpIHtcbiAgICAgIHNlbGYuZmlsZUluZGljYXRvci50ZXh0Q29udGVudCA9ICdkZWNvZGluZyBhdWRpbyBkYXRhLi4uJztcblxuICAgICAgc2VsZi5jb250ZXh0LmRlY29kZUF1ZGlvRGF0YShldi50YXJnZXQucmVzdWx0LCBmdW5jdGlvbihidWYpIHtcbiAgICAgICAgc2VsZi5maWxlSW5kaWNhdG9yLnRleHRDb250ZW50ID0gJ3JlbmRlcmluZyB3YXZlLi4uJztcblxuICAgICAgICBzZWxmLmdhaW5Ob2RlID0gc2VsZi5jb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgc2VsZi5hdWRpb3NvdXJjZSA9IG5ldyBBdWRpb1NvdXJjZShzZWxmLmNvbnRleHQsIHtcbiAgICAgICAgICBnYWluTm9kZTogc2VsZi5nYWluTm9kZVxuICAgICAgICB9KTtcblxuICAgICAgICBzZWxmLmR1cmF0aW9uRWwudGV4dENvbnRlbnQgPSBmb3JtYXRUaW1lKGJ1Zi5kdXJhdGlvbik7XG5cbiAgICAgICAgc2VsZi5hdWRpb3NvdXJjZS5idWZmZXIgPSBidWY7XG5cbiAgICAgICAgc2VsZi5hZGp1c3RXYXZlKCk7XG4gICAgICAgIGRyYXdCdWZmZXIoc2VsZi53YXZlLCBidWYsICcjNTJGNkE0Jyk7XG4gICAgICAgIGRyYXdCdWZmZXIoc2VsZi5wcm9ncmVzc1dhdmUucXVlcnlTZWxlY3RvcignY2FudmFzJyksIGJ1ZiwgJyNGNDQ1RjAnKTtcbiAgICAgICAgc2VsZi5maWxlSW5kaWNhdG9yLnJlbW92ZSgpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihmaWxlKTtcbiAgfSxcbiAgYWRqdXN0V2F2ZTogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHcgPSB0aGlzLndhdmUucGFyZW50Tm9kZS5vZmZzZXRXaWR0aDtcbiAgICB0aGlzLndhdmUud2lkdGggPSB3O1xuICAgIHRoaXMucHJvZ3Jlc3NXYXZlLnF1ZXJ5U2VsZWN0b3IoJ2NhbnZhcycpLndpZHRoID0gdztcbiAgfSxcbiAgZHJhd1dhdmVzOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgcHJldkxlZnQgPSAwO1xuICAgIGlmICh0aGlzLmN1cnNvci5zdHlsZS5sZWZ0KSB7XG4gICAgICBwcmV2TGVmdCA9IHBhcnNlRmxvYXQodGhpcy5jdXJzb3Iuc3R5bGUubGVmdC5yZXBsYWNlKCclJywgJycpKTtcbiAgICB9XG4gICAgdGhpcy5yZXNldFZpc3VhbCgpO1xuICAgIGRyYXdCdWZmZXIodGhpcy53YXZlLCB0aGlzLmF1ZGlvc291cmNlLmJ1ZmZlciwgJyM1MkY2QTQnKTtcbiAgICBkcmF3QnVmZmVyKHRoaXMucHJvZ3Jlc3NXYXZlLnF1ZXJ5U2VsZWN0b3IoJ2NhbnZhcycpLCB0aGlzLmF1ZGlvc291cmNlLmJ1ZmZlciwgJyNGNDQ1RjAnKTtcbiAgICBjb25zb2xlLmxvZygnd2F2ZXMgdXBkYXRlZC4nKVxuICAgIC8vIHRoaXMudXBkYXRlUHJvZ3Jlc3MocHJldkxlZnQpO1xuICB9XG59IiwidmFyIEVFID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xudmFyIGRyYWdEcm9wID0gcmVxdWlyZSgnZHJhZy1kcm9wJyk7XG52YXIgQXVkaW9Db250ZXh0ID0gcmVxdWlyZSgnYXVkaW9jb250ZXh0Jyk7XG52YXIgQXVkaW9Tb3VyY2UgPSByZXF1aXJlKCdhdWRpb3NvdXJjZScpO1xudmFyIEZGVCA9IHJlcXVpcmUoJ2F1ZGlvLWZmdCcpO1xuXG52YXIgY29sb3JzID0gcmVxdWlyZSgnLi9saWIvY29sb3JzJyk7XG52YXIgZWRpdG9yID0gcmVxdWlyZSgnLi9saWIvZWRpdHMnKTtcbnZhciByZWNvcmRlciA9IHJlcXVpcmUoJy4vbGliL3JlY29yZCcpO1xudmFyIFRyYWNrID0gcmVxdWlyZSgnLi9saWIvdHJhY2snKTtcblxudmFyIHRyYWNrVG1wID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3RyYWNrLXRtcCcpO1xuXG52YXIgZW1pdHRlciA9IG5ldyBFRSgpO1xudmFyIGF1ZGlvQ29udGV4dCA9IG5ldyBBdWRpb0NvbnRleHQoKTtcbnZhciBtYXN0ZXJHYWluTm9kZSA9IGF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCk7XG52YXIgdW5pcUlkID0gZnVuY3Rpb24oKSB7cmV0dXJuIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMTYpLnNsaWNlKDIpfTtcblxudmFyIGRyYXdlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5kcmF3ZXInKTtcbnZhciBmZnQgPSBuZXcgRkZUKGF1ZGlvQ29udGV4dCwge2NhbnZhczogZHJhd2VyLnF1ZXJ5U2VsZWN0b3IoJyNmZnQnKX0pO1xuXG52YXIgd29ya3NwYWNlRWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjd29ya3NwYWNlJyk7XG5cbi8vIGNvbnRyb2xzXG52YXIgd2VsY29tZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy53ZWxjb21lJyk7XG52YXIgd2VsY29tZUltcG9ydEJ0biA9IHdlbGNvbWUucXVlcnlTZWxlY3RvcignLmltcG9ydCcpO1xudmFyIHdlbGNvbWVSZWNvcmRCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcucmVjb3JkJyk7XG52YXIgaW1wb3J0QnRuID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmltcG9ydCcpO1xudmFyIGltcG9ydElucHV0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2ltcG9ydCcpXG52YXIgcGxheUJ0biA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNwbGF5Jyk7XG52YXIgcGF1c2VCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcGF1c2UnKTtcbnZhciBzdG9wQnRuID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3N0b3AnKTtcbnZhciBjdXRCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjY3V0Jyk7XG52YXIgY29weUJ0biA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNjb3B5Jyk7XG52YXIgcGFzdGVCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcGFzdGUnKTtcbnZhciBwcmVwZW5kQnRuID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3ByZXBlbmQnKTtcbnZhciBhcHBlbmRCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjYXBwZW5kJyk7XG52YXIgZHVwbGljYXRlQnRuID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2R1cGxpY2F0ZScpO1xudmFyIHJldmVyc2VCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcmV2ZXJzZScpO1xudmFyIHJlbW92ZUJ0biA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNyZW1vdmUnKTtcbnZhciByZWNvcmRCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcmVjb3JkJyk7XG52YXIgdHJhY2tzID0ge307XG5cbnZhciB2aXBzID0gd2VsY29tZS5xdWVyeVNlbGVjdG9yQWxsKCdzcGFuJyk7XG5cbmZvcih2YXIgaT0wOyBpPHZpcHMubGVuZ3RoOyBpKyspe1xuICBjb2xvcnMuc3RhcnQodmlwc1tpXSwgMzAwKTtcbn1cblxudmFyIHJlY29yZGluZyA9IGZhbHNlO1xuXG5yZWNvcmRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgaWYgKCFyZWNvcmRpbmcpIHtcbiAgICByZWNvcmRlci5zdGFydChhdWRpb0NvbnRleHQsIGZmdCk7XG4gICAgcmVjb3JkQnRuLmlubmVyVGV4dCA9ICdzdG9wIHJlY29yZGluZyc7XG4gICAgZHJhd2VyLmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuICAgIHJlY29yZGluZyA9IHRydWU7XG4gIH0gZWxzZSB7XG4gICAgZHJhd2VyLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuICAgIHJlY29yZEJ0bi5pbm5lclRleHQgPSAncmVjb3JkJztcbiAgICByZWNvcmRlci5zdG9wKGZ1bmN0aW9uKGJsb2IpIHtcbiAgICAgICAgICAgICAgIG5ld1RyYWNrRnJvbVVSTChVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpKTtcbiAgICAgICAgICAgICB9KTtcbiAgICByZWNvcmRpbmcgPSBmYWxzZTtcbiAgfVxufSlcblxuZHJhZ0Ryb3AoJ2JvZHknLCBmdW5jdGlvbiAoZmlsZXMpIHtcbiAgd2VsY29tZS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICBuZXdUcmFja0Zyb21GaWxlKGZpbGVzWzBdKTtcbn0pO1xuXG53ZWxjb21lSW1wb3J0QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNpbXBvcnQnKS5jbGljaygpO1xufSlcblxud2VsY29tZVJlY29yZEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICB3ZWxjb21lUmVjb3JkQnRuLnF1ZXJ5U2VsZWN0b3IoJ2g0JykuaW5uZXJUZXh0ID0gJ3N0b3AgcmVjb3JkaW5nJztcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3JlY29yZCcpLmNsaWNrKCk7XG59KVxuXG5pbXBvcnRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2ltcG9ydCcpLmNsaWNrKCk7XG59KVxuXG5pbXBvcnRJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbihldikge1xuICBuZXdUcmFja0Zyb21GaWxlKGV2LnRhcmdldC5maWxlc1swXSk7XG59KTtcblxucGxheUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICBPYmplY3Qua2V5cyh0cmFja3MpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgdHJhY2tzW2tleV0uZW1pdHRlci5lbWl0KCd0cmFja3M6cGxheScsIHt9KTtcbiAgfSk7XG59KTtcblxucGF1c2VCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgT2JqZWN0LmtleXModHJhY2tzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIHRyYWNrc1trZXldLmVtaXR0ZXIuZW1pdCgndHJhY2tzOnBhdXNlJywge30pO1xuICB9KTtcbn0pO1xuXG5zdG9wQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gIE9iamVjdC5rZXlzKHRyYWNrcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICB0cmFja3Nba2V5XS5lbWl0dGVyLmVtaXQoJ3RyYWNrczpzdG9wJywge30pO1xuICB9KTtcbn0pO1xuXG5mdW5jdGlvbiBzaG93UGFzdGVDdXJzb3JzKCkge1xuICB2YXIgc2VsZWN0aW9ucyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5zZWxlY3Rpb24nKTtcbiAgZm9yICh2YXIgaT0wOyBpIDwgc2VsZWN0aW9uczsgaSsrKSB7XG4gICAgc2VsZWN0aW9uc1tpXS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICB9XG4gIHZhciBwYXN0ZUN1cnNvcnMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcucGFzdGUtY3Vyc29yJyk7XG4gIGZvciAodmFyIGk9MDsgaSA8IHBhc3RlQ3Vyc29yczsgaSsrKSB7XG4gICAgcGFzdGVDdXJzb3JzW2ldLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xuICB9XG59XG5cbmZ1bmN0aW9uIGhpZGVQYXN0ZUN1cnNvcnMoKSB7XG4gIHZhciBzZWxlY3Rpb25zID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnNlbGVjdGlvbicpO1xuICBmb3IgKHZhciBpPTA7IGkgPCBzZWxlY3Rpb25zOyBpKyspIHtcbiAgICBzZWxlY3Rpb25zW2ldLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xuICB9XG4gIHZhciBwYXN0ZUN1cnNvcnMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcucGFzdGUtY3Vyc29yJyk7XG4gIGZvciAodmFyIGk9MDsgaSA8IHBhc3RlQ3Vyc29yczsgaSsrKSB7XG4gICAgcGFzdGVDdXJzb3JzW2ldLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gIH1cbn1cblxuZnVuY3Rpb24gZW5hYmxlUGxheWJhY2tPcHRzKCkge1xuICBwbGF5QnRuLmRpc2FibGVkID0gZmFsc2U7XG4gIGNvcHlCdG4uZGlzYWJsZWQgPSBmYWxzZTtcbiAgY3V0QnRuLmRpc2FibGVkID0gZmFsc2U7XG4gIHN0b3BCdG4uZGlzYWJsZWQgPSBmYWxzZTtcbiAgcGF1c2VCdG4uZGlzYWJsZWQgPSBmYWxzZTtcbiAgcmV2ZXJzZUJ0bi5kaXNhYmxlZCA9IGZhbHNlO1xufVxuXG5mdW5jdGlvbiBlbmFibGVDbGlwYm9hcmRPcHRzKCkge1xuICBwcmVwZW5kQnRuLmRpc2FibGVkID0gZmFsc2U7XG4gIGFwcGVuZEJ0bi5kaXNhYmxlZCA9IGZhbHNlO1xuICBwYXN0ZUJ0bi5kaXNhYmxlZCA9IGZhbHNlO1xuICBkdXBsaWNhdGVCdG4uZGlzYWJsZWQgPSBmYWxzZTtcbn1cblxuY29weUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICB2YXIgYWN0aXZlVHJhY2sgPSBnZXRBY3RpdmVUcmFjaygpO1xuICBpZiAoIWFjdGl2ZVRyYWNrKSByZXR1cm47XG5cbiAgdmFyIG9uQ29tcGxldGUgPSBmdW5jdGlvbigpIHtcbiAgICBjb25zb2xlLmxvZygnY29weSBidWZmZXIgY29tcGxldGU6ICcsIGFjdGl2ZVRyYWNrLmNsaXBib2FyZC5idWZmZXIpO1xuICB9O1xuXG4gIHNob3dQYXN0ZUN1cnNvcnMoKTtcbiAgZW5hYmxlQ2xpcGJvYXJkT3B0cygpO1xuICBlZGl0b3IuY29weShhdWRpb0NvbnRleHQsIGFjdGl2ZVRyYWNrLmNsaXBib2FyZCwgYWN0aXZlVHJhY2suYXVkaW9zb3VyY2UuYnVmZmVyLCBvbkNvbXBsZXRlKTtcbn0pO1xuXG5jdXRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgdmFyIGFjdGl2ZVRyYWNrID0gZ2V0QWN0aXZlVHJhY2soKTtcbiAgaWYgKCFhY3RpdmVUcmFjaykgcmV0dXJuO1xuXG4gIHZhciBvbkNvbXBsZXRlID0gZnVuY3Rpb24oYnVmKSB7XG4gICAgYWN0aXZlVHJhY2suYXVkaW9zb3VyY2UuYnVmZmVyID0gYnVmO1xuICAgIGFjdGl2ZVRyYWNrLmRyYXdXYXZlcygpO1xuICB9O1xuXG4gIGFjdGl2ZVRyYWNrLmNsaXBib2FyZC5zdGFydCA9IGFjdGl2ZVRyYWNrLmNsaXBib2FyZC5zdGFydCArIGFjdGl2ZVRyYWNrLmxhc3RQbGF5O1xuICBhY3RpdmVUcmFjay5jbGlwYm9hcmQuZW5kID0gYWN0aXZlVHJhY2suY2xpcGJvYXJkLmVuZCArIGFjdGl2ZVRyYWNrLmxhc3RQbGF5O1xuXG4gIHNob3dQYXN0ZUN1cnNvcnMoKTtcbiAgZW5hYmxlQ2xpcGJvYXJkT3B0cygpO1xuICBlZGl0b3IuY3V0KGF1ZGlvQ29udGV4dCwgYWN0aXZlVHJhY2suY2xpcGJvYXJkLCBhY3RpdmVUcmFjay5hdWRpb3NvdXJjZS5idWZmZXIsIG9uQ29tcGxldGUpO1xufSk7XG5cbnBhc3RlQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gIHZhciBhY3RpdmVUcmFjayA9IGdldEFjdGl2ZVRyYWNrKCk7XG4gIGlmICghYWN0aXZlVHJhY2spIHJldHVybjtcbiAgdmFyIG9uQ29tcGxldGUgPSBmdW5jdGlvbihidWYpIHtcbiAgICBhY3RpdmVUcmFjay5hdWRpb3NvdXJjZS5idWZmZXIgPSBidWY7XG4gICAgY29uc29sZS5sb2coJ2NiIGNhbGxlZCBwYXN0ZScpO1xuICAgIGFjdGl2ZVRyYWNrLmRyYXdXYXZlcygpO1xuICB9O1xuXG4gIGVkaXRvci5wYXN0ZShhdWRpb0NvbnRleHQsIGFjdGl2ZVRyYWNrLmNsaXBib2FyZCwgYWN0aXZlVHJhY2suYXVkaW9zb3VyY2UuYnVmZmVyLCBhY3RpdmVUcmFjay5jbGlwYm9hcmQuYXQsIG9uQ29tcGxldGUpO1xuICBoaWRlUGFzdGVDdXJzb3JzKCk7XG59KTtcblxucHJlcGVuZEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICB2YXIgYWN0aXZlVHJhY2sgPSBnZXRBY3RpdmVUcmFjaygpO1xuICBpZiAoIWFjdGl2ZVRyYWNrKSByZXR1cm47XG4gIHZhciBvbkNvbXBsZXRlID0gZnVuY3Rpb24oYnVmKSB7XG4gICAgYWN0aXZlVHJhY2suYXVkaW9zb3VyY2UuYnVmZmVyID0gYnVmO1xuICAgIGFjdGl2ZVRyYWNrLmRyYXdXYXZlcygpO1xuICB9O1xuXG4gIGVkaXRvci5wYXN0ZShhdWRpb0NvbnRleHQsIGFjdGl2ZVRyYWNrLmNsaXBib2FyZCwgYWN0aXZlVHJhY2suYXVkaW9zb3VyY2UuYnVmZmVyLCAwLCBvbkNvbXBsZXRlKTtcbn0pO1xuXG5hcHBlbmRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgdmFyIGFjdGl2ZVRyYWNrID0gZ2V0QWN0aXZlVHJhY2soKTtcbiAgaWYgKCFhY3RpdmVUcmFjaykgcmV0dXJuO1xuICB2YXIgb25Db21wbGV0ZSA9IGZ1bmN0aW9uKGJ1Zikge1xuICAgIGFjdGl2ZVRyYWNrLmF1ZGlvc291cmNlLmJ1ZmZlciA9IGJ1ZjtcbiAgICBhY3RpdmVUcmFjay5kcmF3V2F2ZXMoKTtcbiAgfTtcblxuICBlZGl0b3IucGFzdGUoYXVkaW9Db250ZXh0LCBhY3RpdmVUcmFjay5jbGlwYm9hcmQsIGFjdGl2ZVRyYWNrLmF1ZGlvc291cmNlLmJ1ZmZlciwgYWN0aXZlVHJhY2suYXVkaW9zb3VyY2UuYnVmZmVyLmR1cmF0aW9uLCBvbkNvbXBsZXRlKTtcbn0pO1xuXG5yZXZlcnNlQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gIHZhciBhY3RpdmVUcmFjayA9IGdldEFjdGl2ZVRyYWNrKCk7XG4gIGlmICghYWN0aXZlVHJhY2spIHJldHVybjtcbiAgdmFyIG9uQ29tcGxldGUgPSBmdW5jdGlvbigpIHtcbiAgICBhY3RpdmVUcmFjay5kcmF3V2F2ZXMoKTtcbiAgfTtcblxuICBlZGl0b3IucmV2ZXJzZShhY3RpdmVUcmFjay5hdWRpb3NvdXJjZS5idWZmZXIsIG9uQ29tcGxldGUpO1xufSk7XG5cbmR1cGxpY2F0ZUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICB2YXIgYWN0aXZlVHJhY2sgPSBnZXRBY3RpdmVUcmFjaygpO1xuICBpZiAoIWFjdGl2ZVRyYWNrKSByZXR1cm47XG5cbiAgdmFyIG9uQ29tcGxldGUgPSBmdW5jdGlvbigpIHtcbiAgICBjb25zb2xlLmxvZygnZHVwbGljYXRpbmcgYnVmZmVyOiAnLCBhY3RpdmVUcmFjay5jbGlwYm9hcmQuYnVmZmVyKTtcbiAgICBuZXdUcmFja0Zyb21BdWRpb0J1ZmZlcihhY3RpdmVUcmFjay5jbGlwYm9hcmQuYnVmZmVyKTtcbiAgfTtcblxuICBpZiAoYWN0aXZlVHJhY2suY2xpcGJvYXJkLmJ1ZmZlcikge1xuICAgIG9uQ29tcGxldGUoKTtcbiAgfSBlbHNlIGlmIChhY3RpdmVUcmFjay5jbGlwYm9hcmQuc3RhcnQgPT09IDAgJiYgYWN0aXZlVHJhY2suY2xpcGJvYXJkLmVuZCA9PT0gMCkge1xuICAgIGFjdGl2ZVRyYWNrLmNsaXBib2FyZC5lbmQgPSBhY3RpdmVUcmFjay5hdWRpb3NvdXJjZS5idWZmZXIuZHVyYXRpb247XG4gICAgZWRpdG9yLmNvcHkoYXVkaW9Db250ZXh0LCBhY3RpdmVUcmFjay5jbGlwYm9hcmQsIGFjdGl2ZVRyYWNrLmF1ZGlvc291cmNlLmJ1ZmZlciwgb25Db21wbGV0ZSk7XG4gIH0gZWxzZSB7XG4gICAgZWRpdG9yLmNvcHkoYXVkaW9Db250ZXh0LCBhY3RpdmVUcmFjay5jbGlwYm9hcmQsIGFjdGl2ZVRyYWNrLmF1ZGlvc291cmNlLmJ1ZmZlciwgb25Db21wbGV0ZSk7XG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBnZXRBY3RpdmVUcmFjaygpIHtcbiAgdmFyIGFjdGl2ZVRyYWNrcyA9IFtdO1xuICBPYmplY3Qua2V5cyh0cmFja3MpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKHRyYWNrc1trZXldLmFjdGl2ZSkgYWN0aXZlVHJhY2tzLnB1c2godHJhY2tzW2tleV0pO1xuICB9KTtcblxuICBpZiAoYWN0aXZlVHJhY2tzLmxlbmd0aCA+IDEpIHtcbiAgICBhbGVydCgnWW91IGNhbm5vdCBoYXZlIG1vcmUgdGhhbiBvbmUgYWN0aXZhdGVkIHRyYWNrIGZvciB0aGlzIG9wdGlvbicpO1xuICB9IGVsc2UgaWYoIWFjdGl2ZVRyYWNrcy5sZW5ndGgpIHtcbiAgICBhbGVydCgnVGhlcmUgaXMgbm8gYWN0aXZlIHRyYWNrJyk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGFjdGl2ZVRyYWNrc1swXTtcbiAgfVxufVxuXG5mdW5jdGlvbiBuZXdUcmFja0Zyb21BdWRpb0J1ZmZlcihhdWRpb0J1ZmZlcikge1xuICB2YXIgY29udGFpbmVyRWwgPSB0cmFja1RtcCh7XG4gICAgdGl0bGU6IFwiVHJhY2sgMVwiXG4gIH0pO1xuICB2YXIgaWQgPSB1bmlxSWQoKTtcbiAgd29ya3NwYWNlRWwuYXBwZW5kQ2hpbGQoY29udGFpbmVyRWwpO1xuICB0cmFja3NbaWRdID0gbmV3IFRyYWNrKHtcbiAgICBpZDogaWQsXG4gICAgY29udGFpbkVsOiBjb250YWluZXJFbCxcbiAgICBjb250ZXh0OiBhdWRpb0NvbnRleHQsXG4gICAgZ2Fpbk5vZGU6IGF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKClcbiAgfSk7XG5cbiAgdHJhY2tzW2lkXS5hdWRpb3NvdXJjZSA9IG5ldyBBdWRpb1NvdXJjZShhdWRpb0NvbnRleHQsIHtcbiAgICBnYWluTm9kZTogdHJhY2tzW2lkXS5nYWluTm9kZVxuICB9KTtcblxuICB0cmFja3NbaWRdLmF1ZGlvc291cmNlLmJ1ZmZlciA9IGF1ZGlvQnVmZmVyO1xuXG4gIHRyYWNrc1tpZF0uYWRqdXN0V2F2ZSgpO1xuICB0cmFja3NbaWRdLmRyYXdXYXZlcygpO1xuICB0cmFja3NbaWRdLmZpbGVJbmRpY2F0b3IucmVtb3ZlKCk7XG59XG5cbmZ1bmN0aW9uIG5ld1RyYWNrRnJvbUZpbGUoZmlsZSkge1xuICBpZiAoZmlsZSA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG4gIGlmICghfmZpbGUudHlwZS5pbmRleE9mKCdhdWRpbycpKSB7XG4gICAgYWxlcnQoJ2F1ZGlvIGZpbGVzIG9ubHkgcGxlYXNlLicpO1xuICAgIC8vIGFsZXJ0KGZpbGUudHlwZSArICcgZmlsZXMgYXJlIG5vdCBzdXBwb3J0ZWQuJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHdlbGNvbWUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgdmFyIGNvbnRhaW5lckVsID0gdHJhY2tUbXAoe1xuICAgIHRpdGxlOiBmaWxlLm5hbWVcbiAgfSk7XG4gIHZhciBpZCA9IHVuaXFJZCgpO1xuXG4gIHdvcmtzcGFjZUVsLmFwcGVuZENoaWxkKGNvbnRhaW5lckVsKTtcbiAgdHJhY2tzW2lkXSA9IG5ldyBUcmFjayh7XG4gICAgdGl0bGU6IGZpbGUubmFtZSxcbiAgICBpZDogaWQsXG4gICAgY29udGFpbkVsOiBjb250YWluZXJFbCxcbiAgICBjb250ZXh0OiBhdWRpb0NvbnRleHRcbiAgfSk7XG4gIHRyYWNrc1tpZF0uZW1pdHRlci5vbigndHJhY2tzOnJlbW92ZScsIGZ1bmN0aW9uKGV2KSB7XG4gICAgdHJhY2tzW2V2LmlkXSA9IG51bGw7XG4gICAgZGVsZXRlIHRyYWNrc1tldi5pZF07XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcbiAgICBzaG93V2VsY29tZSgpO1xuICB9KTtcbiAgdHJhY2tzW2lkXS5sb2FkRmlsZShmaWxlKTtcbiAgZW5hYmxlUGxheWJhY2tPcHRzKCk7XG59XG5cbmZ1bmN0aW9uIG5ld1RyYWNrRnJvbVVSTCh1cmwpIHtcbiAgd2VsY29tZS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICB2YXIgY29udGFpbmVyRWwgPSB0cmFja1RtcCh7XG4gICAgdGl0bGU6IFwiUmVjb3JkaW5nIDFcIlxuICB9KTtcbiAgdmFyIGlkID0gdW5pcUlkKCk7XG5cbiAgd29ya3NwYWNlRWwuYXBwZW5kQ2hpbGQoY29udGFpbmVyRWwpO1xuICB0cmFja3NbaWRdID0gbmV3IFRyYWNrKHtcbiAgICB0aXRsZTogXCJSZWNvcmRpbmcgMVwiLFxuICAgIGlkOiBpZCxcbiAgICBjb250YWluRWw6IGNvbnRhaW5lckVsLFxuICAgIGNvbnRleHQ6IGF1ZGlvQ29udGV4dFxuICB9KTtcbiAgdHJhY2tzW2lkXS5lbWl0dGVyLm9uKCd0cmFja3M6cmVtb3ZlJywgZnVuY3Rpb24oZXYpIHtcbiAgICB0cmFja3NbZXYuaWRdID0gbnVsbDtcbiAgICBkZWxldGUgdHJhY2tzW2V2LmlkXTtcbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygpO1xuICAgIHNob3dXZWxjb21lKCk7XG4gIH0pO1xuICB0cmFja3NbaWRdLmxvYWRVUkwodXJsKTtcbiAgZW5hYmxlUGxheWJhY2tPcHRzKCk7XG59XG5cbmZ1bmN0aW9uIHNob3dXZWxjb21lKCkge1xuICBpZiAoIU9iamVjdC5rZXlzKHRyYWNrcykubGVuZ3RoKSB3ZWxjb21lLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xufVxuIiwidmFyIGggPSByZXF1aXJlKCdoeXBlcnNjcmlwdCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgcmV0dXJuIGgoJ2Rpdi5jb250cm9sJyxcbiAgICAgICAgICAgaCgnaGVhZGVyJyxcbiAgICAgICAgICAgICBoKCdwJywgZGF0YS50aXRsZSwge1wiY29udGVudGVkaXRhYmxlXCI6IFwidHJ1ZVwifSkpLFxuICAgICAgICAgICBoKCd1bC5hY3Rpb25zJyxcbiAgICAgICAgICAgICBoKCdsaS5hY3RpdmF0ZS5hY3RpdmUnLCB7XCJ0aXRsZVwiOiBcImFjdGl2YXRlXCJ9KSxcbiAgICAgICAgICAgICBoKCdsaS5lZGl0LmFjdGl2ZScsIHtcInRpdGxlXCI6IFwiZWRpdFwifSksXG4gICAgICAgICAgICAgaCgnbGkubXV0ZScsIHtcInRpdGxlXCI6IFwibXV0ZVwifSksXG4gICAgICAgICAgICAgaCgnbGkuZXhwb3J0Jywge1widGl0bGVcIjogXCJleHBvcnRcIn0pLFxuICAgICAgICAgICAgIGgoJ2xpLmNvbGxhcHNlJywge1widGl0bGVcIjogXCJjb2xsYXBzZVwifSksXG4gICAgICAgICAgICAgaCgnbGkucmVtb3ZlJywge1widGl0bGVcIjogXCJyZW1vdmVcIn0pKSxcbiAgICAgICAgICAgaCgnZGl2LnZvbHVtZScsXG4gICAgICAgICAgICAgaCgnaW5wdXQnLCB7XCJ0eXBlXCI6ICdyYW5nZScsIFwibWluXCI6ICcwJywgXCJtYXhcIjogJzEnLCBcInN0ZXBcIjogXCIuMDVcIiwgXCJ2YWx1ZVwiOiBcIi41MFwifSkpLFxuICAgICAgICAgICBoKCdhcnRpY2xlLmluZm8nLFxuICAgICAgICAgICAgIGgoJ3AnLCBcIkN1cnJlbnQgVGltZTogXCIsXG4gICAgICAgICAgICAgICBoKCdpLmN1cicsIFwiMDA6MDA6MDBcIikpLFxuICAgICAgICAgICAgIGgoJ3AnLCBcIkR1cmF0aW9uOiBcIixcbiAgICAgICAgICAgICAgIGgoJ2kuZHVyJywgXCIwMDowMDowMFwiKSksXG4gICAgICAgICAgICAgaCgncCcsIFwiUmVtYWluaW5nOiBcIixcbiAgICAgICAgICAgICAgIGgoJ2kucmVtJywgXCIwMDowMDowMFwiKSkpKTtcbiAgLy8gaCgnYnInKSxcbiAgLy8gaCgnc3Bhbi51cGxvYWQnLCBcInVwbG9hZCB0byBzb3VuZGNsb3VkXCIpKTtcbn1cblxuLy8gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihkYXRhKSB7XG4vLyAgIHJldHVybiBoKCdkaXYuY29udHJvbCcsXG4vLyAgICAgICAgICAgIGgoJ3NwYW4uZGUnLCBcImRlYWN0aXZhdGVcIiksXG4vLyAgICAgICAgICAgIGgoJ2Rpdi52b2x1bWUnLFxuLy8gICAgICAgICAgICAgIGgoJ2lucHV0Jywge1widHlwZVwiOiAncmFuZ2UnLCBcIm1pblwiOiAnMCcsIFwibWF4XCI6ICcxJywgXCJzdGVwXCI6IFwiLjA1XCIsIFwidmFsdWVcIjogXCIuNTBcIn0pKSxcbi8vICAgICAgICAgICAgaCgnc3Bhbi5tdXRlJywgXCJtdXRlXCIpLFxuLy8gICAgICAgICAgICBoKCdzcGFuLnNlbGVjdGluZycsIFwiaGlkZSBzZWxlY3Rpb25cIiksXG4vLyAgICAgICAgICAgIGgoJ2Rpdi5pbmZvJyxcbi8vICAgICAgICAgICAgICBoKCdwJywgXCJUaXRsZTogXCIsXG4vLyAgICAgICAgICAgICAgICBoKCdpLnRpdGxlJywgeydjb250ZW50RWRpdGFibGUnOiB0cnVlfSwgZGF0YS50aXRsZSkpLFxuLy8gICAgICAgICAgICAgIGgoJ2FydGljbGUuaW5mbycsXG4vLyAgICAgICAgICAgICAgICBoKCdwJywgXCJDdXJyZW50IFRpbWU6IFwiLFxuLy8gICAgICAgICAgICAgICAgICBoKCdpLmN1cicsIFwiMDA6MDA6MDBcIikpLFxuLy8gICAgICAgICAgICAgICAgaCgncCcsIFwiRHVyYXRpb246IFwiLFxuLy8gICAgICAgICAgICAgICAgICBoKCdpLmR1cicsIFwiMDA6MDA6MDBcIikpLFxuLy8gICAgICAgICAgICAgICAgaCgncCcsIFwiUmVtYWluaW5nOiBcIixcbi8vICAgICAgICAgICAgICAgICAgaCgnaS5yZW0nLCBcIjAwOjAwOjAwXCIpKSkpLFxuLy8gICAgICAgICAgICBoKCdzcGFuLmNvbGxhcHNlJywgXCJjb2xsYXBzZVwiKSxcbi8vICAgICAgICAgICAgaCgnc3Bhbi5yZW1vdmUnLCBcInJlbW92ZVwiKSxcbi8vICAgICAgICAgICAgaCgnc3Bhbi5leHBvcnQnLCBcImV4cG9ydFwiKSk7XG4vLyAgIC8vIGgoJ2JyJyksXG4vLyAgIC8vIGgoJ3NwYW4udXBsb2FkJywgXCJ1cGxvYWQgdG8gc291bmRjbG91ZFwiKSk7XG4vLyB9XG4iLCJ2YXIgaCA9IHJlcXVpcmUoJ2h5cGVyc2NyaXB0Jyk7XG52YXIgY29udHJvbFRtcCA9IHJlcXVpcmUoJy4vY29udHJvbC10bXAnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihkYXRhKSB7XG4gIHJldHVybiBoKCdkaXYudHJhY2stc3BhY2UnLFxuICAgICAgICAgICBjb250cm9sVG1wKGRhdGEpLFxuICAgICAgICAgICBoKCdkaXYudHJhY2suYWN0aXZlJyxcbiAgICAgICAgICAgICBoKCdwJyxcbiAgICAgICAgICAgICAgIFwiZHJhZyBmaWxlIDIgZWRpdFwiKSxcbiAgICAgICAgICAgICBoKCdkaXYucGxheS1jdXJzb3InKSxcbiAgICAgICAgICAgICBoKCdkaXYuc2VsZWN0aW9uJyksXG4gICAgICAgICAgICAgaCgnZGl2LndhdmUuc2VsZWN0YWJsZScsXG4gICAgICAgICAgICAgICBoKCdjYW52YXMnLCB7J2hlaWdodCc6ICczMDAnfSkpLFxuICAgICAgICAgICAgIGgoJ2Rpdi53YXZlLXByb2dyZXNzLnNlbGVjdGFibGUnLFxuICAgICAgICAgICAgICAgaCgnY2FudmFzJywgeydoZWlnaHQnOiAnMzAwJ30pKSkpO1xufVxuIixudWxsLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiJdfQ==
