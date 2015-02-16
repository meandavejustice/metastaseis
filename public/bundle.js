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

},{}],"/home/meandave/Code/metastaseis/node_modules/draw-wave/index.js":[function(require,module,exports){
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
},{}],"/home/meandave/Code/metastaseis/node_modules/encode-wav/index.js":[function(require,module,exports){
var work = require('webworkify');
var w = work(require('./work.js'));

module.exports = {
  encodeWAV: encodeWAV,
  getDownloadLink: getDownloadLink
};

function onComplete(cb) {
  w.addEventListener('message', function(ev) {
      cb(ev.data);
  });
}

function encodeWAV(channelBufferArray, sampleRate, cb) {
  w.postMessage({
    leftBuf: channelBufferArray[0],
    rightBuf: channelBufferArray[1],
    sampleRate: sampleRate
  });

  onComplete(cb);
}

function getDownloadLink(cb) {
  onComplete(function(blob) {
    var url = (window.URL || window.webkitURL).createObjectURL(blob);
    cb(url);
  })
}
},{"./work.js":"/home/meandave/Code/metastaseis/node_modules/encode-wav/work.js","webworkify":"/home/meandave/Code/metastaseis/node_modules/webworkify/index.js"}],"/home/meandave/Code/metastaseis/node_modules/encode-wav/work.js":[function(require,module,exports){
module.exports = function(self) {
  self.addEventListener('message', function(ev) {
    console.log('worker', ev);
    var blob = exportWAV(ev.data.leftBuf, ev.data.rightBuf, ev.data.sampleRate);
    self.postMessage(blob);
  }.bind(self));
}

function exportWAV(leftBuffer, rightBuffer, sampleRate) {
  var interleaved = interleave(leftBuffer, rightBuffer);
  var dataview = encodeWAV(interleaved, sampleRate);
  var audioBlob = new Blob([dataview], {type: "audio/wav"});

  this.postMessage(audioBlob);
}

function mergeBuffers(recBuffers, recLength){
  var result = new Float32Array(recLength);
  var offset = 0;

  for (var i = 0; i < recBuffers.length; i++){
    result.set(recBuffers[i], offset);
    offset += recBuffers[i].length;
  }

  return result;
}

function interleave(leftBuffer, rightBuffer){
  var length = leftBuffer.length + rightBuffer.length;
  var result = new Float32Array(length);

  var idx = 0,
      bufIdx = 0;

  while (idx < length) {
    // idx++
    result[idx++] = leftBuffer[bufIdx];
    result[idx++] = rightBuffer[bufIdx];
    bufIdx++;
  }

  return result;
}

function writeString(view, offset, string) {
  for (var i = 0; i < string.length; i++){
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function encodeWAV(samples, sampleRate){
  var buffer = new ArrayBuffer(44 + samples.length * 2);
  var view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + samples.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, 2, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 4, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 4, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);

  floatTo16BitPCM(view, 44, samples);

  return view;
}

function floatTo16BitPCM(output, offset, input){
  for (var i = 0; i < input.length; i++, offset+=2){
    var s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

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
},{}],"/home/meandave/Code/metastaseis/node_modules/merge-audio-buffers/index.js":[function(require,module,exports){
module.exports = mergeBuffers;

function mergeBuffers(buffers, ac) {
  var maxChannels = 0;
  var maxDuration = 0;
  for (var i = 0; i < buffers.length; i++) {
    if (buffers[i].numberOfChannels > maxChannels) {
      maxChannels = buffers[i].numberOfChannels;
    }
    if (buffers[i].duration > maxDuration) {
      maxDuration = buffers[i].duration;
    }
  }
  var out = ac.createBuffer(maxChannels,
                                 ac.sampleRate * maxDuration,
                                 ac.sampleRate);

  for (var j = 0; j < buffers.length; j++) {
    for (var srcChannel = 0; srcChannel < buffers[j].numberOfChannels; srcChannel++) {
      var outt = out.getChannelData(srcChannel);
      var inn = buffers[j].getChannelData(srcChannel);
      for (var i = 0; i < inn.length; i++) {
        outt[i] += inn[i];
      }
      out.getChannelData(srcChannel).set(outt, 0);
    }
  }
  return out;
}
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

},{}],"/home/meandave/Code/metastaseis/node_modules/webworkify/index.js":[function(require,module,exports){
var bundleFn = arguments[3];
var sources = arguments[4];
var cache = arguments[5];

var stringify = JSON.stringify;

module.exports = function (fn) {
    var keys = [];
    var wkey;
    var cacheKeys = Object.keys(cache);
    
    for (var i = 0, l = cacheKeys.length; i < l; i++) {
        var key = cacheKeys[i];
        if (cache[key].exports === fn) {
            wkey = key;
            break;
        }
    }
    
    if (!wkey) {
        wkey = Math.floor(Math.pow(16, 8) * Math.random()).toString(16);
        var wcache = {};
        for (var i = 0, l = cacheKeys.length; i < l; i++) {
            var key = cacheKeys[i];
            wcache[key] = key;
        }
        sources[wkey] = [
            Function(['require','module','exports'], '(' + fn + ')(self)'),
            wcache
        ];
    }
    var skey = Math.floor(Math.pow(16, 8) * Math.random()).toString(16);
    
    var scache = {}; scache[wkey] = wkey;
    sources[skey] = [
        Function(['require'],'require(' + stringify(wkey) + ')(self)'),
        scache
    ];
    
    var src = '(' + bundleFn + ')({'
        + Object.keys(sources).map(function (key) {
            return stringify(key) + ':['
                + sources[key][0]
                + ',' + stringify(sources[key][1]) + ']'
            ;
        }).join(',')
        + '},{},[' + stringify(skey) + '])'
    ;
    return new Worker(window.URL.createObjectURL(
        new Blob([src], { type: 'text/javascript' })
    ));
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
},{}],"/home/meandave/Code/metastaseis/public/lib/force-download.js":[function(require,module,exports){
module.exports = function(url, title) {
  var link = window.document.createElement('a');
  link.href = url;
  link.download = title || 'output.wav';
  var click = document.createEvent("Event");
  click.initEvent("click", true, true);
  link.dispatchEvent(click);
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

function update(duration, clean) {
  console.log('duration::', duration);
  var nuPointLength = calculatePoints(duration);

  if (clean) {
    timelineEl.innerHTML = '';
    getPoints(-5, duration);
    timelineEl.style.width = timelineEl.children.length * 100 + 'px';
  } else {
    if (nuPointLength < getPointLength()) return;
    var w = timelineEl.offsetWidth;
    timelineEl.innerHTML = '';
    getPoints(-5, duration);
    if (timelineEl.children.length * 100 > w) {
      timelineEl.style.width = timelineEl.children.length * 100 + 'px';
    }
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
var raf = require('raf');
var EE = require('events').EventEmitter;
var drawBuffer = require('draw-wave');
var encoder = require('encode-wav');
var AudioSource = require('audiosource');

var forceDownload = require('./force-download');
var timelineManage = require('./timeline');
var formatTime = require('./format-time');
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

  this.controlEl.querySelector('.export').addEventListener('click', function() {
    encoder.encodeWAV([this.audiosource.buffer.getChannelData(0), this.audiosource.buffer.getChannelData(1)],
            this.audiosource.buffer.sampleRate,
            function(blob) {
              if (blob) forceDownload(URL.createObjectURL(blob));
            })

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
  updateTimeline: function() {
    timelineManage.update(this.audiosource.buffer.duration);
  },
  adjustWave: function() {
    this.updateTimeline();
    // adjust the canvas and containers to fit with the buffer duration
    var w = (this.audiosource.buffer.duration / 5) * 100;
    this.trackEl.style.width = w +50+'px';
    this.wave.width = w;
    this.progressWave.querySelector('canvas').width = w;
  },
  drawWaves: function() {
    this.updateTimeline();
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
},{"./colors":"/home/meandave/Code/metastaseis/public/lib/colors.js","./force-download":"/home/meandave/Code/metastaseis/public/lib/force-download.js","./format-time":"/home/meandave/Code/metastaseis/public/lib/format-time.js","./timeline":"/home/meandave/Code/metastaseis/public/lib/timeline.js","audiosource":"/home/meandave/Code/metastaseis/node_modules/audiosource/index.js","draw-wave":"/home/meandave/Code/metastaseis/node_modules/draw-wave/index.js","encode-wav":"/home/meandave/Code/metastaseis/node_modules/encode-wav/index.js","events":"/home/meandave/Code/metastaseis/node_modules/watchify/node_modules/browserify/node_modules/events/events.js","raf":"/home/meandave/Code/metastaseis/node_modules/raf/index.js"}],"/home/meandave/Code/metastaseis/public/main.js":[function(require,module,exports){
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
var uniqId = function() {return Math.random().toString(16).slice(2);};

var drawer = document.querySelector('.drawer');
var fft = new FFT(audioContext, {canvas: drawer.querySelector('#fft')});

var controlSpaceEl = document.querySelector('.control-space');
var trackSpaceEl = document.querySelector('.track-space');

var mergeBuffers = require('merge-audio-buffers');
var encoder = require('encode-wav');

var mergeButton = document.querySelector('.merge');

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
var recordBtn = document.querySelector('#record');
var tracks = {};

var recording = false;

mergeButton.addEventListener('click', function() {
  var fullTracks = [];

  Object.keys(tracks).forEach(function(key) {
    fullTracks.push(tracks[key].audiosource.buffer);
  });

  var merged = mergeBuffers(fullTracks, audioContext);
  newTrackFromAudioBuffer(merged);
  encoder.encodeWAV([merged.getChannelData(0), merged.getChannelData(1)],
            merged.sampleRate,
            function(blob) {
              console.log('wav encoding complete: ', blob );
              if (blob) {
                var url = URL.createObjectURL(blob);
                var li = document.createElement('li');
                var au = document.createElement('audio');
                var hf = document.createElement('a');

                au.controls = true;
                au.src = url;
                hf.href = url;
                hf.download = new Date().toISOString() + '.wav';
                hf.innerHTML = hf.download;
                li.appendChild(au);
                li.appendChild(hf);
                document.body.appendChild(li);
              }
            })
})

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
  document.querySelector('#import').value = '';
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
    gainNode: audioContext.createGain(),
    context: audioContext
  });

  tracks[id].audiosource = new AudioSource(audioContext, {
    gainNode: tracks[id].gainNode
  });

  tracks[id].audiosource.buffer = audioBuffer;

  tracks[id].adjustWave();
  tracks[id].drawWaves();
  tracks[id].fileIndicator.remove();

  tracks[id].emitter.on('tracks:remove', function(ev) {
    tracks[ev.id] = null;
    delete tracks[ev.id];
    this.removeAllListeners();
    drawTimelineByLongestTrack();
    showWelcome();
  });

  enablePlaybackOpts();
}

function drawTimelineByLongestTrack() {
  if (!Object.keys(tracks).length) return;

  var prevBuf = {
    key: '',
    dur: 0
  };
  Object.keys(tracks).forEach(function(key) {
    var dur = tracks[key].audiosource.buffer.duration;
    if (dur > prevBuf.dur) {
      prevBuf = {
        key: key,
        dur: dur
      }
    }
  });

  tracks[prevBuf.key].updateTimeline();
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
    drawTimelineByLongestTrack();
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
    drawTimelineByLongestTrack();
    showWelcome();
  });
  tracks[id].loadURL(url);
  enablePlaybackOpts();
}

function showWelcome() {
  if (!Object.keys(tracks).length) welcome.style.display = 'block';
}

},{"../templates/control-tmp":"/home/meandave/Code/metastaseis/templates/control-tmp.js","../templates/track-tmp":"/home/meandave/Code/metastaseis/templates/track-tmp.js","./lib/edits":"/home/meandave/Code/metastaseis/public/lib/edits.js","./lib/record":"/home/meandave/Code/metastaseis/public/lib/record.js","./lib/track":"/home/meandave/Code/metastaseis/public/lib/track.js","audio-fft":"/home/meandave/Code/metastaseis/node_modules/audio-fft/index.js","audiocontext":"/home/meandave/Code/metastaseis/node_modules/audiocontext/src/audiocontext.js","audiosource":"/home/meandave/Code/metastaseis/node_modules/audiosource/index.js","drag-drop":"/home/meandave/Code/metastaseis/node_modules/drag-drop/index.js","encode-wav":"/home/meandave/Code/metastaseis/node_modules/encode-wav/index.js","merge-audio-buffers":"/home/meandave/Code/metastaseis/node_modules/merge-audio-buffers/index.js"}],"/home/meandave/Code/metastaseis/templates/control-tmp.js":[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzL2F1ZGlvLWZmdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9hdWRpb2NvbnRleHQvc3JjL2F1ZGlvY29udGV4dC5qcyIsIm5vZGVfbW9kdWxlcy9hdWRpb3NvdXJjZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kcmFnLWRyb3AvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZHJhZy1kcm9wL25vZGVfbW9kdWxlcy9sb2Rhc2gudGhyb3R0bGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZHJhZy1kcm9wL25vZGVfbW9kdWxlcy9sb2Rhc2gudGhyb3R0bGUvbm9kZV9tb2R1bGVzL2xvZGFzaC5kZWJvdW5jZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kcmFnLWRyb3Avbm9kZV9tb2R1bGVzL2xvZGFzaC50aHJvdHRsZS9ub2RlX21vZHVsZXMvbG9kYXNoLmRlYm91bmNlL25vZGVfbW9kdWxlcy9sb2Rhc2gubm93L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2RyYWctZHJvcC9ub2RlX21vZHVsZXMvbG9kYXNoLnRocm90dGxlL25vZGVfbW9kdWxlcy9sb2Rhc2guZGVib3VuY2Uvbm9kZV9tb2R1bGVzL2xvZGFzaC5ub3cvbm9kZV9tb2R1bGVzL2xvZGFzaC5faXNuYXRpdmUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZHJhZy1kcm9wL25vZGVfbW9kdWxlcy9sb2Rhc2gudGhyb3R0bGUvbm9kZV9tb2R1bGVzL2xvZGFzaC5pc2Z1bmN0aW9uL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2RyYWctZHJvcC9ub2RlX21vZHVsZXMvbG9kYXNoLnRocm90dGxlL25vZGVfbW9kdWxlcy9sb2Rhc2guaXNvYmplY3QvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZHJhZy1kcm9wL25vZGVfbW9kdWxlcy9sb2Rhc2gudGhyb3R0bGUvbm9kZV9tb2R1bGVzL2xvZGFzaC5pc29iamVjdC9ub2RlX21vZHVsZXMvbG9kYXNoLl9vYmplY3R0eXBlcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kcmF3LXdhdmUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZW5jb2RlLXdhdi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9lbmNvZGUtd2F2L3dvcmsuanMiLCJub2RlX21vZHVsZXMvaHlwZXJzY3JpcHQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvaHlwZXJzY3JpcHQvbm9kZV9tb2R1bGVzL2Jyb3dzZXItc3BsaXQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvaHlwZXJzY3JpcHQvbm9kZV9tb2R1bGVzL2NsYXNzLWxpc3QvaW5kZXguanMiLCJub2RlX21vZHVsZXMvaHlwZXJzY3JpcHQvbm9kZV9tb2R1bGVzL2NsYXNzLWxpc3Qvbm9kZV9tb2R1bGVzL2luZGV4b2YvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbWVyZ2UtYXVkaW8tYnVmZmVycy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9yYWYvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcmFmL25vZGVfbW9kdWxlcy9wZXJmb3JtYW5jZS1ub3cvbGliL3BlcmZvcm1hbmNlLW5vdy5qcyIsIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIiwibm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvd2Vid29ya2lmeS9pbmRleC5qcyIsInB1YmxpYy9saWIvY29sb3JzLmpzIiwicHVibGljL2xpYi9lZGl0cy5qcyIsInB1YmxpYy9saWIvZm9yY2UtZG93bmxvYWQuanMiLCJwdWJsaWMvbGliL2Zvcm1hdC10aW1lLmpzIiwicHVibGljL2xpYi9yZWNvcmQuanMiLCJwdWJsaWMvbGliL3RpbWVsaW5lLmpzIiwicHVibGljL2xpYi90cmFjay5qcyIsInB1YmxpYy9tYWluLmpzIiwidGVtcGxhdGVzL2NvbnRyb2wtdG1wLmpzIiwidGVtcGxhdGVzL3RyYWNrLXRtcC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwWUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6WkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogcHVsbGVkIGZyb20gQGpzYW50ZWxsXG4gKlxuICogaHR0cHM6Ly9naXRodWIuY29tL2pzYW50ZWxsL2RzcC13aXRoLXdlYi1hdWRpby1wcmVzZW50YXRpb24vYmxvYi9naC1wYWdlcy9leGFtcGxlcy9GRlQuanNcbiAqXG4gKi9cblxudmFyIE1BWF9VSU5UOCA9IDI1NTtcblxubW9kdWxlLmV4cG9ydHMgPSBGRlQ7XG5cbmZ1bmN0aW9uIEZGVCAoY3R4LCBvcHRpb25zKSB7XG4gIHZhciBtb2R1bGUgPSB0aGlzO1xuICB0aGlzLmNhbnZhcyA9IG9wdGlvbnMuY2FudmFzO1xuICB0aGlzLm9uQmVhdCA9IG9wdGlvbnMub25CZWF0O1xuICB0aGlzLm9mZkJlYXQgPSBvcHRpb25zLm9mZkJlYXQ7XG4gIHRoaXMudHlwZSA9IG9wdGlvbnMudHlwZSB8fCAnZnJlcXVlbmN5JztcbiAgdGhpcy5zcGFjaW5nID0gb3B0aW9ucy5zcGFjaW5nIHx8IDE7XG4gIHRoaXMud2lkdGggPSBvcHRpb25zLndpZHRoIHx8IDE7XG4gIHRoaXMuY291bnQgPSBvcHRpb25zLmNvdW50IHx8IDUxMjtcbiAgdGhpcy5pbnB1dCA9IHRoaXMub3V0cHV0ID0gY3R4LmNyZWF0ZUFuYWx5c2VyKCk7XG4gIHRoaXMucHJvYyA9IGN0eC5jcmVhdGVTY3JpcHRQcm9jZXNzb3IoMjU2LCAxLCAxKTtcbiAgdGhpcy5kYXRhID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5pbnB1dC5mcmVxdWVuY3lCaW5Db3VudCk7XG4gIHRoaXMuY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcblxuICB0aGlzLmRlY2F5ID0gb3B0aW9ucy5kZWNheSB8fCAwLjAwMjtcbiAgdGhpcy50aHJlc2hvbGQgPSBvcHRpb25zLnRocmVzaG9sZCB8fCAwLjU7XG4gIHRoaXMucmFuZ2UgPSBvcHRpb25zLnJhbmdlIHx8IFswLCB0aGlzLmRhdGEubGVuZ3RoLTFdO1xuICB0aGlzLndhaXQgPSBvcHRpb25zLndhaXQgfHwgNTEyO1xuXG4gIHRoaXMuaCA9IHRoaXMuY2FudmFzLmhlaWdodDtcbiAgdGhpcy53ID0gdGhpcy5jYW52YXMud2lkdGg7XG5cbiAgdGhpcy5pbnB1dC5jb25uZWN0KHRoaXMucHJvYyk7XG4gIHRoaXMucHJvYy5vbmF1ZGlvcHJvY2VzcyA9IHByb2Nlc3MuYmluZChudWxsLCBtb2R1bGUpO1xuICB0aGlzLmN0eC5saW5lV2lkdGggPSBtb2R1bGUud2lkdGg7XG59XG5cbkZGVC5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uIChub2RlKSB7XG4gIHRoaXMub3V0cHV0LmNvbm5lY3Qobm9kZSk7XG4gIHRoaXMucHJvYy5jb25uZWN0KG5vZGUpO1xufVxuXG5mdW5jdGlvbiBwcm9jZXNzIChtb2R1bGUpIHtcblxuICB2YXIgY3R4ID0gbW9kdWxlLmN0eDtcbiAgdmFyIGRhdGEgPSBtb2R1bGUuZGF0YTtcbiAgY3R4LmNsZWFyUmVjdCgwLCAwLCBtb2R1bGUudywgbW9kdWxlLmgpO1xuICBjdHguZmlsbFN0eWxlID0gbW9kdWxlLmZpbGxTdHlsZSB8fCAnIzAwMDAwMCc7XG4gIGN0eC5zdHJva2VTdHlsZSA9IG1vZHVsZS5zdHJva2VTdHlsZSB8fCAnIzAwMDAwMCc7XG5cbiAgaWYgKG1vZHVsZS50eXBlID09PSAnZnJlcXVlbmN5Jykge1xuICAgIG1vZHVsZS5pbnB1dC5nZXRCeXRlRnJlcXVlbmN5RGF0YShkYXRhKTtcbiAgICAvLyBBYm9ydCBpZiBubyBkYXRhIGNvbWluZyB0aHJvdWdoLCBxdWljayBoYWNrLCBuZWVkcyBmaXhlZFxuICAgIGlmIChtb2R1bGUuZGF0YVszXSA8IDUpIHJldHVybjtcblxuICAgIGZvciAodmFyIGk9IDAsIGwgPSBkYXRhLmxlbmd0aDsgaSA8IGwgJiYgaSA8IG1vZHVsZS5jb3VudDsgaSsrKSB7XG4gICAgICBjdHguZmlsbFJlY3QoXG4gICAgICAgIGkgKiAobW9kdWxlLnNwYWNpbmcgKyBtb2R1bGUud2lkdGgpLFxuICAgICAgICBtb2R1bGUuaCxcbiAgICAgICAgbW9kdWxlLndpZHRoLFxuICAgICAgICAtKG1vZHVsZS5oIC8gTUFYX1VJTlQ4KSAqIGRhdGFbaV1cbiAgICAgICk7XG4gICAgfVxuICB9XG4gIGVsc2UgaWYgKG1vZHVsZS50eXBlID09PSAndGltZScpIHtcbiAgICBtb2R1bGUuaW5wdXQuZ2V0Qnl0ZVRpbWVEb21haW5EYXRhKGRhdGEpO1xuICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICBjdHgubW92ZVRvKDAsIG1vZHVsZS5oIC8gMik7XG4gICAgZm9yICh2YXIgaT0gMCwgbCA9IGRhdGEubGVuZ3RoOyBpIDwgbCAmJiBpIDwgbW9kdWxlLmNvdW50OyBpKyspIHtcbiAgICAgIGN0eC5saW5lVG8oXG4gICAgICAgIGkgKiAobW9kdWxlLnNwYWNpbmcgKyBtb2R1bGUud2lkdGgpLFxuICAgICAgICAobW9kdWxlLmggLyBNQVhfVUlOVDgpICogZGF0YVtpXVxuICAgICAgKTtcbiAgICB9XG4gICAgY3R4LnN0cm9rZSgpO1xuICAgIGN0eC5jbG9zZVBhdGgoKTtcbiAgfVxufVxuIiwiLypcbiAqIFdlYiBBdWRpbyBBUEkgQXVkaW9Db250ZXh0IHNoaW1cbiAqL1xuKGZ1bmN0aW9uIChkZWZpbml0aW9uKSB7XG4gICAgaWYgKHR5cGVvZiBleHBvcnRzID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gZGVmaW5pdGlvbigpO1xuICAgIH1cbn0pKGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDtcbn0pO1xuIiwiLypcbiAqIEF1ZGlvU291cmNlXG4gKlxuICogKiBNVVNUIHBhc3MgYW4gYXVkaW8gY29udGV4dFxuICpcbiAqL1xuZnVuY3Rpb24gQXVkaW9Tb3VyY2UgKGNvbnRleHQsIG9wdHMpIHtcbiAgaWYgKCFjb250ZXh0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdZb3UgbXVzdCBwYXNzIGFuIGF1ZGlvIGNvbnRleHQgdG8gdXNlIHRoaXMgbW9kdWxlJyk7XG4gIH1cbiAgaWYgKG9wdHMgPT09IHVuZGVmaW5lZCkgb3B0cyA9IHt9O1xuXG4gIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gIHRoaXMuYnVmZmVyID0gdW5kZWZpbmVkO1xuICB0aGlzLnVybCA9IG9wdHMudXJsID8gb3B0cy51cmwgOiB1bmRlZmluZWQ7XG4gIHRoaXMuZmZ0cyA9IG9wdHMuZmZ0cyA/IG9wdHMuZmZ0cyA6IFtdO1xuICB0aGlzLmdhaW5Ob2RlID0gb3B0cy5nYWluTm9kZSA/IG9wdHMuZ2Fpbk5vZGUgOiB1bmRlZmluZWQ7XG59XG5cbkF1ZGlvU291cmNlLnByb3RvdHlwZSA9IHtcbiAgbmVlZEJ1ZmZlcjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuYnVmZmVyID09PSB1bmRlZmluZWQ7XG4gIH0sXG4gIGxvYWRTb3VuZDogZnVuY3Rpb24odXJsLCBjYikge1xuICAgIHZhciByZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICByZXEub3BlbignR0VUJywgdXJsLCB0cnVlKTtcbiAgICByZXEucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmVxLm9ubG9hZGVuZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgc2VsZi5kZWNvZGUuY2FsbChzZWxmLCByZXEucmVzcG9uc2UsIGNiKTtcbiAgICB9O1xuICAgIHJlcS5zZW5kKCk7XG4gIH0sXG4gIGdldEJ1ZmZlcjogZnVuY3Rpb24oY2IpIHtcbiAgICBpZiAoIXRoaXMubmVlZEJ1ZmZlcigpKSByZXR1cm47XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMubG9hZFNvdW5kKHRoaXMudXJsLCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICBzZWxmLm9uTG9hZGVkLmNhbGwoc2VsZiwgZGF0YSwgdHJ1ZSk7XG4gICAgfSk7XG4gIH0sXG4gIGdldFNvdXJjZTogZnVuY3Rpb24oY2IpIHtcbiAgICBpZiAodGhpcy5zb3VyY2UpIHtcbiAgICAgIGNiKHRoaXMuc291cmNlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdGhpcy5kaXNjb25uZWN0KCk7XG4gICAgICB0aGlzLmxvYWRTb3VuZCh0aGlzLnVybCwgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICB0aGlzLnNvdXJjZSA9IHNlbGYuY3JlYXRlU291cmNlLmNhbGwoc2VsZiwgZGF0YSwgdHJ1ZSk7XG4gICAgICAgIGNiKHRoaXMuc291cmNlKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcbiAgb25Mb2FkZWQ6IGZ1bmN0aW9uKHNvdXJjZSwgc2lsZW50KSB7XG4gICAgdGhpcy5idWZmZXIgPSBzb3VyY2U7XG4gICAgdGhpcy5kaXNjb25uZWN0KCk7XG4gICAgdGhpcy5zb3VyY2UgPSB0aGlzLmNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG4gICAgdGhpcy5zb3VyY2UuYnVmZmVyID0gdGhpcy5idWZmZXI7XG4gICAgdGhpcy5zb3VyY2UuY29ubmVjdCh0aGlzLmdhaW5Ob2RlKTtcbiAgICB0aGlzLmZmdHMuZm9yRWFjaChmdW5jdGlvbihmZnQpIHtcbiAgICAgIHRoaXMuZ2Fpbk5vZGUuY29ubmVjdChmZnQuaW5wdXQpO1xuICAgIH0sIHRoaXMpO1xuICAgIHRoaXMuZ2Fpbk5vZGUuY29ubmVjdCh0aGlzLmNvbnRleHQuZGVzdGluYXRpb24pO1xuICAgIHRoaXMuZmZ0cy5mb3JFYWNoKGZ1bmN0aW9uKGZmdCkge1xuICAgICAgZmZ0LmNvbm5lY3QodGhpcy5jb250ZXh0LmRlc3RpbmF0aW9uKTtcbiAgICB9LCB0aGlzKTtcbiAgICBpZiAoIXNpbGVudCkgdGhpcy5wbGF5U291bmQoKTtcbiAgfSxcbiAgZGlzY29ubmVjdDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuc291cmNlKSB7XG4gICAgICB0aGlzLnNvdXJjZS5kaXNjb25uZWN0KHRoaXMuY29udGV4dC5kZXN0aW5hdGlvbik7XG4gICAgfVxuICB9LFxuICBwbGF5U291bmQ6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLnBsYXlUaW1lKSB7XG4gICAgICB0aGlzLnNvdXJjZS5zdGFydCgwLCB0aGlzLm9mZnNldCk7XG4gICAgfVxuXG4gICAgdGhpcy5wbGF5VGltZSA9IHRoaXMuY29udGV4dC5jdXJyZW50VGltZTtcbiAgfSxcbiAgbG9hZFNpbGVudDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLm5lZWRCdWZmZXIoKSkgcmV0dXJuO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmxvYWRTb3VuZCh0aGlzLnVybCwgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgc2VsZi5vbkxvYWRlZC5jYWxsKHNlbGYsIGRhdGEsIHRydWUpO1xuICAgIH0pO1xuICB9LFxuICBwbGF5OiBmdW5jdGlvbihzdGFydHRpbWUsIG9mZnNldCkge1xuICAgIHRoaXMucGxheVRpbWUgPSBzdGFydHRpbWUgPyBzdGFydHRpbWUgOiB0aGlzLmNvbnRleHQuY3VycmVudFRpbWU7XG4gICAgdGhpcy5vZmZzZXQgPSBvZmZzZXQgPyBvZmZzZXQgOiAwO1xuXG4gICAgaWYgKHRoaXMubmVlZEJ1ZmZlcigpKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB0aGlzLmxvYWRTb3VuZCh0aGlzLnVybCwgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICBzZWxmLm9uTG9hZGVkLmNhbGwoc2VsZiwgZGF0YSk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5vbkxvYWRlZCh0aGlzLmJ1ZmZlcik7XG4gICAgfVxuICB9LFxuICBzdG9wOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNvdXJjZS5zdG9wKHRoaXMuY29udGV4dC5jdXJyZW50VGltZSk7XG4gIH0sXG4gIGRlY29kZTogZnVuY3Rpb24oZGF0YSwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICB0aGlzLmNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKGRhdGEsIHN1Y2Nlc3MsIGVycm9yKTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBBdWRpb1NvdXJjZTtcbiIsIm1vZHVsZS5leHBvcnRzID0gRHJhZ0Ryb3BcblxudmFyIHRocm90dGxlID0gcmVxdWlyZSgnbG9kYXNoLnRocm90dGxlJylcblxuZnVuY3Rpb24gRHJhZ0Ryb3AgKGVsZW0sIGNiKSB7XG4gIGlmICh0eXBlb2YgZWxlbSA9PT0gJ3N0cmluZycpIGVsZW0gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGVsZW0pXG4gIGVsZW0uYWRkRXZlbnRMaXN0ZW5lcignZHJhZ2VudGVyJywga2lsbEV2ZW50LCBmYWxzZSlcbiAgZWxlbS5hZGRFdmVudExpc3RlbmVyKCdkcmFnb3ZlcicsIG1ha2VPbkRyYWdPdmVyKGVsZW0pLCBmYWxzZSlcbiAgZWxlbS5hZGRFdmVudExpc3RlbmVyKCdkcm9wJywgb25Ecm9wLmJpbmQodW5kZWZpbmVkLCBlbGVtLCBjYiksIGZhbHNlKVxufVxuXG5mdW5jdGlvbiBraWxsRXZlbnQgKGUpIHtcbiAgZS5zdG9wUHJvcGFnYXRpb24oKVxuICBlLnByZXZlbnREZWZhdWx0KClcbiAgcmV0dXJuIGZhbHNlXG59XG5cbmZ1bmN0aW9uIG1ha2VPbkRyYWdPdmVyIChlbGVtKSB7XG4gIHZhciBmbiA9IHRocm90dGxlKGZ1bmN0aW9uICgpIHtcbiAgICBlbGVtLmNsYXNzTGlzdC5hZGQoJ2RyYWcnKVxuXG4gICAgaWYgKGVsZW0udGltZW91dCkgY2xlYXJUaW1lb3V0KGVsZW0udGltZW91dClcbiAgICBlbGVtLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgIGVsZW0uY2xhc3NMaXN0LnJlbW92ZSgnZHJhZycpXG4gICAgfSwgMTUwKVxuICB9LCAxMDAsIHt0cmFpbGluZzogZmFsc2V9KVxuXG4gIHJldHVybiBmdW5jdGlvbiAoZSkge1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBlLmRhdGFUcmFuc2Zlci5kcm9wRWZmZWN0ID0gJ2NvcHknXG4gICAgZm4oKVxuICB9XG59XG5cbmZ1bmN0aW9uIG9uRHJvcCAoZWxlbSwgY2IsIGUpIHtcbiAgZS5zdG9wUHJvcGFnYXRpb24oKVxuICBlLnByZXZlbnREZWZhdWx0KClcbiAgZWxlbS5jbGFzc0xpc3QucmVtb3ZlKCdkcmFnJylcbiAgY2IoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZS5kYXRhVHJhbnNmZXIuZmlsZXMpLCB7IHg6IGUuY2xpZW50WCwgeTogZS5jbGllbnRZIH0pXG4gIHJldHVybiBmYWxzZVxufVxuIiwiLyoqXG4gKiBMby1EYXNoIDIuNC4xIChDdXN0b20gQnVpbGQpIDxodHRwOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIG1vZGVybiBleHBvcnRzPVwibnBtXCIgLW8gLi9ucG0vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxMyBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS41LjIgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHA6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cbnZhciBkZWJvdW5jZSA9IHJlcXVpcmUoJ2xvZGFzaC5kZWJvdW5jZScpLFxuICAgIGlzRnVuY3Rpb24gPSByZXF1aXJlKCdsb2Rhc2guaXNmdW5jdGlvbicpLFxuICAgIGlzT2JqZWN0ID0gcmVxdWlyZSgnbG9kYXNoLmlzb2JqZWN0Jyk7XG5cbi8qKiBVc2VkIGFzIGFuIGludGVybmFsIGBfLmRlYm91bmNlYCBvcHRpb25zIG9iamVjdCAqL1xudmFyIGRlYm91bmNlT3B0aW9ucyA9IHtcbiAgJ2xlYWRpbmcnOiBmYWxzZSxcbiAgJ21heFdhaXQnOiAwLFxuICAndHJhaWxpbmcnOiBmYWxzZVxufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgZnVuY3Rpb24gdGhhdCwgd2hlbiBleGVjdXRlZCwgd2lsbCBvbmx5IGNhbGwgdGhlIGBmdW5jYCBmdW5jdGlvblxuICogYXQgbW9zdCBvbmNlIHBlciBldmVyeSBgd2FpdGAgbWlsbGlzZWNvbmRzLiBQcm92aWRlIGFuIG9wdGlvbnMgb2JqZWN0IHRvXG4gKiBpbmRpY2F0ZSB0aGF0IGBmdW5jYCBzaG91bGQgYmUgaW52b2tlZCBvbiB0aGUgbGVhZGluZyBhbmQvb3IgdHJhaWxpbmcgZWRnZVxuICogb2YgdGhlIGB3YWl0YCB0aW1lb3V0LiBTdWJzZXF1ZW50IGNhbGxzIHRvIHRoZSB0aHJvdHRsZWQgZnVuY3Rpb24gd2lsbFxuICogcmV0dXJuIHRoZSByZXN1bHQgb2YgdGhlIGxhc3QgYGZ1bmNgIGNhbGwuXG4gKlxuICogTm90ZTogSWYgYGxlYWRpbmdgIGFuZCBgdHJhaWxpbmdgIG9wdGlvbnMgYXJlIGB0cnVlYCBgZnVuY2Agd2lsbCBiZSBjYWxsZWRcbiAqIG9uIHRoZSB0cmFpbGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0IG9ubHkgaWYgdGhlIHRoZSB0aHJvdHRsZWQgZnVuY3Rpb24gaXNcbiAqIGludm9rZWQgbW9yZSB0aGFuIG9uY2UgZHVyaW5nIHRoZSBgd2FpdGAgdGltZW91dC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IEZ1bmN0aW9uc1xuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gdGhyb3R0bGUuXG4gKiBAcGFyYW0ge251bWJlcn0gd2FpdCBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byB0aHJvdHRsZSBleGVjdXRpb25zIHRvLlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBUaGUgb3B0aW9ucyBvYmplY3QuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmxlYWRpbmc9dHJ1ZV0gU3BlY2lmeSBleGVjdXRpb24gb24gdGhlIGxlYWRpbmcgZWRnZSBvZiB0aGUgdGltZW91dC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHJhaWxpbmc9dHJ1ZV0gU3BlY2lmeSBleGVjdXRpb24gb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyB0aHJvdHRsZWQgZnVuY3Rpb24uXG4gKiBAZXhhbXBsZVxuICpcbiAqIC8vIGF2b2lkIGV4Y2Vzc2l2ZWx5IHVwZGF0aW5nIHRoZSBwb3NpdGlvbiB3aGlsZSBzY3JvbGxpbmdcbiAqIHZhciB0aHJvdHRsZWQgPSBfLnRocm90dGxlKHVwZGF0ZVBvc2l0aW9uLCAxMDApO1xuICogalF1ZXJ5KHdpbmRvdykub24oJ3Njcm9sbCcsIHRocm90dGxlZCk7XG4gKlxuICogLy8gZXhlY3V0ZSBgcmVuZXdUb2tlbmAgd2hlbiB0aGUgY2xpY2sgZXZlbnQgaXMgZmlyZWQsIGJ1dCBub3QgbW9yZSB0aGFuIG9uY2UgZXZlcnkgNSBtaW51dGVzXG4gKiBqUXVlcnkoJy5pbnRlcmFjdGl2ZScpLm9uKCdjbGljaycsIF8udGhyb3R0bGUocmVuZXdUb2tlbiwgMzAwMDAwLCB7XG4gKiAgICd0cmFpbGluZyc6IGZhbHNlXG4gKiB9KSk7XG4gKi9cbmZ1bmN0aW9uIHRocm90dGxlKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcbiAgdmFyIGxlYWRpbmcgPSB0cnVlLFxuICAgICAgdHJhaWxpbmcgPSB0cnVlO1xuXG4gIGlmICghaXNGdW5jdGlvbihmdW5jKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3I7XG4gIH1cbiAgaWYgKG9wdGlvbnMgPT09IGZhbHNlKSB7XG4gICAgbGVhZGluZyA9IGZhbHNlO1xuICB9IGVsc2UgaWYgKGlzT2JqZWN0KG9wdGlvbnMpKSB7XG4gICAgbGVhZGluZyA9ICdsZWFkaW5nJyBpbiBvcHRpb25zID8gb3B0aW9ucy5sZWFkaW5nIDogbGVhZGluZztcbiAgICB0cmFpbGluZyA9ICd0cmFpbGluZycgaW4gb3B0aW9ucyA/IG9wdGlvbnMudHJhaWxpbmcgOiB0cmFpbGluZztcbiAgfVxuICBkZWJvdW5jZU9wdGlvbnMubGVhZGluZyA9IGxlYWRpbmc7XG4gIGRlYm91bmNlT3B0aW9ucy5tYXhXYWl0ID0gd2FpdDtcbiAgZGVib3VuY2VPcHRpb25zLnRyYWlsaW5nID0gdHJhaWxpbmc7XG5cbiAgcmV0dXJuIGRlYm91bmNlKGZ1bmMsIHdhaXQsIGRlYm91bmNlT3B0aW9ucyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdGhyb3R0bGU7XG4iLCIvKipcbiAqIExvLURhc2ggMi40LjEgKEN1c3RvbSBCdWlsZCkgPGh0dHA6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZHVsYXJpemUgbW9kZXJuIGV4cG9ydHM9XCJucG1cIiAtbyAuL25wbS9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDEzIFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjUuMiA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTMgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cDovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xudmFyIGlzRnVuY3Rpb24gPSByZXF1aXJlKCdsb2Rhc2guaXNmdW5jdGlvbicpLFxuICAgIGlzT2JqZWN0ID0gcmVxdWlyZSgnbG9kYXNoLmlzb2JqZWN0JyksXG4gICAgbm93ID0gcmVxdWlyZSgnbG9kYXNoLm5vdycpO1xuXG4vKiBOYXRpdmUgbWV0aG9kIHNob3J0Y3V0cyBmb3IgbWV0aG9kcyB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgb3RoZXIgYGxvZGFzaGAgbWV0aG9kcyAqL1xudmFyIG5hdGl2ZU1heCA9IE1hdGgubWF4O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgZGVsYXkgdGhlIGV4ZWN1dGlvbiBvZiBgZnVuY2AgdW50aWwgYWZ0ZXJcbiAqIGB3YWl0YCBtaWxsaXNlY29uZHMgaGF2ZSBlbGFwc2VkIHNpbmNlIHRoZSBsYXN0IHRpbWUgaXQgd2FzIGludm9rZWQuXG4gKiBQcm92aWRlIGFuIG9wdGlvbnMgb2JqZWN0IHRvIGluZGljYXRlIHRoYXQgYGZ1bmNgIHNob3VsZCBiZSBpbnZva2VkIG9uXG4gKiB0aGUgbGVhZGluZyBhbmQvb3IgdHJhaWxpbmcgZWRnZSBvZiB0aGUgYHdhaXRgIHRpbWVvdXQuIFN1YnNlcXVlbnQgY2FsbHNcbiAqIHRvIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gd2lsbCByZXR1cm4gdGhlIHJlc3VsdCBvZiB0aGUgbGFzdCBgZnVuY2AgY2FsbC5cbiAqXG4gKiBOb3RlOiBJZiBgbGVhZGluZ2AgYW5kIGB0cmFpbGluZ2Agb3B0aW9ucyBhcmUgYHRydWVgIGBmdW5jYCB3aWxsIGJlIGNhbGxlZFxuICogb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQgb25seSBpZiB0aGUgdGhlIGRlYm91bmNlZCBmdW5jdGlvbiBpc1xuICogaW52b2tlZCBtb3JlIHRoYW4gb25jZSBkdXJpbmcgdGhlIGB3YWl0YCB0aW1lb3V0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgRnVuY3Rpb25zXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byBkZWJvdW5jZS5cbiAqIEBwYXJhbSB7bnVtYmVyfSB3YWl0IFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRvIGRlbGF5LlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBUaGUgb3B0aW9ucyBvYmplY3QuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmxlYWRpbmc9ZmFsc2VdIFNwZWNpZnkgZXhlY3V0aW9uIG9uIHRoZSBsZWFkaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMubWF4V2FpdF0gVGhlIG1heGltdW0gdGltZSBgZnVuY2AgaXMgYWxsb3dlZCB0byBiZSBkZWxheWVkIGJlZm9yZSBpdCdzIGNhbGxlZC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHJhaWxpbmc9dHJ1ZV0gU3BlY2lmeSBleGVjdXRpb24gb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBkZWJvdW5jZWQgZnVuY3Rpb24uXG4gKiBAZXhhbXBsZVxuICpcbiAqIC8vIGF2b2lkIGNvc3RseSBjYWxjdWxhdGlvbnMgd2hpbGUgdGhlIHdpbmRvdyBzaXplIGlzIGluIGZsdXhcbiAqIHZhciBsYXp5TGF5b3V0ID0gXy5kZWJvdW5jZShjYWxjdWxhdGVMYXlvdXQsIDE1MCk7XG4gKiBqUXVlcnkod2luZG93KS5vbigncmVzaXplJywgbGF6eUxheW91dCk7XG4gKlxuICogLy8gZXhlY3V0ZSBgc2VuZE1haWxgIHdoZW4gdGhlIGNsaWNrIGV2ZW50IGlzIGZpcmVkLCBkZWJvdW5jaW5nIHN1YnNlcXVlbnQgY2FsbHNcbiAqIGpRdWVyeSgnI3Bvc3Rib3gnKS5vbignY2xpY2snLCBfLmRlYm91bmNlKHNlbmRNYWlsLCAzMDAsIHtcbiAqICAgJ2xlYWRpbmcnOiB0cnVlLFxuICogICAndHJhaWxpbmcnOiBmYWxzZVxuICogfSk7XG4gKlxuICogLy8gZW5zdXJlIGBiYXRjaExvZ2AgaXMgZXhlY3V0ZWQgb25jZSBhZnRlciAxIHNlY29uZCBvZiBkZWJvdW5jZWQgY2FsbHNcbiAqIHZhciBzb3VyY2UgPSBuZXcgRXZlbnRTb3VyY2UoJy9zdHJlYW0nKTtcbiAqIHNvdXJjZS5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgXy5kZWJvdW5jZShiYXRjaExvZywgMjUwLCB7XG4gKiAgICdtYXhXYWl0JzogMTAwMFxuICogfSwgZmFsc2UpO1xuICovXG5mdW5jdGlvbiBkZWJvdW5jZShmdW5jLCB3YWl0LCBvcHRpb25zKSB7XG4gIHZhciBhcmdzLFxuICAgICAgbWF4VGltZW91dElkLFxuICAgICAgcmVzdWx0LFxuICAgICAgc3RhbXAsXG4gICAgICB0aGlzQXJnLFxuICAgICAgdGltZW91dElkLFxuICAgICAgdHJhaWxpbmdDYWxsLFxuICAgICAgbGFzdENhbGxlZCA9IDAsXG4gICAgICBtYXhXYWl0ID0gZmFsc2UsXG4gICAgICB0cmFpbGluZyA9IHRydWU7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGZ1bmMpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcjtcbiAgfVxuICB3YWl0ID0gbmF0aXZlTWF4KDAsIHdhaXQpIHx8IDA7XG4gIGlmIChvcHRpb25zID09PSB0cnVlKSB7XG4gICAgdmFyIGxlYWRpbmcgPSB0cnVlO1xuICAgIHRyYWlsaW5nID0gZmFsc2U7XG4gIH0gZWxzZSBpZiAoaXNPYmplY3Qob3B0aW9ucykpIHtcbiAgICBsZWFkaW5nID0gb3B0aW9ucy5sZWFkaW5nO1xuICAgIG1heFdhaXQgPSAnbWF4V2FpdCcgaW4gb3B0aW9ucyAmJiAobmF0aXZlTWF4KHdhaXQsIG9wdGlvbnMubWF4V2FpdCkgfHwgMCk7XG4gICAgdHJhaWxpbmcgPSAndHJhaWxpbmcnIGluIG9wdGlvbnMgPyBvcHRpb25zLnRyYWlsaW5nIDogdHJhaWxpbmc7XG4gIH1cbiAgdmFyIGRlbGF5ZWQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcmVtYWluaW5nID0gd2FpdCAtIChub3coKSAtIHN0YW1wKTtcbiAgICBpZiAocmVtYWluaW5nIDw9IDApIHtcbiAgICAgIGlmIChtYXhUaW1lb3V0SWQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KG1heFRpbWVvdXRJZCk7XG4gICAgICB9XG4gICAgICB2YXIgaXNDYWxsZWQgPSB0cmFpbGluZ0NhbGw7XG4gICAgICBtYXhUaW1lb3V0SWQgPSB0aW1lb3V0SWQgPSB0cmFpbGluZ0NhbGwgPSB1bmRlZmluZWQ7XG4gICAgICBpZiAoaXNDYWxsZWQpIHtcbiAgICAgICAgbGFzdENhbGxlZCA9IG5vdygpO1xuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xuICAgICAgICBpZiAoIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XG4gICAgICAgICAgYXJncyA9IHRoaXNBcmcgPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZGVsYXllZCwgcmVtYWluaW5nKTtcbiAgICB9XG4gIH07XG5cbiAgdmFyIG1heERlbGF5ZWQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGltZW91dElkKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICB9XG4gICAgbWF4VGltZW91dElkID0gdGltZW91dElkID0gdHJhaWxpbmdDYWxsID0gdW5kZWZpbmVkO1xuICAgIGlmICh0cmFpbGluZyB8fCAobWF4V2FpdCAhPT0gd2FpdCkpIHtcbiAgICAgIGxhc3RDYWxsZWQgPSBub3coKTtcbiAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XG4gICAgICBpZiAoIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XG4gICAgICAgIGFyZ3MgPSB0aGlzQXJnID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgc3RhbXAgPSBub3coKTtcbiAgICB0aGlzQXJnID0gdGhpcztcbiAgICB0cmFpbGluZ0NhbGwgPSB0cmFpbGluZyAmJiAodGltZW91dElkIHx8ICFsZWFkaW5nKTtcblxuICAgIGlmIChtYXhXYWl0ID09PSBmYWxzZSkge1xuICAgICAgdmFyIGxlYWRpbmdDYWxsID0gbGVhZGluZyAmJiAhdGltZW91dElkO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIW1heFRpbWVvdXRJZCAmJiAhbGVhZGluZykge1xuICAgICAgICBsYXN0Q2FsbGVkID0gc3RhbXA7XG4gICAgICB9XG4gICAgICB2YXIgcmVtYWluaW5nID0gbWF4V2FpdCAtIChzdGFtcCAtIGxhc3RDYWxsZWQpLFxuICAgICAgICAgIGlzQ2FsbGVkID0gcmVtYWluaW5nIDw9IDA7XG5cbiAgICAgIGlmIChpc0NhbGxlZCkge1xuICAgICAgICBpZiAobWF4VGltZW91dElkKSB7XG4gICAgICAgICAgbWF4VGltZW91dElkID0gY2xlYXJUaW1lb3V0KG1heFRpbWVvdXRJZCk7XG4gICAgICAgIH1cbiAgICAgICAgbGFzdENhbGxlZCA9IHN0YW1wO1xuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoIW1heFRpbWVvdXRJZCkge1xuICAgICAgICBtYXhUaW1lb3V0SWQgPSBzZXRUaW1lb3V0KG1heERlbGF5ZWQsIHJlbWFpbmluZyk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpc0NhbGxlZCAmJiB0aW1lb3V0SWQpIHtcbiAgICAgIHRpbWVvdXRJZCA9IGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgIH1cbiAgICBlbHNlIGlmICghdGltZW91dElkICYmIHdhaXQgIT09IG1heFdhaXQpIHtcbiAgICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZGVsYXllZCwgd2FpdCk7XG4gICAgfVxuICAgIGlmIChsZWFkaW5nQ2FsbCkge1xuICAgICAgaXNDYWxsZWQgPSB0cnVlO1xuICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcbiAgICB9XG4gICAgaWYgKGlzQ2FsbGVkICYmICF0aW1lb3V0SWQgJiYgIW1heFRpbWVvdXRJZCkge1xuICAgICAgYXJncyA9IHRoaXNBcmcgPSBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGRlYm91bmNlO1xuIiwiLyoqXG4gKiBMby1EYXNoIDIuNC4xIChDdXN0b20gQnVpbGQpIDxodHRwOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIG1vZGVybiBleHBvcnRzPVwibnBtXCIgLW8gLi9ucG0vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxMyBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS41LjIgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHA6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cbnZhciBpc05hdGl2ZSA9IHJlcXVpcmUoJ2xvZGFzaC5faXNuYXRpdmUnKTtcblxuLyoqXG4gKiBHZXRzIHRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRoYXQgaGF2ZSBlbGFwc2VkIHNpbmNlIHRoZSBVbml4IGVwb2NoXG4gKiAoMSBKYW51YXJ5IDE5NzAgMDA6MDA6MDAgVVRDKS5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IFV0aWxpdGllc1xuICogQGV4YW1wbGVcbiAqXG4gKiB2YXIgc3RhbXAgPSBfLm5vdygpO1xuICogXy5kZWZlcihmdW5jdGlvbigpIHsgY29uc29sZS5sb2coXy5ub3coKSAtIHN0YW1wKTsgfSk7XG4gKiAvLyA9PiBsb2dzIHRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIGl0IHRvb2sgZm9yIHRoZSBkZWZlcnJlZCBmdW5jdGlvbiB0byBiZSBjYWxsZWRcbiAqL1xudmFyIG5vdyA9IGlzTmF0aXZlKG5vdyA9IERhdGUubm93KSAmJiBub3cgfHwgZnVuY3Rpb24oKSB7XG4gIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbm93O1xuIiwiLyoqXG4gKiBMby1EYXNoIDIuNC4xIChDdXN0b20gQnVpbGQpIDxodHRwOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIG1vZGVybiBleHBvcnRzPVwibnBtXCIgLW8gLi9ucG0vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxMyBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS41LjIgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHA6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cblxuLyoqIFVzZWQgZm9yIG5hdGl2ZSBtZXRob2QgcmVmZXJlbmNlcyAqL1xudmFyIG9iamVjdFByb3RvID0gT2JqZWN0LnByb3RvdHlwZTtcblxuLyoqIFVzZWQgdG8gcmVzb2x2ZSB0aGUgaW50ZXJuYWwgW1tDbGFzc11dIG9mIHZhbHVlcyAqL1xudmFyIHRvU3RyaW5nID0gb2JqZWN0UHJvdG8udG9TdHJpbmc7XG5cbi8qKiBVc2VkIHRvIGRldGVjdCBpZiBhIG1ldGhvZCBpcyBuYXRpdmUgKi9cbnZhciByZU5hdGl2ZSA9IFJlZ0V4cCgnXicgK1xuICBTdHJpbmcodG9TdHJpbmcpXG4gICAgLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCAnXFxcXCQmJylcbiAgICAucmVwbGFjZSgvdG9TdHJpbmd8IGZvciBbXlxcXV0rL2csICcuKj8nKSArICckJ1xuKTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBhIG5hdGl2ZSBmdW5jdGlvbi5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGB2YWx1ZWAgaXMgYSBuYXRpdmUgZnVuY3Rpb24sIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gaXNOYXRpdmUodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PSAnZnVuY3Rpb24nICYmIHJlTmF0aXZlLnRlc3QodmFsdWUpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlzTmF0aXZlO1xuIiwiLyoqXG4gKiBMby1EYXNoIDIuNC4xIChDdXN0b20gQnVpbGQpIDxodHRwOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIG1vZGVybiBleHBvcnRzPVwibnBtXCIgLW8gLi9ucG0vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxMyBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS41LjIgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHA6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBhIGZ1bmN0aW9uLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGB2YWx1ZWAgaXMgYSBmdW5jdGlvbiwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzRnVuY3Rpb24oXyk7XG4gKiAvLyA9PiB0cnVlXG4gKi9cbmZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PSAnZnVuY3Rpb24nO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlzRnVuY3Rpb247XG4iLCIvKipcbiAqIExvLURhc2ggMi40LjEgKEN1c3RvbSBCdWlsZCkgPGh0dHA6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZHVsYXJpemUgbW9kZXJuIGV4cG9ydHM9XCJucG1cIiAtbyAuL25wbS9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDEzIFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjUuMiA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTMgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cDovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xudmFyIG9iamVjdFR5cGVzID0gcmVxdWlyZSgnbG9kYXNoLl9vYmplY3R0eXBlcycpO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIHRoZSBsYW5ndWFnZSB0eXBlIG9mIE9iamVjdC5cbiAqIChlLmcuIGFycmF5cywgZnVuY3Rpb25zLCBvYmplY3RzLCByZWdleGVzLCBgbmV3IE51bWJlcigwKWAsIGFuZCBgbmV3IFN0cmluZygnJylgKVxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGB2YWx1ZWAgaXMgYW4gb2JqZWN0LCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNPYmplY3Qoe30pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3QoWzEsIDIsIDNdKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0KDEpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNPYmplY3QodmFsdWUpIHtcbiAgLy8gY2hlY2sgaWYgdGhlIHZhbHVlIGlzIHRoZSBFQ01BU2NyaXB0IGxhbmd1YWdlIHR5cGUgb2YgT2JqZWN0XG4gIC8vIGh0dHA6Ly9lczUuZ2l0aHViLmlvLyN4OFxuICAvLyBhbmQgYXZvaWQgYSBWOCBidWdcbiAgLy8gaHR0cDovL2NvZGUuZ29vZ2xlLmNvbS9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MjI5MVxuICByZXR1cm4gISEodmFsdWUgJiYgb2JqZWN0VHlwZXNbdHlwZW9mIHZhbHVlXSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaXNPYmplY3Q7XG4iLCIvKipcbiAqIExvLURhc2ggMi40LjEgKEN1c3RvbSBCdWlsZCkgPGh0dHA6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZHVsYXJpemUgbW9kZXJuIGV4cG9ydHM9XCJucG1cIiAtbyAuL25wbS9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDEzIFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjUuMiA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTMgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cDovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xuXG4vKiogVXNlZCB0byBkZXRlcm1pbmUgaWYgdmFsdWVzIGFyZSBvZiB0aGUgbGFuZ3VhZ2UgdHlwZSBPYmplY3QgKi9cbnZhciBvYmplY3RUeXBlcyA9IHtcbiAgJ2Jvb2xlYW4nOiBmYWxzZSxcbiAgJ2Z1bmN0aW9uJzogdHJ1ZSxcbiAgJ29iamVjdCc6IHRydWUsXG4gICdudW1iZXInOiBmYWxzZSxcbiAgJ3N0cmluZyc6IGZhbHNlLFxuICAndW5kZWZpbmVkJzogZmFsc2Vcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gb2JqZWN0VHlwZXM7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGRyYXdCdWZmZXI7XG5cbmZ1bmN0aW9uIGRyYXdCdWZmZXIgKGNhbnZhcywgYnVmZmVyLCBjb2xvcikge1xuICB2YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gIHZhciB3aWR0aCA9IGNhbnZhcy53aWR0aDtcbiAgdmFyIGhlaWdodCA9IGNhbnZhcy5oZWlnaHQ7XG4gIGlmIChjb2xvcikge1xuICAgIGN0eC5maWxsU3R5bGUgPSBjb2xvcjtcbiAgfVxuXG4gICAgdmFyIGRhdGEgPSBidWZmZXIuZ2V0Q2hhbm5lbERhdGEoIDAgKTtcbiAgICB2YXIgc3RlcCA9IE1hdGguY2VpbCggZGF0YS5sZW5ndGggLyB3aWR0aCApO1xuICAgIHZhciBhbXAgPSBoZWlnaHQgLyAyO1xuICAgIGZvcih2YXIgaT0wOyBpIDwgd2lkdGg7IGkrKyl7XG4gICAgICAgIHZhciBtaW4gPSAxLjA7XG4gICAgICAgIHZhciBtYXggPSAtMS4wO1xuICAgICAgICBmb3IgKHZhciBqPTA7IGo8c3RlcDsgaisrKSB7XG4gICAgICAgICAgICB2YXIgZGF0dW0gPSBkYXRhWyhpKnN0ZXApK2pdO1xuICAgICAgICAgICAgaWYgKGRhdHVtIDwgbWluKVxuICAgICAgICAgICAgICAgIG1pbiA9IGRhdHVtO1xuICAgICAgICAgICAgaWYgKGRhdHVtID4gbWF4KVxuICAgICAgICAgICAgICAgIG1heCA9IGRhdHVtO1xuICAgICAgICB9XG4gICAgICBjdHguZmlsbFJlY3QoaSwoMSttaW4pKmFtcCwxLE1hdGgubWF4KDEsKG1heC1taW4pKmFtcCkpO1xuICAgIH1cbn0iLCJ2YXIgd29yayA9IHJlcXVpcmUoJ3dlYndvcmtpZnknKTtcbnZhciB3ID0gd29yayhyZXF1aXJlKCcuL3dvcmsuanMnKSk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBlbmNvZGVXQVY6IGVuY29kZVdBVixcbiAgZ2V0RG93bmxvYWRMaW5rOiBnZXREb3dubG9hZExpbmtcbn07XG5cbmZ1bmN0aW9uIG9uQ29tcGxldGUoY2IpIHtcbiAgdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24oZXYpIHtcbiAgICAgIGNiKGV2LmRhdGEpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gZW5jb2RlV0FWKGNoYW5uZWxCdWZmZXJBcnJheSwgc2FtcGxlUmF0ZSwgY2IpIHtcbiAgdy5wb3N0TWVzc2FnZSh7XG4gICAgbGVmdEJ1ZjogY2hhbm5lbEJ1ZmZlckFycmF5WzBdLFxuICAgIHJpZ2h0QnVmOiBjaGFubmVsQnVmZmVyQXJyYXlbMV0sXG4gICAgc2FtcGxlUmF0ZTogc2FtcGxlUmF0ZVxuICB9KTtcblxuICBvbkNvbXBsZXRlKGNiKTtcbn1cblxuZnVuY3Rpb24gZ2V0RG93bmxvYWRMaW5rKGNiKSB7XG4gIG9uQ29tcGxldGUoZnVuY3Rpb24oYmxvYikge1xuICAgIHZhciB1cmwgPSAod2luZG93LlVSTCB8fCB3aW5kb3cud2Via2l0VVJMKS5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gICAgY2IodXJsKTtcbiAgfSlcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHNlbGYpIHtcbiAgc2VsZi5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24oZXYpIHtcbiAgICBjb25zb2xlLmxvZygnd29ya2VyJywgZXYpO1xuICAgIHZhciBibG9iID0gZXhwb3J0V0FWKGV2LmRhdGEubGVmdEJ1ZiwgZXYuZGF0YS5yaWdodEJ1ZiwgZXYuZGF0YS5zYW1wbGVSYXRlKTtcbiAgICBzZWxmLnBvc3RNZXNzYWdlKGJsb2IpO1xuICB9LmJpbmQoc2VsZikpO1xufVxuXG5mdW5jdGlvbiBleHBvcnRXQVYobGVmdEJ1ZmZlciwgcmlnaHRCdWZmZXIsIHNhbXBsZVJhdGUpIHtcbiAgdmFyIGludGVybGVhdmVkID0gaW50ZXJsZWF2ZShsZWZ0QnVmZmVyLCByaWdodEJ1ZmZlcik7XG4gIHZhciBkYXRhdmlldyA9IGVuY29kZVdBVihpbnRlcmxlYXZlZCwgc2FtcGxlUmF0ZSk7XG4gIHZhciBhdWRpb0Jsb2IgPSBuZXcgQmxvYihbZGF0YXZpZXddLCB7dHlwZTogXCJhdWRpby93YXZcIn0pO1xuXG4gIHRoaXMucG9zdE1lc3NhZ2UoYXVkaW9CbG9iKTtcbn1cblxuZnVuY3Rpb24gbWVyZ2VCdWZmZXJzKHJlY0J1ZmZlcnMsIHJlY0xlbmd0aCl7XG4gIHZhciByZXN1bHQgPSBuZXcgRmxvYXQzMkFycmF5KHJlY0xlbmd0aCk7XG4gIHZhciBvZmZzZXQgPSAwO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcmVjQnVmZmVycy5sZW5ndGg7IGkrKyl7XG4gICAgcmVzdWx0LnNldChyZWNCdWZmZXJzW2ldLCBvZmZzZXQpO1xuICAgIG9mZnNldCArPSByZWNCdWZmZXJzW2ldLmxlbmd0aDtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGludGVybGVhdmUobGVmdEJ1ZmZlciwgcmlnaHRCdWZmZXIpe1xuICB2YXIgbGVuZ3RoID0gbGVmdEJ1ZmZlci5sZW5ndGggKyByaWdodEJ1ZmZlci5sZW5ndGg7XG4gIHZhciByZXN1bHQgPSBuZXcgRmxvYXQzMkFycmF5KGxlbmd0aCk7XG5cbiAgdmFyIGlkeCA9IDAsXG4gICAgICBidWZJZHggPSAwO1xuXG4gIHdoaWxlIChpZHggPCBsZW5ndGgpIHtcbiAgICAvLyBpZHgrK1xuICAgIHJlc3VsdFtpZHgrK10gPSBsZWZ0QnVmZmVyW2J1ZklkeF07XG4gICAgcmVzdWx0W2lkeCsrXSA9IHJpZ2h0QnVmZmVyW2J1ZklkeF07XG4gICAgYnVmSWR4Kys7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiB3cml0ZVN0cmluZyh2aWV3LCBvZmZzZXQsIHN0cmluZykge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0cmluZy5sZW5ndGg7IGkrKyl7XG4gICAgdmlldy5zZXRVaW50OChvZmZzZXQgKyBpLCBzdHJpbmcuY2hhckNvZGVBdChpKSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZW5jb2RlV0FWKHNhbXBsZXMsIHNhbXBsZVJhdGUpe1xuICB2YXIgYnVmZmVyID0gbmV3IEFycmF5QnVmZmVyKDQ0ICsgc2FtcGxlcy5sZW5ndGggKiAyKTtcbiAgdmFyIHZpZXcgPSBuZXcgRGF0YVZpZXcoYnVmZmVyKTtcblxuICAvKiBSSUZGIGlkZW50aWZpZXIgKi9cbiAgd3JpdGVTdHJpbmcodmlldywgMCwgJ1JJRkYnKTtcbiAgLyogUklGRiBjaHVuayBsZW5ndGggKi9cbiAgdmlldy5zZXRVaW50MzIoNCwgMzYgKyBzYW1wbGVzLmxlbmd0aCAqIDIsIHRydWUpO1xuICAvKiBSSUZGIHR5cGUgKi9cbiAgd3JpdGVTdHJpbmcodmlldywgOCwgJ1dBVkUnKTtcbiAgLyogZm9ybWF0IGNodW5rIGlkZW50aWZpZXIgKi9cbiAgd3JpdGVTdHJpbmcodmlldywgMTIsICdmbXQgJyk7XG4gIC8qIGZvcm1hdCBjaHVuayBsZW5ndGggKi9cbiAgdmlldy5zZXRVaW50MzIoMTYsIDE2LCB0cnVlKTtcbiAgLyogc2FtcGxlIGZvcm1hdCAocmF3KSAqL1xuICB2aWV3LnNldFVpbnQxNigyMCwgMSwgdHJ1ZSk7XG4gIC8qIGNoYW5uZWwgY291bnQgKi9cbiAgdmlldy5zZXRVaW50MTYoMjIsIDIsIHRydWUpO1xuICAvKiBzYW1wbGUgcmF0ZSAqL1xuICB2aWV3LnNldFVpbnQzMigyNCwgc2FtcGxlUmF0ZSwgdHJ1ZSk7XG4gIC8qIGJ5dGUgcmF0ZSAoc2FtcGxlIHJhdGUgKiBibG9jayBhbGlnbikgKi9cbiAgdmlldy5zZXRVaW50MzIoMjgsIHNhbXBsZVJhdGUgKiA0LCB0cnVlKTtcbiAgLyogYmxvY2sgYWxpZ24gKGNoYW5uZWwgY291bnQgKiBieXRlcyBwZXIgc2FtcGxlKSAqL1xuICB2aWV3LnNldFVpbnQxNigzMiwgNCwgdHJ1ZSk7XG4gIC8qIGJpdHMgcGVyIHNhbXBsZSAqL1xuICB2aWV3LnNldFVpbnQxNigzNCwgMTYsIHRydWUpO1xuICAvKiBkYXRhIGNodW5rIGlkZW50aWZpZXIgKi9cbiAgd3JpdGVTdHJpbmcodmlldywgMzYsICdkYXRhJyk7XG4gIC8qIGRhdGEgY2h1bmsgbGVuZ3RoICovXG4gIHZpZXcuc2V0VWludDMyKDQwLCBzYW1wbGVzLmxlbmd0aCAqIDIsIHRydWUpO1xuXG4gIGZsb2F0VG8xNkJpdFBDTSh2aWV3LCA0NCwgc2FtcGxlcyk7XG5cbiAgcmV0dXJuIHZpZXc7XG59XG5cbmZ1bmN0aW9uIGZsb2F0VG8xNkJpdFBDTShvdXRwdXQsIG9mZnNldCwgaW5wdXQpe1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGlucHV0Lmxlbmd0aDsgaSsrLCBvZmZzZXQrPTIpe1xuICAgIHZhciBzID0gTWF0aC5tYXgoLTEsIE1hdGgubWluKDEsIGlucHV0W2ldKSk7XG4gICAgb3V0cHV0LnNldEludDE2KG9mZnNldCwgcyA8IDAgPyBzICogMHg4MDAwIDogcyAqIDB4N0ZGRiwgdHJ1ZSk7XG4gIH1cbn1cbiIsInZhciBzcGxpdCA9IHJlcXVpcmUoJ2Jyb3dzZXItc3BsaXQnKVxudmFyIENsYXNzTGlzdCA9IHJlcXVpcmUoJ2NsYXNzLWxpc3QnKVxucmVxdWlyZSgnaHRtbC1lbGVtZW50JylcblxuZnVuY3Rpb24gY29udGV4dCAoKSB7XG5cbiAgdmFyIGNsZWFudXBGdW5jcyA9IFtdXG5cbiAgZnVuY3Rpb24gaCgpIHtcbiAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKSwgZSA9IG51bGxcbiAgICBmdW5jdGlvbiBpdGVtIChsKSB7XG4gICAgICB2YXIgclxuICAgICAgZnVuY3Rpb24gcGFyc2VDbGFzcyAoc3RyaW5nKSB7XG4gICAgICAgIHZhciBtID0gc3BsaXQoc3RyaW5nLCAvKFtcXC4jXT9bYS16QS1aMC05XzotXSspLylcbiAgICAgICAgaWYoL15cXC58Iy8udGVzdChtWzFdKSlcbiAgICAgICAgICBlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICAgICAgZm9yRWFjaChtLCBmdW5jdGlvbiAodikge1xuICAgICAgICAgIHZhciBzID0gdi5zdWJzdHJpbmcoMSx2Lmxlbmd0aClcbiAgICAgICAgICBpZighdikgcmV0dXJuXG4gICAgICAgICAgaWYoIWUpXG4gICAgICAgICAgICBlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh2KVxuICAgICAgICAgIGVsc2UgaWYgKHZbMF0gPT09ICcuJylcbiAgICAgICAgICAgIENsYXNzTGlzdChlKS5hZGQocylcbiAgICAgICAgICBlbHNlIGlmICh2WzBdID09PSAnIycpXG4gICAgICAgICAgICBlLnNldEF0dHJpYnV0ZSgnaWQnLCBzKVxuICAgICAgICB9KVxuICAgICAgfVxuXG4gICAgICBpZihsID09IG51bGwpXG4gICAgICAgIDtcbiAgICAgIGVsc2UgaWYoJ3N0cmluZycgPT09IHR5cGVvZiBsKSB7XG4gICAgICAgIGlmKCFlKVxuICAgICAgICAgIHBhcnNlQ2xhc3MobClcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGUuYXBwZW5kQ2hpbGQociA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGwpKVxuICAgICAgfVxuICAgICAgZWxzZSBpZignbnVtYmVyJyA9PT0gdHlwZW9mIGxcbiAgICAgICAgfHwgJ2Jvb2xlYW4nID09PSB0eXBlb2YgbFxuICAgICAgICB8fCBsIGluc3RhbmNlb2YgRGF0ZVxuICAgICAgICB8fCBsIGluc3RhbmNlb2YgUmVnRXhwICkge1xuICAgICAgICAgIGUuYXBwZW5kQ2hpbGQociA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGwudG9TdHJpbmcoKSkpXG4gICAgICB9XG4gICAgICAvL3RoZXJlIG1pZ2h0IGJlIGEgYmV0dGVyIHdheSB0byBoYW5kbGUgdGhpcy4uLlxuICAgICAgZWxzZSBpZiAoaXNBcnJheShsKSlcbiAgICAgICAgZm9yRWFjaChsLCBpdGVtKVxuICAgICAgZWxzZSBpZihpc05vZGUobCkpXG4gICAgICAgIGUuYXBwZW5kQ2hpbGQociA9IGwpXG4gICAgICBlbHNlIGlmKGwgaW5zdGFuY2VvZiBUZXh0KVxuICAgICAgICBlLmFwcGVuZENoaWxkKHIgPSBsKVxuICAgICAgZWxzZSBpZiAoJ29iamVjdCcgPT09IHR5cGVvZiBsKSB7XG4gICAgICAgIGZvciAodmFyIGsgaW4gbCkge1xuICAgICAgICAgIGlmKCdmdW5jdGlvbicgPT09IHR5cGVvZiBsW2tdKSB7XG4gICAgICAgICAgICBpZigvXm9uXFx3Ky8udGVzdChrKSkge1xuICAgICAgICAgICAgICBpZiAoZS5hZGRFdmVudExpc3RlbmVyKXtcbiAgICAgICAgICAgICAgICBlLmFkZEV2ZW50TGlzdGVuZXIoay5zdWJzdHJpbmcoMiksIGxba10sIGZhbHNlKVxuICAgICAgICAgICAgICAgIGNsZWFudXBGdW5jcy5wdXNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICBlLnJlbW92ZUV2ZW50TGlzdGVuZXIoay5zdWJzdHJpbmcoMiksIGxba10sIGZhbHNlKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIGUuYXR0YWNoRXZlbnQoaywgbFtrXSlcbiAgICAgICAgICAgICAgICBjbGVhbnVwRnVuY3MucHVzaChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgZS5kZXRhY2hFdmVudChrLCBsW2tdKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIG9ic2VydmFibGVcbiAgICAgICAgICAgICAgZVtrXSA9IGxba10oKVxuICAgICAgICAgICAgICBjbGVhbnVwRnVuY3MucHVzaChsW2tdKGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgZVtrXSA9IHZcbiAgICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYoayA9PT0gJ3N0eWxlJykge1xuICAgICAgICAgICAgaWYoJ3N0cmluZycgPT09IHR5cGVvZiBsW2tdKSB7XG4gICAgICAgICAgICAgIGUuc3R5bGUuY3NzVGV4dCA9IGxba11cbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICBmb3IgKHZhciBzIGluIGxba10pIChmdW5jdGlvbihzLCB2KSB7XG4gICAgICAgICAgICAgICAgaWYoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHYpIHtcbiAgICAgICAgICAgICAgICAgIC8vIG9ic2VydmFibGVcbiAgICAgICAgICAgICAgICAgIGUuc3R5bGUuc2V0UHJvcGVydHkocywgdigpKVxuICAgICAgICAgICAgICAgICAgY2xlYW51cEZ1bmNzLnB1c2godihmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIGUuc3R5bGUuc2V0UHJvcGVydHkocywgdmFsKVxuICAgICAgICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICAgICAgICBlLnN0eWxlLnNldFByb3BlcnR5KHMsIGxba11bc10pXG4gICAgICAgICAgICAgIH0pKHMsIGxba11bc10pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmIChrLnN1YnN0cigwLCA1KSA9PT0gXCJkYXRhLVwiKSB7XG4gICAgICAgICAgICBlLnNldEF0dHJpYnV0ZShrLCBsW2tdKVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlW2tdID0gbFtrXVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgbCkge1xuICAgICAgICAvL2Fzc3VtZSBpdCdzIGFuIG9ic2VydmFibGUhXG4gICAgICAgIHZhciB2ID0gbCgpXG4gICAgICAgIGUuYXBwZW5kQ2hpbGQociA9IGlzTm9kZSh2KSA/IHYgOiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSh2KSlcblxuICAgICAgICBjbGVhbnVwRnVuY3MucHVzaChsKGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgaWYoaXNOb2RlKHYpICYmIHIucGFyZW50RWxlbWVudClcbiAgICAgICAgICAgIHIucGFyZW50RWxlbWVudC5yZXBsYWNlQ2hpbGQodiwgciksIHIgPSB2XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgci50ZXh0Q29udGVudCA9IHZcbiAgICAgICAgfSkpXG4gICAgICB9XG5cbiAgICAgIHJldHVybiByXG4gICAgfVxuICAgIHdoaWxlKGFyZ3MubGVuZ3RoKVxuICAgICAgaXRlbShhcmdzLnNoaWZ0KCkpXG5cbiAgICByZXR1cm4gZVxuICB9XG5cbiAgaC5jbGVhbnVwID0gZnVuY3Rpb24gKCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2xlYW51cEZ1bmNzLmxlbmd0aDsgaSsrKXtcbiAgICAgIGNsZWFudXBGdW5jc1tpXSgpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGhcbn1cblxudmFyIGggPSBtb2R1bGUuZXhwb3J0cyA9IGNvbnRleHQoKVxuaC5jb250ZXh0ID0gY29udGV4dFxuXG5mdW5jdGlvbiBpc05vZGUgKGVsKSB7XG4gIHJldHVybiBlbCAmJiBlbC5ub2RlTmFtZSAmJiBlbC5ub2RlVHlwZVxufVxuXG5mdW5jdGlvbiBpc1RleHQgKGVsKSB7XG4gIHJldHVybiBlbCAmJiBlbC5ub2RlTmFtZSA9PT0gJyN0ZXh0JyAmJiBlbC5ub2RlVHlwZSA9PSAzXG59XG5cbmZ1bmN0aW9uIGZvckVhY2ggKGFyciwgZm4pIHtcbiAgaWYgKGFyci5mb3JFYWNoKSByZXR1cm4gYXJyLmZvckVhY2goZm4pXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSBmbihhcnJbaV0sIGkpXG59XG5cbmZ1bmN0aW9uIGlzQXJyYXkgKGFycikge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGFycikgPT0gJ1tvYmplY3QgQXJyYXldJ1xufVxuIiwiLyohXG4gKiBDcm9zcy1Ccm93c2VyIFNwbGl0IDEuMS4xXG4gKiBDb3B5cmlnaHQgMjAwNy0yMDEyIFN0ZXZlbiBMZXZpdGhhbiA8c3RldmVubGV2aXRoYW4uY29tPlxuICogQXZhaWxhYmxlIHVuZGVyIHRoZSBNSVQgTGljZW5zZVxuICogRUNNQVNjcmlwdCBjb21wbGlhbnQsIHVuaWZvcm0gY3Jvc3MtYnJvd3NlciBzcGxpdCBtZXRob2RcbiAqL1xuXG4vKipcbiAqIFNwbGl0cyBhIHN0cmluZyBpbnRvIGFuIGFycmF5IG9mIHN0cmluZ3MgdXNpbmcgYSByZWdleCBvciBzdHJpbmcgc2VwYXJhdG9yLiBNYXRjaGVzIG9mIHRoZVxuICogc2VwYXJhdG9yIGFyZSBub3QgaW5jbHVkZWQgaW4gdGhlIHJlc3VsdCBhcnJheS4gSG93ZXZlciwgaWYgYHNlcGFyYXRvcmAgaXMgYSByZWdleCB0aGF0IGNvbnRhaW5zXG4gKiBjYXB0dXJpbmcgZ3JvdXBzLCBiYWNrcmVmZXJlbmNlcyBhcmUgc3BsaWNlZCBpbnRvIHRoZSByZXN1bHQgZWFjaCB0aW1lIGBzZXBhcmF0b3JgIGlzIG1hdGNoZWQuXG4gKiBGaXhlcyBicm93c2VyIGJ1Z3MgY29tcGFyZWQgdG8gdGhlIG5hdGl2ZSBgU3RyaW5nLnByb3RvdHlwZS5zcGxpdGAgYW5kIGNhbiBiZSB1c2VkIHJlbGlhYmx5XG4gKiBjcm9zcy1icm93c2VyLlxuICogQHBhcmFtIHtTdHJpbmd9IHN0ciBTdHJpbmcgdG8gc3BsaXQuXG4gKiBAcGFyYW0ge1JlZ0V4cHxTdHJpbmd9IHNlcGFyYXRvciBSZWdleCBvciBzdHJpbmcgdG8gdXNlIGZvciBzZXBhcmF0aW5nIHRoZSBzdHJpbmcuXG4gKiBAcGFyYW0ge051bWJlcn0gW2xpbWl0XSBNYXhpbXVtIG51bWJlciBvZiBpdGVtcyB0byBpbmNsdWRlIGluIHRoZSByZXN1bHQgYXJyYXkuXG4gKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIHN1YnN0cmluZ3MuXG4gKiBAZXhhbXBsZVxuICpcbiAqIC8vIEJhc2ljIHVzZVxuICogc3BsaXQoJ2EgYiBjIGQnLCAnICcpO1xuICogLy8gLT4gWydhJywgJ2InLCAnYycsICdkJ11cbiAqXG4gKiAvLyBXaXRoIGxpbWl0XG4gKiBzcGxpdCgnYSBiIGMgZCcsICcgJywgMik7XG4gKiAvLyAtPiBbJ2EnLCAnYiddXG4gKlxuICogLy8gQmFja3JlZmVyZW5jZXMgaW4gcmVzdWx0IGFycmF5XG4gKiBzcGxpdCgnLi53b3JkMSB3b3JkMi4uJywgLyhbYS16XSspKFxcZCspL2kpO1xuICogLy8gLT4gWycuLicsICd3b3JkJywgJzEnLCAnICcsICd3b3JkJywgJzInLCAnLi4nXVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbiBzcGxpdCh1bmRlZikge1xuXG4gIHZhciBuYXRpdmVTcGxpdCA9IFN0cmluZy5wcm90b3R5cGUuc3BsaXQsXG4gICAgY29tcGxpYW50RXhlY05wY2cgPSAvKCk/Py8uZXhlYyhcIlwiKVsxXSA9PT0gdW5kZWYsXG4gICAgLy8gTlBDRzogbm9ucGFydGljaXBhdGluZyBjYXB0dXJpbmcgZ3JvdXBcbiAgICBzZWxmO1xuXG4gIHNlbGYgPSBmdW5jdGlvbihzdHIsIHNlcGFyYXRvciwgbGltaXQpIHtcbiAgICAvLyBJZiBgc2VwYXJhdG9yYCBpcyBub3QgYSByZWdleCwgdXNlIGBuYXRpdmVTcGxpdGBcbiAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHNlcGFyYXRvcikgIT09IFwiW29iamVjdCBSZWdFeHBdXCIpIHtcbiAgICAgIHJldHVybiBuYXRpdmVTcGxpdC5jYWxsKHN0ciwgc2VwYXJhdG9yLCBsaW1pdCk7XG4gICAgfVxuICAgIHZhciBvdXRwdXQgPSBbXSxcbiAgICAgIGZsYWdzID0gKHNlcGFyYXRvci5pZ25vcmVDYXNlID8gXCJpXCIgOiBcIlwiKSArIChzZXBhcmF0b3IubXVsdGlsaW5lID8gXCJtXCIgOiBcIlwiKSArIChzZXBhcmF0b3IuZXh0ZW5kZWQgPyBcInhcIiA6IFwiXCIpICsgLy8gUHJvcG9zZWQgZm9yIEVTNlxuICAgICAgKHNlcGFyYXRvci5zdGlja3kgPyBcInlcIiA6IFwiXCIpLFxuICAgICAgLy8gRmlyZWZveCAzK1xuICAgICAgbGFzdExhc3RJbmRleCA9IDAsXG4gICAgICAvLyBNYWtlIGBnbG9iYWxgIGFuZCBhdm9pZCBgbGFzdEluZGV4YCBpc3N1ZXMgYnkgd29ya2luZyB3aXRoIGEgY29weVxuICAgICAgc2VwYXJhdG9yID0gbmV3IFJlZ0V4cChzZXBhcmF0b3Iuc291cmNlLCBmbGFncyArIFwiZ1wiKSxcbiAgICAgIHNlcGFyYXRvcjIsIG1hdGNoLCBsYXN0SW5kZXgsIGxhc3RMZW5ndGg7XG4gICAgc3RyICs9IFwiXCI7IC8vIFR5cGUtY29udmVydFxuICAgIGlmICghY29tcGxpYW50RXhlY05wY2cpIHtcbiAgICAgIC8vIERvZXNuJ3QgbmVlZCBmbGFncyBneSwgYnV0IHRoZXkgZG9uJ3QgaHVydFxuICAgICAgc2VwYXJhdG9yMiA9IG5ldyBSZWdFeHAoXCJeXCIgKyBzZXBhcmF0b3Iuc291cmNlICsgXCIkKD8hXFxcXHMpXCIsIGZsYWdzKTtcbiAgICB9XG4gICAgLyogVmFsdWVzIGZvciBgbGltaXRgLCBwZXIgdGhlIHNwZWM6XG4gICAgICogSWYgdW5kZWZpbmVkOiA0Mjk0OTY3Mjk1IC8vIE1hdGgucG93KDIsIDMyKSAtIDFcbiAgICAgKiBJZiAwLCBJbmZpbml0eSwgb3IgTmFOOiAwXG4gICAgICogSWYgcG9zaXRpdmUgbnVtYmVyOiBsaW1pdCA9IE1hdGguZmxvb3IobGltaXQpOyBpZiAobGltaXQgPiA0Mjk0OTY3Mjk1KSBsaW1pdCAtPSA0Mjk0OTY3Mjk2O1xuICAgICAqIElmIG5lZ2F0aXZlIG51bWJlcjogNDI5NDk2NzI5NiAtIE1hdGguZmxvb3IoTWF0aC5hYnMobGltaXQpKVxuICAgICAqIElmIG90aGVyOiBUeXBlLWNvbnZlcnQsIHRoZW4gdXNlIHRoZSBhYm92ZSBydWxlc1xuICAgICAqL1xuICAgIGxpbWl0ID0gbGltaXQgPT09IHVuZGVmID8gLTEgPj4+IDAgOiAvLyBNYXRoLnBvdygyLCAzMikgLSAxXG4gICAgbGltaXQgPj4+IDA7IC8vIFRvVWludDMyKGxpbWl0KVxuICAgIHdoaWxlIChtYXRjaCA9IHNlcGFyYXRvci5leGVjKHN0cikpIHtcbiAgICAgIC8vIGBzZXBhcmF0b3IubGFzdEluZGV4YCBpcyBub3QgcmVsaWFibGUgY3Jvc3MtYnJvd3NlclxuICAgICAgbGFzdEluZGV4ID0gbWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGg7XG4gICAgICBpZiAobGFzdEluZGV4ID4gbGFzdExhc3RJbmRleCkge1xuICAgICAgICBvdXRwdXQucHVzaChzdHIuc2xpY2UobGFzdExhc3RJbmRleCwgbWF0Y2guaW5kZXgpKTtcbiAgICAgICAgLy8gRml4IGJyb3dzZXJzIHdob3NlIGBleGVjYCBtZXRob2RzIGRvbid0IGNvbnNpc3RlbnRseSByZXR1cm4gYHVuZGVmaW5lZGAgZm9yXG4gICAgICAgIC8vIG5vbnBhcnRpY2lwYXRpbmcgY2FwdHVyaW5nIGdyb3Vwc1xuICAgICAgICBpZiAoIWNvbXBsaWFudEV4ZWNOcGNnICYmIG1hdGNoLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICBtYXRjaFswXS5yZXBsYWNlKHNlcGFyYXRvcjIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoIC0gMjsgaSsrKSB7XG4gICAgICAgICAgICAgIGlmIChhcmd1bWVudHNbaV0gPT09IHVuZGVmKSB7XG4gICAgICAgICAgICAgICAgbWF0Y2hbaV0gPSB1bmRlZjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtYXRjaC5sZW5ndGggPiAxICYmIG1hdGNoLmluZGV4IDwgc3RyLmxlbmd0aCkge1xuICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KG91dHB1dCwgbWF0Y2guc2xpY2UoMSkpO1xuICAgICAgICB9XG4gICAgICAgIGxhc3RMZW5ndGggPSBtYXRjaFswXS5sZW5ndGg7XG4gICAgICAgIGxhc3RMYXN0SW5kZXggPSBsYXN0SW5kZXg7XG4gICAgICAgIGlmIChvdXRwdXQubGVuZ3RoID49IGxpbWl0KSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChzZXBhcmF0b3IubGFzdEluZGV4ID09PSBtYXRjaC5pbmRleCkge1xuICAgICAgICBzZXBhcmF0b3IubGFzdEluZGV4Kys7IC8vIEF2b2lkIGFuIGluZmluaXRlIGxvb3BcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGxhc3RMYXN0SW5kZXggPT09IHN0ci5sZW5ndGgpIHtcbiAgICAgIGlmIChsYXN0TGVuZ3RoIHx8ICFzZXBhcmF0b3IudGVzdChcIlwiKSkge1xuICAgICAgICBvdXRwdXQucHVzaChcIlwiKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0LnB1c2goc3RyLnNsaWNlKGxhc3RMYXN0SW5kZXgpKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dHB1dC5sZW5ndGggPiBsaW1pdCA/IG91dHB1dC5zbGljZSgwLCBsaW1pdCkgOiBvdXRwdXQ7XG4gIH07XG5cbiAgcmV0dXJuIHNlbGY7XG59KSgpO1xuIiwiLy8gY29udGFpbnMsIGFkZCwgcmVtb3ZlLCB0b2dnbGVcbnZhciBpbmRleG9mID0gcmVxdWlyZSgnaW5kZXhvZicpXG5cbm1vZHVsZS5leHBvcnRzID0gQ2xhc3NMaXN0XG5cbmZ1bmN0aW9uIENsYXNzTGlzdChlbGVtKSB7XG4gICAgdmFyIGNsID0gZWxlbS5jbGFzc0xpc3RcblxuICAgIGlmIChjbCkge1xuICAgICAgICByZXR1cm4gY2xcbiAgICB9XG5cbiAgICB2YXIgY2xhc3NMaXN0ID0ge1xuICAgICAgICBhZGQ6IGFkZFxuICAgICAgICAsIHJlbW92ZTogcmVtb3ZlXG4gICAgICAgICwgY29udGFpbnM6IGNvbnRhaW5zXG4gICAgICAgICwgdG9nZ2xlOiB0b2dnbGVcbiAgICAgICAgLCB0b1N0cmluZzogJHRvU3RyaW5nXG4gICAgICAgICwgbGVuZ3RoOiAwXG4gICAgICAgICwgaXRlbTogaXRlbVxuICAgIH1cblxuICAgIHJldHVybiBjbGFzc0xpc3RcblxuICAgIGZ1bmN0aW9uIGFkZCh0b2tlbikge1xuICAgICAgICB2YXIgbGlzdCA9IGdldFRva2VucygpXG4gICAgICAgIGlmIChpbmRleG9mKGxpc3QsIHRva2VuKSA+IC0xKSB7XG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuICAgICAgICBsaXN0LnB1c2godG9rZW4pXG4gICAgICAgIHNldFRva2VucyhsaXN0KVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlbW92ZSh0b2tlbikge1xuICAgICAgICB2YXIgbGlzdCA9IGdldFRva2VucygpXG4gICAgICAgICAgICAsIGluZGV4ID0gaW5kZXhvZihsaXN0LCB0b2tlbilcblxuICAgICAgICBpZiAoaW5kZXggPT09IC0xKSB7XG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuXG4gICAgICAgIGxpc3Quc3BsaWNlKGluZGV4LCAxKVxuICAgICAgICBzZXRUb2tlbnMobGlzdClcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb250YWlucyh0b2tlbikge1xuICAgICAgICByZXR1cm4gaW5kZXhvZihnZXRUb2tlbnMoKSwgdG9rZW4pID4gLTFcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0b2dnbGUodG9rZW4pIHtcbiAgICAgICAgaWYgKGNvbnRhaW5zKHRva2VuKSkge1xuICAgICAgICAgICAgcmVtb3ZlKHRva2VuKVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhZGQodG9rZW4pXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gJHRvU3RyaW5nKCkge1xuICAgICAgICByZXR1cm4gZWxlbS5jbGFzc05hbWVcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpdGVtKGluZGV4KSB7XG4gICAgICAgIHZhciB0b2tlbnMgPSBnZXRUb2tlbnMoKVxuICAgICAgICByZXR1cm4gdG9rZW5zW2luZGV4XSB8fCBudWxsXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0VG9rZW5zKCkge1xuICAgICAgICB2YXIgY2xhc3NOYW1lID0gZWxlbS5jbGFzc05hbWVcblxuICAgICAgICByZXR1cm4gZmlsdGVyKGNsYXNzTmFtZS5zcGxpdChcIiBcIiksIGlzVHJ1dGh5KVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldFRva2VucyhsaXN0KSB7XG4gICAgICAgIHZhciBsZW5ndGggPSBsaXN0Lmxlbmd0aFxuXG4gICAgICAgIGVsZW0uY2xhc3NOYW1lID0gbGlzdC5qb2luKFwiIFwiKVxuICAgICAgICBjbGFzc0xpc3QubGVuZ3RoID0gbGVuZ3RoXG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjbGFzc0xpc3RbaV0gPSBsaXN0W2ldXG4gICAgICAgIH1cblxuICAgICAgICBkZWxldGUgbGlzdFtsZW5ndGhdXG4gICAgfVxufVxuXG5mdW5jdGlvbiBmaWx0ZXIgKGFyciwgZm4pIHtcbiAgICB2YXIgcmV0ID0gW11cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoZm4oYXJyW2ldKSkgcmV0LnB1c2goYXJyW2ldKVxuICAgIH1cbiAgICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIGlzVHJ1dGh5KHZhbHVlKSB7XG4gICAgcmV0dXJuICEhdmFsdWVcbn1cbiIsIlxudmFyIGluZGV4T2YgPSBbXS5pbmRleE9mO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGFyciwgb2JqKXtcbiAgaWYgKGluZGV4T2YpIHJldHVybiBhcnIuaW5kZXhPZihvYmopO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7ICsraSkge1xuICAgIGlmIChhcnJbaV0gPT09IG9iaikgcmV0dXJuIGk7XG4gIH1cbiAgcmV0dXJuIC0xO1xufTsiLCJtb2R1bGUuZXhwb3J0cyA9IG1lcmdlQnVmZmVycztcblxuZnVuY3Rpb24gbWVyZ2VCdWZmZXJzKGJ1ZmZlcnMsIGFjKSB7XG4gIHZhciBtYXhDaGFubmVscyA9IDA7XG4gIHZhciBtYXhEdXJhdGlvbiA9IDA7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYnVmZmVycy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChidWZmZXJzW2ldLm51bWJlck9mQ2hhbm5lbHMgPiBtYXhDaGFubmVscykge1xuICAgICAgbWF4Q2hhbm5lbHMgPSBidWZmZXJzW2ldLm51bWJlck9mQ2hhbm5lbHM7XG4gICAgfVxuICAgIGlmIChidWZmZXJzW2ldLmR1cmF0aW9uID4gbWF4RHVyYXRpb24pIHtcbiAgICAgIG1heER1cmF0aW9uID0gYnVmZmVyc1tpXS5kdXJhdGlvbjtcbiAgICB9XG4gIH1cbiAgdmFyIG91dCA9IGFjLmNyZWF0ZUJ1ZmZlcihtYXhDaGFubmVscyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjLnNhbXBsZVJhdGUgKiBtYXhEdXJhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjLnNhbXBsZVJhdGUpO1xuXG4gIGZvciAodmFyIGogPSAwOyBqIDwgYnVmZmVycy5sZW5ndGg7IGorKykge1xuICAgIGZvciAodmFyIHNyY0NoYW5uZWwgPSAwOyBzcmNDaGFubmVsIDwgYnVmZmVyc1tqXS5udW1iZXJPZkNoYW5uZWxzOyBzcmNDaGFubmVsKyspIHtcbiAgICAgIHZhciBvdXR0ID0gb3V0LmdldENoYW5uZWxEYXRhKHNyY0NoYW5uZWwpO1xuICAgICAgdmFyIGlubiA9IGJ1ZmZlcnNbal0uZ2V0Q2hhbm5lbERhdGEoc3JjQ2hhbm5lbCk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGlubi5sZW5ndGg7IGkrKykge1xuICAgICAgICBvdXR0W2ldICs9IGlubltpXTtcbiAgICAgIH1cbiAgICAgIG91dC5nZXRDaGFubmVsRGF0YShzcmNDaGFubmVsKS5zZXQob3V0dCwgMCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBvdXQ7XG59IiwidmFyIG5vdyA9IHJlcXVpcmUoJ3BlcmZvcm1hbmNlLW5vdycpXG4gICwgZ2xvYmFsID0gdHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyB7fSA6IHdpbmRvd1xuICAsIHZlbmRvcnMgPSBbJ21veicsICd3ZWJraXQnXVxuICAsIHN1ZmZpeCA9ICdBbmltYXRpb25GcmFtZSdcbiAgLCByYWYgPSBnbG9iYWxbJ3JlcXVlc3QnICsgc3VmZml4XVxuICAsIGNhZiA9IGdsb2JhbFsnY2FuY2VsJyArIHN1ZmZpeF0gfHwgZ2xvYmFsWydjYW5jZWxSZXF1ZXN0JyArIHN1ZmZpeF1cbiAgLCBpc05hdGl2ZSA9IHRydWVcblxuZm9yKHZhciBpID0gMDsgaSA8IHZlbmRvcnMubGVuZ3RoICYmICFyYWY7IGkrKykge1xuICByYWYgPSBnbG9iYWxbdmVuZG9yc1tpXSArICdSZXF1ZXN0JyArIHN1ZmZpeF1cbiAgY2FmID0gZ2xvYmFsW3ZlbmRvcnNbaV0gKyAnQ2FuY2VsJyArIHN1ZmZpeF1cbiAgICAgIHx8IGdsb2JhbFt2ZW5kb3JzW2ldICsgJ0NhbmNlbFJlcXVlc3QnICsgc3VmZml4XVxufVxuXG4vLyBTb21lIHZlcnNpb25zIG9mIEZGIGhhdmUgckFGIGJ1dCBub3QgY0FGXG5pZighcmFmIHx8ICFjYWYpIHtcbiAgaXNOYXRpdmUgPSBmYWxzZVxuXG4gIHZhciBsYXN0ID0gMFxuICAgICwgaWQgPSAwXG4gICAgLCBxdWV1ZSA9IFtdXG4gICAgLCBmcmFtZUR1cmF0aW9uID0gMTAwMCAvIDYwXG5cbiAgcmFmID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICBpZihxdWV1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIHZhciBfbm93ID0gbm93KClcbiAgICAgICAgLCBuZXh0ID0gTWF0aC5tYXgoMCwgZnJhbWVEdXJhdGlvbiAtIChfbm93IC0gbGFzdCkpXG4gICAgICBsYXN0ID0gbmV4dCArIF9ub3dcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBjcCA9IHF1ZXVlLnNsaWNlKDApXG4gICAgICAgIC8vIENsZWFyIHF1ZXVlIGhlcmUgdG8gcHJldmVudFxuICAgICAgICAvLyBjYWxsYmFja3MgZnJvbSBhcHBlbmRpbmcgbGlzdGVuZXJzXG4gICAgICAgIC8vIHRvIHRoZSBjdXJyZW50IGZyYW1lJ3MgcXVldWVcbiAgICAgICAgcXVldWUubGVuZ3RoID0gMFxuICAgICAgICBmb3IodmFyIGkgPSAwOyBpIDwgY3AubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZighY3BbaV0uY2FuY2VsbGVkKSB7XG4gICAgICAgICAgICB0cnl7XG4gICAgICAgICAgICAgIGNwW2ldLmNhbGxiYWNrKGxhc3QpXG4gICAgICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgdGhyb3cgZSB9LCAwKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSwgTWF0aC5yb3VuZChuZXh0KSlcbiAgICB9XG4gICAgcXVldWUucHVzaCh7XG4gICAgICBoYW5kbGU6ICsraWQsXG4gICAgICBjYWxsYmFjazogY2FsbGJhY2ssXG4gICAgICBjYW5jZWxsZWQ6IGZhbHNlXG4gICAgfSlcbiAgICByZXR1cm4gaWRcbiAgfVxuXG4gIGNhZiA9IGZ1bmN0aW9uKGhhbmRsZSkge1xuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBxdWV1ZS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYocXVldWVbaV0uaGFuZGxlID09PSBoYW5kbGUpIHtcbiAgICAgICAgcXVldWVbaV0uY2FuY2VsbGVkID0gdHJ1ZVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGZuKSB7XG4gIC8vIFdyYXAgaW4gYSBuZXcgZnVuY3Rpb24gdG8gcHJldmVudFxuICAvLyBgY2FuY2VsYCBwb3RlbnRpYWxseSBiZWluZyBhc3NpZ25lZFxuICAvLyB0byB0aGUgbmF0aXZlIHJBRiBmdW5jdGlvblxuICBpZighaXNOYXRpdmUpIHtcbiAgICByZXR1cm4gcmFmLmNhbGwoZ2xvYmFsLCBmbilcbiAgfVxuICByZXR1cm4gcmFmLmNhbGwoZ2xvYmFsLCBmdW5jdGlvbigpIHtcbiAgICB0cnl7XG4gICAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyB0aHJvdyBlIH0sIDApXG4gICAgfVxuICB9KVxufVxubW9kdWxlLmV4cG9ydHMuY2FuY2VsID0gZnVuY3Rpb24oKSB7XG4gIGNhZi5hcHBseShnbG9iYWwsIGFyZ3VtZW50cylcbn1cbiIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG4vLyBHZW5lcmF0ZWQgYnkgQ29mZmVlU2NyaXB0IDEuNi4zXG4oZnVuY3Rpb24oKSB7XG4gIHZhciBnZXROYW5vU2Vjb25kcywgaHJ0aW1lLCBsb2FkVGltZTtcblxuICBpZiAoKHR5cGVvZiBwZXJmb3JtYW5jZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBwZXJmb3JtYW5jZSAhPT0gbnVsbCkgJiYgcGVyZm9ybWFuY2Uubm93KSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICB9O1xuICB9IGVsc2UgaWYgKCh0eXBlb2YgcHJvY2VzcyAhPT0gXCJ1bmRlZmluZWRcIiAmJiBwcm9jZXNzICE9PSBudWxsKSAmJiBwcm9jZXNzLmhydGltZSkge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gKGdldE5hbm9TZWNvbmRzKCkgLSBsb2FkVGltZSkgLyAxZTY7XG4gICAgfTtcbiAgICBocnRpbWUgPSBwcm9jZXNzLmhydGltZTtcbiAgICBnZXROYW5vU2Vjb25kcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGhyO1xuICAgICAgaHIgPSBocnRpbWUoKTtcbiAgICAgIHJldHVybiBoclswXSAqIDFlOSArIGhyWzFdO1xuICAgIH07XG4gICAgbG9hZFRpbWUgPSBnZXROYW5vU2Vjb25kcygpO1xuICB9IGVsc2UgaWYgKERhdGUubm93KSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBEYXRlLm5vdygpIC0gbG9hZFRpbWU7XG4gICAgfTtcbiAgICBsb2FkVGltZSA9IERhdGUubm93KCk7XG4gIH0gZWxzZSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIGxvYWRUaW1lO1xuICAgIH07XG4gICAgbG9hZFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgfVxuXG59KS5jYWxsKHRoaXMpO1xuXG4vKlxuLy9AIHNvdXJjZU1hcHBpbmdVUkw9cGVyZm9ybWFuY2Utbm93Lm1hcFxuKi9cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoJ19wcm9jZXNzJykpIixudWxsLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5NdXRhdGlvbk9ic2VydmVyID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuTXV0YXRpb25PYnNlcnZlcjtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICB2YXIgcXVldWUgPSBbXTtcblxuICAgIGlmIChjYW5NdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgICAgIHZhciBoaWRkZW5EaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcXVldWVMaXN0ID0gcXVldWUuc2xpY2UoKTtcbiAgICAgICAgICAgIHF1ZXVlLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICBxdWV1ZUxpc3QuZm9yRWFjaChmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIG9ic2VydmVyLm9ic2VydmUoaGlkZGVuRGl2LCB7IGF0dHJpYnV0ZXM6IHRydWUgfSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBpZiAoIXF1ZXVlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGhpZGRlbkRpdi5zZXRBdHRyaWJ1dGUoJ3llcycsICdubycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwidmFyIGJ1bmRsZUZuID0gYXJndW1lbnRzWzNdO1xudmFyIHNvdXJjZXMgPSBhcmd1bWVudHNbNF07XG52YXIgY2FjaGUgPSBhcmd1bWVudHNbNV07XG5cbnZhciBzdHJpbmdpZnkgPSBKU09OLnN0cmluZ2lmeTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICB2YXIga2V5cyA9IFtdO1xuICAgIHZhciB3a2V5O1xuICAgIHZhciBjYWNoZUtleXMgPSBPYmplY3Qua2V5cyhjYWNoZSk7XG4gICAgXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBjYWNoZUtleXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIHZhciBrZXkgPSBjYWNoZUtleXNbaV07XG4gICAgICAgIGlmIChjYWNoZVtrZXldLmV4cG9ydHMgPT09IGZuKSB7XG4gICAgICAgICAgICB3a2V5ID0ga2V5O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgaWYgKCF3a2V5KSB7XG4gICAgICAgIHdrZXkgPSBNYXRoLmZsb29yKE1hdGgucG93KDE2LCA4KSAqIE1hdGgucmFuZG9tKCkpLnRvU3RyaW5nKDE2KTtcbiAgICAgICAgdmFyIHdjYWNoZSA9IHt9O1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGNhY2hlS2V5cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBrZXkgPSBjYWNoZUtleXNbaV07XG4gICAgICAgICAgICB3Y2FjaGVba2V5XSA9IGtleTtcbiAgICAgICAgfVxuICAgICAgICBzb3VyY2VzW3drZXldID0gW1xuICAgICAgICAgICAgRnVuY3Rpb24oWydyZXF1aXJlJywnbW9kdWxlJywnZXhwb3J0cyddLCAnKCcgKyBmbiArICcpKHNlbGYpJyksXG4gICAgICAgICAgICB3Y2FjaGVcbiAgICAgICAgXTtcbiAgICB9XG4gICAgdmFyIHNrZXkgPSBNYXRoLmZsb29yKE1hdGgucG93KDE2LCA4KSAqIE1hdGgucmFuZG9tKCkpLnRvU3RyaW5nKDE2KTtcbiAgICBcbiAgICB2YXIgc2NhY2hlID0ge307IHNjYWNoZVt3a2V5XSA9IHdrZXk7XG4gICAgc291cmNlc1tza2V5XSA9IFtcbiAgICAgICAgRnVuY3Rpb24oWydyZXF1aXJlJ10sJ3JlcXVpcmUoJyArIHN0cmluZ2lmeSh3a2V5KSArICcpKHNlbGYpJyksXG4gICAgICAgIHNjYWNoZVxuICAgIF07XG4gICAgXG4gICAgdmFyIHNyYyA9ICcoJyArIGJ1bmRsZUZuICsgJykoeydcbiAgICAgICAgKyBPYmplY3Qua2V5cyhzb3VyY2VzKS5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgcmV0dXJuIHN0cmluZ2lmeShrZXkpICsgJzpbJ1xuICAgICAgICAgICAgICAgICsgc291cmNlc1trZXldWzBdXG4gICAgICAgICAgICAgICAgKyAnLCcgKyBzdHJpbmdpZnkoc291cmNlc1trZXldWzFdKSArICddJ1xuICAgICAgICAgICAgO1xuICAgICAgICB9KS5qb2luKCcsJylcbiAgICAgICAgKyAnfSx7fSxbJyArIHN0cmluZ2lmeShza2V5KSArICddKSdcbiAgICA7XG4gICAgcmV0dXJuIG5ldyBXb3JrZXIod2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwoXG4gICAgICAgIG5ldyBCbG9iKFtzcmNdLCB7IHR5cGU6ICd0ZXh0L2phdmFzY3JpcHQnIH0pXG4gICAgKSk7XG59O1xuIiwidmFyIHJlc3VsdCA9IFsnIzMwRkZENicsXG4gICAgICAgICAgICAgICcjNzJFRUQ2JyxcbiAgICAgICAgICAgICAgJyMxREJGOUYnLFxuICAgICAgICAgICAgICAnIzY1RjBCOScsXG4gICAgICAgICAgICAgICcjNTdGQzkzJyxcbiAgICAgICAgICAgICAgJyM5OEZGQkUnLFxuICAgICAgICAgICAgICAnI0EwRkY5OCddO1xudmFyIG15SW50ZXJ2YWw7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBzdGFydDogc3RhcnQsXG4gIGVuZDogZW5kXG59XG5cbmZ1bmN0aW9uIHN0YXJ0KGVsLCBpbnRlcnZhbCkge1xuICB2YXIgbCA9IDA7XG4gIG15SW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgbCsrO1xuICAgICAgICAgICAgICAgICBpZiAobCA+PSByZXN1bHQubGVuZ3RoKSBsID0gMDtcbiAgICAgICAgICAgICAgICAgZWwuc3R5bGUuY29sb3IgPSByZXN1bHRbbF07XG4gICAgICAgICAgICAgICB9LCBpbnRlcnZhbCk7XG59XG5cbmZ1bmN0aW9uIGVuZCgpIHtcbiAgY2xlYXJJbnRlcnZhbChteUludGVydmFsKTtcbiAgbXlJbnRlcnZhbCA9IG51bGw7XG59IiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIGN1dDogY3V0QnVmZmVyLFxuICBjb3B5OiBjb3B5QnVmZmVyLFxuICBwYXN0ZTogcGFzdGVCdWZmZXIsXG4gIHJldmVyc2U6IHJldmVyc2VCdWZmZXJcbn07XG5cbmZ1bmN0aW9uIHJldmVyc2VCdWZmZXIoYnVmZmVyLCBjYikge1xuICB2YXIgY2hhbk51bWJlciA9IGJ1ZmZlci5udW1iZXJPZkNoYW5uZWxzO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGNoYW5OdW1iZXI7ICsraSkge1xuICAgIHZhciBkYXRhID0gYnVmZmVyLmdldENoYW5uZWxEYXRhKGkpO1xuICAgIEFycmF5LnByb3RvdHlwZS5yZXZlcnNlLmNhbGwoZGF0YSk7XG4gIH1cbiAgY2IoKTtcbn1cblxuLy8gY29weSB0aGUgYnVmZmVyIHRvIG91ciBjbGlwYm9hcmQsIHdpdGhvdXQgcmVtb3ZpbmcgdGhlIG9yaWdpbmFsIHNlY3Rpb24gZnJvbSBidWZmZXIuXG5mdW5jdGlvbiBjb3B5QnVmZmVyKGNvbnRleHQsIGNsaXBib2FyZCwgYnVmZmVyLCBjYikge1xuICB2YXIgc3RhcnQgPSBNYXRoLnJvdW5kKGNsaXBib2FyZC5zdGFydCAqIGJ1ZmZlci5zYW1wbGVSYXRlKTtcbiAgdmFyIGVuZCA9IE1hdGgucm91bmQoY2xpcGJvYXJkLmVuZCAqIGJ1ZmZlci5zYW1wbGVSYXRlKTtcblxuICBjbGlwYm9hcmQuYnVmZmVyID0gY29udGV4dC5jcmVhdGVCdWZmZXIoMiwgZW5kIC0gc3RhcnQsIGJ1ZmZlci5zYW1wbGVSYXRlKTtcblxuICBjbGlwYm9hcmQuYnVmZmVyLmdldENoYW5uZWxEYXRhKDApLnNldChcbiAgICBidWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCkuc3ViYXJyYXkoc3RhcnQsIGVuZCksIDApO1xuICBjbGlwYm9hcmQuYnVmZmVyLmdldENoYW5uZWxEYXRhKDEpLnNldChcbiAgICBidWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkuc3ViYXJyYXkoc3RhcnQsIGVuZCksIDApO1xuXG4gIGNiKCk7XG59XG5cbi8vIGN1dCB0aGUgYnVmZmVyIHBvcnRpb24gdG8gb3VyIGNsaXBib2FyZCwgc2V0cyBlbXB0eSBzcGFjZSBpbiBwbGFjZSBvZiB0aGUgcG9ydGlvblxuLy8gaW4gdGhlIHNvdXJjZSBidWZmZXIuXG5mdW5jdGlvbiBjdXRCdWZmZXIoY29udGV4dCwgY2xpcGJvYXJkLCBidWZmZXIsIGNiKSB7XG4gIHZhciBzdGFydCA9IE1hdGgucm91bmQoY2xpcGJvYXJkLnN0YXJ0ICogYnVmZmVyLnNhbXBsZVJhdGUpO1xuICB2YXIgZW5kID0gTWF0aC5yb3VuZChjbGlwYm9hcmQuZW5kICogYnVmZmVyLnNhbXBsZVJhdGUpO1xuXG4gIGNsaXBib2FyZC5idWZmZXIgPSBjb250ZXh0LmNyZWF0ZUJ1ZmZlcigyLCBlbmQgLSBzdGFydCwgYnVmZmVyLnNhbXBsZVJhdGUpO1xuICBjbGlwYm9hcmQuYnVmZmVyLmdldENoYW5uZWxEYXRhKDApLnNldChidWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCkuc3ViYXJyYXkoc3RhcnQsIGVuZCkpO1xuICBjbGlwYm9hcmQuYnVmZmVyLmdldENoYW5uZWxEYXRhKDEpLnNldChidWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkuc3ViYXJyYXkoc3RhcnQsIGVuZCkpO1xuXG4gIHZhciBudU9sZEJ1ZmZlciA9IGNvbnRleHQuY3JlYXRlQnVmZmVyKDIsIGJ1ZmZlci5sZW5ndGgsIGJ1ZmZlci5zYW1wbGVSYXRlKTtcbiAgdmFyIGVtcHR5QnVmID0gY29udGV4dC5jcmVhdGVCdWZmZXIoMiwgZW5kIC0gc3RhcnQsIGJ1ZmZlci5zYW1wbGVSYXRlKTtcblxuICBudU9sZEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zZXQoYnVmZmVyLmdldENoYW5uZWxEYXRhKDApLnN1YmFycmF5KDAsIHN0YXJ0KSk7XG4gIG51T2xkQnVmZmVyLmdldENoYW5uZWxEYXRhKDEpLnNldChidWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkuc3ViYXJyYXkoMCwgc3RhcnQpKVxuXG4gIG51T2xkQnVmZmVyLmdldENoYW5uZWxEYXRhKDApLnNldChlbXB0eUJ1Zi5nZXRDaGFubmVsRGF0YSgwKSwgc3RhcnQpO1xuICBudU9sZEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKS5zZXQoZW1wdHlCdWYuZ2V0Q2hhbm5lbERhdGEoMSksIHN0YXJ0KTtcblxuICBudU9sZEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zZXQoYnVmZmVyLmdldENoYW5uZWxEYXRhKDApLnN1YmFycmF5KGVuZCwgYnVmZmVyLmxlbmd0aCksIGVuZCk7XG4gIG51T2xkQnVmZmVyLmdldENoYW5uZWxEYXRhKDEpLnNldChidWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkuc3ViYXJyYXkoZW5kLCBidWZmZXIubGVuZ3RoKSwgZW5kKTtcbiAgY2IobnVPbGRCdWZmZXIpO1xufVxuXG4vLyBpbnNlcnQgb3VyIGNsaXBib2FyZCBhdCBhIHNwZWNpZmljIHBvaW50IGluIGJ1ZmZlci5cbmZ1bmN0aW9uIHBhc3RlQnVmZmVyKGNvbnRleHQsIGNsaXBib2FyZCwgYnVmZmVyLCBhdCwgY2IpIHtcbiAgdmFyIHN0YXJ0ID0gTWF0aC5yb3VuZChjbGlwYm9hcmQuc3RhcnQgKiBidWZmZXIuc2FtcGxlUmF0ZSk7XG4gIHZhciBlbmQgPSBNYXRoLnJvdW5kKGNsaXBib2FyZC5lbmQgKiBidWZmZXIuc2FtcGxlUmF0ZSk7XG4gIGF0ID0gYXQgKiBidWZmZXIuc2FtcGxlUmF0ZTtcblxuICAvLyBjcmVhdGUgcmVwbGFjZW1lbnQgYnVmZmVyIHdpdGggZW5vdWdoIHNwYWNlIGZvciBjbGlib2FyZCBwYXJ0XG4gIHZhciBudVBhc3RlZEJ1ZmZlciA9IGNvbnRleHQuY3JlYXRlQnVmZmVyKDIsIGJ1ZmZlci5sZW5ndGggKyAoZW5kIC0gc3RhcnQpLCBidWZmZXIuc2FtcGxlUmF0ZSk7XG5cbiAgLy8gaWYgb3VyIGNsaXAgc3RhcnQgcG9pbnQgaXMgbm90IGF0ICcwJyB0aGVuIHdlIG5lZWQgdG8gc2V0IHRoZSBvcmlnaW5hbFxuICAvLyBjaHVuaywgdXAgdG8gdGhlIGNsaXAgc3RhcnQgcG9pbnRcbiAgaWYgKGF0ID4gMCkge1xuICAgIG51UGFzdGVkQnVmZmVyLmdldENoYW5uZWxEYXRhKDApLnNldChidWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCkuc3ViYXJyYXkoMCwgYXQpKTtcbiAgICBudVBhc3RlZEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKS5zZXQoYnVmZmVyLmdldENoYW5uZWxEYXRhKDEpLnN1YmFycmF5KDAsIGF0KSk7XG4gIH1cblxuICAvLyBhZGQgdGhlIGNsaXAgZGF0YVxuICBudVBhc3RlZEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zZXQoY2xpcGJvYXJkLmJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKSwgYXQpO1xuICBudVBhc3RlZEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKS5zZXQoY2xpcGJvYXJkLmJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKSwgYXQpO1xuXG4gIC8vIGlmIG91ciBjbGlwIGVuZCBwb2ludCBpcyBub3QgYXQgdGhlIGVuZCBvZiB0aGUgb3JpZ2luYWwgYnVmZmVyIHRoZW5cbiAgLy8gd2UgbmVlZCB0byBhZGQgcmVtYWluaW5nIGRhdGEgZnJvbSB0aGUgb3JpZ2luYWwgYnVmZmVyO1xuICBpZiAoZW5kIDwgYnVmZmVyLmxlbmd0aCkge1xuICAgIHZhciBuZXdBdCA9IGF0ICsgKGVuZCAtIHN0YXJ0KTtcbiAgICBudVBhc3RlZEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zZXQoYnVmZmVyLmdldENoYW5uZWxEYXRhKDApLnN1YmFycmF5KG5ld0F0KSwgbmV3QXQpO1xuICAgIG51UGFzdGVkQnVmZmVyLmdldENoYW5uZWxEYXRhKDEpLnNldChidWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkuc3ViYXJyYXkobmV3QXQpLCBuZXdBdCk7XG4gIH1cblxuICBjYihudVBhc3RlZEJ1ZmZlcik7XG59IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih1cmwsIHRpdGxlKSB7XG4gIHZhciBsaW5rID0gd2luZG93LmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgbGluay5ocmVmID0gdXJsO1xuICBsaW5rLmRvd25sb2FkID0gdGl0bGUgfHwgJ291dHB1dC53YXYnO1xuICB2YXIgY2xpY2sgPSBkb2N1bWVudC5jcmVhdGVFdmVudChcIkV2ZW50XCIpO1xuICBjbGljay5pbml0RXZlbnQoXCJjbGlja1wiLCB0cnVlLCB0cnVlKTtcbiAgbGluay5kaXNwYXRjaEV2ZW50KGNsaWNrKTtcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh0b3RhbFNlYywgbXMpIHtcbiAgdmFyIG1pbnV0ZXMgPSBwYXJzZUludCggdG90YWxTZWMgLyA2MCApICUgNjA7XG4gIHZhciBzZWNvbmRzID0gdG90YWxTZWMgJSA2MDtcblxuICBpZiAobXMpIHtcbiAgICByZXR1cm4gKChtaW51dGVzIDwgMTAgPyBcIjBcIiArIG1pbnV0ZXMgOiBtaW51dGVzKSArIFwiOlwiICsgKHNlY29uZHMgIDwgMTAgPyBcIjBcIiArIHNlY29uZHMudG9GaXhlZCgyKSA6IHNlY29uZHMudG9GaXhlZCgyKSkpLnJlcGxhY2UoJy4nLCAnOicpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAoKG1pbnV0ZXMgPCAxMCA/IFwiMFwiICsgbWludXRlcyA6IG1pbnV0ZXMpICsgXCI6XCIgKyAoc2Vjb25kcyAgPCAxMCA/IFwiMFwiICsgIHBhcnNlSW50KHNlY29uZHMpIDogcGFyc2VJbnQoc2Vjb25kcykpKTtcbiAgfVxufSIsInZhciByZWNvcmRlcjtcbm1vZHVsZS5leHBvcnRzID0ge1xuICBzdGFydDogc3RhcnQsXG4gIHN0b3A6IHN0b3Bcbn1cblxuZnVuY3Rpb24gZ2V0U3RyZWFtKGNvbnRleHQsIGZmdCkge1xuICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhID0gbmF2aWdhdG9yLmdldFVzZXJNZWRpYSB8fCBuYXZpZ2F0b3Iud2Via2l0R2V0VXNlck1lZGlhO1xuICB3aW5kb3cuVVJMID0gd2luZG93LlVSTCB8fCB3aW5kb3cud2Via2l0VVJMO1xuXG4gIG5hdmlnYXRvci5nZXRVc2VyTWVkaWEoe2F1ZGlvOiB0cnVlfSwgZnVuY3Rpb24oc3RyZWFtKSB7XG4gICAgc3RhcnRVc2VyTWVkaWEoY29udGV4dCwgc3RyZWFtLCBmZnQpO1xuICB9LCBmdW5jdGlvbihlcnIpIHtcbiAgICBjb25zb2xlLmxvZygnTm8gbGl2ZSBhdWRpbyBpbnB1dDogJyArIGVycik7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBzdGFydFVzZXJNZWRpYShjb250ZXh0LCBzdHJlYW0sIGZmdCkge1xuICB2YXIgaW5wdXQgPSBjb250ZXh0LmNyZWF0ZU1lZGlhU3RyZWFtU291cmNlKHN0cmVhbSk7XG4gIGNvbnNvbGUubG9nKCdNZWRpYSBzdHJlYW0gY3JlYXRlZC4nKTtcblxuICBpZiAoZmZ0KSB7XG4gICAgaW5wdXQuY29ubmVjdChmZnQuaW5wdXQpO1xuICAgIC8vIHRocm93IGF3YXkgZ2FpbiBub2RlXG4gICAgdmFyIGdhaW5Ob2RlID0gY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgZ2Fpbk5vZGUuZ2Fpbi52YWx1ZSA9IDA7XG4gICAgZmZ0LmNvbm5lY3QoZ2Fpbk5vZGUpO1xuICAgIGdhaW5Ob2RlLmNvbm5lY3QoY29udGV4dC5kZXN0aW5hdGlvbik7XG4gIH1cbiAgLy8gaW5wdXQuY29ubmVjdChjb250ZXh0LmRlc3RpbmF0aW9uKTsgLy8gbWlnaHQgbm90IGFjdHVhbGx5IHdhbnQgdG8gZG8gdGhpc1xuICBjb25zb2xlLmxvZygnSW5wdXQgY29ubmVjdGVkIHRvIGF1ZGlvIGNvbnRleHQgZGVzdGluYXRpb24uJyk7XG5cbiAgcmVjb3JkZXIgPSBuZXcgUmVjb3JkZXIoaW5wdXQpO1xuICBjb25zb2xlLmxvZygnUmVjb3JkZXIgaW5pdGlhbGlzZWQuJyk7XG4gIHN0YXJ0KCk7XG59XG5cbmZ1bmN0aW9uIHN0YXJ0KGNvbnRleHQsIGZmdCkge1xuICBpZiAocmVjb3JkZXIgPT09IHVuZGVmaW5lZCkge1xuICAgIGdldFN0cmVhbShjb250ZXh0LCBmZnQpXG4gIH0gZWxzZSB7XG4gICAgcmVjb3JkZXIucmVjb3JkKCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc3RvcChjYikge1xuICByZWNvcmRlci5zdG9wKCk7XG4gIHJlY29yZGVyLmV4cG9ydFdBVihjYik7XG4gIHJlY29yZGVyLmNsZWFyKCk7XG59IiwiLy8gbmVlZCB0byBnZW5lcmF0ZSB0aGVzZSBwb2ludHMsIGxpa2UsIHdheSBzbWFydGVyXG4vLyBuZWVkIHRvIGJlIG11bHRpcGxlcyBvZiA1IGJ1dCBzdGlsbCByZXByZXNlbnRhdGl2ZSBvZiBtaW51dGVzXG4vLyBuZWVkIHRvIGFkanVzdCB3aWR0aCBvZiB0aW1lbGluZUVsIGJhc2VkIG9uIHRoaXNcblxudmFyIGggPSByZXF1aXJlKCdoeXBlcnNjcmlwdCcpO1xudmFyIGZvcm1hdFRpbWUgPSByZXF1aXJlKCcuL2Zvcm1hdC10aW1lJyk7XG52YXIgdGltZWxpbmVFbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy50aW1lbGluZScpO1xuXG5mdW5jdGlvbiBjYWxjdWxhdGVQb2ludHMoZHVyYXRpb24pIHtcbiAgcmV0dXJuIGR1cmF0aW9uIC8gNTtcbn1cblxuZnVuY3Rpb24gcG9pbnQobnVtKSB7XG4gIHJldHVybiBoKCdsaScsXG4gICAgICAgICAgIGgoJ3NwYW4nLCBudW0pKTtcbn1cblxuZnVuY3Rpb24gZ2V0UG9pbnRMZW5ndGgoKSB7XG4gIHJldHVybiB0aW1lbGluZUVsLmNoaWxkcmVuLmxlbmd0aFxufVxuXG4vLyBmaXggZm9ybWF0VGltZSB0byB3b3JrIHdpdGggbG93IG51bWJlcnNcblxuZnVuY3Rpb24gZ2V0UG9pbnRzKGN1ciwgbWF4KSB7XG4gIGlmIChjdXIgPCBtYXgpIHtcbiAgICBjdXIgPSBjdXIgKyA1O1xuICAgIHRpbWVsaW5lRWwuYXBwZW5kQ2hpbGQocG9pbnQoZm9ybWF0VGltZShjdXIpKSk7XG4gICAgZ2V0UG9pbnRzKGN1ciwgbWF4KTtcbiAgfVxufVxuXG5mdW5jdGlvbiB1cGRhdGUoZHVyYXRpb24sIGNsZWFuKSB7XG4gIGNvbnNvbGUubG9nKCdkdXJhdGlvbjo6JywgZHVyYXRpb24pO1xuICB2YXIgbnVQb2ludExlbmd0aCA9IGNhbGN1bGF0ZVBvaW50cyhkdXJhdGlvbik7XG5cbiAgaWYgKGNsZWFuKSB7XG4gICAgdGltZWxpbmVFbC5pbm5lckhUTUwgPSAnJztcbiAgICBnZXRQb2ludHMoLTUsIGR1cmF0aW9uKTtcbiAgICB0aW1lbGluZUVsLnN0eWxlLndpZHRoID0gdGltZWxpbmVFbC5jaGlsZHJlbi5sZW5ndGggKiAxMDAgKyAncHgnO1xuICB9IGVsc2Uge1xuICAgIGlmIChudVBvaW50TGVuZ3RoIDwgZ2V0UG9pbnRMZW5ndGgoKSkgcmV0dXJuO1xuICAgIHZhciB3ID0gdGltZWxpbmVFbC5vZmZzZXRXaWR0aDtcbiAgICB0aW1lbGluZUVsLmlubmVySFRNTCA9ICcnO1xuICAgIGdldFBvaW50cygtNSwgZHVyYXRpb24pO1xuICAgIGlmICh0aW1lbGluZUVsLmNoaWxkcmVuLmxlbmd0aCAqIDEwMCA+IHcpIHtcbiAgICAgIHRpbWVsaW5lRWwuc3R5bGUud2lkdGggPSB0aW1lbGluZUVsLmNoaWxkcmVuLmxlbmd0aCAqIDEwMCArICdweCc7XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICB1cGRhdGU6IHVwZGF0ZVxufTsiLCIvLyBUaGlzIGZpbGUgaXMgYSBwaXQgb2YgbmV3IHlvcmsgY2l0eSBzbGFybSwgZWRpdCBhdCB5b3VyIG93biByaXNrXG5cbi8qXG40KSBtYWtlIHN1cmUgbG9hZGluZyBhbmQgd2F2ZSByZW5kZXJpbmcgY29kZSBpcyBEUllcbiovXG52YXIgcmFmID0gcmVxdWlyZSgncmFmJyk7XG52YXIgRUUgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG52YXIgZHJhd0J1ZmZlciA9IHJlcXVpcmUoJ2RyYXctd2F2ZScpO1xudmFyIGVuY29kZXIgPSByZXF1aXJlKCdlbmNvZGUtd2F2Jyk7XG52YXIgQXVkaW9Tb3VyY2UgPSByZXF1aXJlKCdhdWRpb3NvdXJjZScpO1xuXG52YXIgZm9yY2VEb3dubG9hZCA9IHJlcXVpcmUoJy4vZm9yY2UtZG93bmxvYWQnKTtcbnZhciB0aW1lbGluZU1hbmFnZSA9IHJlcXVpcmUoJy4vdGltZWxpbmUnKTtcbnZhciBmb3JtYXRUaW1lID0gcmVxdWlyZSgnLi9mb3JtYXQtdGltZScpO1xudmFyIGNvbG9ycyA9IHJlcXVpcmUoJy4vY29sb3JzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gVHJhY2s7XG5cbmZ1bmN0aW9uIFRyYWNrKG9wdHMpIHtcbiAgdGhpcy5lbWl0dGVyID0gbmV3IEVFKCk7XG4gIHRoaXMuY29udHJvbEVsID0gb3B0cy5jb250cm9sRWw7XG4gIHRoaXMudHJhY2tFbCA9IG9wdHMudHJhY2tFbDtcbiAgdGhpcy5hY3RpdmUgPSB0cnVlO1xuICB0aGlzLnNlbGVjdGluZyA9IHRydWU7XG4gIHRoaXMuY29udGV4dCA9IG9wdHMuY29udGV4dDtcbiAgdGhpcy5hdWRpb3NvdXJjZSA9IG9wdHMuYXVkaW9zb3VyY2U7XG4gIHRoaXMuaWQgPSBvcHRzLmlkO1xuICB0aGlzLnRpdGxlID0gb3B0cy50aXRsZTtcblxuICBpZiAob3B0cy5nYWluTm9kZSkge1xuICAgIHRoaXMuZ2Fpbk5vZGUgPSBvcHRzLmdhaW5Ob2RlO1xuICB9XG5cbiAgdGhpcy5jbGlwYm9hcmQgPSB7XG4gICAgc3RhcnQ6IDAsXG4gICAgZW5kOiAwXG4gIH07XG5cbiAgdGhpcy5wbGF5aW5nID0gZmFsc2U7XG5cbiAgdGhpcy5zdGFydE9mZnNldCA9IDA7XG4gIHRoaXMubGFzdFBsYXkgPSAwO1xuXG4gIC8vIGluZGljYXRvcnNcbiAgdGhpcy5maWxlSW5kaWNhdG9yID0gdGhpcy50cmFja0VsLnF1ZXJ5U2VsZWN0b3IoJy50cmFjayBwJyk7XG4gIHRoaXMuY3VycmVudFRpbWVFbCA9IHRoaXMuY29udHJvbEVsLnF1ZXJ5U2VsZWN0b3IoJy5jdXInKTtcbiAgdGhpcy5yZW1haW5pbmdFbCA9IHRoaXMuY29udHJvbEVsLnF1ZXJ5U2VsZWN0b3IoJy5yZW0nKTtcbiAgdGhpcy5kdXJhdGlvbkVsID0gdGhpcy5jb250cm9sRWwucXVlcnlTZWxlY3RvcignLmR1cicpO1xuXG4gIC8vIGNlbnRlciBmaWxlIGluZGljYXRvclxuICB2YXIgdHJhY2tTcGFjZVdpZHRoID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnRyYWNrLXNwYWNlJykub2Zmc2V0V2lkdGg7XG4gIHRoaXMuZmlsZUluZGljYXRvci5zdHlsZS53aWR0aCA9IHRyYWNrU3BhY2VXaWR0aCArICdweCc7XG5cbiAgLy8gY29udHJvbHNcbiAgdGhpcy5nYWluRWwgPSB0aGlzLmNvbnRyb2xFbC5xdWVyeVNlbGVjdG9yKCcudm9sdW1lJyk7XG4gIHRoaXMudm9sdW1lQmFyID0gdGhpcy5nYWluRWwucXVlcnlTZWxlY3RvcignLnZvbHVtZS1iYXInKTtcblxuXG4gIC8vIHdhdmUgZWxlbWVudHNcbiAgdGhpcy53YXZlID0gdGhpcy50cmFja0VsLnF1ZXJ5U2VsZWN0b3IoJy53YXZlIGNhbnZhcycpO1xuICB0aGlzLnByb2dyZXNzV2F2ZSA9IHRoaXMudHJhY2tFbC5xdWVyeVNlbGVjdG9yKCcud2F2ZS1wcm9ncmVzcycpO1xuICB0aGlzLmN1cnNvciA9IHRoaXMudHJhY2tFbC5xdWVyeVNlbGVjdG9yKCcucGxheS1jdXJzb3InKTtcbiAgdGhpcy5zZWxlY3Rpb24gPSB0aGlzLnRyYWNrRWwucXVlcnlTZWxlY3RvcignLnNlbGVjdGlvbicpO1xuICB0aGlzLnNlbGVjdGFibGUgPSBbXS5zbGljZS5jYWxsKHRoaXMudHJhY2tFbC5xdWVyeVNlbGVjdG9yQWxsKCcuc2VsZWN0YWJsZScpKTtcblxuICBjb2xvcnMuc3RhcnQodGhpcy5maWxlSW5kaWNhdG9yLCAzMDApO1xuXG4gIHRoaXMuZ2FpbkVsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZXYpIHtcbiAgICB0aGlzLnZvbHVtZUJhci5zdHlsZS53aWR0aCA9IGV2Lm9mZnNldFggKyAncHgnO1xuICAgIHRoaXMuZ2Fpbk5vZGUuZ2Fpbi52YWx1ZSA9IGV2Lm9mZnNldFggLyB0aGlzLmdhaW5FbC5vZmZzZXRXaWR0aDtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICB0aGlzLmNvbnRyb2xFbC5xdWVyeVNlbGVjdG9yKCcuYWN0aXZhdGUnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGV2KSB7XG4gICAgdmFyIGVsID0gZXYudGFyZ2V0O1xuXG4gICAgaWYgKGVsLmNsYXNzTGlzdC5jb250YWlucygnYWN0aXZlJykpIHtcbiAgICAgIHRoaXMuYWN0aXZlID0gZmFsc2U7XG4gICAgICBlbC5jbGFzc0xpc3QucmVtb3ZlKCdhY3RpdmUnKTtcbiAgICAgIHRoaXMudHJhY2tFbC5jbGFzc0xpc3QucmVtb3ZlKCdhY3RpdmUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5hY3RpdmUgPSB0cnVlO1xuICAgICAgZWwuY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG4gICAgICB0aGlzLnRyYWNrRWwuY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG4gICAgfVxuICB9LmJpbmQodGhpcykpO1xuXG4gIHRoaXMuc2VsZWN0YWJsZS5mb3JFYWNoKGZ1bmN0aW9uKHdhdmUpIHtcbiAgICB3YXZlLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5pbml0U2VsZWN0aW9uLmJpbmQodGhpcykpO1xuICAgIHdhdmUuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgdGhpcy5zdGFydFNlbGVjdGlvbi5iaW5kKHRoaXMpKTtcbiAgICB3YXZlLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIHRoaXMudXBkYXRlU2VsZWN0aW9uLmJpbmQodGhpcykpO1xuICB9LCB0aGlzKTtcblxuICB0aGlzLnNlbGVjdGlvbi5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZnVuY3Rpb24oZXYpIHtcbiAgICBpZiAoIXRoaXMuc2VsZWN0aW5nKSByZXR1cm47XG4gICAgdmFyIGxlZnRQZXJjZW50ID0gcGFyc2VGbG9hdCh0aGlzLnNlbGVjdGlvbi5zdHlsZS5sZWZ0LnJlcGxhY2UoJ3B4JywgJycpKTtcbiAgICB2YXIgcmlnaHRQZXJjZW50ID0gbGVmdFBlcmNlbnQgKyBwYXJzZUZsb2F0KHRoaXMuc2VsZWN0aW9uLnN0eWxlLndpZHRoLnJlcGxhY2UoJ3B4JywgJycpKTtcbiAgICB0aGlzLmNsaXBib2FyZC5zdGFydCA9IHRoaXMuZ2V0VGltZUZyb21Qb3NpdGlvbihsZWZ0UGVyY2VudCk7XG4gICAgdGhpcy5jbGlwYm9hcmQuZW5kID0gdGhpcy5nZXRUaW1lRnJvbVBvc2l0aW9uKHJpZ2h0UGVyY2VudCk7XG4gICAgdGhpcy5tb3ZpbmcgPSBmYWxzZTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICB0aGlzLmNvbnRyb2xFbC5xdWVyeVNlbGVjdG9yKCcuZXhwb3J0JykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICBlbmNvZGVyLmVuY29kZVdBVihbdGhpcy5hdWRpb3NvdXJjZS5idWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCksIHRoaXMuYXVkaW9zb3VyY2UuYnVmZmVyLmdldENoYW5uZWxEYXRhKDEpXSxcbiAgICAgICAgICAgIHRoaXMuYXVkaW9zb3VyY2UuYnVmZmVyLnNhbXBsZVJhdGUsXG4gICAgICAgICAgICBmdW5jdGlvbihibG9iKSB7XG4gICAgICAgICAgICAgIGlmIChibG9iKSBmb3JjZURvd25sb2FkKFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYikpO1xuICAgICAgICAgICAgfSlcblxuICB9LmJpbmQodGhpcykpO1xuXG4gIHRoaXMuY29udHJvbEVsLnF1ZXJ5U2VsZWN0b3IoJy5tdXRlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihldikge1xuICAgIHZhciBlbCA9IGV2LnRhcmdldDtcblxuICAgIGlmIChlbC5jbGFzc0xpc3QuY29udGFpbnMoJ2FjdGl2ZScpKSB7XG4gICAgICB0aGlzLmdhaW5Ob2RlLmdhaW4udmFsdWUgPSB0aGlzLmxhc3RHYWluVmFsdWU7XG4gICAgICB0aGlzLmdhaW5FbC52YWx1ZSA9IHRoaXMubGFzdEdhaW5WYWx1ZTtcbiAgICAgIGVsLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmxhc3RHYWluVmFsdWUgPSB0aGlzLmdhaW5Ob2RlLmdhaW4udmFsdWU7XG4gICAgICB0aGlzLmdhaW5Ob2RlLmdhaW4udmFsdWUgPSAwO1xuICAgICAgdGhpcy5nYWluRWwudmFsdWUgPSAwO1xuICAgICAgZWwuY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG4gICAgfVxuICB9LmJpbmQodGhpcykpO1xuXG4gIHRoaXMuY29udHJvbEVsLnF1ZXJ5U2VsZWN0b3IoJy5lZGl0JykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihldikge1xuICAgIHZhciBlbCA9IGV2LnRhcmdldDtcbiAgICBpZiAoZWwuY2xhc3NMaXN0LmNvbnRhaW5zKCdhY3RpdmUnKSkge1xuICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG4gICAgICB0aGlzLnNlbGVjdGluZyA9IGZhbHNlO1xuICAgICAgdGhpcy5zZWxlY3Rpb24uc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICB9IGVsc2Uge1xuICAgICAgZWwuY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG4gICAgICB0aGlzLnNlbGVjdGluZyA9IHRydWU7XG4gICAgICB0aGlzLnNlbGVjdGlvbi5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcbiAgICB9XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgdGhpcy5jb250cm9sRWwucXVlcnlTZWxlY3RvcignLmNvbGxhcHNlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihldikge1xuICAgIHZhciBlbCA9IGV2LnRhcmdldDtcbiAgICBpZiAoZWwuY2xhc3NMaXN0LmNvbnRhaW5zKCdhY3RpdmUnKSkge1xuICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG4gICAgICB0aGlzLnRyYWNrRWwuY2xhc3NMaXN0LmFkZCgnY29sbGFwc2VkJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsLmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpXG4gICAgICB0aGlzLnRyYWNrRWwuY2xhc3NMaXN0LnJlbW92ZSgnY29sbGFwc2VkJyk7XG4gICAgfVxuICB9LmJpbmQodGhpcykpO1xuXG4gIGZ1bmN0aW9uIHBsYXlMaXN0ZW4gKGV2KSB7XG4gICAgaWYgKHRoaXMuYWN0aXZlKSB0aGlzLnBsYXkoKTtcbiAgfVxuXG4gIHRoaXMuZW1pdHRlci5vbigndHJhY2tzOnBsYXknLCBwbGF5TGlzdGVuLmJpbmQodGhpcykpO1xuXG4gIGZ1bmN0aW9uIHBhdXNlTGlzdGVuKGV2KSB7XG4gICAgaWYgKHRoaXMuYWN0aXZlKSB0aGlzLnBhdXNlKCk7XG4gIH1cblxuICB0aGlzLmVtaXR0ZXIub24oJ3RyYWNrczpwYXVzZScsIHBhdXNlTGlzdGVuLmJpbmQodGhpcykpO1xuXG4gIGZ1bmN0aW9uIHN0b3BMaXN0ZW4oZXYpIHtcbiAgICBpZiAodGhpcy5hY3RpdmUpIHtcbiAgICAgIHRoaXMuc3RvcCgpO1xuICAgICAgdGhpcy5yZXNldFByb2dyZXNzKCk7XG4gICAgfVxuICB9XG5cbiAgdGhpcy5lbWl0dGVyLm9uKCd0cmFja3M6c3RvcCcsIHN0b3BMaXN0ZW4uYmluZCh0aGlzKSk7XG5cbiAgdGhpcy5jb250cm9sRWwucXVlcnlTZWxlY3RvcignLnJlbW92ZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZXYpIHtcbiAgICB0aGlzLnN0b3AoKTtcbiAgICB0aGlzLmNvbnRyb2xFbC5yZW1vdmUoKTtcbiAgICB0aGlzLnRyYWNrRWwucmVtb3ZlKCk7XG4gICAgdGhpcy5lbWl0dGVyLmVtaXQoJ3RyYWNrczpyZW1vdmUnLCB7aWQ6IHRoaXMuaWR9KTtcbiAgICB0aGlzLmVtaXR0ZXIgPSBudWxsO1xuICB9LmJpbmQodGhpcykpO1xufVxuXG5UcmFjay5wcm90b3R5cGUgPSB7XG4gIHVwZGF0ZVNlbGVjdGlvbjogZnVuY3Rpb24oZXYpIHtcbiAgICBpZiAoIXRoaXMubW92aW5nIHx8ICF0aGlzLnNlbGVjdGluZykgcmV0dXJuO1xuICAgIHZhciBsZWZ0UG9zaXRpb24gPSB0aGlzLmdldFBvc2l0aW9uRnJvbUN1cnNvcigpO1xuICAgIHZhciByaWdodFBvc2l0aW9uID0gdGhpcy5wb3NpdGlvbkZyb21DbGljayhldik7XG4gICAgdmFyIGRpZmYgPSByaWdodFBvc2l0aW9uIC0gbGVmdFBvc2l0aW9uO1xuXG4gICAgaWYgKGRpZmYgPD0gMCkge1xuICAgICAgZGlmZiA9IGxlZnRQb3NpdGlvbiAtIHJpZ2h0UG9zaXRpb247XG4gICAgICB0aGlzLmN1cnNvci5zdHlsZS5sZWZ0ID0gcmlnaHRQb3NpdGlvbiArICdweCc7XG4gICAgICB0aGlzLnNlbGVjdGlvbi5zdHlsZS5sZWZ0ID0gcmlnaHRQb3NpdGlvbiArICdweCc7XG4gICAgfVxuXG4gICAgdGhpcy5zZWxlY3Rpb24uc3R5bGUud2lkdGggPSBkaWZmICsncHgnO1xuICB9LFxuICBzdGFydFNlbGVjdGlvbjogZnVuY3Rpb24oZXYpIHtcbiAgICBpZiAodGhpcy5wbGF5aW5nKSByZXR1cm47XG4gICAgaWYgKCF0aGlzLm1vdmluZykge1xuICAgICAgdmFyIGxlZnRQb3NpdGlvbiA9IHRoaXMucG9zaXRpb25Gcm9tQ2xpY2soZXYpO1xuICAgICAgaWYgKHRoaXMuc2VsZWN0aW5nKSB7XG4gICAgICAgIHRoaXMuc2VsZWN0aW9uLnN0eWxlLmxlZnQgPSBsZWZ0UG9zaXRpb24gKyAncHgnO1xuICAgICAgICB0aGlzLnNlbGVjdGlvbi5zdHlsZS53aWR0aCA9IDA7XG4gICAgICAgIHRoaXMubW92aW5nID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5jdXJzb3Iuc3R5bGUubGVmdCA9IGxlZnRQb3NpdGlvbiArICdweCc7XG4gICAgfVxuICB9LFxuICBpbml0U2VsZWN0aW9uOiBmdW5jdGlvbihldikge1xuICAgIGlmICh0aGlzLnBsYXlpbmcpIHJldHVybjtcbiAgICB0aGlzLmN1cnNvci5zdHlsZS5sZWZ0ID0gdGhpcy5wb3NpdGlvbkZyb21DbGljayhldikrXCJweFwiO1xuICB9LFxuICBwbGF5OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmxhc3RQbGF5ID0gdGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lO1xuICAgIHRoaXMucGxheVRyYWNrKHRoaXMuc3RhcnRPZmZzZXQgJSB0aGlzLmF1ZGlvc291cmNlLmJ1ZmZlci5kdXJhdGlvbik7XG4gICAgdGhpcy5zZXRDdXJzb3JWaWV3SW50ZXJ2YWwoKTtcbiAgfSxcbiAgc2V0Q3Vyc29yVmlld0ludGVydmFsOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5jdXJzb3JWaWV3SW50ZXJ2YWwpIHtcbiAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5jdXJzb3JWaWV3SW50ZXJ2YWwpO1xuICAgIH1cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5jdXJzb3JWaWV3SW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi5jdXJzb3Iuc2Nyb2xsSW50b1ZpZXdJZk5lZWRlZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgMjAwKTtcbiAgfSxcbiAgcG9zaXRpb25Gcm9tQ2xpY2s6IGZ1bmN0aW9uKGV2KSB7XG4gICAgdmFyIHggPSBldi5vZmZzZXRYIHx8IGV2LmxheWVyWDtcbiAgICByZXR1cm4geCArIDIxO1xuICB9LFxuICBnZXRQb3NpdGlvbkZyb21DdXJzb3I6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBwYXJzZUZsb2F0KHRoaXMuY3Vyc29yLnN0eWxlLmxlZnQucmVwbGFjZSgncHgnLCAnJykpO1xuICB9LFxuICBnZXRUaW1lRnJvbVBvc2l0aW9uOiBmdW5jdGlvbihwb3NpdGlvbikge1xuICAgIHJldHVybiAocG9zaXRpb24gLyAxMDApICogNTtcbiAgfSxcbiAgc3RvcDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5wbGF5aW5nID0gZmFsc2U7XG4gICAgdGhpcy5zdGFydE9mZnNldCA9IDA7XG4gICAgdGhpcy5sYXN0UGxheSA9IDA7XG4gICAgY2xlYXJJbnRlcnZhbCh0aGlzLmN1cnNvclZpZXdJbnRlcnZhbCk7XG4gICAgaWYgKHRoaXMuYXVkaW9zb3VyY2Uuc291cmNlKSB0aGlzLmF1ZGlvc291cmNlLnN0b3AoKTtcbiAgfSxcbiAgcmVzZXRQcm9ncmVzczogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5wcm9ncmVzc1dhdmUuc3R5bGUud2lkdGggPSBcIjBweFwiO1xuICAgIHRoaXMuY3Vyc29yLnN0eWxlLmxlZnQgPSBcIjBweFwiO1xuICB9LFxuICBwYXVzZTogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5hdWRpb3NvdXJjZS5zdG9wKCk7XG4gICAgdGhpcy5zdGFydE9mZnNldCArPSB0aGlzLmNvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLmxhc3RQbGF5O1xuICAgIHRoaXMucGxheWluZyA9IGZhbHNlO1xuICB9LFxuICBza2lwRm9yd2FyZDogZnVuY3Rpb24oKSB7fSxcbiAgc2tpcEJhY2t3YXJkOiBmdW5jdGlvbigpIHt9LFxuICBwbGF5VHJhY2s6IGZ1bmN0aW9uKG9mZnNldCwgc3RvcE9mZnNldCkge1xuICAgIGlmICh0aGlzLnBsYXlpbmcpIHRoaXMuYXVkaW9zb3VyY2Uuc3RvcCgpO1xuICAgIHRoaXMuYXVkaW9zb3VyY2UucGxheSgwLCBvZmZzZXQpO1xuICAgIHRoaXMuYXVkaW9zb3VyY2UucGxheSgwLCBvZmZzZXQpO1xuICAgIHRoaXMucGxheWluZyA9IHRydWU7XG4gICAgcmFmKHRoaXMudHJpZ2dlclBsYXlpbmcuYmluZCh0aGlzKSk7XG4gIH0sXG4gIHVwZGF0ZVZpc3VhbFByb2dyZXNzOiBmdW5jdGlvbiAocG9zKSB7XG4gICAgdGhpcy5wcm9ncmVzc1dhdmUuc3R5bGUud2lkdGggPSBwb3MrXCJweFwiO1xuICAgIHRoaXMuY3Vyc29yLnN0eWxlLmxlZnQgPSAoMjErcG9zKStcInB4XCI7IC8vIDIxIGlzIHRoZSBwYWRkaW5nLWxlZnQgZnJvbSBiZWdpbm5pbmcgb2YgdHJhY2sgZWxlbWVudFxuICB9LFxuICB0cmlnZ2VyUGxheWluZzogZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLnBsYXlpbmcpIHJldHVybjtcblxuICAgIHZhciBkdXIgPSB0aGlzLmF1ZGlvc291cmNlLmJ1ZmZlci5kdXJhdGlvbjtcbiAgICB2YXIgY3VycmVudFRpbWUgPSB0aGlzLmNvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLmxhc3RQbGF5ICsgdGhpcy5zdGFydE9mZnNldDtcbiAgICB2YXIgcmVtYWluaW5nVGltZSA9IGR1ciAtIGN1cnJlbnRUaW1lO1xuXG4gICAgLy8gdGhpcyBpcyB0aGUgc2FtZSB3YXkgd2UgYXJlIGNhY3VsYXRpbmcgdGhlIHdpZHRoIG9mIHRoZSB3YXZlc1xuICAgIC8vIHRvIG1hdGNoIHVwIHRvIHRoZSB0aW1lbGluZVxuICAgIHRoaXMudXBkYXRlVmlzdWFsUHJvZ3Jlc3MoKChjdXJyZW50VGltZSkgLyA1KSAqIDEwMCk7XG5cbiAgICB0aGlzLmN1cnJlbnRUaW1lRWwudGV4dENvbnRlbnQgPSBmb3JtYXRUaW1lKGN1cnJlbnRUaW1lLCB0cnVlKTtcbiAgICB0aGlzLnJlbWFpbmluZ0VsLnRleHRDb250ZW50ID0gZm9ybWF0VGltZShyZW1haW5pbmdUaW1lLCB0cnVlKTtcblxuICAgIGlmIChyZW1haW5pbmdUaW1lIDw9IDApIHtcbiAgICAgIHRoaXMucGxheWluZyA9ICF0aGlzLnBsYXlpbmc7XG4gICAgICBjbGVhckludGVydmFsKHRoaXMuY3Vyc29yVmlld0ludGVydmFsKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmFmKHRoaXMudHJpZ2dlclBsYXlpbmcuYmluZCh0aGlzKSk7XG4gIH0sXG4gIGN1cnJlbnRUaW1lVG9QZXJjZW50OiBmdW5jdGlvbiAoY3VycmVudFRpbWUpIHtcbiAgICB2YXIgZHVyID0gdGhpcy5hdWRpb3NvdXJjZS5idWZmZXIuZHVyYXRpb247XG4gICAgdmFyIGN1ciA9IChjdXJyZW50VGltZSAtIHRoaXMubGFzdFBsYXkgKyB0aGlzLnN0YXJ0T2Zmc2V0ICUgNjApICogMTA7XG4gICAgcmV0dXJuICgoY3VyIC8gZHVyKSAqIDEwKS50b0ZpeGVkKDMpO1xuICB9LFxuICByZXNldFZpc3VhbDogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGN0eCA9IHRoaXMud2F2ZS5nZXRDb250ZXh0KCcyZCcpO1xuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy53YXZlLndpZHRoLCB0aGlzLndhdmUuaGVpZ2h0KTtcbiAgICBjdHggPSB0aGlzLnByb2dyZXNzV2F2ZS5xdWVyeVNlbGVjdG9yKCdjYW52YXMnKS5nZXRDb250ZXh0KCcyZCcpO1xuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgdGhpcy53YXZlLndpZHRoLCB0aGlzLndhdmUuaGVpZ2h0KTtcbiAgfSxcbiAgbG9hZFdpdGhBdWRpb0J1ZmZlcjogZnVuY3Rpb24oYXVkaW9CdWZmZXIpIHtcbiAgICB0aGlzLmdhaW5Ob2RlID0gdGhpcy5jb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICB0aGlzLmF1ZGlvc291cmNlID0gbmV3IEF1ZGlvU291cmNlKHRoaXMuY29udGV4dCwge1xuICAgICAgZ2Fpbk5vZGU6IHRoaXMuZ2Fpbk5vZGVcbiAgICB9KTtcbiAgICB0aGlzLmRyYXdXYXZlcygpO1xuICB9LFxuICBsb2FkVVJMOiBmdW5jdGlvbiAodXJsKSB7XG4gICAgdGhpcy5maWxlSW5kaWNhdG9yLnRleHRDb250ZW50ID0gJ2xvYWRpbmcgZmlsZSBmcm9tIHVybC4uLic7XG5cbiAgICB2YXIgcmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgcmVxLm9wZW4oJ0dFVCcsIHVybCwgdHJ1ZSk7XG4gICAgcmVxLnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJlcS5vbmxvYWRlbmQgPSBmdW5jdGlvbihldikge1xuICAgICAgc2VsZi5maWxlSW5kaWNhdG9yLnRleHRDb250ZW50ID0gJ2RlY29kaW5nIGF1ZGlvIGRhdGEuLi4nO1xuXG4gICAgICBzZWxmLmNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKHJlcS5yZXNwb25zZSwgZnVuY3Rpb24oYnVmKSB7XG4gICAgICAgIHNlbGYuZmlsZUluZGljYXRvci50ZXh0Q29udGVudCA9ICdyZW5kZXJpbmcgd2F2ZS4uLic7XG5cbiAgICAgICAgc2VsZi5nYWluTm9kZSA9IHNlbGYuY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgIHNlbGYuYXVkaW9zb3VyY2UgPSBuZXcgQXVkaW9Tb3VyY2Uoc2VsZi5jb250ZXh0LCB7XG4gICAgICAgICAgZ2Fpbk5vZGU6IHNlbGYuZ2Fpbk5vZGVcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2VsZi5kdXJhdGlvbkVsLnRleHRDb250ZW50ID0gZm9ybWF0VGltZShidWYuZHVyYXRpb24sIHRydWUpO1xuICAgICAgICBzZWxmLnJlbWFpbmluZ0VsLnRleHRDb250ZW50ID0gZm9ybWF0VGltZShidWYuZHVyYXRpb24sIHRydWUpO1xuXG4gICAgICAgIHNlbGYuYXVkaW9zb3VyY2UuYnVmZmVyID0gYnVmO1xuXG4gICAgICAgIHNlbGYuYWRqdXN0V2F2ZSgpO1xuICAgICAgICBkcmF3QnVmZmVyKHNlbGYud2F2ZSwgYnVmLCAnIzUyRjZBNCcpO1xuICAgICAgICBkcmF3QnVmZmVyKHNlbGYucHJvZ3Jlc3NXYXZlLnF1ZXJ5U2VsZWN0b3IoJ2NhbnZhcycpLCBidWYsICcjRjQ0NUYwJyk7XG4gICAgICAgIHNlbGYuZmlsZUluZGljYXRvci5yZW1vdmUoKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXEuc2VuZCgpO1xuICB9LFxuICBsb2FkRmlsZTogZnVuY3Rpb24gKGZpbGUpIHtcbiAgICB0aGlzLmZpbGVJbmRpY2F0b3IudGV4dENvbnRlbnQgPSAnbG9hZGluZyBmaWxlLi4uJztcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICByZWFkZXIub25sb2FkZW5kID0gZnVuY3Rpb24oZXYpIHtcbiAgICAgIHNlbGYuZmlsZUluZGljYXRvci50ZXh0Q29udGVudCA9ICdkZWNvZGluZyBhdWRpbyBkYXRhLi4uJztcblxuICAgICAgc2VsZi5jb250ZXh0LmRlY29kZUF1ZGlvRGF0YShldi50YXJnZXQucmVzdWx0LCBmdW5jdGlvbihidWYpIHtcbiAgICAgICAgc2VsZi5maWxlSW5kaWNhdG9yLnRleHRDb250ZW50ID0gJ3JlbmRlcmluZyB3YXZlLi4uJztcblxuICAgICAgICBzZWxmLmdhaW5Ob2RlID0gc2VsZi5jb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgc2VsZi5hdWRpb3NvdXJjZSA9IG5ldyBBdWRpb1NvdXJjZShzZWxmLmNvbnRleHQsIHtcbiAgICAgICAgICBnYWluTm9kZTogc2VsZi5nYWluTm9kZVxuICAgICAgICB9KTtcblxuICAgICAgICBzZWxmLmR1cmF0aW9uRWwudGV4dENvbnRlbnQgPSBmb3JtYXRUaW1lKGJ1Zi5kdXJhdGlvbiwgdHJ1ZSk7XG4gICAgICAgIHNlbGYucmVtYWluaW5nRWwudGV4dENvbnRlbnQgPSBmb3JtYXRUaW1lKGJ1Zi5kdXJhdGlvbiwgdHJ1ZSk7XG5cbiAgICAgICAgc2VsZi5hdWRpb3NvdXJjZS5idWZmZXIgPSBidWY7XG5cbiAgICAgICAgc2VsZi5hZGp1c3RXYXZlKCk7XG4gICAgICAgIGRyYXdCdWZmZXIoc2VsZi53YXZlLCBidWYsICcjNTJGNkE0Jyk7XG4gICAgICAgIGRyYXdCdWZmZXIoc2VsZi5wcm9ncmVzc1dhdmUucXVlcnlTZWxlY3RvcignY2FudmFzJyksIGJ1ZiwgJyNGNDQ1RjAnKTtcbiAgICAgICAgc2VsZi5maWxlSW5kaWNhdG9yLnJlbW92ZSgpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihmaWxlKTtcbiAgfSxcbiAgdXBkYXRlVGltZWxpbmU6IGZ1bmN0aW9uKCkge1xuICAgIHRpbWVsaW5lTWFuYWdlLnVwZGF0ZSh0aGlzLmF1ZGlvc291cmNlLmJ1ZmZlci5kdXJhdGlvbik7XG4gIH0sXG4gIGFkanVzdFdhdmU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudXBkYXRlVGltZWxpbmUoKTtcbiAgICAvLyBhZGp1c3QgdGhlIGNhbnZhcyBhbmQgY29udGFpbmVycyB0byBmaXQgd2l0aCB0aGUgYnVmZmVyIGR1cmF0aW9uXG4gICAgdmFyIHcgPSAodGhpcy5hdWRpb3NvdXJjZS5idWZmZXIuZHVyYXRpb24gLyA1KSAqIDEwMDtcbiAgICB0aGlzLnRyYWNrRWwuc3R5bGUud2lkdGggPSB3ICs1MCsncHgnO1xuICAgIHRoaXMud2F2ZS53aWR0aCA9IHc7XG4gICAgdGhpcy5wcm9ncmVzc1dhdmUucXVlcnlTZWxlY3RvcignY2FudmFzJykud2lkdGggPSB3O1xuICB9LFxuICBkcmF3V2F2ZXM6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudXBkYXRlVGltZWxpbmUoKTtcbiAgICB2YXIgcHJldkxlZnQgPSAwO1xuICAgIGlmICh0aGlzLmN1cnNvci5zdHlsZS5sZWZ0KSB7XG4gICAgICBwcmV2TGVmdCA9IHBhcnNlRmxvYXQodGhpcy5jdXJzb3Iuc3R5bGUubGVmdC5yZXBsYWNlKCdweCcsICcnKSk7XG4gICAgfVxuICAgIHRoaXMucmVzZXRWaXN1YWwoKTtcbiAgICBkcmF3QnVmZmVyKHRoaXMud2F2ZSwgdGhpcy5hdWRpb3NvdXJjZS5idWZmZXIsICcjNTJGNkE0Jyk7XG4gICAgZHJhd0J1ZmZlcih0aGlzLnByb2dyZXNzV2F2ZS5xdWVyeVNlbGVjdG9yKCdjYW52YXMnKSwgdGhpcy5hdWRpb3NvdXJjZS5idWZmZXIsICcjRjQ0NUYwJyk7XG4gICAgY29sb3JzLmVuZCgpO1xuICAgIGNvbnNvbGUubG9nKCd3YXZlcyB1cGRhdGVkLicpXG4gIH1cbn0iLCJ2YXIgZHJhZ0Ryb3AgPSByZXF1aXJlKCdkcmFnLWRyb3AnKTtcbnZhciBBdWRpb0NvbnRleHQgPSByZXF1aXJlKCdhdWRpb2NvbnRleHQnKTtcbnZhciBBdWRpb1NvdXJjZSA9IHJlcXVpcmUoJ2F1ZGlvc291cmNlJyk7XG52YXIgRkZUID0gcmVxdWlyZSgnYXVkaW8tZmZ0Jyk7XG5cbnZhciBlZGl0b3IgPSByZXF1aXJlKCcuL2xpYi9lZGl0cycpO1xudmFyIHJlY29yZGVyID0gcmVxdWlyZSgnLi9saWIvcmVjb3JkJyk7XG52YXIgVHJhY2sgPSByZXF1aXJlKCcuL2xpYi90cmFjaycpO1xuXG52YXIgdHJhY2tUbXAgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvdHJhY2stdG1wJyk7XG52YXIgY29udHJvbFRtcCA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9jb250cm9sLXRtcCcpO1xuXG52YXIgYXVkaW9Db250ZXh0ID0gbmV3IEF1ZGlvQ29udGV4dCgpO1xudmFyIHVuaXFJZCA9IGZ1bmN0aW9uKCkge3JldHVybiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDE2KS5zbGljZSgyKTt9O1xuXG52YXIgZHJhd2VyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmRyYXdlcicpO1xudmFyIGZmdCA9IG5ldyBGRlQoYXVkaW9Db250ZXh0LCB7Y2FudmFzOiBkcmF3ZXIucXVlcnlTZWxlY3RvcignI2ZmdCcpfSk7XG5cbnZhciBjb250cm9sU3BhY2VFbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5jb250cm9sLXNwYWNlJyk7XG52YXIgdHJhY2tTcGFjZUVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnRyYWNrLXNwYWNlJyk7XG5cbnZhciBtZXJnZUJ1ZmZlcnMgPSByZXF1aXJlKCdtZXJnZS1hdWRpby1idWZmZXJzJyk7XG52YXIgZW5jb2RlciA9IHJlcXVpcmUoJ2VuY29kZS13YXYnKTtcblxudmFyIG1lcmdlQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm1lcmdlJyk7XG5cbi8vIGNvbnRyb2xzXG52YXIgd2VsY29tZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy53ZWxjb21lJyk7XG52YXIgd2VsY29tZUltcG9ydEJ0biA9IHdlbGNvbWUucXVlcnlTZWxlY3RvcignLmltcG9ydCcpO1xudmFyIHdlbGNvbWVSZWNvcmRCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcucmVjb3JkJyk7XG52YXIgaW1wb3J0QnRuID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmltcG9ydCcpO1xudmFyIGltcG9ydElucHV0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2ltcG9ydCcpO1xudmFyIHBsYXlCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcGxheScpO1xudmFyIHBhdXNlQnRuID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3BhdXNlJyk7XG52YXIgc3RvcEJ0biA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzdG9wJyk7XG52YXIgY3V0QnRuID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2N1dCcpO1xudmFyIGNvcHlCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjY29weScpO1xudmFyIHBhc3RlQnRuID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3Bhc3RlJyk7XG52YXIgcHJlcGVuZEJ0biA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNwcmVwZW5kJyk7XG52YXIgYXBwZW5kQnRuID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2FwcGVuZCcpO1xudmFyIGR1cGxpY2F0ZUJ0biA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNkdXBsaWNhdGUnKTtcbnZhciByZXZlcnNlQnRuID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3JldmVyc2UnKTtcbnZhciByZWNvcmRCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcmVjb3JkJyk7XG52YXIgdHJhY2tzID0ge307XG5cbnZhciByZWNvcmRpbmcgPSBmYWxzZTtcblxubWVyZ2VCdXR0b24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgdmFyIGZ1bGxUcmFja3MgPSBbXTtcblxuICBPYmplY3Qua2V5cyh0cmFja3MpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgZnVsbFRyYWNrcy5wdXNoKHRyYWNrc1trZXldLmF1ZGlvc291cmNlLmJ1ZmZlcik7XG4gIH0pO1xuXG4gIHZhciBtZXJnZWQgPSBtZXJnZUJ1ZmZlcnMoZnVsbFRyYWNrcywgYXVkaW9Db250ZXh0KTtcbiAgbmV3VHJhY2tGcm9tQXVkaW9CdWZmZXIobWVyZ2VkKTtcbiAgZW5jb2Rlci5lbmNvZGVXQVYoW21lcmdlZC5nZXRDaGFubmVsRGF0YSgwKSwgbWVyZ2VkLmdldENoYW5uZWxEYXRhKDEpXSxcbiAgICAgICAgICAgIG1lcmdlZC5zYW1wbGVSYXRlLFxuICAgICAgICAgICAgZnVuY3Rpb24oYmxvYikge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnd2F2IGVuY29kaW5nIGNvbXBsZXRlOiAnLCBibG9iICk7XG4gICAgICAgICAgICAgIGlmIChibG9iKSB7XG4gICAgICAgICAgICAgICAgdmFyIHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gICAgICAgICAgICAgICAgdmFyIGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcbiAgICAgICAgICAgICAgICB2YXIgYXUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhdWRpbycpO1xuICAgICAgICAgICAgICAgIHZhciBoZiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcblxuICAgICAgICAgICAgICAgIGF1LmNvbnRyb2xzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBhdS5zcmMgPSB1cmw7XG4gICAgICAgICAgICAgICAgaGYuaHJlZiA9IHVybDtcbiAgICAgICAgICAgICAgICBoZi5kb3dubG9hZCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSArICcud2F2JztcbiAgICAgICAgICAgICAgICBoZi5pbm5lckhUTUwgPSBoZi5kb3dubG9hZDtcbiAgICAgICAgICAgICAgICBsaS5hcHBlbmRDaGlsZChhdSk7XG4gICAgICAgICAgICAgICAgbGkuYXBwZW5kQ2hpbGQoaGYpO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobGkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxufSlcblxucmVjb3JkQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gIGlmICghcmVjb3JkaW5nKSB7XG4gICAgcmVjb3JkZXIuc3RhcnQoYXVkaW9Db250ZXh0LCBmZnQpO1xuICAgIHJlY29yZEJ0bi5pbm5lclRleHQgPSAnc3RvcCByZWNvcmRpbmcnO1xuICAgIGRyYXdlci5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtcbiAgICByZWNvcmRpbmcgPSB0cnVlO1xuICB9IGVsc2Uge1xuICAgIGRyYXdlci5jbGFzc0xpc3QucmVtb3ZlKCdhY3RpdmUnKTtcbiAgICByZWNvcmRCdG4uaW5uZXJUZXh0ID0gJ3JlY29yZCc7XG4gICAgcmVjb3JkZXIuc3RvcChmdW5jdGlvbihibG9iKSB7XG4gICAgICAgICAgICAgICBuZXdUcmFja0Zyb21VUkwoVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKSk7XG4gICAgICAgICAgICAgfSk7XG4gICAgcmVjb3JkaW5nID0gZmFsc2U7XG4gIH1cbn0pXG5cbmRyYWdEcm9wKCdib2R5JywgZnVuY3Rpb24gKGZpbGVzKSB7XG4gIHdlbGNvbWUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgbmV3VHJhY2tGcm9tRmlsZShmaWxlc1swXSk7XG59KTtcblxud2VsY29tZUltcG9ydEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjaW1wb3J0JykuY2xpY2soKTtcbn0pXG5cbndlbGNvbWVSZWNvcmRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgd2VsY29tZVJlY29yZEJ0bi5xdWVyeVNlbGVjdG9yKCdoNCcpLmlubmVyVGV4dCA9ICdzdG9wIHJlY29yZGluZyc7XG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNyZWNvcmQnKS5jbGljaygpO1xufSlcblxuaW1wb3J0QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNpbXBvcnQnKS5jbGljaygpO1xufSlcblxuaW1wb3J0SW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlJywgZnVuY3Rpb24oZXYpIHtcbiAgbmV3VHJhY2tGcm9tRmlsZShldi50YXJnZXQuZmlsZXNbMF0pO1xuICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjaW1wb3J0JykudmFsdWUgPSAnJztcbn0pO1xuXG5wbGF5QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gIE9iamVjdC5rZXlzKHRyYWNrcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICB0cmFja3Nba2V5XS5lbWl0dGVyLmVtaXQoJ3RyYWNrczpwbGF5Jywge30pO1xuICB9KTtcbn0pO1xuXG5wYXVzZUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICBPYmplY3Qua2V5cyh0cmFja3MpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgdHJhY2tzW2tleV0uZW1pdHRlci5lbWl0KCd0cmFja3M6cGF1c2UnLCB7fSk7XG4gIH0pO1xufSk7XG5cbnN0b3BCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgT2JqZWN0LmtleXModHJhY2tzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIHRyYWNrc1trZXldLmVtaXR0ZXIuZW1pdCgndHJhY2tzOnN0b3AnLCB7fSk7XG4gIH0pO1xufSk7XG5cbmZ1bmN0aW9uIHNob3dQYXN0ZUN1cnNvcnMoKSB7XG4gIHZhciBzZWxlY3Rpb25zID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnNlbGVjdGlvbicpO1xuICBmb3IgKHZhciBpPTA7IGkgPCBzZWxlY3Rpb25zOyBpKyspIHtcbiAgICBzZWxlY3Rpb25zW2ldLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gIH1cbiAgdmFyIHBhc3RlQ3Vyc29ycyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5wYXN0ZS1jdXJzb3InKTtcbiAgZm9yICh2YXIgaT0wOyBpIDwgcGFzdGVDdXJzb3JzOyBpKyspIHtcbiAgICBwYXN0ZUN1cnNvcnNbaV0uc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG4gIH1cbn1cblxuZnVuY3Rpb24gaGlkZVBhc3RlQ3Vyc29ycygpIHtcbiAgdmFyIHNlbGVjdGlvbnMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuc2VsZWN0aW9uJyk7XG4gIGZvciAodmFyIGk9MDsgaSA8IHNlbGVjdGlvbnM7IGkrKykge1xuICAgIHNlbGVjdGlvbnNbaV0uc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG4gIH1cbiAgdmFyIHBhc3RlQ3Vyc29ycyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5wYXN0ZS1jdXJzb3InKTtcbiAgZm9yICh2YXIgaT0wOyBpIDwgcGFzdGVDdXJzb3JzOyBpKyspIHtcbiAgICBwYXN0ZUN1cnNvcnNbaV0uc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgfVxufVxuXG5mdW5jdGlvbiBlbmFibGVQbGF5YmFja09wdHMoKSB7XG4gIHBsYXlCdG4uZGlzYWJsZWQgPSBmYWxzZTtcbiAgY29weUJ0bi5kaXNhYmxlZCA9IGZhbHNlO1xuICBjdXRCdG4uZGlzYWJsZWQgPSBmYWxzZTtcbiAgc3RvcEJ0bi5kaXNhYmxlZCA9IGZhbHNlO1xuICBwYXVzZUJ0bi5kaXNhYmxlZCA9IGZhbHNlO1xuICByZXZlcnNlQnRuLmRpc2FibGVkID0gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGVuYWJsZUNsaXBib2FyZE9wdHMoKSB7XG4gIHByZXBlbmRCdG4uZGlzYWJsZWQgPSBmYWxzZTtcbiAgYXBwZW5kQnRuLmRpc2FibGVkID0gZmFsc2U7XG4gIHBhc3RlQnRuLmRpc2FibGVkID0gZmFsc2U7XG4gIGR1cGxpY2F0ZUJ0bi5kaXNhYmxlZCA9IGZhbHNlO1xufVxuXG5jb3B5QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gIHZhciBhY3RpdmVUcmFjayA9IGdldEFjdGl2ZVRyYWNrKCk7XG4gIGlmICghYWN0aXZlVHJhY2spIHJldHVybjtcblxuICB2YXIgb25Db21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIGNvbnNvbGUubG9nKCdjb3B5IGJ1ZmZlciBjb21wbGV0ZTogJywgYWN0aXZlVHJhY2suY2xpcGJvYXJkLmJ1ZmZlcik7XG4gIH07XG5cbiAgc2hvd1Bhc3RlQ3Vyc29ycygpO1xuICBlbmFibGVDbGlwYm9hcmRPcHRzKCk7XG4gIGVkaXRvci5jb3B5KGF1ZGlvQ29udGV4dCwgYWN0aXZlVHJhY2suY2xpcGJvYXJkLCBhY3RpdmVUcmFjay5hdWRpb3NvdXJjZS5idWZmZXIsIG9uQ29tcGxldGUpO1xufSk7XG5cbmN1dEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICB2YXIgYWN0aXZlVHJhY2sgPSBnZXRBY3RpdmVUcmFjaygpO1xuICBpZiAoIWFjdGl2ZVRyYWNrKSByZXR1cm47XG5cbiAgdmFyIG9uQ29tcGxldGUgPSBmdW5jdGlvbihidWYpIHtcbiAgICBhY3RpdmVUcmFjay5hdWRpb3NvdXJjZS5idWZmZXIgPSBidWY7XG4gICAgYWN0aXZlVHJhY2suZHJhd1dhdmVzKCk7XG4gIH07XG5cbiAgYWN0aXZlVHJhY2suY2xpcGJvYXJkLnN0YXJ0ID0gYWN0aXZlVHJhY2suY2xpcGJvYXJkLnN0YXJ0ICsgYWN0aXZlVHJhY2subGFzdFBsYXk7XG4gIGFjdGl2ZVRyYWNrLmNsaXBib2FyZC5lbmQgPSBhY3RpdmVUcmFjay5jbGlwYm9hcmQuZW5kICsgYWN0aXZlVHJhY2subGFzdFBsYXk7XG5cbiAgc2hvd1Bhc3RlQ3Vyc29ycygpO1xuICBlbmFibGVDbGlwYm9hcmRPcHRzKCk7XG4gIGVkaXRvci5jdXQoYXVkaW9Db250ZXh0LCBhY3RpdmVUcmFjay5jbGlwYm9hcmQsIGFjdGl2ZVRyYWNrLmF1ZGlvc291cmNlLmJ1ZmZlciwgb25Db21wbGV0ZSk7XG59KTtcblxucGFzdGVCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgdmFyIGFjdGl2ZVRyYWNrID0gZ2V0QWN0aXZlVHJhY2soKTtcbiAgaWYgKCFhY3RpdmVUcmFjaykgcmV0dXJuO1xuICB2YXIgb25Db21wbGV0ZSA9IGZ1bmN0aW9uKGJ1Zikge1xuICAgIGFjdGl2ZVRyYWNrLmF1ZGlvc291cmNlLmJ1ZmZlciA9IGJ1ZjtcbiAgICBjb25zb2xlLmxvZygnY2IgY2FsbGVkIHBhc3RlJyk7XG4gICAgYWN0aXZlVHJhY2suZHJhd1dhdmVzKCk7XG4gIH07XG5cbiAgZWRpdG9yLnBhc3RlKGF1ZGlvQ29udGV4dCwgYWN0aXZlVHJhY2suY2xpcGJvYXJkLCBhY3RpdmVUcmFjay5hdWRpb3NvdXJjZS5idWZmZXIsIGFjdGl2ZVRyYWNrLmNsaXBib2FyZC5hdCwgb25Db21wbGV0ZSk7XG4gIGhpZGVQYXN0ZUN1cnNvcnMoKTtcbn0pO1xuXG5wcmVwZW5kQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gIHZhciBhY3RpdmVUcmFjayA9IGdldEFjdGl2ZVRyYWNrKCk7XG4gIGlmICghYWN0aXZlVHJhY2spIHJldHVybjtcbiAgdmFyIG9uQ29tcGxldGUgPSBmdW5jdGlvbihidWYpIHtcbiAgICBhY3RpdmVUcmFjay5hdWRpb3NvdXJjZS5idWZmZXIgPSBidWY7XG4gICAgYWN0aXZlVHJhY2suZHJhd1dhdmVzKCk7XG4gIH07XG5cbiAgZWRpdG9yLnBhc3RlKGF1ZGlvQ29udGV4dCwgYWN0aXZlVHJhY2suY2xpcGJvYXJkLCBhY3RpdmVUcmFjay5hdWRpb3NvdXJjZS5idWZmZXIsIDAsIG9uQ29tcGxldGUpO1xufSk7XG5cbmFwcGVuZEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICB2YXIgYWN0aXZlVHJhY2sgPSBnZXRBY3RpdmVUcmFjaygpO1xuICBpZiAoIWFjdGl2ZVRyYWNrKSByZXR1cm47XG4gIHZhciBvbkNvbXBsZXRlID0gZnVuY3Rpb24oYnVmKSB7XG4gICAgYWN0aXZlVHJhY2suYXVkaW9zb3VyY2UuYnVmZmVyID0gYnVmO1xuICAgIGFjdGl2ZVRyYWNrLmRyYXdXYXZlcygpO1xuICB9O1xuXG4gIGVkaXRvci5wYXN0ZShhdWRpb0NvbnRleHQsIGFjdGl2ZVRyYWNrLmNsaXBib2FyZCwgYWN0aXZlVHJhY2suYXVkaW9zb3VyY2UuYnVmZmVyLCBhY3RpdmVUcmFjay5hdWRpb3NvdXJjZS5idWZmZXIuZHVyYXRpb24sIG9uQ29tcGxldGUpO1xufSk7XG5cbnJldmVyc2VCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgdmFyIGFjdGl2ZVRyYWNrID0gZ2V0QWN0aXZlVHJhY2soKTtcbiAgaWYgKCFhY3RpdmVUcmFjaykgcmV0dXJuO1xuICB2YXIgb25Db21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIGFjdGl2ZVRyYWNrLmRyYXdXYXZlcygpO1xuICB9O1xuXG4gIGVkaXRvci5yZXZlcnNlKGFjdGl2ZVRyYWNrLmF1ZGlvc291cmNlLmJ1ZmZlciwgb25Db21wbGV0ZSk7XG59KTtcblxuZHVwbGljYXRlQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gIHZhciBhY3RpdmVUcmFjayA9IGdldEFjdGl2ZVRyYWNrKCk7XG4gIGlmICghYWN0aXZlVHJhY2spIHJldHVybjtcblxuICB2YXIgb25Db21wbGV0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIGNvbnNvbGUubG9nKCdkdXBsaWNhdGluZyBidWZmZXI6ICcsIGFjdGl2ZVRyYWNrLmNsaXBib2FyZC5idWZmZXIpO1xuICAgIG5ld1RyYWNrRnJvbUF1ZGlvQnVmZmVyKGFjdGl2ZVRyYWNrLmNsaXBib2FyZC5idWZmZXIpO1xuICB9O1xuXG4gIGlmIChhY3RpdmVUcmFjay5jbGlwYm9hcmQuYnVmZmVyKSB7XG4gICAgb25Db21wbGV0ZSgpO1xuICB9IGVsc2UgaWYgKGFjdGl2ZVRyYWNrLmNsaXBib2FyZC5zdGFydCA9PT0gMCAmJiBhY3RpdmVUcmFjay5jbGlwYm9hcmQuZW5kID09PSAwKSB7XG4gICAgYWN0aXZlVHJhY2suY2xpcGJvYXJkLmVuZCA9IGFjdGl2ZVRyYWNrLmF1ZGlvc291cmNlLmJ1ZmZlci5kdXJhdGlvbjtcbiAgICBlZGl0b3IuY29weShhdWRpb0NvbnRleHQsIGFjdGl2ZVRyYWNrLmNsaXBib2FyZCwgYWN0aXZlVHJhY2suYXVkaW9zb3VyY2UuYnVmZmVyLCBvbkNvbXBsZXRlKTtcbiAgfSBlbHNlIHtcbiAgICBlZGl0b3IuY29weShhdWRpb0NvbnRleHQsIGFjdGl2ZVRyYWNrLmNsaXBib2FyZCwgYWN0aXZlVHJhY2suYXVkaW9zb3VyY2UuYnVmZmVyLCBvbkNvbXBsZXRlKTtcbiAgfVxufSk7XG5cbmZ1bmN0aW9uIGdldEFjdGl2ZVRyYWNrKCkge1xuICB2YXIgYWN0aXZlVHJhY2tzID0gW107XG4gIE9iamVjdC5rZXlzKHRyYWNrcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAodHJhY2tzW2tleV0uYWN0aXZlKSBhY3RpdmVUcmFja3MucHVzaCh0cmFja3Nba2V5XSk7XG4gIH0pO1xuXG4gIGlmIChhY3RpdmVUcmFja3MubGVuZ3RoID4gMSkge1xuICAgIGFsZXJ0KCdZb3UgY2Fubm90IGhhdmUgbW9yZSB0aGFuIG9uZSBhY3RpdmF0ZWQgdHJhY2sgZm9yIHRoaXMgb3B0aW9uJyk7XG4gIH0gZWxzZSBpZighYWN0aXZlVHJhY2tzLmxlbmd0aCkge1xuICAgIGFsZXJ0KCdUaGVyZSBpcyBubyBhY3RpdmUgdHJhY2snKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYWN0aXZlVHJhY2tzWzBdO1xuICB9XG59XG5cbmZ1bmN0aW9uIG5ld1RyYWNrRnJvbUF1ZGlvQnVmZmVyKGF1ZGlvQnVmZmVyKSB7XG4gIHdlbGNvbWUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgdmFyIHRyYWNrRWwgPSB0cmFja1RtcCgpO1xuICB2YXIgY29udHJvbEVsID0gY29udHJvbFRtcCh7XG4gICAgdGl0bGU6IFwiUmVjb3JkaW5nIDFcIlxuICB9KTtcbiAgdmFyIGlkID0gdW5pcUlkKCk7XG5cbiAgY29udHJvbFNwYWNlRWwuYXBwZW5kQ2hpbGQoY29udHJvbEVsKTtcbiAgdHJhY2tTcGFjZUVsLmFwcGVuZENoaWxkKHRyYWNrRWwpO1xuXG4gIHRyYWNrc1tpZF0gPSBuZXcgVHJhY2soe1xuICAgIHRpdGxlOiBcIlJlY29yZGluZyAxXCIsXG4gICAgaWQ6IGlkLFxuICAgIHRyYWNrRWw6IHRyYWNrRWwsXG4gICAgY29udHJvbEVsOiBjb250cm9sRWwsXG4gICAgZ2Fpbk5vZGU6IGF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCksXG4gICAgY29udGV4dDogYXVkaW9Db250ZXh0XG4gIH0pO1xuXG4gIHRyYWNrc1tpZF0uYXVkaW9zb3VyY2UgPSBuZXcgQXVkaW9Tb3VyY2UoYXVkaW9Db250ZXh0LCB7XG4gICAgZ2Fpbk5vZGU6IHRyYWNrc1tpZF0uZ2Fpbk5vZGVcbiAgfSk7XG5cbiAgdHJhY2tzW2lkXS5hdWRpb3NvdXJjZS5idWZmZXIgPSBhdWRpb0J1ZmZlcjtcblxuICB0cmFja3NbaWRdLmFkanVzdFdhdmUoKTtcbiAgdHJhY2tzW2lkXS5kcmF3V2F2ZXMoKTtcbiAgdHJhY2tzW2lkXS5maWxlSW5kaWNhdG9yLnJlbW92ZSgpO1xuXG4gIHRyYWNrc1tpZF0uZW1pdHRlci5vbigndHJhY2tzOnJlbW92ZScsIGZ1bmN0aW9uKGV2KSB7XG4gICAgdHJhY2tzW2V2LmlkXSA9IG51bGw7XG4gICAgZGVsZXRlIHRyYWNrc1tldi5pZF07XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoKTtcbiAgICBkcmF3VGltZWxpbmVCeUxvbmdlc3RUcmFjaygpO1xuICAgIHNob3dXZWxjb21lKCk7XG4gIH0pO1xuXG4gIGVuYWJsZVBsYXliYWNrT3B0cygpO1xufVxuXG5mdW5jdGlvbiBkcmF3VGltZWxpbmVCeUxvbmdlc3RUcmFjaygpIHtcbiAgaWYgKCFPYmplY3Qua2V5cyh0cmFja3MpLmxlbmd0aCkgcmV0dXJuO1xuXG4gIHZhciBwcmV2QnVmID0ge1xuICAgIGtleTogJycsXG4gICAgZHVyOiAwXG4gIH07XG4gIE9iamVjdC5rZXlzKHRyYWNrcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICB2YXIgZHVyID0gdHJhY2tzW2tleV0uYXVkaW9zb3VyY2UuYnVmZmVyLmR1cmF0aW9uO1xuICAgIGlmIChkdXIgPiBwcmV2QnVmLmR1cikge1xuICAgICAgcHJldkJ1ZiA9IHtcbiAgICAgICAga2V5OiBrZXksXG4gICAgICAgIGR1cjogZHVyXG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICB0cmFja3NbcHJldkJ1Zi5rZXldLnVwZGF0ZVRpbWVsaW5lKCk7XG59XG5cbmZ1bmN0aW9uIG5ld1RyYWNrRnJvbUZpbGUoZmlsZSkge1xuICBpZiAoZmlsZSA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG4gIGlmICghfmZpbGUudHlwZS5pbmRleE9mKCdhdWRpbycpKSB7XG4gICAgYWxlcnQoJ2F1ZGlvIGZpbGVzIG9ubHkgcGxlYXNlLicpO1xuICAgIC8vIGFsZXJ0KGZpbGUudHlwZSArICcgZmlsZXMgYXJlIG5vdCBzdXBwb3J0ZWQuJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHdlbGNvbWUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgdmFyIHRyYWNrRWwgPSB0cmFja1RtcCgpO1xuICB2YXIgaWQgPSB1bmlxSWQoKTtcblxuICB2YXIgY29udHJvbEVsID0gY29udHJvbFRtcCh7XG4gICAgdGl0bGU6IGZpbGUubmFtZVxuICB9KTtcblxuICBjb250cm9sU3BhY2VFbC5hcHBlbmRDaGlsZChjb250cm9sRWwpO1xuICB0cmFja1NwYWNlRWwuYXBwZW5kQ2hpbGQodHJhY2tFbCk7XG4gIHRyYWNrc1tpZF0gPSBuZXcgVHJhY2soe1xuICAgIHRpdGxlOiBmaWxlLm5hbWUsXG4gICAgaWQ6IGlkLFxuICAgIHRyYWNrRWw6IHRyYWNrRWwsXG4gICAgY29udHJvbEVsOiBjb250cm9sRWwsXG4gICAgY29udGV4dDogYXVkaW9Db250ZXh0XG4gIH0pO1xuICB0cmFja3NbaWRdLmVtaXR0ZXIub24oJ3RyYWNrczpyZW1vdmUnLCBmdW5jdGlvbihldikge1xuICAgIHRyYWNrc1tldi5pZF0gPSBudWxsO1xuICAgIGRlbGV0ZSB0cmFja3NbZXYuaWRdO1xuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XG4gICAgZHJhd1RpbWVsaW5lQnlMb25nZXN0VHJhY2soKTtcbiAgICBzaG93V2VsY29tZSgpO1xuICB9KTtcbiAgdHJhY2tzW2lkXS5sb2FkRmlsZShmaWxlKTtcbiAgZW5hYmxlUGxheWJhY2tPcHRzKCk7XG59XG5cbmZ1bmN0aW9uIG5ld1RyYWNrRnJvbVVSTCh1cmwpIHtcbiAgd2VsY29tZS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICB2YXIgdHJhY2tFbCA9IHRyYWNrVG1wKCk7XG4gIHZhciBjb250cm9sRWwgPSBjb250cm9sVG1wKHtcbiAgICB0aXRsZTogXCJSZWNvcmRpbmcgMVwiXG4gIH0pO1xuICB2YXIgaWQgPSB1bmlxSWQoKTtcblxuICBjb250cm9sU3BhY2VFbC5hcHBlbmRDaGlsZChjb250cm9sRWwpO1xuICB0cmFja1NwYWNlRWwuYXBwZW5kQ2hpbGQodHJhY2tFbCk7XG4gIHRyYWNrc1tpZF0gPSBuZXcgVHJhY2soe1xuICAgIHRpdGxlOiBcIlJlY29yZGluZyAxXCIsXG4gICAgaWQ6IGlkLFxuICAgIHRyYWNrRWw6IHRyYWNrRWwsXG4gICAgY29udHJvbEVsOiBjb250cm9sRWwsXG4gICAgY29udGV4dDogYXVkaW9Db250ZXh0XG4gIH0pO1xuICB0cmFja3NbaWRdLmVtaXR0ZXIub24oJ3RyYWNrczpyZW1vdmUnLCBmdW5jdGlvbihldikge1xuICAgIHRyYWNrc1tldi5pZF0gPSBudWxsO1xuICAgIGRlbGV0ZSB0cmFja3NbZXYuaWRdO1xuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XG4gICAgZHJhd1RpbWVsaW5lQnlMb25nZXN0VHJhY2soKTtcbiAgICBzaG93V2VsY29tZSgpO1xuICB9KTtcbiAgdHJhY2tzW2lkXS5sb2FkVVJMKHVybCk7XG4gIGVuYWJsZVBsYXliYWNrT3B0cygpO1xufVxuXG5mdW5jdGlvbiBzaG93V2VsY29tZSgpIHtcbiAgaWYgKCFPYmplY3Qua2V5cyh0cmFja3MpLmxlbmd0aCkgd2VsY29tZS5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcbn1cbiIsInZhciBoID0gcmVxdWlyZSgnaHlwZXJzY3JpcHQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihkYXRhKSB7XG4gIHJldHVybiBoKCdkaXYuY29udHJvbCcsXG4gICAgICAgICAgIGgoJ2hlYWRlcicsIHtcImRhdGEtdGlwLWNvbnRlbnRcIjogZGF0YS50aXRsZSwgXCJkYXRhLWhhcy10aXBcIjogXCJyaWdodFwifSxcbiAgICAgICAgICAgICBoKCdwJywgZGF0YS50aXRsZSkpLFxuICAgICAgICAgICBoKCd1bC5hY3Rpb25zJyxcbiAgICAgICAgICAgICBoKCdsaS5hY3RpdmF0ZS5hY3RpdmUnLCB7XCJkYXRhLXRpcC1jb250ZW50XCI6IFwiYWN0aXZhdGVcIiwgXCJkYXRhLWhhcy10aXBcIjogXCJib3R0b21cIn0pLFxuICAgICAgICAgICAgIGgoJ2xpLmVkaXQuYWN0aXZlJywge1wiZGF0YS10aXAtY29udGVudFwiOiBcImVkaXRcIiwgXCJkYXRhLWhhcy10aXBcIjogXCJib3R0b21cIn0pLFxuICAgICAgICAgICAgIGgoJ2xpLm11dGUnLCB7XCJkYXRhLXRpcC1jb250ZW50XCI6IFwibXV0ZVwiLCBcImRhdGEtaGFzLXRpcFwiOiBcImJvdHRvbVwifSksXG4gICAgICAgICAgICAgaCgnbGkuZXhwb3J0Jywge1wiZGF0YS10aXAtY29udGVudFwiOiBcImV4cG9ydFwiLCBcImRhdGEtaGFzLXRpcFwiOiBcImJvdHRvbVwifSksXG4gICAgICAgICAgICAgaCgnbGkuY29sbGFwc2UnLCB7XCJkYXRhLXRpcC1jb250ZW50XCI6IFwiY29sbGFwc2VcIiwgXCJkYXRhLWhhcy10aXBcIjogXCJib3R0b21cIn0pLFxuICAgICAgICAgICAgIGgoJ2xpLnJlbW92ZScsIHtcImRhdGEtdGlwLWNvbnRlbnRcIjogXCJyZW1vdmVcIiwgXCJkYXRhLWhhcy10aXBcIjogXCJib3R0b21cIn0pKSxcblxuICAgICAgICAgICBoKCdhcnRpY2xlLmluZm8nLFxuICAgICAgICAgICAgIGgoJ2Rpdi52b2x1bWUnLFxuICAgICAgICAgICAgICAgaCgnc3Bhbi52b2x1bWUtYmFyJykpLFxuICAgICAgICAgICAgIGgoJ3AnLCBcIkN1cnJlbnQgVGltZTogXCIsXG4gICAgICAgICAgICAgICBoKCdpLmN1cicsIFwiMDA6MDA6MDBcIikpLFxuICAgICAgICAgICAgIGgoJ3AnLCBcIkR1cmF0aW9uOiBcIixcbiAgICAgICAgICAgICAgIGgoJ2kuZHVyJywgXCIwMDowMDowMFwiKSksXG4gICAgICAgICAgICAgaCgncCcsIFwiUmVtYWluaW5nOiBcIixcbiAgICAgICAgICAgICAgIGgoJ2kucmVtJywgXCIwMDowMDowMFwiKSkpKTtcbn0iLCJ2YXIgaCA9IHJlcXVpcmUoJ2h5cGVyc2NyaXB0Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBoKCdkaXYudHJhY2suYWN0aXZlJyxcbiAgICAgICAgICAgaCgncCcsXG4gICAgICAgICAgICAgXCJkcmFnIGZpbGUgMiBlZGl0XCIpLFxuICAgICAgICAgICBoKCdkaXYucGxheS1jdXJzb3InKSxcbiAgICAgICAgICAgaCgnZGl2LnNlbGVjdGlvbicpLFxuICAgICAgICAgICBoKCdkaXYud2F2ZS5zZWxlY3RhYmxlJyxcbiAgICAgICAgICAgICBoKCdjYW52YXMnLCB7J2hlaWdodCc6ICczMDAnLCAnZHJhZ2dhYmxlJzogJ2ZhbHNlJ30pKSxcbiAgICAgICAgICAgaCgnZGl2LndhdmUtcHJvZ3Jlc3Muc2VsZWN0YWJsZScsXG4gICAgICAgICAgICAgaCgnY2FudmFzJywgeydoZWlnaHQnOiAnMzAwJywgJ2RyYWdnYWJsZSc6ICdmYWxzZSd9KSkpO1xufVxuIl19
