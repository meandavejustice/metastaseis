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
var removeBtn = document.querySelector('#remove');
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
    showWelcome();
  });

  enablePlaybackOpts();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzL2F1ZGlvLWZmdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9hdWRpb2NvbnRleHQvc3JjL2F1ZGlvY29udGV4dC5qcyIsIm5vZGVfbW9kdWxlcy9hdWRpb3NvdXJjZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kcmFnLWRyb3AvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZHJhZy1kcm9wL25vZGVfbW9kdWxlcy9sb2Rhc2gudGhyb3R0bGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZHJhZy1kcm9wL25vZGVfbW9kdWxlcy9sb2Rhc2gudGhyb3R0bGUvbm9kZV9tb2R1bGVzL2xvZGFzaC5kZWJvdW5jZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kcmFnLWRyb3Avbm9kZV9tb2R1bGVzL2xvZGFzaC50aHJvdHRsZS9ub2RlX21vZHVsZXMvbG9kYXNoLmRlYm91bmNlL25vZGVfbW9kdWxlcy9sb2Rhc2gubm93L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2RyYWctZHJvcC9ub2RlX21vZHVsZXMvbG9kYXNoLnRocm90dGxlL25vZGVfbW9kdWxlcy9sb2Rhc2guZGVib3VuY2Uvbm9kZV9tb2R1bGVzL2xvZGFzaC5ub3cvbm9kZV9tb2R1bGVzL2xvZGFzaC5faXNuYXRpdmUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZHJhZy1kcm9wL25vZGVfbW9kdWxlcy9sb2Rhc2gudGhyb3R0bGUvbm9kZV9tb2R1bGVzL2xvZGFzaC5pc2Z1bmN0aW9uL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2RyYWctZHJvcC9ub2RlX21vZHVsZXMvbG9kYXNoLnRocm90dGxlL25vZGVfbW9kdWxlcy9sb2Rhc2guaXNvYmplY3QvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZHJhZy1kcm9wL25vZGVfbW9kdWxlcy9sb2Rhc2gudGhyb3R0bGUvbm9kZV9tb2R1bGVzL2xvZGFzaC5pc29iamVjdC9ub2RlX21vZHVsZXMvbG9kYXNoLl9vYmplY3R0eXBlcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kcmF3LXdhdmUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZW5jb2RlLXdhdi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9lbmNvZGUtd2F2L3dvcmsuanMiLCJub2RlX21vZHVsZXMvaHlwZXJzY3JpcHQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvaHlwZXJzY3JpcHQvbm9kZV9tb2R1bGVzL2Jyb3dzZXItc3BsaXQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvaHlwZXJzY3JpcHQvbm9kZV9tb2R1bGVzL2NsYXNzLWxpc3QvaW5kZXguanMiLCJub2RlX21vZHVsZXMvaHlwZXJzY3JpcHQvbm9kZV9tb2R1bGVzL2NsYXNzLWxpc3Qvbm9kZV9tb2R1bGVzL2luZGV4b2YvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbWVyZ2UtYXVkaW8tYnVmZmVycy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9yYWYvaW5kZXguanMiLCJub2RlX21vZHVsZXMvcmFmL25vZGVfbW9kdWxlcy9wZXJmb3JtYW5jZS1ub3cvbGliL3BlcmZvcm1hbmNlLW5vdy5qcyIsIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIiwibm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvd2Vid29ya2lmeS9pbmRleC5qcyIsInB1YmxpYy9saWIvY29sb3JzLmpzIiwicHVibGljL2xpYi9lZGl0cy5qcyIsInB1YmxpYy9saWIvZm9yY2UtZG93bmxvYWQuanMiLCJwdWJsaWMvbGliL2Zvcm1hdC10aW1lLmpzIiwicHVibGljL2xpYi9yZWNvcmQuanMiLCJwdWJsaWMvbGliL3RpbWVsaW5lLmpzIiwicHVibGljL2xpYi90cmFjay5qcyIsInB1YmxpYy9tYWluLmpzIiwidGVtcGxhdGVzL2NvbnRyb2wtdG1wLmpzIiwidGVtcGxhdGVzL3RyYWNrLXRtcC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcbiAqIHB1bGxlZCBmcm9tIEBqc2FudGVsbFxuICpcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS9qc2FudGVsbC9kc3Atd2l0aC13ZWItYXVkaW8tcHJlc2VudGF0aW9uL2Jsb2IvZ2gtcGFnZXMvZXhhbXBsZXMvRkZULmpzXG4gKlxuICovXG5cbnZhciBNQVhfVUlOVDggPSAyNTU7XG5cbm1vZHVsZS5leHBvcnRzID0gRkZUO1xuXG5mdW5jdGlvbiBGRlQgKGN0eCwgb3B0aW9ucykge1xuICB2YXIgbW9kdWxlID0gdGhpcztcbiAgdGhpcy5jYW52YXMgPSBvcHRpb25zLmNhbnZhcztcbiAgdGhpcy5vbkJlYXQgPSBvcHRpb25zLm9uQmVhdDtcbiAgdGhpcy5vZmZCZWF0ID0gb3B0aW9ucy5vZmZCZWF0O1xuICB0aGlzLnR5cGUgPSBvcHRpb25zLnR5cGUgfHwgJ2ZyZXF1ZW5jeSc7XG4gIHRoaXMuc3BhY2luZyA9IG9wdGlvbnMuc3BhY2luZyB8fCAxO1xuICB0aGlzLndpZHRoID0gb3B0aW9ucy53aWR0aCB8fCAxO1xuICB0aGlzLmNvdW50ID0gb3B0aW9ucy5jb3VudCB8fCA1MTI7XG4gIHRoaXMuaW5wdXQgPSB0aGlzLm91dHB1dCA9IGN0eC5jcmVhdGVBbmFseXNlcigpO1xuICB0aGlzLnByb2MgPSBjdHguY3JlYXRlU2NyaXB0UHJvY2Vzc29yKDI1NiwgMSwgMSk7XG4gIHRoaXMuZGF0YSA9IG5ldyBVaW50OEFycmF5KHRoaXMuaW5wdXQuZnJlcXVlbmN5QmluQ291bnQpO1xuICB0aGlzLmN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cbiAgdGhpcy5kZWNheSA9IG9wdGlvbnMuZGVjYXkgfHwgMC4wMDI7XG4gIHRoaXMudGhyZXNob2xkID0gb3B0aW9ucy50aHJlc2hvbGQgfHwgMC41O1xuICB0aGlzLnJhbmdlID0gb3B0aW9ucy5yYW5nZSB8fCBbMCwgdGhpcy5kYXRhLmxlbmd0aC0xXTtcbiAgdGhpcy53YWl0ID0gb3B0aW9ucy53YWl0IHx8IDUxMjtcblxuICB0aGlzLmggPSB0aGlzLmNhbnZhcy5oZWlnaHQ7XG4gIHRoaXMudyA9IHRoaXMuY2FudmFzLndpZHRoO1xuXG4gIHRoaXMuaW5wdXQuY29ubmVjdCh0aGlzLnByb2MpO1xuICB0aGlzLnByb2Mub25hdWRpb3Byb2Nlc3MgPSBwcm9jZXNzLmJpbmQobnVsbCwgbW9kdWxlKTtcbiAgdGhpcy5jdHgubGluZVdpZHRoID0gbW9kdWxlLndpZHRoO1xufVxuXG5GRlQucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbiAobm9kZSkge1xuICB0aGlzLm91dHB1dC5jb25uZWN0KG5vZGUpO1xuICB0aGlzLnByb2MuY29ubmVjdChub2RlKTtcbn1cblxuZnVuY3Rpb24gcHJvY2VzcyAobW9kdWxlKSB7XG5cbiAgdmFyIGN0eCA9IG1vZHVsZS5jdHg7XG4gIHZhciBkYXRhID0gbW9kdWxlLmRhdGE7XG4gIGN0eC5jbGVhclJlY3QoMCwgMCwgbW9kdWxlLncsIG1vZHVsZS5oKTtcbiAgY3R4LmZpbGxTdHlsZSA9IG1vZHVsZS5maWxsU3R5bGUgfHwgJyMwMDAwMDAnO1xuICBjdHguc3Ryb2tlU3R5bGUgPSBtb2R1bGUuc3Ryb2tlU3R5bGUgfHwgJyMwMDAwMDAnO1xuXG4gIGlmIChtb2R1bGUudHlwZSA9PT0gJ2ZyZXF1ZW5jeScpIHtcbiAgICBtb2R1bGUuaW5wdXQuZ2V0Qnl0ZUZyZXF1ZW5jeURhdGEoZGF0YSk7XG4gICAgLy8gQWJvcnQgaWYgbm8gZGF0YSBjb21pbmcgdGhyb3VnaCwgcXVpY2sgaGFjaywgbmVlZHMgZml4ZWRcbiAgICBpZiAobW9kdWxlLmRhdGFbM10gPCA1KSByZXR1cm47XG5cbiAgICBmb3IgKHZhciBpPSAwLCBsID0gZGF0YS5sZW5ndGg7IGkgPCBsICYmIGkgPCBtb2R1bGUuY291bnQ7IGkrKykge1xuICAgICAgY3R4LmZpbGxSZWN0KFxuICAgICAgICBpICogKG1vZHVsZS5zcGFjaW5nICsgbW9kdWxlLndpZHRoKSxcbiAgICAgICAgbW9kdWxlLmgsXG4gICAgICAgIG1vZHVsZS53aWR0aCxcbiAgICAgICAgLShtb2R1bGUuaCAvIE1BWF9VSU5UOCkgKiBkYXRhW2ldXG4gICAgICApO1xuICAgIH1cbiAgfVxuICBlbHNlIGlmIChtb2R1bGUudHlwZSA9PT0gJ3RpbWUnKSB7XG4gICAgbW9kdWxlLmlucHV0LmdldEJ5dGVUaW1lRG9tYWluRGF0YShkYXRhKTtcbiAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgY3R4Lm1vdmVUbygwLCBtb2R1bGUuaCAvIDIpO1xuICAgIGZvciAodmFyIGk9IDAsIGwgPSBkYXRhLmxlbmd0aDsgaSA8IGwgJiYgaSA8IG1vZHVsZS5jb3VudDsgaSsrKSB7XG4gICAgICBjdHgubGluZVRvKFxuICAgICAgICBpICogKG1vZHVsZS5zcGFjaW5nICsgbW9kdWxlLndpZHRoKSxcbiAgICAgICAgKG1vZHVsZS5oIC8gTUFYX1VJTlQ4KSAqIGRhdGFbaV1cbiAgICAgICk7XG4gICAgfVxuICAgIGN0eC5zdHJva2UoKTtcbiAgICBjdHguY2xvc2VQYXRoKCk7XG4gIH1cbn1cbiIsIi8qXG4gKiBXZWIgQXVkaW8gQVBJIEF1ZGlvQ29udGV4dCBzaGltXG4gKi9cbihmdW5jdGlvbiAoZGVmaW5pdGlvbikge1xuICAgIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGRlZmluaXRpb24oKTtcbiAgICB9XG59KShmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQ7XG59KTtcbiIsIi8qXG4gKiBBdWRpb1NvdXJjZVxuICpcbiAqICogTVVTVCBwYXNzIGFuIGF1ZGlvIGNvbnRleHRcbiAqXG4gKi9cbmZ1bmN0aW9uIEF1ZGlvU291cmNlIChjb250ZXh0LCBvcHRzKSB7XG4gIGlmICghY29udGV4dCkge1xuICAgIHRocm93IG5ldyBFcnJvcignWW91IG11c3QgcGFzcyBhbiBhdWRpbyBjb250ZXh0IHRvIHVzZSB0aGlzIG1vZHVsZScpO1xuICB9XG4gIGlmIChvcHRzID09PSB1bmRlZmluZWQpIG9wdHMgPSB7fTtcblxuICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICB0aGlzLmJ1ZmZlciA9IHVuZGVmaW5lZDtcbiAgdGhpcy51cmwgPSBvcHRzLnVybCA/IG9wdHMudXJsIDogdW5kZWZpbmVkO1xuICB0aGlzLmZmdHMgPSBvcHRzLmZmdHMgPyBvcHRzLmZmdHMgOiBbXTtcbiAgdGhpcy5nYWluTm9kZSA9IG9wdHMuZ2Fpbk5vZGUgPyBvcHRzLmdhaW5Ob2RlIDogdW5kZWZpbmVkO1xufVxuXG5BdWRpb1NvdXJjZS5wcm90b3R5cGUgPSB7XG4gIG5lZWRCdWZmZXI6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmJ1ZmZlciA9PT0gdW5kZWZpbmVkO1xuICB9LFxuICBsb2FkU291bmQ6IGZ1bmN0aW9uKHVybCwgY2IpIHtcbiAgICB2YXIgcmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgcmVxLm9wZW4oJ0dFVCcsIHVybCwgdHJ1ZSk7XG4gICAgcmVxLnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJlcS5vbmxvYWRlbmQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHNlbGYuZGVjb2RlLmNhbGwoc2VsZiwgcmVxLnJlc3BvbnNlLCBjYik7XG4gICAgfTtcbiAgICByZXEuc2VuZCgpO1xuICB9LFxuICBnZXRCdWZmZXI6IGZ1bmN0aW9uKGNiKSB7XG4gICAgaWYgKCF0aGlzLm5lZWRCdWZmZXIoKSkgcmV0dXJuO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmxvYWRTb3VuZCh0aGlzLnVybCwgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgc2VsZi5vbkxvYWRlZC5jYWxsKHNlbGYsIGRhdGEsIHRydWUpO1xuICAgIH0pO1xuICB9LFxuICBnZXRTb3VyY2U6IGZ1bmN0aW9uKGNiKSB7XG4gICAgaWYgKHRoaXMuc291cmNlKSB7XG4gICAgICBjYih0aGlzLnNvdXJjZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHRoaXMuZGlzY29ubmVjdCgpO1xuICAgICAgdGhpcy5sb2FkU291bmQodGhpcy51cmwsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgdGhpcy5zb3VyY2UgPSBzZWxmLmNyZWF0ZVNvdXJjZS5jYWxsKHNlbGYsIGRhdGEsIHRydWUpO1xuICAgICAgICBjYih0aGlzLnNvdXJjZSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0sXG4gIG9uTG9hZGVkOiBmdW5jdGlvbihzb3VyY2UsIHNpbGVudCkge1xuICAgIHRoaXMuYnVmZmVyID0gc291cmNlO1xuICAgIHRoaXMuZGlzY29ubmVjdCgpO1xuICAgIHRoaXMuc291cmNlID0gdGhpcy5jb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuICAgIHRoaXMuc291cmNlLmJ1ZmZlciA9IHRoaXMuYnVmZmVyO1xuICAgIHRoaXMuc291cmNlLmNvbm5lY3QodGhpcy5nYWluTm9kZSk7XG4gICAgdGhpcy5mZnRzLmZvckVhY2goZnVuY3Rpb24oZmZ0KSB7XG4gICAgICB0aGlzLmdhaW5Ob2RlLmNvbm5lY3QoZmZ0LmlucHV0KTtcbiAgICB9LCB0aGlzKTtcbiAgICB0aGlzLmdhaW5Ob2RlLmNvbm5lY3QodGhpcy5jb250ZXh0LmRlc3RpbmF0aW9uKTtcbiAgICB0aGlzLmZmdHMuZm9yRWFjaChmdW5jdGlvbihmZnQpIHtcbiAgICAgIGZmdC5jb25uZWN0KHRoaXMuY29udGV4dC5kZXN0aW5hdGlvbik7XG4gICAgfSwgdGhpcyk7XG4gICAgaWYgKCFzaWxlbnQpIHRoaXMucGxheVNvdW5kKCk7XG4gIH0sXG4gIGRpc2Nvbm5lY3Q6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLnNvdXJjZSkge1xuICAgICAgdGhpcy5zb3VyY2UuZGlzY29ubmVjdCh0aGlzLmNvbnRleHQuZGVzdGluYXRpb24pO1xuICAgIH1cbiAgfSxcbiAgcGxheVNvdW5kOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5wbGF5VGltZSkge1xuICAgICAgdGhpcy5zb3VyY2Uuc3RhcnQoMCwgdGhpcy5vZmZzZXQpO1xuICAgIH1cblxuICAgIHRoaXMucGxheVRpbWUgPSB0aGlzLmNvbnRleHQuY3VycmVudFRpbWU7XG4gIH0sXG4gIGxvYWRTaWxlbnQ6IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5uZWVkQnVmZmVyKCkpIHJldHVybjtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5sb2FkU291bmQodGhpcy51cmwsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIHNlbGYub25Mb2FkZWQuY2FsbChzZWxmLCBkYXRhLCB0cnVlKTtcbiAgICB9KTtcbiAgfSxcbiAgcGxheTogZnVuY3Rpb24oc3RhcnR0aW1lLCBvZmZzZXQpIHtcbiAgICB0aGlzLnBsYXlUaW1lID0gc3RhcnR0aW1lID8gc3RhcnR0aW1lIDogdGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lO1xuICAgIHRoaXMub2Zmc2V0ID0gb2Zmc2V0ID8gb2Zmc2V0IDogMDtcblxuICAgIGlmICh0aGlzLm5lZWRCdWZmZXIoKSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdGhpcy5sb2FkU291bmQodGhpcy51cmwsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgc2VsZi5vbkxvYWRlZC5jYWxsKHNlbGYsIGRhdGEpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMub25Mb2FkZWQodGhpcy5idWZmZXIpO1xuICAgIH1cbiAgfSxcbiAgc3RvcDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zb3VyY2Uuc3RvcCh0aGlzLmNvbnRleHQuY3VycmVudFRpbWUpO1xuICB9LFxuICBkZWNvZGU6IGZ1bmN0aW9uKGRhdGEsIHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgdGhpcy5jb250ZXh0LmRlY29kZUF1ZGlvRGF0YShkYXRhLCBzdWNjZXNzLCBlcnJvcik7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQXVkaW9Tb3VyY2U7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IERyYWdEcm9wXG5cbnZhciB0aHJvdHRsZSA9IHJlcXVpcmUoJ2xvZGFzaC50aHJvdHRsZScpXG5cbmZ1bmN0aW9uIERyYWdEcm9wIChlbGVtLCBjYikge1xuICBpZiAodHlwZW9mIGVsZW0gPT09ICdzdHJpbmcnKSBlbGVtID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihlbGVtKVxuICBlbGVtLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdlbnRlcicsIGtpbGxFdmVudCwgZmFsc2UpXG4gIGVsZW0uYWRkRXZlbnRMaXN0ZW5lcignZHJhZ292ZXInLCBtYWtlT25EcmFnT3ZlcihlbGVtKSwgZmFsc2UpXG4gIGVsZW0uYWRkRXZlbnRMaXN0ZW5lcignZHJvcCcsIG9uRHJvcC5iaW5kKHVuZGVmaW5lZCwgZWxlbSwgY2IpLCBmYWxzZSlcbn1cblxuZnVuY3Rpb24ga2lsbEV2ZW50IChlKSB7XG4gIGUuc3RvcFByb3BhZ2F0aW9uKClcbiAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gIHJldHVybiBmYWxzZVxufVxuXG5mdW5jdGlvbiBtYWtlT25EcmFnT3ZlciAoZWxlbSkge1xuICB2YXIgZm4gPSB0aHJvdHRsZShmdW5jdGlvbiAoKSB7XG4gICAgZWxlbS5jbGFzc0xpc3QuYWRkKCdkcmFnJylcblxuICAgIGlmIChlbGVtLnRpbWVvdXQpIGNsZWFyVGltZW91dChlbGVtLnRpbWVvdXQpXG4gICAgZWxlbS50aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICBlbGVtLmNsYXNzTGlzdC5yZW1vdmUoJ2RyYWcnKVxuICAgIH0sIDE1MClcbiAgfSwgMTAwLCB7dHJhaWxpbmc6IGZhbHNlfSlcblxuICByZXR1cm4gZnVuY3Rpb24gKGUpIHtcbiAgICBlLnN0b3BQcm9wYWdhdGlvbigpXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgZS5kYXRhVHJhbnNmZXIuZHJvcEVmZmVjdCA9ICdjb3B5J1xuICAgIGZuKClcbiAgfVxufVxuXG5mdW5jdGlvbiBvbkRyb3AgKGVsZW0sIGNiLCBlKSB7XG4gIGUuc3RvcFByb3BhZ2F0aW9uKClcbiAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gIGVsZW0uY2xhc3NMaXN0LnJlbW92ZSgnZHJhZycpXG4gIGNiKEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGUuZGF0YVRyYW5zZmVyLmZpbGVzKSwgeyB4OiBlLmNsaWVudFgsIHk6IGUuY2xpZW50WSB9KVxuICByZXR1cm4gZmFsc2Vcbn1cbiIsIi8qKlxuICogTG8tRGFzaCAyLjQuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cDovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBtb2Rlcm4gZXhwb3J0cz1cIm5wbVwiIC1vIC4vbnBtL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuNS4yIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG52YXIgZGVib3VuY2UgPSByZXF1aXJlKCdsb2Rhc2guZGVib3VuY2UnKSxcbiAgICBpc0Z1bmN0aW9uID0gcmVxdWlyZSgnbG9kYXNoLmlzZnVuY3Rpb24nKSxcbiAgICBpc09iamVjdCA9IHJlcXVpcmUoJ2xvZGFzaC5pc29iamVjdCcpO1xuXG4vKiogVXNlZCBhcyBhbiBpbnRlcm5hbCBgXy5kZWJvdW5jZWAgb3B0aW9ucyBvYmplY3QgKi9cbnZhciBkZWJvdW5jZU9wdGlvbnMgPSB7XG4gICdsZWFkaW5nJzogZmFsc2UsXG4gICdtYXhXYWl0JzogMCxcbiAgJ3RyYWlsaW5nJzogZmFsc2Vcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIGZ1bmN0aW9uIHRoYXQsIHdoZW4gZXhlY3V0ZWQsIHdpbGwgb25seSBjYWxsIHRoZSBgZnVuY2AgZnVuY3Rpb25cbiAqIGF0IG1vc3Qgb25jZSBwZXIgZXZlcnkgYHdhaXRgIG1pbGxpc2Vjb25kcy4gUHJvdmlkZSBhbiBvcHRpb25zIG9iamVjdCB0b1xuICogaW5kaWNhdGUgdGhhdCBgZnVuY2Agc2hvdWxkIGJlIGludm9rZWQgb24gdGhlIGxlYWRpbmcgYW5kL29yIHRyYWlsaW5nIGVkZ2VcbiAqIG9mIHRoZSBgd2FpdGAgdGltZW91dC4gU3Vic2VxdWVudCBjYWxscyB0byB0aGUgdGhyb3R0bGVkIGZ1bmN0aW9uIHdpbGxcbiAqIHJldHVybiB0aGUgcmVzdWx0IG9mIHRoZSBsYXN0IGBmdW5jYCBjYWxsLlxuICpcbiAqIE5vdGU6IElmIGBsZWFkaW5nYCBhbmQgYHRyYWlsaW5nYCBvcHRpb25zIGFyZSBgdHJ1ZWAgYGZ1bmNgIHdpbGwgYmUgY2FsbGVkXG4gKiBvbiB0aGUgdHJhaWxpbmcgZWRnZSBvZiB0aGUgdGltZW91dCBvbmx5IGlmIHRoZSB0aGUgdGhyb3R0bGVkIGZ1bmN0aW9uIGlzXG4gKiBpbnZva2VkIG1vcmUgdGhhbiBvbmNlIGR1cmluZyB0aGUgYHdhaXRgIHRpbWVvdXQuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBGdW5jdGlvbnNcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIHRocm90dGxlLlxuICogQHBhcmFtIHtudW1iZXJ9IHdhaXQgVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgdG8gdGhyb3R0bGUgZXhlY3V0aW9ucyB0by5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gVGhlIG9wdGlvbnMgb2JqZWN0LlxuICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5sZWFkaW5nPXRydWVdIFNwZWNpZnkgZXhlY3V0aW9uIG9uIHRoZSBsZWFkaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnRyYWlsaW5nPXRydWVdIFNwZWNpZnkgZXhlY3V0aW9uIG9uIHRoZSB0cmFpbGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0LlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgdGhyb3R0bGVkIGZ1bmN0aW9uLlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBhdm9pZCBleGNlc3NpdmVseSB1cGRhdGluZyB0aGUgcG9zaXRpb24gd2hpbGUgc2Nyb2xsaW5nXG4gKiB2YXIgdGhyb3R0bGVkID0gXy50aHJvdHRsZSh1cGRhdGVQb3NpdGlvbiwgMTAwKTtcbiAqIGpRdWVyeSh3aW5kb3cpLm9uKCdzY3JvbGwnLCB0aHJvdHRsZWQpO1xuICpcbiAqIC8vIGV4ZWN1dGUgYHJlbmV3VG9rZW5gIHdoZW4gdGhlIGNsaWNrIGV2ZW50IGlzIGZpcmVkLCBidXQgbm90IG1vcmUgdGhhbiBvbmNlIGV2ZXJ5IDUgbWludXRlc1xuICogalF1ZXJ5KCcuaW50ZXJhY3RpdmUnKS5vbignY2xpY2snLCBfLnRocm90dGxlKHJlbmV3VG9rZW4sIDMwMDAwMCwge1xuICogICAndHJhaWxpbmcnOiBmYWxzZVxuICogfSkpO1xuICovXG5mdW5jdGlvbiB0aHJvdHRsZShmdW5jLCB3YWl0LCBvcHRpb25zKSB7XG4gIHZhciBsZWFkaW5nID0gdHJ1ZSxcbiAgICAgIHRyYWlsaW5nID0gdHJ1ZTtcblxuICBpZiAoIWlzRnVuY3Rpb24oZnVuYykpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yO1xuICB9XG4gIGlmIChvcHRpb25zID09PSBmYWxzZSkge1xuICAgIGxlYWRpbmcgPSBmYWxzZTtcbiAgfSBlbHNlIGlmIChpc09iamVjdChvcHRpb25zKSkge1xuICAgIGxlYWRpbmcgPSAnbGVhZGluZycgaW4gb3B0aW9ucyA/IG9wdGlvbnMubGVhZGluZyA6IGxlYWRpbmc7XG4gICAgdHJhaWxpbmcgPSAndHJhaWxpbmcnIGluIG9wdGlvbnMgPyBvcHRpb25zLnRyYWlsaW5nIDogdHJhaWxpbmc7XG4gIH1cbiAgZGVib3VuY2VPcHRpb25zLmxlYWRpbmcgPSBsZWFkaW5nO1xuICBkZWJvdW5jZU9wdGlvbnMubWF4V2FpdCA9IHdhaXQ7XG4gIGRlYm91bmNlT3B0aW9ucy50cmFpbGluZyA9IHRyYWlsaW5nO1xuXG4gIHJldHVybiBkZWJvdW5jZShmdW5jLCB3YWl0LCBkZWJvdW5jZU9wdGlvbnMpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHRocm90dGxlO1xuIiwiLyoqXG4gKiBMby1EYXNoIDIuNC4xIChDdXN0b20gQnVpbGQpIDxodHRwOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIG1vZGVybiBleHBvcnRzPVwibnBtXCIgLW8gLi9ucG0vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxMyBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS41LjIgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHA6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cbnZhciBpc0Z1bmN0aW9uID0gcmVxdWlyZSgnbG9kYXNoLmlzZnVuY3Rpb24nKSxcbiAgICBpc09iamVjdCA9IHJlcXVpcmUoJ2xvZGFzaC5pc29iamVjdCcpLFxuICAgIG5vdyA9IHJlcXVpcmUoJ2xvZGFzaC5ub3cnKTtcblxuLyogTmF0aXZlIG1ldGhvZCBzaG9ydGN1dHMgZm9yIG1ldGhvZHMgd2l0aCB0aGUgc2FtZSBuYW1lIGFzIG90aGVyIGBsb2Rhc2hgIG1ldGhvZHMgKi9cbnZhciBuYXRpdmVNYXggPSBNYXRoLm1heDtcblxuLyoqXG4gKiBDcmVhdGVzIGEgZnVuY3Rpb24gdGhhdCB3aWxsIGRlbGF5IHRoZSBleGVjdXRpb24gb2YgYGZ1bmNgIHVudGlsIGFmdGVyXG4gKiBgd2FpdGAgbWlsbGlzZWNvbmRzIGhhdmUgZWxhcHNlZCBzaW5jZSB0aGUgbGFzdCB0aW1lIGl0IHdhcyBpbnZva2VkLlxuICogUHJvdmlkZSBhbiBvcHRpb25zIG9iamVjdCB0byBpbmRpY2F0ZSB0aGF0IGBmdW5jYCBzaG91bGQgYmUgaW52b2tlZCBvblxuICogdGhlIGxlYWRpbmcgYW5kL29yIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIGB3YWl0YCB0aW1lb3V0LiBTdWJzZXF1ZW50IGNhbGxzXG4gKiB0byB0aGUgZGVib3VuY2VkIGZ1bmN0aW9uIHdpbGwgcmV0dXJuIHRoZSByZXN1bHQgb2YgdGhlIGxhc3QgYGZ1bmNgIGNhbGwuXG4gKlxuICogTm90ZTogSWYgYGxlYWRpbmdgIGFuZCBgdHJhaWxpbmdgIG9wdGlvbnMgYXJlIGB0cnVlYCBgZnVuY2Agd2lsbCBiZSBjYWxsZWRcbiAqIG9uIHRoZSB0cmFpbGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0IG9ubHkgaWYgdGhlIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gaXNcbiAqIGludm9rZWQgbW9yZSB0aGFuIG9uY2UgZHVyaW5nIHRoZSBgd2FpdGAgdGltZW91dC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IEZ1bmN0aW9uc1xuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gZGVib3VuY2UuXG4gKiBAcGFyYW0ge251bWJlcn0gd2FpdCBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byBkZWxheS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gVGhlIG9wdGlvbnMgb2JqZWN0LlxuICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5sZWFkaW5nPWZhbHNlXSBTcGVjaWZ5IGV4ZWN1dGlvbiBvbiB0aGUgbGVhZGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0LlxuICogQHBhcmFtIHtudW1iZXJ9IFtvcHRpb25zLm1heFdhaXRdIFRoZSBtYXhpbXVtIHRpbWUgYGZ1bmNgIGlzIGFsbG93ZWQgdG8gYmUgZGVsYXllZCBiZWZvcmUgaXQncyBjYWxsZWQuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnRyYWlsaW5nPXRydWVdIFNwZWNpZnkgZXhlY3V0aW9uIG9uIHRoZSB0cmFpbGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0LlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZGVib3VuY2VkIGZ1bmN0aW9uLlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBhdm9pZCBjb3N0bHkgY2FsY3VsYXRpb25zIHdoaWxlIHRoZSB3aW5kb3cgc2l6ZSBpcyBpbiBmbHV4XG4gKiB2YXIgbGF6eUxheW91dCA9IF8uZGVib3VuY2UoY2FsY3VsYXRlTGF5b3V0LCAxNTApO1xuICogalF1ZXJ5KHdpbmRvdykub24oJ3Jlc2l6ZScsIGxhenlMYXlvdXQpO1xuICpcbiAqIC8vIGV4ZWN1dGUgYHNlbmRNYWlsYCB3aGVuIHRoZSBjbGljayBldmVudCBpcyBmaXJlZCwgZGVib3VuY2luZyBzdWJzZXF1ZW50IGNhbGxzXG4gKiBqUXVlcnkoJyNwb3N0Ym94Jykub24oJ2NsaWNrJywgXy5kZWJvdW5jZShzZW5kTWFpbCwgMzAwLCB7XG4gKiAgICdsZWFkaW5nJzogdHJ1ZSxcbiAqICAgJ3RyYWlsaW5nJzogZmFsc2VcbiAqIH0pO1xuICpcbiAqIC8vIGVuc3VyZSBgYmF0Y2hMb2dgIGlzIGV4ZWN1dGVkIG9uY2UgYWZ0ZXIgMSBzZWNvbmQgb2YgZGVib3VuY2VkIGNhbGxzXG4gKiB2YXIgc291cmNlID0gbmV3IEV2ZW50U291cmNlKCcvc3RyZWFtJyk7XG4gKiBzb3VyY2UuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIF8uZGVib3VuY2UoYmF0Y2hMb2csIDI1MCwge1xuICogICAnbWF4V2FpdCc6IDEwMDBcbiAqIH0sIGZhbHNlKTtcbiAqL1xuZnVuY3Rpb24gZGVib3VuY2UoZnVuYywgd2FpdCwgb3B0aW9ucykge1xuICB2YXIgYXJncyxcbiAgICAgIG1heFRpbWVvdXRJZCxcbiAgICAgIHJlc3VsdCxcbiAgICAgIHN0YW1wLFxuICAgICAgdGhpc0FyZyxcbiAgICAgIHRpbWVvdXRJZCxcbiAgICAgIHRyYWlsaW5nQ2FsbCxcbiAgICAgIGxhc3RDYWxsZWQgPSAwLFxuICAgICAgbWF4V2FpdCA9IGZhbHNlLFxuICAgICAgdHJhaWxpbmcgPSB0cnVlO1xuXG4gIGlmICghaXNGdW5jdGlvbihmdW5jKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3I7XG4gIH1cbiAgd2FpdCA9IG5hdGl2ZU1heCgwLCB3YWl0KSB8fCAwO1xuICBpZiAob3B0aW9ucyA9PT0gdHJ1ZSkge1xuICAgIHZhciBsZWFkaW5nID0gdHJ1ZTtcbiAgICB0cmFpbGluZyA9IGZhbHNlO1xuICB9IGVsc2UgaWYgKGlzT2JqZWN0KG9wdGlvbnMpKSB7XG4gICAgbGVhZGluZyA9IG9wdGlvbnMubGVhZGluZztcbiAgICBtYXhXYWl0ID0gJ21heFdhaXQnIGluIG9wdGlvbnMgJiYgKG5hdGl2ZU1heCh3YWl0LCBvcHRpb25zLm1heFdhaXQpIHx8IDApO1xuICAgIHRyYWlsaW5nID0gJ3RyYWlsaW5nJyBpbiBvcHRpb25zID8gb3B0aW9ucy50cmFpbGluZyA6IHRyYWlsaW5nO1xuICB9XG4gIHZhciBkZWxheWVkID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJlbWFpbmluZyA9IHdhaXQgLSAobm93KCkgLSBzdGFtcCk7XG4gICAgaWYgKHJlbWFpbmluZyA8PSAwKSB7XG4gICAgICBpZiAobWF4VGltZW91dElkKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChtYXhUaW1lb3V0SWQpO1xuICAgICAgfVxuICAgICAgdmFyIGlzQ2FsbGVkID0gdHJhaWxpbmdDYWxsO1xuICAgICAgbWF4VGltZW91dElkID0gdGltZW91dElkID0gdHJhaWxpbmdDYWxsID0gdW5kZWZpbmVkO1xuICAgICAgaWYgKGlzQ2FsbGVkKSB7XG4gICAgICAgIGxhc3RDYWxsZWQgPSBub3coKTtcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcbiAgICAgICAgaWYgKCF0aW1lb3V0SWQgJiYgIW1heFRpbWVvdXRJZCkge1xuICAgICAgICAgIGFyZ3MgPSB0aGlzQXJnID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGRlbGF5ZWQsIHJlbWFpbmluZyk7XG4gICAgfVxuICB9O1xuXG4gIHZhciBtYXhEZWxheWVkID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRpbWVvdXRJZCkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgfVxuICAgIG1heFRpbWVvdXRJZCA9IHRpbWVvdXRJZCA9IHRyYWlsaW5nQ2FsbCA9IHVuZGVmaW5lZDtcbiAgICBpZiAodHJhaWxpbmcgfHwgKG1heFdhaXQgIT09IHdhaXQpKSB7XG4gICAgICBsYXN0Q2FsbGVkID0gbm93KCk7XG4gICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xuICAgICAgaWYgKCF0aW1lb3V0SWQgJiYgIW1heFRpbWVvdXRJZCkge1xuICAgICAgICBhcmdzID0gdGhpc0FyZyA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgIHN0YW1wID0gbm93KCk7XG4gICAgdGhpc0FyZyA9IHRoaXM7XG4gICAgdHJhaWxpbmdDYWxsID0gdHJhaWxpbmcgJiYgKHRpbWVvdXRJZCB8fCAhbGVhZGluZyk7XG5cbiAgICBpZiAobWF4V2FpdCA9PT0gZmFsc2UpIHtcbiAgICAgIHZhciBsZWFkaW5nQ2FsbCA9IGxlYWRpbmcgJiYgIXRpbWVvdXRJZDtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCFtYXhUaW1lb3V0SWQgJiYgIWxlYWRpbmcpIHtcbiAgICAgICAgbGFzdENhbGxlZCA9IHN0YW1wO1xuICAgICAgfVxuICAgICAgdmFyIHJlbWFpbmluZyA9IG1heFdhaXQgLSAoc3RhbXAgLSBsYXN0Q2FsbGVkKSxcbiAgICAgICAgICBpc0NhbGxlZCA9IHJlbWFpbmluZyA8PSAwO1xuXG4gICAgICBpZiAoaXNDYWxsZWQpIHtcbiAgICAgICAgaWYgKG1heFRpbWVvdXRJZCkge1xuICAgICAgICAgIG1heFRpbWVvdXRJZCA9IGNsZWFyVGltZW91dChtYXhUaW1lb3V0SWQpO1xuICAgICAgICB9XG4gICAgICAgIGxhc3RDYWxsZWQgPSBzdGFtcDtcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKCFtYXhUaW1lb3V0SWQpIHtcbiAgICAgICAgbWF4VGltZW91dElkID0gc2V0VGltZW91dChtYXhEZWxheWVkLCByZW1haW5pbmcpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXNDYWxsZWQgJiYgdGltZW91dElkKSB7XG4gICAgICB0aW1lb3V0SWQgPSBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoIXRpbWVvdXRJZCAmJiB3YWl0ICE9PSBtYXhXYWl0KSB7XG4gICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGRlbGF5ZWQsIHdhaXQpO1xuICAgIH1cbiAgICBpZiAobGVhZGluZ0NhbGwpIHtcbiAgICAgIGlzQ2FsbGVkID0gdHJ1ZTtcbiAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XG4gICAgfVxuICAgIGlmIChpc0NhbGxlZCAmJiAhdGltZW91dElkICYmICFtYXhUaW1lb3V0SWQpIHtcbiAgICAgIGFyZ3MgPSB0aGlzQXJnID0gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBkZWJvdW5jZTtcbiIsIi8qKlxuICogTG8tRGFzaCAyLjQuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cDovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBtb2Rlcm4gZXhwb3J0cz1cIm5wbVwiIC1vIC4vbnBtL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuNS4yIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG52YXIgaXNOYXRpdmUgPSByZXF1aXJlKCdsb2Rhc2guX2lzbmF0aXZlJyk7XG5cbi8qKlxuICogR2V0cyB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0aGF0IGhhdmUgZWxhcHNlZCBzaW5jZSB0aGUgVW5peCBlcG9jaFxuICogKDEgSmFudWFyeSAxOTcwIDAwOjAwOjAwIFVUQykuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBVdGlsaXRpZXNcbiAqIEBleGFtcGxlXG4gKlxuICogdmFyIHN0YW1wID0gXy5ub3coKTtcbiAqIF8uZGVmZXIoZnVuY3Rpb24oKSB7IGNvbnNvbGUubG9nKF8ubm93KCkgLSBzdGFtcCk7IH0pO1xuICogLy8gPT4gbG9ncyB0aGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBpdCB0b29rIGZvciB0aGUgZGVmZXJyZWQgZnVuY3Rpb24gdG8gYmUgY2FsbGVkXG4gKi9cbnZhciBub3cgPSBpc05hdGl2ZShub3cgPSBEYXRlLm5vdykgJiYgbm93IHx8IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5vdztcbiIsIi8qKlxuICogTG8tRGFzaCAyLjQuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cDovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBtb2Rlcm4gZXhwb3J0cz1cIm5wbVwiIC1vIC4vbnBtL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuNS4yIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG5cbi8qKiBVc2VkIGZvciBuYXRpdmUgbWV0aG9kIHJlZmVyZW5jZXMgKi9cbnZhciBvYmplY3RQcm90byA9IE9iamVjdC5wcm90b3R5cGU7XG5cbi8qKiBVc2VkIHRvIHJlc29sdmUgdGhlIGludGVybmFsIFtbQ2xhc3NdXSBvZiB2YWx1ZXMgKi9cbnZhciB0b1N0cmluZyA9IG9iamVjdFByb3RvLnRvU3RyaW5nO1xuXG4vKiogVXNlZCB0byBkZXRlY3QgaWYgYSBtZXRob2QgaXMgbmF0aXZlICovXG52YXIgcmVOYXRpdmUgPSBSZWdFeHAoJ14nICtcbiAgU3RyaW5nKHRvU3RyaW5nKVxuICAgIC5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxdXFxcXF0vZywgJ1xcXFwkJicpXG4gICAgLnJlcGxhY2UoL3RvU3RyaW5nfCBmb3IgW15cXF1dKy9nLCAnLio/JykgKyAnJCdcbik7XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYSBuYXRpdmUgZnVuY3Rpb24uXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBgdmFsdWVgIGlzIGEgbmF0aXZlIGZ1bmN0aW9uLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIGlzTmF0aXZlKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ2Z1bmN0aW9uJyAmJiByZU5hdGl2ZS50ZXN0KHZhbHVlKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpc05hdGl2ZTtcbiIsIi8qKlxuICogTG8tRGFzaCAyLjQuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cDovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBtb2Rlcm4gZXhwb3J0cz1cIm5wbVwiIC1vIC4vbnBtL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuNS4yIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYSBmdW5jdGlvbi5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IE9iamVjdHNcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBgdmFsdWVgIGlzIGEgZnVuY3Rpb24sIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc0Z1bmN0aW9uKF8pO1xuICogLy8gPT4gdHJ1ZVxuICovXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ2Z1bmN0aW9uJztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpc0Z1bmN0aW9uO1xuIiwiLyoqXG4gKiBMby1EYXNoIDIuNC4xIChDdXN0b20gQnVpbGQpIDxodHRwOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIG1vZGVybiBleHBvcnRzPVwibnBtXCIgLW8gLi9ucG0vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxMyBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS41LjIgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHA6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cbnZhciBvYmplY3RUeXBlcyA9IHJlcXVpcmUoJ2xvZGFzaC5fb2JqZWN0dHlwZXMnKTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyB0aGUgbGFuZ3VhZ2UgdHlwZSBvZiBPYmplY3QuXG4gKiAoZS5nLiBhcnJheXMsIGZ1bmN0aW9ucywgb2JqZWN0cywgcmVnZXhlcywgYG5ldyBOdW1iZXIoMClgLCBhbmQgYG5ldyBTdHJpbmcoJycpYClcbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IE9iamVjdHNcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBgdmFsdWVgIGlzIGFuIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzT2JqZWN0KHt9KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0KFsxLCAyLCAzXSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdCgxKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gIC8vIGNoZWNrIGlmIHRoZSB2YWx1ZSBpcyB0aGUgRUNNQVNjcmlwdCBsYW5ndWFnZSB0eXBlIG9mIE9iamVjdFxuICAvLyBodHRwOi8vZXM1LmdpdGh1Yi5pby8jeDhcbiAgLy8gYW5kIGF2b2lkIGEgVjggYnVnXG4gIC8vIGh0dHA6Ly9jb2RlLmdvb2dsZS5jb20vcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTIyOTFcbiAgcmV0dXJuICEhKHZhbHVlICYmIG9iamVjdFR5cGVzW3R5cGVvZiB2YWx1ZV0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlzT2JqZWN0O1xuIiwiLyoqXG4gKiBMby1EYXNoIDIuNC4xIChDdXN0b20gQnVpbGQpIDxodHRwOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIG1vZGVybiBleHBvcnRzPVwibnBtXCIgLW8gLi9ucG0vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxMyBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS41LjIgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHA6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cblxuLyoqIFVzZWQgdG8gZGV0ZXJtaW5lIGlmIHZhbHVlcyBhcmUgb2YgdGhlIGxhbmd1YWdlIHR5cGUgT2JqZWN0ICovXG52YXIgb2JqZWN0VHlwZXMgPSB7XG4gICdib29sZWFuJzogZmFsc2UsXG4gICdmdW5jdGlvbic6IHRydWUsXG4gICdvYmplY3QnOiB0cnVlLFxuICAnbnVtYmVyJzogZmFsc2UsXG4gICdzdHJpbmcnOiBmYWxzZSxcbiAgJ3VuZGVmaW5lZCc6IGZhbHNlXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG9iamVjdFR5cGVzO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBkcmF3QnVmZmVyO1xuXG5mdW5jdGlvbiBkcmF3QnVmZmVyIChjYW52YXMsIGJ1ZmZlciwgY29sb3IpIHtcbiAgdmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICB2YXIgd2lkdGggPSBjYW52YXMud2lkdGg7XG4gIHZhciBoZWlnaHQgPSBjYW52YXMuaGVpZ2h0O1xuICBpZiAoY29sb3IpIHtcbiAgICBjdHguZmlsbFN0eWxlID0gY29sb3I7XG4gIH1cblxuICAgIHZhciBkYXRhID0gYnVmZmVyLmdldENoYW5uZWxEYXRhKCAwICk7XG4gICAgdmFyIHN0ZXAgPSBNYXRoLmNlaWwoIGRhdGEubGVuZ3RoIC8gd2lkdGggKTtcbiAgICB2YXIgYW1wID0gaGVpZ2h0IC8gMjtcbiAgICBmb3IodmFyIGk9MDsgaSA8IHdpZHRoOyBpKyspe1xuICAgICAgICB2YXIgbWluID0gMS4wO1xuICAgICAgICB2YXIgbWF4ID0gLTEuMDtcbiAgICAgICAgZm9yICh2YXIgaj0wOyBqPHN0ZXA7IGorKykge1xuICAgICAgICAgICAgdmFyIGRhdHVtID0gZGF0YVsoaSpzdGVwKStqXTtcbiAgICAgICAgICAgIGlmIChkYXR1bSA8IG1pbilcbiAgICAgICAgICAgICAgICBtaW4gPSBkYXR1bTtcbiAgICAgICAgICAgIGlmIChkYXR1bSA+IG1heClcbiAgICAgICAgICAgICAgICBtYXggPSBkYXR1bTtcbiAgICAgICAgfVxuICAgICAgY3R4LmZpbGxSZWN0KGksKDErbWluKSphbXAsMSxNYXRoLm1heCgxLChtYXgtbWluKSphbXApKTtcbiAgICB9XG59IiwidmFyIHdvcmsgPSByZXF1aXJlKCd3ZWJ3b3JraWZ5Jyk7XG52YXIgdyA9IHdvcmsocmVxdWlyZSgnLi93b3JrLmpzJykpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgZW5jb2RlV0FWOiBlbmNvZGVXQVYsXG4gIGdldERvd25sb2FkTGluazogZ2V0RG93bmxvYWRMaW5rXG59O1xuXG5mdW5jdGlvbiBvbkNvbXBsZXRlKGNiKSB7XG4gIHcuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uKGV2KSB7XG4gICAgICBjYihldi5kYXRhKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGVuY29kZVdBVihjaGFubmVsQnVmZmVyQXJyYXksIHNhbXBsZVJhdGUsIGNiKSB7XG4gIHcucG9zdE1lc3NhZ2Uoe1xuICAgIGxlZnRCdWY6IGNoYW5uZWxCdWZmZXJBcnJheVswXSxcbiAgICByaWdodEJ1ZjogY2hhbm5lbEJ1ZmZlckFycmF5WzFdLFxuICAgIHNhbXBsZVJhdGU6IHNhbXBsZVJhdGVcbiAgfSk7XG5cbiAgb25Db21wbGV0ZShjYik7XG59XG5cbmZ1bmN0aW9uIGdldERvd25sb2FkTGluayhjYikge1xuICBvbkNvbXBsZXRlKGZ1bmN0aW9uKGJsb2IpIHtcbiAgICB2YXIgdXJsID0gKHdpbmRvdy5VUkwgfHwgd2luZG93LndlYmtpdFVSTCkuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgIGNiKHVybCk7XG4gIH0pXG59IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzZWxmKSB7XG4gIHNlbGYuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uKGV2KSB7XG4gICAgY29uc29sZS5sb2coJ3dvcmtlcicsIGV2KTtcbiAgICB2YXIgYmxvYiA9IGV4cG9ydFdBVihldi5kYXRhLmxlZnRCdWYsIGV2LmRhdGEucmlnaHRCdWYsIGV2LmRhdGEuc2FtcGxlUmF0ZSk7XG4gICAgc2VsZi5wb3N0TWVzc2FnZShibG9iKTtcbiAgfS5iaW5kKHNlbGYpKTtcbn1cblxuZnVuY3Rpb24gZXhwb3J0V0FWKGxlZnRCdWZmZXIsIHJpZ2h0QnVmZmVyLCBzYW1wbGVSYXRlKSB7XG4gIHZhciBpbnRlcmxlYXZlZCA9IGludGVybGVhdmUobGVmdEJ1ZmZlciwgcmlnaHRCdWZmZXIpO1xuICB2YXIgZGF0YXZpZXcgPSBlbmNvZGVXQVYoaW50ZXJsZWF2ZWQsIHNhbXBsZVJhdGUpO1xuICB2YXIgYXVkaW9CbG9iID0gbmV3IEJsb2IoW2RhdGF2aWV3XSwge3R5cGU6IFwiYXVkaW8vd2F2XCJ9KTtcblxuICB0aGlzLnBvc3RNZXNzYWdlKGF1ZGlvQmxvYik7XG59XG5cbmZ1bmN0aW9uIG1lcmdlQnVmZmVycyhyZWNCdWZmZXJzLCByZWNMZW5ndGgpe1xuICB2YXIgcmVzdWx0ID0gbmV3IEZsb2F0MzJBcnJheShyZWNMZW5ndGgpO1xuICB2YXIgb2Zmc2V0ID0gMDtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHJlY0J1ZmZlcnMubGVuZ3RoOyBpKyspe1xuICAgIHJlc3VsdC5zZXQocmVjQnVmZmVyc1tpXSwgb2Zmc2V0KTtcbiAgICBvZmZzZXQgKz0gcmVjQnVmZmVyc1tpXS5sZW5ndGg7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBpbnRlcmxlYXZlKGxlZnRCdWZmZXIsIHJpZ2h0QnVmZmVyKXtcbiAgdmFyIGxlbmd0aCA9IGxlZnRCdWZmZXIubGVuZ3RoICsgcmlnaHRCdWZmZXIubGVuZ3RoO1xuICB2YXIgcmVzdWx0ID0gbmV3IEZsb2F0MzJBcnJheShsZW5ndGgpO1xuXG4gIHZhciBpZHggPSAwLFxuICAgICAgYnVmSWR4ID0gMDtcblxuICB3aGlsZSAoaWR4IDwgbGVuZ3RoKSB7XG4gICAgLy8gaWR4KytcbiAgICByZXN1bHRbaWR4KytdID0gbGVmdEJ1ZmZlcltidWZJZHhdO1xuICAgIHJlc3VsdFtpZHgrK10gPSByaWdodEJ1ZmZlcltidWZJZHhdO1xuICAgIGJ1ZklkeCsrO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gd3JpdGVTdHJpbmcodmlldywgb2Zmc2V0LCBzdHJpbmcpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHJpbmcubGVuZ3RoOyBpKyspe1xuICAgIHZpZXcuc2V0VWludDgob2Zmc2V0ICsgaSwgc3RyaW5nLmNoYXJDb2RlQXQoaSkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGVuY29kZVdBVihzYW1wbGVzLCBzYW1wbGVSYXRlKXtcbiAgdmFyIGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcig0NCArIHNhbXBsZXMubGVuZ3RoICogMik7XG4gIHZhciB2aWV3ID0gbmV3IERhdGFWaWV3KGJ1ZmZlcik7XG5cbiAgLyogUklGRiBpZGVudGlmaWVyICovXG4gIHdyaXRlU3RyaW5nKHZpZXcsIDAsICdSSUZGJyk7XG4gIC8qIFJJRkYgY2h1bmsgbGVuZ3RoICovXG4gIHZpZXcuc2V0VWludDMyKDQsIDM2ICsgc2FtcGxlcy5sZW5ndGggKiAyLCB0cnVlKTtcbiAgLyogUklGRiB0eXBlICovXG4gIHdyaXRlU3RyaW5nKHZpZXcsIDgsICdXQVZFJyk7XG4gIC8qIGZvcm1hdCBjaHVuayBpZGVudGlmaWVyICovXG4gIHdyaXRlU3RyaW5nKHZpZXcsIDEyLCAnZm10ICcpO1xuICAvKiBmb3JtYXQgY2h1bmsgbGVuZ3RoICovXG4gIHZpZXcuc2V0VWludDMyKDE2LCAxNiwgdHJ1ZSk7XG4gIC8qIHNhbXBsZSBmb3JtYXQgKHJhdykgKi9cbiAgdmlldy5zZXRVaW50MTYoMjAsIDEsIHRydWUpO1xuICAvKiBjaGFubmVsIGNvdW50ICovXG4gIHZpZXcuc2V0VWludDE2KDIyLCAyLCB0cnVlKTtcbiAgLyogc2FtcGxlIHJhdGUgKi9cbiAgdmlldy5zZXRVaW50MzIoMjQsIHNhbXBsZVJhdGUsIHRydWUpO1xuICAvKiBieXRlIHJhdGUgKHNhbXBsZSByYXRlICogYmxvY2sgYWxpZ24pICovXG4gIHZpZXcuc2V0VWludDMyKDI4LCBzYW1wbGVSYXRlICogNCwgdHJ1ZSk7XG4gIC8qIGJsb2NrIGFsaWduIChjaGFubmVsIGNvdW50ICogYnl0ZXMgcGVyIHNhbXBsZSkgKi9cbiAgdmlldy5zZXRVaW50MTYoMzIsIDQsIHRydWUpO1xuICAvKiBiaXRzIHBlciBzYW1wbGUgKi9cbiAgdmlldy5zZXRVaW50MTYoMzQsIDE2LCB0cnVlKTtcbiAgLyogZGF0YSBjaHVuayBpZGVudGlmaWVyICovXG4gIHdyaXRlU3RyaW5nKHZpZXcsIDM2LCAnZGF0YScpO1xuICAvKiBkYXRhIGNodW5rIGxlbmd0aCAqL1xuICB2aWV3LnNldFVpbnQzMig0MCwgc2FtcGxlcy5sZW5ndGggKiAyLCB0cnVlKTtcblxuICBmbG9hdFRvMTZCaXRQQ00odmlldywgNDQsIHNhbXBsZXMpO1xuXG4gIHJldHVybiB2aWV3O1xufVxuXG5mdW5jdGlvbiBmbG9hdFRvMTZCaXRQQ00ob3V0cHV0LCBvZmZzZXQsIGlucHV0KXtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBpbnB1dC5sZW5ndGg7IGkrKywgb2Zmc2V0Kz0yKXtcbiAgICB2YXIgcyA9IE1hdGgubWF4KC0xLCBNYXRoLm1pbigxLCBpbnB1dFtpXSkpO1xuICAgIG91dHB1dC5zZXRJbnQxNihvZmZzZXQsIHMgPCAwID8gcyAqIDB4ODAwMCA6IHMgKiAweDdGRkYsIHRydWUpO1xuICB9XG59XG4iLCJ2YXIgc3BsaXQgPSByZXF1aXJlKCdicm93c2VyLXNwbGl0JylcbnZhciBDbGFzc0xpc3QgPSByZXF1aXJlKCdjbGFzcy1saXN0JylcbnJlcXVpcmUoJ2h0bWwtZWxlbWVudCcpXG5cbmZ1bmN0aW9uIGNvbnRleHQgKCkge1xuXG4gIHZhciBjbGVhbnVwRnVuY3MgPSBbXVxuXG4gIGZ1bmN0aW9uIGgoKSB7XG4gICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyksIGUgPSBudWxsXG4gICAgZnVuY3Rpb24gaXRlbSAobCkge1xuICAgICAgdmFyIHJcbiAgICAgIGZ1bmN0aW9uIHBhcnNlQ2xhc3MgKHN0cmluZykge1xuICAgICAgICB2YXIgbSA9IHNwbGl0KHN0cmluZywgLyhbXFwuI10/W2EtekEtWjAtOV86LV0rKS8pXG4gICAgICAgIGlmKC9eXFwufCMvLnRlc3QobVsxXSkpXG4gICAgICAgICAgZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgICAgIGZvckVhY2gobSwgZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICB2YXIgcyA9IHYuc3Vic3RyaW5nKDEsdi5sZW5ndGgpXG4gICAgICAgICAgaWYoIXYpIHJldHVyblxuICAgICAgICAgIGlmKCFlKVxuICAgICAgICAgICAgZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodilcbiAgICAgICAgICBlbHNlIGlmICh2WzBdID09PSAnLicpXG4gICAgICAgICAgICBDbGFzc0xpc3QoZSkuYWRkKHMpXG4gICAgICAgICAgZWxzZSBpZiAodlswXSA9PT0gJyMnKVxuICAgICAgICAgICAgZS5zZXRBdHRyaWJ1dGUoJ2lkJywgcylcbiAgICAgICAgfSlcbiAgICAgIH1cblxuICAgICAgaWYobCA9PSBudWxsKVxuICAgICAgICA7XG4gICAgICBlbHNlIGlmKCdzdHJpbmcnID09PSB0eXBlb2YgbCkge1xuICAgICAgICBpZighZSlcbiAgICAgICAgICBwYXJzZUNsYXNzKGwpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBlLmFwcGVuZENoaWxkKHIgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShsKSlcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYoJ251bWJlcicgPT09IHR5cGVvZiBsXG4gICAgICAgIHx8ICdib29sZWFuJyA9PT0gdHlwZW9mIGxcbiAgICAgICAgfHwgbCBpbnN0YW5jZW9mIERhdGVcbiAgICAgICAgfHwgbCBpbnN0YW5jZW9mIFJlZ0V4cCApIHtcbiAgICAgICAgICBlLmFwcGVuZENoaWxkKHIgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShsLnRvU3RyaW5nKCkpKVxuICAgICAgfVxuICAgICAgLy90aGVyZSBtaWdodCBiZSBhIGJldHRlciB3YXkgdG8gaGFuZGxlIHRoaXMuLi5cbiAgICAgIGVsc2UgaWYgKGlzQXJyYXkobCkpXG4gICAgICAgIGZvckVhY2gobCwgaXRlbSlcbiAgICAgIGVsc2UgaWYoaXNOb2RlKGwpKVxuICAgICAgICBlLmFwcGVuZENoaWxkKHIgPSBsKVxuICAgICAgZWxzZSBpZihsIGluc3RhbmNlb2YgVGV4dClcbiAgICAgICAgZS5hcHBlbmRDaGlsZChyID0gbClcbiAgICAgIGVsc2UgaWYgKCdvYmplY3QnID09PSB0eXBlb2YgbCkge1xuICAgICAgICBmb3IgKHZhciBrIGluIGwpIHtcbiAgICAgICAgICBpZignZnVuY3Rpb24nID09PSB0eXBlb2YgbFtrXSkge1xuICAgICAgICAgICAgaWYoL15vblxcdysvLnRlc3QoaykpIHtcbiAgICAgICAgICAgICAgaWYgKGUuYWRkRXZlbnRMaXN0ZW5lcil7XG4gICAgICAgICAgICAgICAgZS5hZGRFdmVudExpc3RlbmVyKGsuc3Vic3RyaW5nKDIpLCBsW2tdLCBmYWxzZSlcbiAgICAgICAgICAgICAgICBjbGVhbnVwRnVuY3MucHVzaChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgZS5yZW1vdmVFdmVudExpc3RlbmVyKGsuc3Vic3RyaW5nKDIpLCBsW2tdLCBmYWxzZSlcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgICBlLmF0dGFjaEV2ZW50KGssIGxba10pXG4gICAgICAgICAgICAgICAgY2xlYW51cEZ1bmNzLnB1c2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgIGUuZGV0YWNoRXZlbnQoaywgbFtrXSlcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBvYnNlcnZhYmxlXG4gICAgICAgICAgICAgIGVba10gPSBsW2tdKClcbiAgICAgICAgICAgICAgY2xlYW51cEZ1bmNzLnB1c2gobFtrXShmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgICAgIGVba10gPSB2XG4gICAgICAgICAgICAgIH0pKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIGlmKGsgPT09ICdzdHlsZScpIHtcbiAgICAgICAgICAgIGlmKCdzdHJpbmcnID09PSB0eXBlb2YgbFtrXSkge1xuICAgICAgICAgICAgICBlLnN0eWxlLmNzc1RleHQgPSBsW2tdXG4gICAgICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICAgZm9yICh2YXIgcyBpbiBsW2tdKSAoZnVuY3Rpb24ocywgdikge1xuICAgICAgICAgICAgICAgIGlmKCdmdW5jdGlvbicgPT09IHR5cGVvZiB2KSB7XG4gICAgICAgICAgICAgICAgICAvLyBvYnNlcnZhYmxlXG4gICAgICAgICAgICAgICAgICBlLnN0eWxlLnNldFByb3BlcnR5KHMsIHYoKSlcbiAgICAgICAgICAgICAgICAgIGNsZWFudXBGdW5jcy5wdXNoKHYoZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgICAgICAgICBlLnN0eWxlLnNldFByb3BlcnR5KHMsIHZhbClcbiAgICAgICAgICAgICAgICAgIH0pKVxuICAgICAgICAgICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgICAgICAgZS5zdHlsZS5zZXRQcm9wZXJ0eShzLCBsW2tdW3NdKVxuICAgICAgICAgICAgICB9KShzLCBsW2tdW3NdKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAoay5zdWJzdHIoMCwgNSkgPT09IFwiZGF0YS1cIikge1xuICAgICAgICAgICAgZS5zZXRBdHRyaWJ1dGUoaywgbFtrXSlcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZVtrXSA9IGxba11cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGwpIHtcbiAgICAgICAgLy9hc3N1bWUgaXQncyBhbiBvYnNlcnZhYmxlIVxuICAgICAgICB2YXIgdiA9IGwoKVxuICAgICAgICBlLmFwcGVuZENoaWxkKHIgPSBpc05vZGUodikgPyB2IDogZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUodikpXG5cbiAgICAgICAgY2xlYW51cEZ1bmNzLnB1c2gobChmdW5jdGlvbiAodikge1xuICAgICAgICAgIGlmKGlzTm9kZSh2KSAmJiByLnBhcmVudEVsZW1lbnQpXG4gICAgICAgICAgICByLnBhcmVudEVsZW1lbnQucmVwbGFjZUNoaWxkKHYsIHIpLCByID0gdlxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHIudGV4dENvbnRlbnQgPSB2XG4gICAgICAgIH0pKVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gclxuICAgIH1cbiAgICB3aGlsZShhcmdzLmxlbmd0aClcbiAgICAgIGl0ZW0oYXJncy5zaGlmdCgpKVxuXG4gICAgcmV0dXJuIGVcbiAgfVxuXG4gIGguY2xlYW51cCA9IGZ1bmN0aW9uICgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNsZWFudXBGdW5jcy5sZW5ndGg7IGkrKyl7XG4gICAgICBjbGVhbnVwRnVuY3NbaV0oKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBoXG59XG5cbnZhciBoID0gbW9kdWxlLmV4cG9ydHMgPSBjb250ZXh0KClcbmguY29udGV4dCA9IGNvbnRleHRcblxuZnVuY3Rpb24gaXNOb2RlIChlbCkge1xuICByZXR1cm4gZWwgJiYgZWwubm9kZU5hbWUgJiYgZWwubm9kZVR5cGVcbn1cblxuZnVuY3Rpb24gaXNUZXh0IChlbCkge1xuICByZXR1cm4gZWwgJiYgZWwubm9kZU5hbWUgPT09ICcjdGV4dCcgJiYgZWwubm9kZVR5cGUgPT0gM1xufVxuXG5mdW5jdGlvbiBmb3JFYWNoIChhcnIsIGZuKSB7XG4gIGlmIChhcnIuZm9yRWFjaCkgcmV0dXJuIGFyci5mb3JFYWNoKGZuKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykgZm4oYXJyW2ldLCBpKVxufVxuXG5mdW5jdGlvbiBpc0FycmF5IChhcnIpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhcnIpID09ICdbb2JqZWN0IEFycmF5XSdcbn1cbiIsIi8qIVxuICogQ3Jvc3MtQnJvd3NlciBTcGxpdCAxLjEuMVxuICogQ29weXJpZ2h0IDIwMDctMjAxMiBTdGV2ZW4gTGV2aXRoYW4gPHN0ZXZlbmxldml0aGFuLmNvbT5cbiAqIEF2YWlsYWJsZSB1bmRlciB0aGUgTUlUIExpY2Vuc2VcbiAqIEVDTUFTY3JpcHQgY29tcGxpYW50LCB1bmlmb3JtIGNyb3NzLWJyb3dzZXIgc3BsaXQgbWV0aG9kXG4gKi9cblxuLyoqXG4gKiBTcGxpdHMgYSBzdHJpbmcgaW50byBhbiBhcnJheSBvZiBzdHJpbmdzIHVzaW5nIGEgcmVnZXggb3Igc3RyaW5nIHNlcGFyYXRvci4gTWF0Y2hlcyBvZiB0aGVcbiAqIHNlcGFyYXRvciBhcmUgbm90IGluY2x1ZGVkIGluIHRoZSByZXN1bHQgYXJyYXkuIEhvd2V2ZXIsIGlmIGBzZXBhcmF0b3JgIGlzIGEgcmVnZXggdGhhdCBjb250YWluc1xuICogY2FwdHVyaW5nIGdyb3VwcywgYmFja3JlZmVyZW5jZXMgYXJlIHNwbGljZWQgaW50byB0aGUgcmVzdWx0IGVhY2ggdGltZSBgc2VwYXJhdG9yYCBpcyBtYXRjaGVkLlxuICogRml4ZXMgYnJvd3NlciBidWdzIGNvbXBhcmVkIHRvIHRoZSBuYXRpdmUgYFN0cmluZy5wcm90b3R5cGUuc3BsaXRgIGFuZCBjYW4gYmUgdXNlZCByZWxpYWJseVxuICogY3Jvc3MtYnJvd3Nlci5cbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHIgU3RyaW5nIHRvIHNwbGl0LlxuICogQHBhcmFtIHtSZWdFeHB8U3RyaW5nfSBzZXBhcmF0b3IgUmVnZXggb3Igc3RyaW5nIHRvIHVzZSBmb3Igc2VwYXJhdGluZyB0aGUgc3RyaW5nLlxuICogQHBhcmFtIHtOdW1iZXJ9IFtsaW1pdF0gTWF4aW11bSBudW1iZXIgb2YgaXRlbXMgdG8gaW5jbHVkZSBpbiB0aGUgcmVzdWx0IGFycmF5LlxuICogQHJldHVybnMge0FycmF5fSBBcnJheSBvZiBzdWJzdHJpbmdzLlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBCYXNpYyB1c2VcbiAqIHNwbGl0KCdhIGIgYyBkJywgJyAnKTtcbiAqIC8vIC0+IFsnYScsICdiJywgJ2MnLCAnZCddXG4gKlxuICogLy8gV2l0aCBsaW1pdFxuICogc3BsaXQoJ2EgYiBjIGQnLCAnICcsIDIpO1xuICogLy8gLT4gWydhJywgJ2InXVxuICpcbiAqIC8vIEJhY2tyZWZlcmVuY2VzIGluIHJlc3VsdCBhcnJheVxuICogc3BsaXQoJy4ud29yZDEgd29yZDIuLicsIC8oW2Etel0rKShcXGQrKS9pKTtcbiAqIC8vIC0+IFsnLi4nLCAnd29yZCcsICcxJywgJyAnLCAnd29yZCcsICcyJywgJy4uJ11cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24gc3BsaXQodW5kZWYpIHtcblxuICB2YXIgbmF0aXZlU3BsaXQgPSBTdHJpbmcucHJvdG90eXBlLnNwbGl0LFxuICAgIGNvbXBsaWFudEV4ZWNOcGNnID0gLygpPz8vLmV4ZWMoXCJcIilbMV0gPT09IHVuZGVmLFxuICAgIC8vIE5QQ0c6IG5vbnBhcnRpY2lwYXRpbmcgY2FwdHVyaW5nIGdyb3VwXG4gICAgc2VsZjtcblxuICBzZWxmID0gZnVuY3Rpb24oc3RyLCBzZXBhcmF0b3IsIGxpbWl0KSB7XG4gICAgLy8gSWYgYHNlcGFyYXRvcmAgaXMgbm90IGEgcmVnZXgsIHVzZSBgbmF0aXZlU3BsaXRgXG4gICAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChzZXBhcmF0b3IpICE9PSBcIltvYmplY3QgUmVnRXhwXVwiKSB7XG4gICAgICByZXR1cm4gbmF0aXZlU3BsaXQuY2FsbChzdHIsIHNlcGFyYXRvciwgbGltaXQpO1xuICAgIH1cbiAgICB2YXIgb3V0cHV0ID0gW10sXG4gICAgICBmbGFncyA9IChzZXBhcmF0b3IuaWdub3JlQ2FzZSA/IFwiaVwiIDogXCJcIikgKyAoc2VwYXJhdG9yLm11bHRpbGluZSA/IFwibVwiIDogXCJcIikgKyAoc2VwYXJhdG9yLmV4dGVuZGVkID8gXCJ4XCIgOiBcIlwiKSArIC8vIFByb3Bvc2VkIGZvciBFUzZcbiAgICAgIChzZXBhcmF0b3Iuc3RpY2t5ID8gXCJ5XCIgOiBcIlwiKSxcbiAgICAgIC8vIEZpcmVmb3ggMytcbiAgICAgIGxhc3RMYXN0SW5kZXggPSAwLFxuICAgICAgLy8gTWFrZSBgZ2xvYmFsYCBhbmQgYXZvaWQgYGxhc3RJbmRleGAgaXNzdWVzIGJ5IHdvcmtpbmcgd2l0aCBhIGNvcHlcbiAgICAgIHNlcGFyYXRvciA9IG5ldyBSZWdFeHAoc2VwYXJhdG9yLnNvdXJjZSwgZmxhZ3MgKyBcImdcIiksXG4gICAgICBzZXBhcmF0b3IyLCBtYXRjaCwgbGFzdEluZGV4LCBsYXN0TGVuZ3RoO1xuICAgIHN0ciArPSBcIlwiOyAvLyBUeXBlLWNvbnZlcnRcbiAgICBpZiAoIWNvbXBsaWFudEV4ZWNOcGNnKSB7XG4gICAgICAvLyBEb2Vzbid0IG5lZWQgZmxhZ3MgZ3ksIGJ1dCB0aGV5IGRvbid0IGh1cnRcbiAgICAgIHNlcGFyYXRvcjIgPSBuZXcgUmVnRXhwKFwiXlwiICsgc2VwYXJhdG9yLnNvdXJjZSArIFwiJCg/IVxcXFxzKVwiLCBmbGFncyk7XG4gICAgfVxuICAgIC8qIFZhbHVlcyBmb3IgYGxpbWl0YCwgcGVyIHRoZSBzcGVjOlxuICAgICAqIElmIHVuZGVmaW5lZDogNDI5NDk2NzI5NSAvLyBNYXRoLnBvdygyLCAzMikgLSAxXG4gICAgICogSWYgMCwgSW5maW5pdHksIG9yIE5hTjogMFxuICAgICAqIElmIHBvc2l0aXZlIG51bWJlcjogbGltaXQgPSBNYXRoLmZsb29yKGxpbWl0KTsgaWYgKGxpbWl0ID4gNDI5NDk2NzI5NSkgbGltaXQgLT0gNDI5NDk2NzI5NjtcbiAgICAgKiBJZiBuZWdhdGl2ZSBudW1iZXI6IDQyOTQ5NjcyOTYgLSBNYXRoLmZsb29yKE1hdGguYWJzKGxpbWl0KSlcbiAgICAgKiBJZiBvdGhlcjogVHlwZS1jb252ZXJ0LCB0aGVuIHVzZSB0aGUgYWJvdmUgcnVsZXNcbiAgICAgKi9cbiAgICBsaW1pdCA9IGxpbWl0ID09PSB1bmRlZiA/IC0xID4+PiAwIDogLy8gTWF0aC5wb3coMiwgMzIpIC0gMVxuICAgIGxpbWl0ID4+PiAwOyAvLyBUb1VpbnQzMihsaW1pdClcbiAgICB3aGlsZSAobWF0Y2ggPSBzZXBhcmF0b3IuZXhlYyhzdHIpKSB7XG4gICAgICAvLyBgc2VwYXJhdG9yLmxhc3RJbmRleGAgaXMgbm90IHJlbGlhYmxlIGNyb3NzLWJyb3dzZXJcbiAgICAgIGxhc3RJbmRleCA9IG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoO1xuICAgICAgaWYgKGxhc3RJbmRleCA+IGxhc3RMYXN0SW5kZXgpIHtcbiAgICAgICAgb3V0cHV0LnB1c2goc3RyLnNsaWNlKGxhc3RMYXN0SW5kZXgsIG1hdGNoLmluZGV4KSk7XG4gICAgICAgIC8vIEZpeCBicm93c2VycyB3aG9zZSBgZXhlY2AgbWV0aG9kcyBkb24ndCBjb25zaXN0ZW50bHkgcmV0dXJuIGB1bmRlZmluZWRgIGZvclxuICAgICAgICAvLyBub25wYXJ0aWNpcGF0aW5nIGNhcHR1cmluZyBncm91cHNcbiAgICAgICAgaWYgKCFjb21wbGlhbnRFeGVjTnBjZyAmJiBtYXRjaC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgbWF0Y2hbMF0ucmVwbGFjZShzZXBhcmF0b3IyLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aCAtIDI7IGkrKykge1xuICAgICAgICAgICAgICBpZiAoYXJndW1lbnRzW2ldID09PSB1bmRlZikge1xuICAgICAgICAgICAgICAgIG1hdGNoW2ldID0gdW5kZWY7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobWF0Y2gubGVuZ3RoID4gMSAmJiBtYXRjaC5pbmRleCA8IHN0ci5sZW5ndGgpIHtcbiAgICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShvdXRwdXQsIG1hdGNoLnNsaWNlKDEpKTtcbiAgICAgICAgfVxuICAgICAgICBsYXN0TGVuZ3RoID0gbWF0Y2hbMF0ubGVuZ3RoO1xuICAgICAgICBsYXN0TGFzdEluZGV4ID0gbGFzdEluZGV4O1xuICAgICAgICBpZiAob3V0cHV0Lmxlbmd0aCA+PSBsaW1pdCkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoc2VwYXJhdG9yLmxhc3RJbmRleCA9PT0gbWF0Y2guaW5kZXgpIHtcbiAgICAgICAgc2VwYXJhdG9yLmxhc3RJbmRleCsrOyAvLyBBdm9pZCBhbiBpbmZpbml0ZSBsb29wXG4gICAgICB9XG4gICAgfVxuICAgIGlmIChsYXN0TGFzdEluZGV4ID09PSBzdHIubGVuZ3RoKSB7XG4gICAgICBpZiAobGFzdExlbmd0aCB8fCAhc2VwYXJhdG9yLnRlc3QoXCJcIikpIHtcbiAgICAgICAgb3V0cHV0LnB1c2goXCJcIik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dC5wdXNoKHN0ci5zbGljZShsYXN0TGFzdEluZGV4KSk7XG4gICAgfVxuICAgIHJldHVybiBvdXRwdXQubGVuZ3RoID4gbGltaXQgPyBvdXRwdXQuc2xpY2UoMCwgbGltaXQpIDogb3V0cHV0O1xuICB9O1xuXG4gIHJldHVybiBzZWxmO1xufSkoKTtcbiIsIi8vIGNvbnRhaW5zLCBhZGQsIHJlbW92ZSwgdG9nZ2xlXG52YXIgaW5kZXhvZiA9IHJlcXVpcmUoJ2luZGV4b2YnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IENsYXNzTGlzdFxuXG5mdW5jdGlvbiBDbGFzc0xpc3QoZWxlbSkge1xuICAgIHZhciBjbCA9IGVsZW0uY2xhc3NMaXN0XG5cbiAgICBpZiAoY2wpIHtcbiAgICAgICAgcmV0dXJuIGNsXG4gICAgfVxuXG4gICAgdmFyIGNsYXNzTGlzdCA9IHtcbiAgICAgICAgYWRkOiBhZGRcbiAgICAgICAgLCByZW1vdmU6IHJlbW92ZVxuICAgICAgICAsIGNvbnRhaW5zOiBjb250YWluc1xuICAgICAgICAsIHRvZ2dsZTogdG9nZ2xlXG4gICAgICAgICwgdG9TdHJpbmc6ICR0b1N0cmluZ1xuICAgICAgICAsIGxlbmd0aDogMFxuICAgICAgICAsIGl0ZW06IGl0ZW1cbiAgICB9XG5cbiAgICByZXR1cm4gY2xhc3NMaXN0XG5cbiAgICBmdW5jdGlvbiBhZGQodG9rZW4pIHtcbiAgICAgICAgdmFyIGxpc3QgPSBnZXRUb2tlbnMoKVxuICAgICAgICBpZiAoaW5kZXhvZihsaXN0LCB0b2tlbikgPiAtMSkge1xuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgICAgbGlzdC5wdXNoKHRva2VuKVxuICAgICAgICBzZXRUb2tlbnMobGlzdClcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZW1vdmUodG9rZW4pIHtcbiAgICAgICAgdmFyIGxpc3QgPSBnZXRUb2tlbnMoKVxuICAgICAgICAgICAgLCBpbmRleCA9IGluZGV4b2YobGlzdCwgdG9rZW4pXG5cbiAgICAgICAgaWYgKGluZGV4ID09PSAtMSkge1xuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cblxuICAgICAgICBsaXN0LnNwbGljZShpbmRleCwgMSlcbiAgICAgICAgc2V0VG9rZW5zKGxpc3QpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29udGFpbnModG9rZW4pIHtcbiAgICAgICAgcmV0dXJuIGluZGV4b2YoZ2V0VG9rZW5zKCksIHRva2VuKSA+IC0xXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdG9nZ2xlKHRva2VuKSB7XG4gICAgICAgIGlmIChjb250YWlucyh0b2tlbikpIHtcbiAgICAgICAgICAgIHJlbW92ZSh0b2tlbilcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWRkKHRva2VuKVxuICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICR0b1N0cmluZygpIHtcbiAgICAgICAgcmV0dXJuIGVsZW0uY2xhc3NOYW1lXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXRlbShpbmRleCkge1xuICAgICAgICB2YXIgdG9rZW5zID0gZ2V0VG9rZW5zKClcbiAgICAgICAgcmV0dXJuIHRva2Vuc1tpbmRleF0gfHwgbnVsbFxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFRva2VucygpIHtcbiAgICAgICAgdmFyIGNsYXNzTmFtZSA9IGVsZW0uY2xhc3NOYW1lXG5cbiAgICAgICAgcmV0dXJuIGZpbHRlcihjbGFzc05hbWUuc3BsaXQoXCIgXCIpLCBpc1RydXRoeSlcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRUb2tlbnMobGlzdCkge1xuICAgICAgICB2YXIgbGVuZ3RoID0gbGlzdC5sZW5ndGhcblxuICAgICAgICBlbGVtLmNsYXNzTmFtZSA9IGxpc3Quam9pbihcIiBcIilcbiAgICAgICAgY2xhc3NMaXN0Lmxlbmd0aCA9IGxlbmd0aFxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY2xhc3NMaXN0W2ldID0gbGlzdFtpXVxuICAgICAgICB9XG5cbiAgICAgICAgZGVsZXRlIGxpc3RbbGVuZ3RoXVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZmlsdGVyIChhcnIsIGZuKSB7XG4gICAgdmFyIHJldCA9IFtdXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGZuKGFycltpXSkpIHJldC5wdXNoKGFycltpXSlcbiAgICB9XG4gICAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBpc1RydXRoeSh2YWx1ZSkge1xuICAgIHJldHVybiAhIXZhbHVlXG59XG4iLCJcbnZhciBpbmRleE9mID0gW10uaW5kZXhPZjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhcnIsIG9iail7XG4gIGlmIChpbmRleE9mKSByZXR1cm4gYXJyLmluZGV4T2Yob2JqKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoYXJyW2ldID09PSBvYmopIHJldHVybiBpO1xuICB9XG4gIHJldHVybiAtMTtcbn07IiwibW9kdWxlLmV4cG9ydHMgPSBtZXJnZUJ1ZmZlcnM7XG5cbmZ1bmN0aW9uIG1lcmdlQnVmZmVycyhidWZmZXJzLCBhYykge1xuICB2YXIgbWF4Q2hhbm5lbHMgPSAwO1xuICB2YXIgbWF4RHVyYXRpb24gPSAwO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ1ZmZlcnMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoYnVmZmVyc1tpXS5udW1iZXJPZkNoYW5uZWxzID4gbWF4Q2hhbm5lbHMpIHtcbiAgICAgIG1heENoYW5uZWxzID0gYnVmZmVyc1tpXS5udW1iZXJPZkNoYW5uZWxzO1xuICAgIH1cbiAgICBpZiAoYnVmZmVyc1tpXS5kdXJhdGlvbiA+IG1heER1cmF0aW9uKSB7XG4gICAgICBtYXhEdXJhdGlvbiA9IGJ1ZmZlcnNbaV0uZHVyYXRpb247XG4gICAgfVxuICB9XG4gIHZhciBvdXQgPSBhYy5jcmVhdGVCdWZmZXIobWF4Q2hhbm5lbHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhYy5zYW1wbGVSYXRlICogbWF4RHVyYXRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhYy5zYW1wbGVSYXRlKTtcblxuICBmb3IgKHZhciBqID0gMDsgaiA8IGJ1ZmZlcnMubGVuZ3RoOyBqKyspIHtcbiAgICBmb3IgKHZhciBzcmNDaGFubmVsID0gMDsgc3JjQ2hhbm5lbCA8IGJ1ZmZlcnNbal0ubnVtYmVyT2ZDaGFubmVsczsgc3JjQ2hhbm5lbCsrKSB7XG4gICAgICB2YXIgb3V0dCA9IG91dC5nZXRDaGFubmVsRGF0YShzcmNDaGFubmVsKTtcbiAgICAgIHZhciBpbm4gPSBidWZmZXJzW2pdLmdldENoYW5uZWxEYXRhKHNyY0NoYW5uZWwpO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpbm4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgb3V0dFtpXSArPSBpbm5baV07XG4gICAgICB9XG4gICAgICBvdXQuZ2V0Q2hhbm5lbERhdGEoc3JjQ2hhbm5lbCkuc2V0KG91dHQsIDApO1xuICAgIH1cbiAgfVxuICByZXR1cm4gb3V0O1xufSIsInZhciBub3cgPSByZXF1aXJlKCdwZXJmb3JtYW5jZS1ub3cnKVxuICAsIGdsb2JhbCA9IHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnID8ge30gOiB3aW5kb3dcbiAgLCB2ZW5kb3JzID0gWydtb3onLCAnd2Via2l0J11cbiAgLCBzdWZmaXggPSAnQW5pbWF0aW9uRnJhbWUnXG4gICwgcmFmID0gZ2xvYmFsWydyZXF1ZXN0JyArIHN1ZmZpeF1cbiAgLCBjYWYgPSBnbG9iYWxbJ2NhbmNlbCcgKyBzdWZmaXhdIHx8IGdsb2JhbFsnY2FuY2VsUmVxdWVzdCcgKyBzdWZmaXhdXG4gICwgaXNOYXRpdmUgPSB0cnVlXG5cbmZvcih2YXIgaSA9IDA7IGkgPCB2ZW5kb3JzLmxlbmd0aCAmJiAhcmFmOyBpKyspIHtcbiAgcmFmID0gZ2xvYmFsW3ZlbmRvcnNbaV0gKyAnUmVxdWVzdCcgKyBzdWZmaXhdXG4gIGNhZiA9IGdsb2JhbFt2ZW5kb3JzW2ldICsgJ0NhbmNlbCcgKyBzdWZmaXhdXG4gICAgICB8fCBnbG9iYWxbdmVuZG9yc1tpXSArICdDYW5jZWxSZXF1ZXN0JyArIHN1ZmZpeF1cbn1cblxuLy8gU29tZSB2ZXJzaW9ucyBvZiBGRiBoYXZlIHJBRiBidXQgbm90IGNBRlxuaWYoIXJhZiB8fCAhY2FmKSB7XG4gIGlzTmF0aXZlID0gZmFsc2VcblxuICB2YXIgbGFzdCA9IDBcbiAgICAsIGlkID0gMFxuICAgICwgcXVldWUgPSBbXVxuICAgICwgZnJhbWVEdXJhdGlvbiA9IDEwMDAgLyA2MFxuXG4gIHJhZiA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgaWYocXVldWUubGVuZ3RoID09PSAwKSB7XG4gICAgICB2YXIgX25vdyA9IG5vdygpXG4gICAgICAgICwgbmV4dCA9IE1hdGgubWF4KDAsIGZyYW1lRHVyYXRpb24gLSAoX25vdyAtIGxhc3QpKVxuICAgICAgbGFzdCA9IG5leHQgKyBfbm93XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgY3AgPSBxdWV1ZS5zbGljZSgwKVxuICAgICAgICAvLyBDbGVhciBxdWV1ZSBoZXJlIHRvIHByZXZlbnRcbiAgICAgICAgLy8gY2FsbGJhY2tzIGZyb20gYXBwZW5kaW5nIGxpc3RlbmVyc1xuICAgICAgICAvLyB0byB0aGUgY3VycmVudCBmcmFtZSdzIHF1ZXVlXG4gICAgICAgIHF1ZXVlLmxlbmd0aCA9IDBcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGNwLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYoIWNwW2ldLmNhbmNlbGxlZCkge1xuICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICBjcFtpXS5jYWxsYmFjayhsYXN0KVxuICAgICAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IHRocm93IGUgfSwgMClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sIE1hdGgucm91bmQobmV4dCkpXG4gICAgfVxuICAgIHF1ZXVlLnB1c2goe1xuICAgICAgaGFuZGxlOiArK2lkLFxuICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrLFxuICAgICAgY2FuY2VsbGVkOiBmYWxzZVxuICAgIH0pXG4gICAgcmV0dXJuIGlkXG4gIH1cblxuICBjYWYgPSBmdW5jdGlvbihoYW5kbGUpIHtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgcXVldWUubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmKHF1ZXVlW2ldLmhhbmRsZSA9PT0gaGFuZGxlKSB7XG4gICAgICAgIHF1ZXVlW2ldLmNhbmNlbGxlZCA9IHRydWVcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihmbikge1xuICAvLyBXcmFwIGluIGEgbmV3IGZ1bmN0aW9uIHRvIHByZXZlbnRcbiAgLy8gYGNhbmNlbGAgcG90ZW50aWFsbHkgYmVpbmcgYXNzaWduZWRcbiAgLy8gdG8gdGhlIG5hdGl2ZSByQUYgZnVuY3Rpb25cbiAgaWYoIWlzTmF0aXZlKSB7XG4gICAgcmV0dXJuIHJhZi5jYWxsKGdsb2JhbCwgZm4pXG4gIH1cbiAgcmV0dXJuIHJhZi5jYWxsKGdsb2JhbCwgZnVuY3Rpb24oKSB7XG4gICAgdHJ5e1xuICAgICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgIH0gY2F0Y2goZSkge1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgdGhyb3cgZSB9LCAwKVxuICAgIH1cbiAgfSlcbn1cbm1vZHVsZS5leHBvcnRzLmNhbmNlbCA9IGZ1bmN0aW9uKCkge1xuICBjYWYuYXBwbHkoZ2xvYmFsLCBhcmd1bWVudHMpXG59XG4iLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuLy8gR2VuZXJhdGVkIGJ5IENvZmZlZVNjcmlwdCAxLjYuM1xuKGZ1bmN0aW9uKCkge1xuICB2YXIgZ2V0TmFub1NlY29uZHMsIGhydGltZSwgbG9hZFRpbWU7XG5cbiAgaWYgKCh0eXBlb2YgcGVyZm9ybWFuY2UgIT09IFwidW5kZWZpbmVkXCIgJiYgcGVyZm9ybWFuY2UgIT09IG51bGwpICYmIHBlcmZvcm1hbmNlLm5vdykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgfTtcbiAgfSBlbHNlIGlmICgodHlwZW9mIHByb2Nlc3MgIT09IFwidW5kZWZpbmVkXCIgJiYgcHJvY2VzcyAhPT0gbnVsbCkgJiYgcHJvY2Vzcy5ocnRpbWUpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIChnZXROYW5vU2Vjb25kcygpIC0gbG9hZFRpbWUpIC8gMWU2O1xuICAgIH07XG4gICAgaHJ0aW1lID0gcHJvY2Vzcy5ocnRpbWU7XG4gICAgZ2V0TmFub1NlY29uZHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBocjtcbiAgICAgIGhyID0gaHJ0aW1lKCk7XG4gICAgICByZXR1cm4gaHJbMF0gKiAxZTkgKyBoclsxXTtcbiAgICB9O1xuICAgIGxvYWRUaW1lID0gZ2V0TmFub1NlY29uZHMoKTtcbiAgfSBlbHNlIGlmIChEYXRlLm5vdykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gRGF0ZS5ub3coKSAtIGxvYWRUaW1lO1xuICAgIH07XG4gICAgbG9hZFRpbWUgPSBEYXRlLm5vdygpO1xuICB9IGVsc2Uge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCkgLSBsb2FkVGltZTtcbiAgICB9O1xuICAgIGxvYWRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIH1cblxufSkuY2FsbCh0aGlzKTtcblxuLypcbi8vQCBzb3VyY2VNYXBwaW5nVVJMPXBlcmZvcm1hbmNlLW5vdy5tYXBcbiovXG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKCdfcHJvY2VzcycpKSIsbnVsbCwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH1cbiAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuTXV0YXRpb25PYnNlcnZlciA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93Lk11dGF0aW9uT2JzZXJ2ZXI7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgdmFyIHF1ZXVlID0gW107XG5cbiAgICBpZiAoY2FuTXV0YXRpb25PYnNlcnZlcikge1xuICAgICAgICB2YXIgaGlkZGVuRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgdmFyIG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHF1ZXVlTGlzdCA9IHF1ZXVlLnNsaWNlKCk7XG4gICAgICAgICAgICBxdWV1ZS5sZW5ndGggPSAwO1xuICAgICAgICAgICAgcXVldWVMaXN0LmZvckVhY2goZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBvYnNlcnZlci5vYnNlcnZlKGhpZGRlbkRpdiwgeyBhdHRyaWJ1dGVzOiB0cnVlIH0pO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgaWYgKCFxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBoaWRkZW5EaXYuc2V0QXR0cmlidXRlKCd5ZXMnLCAnbm8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsInZhciBidW5kbGVGbiA9IGFyZ3VtZW50c1szXTtcbnZhciBzb3VyY2VzID0gYXJndW1lbnRzWzRdO1xudmFyIGNhY2hlID0gYXJndW1lbnRzWzVdO1xuXG52YXIgc3RyaW5naWZ5ID0gSlNPTi5zdHJpbmdpZnk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgdmFyIGtleXMgPSBbXTtcbiAgICB2YXIgd2tleTtcbiAgICB2YXIgY2FjaGVLZXlzID0gT2JqZWN0LmtleXMoY2FjaGUpO1xuICAgIFxuICAgIGZvciAodmFyIGkgPSAwLCBsID0gY2FjaGVLZXlzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB2YXIga2V5ID0gY2FjaGVLZXlzW2ldO1xuICAgICAgICBpZiAoY2FjaGVba2V5XS5leHBvcnRzID09PSBmbikge1xuICAgICAgICAgICAgd2tleSA9IGtleTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIGlmICghd2tleSkge1xuICAgICAgICB3a2V5ID0gTWF0aC5mbG9vcihNYXRoLnBvdygxNiwgOCkgKiBNYXRoLnJhbmRvbSgpKS50b1N0cmluZygxNik7XG4gICAgICAgIHZhciB3Y2FjaGUgPSB7fTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBjYWNoZUtleXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIga2V5ID0gY2FjaGVLZXlzW2ldO1xuICAgICAgICAgICAgd2NhY2hlW2tleV0gPSBrZXk7XG4gICAgICAgIH1cbiAgICAgICAgc291cmNlc1t3a2V5XSA9IFtcbiAgICAgICAgICAgIEZ1bmN0aW9uKFsncmVxdWlyZScsJ21vZHVsZScsJ2V4cG9ydHMnXSwgJygnICsgZm4gKyAnKShzZWxmKScpLFxuICAgICAgICAgICAgd2NhY2hlXG4gICAgICAgIF07XG4gICAgfVxuICAgIHZhciBza2V5ID0gTWF0aC5mbG9vcihNYXRoLnBvdygxNiwgOCkgKiBNYXRoLnJhbmRvbSgpKS50b1N0cmluZygxNik7XG4gICAgXG4gICAgdmFyIHNjYWNoZSA9IHt9OyBzY2FjaGVbd2tleV0gPSB3a2V5O1xuICAgIHNvdXJjZXNbc2tleV0gPSBbXG4gICAgICAgIEZ1bmN0aW9uKFsncmVxdWlyZSddLCdyZXF1aXJlKCcgKyBzdHJpbmdpZnkod2tleSkgKyAnKShzZWxmKScpLFxuICAgICAgICBzY2FjaGVcbiAgICBdO1xuICAgIFxuICAgIHZhciBzcmMgPSAnKCcgKyBidW5kbGVGbiArICcpKHsnXG4gICAgICAgICsgT2JqZWN0LmtleXMoc291cmNlcykubWFwKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIHJldHVybiBzdHJpbmdpZnkoa2V5KSArICc6WydcbiAgICAgICAgICAgICAgICArIHNvdXJjZXNba2V5XVswXVxuICAgICAgICAgICAgICAgICsgJywnICsgc3RyaW5naWZ5KHNvdXJjZXNba2V5XVsxXSkgKyAnXSdcbiAgICAgICAgICAgIDtcbiAgICAgICAgfSkuam9pbignLCcpXG4gICAgICAgICsgJ30se30sWycgKyBzdHJpbmdpZnkoc2tleSkgKyAnXSknXG4gICAgO1xuICAgIHJldHVybiBuZXcgV29ya2VyKHdpbmRvdy5VUkwuY3JlYXRlT2JqZWN0VVJMKFxuICAgICAgICBuZXcgQmxvYihbc3JjXSwgeyB0eXBlOiAndGV4dC9qYXZhc2NyaXB0JyB9KVxuICAgICkpO1xufTtcbiIsInZhciByZXN1bHQgPSBbJyMzMEZGRDYnLFxuICAgICAgICAgICAgICAnIzcyRUVENicsXG4gICAgICAgICAgICAgICcjMURCRjlGJyxcbiAgICAgICAgICAgICAgJyM2NUYwQjknLFxuICAgICAgICAgICAgICAnIzU3RkM5MycsXG4gICAgICAgICAgICAgICcjOThGRkJFJyxcbiAgICAgICAgICAgICAgJyNBMEZGOTgnXTtcbnZhciBteUludGVydmFsO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgc3RhcnQ6IHN0YXJ0LFxuICBlbmQ6IGVuZFxufVxuXG5mdW5jdGlvbiBzdGFydChlbCwgaW50ZXJ2YWwpIHtcbiAgdmFyIGwgPSAwO1xuICBteUludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgIGwrKztcbiAgICAgICAgICAgICAgICAgaWYgKGwgPj0gcmVzdWx0Lmxlbmd0aCkgbCA9IDA7XG4gICAgICAgICAgICAgICAgIGVsLnN0eWxlLmNvbG9yID0gcmVzdWx0W2xdO1xuICAgICAgICAgICAgICAgfSwgaW50ZXJ2YWwpO1xufVxuXG5mdW5jdGlvbiBlbmQoKSB7XG4gIGNsZWFySW50ZXJ2YWwobXlJbnRlcnZhbCk7XG4gIG15SW50ZXJ2YWwgPSBudWxsO1xufSIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBjdXQ6IGN1dEJ1ZmZlcixcbiAgY29weTogY29weUJ1ZmZlcixcbiAgcGFzdGU6IHBhc3RlQnVmZmVyLFxuICByZXZlcnNlOiByZXZlcnNlQnVmZmVyXG59O1xuXG5mdW5jdGlvbiByZXZlcnNlQnVmZmVyKGJ1ZmZlciwgY2IpIHtcbiAgdmFyIGNoYW5OdW1iZXIgPSBidWZmZXIubnVtYmVyT2ZDaGFubmVscztcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGFuTnVtYmVyOyArK2kpIHtcbiAgICB2YXIgZGF0YSA9IGJ1ZmZlci5nZXRDaGFubmVsRGF0YShpKTtcbiAgICBBcnJheS5wcm90b3R5cGUucmV2ZXJzZS5jYWxsKGRhdGEpO1xuICB9XG4gIGNiKCk7XG59XG5cbi8vIGNvcHkgdGhlIGJ1ZmZlciB0byBvdXIgY2xpcGJvYXJkLCB3aXRob3V0IHJlbW92aW5nIHRoZSBvcmlnaW5hbCBzZWN0aW9uIGZyb20gYnVmZmVyLlxuZnVuY3Rpb24gY29weUJ1ZmZlcihjb250ZXh0LCBjbGlwYm9hcmQsIGJ1ZmZlciwgY2IpIHtcbiAgdmFyIHN0YXJ0ID0gTWF0aC5yb3VuZChjbGlwYm9hcmQuc3RhcnQgKiBidWZmZXIuc2FtcGxlUmF0ZSk7XG4gIHZhciBlbmQgPSBNYXRoLnJvdW5kKGNsaXBib2FyZC5lbmQgKiBidWZmZXIuc2FtcGxlUmF0ZSk7XG5cbiAgY2xpcGJvYXJkLmJ1ZmZlciA9IGNvbnRleHQuY3JlYXRlQnVmZmVyKDIsIGVuZCAtIHN0YXJ0LCBidWZmZXIuc2FtcGxlUmF0ZSk7XG5cbiAgY2xpcGJvYXJkLmJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zZXQoXG4gICAgYnVmZmVyLmdldENoYW5uZWxEYXRhKDApLnN1YmFycmF5KHN0YXJ0LCBlbmQpLCAwKTtcbiAgY2xpcGJvYXJkLmJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKS5zZXQoXG4gICAgYnVmZmVyLmdldENoYW5uZWxEYXRhKDEpLnN1YmFycmF5KHN0YXJ0LCBlbmQpLCAwKTtcblxuICBjYigpO1xufVxuXG4vLyBjdXQgdGhlIGJ1ZmZlciBwb3J0aW9uIHRvIG91ciBjbGlwYm9hcmQsIHNldHMgZW1wdHkgc3BhY2UgaW4gcGxhY2Ugb2YgdGhlIHBvcnRpb25cbi8vIGluIHRoZSBzb3VyY2UgYnVmZmVyLlxuZnVuY3Rpb24gY3V0QnVmZmVyKGNvbnRleHQsIGNsaXBib2FyZCwgYnVmZmVyLCBjYikge1xuICB2YXIgc3RhcnQgPSBNYXRoLnJvdW5kKGNsaXBib2FyZC5zdGFydCAqIGJ1ZmZlci5zYW1wbGVSYXRlKTtcbiAgdmFyIGVuZCA9IE1hdGgucm91bmQoY2xpcGJvYXJkLmVuZCAqIGJ1ZmZlci5zYW1wbGVSYXRlKTtcblxuICBjbGlwYm9hcmQuYnVmZmVyID0gY29udGV4dC5jcmVhdGVCdWZmZXIoMiwgZW5kIC0gc3RhcnQsIGJ1ZmZlci5zYW1wbGVSYXRlKTtcbiAgY2xpcGJvYXJkLmJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zZXQoYnVmZmVyLmdldENoYW5uZWxEYXRhKDApLnN1YmFycmF5KHN0YXJ0LCBlbmQpKTtcbiAgY2xpcGJvYXJkLmJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKS5zZXQoYnVmZmVyLmdldENoYW5uZWxEYXRhKDEpLnN1YmFycmF5KHN0YXJ0LCBlbmQpKTtcblxuICB2YXIgbnVPbGRCdWZmZXIgPSBjb250ZXh0LmNyZWF0ZUJ1ZmZlcigyLCBidWZmZXIubGVuZ3RoLCBidWZmZXIuc2FtcGxlUmF0ZSk7XG4gIHZhciBlbXB0eUJ1ZiA9IGNvbnRleHQuY3JlYXRlQnVmZmVyKDIsIGVuZCAtIHN0YXJ0LCBidWZmZXIuc2FtcGxlUmF0ZSk7XG5cbiAgbnVPbGRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCkuc2V0KGJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zdWJhcnJheSgwLCBzdGFydCkpO1xuICBudU9sZEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKS5zZXQoYnVmZmVyLmdldENoYW5uZWxEYXRhKDEpLnN1YmFycmF5KDAsIHN0YXJ0KSlcblxuICBudU9sZEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zZXQoZW1wdHlCdWYuZ2V0Q2hhbm5lbERhdGEoMCksIHN0YXJ0KTtcbiAgbnVPbGRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkuc2V0KGVtcHR5QnVmLmdldENoYW5uZWxEYXRhKDEpLCBzdGFydCk7XG5cbiAgbnVPbGRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCkuc2V0KGJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zdWJhcnJheShlbmQsIGJ1ZmZlci5sZW5ndGgpLCBlbmQpO1xuICBudU9sZEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKS5zZXQoYnVmZmVyLmdldENoYW5uZWxEYXRhKDEpLnN1YmFycmF5KGVuZCwgYnVmZmVyLmxlbmd0aCksIGVuZCk7XG4gIGNiKG51T2xkQnVmZmVyKTtcbn1cblxuLy8gaW5zZXJ0IG91ciBjbGlwYm9hcmQgYXQgYSBzcGVjaWZpYyBwb2ludCBpbiBidWZmZXIuXG5mdW5jdGlvbiBwYXN0ZUJ1ZmZlcihjb250ZXh0LCBjbGlwYm9hcmQsIGJ1ZmZlciwgYXQsIGNiKSB7XG4gIHZhciBzdGFydCA9IE1hdGgucm91bmQoY2xpcGJvYXJkLnN0YXJ0ICogYnVmZmVyLnNhbXBsZVJhdGUpO1xuICB2YXIgZW5kID0gTWF0aC5yb3VuZChjbGlwYm9hcmQuZW5kICogYnVmZmVyLnNhbXBsZVJhdGUpO1xuICBhdCA9IGF0ICogYnVmZmVyLnNhbXBsZVJhdGU7XG5cbiAgLy8gY3JlYXRlIHJlcGxhY2VtZW50IGJ1ZmZlciB3aXRoIGVub3VnaCBzcGFjZSBmb3IgY2xpYm9hcmQgcGFydFxuICB2YXIgbnVQYXN0ZWRCdWZmZXIgPSBjb250ZXh0LmNyZWF0ZUJ1ZmZlcigyLCBidWZmZXIubGVuZ3RoICsgKGVuZCAtIHN0YXJ0KSwgYnVmZmVyLnNhbXBsZVJhdGUpO1xuXG4gIC8vIGlmIG91ciBjbGlwIHN0YXJ0IHBvaW50IGlzIG5vdCBhdCAnMCcgdGhlbiB3ZSBuZWVkIHRvIHNldCB0aGUgb3JpZ2luYWxcbiAgLy8gY2h1bmssIHVwIHRvIHRoZSBjbGlwIHN0YXJ0IHBvaW50XG4gIGlmIChhdCA+IDApIHtcbiAgICBudVBhc3RlZEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zZXQoYnVmZmVyLmdldENoYW5uZWxEYXRhKDApLnN1YmFycmF5KDAsIGF0KSk7XG4gICAgbnVQYXN0ZWRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkuc2V0KGJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKS5zdWJhcnJheSgwLCBhdCkpO1xuICB9XG5cbiAgLy8gYWRkIHRoZSBjbGlwIGRhdGFcbiAgbnVQYXN0ZWRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCkuc2V0KGNsaXBib2FyZC5idWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCksIGF0KTtcbiAgbnVQYXN0ZWRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSkuc2V0KGNsaXBib2FyZC5idWZmZXIuZ2V0Q2hhbm5lbERhdGEoMSksIGF0KTtcblxuICAvLyBpZiBvdXIgY2xpcCBlbmQgcG9pbnQgaXMgbm90IGF0IHRoZSBlbmQgb2YgdGhlIG9yaWdpbmFsIGJ1ZmZlciB0aGVuXG4gIC8vIHdlIG5lZWQgdG8gYWRkIHJlbWFpbmluZyBkYXRhIGZyb20gdGhlIG9yaWdpbmFsIGJ1ZmZlcjtcbiAgaWYgKGVuZCA8IGJ1ZmZlci5sZW5ndGgpIHtcbiAgICB2YXIgbmV3QXQgPSBhdCArIChlbmQgLSBzdGFydCk7XG4gICAgbnVQYXN0ZWRCdWZmZXIuZ2V0Q2hhbm5lbERhdGEoMCkuc2V0KGJ1ZmZlci5nZXRDaGFubmVsRGF0YSgwKS5zdWJhcnJheShuZXdBdCksIG5ld0F0KTtcbiAgICBudVBhc3RlZEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKS5zZXQoYnVmZmVyLmdldENoYW5uZWxEYXRhKDEpLnN1YmFycmF5KG5ld0F0KSwgbmV3QXQpO1xuICB9XG5cbiAgY2IobnVQYXN0ZWRCdWZmZXIpO1xufSIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odXJsLCB0aXRsZSkge1xuICB2YXIgbGluayA9IHdpbmRvdy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gIGxpbmsuaHJlZiA9IHVybDtcbiAgbGluay5kb3dubG9hZCA9IHRpdGxlIHx8ICdvdXRwdXQud2F2JztcbiAgdmFyIGNsaWNrID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoXCJFdmVudFwiKTtcbiAgY2xpY2suaW5pdEV2ZW50KFwiY2xpY2tcIiwgdHJ1ZSwgdHJ1ZSk7XG4gIGxpbmsuZGlzcGF0Y2hFdmVudChjbGljayk7XG59IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAodG90YWxTZWMsIG1zKSB7XG4gIHZhciBtaW51dGVzID0gcGFyc2VJbnQoIHRvdGFsU2VjIC8gNjAgKSAlIDYwO1xuICB2YXIgc2Vjb25kcyA9IHRvdGFsU2VjICUgNjA7XG5cbiAgaWYgKG1zKSB7XG4gICAgcmV0dXJuICgobWludXRlcyA8IDEwID8gXCIwXCIgKyBtaW51dGVzIDogbWludXRlcykgKyBcIjpcIiArIChzZWNvbmRzICA8IDEwID8gXCIwXCIgKyBzZWNvbmRzLnRvRml4ZWQoMikgOiBzZWNvbmRzLnRvRml4ZWQoMikpKS5yZXBsYWNlKCcuJywgJzonKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gKChtaW51dGVzIDwgMTAgPyBcIjBcIiArIG1pbnV0ZXMgOiBtaW51dGVzKSArIFwiOlwiICsgKHNlY29uZHMgIDwgMTAgPyBcIjBcIiArICBwYXJzZUludChzZWNvbmRzKSA6IHBhcnNlSW50KHNlY29uZHMpKSk7XG4gIH1cbn0iLCJ2YXIgcmVjb3JkZXI7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgc3RhcnQ6IHN0YXJ0LFxuICBzdG9wOiBzdG9wXG59XG5cbmZ1bmN0aW9uIGdldFN0cmVhbShjb250ZXh0LCBmZnQpIHtcbiAgbmF2aWdhdG9yLmdldFVzZXJNZWRpYSA9IG5hdmlnYXRvci5nZXRVc2VyTWVkaWEgfHwgbmF2aWdhdG9yLndlYmtpdEdldFVzZXJNZWRpYTtcbiAgd2luZG93LlVSTCA9IHdpbmRvdy5VUkwgfHwgd2luZG93LndlYmtpdFVSTDtcblxuICBuYXZpZ2F0b3IuZ2V0VXNlck1lZGlhKHthdWRpbzogdHJ1ZX0sIGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgIHN0YXJ0VXNlck1lZGlhKGNvbnRleHQsIHN0cmVhbSwgZmZ0KTtcbiAgfSwgZnVuY3Rpb24oZXJyKSB7XG4gICAgY29uc29sZS5sb2coJ05vIGxpdmUgYXVkaW8gaW5wdXQ6ICcgKyBlcnIpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gc3RhcnRVc2VyTWVkaWEoY29udGV4dCwgc3RyZWFtLCBmZnQpIHtcbiAgdmFyIGlucHV0ID0gY29udGV4dC5jcmVhdGVNZWRpYVN0cmVhbVNvdXJjZShzdHJlYW0pO1xuICBjb25zb2xlLmxvZygnTWVkaWEgc3RyZWFtIGNyZWF0ZWQuJyk7XG5cbiAgaWYgKGZmdCkge1xuICAgIGlucHV0LmNvbm5lY3QoZmZ0LmlucHV0KTtcbiAgICAvLyB0aHJvdyBhd2F5IGdhaW4gbm9kZVxuICAgIHZhciBnYWluTm9kZSA9IGNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIGdhaW5Ob2RlLmdhaW4udmFsdWUgPSAwO1xuICAgIGZmdC5jb25uZWN0KGdhaW5Ob2RlKTtcbiAgICBnYWluTm9kZS5jb25uZWN0KGNvbnRleHQuZGVzdGluYXRpb24pO1xuICB9XG4gIC8vIGlucHV0LmNvbm5lY3QoY29udGV4dC5kZXN0aW5hdGlvbik7IC8vIG1pZ2h0IG5vdCBhY3R1YWxseSB3YW50IHRvIGRvIHRoaXNcbiAgY29uc29sZS5sb2coJ0lucHV0IGNvbm5lY3RlZCB0byBhdWRpbyBjb250ZXh0IGRlc3RpbmF0aW9uLicpO1xuXG4gIHJlY29yZGVyID0gbmV3IFJlY29yZGVyKGlucHV0KTtcbiAgY29uc29sZS5sb2coJ1JlY29yZGVyIGluaXRpYWxpc2VkLicpO1xuICBzdGFydCgpO1xufVxuXG5mdW5jdGlvbiBzdGFydChjb250ZXh0LCBmZnQpIHtcbiAgaWYgKHJlY29yZGVyID09PSB1bmRlZmluZWQpIHtcbiAgICBnZXRTdHJlYW0oY29udGV4dCwgZmZ0KVxuICB9IGVsc2Uge1xuICAgIHJlY29yZGVyLnJlY29yZCgpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHN0b3AoY2IpIHtcbiAgcmVjb3JkZXIuc3RvcCgpO1xuICByZWNvcmRlci5leHBvcnRXQVYoY2IpO1xuICByZWNvcmRlci5jbGVhcigpO1xufSIsIi8vIG5lZWQgdG8gZ2VuZXJhdGUgdGhlc2UgcG9pbnRzLCBsaWtlLCB3YXkgc21hcnRlclxuLy8gbmVlZCB0byBiZSBtdWx0aXBsZXMgb2YgNSBidXQgc3RpbGwgcmVwcmVzZW50YXRpdmUgb2YgbWludXRlc1xuLy8gbmVlZCB0byBhZGp1c3Qgd2lkdGggb2YgdGltZWxpbmVFbCBiYXNlZCBvbiB0aGlzXG5cbnZhciBoID0gcmVxdWlyZSgnaHlwZXJzY3JpcHQnKTtcbnZhciBmb3JtYXRUaW1lID0gcmVxdWlyZSgnLi9mb3JtYXQtdGltZScpO1xudmFyIHRpbWVsaW5lRWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcudGltZWxpbmUnKTtcblxuZnVuY3Rpb24gY2FsY3VsYXRlUG9pbnRzKGR1cmF0aW9uKSB7XG4gIHJldHVybiBkdXJhdGlvbiAvIDU7XG59XG5cbmZ1bmN0aW9uIHBvaW50KG51bSkge1xuICByZXR1cm4gaCgnbGknLFxuICAgICAgICAgICBoKCdzcGFuJywgbnVtKSk7XG59XG5cbmZ1bmN0aW9uIGdldFBvaW50TGVuZ3RoKCkge1xuICByZXR1cm4gdGltZWxpbmVFbC5jaGlsZHJlbi5sZW5ndGhcbn1cblxuLy8gZml4IGZvcm1hdFRpbWUgdG8gd29yayB3aXRoIGxvdyBudW1iZXJzXG5cbmZ1bmN0aW9uIGdldFBvaW50cyhjdXIsIG1heCkge1xuICBpZiAoY3VyIDwgbWF4KSB7XG4gICAgY3VyID0gY3VyICsgNTtcbiAgICB0aW1lbGluZUVsLmFwcGVuZENoaWxkKHBvaW50KGZvcm1hdFRpbWUoY3VyKSkpO1xuICAgIGdldFBvaW50cyhjdXIsIG1heCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlKGR1cmF0aW9uKSB7XG4gIGNvbnNvbGUubG9nKCdkdXJhdGlvbjo6JywgZHVyYXRpb24pO1xuICB2YXIgbnVQb2ludExlbmd0aCA9IGNhbGN1bGF0ZVBvaW50cyhkdXJhdGlvbik7XG4gIGlmIChudVBvaW50TGVuZ3RoIDwgZ2V0UG9pbnRMZW5ndGgoKSkgcmV0dXJuO1xuXG4gIHZhciB3ID0gdGltZWxpbmVFbC5vZmZzZXRXaWR0aDtcbiAgdGltZWxpbmVFbC5pbm5lckhUTUwgPSAnJztcbiAgZ2V0UG9pbnRzKC01LCBkdXJhdGlvbik7XG4gIGlmICh0aW1lbGluZUVsLmNoaWxkcmVuLmxlbmd0aCAqIDEwMCA+IHcpIHtcbiAgICB0aW1lbGluZUVsLnN0eWxlLndpZHRoID0gdGltZWxpbmVFbC5jaGlsZHJlbi5sZW5ndGggKiAxMDAgKyAncHgnO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICB1cGRhdGU6IHVwZGF0ZVxufTsiLCIvLyBUaGlzIGZpbGUgaXMgYSBwaXQgb2YgbmV3IHlvcmsgY2l0eSBzbGFybSwgZWRpdCBhdCB5b3VyIG93biByaXNrXG5cblxuLypcbjQpIG1ha2Ugc3VyZSBsb2FkaW5nIGFuZCB3YXZlIHJlbmRlcmluZyBjb2RlIGlzIERSWVxuKi9cblxudmFyIHJhZiA9IHJlcXVpcmUoJ3JhZicpO1xudmFyIEVFID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xudmFyIGRyYXdCdWZmZXIgPSByZXF1aXJlKCdkcmF3LXdhdmUnKTtcbnZhciBlbmNvZGVyID0gcmVxdWlyZSgnZW5jb2RlLXdhdicpO1xudmFyIEF1ZGlvU291cmNlID0gcmVxdWlyZSgnYXVkaW9zb3VyY2UnKTtcblxudmFyIGZvcmNlRG93bmxvYWQgPSByZXF1aXJlKCcuL2ZvcmNlLWRvd25sb2FkJyk7XG52YXIgdGltZWxpbmVNYW5hZ2UgPSByZXF1aXJlKCcuL3RpbWVsaW5lJyk7XG52YXIgZm9ybWF0VGltZSA9IHJlcXVpcmUoJy4vZm9ybWF0LXRpbWUnKTtcbnZhciBjb2xvcnMgPSByZXF1aXJlKCcuL2NvbG9ycycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRyYWNrO1xuXG5mdW5jdGlvbiBUcmFjayhvcHRzKSB7XG4gIHRoaXMuZW1pdHRlciA9IG5ldyBFRSgpO1xuICB0aGlzLmNvbnRyb2xFbCA9IG9wdHMuY29udHJvbEVsO1xuICB0aGlzLnRyYWNrRWwgPSBvcHRzLnRyYWNrRWw7XG4gIHRoaXMuYWN0aXZlID0gdHJ1ZTtcbiAgdGhpcy5zZWxlY3RpbmcgPSB0cnVlO1xuICB0aGlzLmNvbnRleHQgPSBvcHRzLmNvbnRleHQ7XG4gIHRoaXMuYXVkaW9zb3VyY2UgPSBvcHRzLmF1ZGlvc291cmNlO1xuICB0aGlzLmlkID0gb3B0cy5pZDtcbiAgdGhpcy50aXRsZSA9IG9wdHMudGl0bGU7XG5cbiAgaWYgKG9wdHMuZ2Fpbk5vZGUpIHtcbiAgICB0aGlzLmdhaW5Ob2RlID0gb3B0cy5nYWluTm9kZTtcbiAgfVxuXG4gIHRoaXMuY2xpcGJvYXJkID0ge1xuICAgIHN0YXJ0OiAwLFxuICAgIGVuZDogMFxuICB9O1xuXG4gIHRoaXMucGxheWluZyA9IGZhbHNlO1xuXG4gIHRoaXMuc3RhcnRPZmZzZXQgPSAwO1xuICB0aGlzLmxhc3RQbGF5ID0gMDtcblxuICAvLyBpbmRpY2F0b3JzXG4gIHRoaXMuZmlsZUluZGljYXRvciA9IHRoaXMudHJhY2tFbC5xdWVyeVNlbGVjdG9yKCcudHJhY2sgcCcpO1xuICB0aGlzLmN1cnJlbnRUaW1lRWwgPSB0aGlzLmNvbnRyb2xFbC5xdWVyeVNlbGVjdG9yKCcuY3VyJyk7XG4gIHRoaXMucmVtYWluaW5nRWwgPSB0aGlzLmNvbnRyb2xFbC5xdWVyeVNlbGVjdG9yKCcucmVtJyk7XG4gIHRoaXMuZHVyYXRpb25FbCA9IHRoaXMuY29udHJvbEVsLnF1ZXJ5U2VsZWN0b3IoJy5kdXInKTtcblxuICAvLyBjZW50ZXIgZmlsZSBpbmRpY2F0b3JcbiAgdmFyIHRyYWNrU3BhY2VXaWR0aCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy50cmFjay1zcGFjZScpLm9mZnNldFdpZHRoO1xuICB0aGlzLmZpbGVJbmRpY2F0b3Iuc3R5bGUud2lkdGggPSB0cmFja1NwYWNlV2lkdGggKyAncHgnO1xuXG4gIC8vIGNvbnRyb2xzXG4gIHRoaXMuZ2FpbkVsID0gdGhpcy5jb250cm9sRWwucXVlcnlTZWxlY3RvcignLnZvbHVtZScpO1xuICB0aGlzLnZvbHVtZUJhciA9IHRoaXMuZ2FpbkVsLnF1ZXJ5U2VsZWN0b3IoJy52b2x1bWUtYmFyJyk7XG5cblxuICAvLyB3YXZlIGVsZW1lbnRzXG4gIHRoaXMud2F2ZSA9IHRoaXMudHJhY2tFbC5xdWVyeVNlbGVjdG9yKCcud2F2ZSBjYW52YXMnKTtcbiAgdGhpcy5wcm9ncmVzc1dhdmUgPSB0aGlzLnRyYWNrRWwucXVlcnlTZWxlY3RvcignLndhdmUtcHJvZ3Jlc3MnKTtcbiAgdGhpcy5jdXJzb3IgPSB0aGlzLnRyYWNrRWwucXVlcnlTZWxlY3RvcignLnBsYXktY3Vyc29yJyk7XG4gIHRoaXMuc2VsZWN0aW9uID0gdGhpcy50cmFja0VsLnF1ZXJ5U2VsZWN0b3IoJy5zZWxlY3Rpb24nKTtcbiAgdGhpcy5zZWxlY3RhYmxlID0gW10uc2xpY2UuY2FsbCh0aGlzLnRyYWNrRWwucXVlcnlTZWxlY3RvckFsbCgnLnNlbGVjdGFibGUnKSk7XG5cbiAgY29sb3JzLnN0YXJ0KHRoaXMuZmlsZUluZGljYXRvciwgMzAwKTtcblxuICB0aGlzLmdhaW5FbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGV2KSB7XG4gICAgdGhpcy52b2x1bWVCYXIuc3R5bGUud2lkdGggPSBldi5vZmZzZXRYICsgJ3B4JztcbiAgICB0aGlzLmdhaW5Ob2RlLmdhaW4udmFsdWUgPSBldi5vZmZzZXRYIC8gdGhpcy5nYWluRWwub2Zmc2V0V2lkdGg7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgdGhpcy5jb250cm9sRWwucXVlcnlTZWxlY3RvcignLmFjdGl2YXRlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihldikge1xuICAgIHZhciBlbCA9IGV2LnRhcmdldDtcblxuICAgIGlmIChlbC5jbGFzc0xpc3QuY29udGFpbnMoJ2FjdGl2ZScpKSB7XG4gICAgICB0aGlzLmFjdGl2ZSA9IGZhbHNlO1xuICAgICAgZWwuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG4gICAgICB0aGlzLnRyYWNrRWwuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYWN0aXZlID0gdHJ1ZTtcbiAgICAgIGVsLmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuICAgICAgdGhpcy50cmFja0VsLmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuICAgIH1cbiAgfS5iaW5kKHRoaXMpKTtcblxuICB0aGlzLnNlbGVjdGFibGUuZm9yRWFjaChmdW5jdGlvbih3YXZlKSB7XG4gICAgd2F2ZS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIHRoaXMuaW5pdFNlbGVjdGlvbi5iaW5kKHRoaXMpKTtcbiAgICB3YXZlLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIHRoaXMuc3RhcnRTZWxlY3Rpb24uYmluZCh0aGlzKSk7XG4gICAgd2F2ZS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCB0aGlzLnVwZGF0ZVNlbGVjdGlvbi5iaW5kKHRoaXMpKTtcbiAgfSwgdGhpcyk7XG5cbiAgdGhpcy5zZWxlY3Rpb24uYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIGZ1bmN0aW9uKGV2KSB7XG4gICAgaWYgKCF0aGlzLnNlbGVjdGluZykgcmV0dXJuO1xuICAgIHZhciBsZWZ0UGVyY2VudCA9IHBhcnNlRmxvYXQodGhpcy5zZWxlY3Rpb24uc3R5bGUubGVmdC5yZXBsYWNlKCdweCcsICcnKSk7XG4gICAgdmFyIHJpZ2h0UGVyY2VudCA9IGxlZnRQZXJjZW50ICsgcGFyc2VGbG9hdCh0aGlzLnNlbGVjdGlvbi5zdHlsZS53aWR0aC5yZXBsYWNlKCdweCcsICcnKSk7XG4gICAgdGhpcy5jbGlwYm9hcmQuc3RhcnQgPSB0aGlzLmdldFRpbWVGcm9tUG9zaXRpb24obGVmdFBlcmNlbnQpO1xuICAgIHRoaXMuY2xpcGJvYXJkLmVuZCA9IHRoaXMuZ2V0VGltZUZyb21Qb3NpdGlvbihyaWdodFBlcmNlbnQpO1xuICAgIHRoaXMubW92aW5nID0gZmFsc2U7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgdGhpcy5jb250cm9sRWwucXVlcnlTZWxlY3RvcignLmV4cG9ydCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgZW5jb2Rlci5lbmNvZGVXQVYoW3RoaXMuYXVkaW9zb3VyY2UuYnVmZmVyLmdldENoYW5uZWxEYXRhKDApLCB0aGlzLmF1ZGlvc291cmNlLmJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKV0sXG4gICAgICAgICAgICB0aGlzLmF1ZGlvc291cmNlLmJ1ZmZlci5zYW1wbGVSYXRlLFxuICAgICAgICAgICAgZnVuY3Rpb24oYmxvYikge1xuICAgICAgICAgICAgICBpZiAoYmxvYikgZm9yY2VEb3dubG9hZChVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpKTtcbiAgICAgICAgICAgIH0pXG5cbiAgfS5iaW5kKHRoaXMpKTtcblxuICB0aGlzLmNvbnRyb2xFbC5xdWVyeVNlbGVjdG9yKCcubXV0ZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZXYpIHtcbiAgICB2YXIgZWwgPSBldi50YXJnZXQ7XG5cbiAgICBpZiAoZWwuY2xhc3NMaXN0LmNvbnRhaW5zKCdhY3RpdmUnKSkge1xuICAgICAgdGhpcy5nYWluTm9kZS5nYWluLnZhbHVlID0gdGhpcy5sYXN0R2FpblZhbHVlO1xuICAgICAgdGhpcy5nYWluRWwudmFsdWUgPSB0aGlzLmxhc3RHYWluVmFsdWU7XG4gICAgICBlbC5jbGFzc0xpc3QucmVtb3ZlKCdhY3RpdmUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5sYXN0R2FpblZhbHVlID0gdGhpcy5nYWluTm9kZS5nYWluLnZhbHVlO1xuICAgICAgdGhpcy5nYWluTm9kZS5nYWluLnZhbHVlID0gMDtcbiAgICAgIHRoaXMuZ2FpbkVsLnZhbHVlID0gMDtcbiAgICAgIGVsLmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuICAgIH1cbiAgfS5iaW5kKHRoaXMpKTtcblxuICB0aGlzLmNvbnRyb2xFbC5xdWVyeVNlbGVjdG9yKCcuZWRpdCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZXYpIHtcbiAgICB2YXIgZWwgPSBldi50YXJnZXQ7XG4gICAgaWYgKGVsLmNsYXNzTGlzdC5jb250YWlucygnYWN0aXZlJykpIHtcbiAgICAgIGVsLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuICAgICAgdGhpcy5zZWxlY3RpbmcgPSBmYWxzZTtcbiAgICAgIHRoaXMuc2VsZWN0aW9uLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsLmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuICAgICAgdGhpcy5zZWxlY3RpbmcgPSB0cnVlO1xuICAgICAgdGhpcy5zZWxlY3Rpb24uc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG4gICAgfVxuICB9LmJpbmQodGhpcykpO1xuXG4gIHRoaXMuY29udHJvbEVsLnF1ZXJ5U2VsZWN0b3IoJy5jb2xsYXBzZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZXYpIHtcbiAgICB2YXIgZWwgPSBldi50YXJnZXQ7XG4gICAgaWYgKGVsLmNsYXNzTGlzdC5jb250YWlucygnYWN0aXZlJykpIHtcbiAgICAgIGVsLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuICAgICAgdGhpcy50cmFja0VsLmNsYXNzTGlzdC5hZGQoJ2NvbGxhcHNlZCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbC5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKVxuICAgICAgdGhpcy50cmFja0VsLmNsYXNzTGlzdC5yZW1vdmUoJ2NvbGxhcHNlZCcpO1xuICAgIH1cbiAgfS5iaW5kKHRoaXMpKTtcblxuICBmdW5jdGlvbiBwbGF5TGlzdGVuIChldikge1xuICAgIGlmICh0aGlzLmFjdGl2ZSkgdGhpcy5wbGF5KCk7XG4gIH1cblxuICB0aGlzLmVtaXR0ZXIub24oJ3RyYWNrczpwbGF5JywgcGxheUxpc3Rlbi5iaW5kKHRoaXMpKTtcblxuICBmdW5jdGlvbiBwYXVzZUxpc3Rlbihldikge1xuICAgIGlmICh0aGlzLmFjdGl2ZSkgdGhpcy5wYXVzZSgpO1xuICB9XG5cbiAgdGhpcy5lbWl0dGVyLm9uKCd0cmFja3M6cGF1c2UnLCBwYXVzZUxpc3Rlbi5iaW5kKHRoaXMpKTtcblxuICBmdW5jdGlvbiBzdG9wTGlzdGVuKGV2KSB7XG4gICAgaWYgKHRoaXMuYWN0aXZlKSB7XG4gICAgICB0aGlzLnN0b3AoKTtcbiAgICAgIHRoaXMucmVzZXRQcm9ncmVzcygpO1xuICAgIH1cbiAgfVxuXG4gIHRoaXMuZW1pdHRlci5vbigndHJhY2tzOnN0b3AnLCBzdG9wTGlzdGVuLmJpbmQodGhpcykpO1xuXG4gIHRoaXMuY29udHJvbEVsLnF1ZXJ5U2VsZWN0b3IoJy5yZW1vdmUnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKGV2KSB7XG4gICAgdGhpcy5zdG9wKCk7XG4gICAgdGhpcy5jb250cm9sRWwucmVtb3ZlKCk7XG4gICAgdGhpcy50cmFja0VsLnJlbW92ZSgpO1xuICAgIHRoaXMuZW1pdHRlci5lbWl0KCd0cmFja3M6cmVtb3ZlJywge2lkOiB0aGlzLmlkfSk7XG4gICAgdGhpcy5lbWl0dGVyID0gbnVsbDtcbiAgfS5iaW5kKHRoaXMpKTtcbn1cblxuVHJhY2sucHJvdG90eXBlID0ge1xuICB1cGRhdGVTZWxlY3Rpb246IGZ1bmN0aW9uKGV2KSB7XG4gICAgaWYgKCF0aGlzLm1vdmluZyB8fCAhdGhpcy5zZWxlY3RpbmcpIHJldHVybjtcbiAgICB2YXIgbGVmdFBvc2l0aW9uID0gdGhpcy5nZXRQb3NpdGlvbkZyb21DdXJzb3IoKTtcbiAgICB2YXIgcmlnaHRQb3NpdGlvbiA9IHRoaXMucG9zaXRpb25Gcm9tQ2xpY2soZXYpO1xuICAgIHZhciBkaWZmID0gcmlnaHRQb3NpdGlvbiAtIGxlZnRQb3NpdGlvbjtcblxuICAgIGlmIChkaWZmIDw9IDApIHtcbiAgICAgIGRpZmYgPSBsZWZ0UG9zaXRpb24gLSByaWdodFBvc2l0aW9uO1xuICAgICAgdGhpcy5jdXJzb3Iuc3R5bGUubGVmdCA9IHJpZ2h0UG9zaXRpb24gKyAncHgnO1xuICAgICAgdGhpcy5zZWxlY3Rpb24uc3R5bGUubGVmdCA9IHJpZ2h0UG9zaXRpb24gKyAncHgnO1xuICAgIH1cblxuICAgIHRoaXMuc2VsZWN0aW9uLnN0eWxlLndpZHRoID0gZGlmZiArJ3B4JztcbiAgfSxcbiAgc3RhcnRTZWxlY3Rpb246IGZ1bmN0aW9uKGV2KSB7XG4gICAgaWYgKHRoaXMucGxheWluZykgcmV0dXJuO1xuICAgIGlmICghdGhpcy5tb3ZpbmcpIHtcbiAgICAgIHZhciBsZWZ0UG9zaXRpb24gPSB0aGlzLnBvc2l0aW9uRnJvbUNsaWNrKGV2KTtcbiAgICAgIGlmICh0aGlzLnNlbGVjdGluZykge1xuICAgICAgICB0aGlzLnNlbGVjdGlvbi5zdHlsZS5sZWZ0ID0gbGVmdFBvc2l0aW9uICsgJ3B4JztcbiAgICAgICAgdGhpcy5zZWxlY3Rpb24uc3R5bGUud2lkdGggPSAwO1xuICAgICAgICB0aGlzLm1vdmluZyA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuY3Vyc29yLnN0eWxlLmxlZnQgPSBsZWZ0UG9zaXRpb24gKyAncHgnO1xuICAgIH1cbiAgfSxcbiAgaW5pdFNlbGVjdGlvbjogZnVuY3Rpb24oZXYpIHtcbiAgICBpZiAodGhpcy5wbGF5aW5nKSByZXR1cm47XG4gICAgdGhpcy5jdXJzb3Iuc3R5bGUubGVmdCA9IHRoaXMucG9zaXRpb25Gcm9tQ2xpY2soZXYpK1wicHhcIjtcbiAgfSxcbiAgcGxheTogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5sYXN0UGxheSA9IHRoaXMuY29udGV4dC5jdXJyZW50VGltZTtcbiAgICB0aGlzLnBsYXlUcmFjayh0aGlzLnN0YXJ0T2Zmc2V0ICUgdGhpcy5hdWRpb3NvdXJjZS5idWZmZXIuZHVyYXRpb24pO1xuICAgIHRoaXMuc2V0Q3Vyc29yVmlld0ludGVydmFsKCk7XG4gIH0sXG4gIHNldEN1cnNvclZpZXdJbnRlcnZhbDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuY3Vyc29yVmlld0ludGVydmFsKSB7XG4gICAgICBjbGVhckludGVydmFsKHRoaXMuY3Vyc29yVmlld0ludGVydmFsKTtcbiAgICB9XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuY3Vyc29yVmlld0ludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuY3Vyc29yLnNjcm9sbEludG9WaWV3SWZOZWVkZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIDIwMCk7XG4gIH0sXG4gIHBvc2l0aW9uRnJvbUNsaWNrOiBmdW5jdGlvbihldikge1xuICAgIHZhciB4ID0gZXYub2Zmc2V0WCB8fCBldi5sYXllclg7XG4gICAgcmV0dXJuIHggKyAyMTtcbiAgfSxcbiAgZ2V0UG9zaXRpb25Gcm9tQ3Vyc29yOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gcGFyc2VGbG9hdCh0aGlzLmN1cnNvci5zdHlsZS5sZWZ0LnJlcGxhY2UoJ3B4JywgJycpKTtcbiAgfSxcbiAgZ2V0VGltZUZyb21Qb3NpdGlvbjogZnVuY3Rpb24ocG9zaXRpb24pIHtcbiAgICByZXR1cm4gKHBvc2l0aW9uIC8gMTAwKSAqIDU7XG4gIH0sXG4gIHN0b3A6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucGxheWluZyA9IGZhbHNlO1xuICAgIHRoaXMuc3RhcnRPZmZzZXQgPSAwO1xuICAgIHRoaXMubGFzdFBsYXkgPSAwO1xuICAgIGNsZWFySW50ZXJ2YWwodGhpcy5jdXJzb3JWaWV3SW50ZXJ2YWwpO1xuICAgIGlmICh0aGlzLmF1ZGlvc291cmNlLnNvdXJjZSkgdGhpcy5hdWRpb3NvdXJjZS5zdG9wKCk7XG4gIH0sXG4gIHJlc2V0UHJvZ3Jlc3M6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucHJvZ3Jlc3NXYXZlLnN0eWxlLndpZHRoID0gXCIwcHhcIjtcbiAgICB0aGlzLmN1cnNvci5zdHlsZS5sZWZ0ID0gXCIwcHhcIjtcbiAgfSxcbiAgcGF1c2U6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuYXVkaW9zb3VyY2Uuc3RvcCgpO1xuICAgIHRoaXMuc3RhcnRPZmZzZXQgKz0gdGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5sYXN0UGxheTtcbiAgICB0aGlzLnBsYXlpbmcgPSBmYWxzZTtcbiAgfSxcbiAgc2tpcEZvcndhcmQ6IGZ1bmN0aW9uKCkge30sXG4gIHNraXBCYWNrd2FyZDogZnVuY3Rpb24oKSB7fSxcbiAgcGxheVRyYWNrOiBmdW5jdGlvbihvZmZzZXQsIHN0b3BPZmZzZXQpIHtcbiAgICBpZiAodGhpcy5wbGF5aW5nKSB0aGlzLmF1ZGlvc291cmNlLnN0b3AoKTtcbiAgICB0aGlzLmF1ZGlvc291cmNlLnBsYXkoMCwgb2Zmc2V0KTtcbiAgICB0aGlzLmF1ZGlvc291cmNlLnBsYXkoMCwgb2Zmc2V0KTtcbiAgICB0aGlzLnBsYXlpbmcgPSB0cnVlO1xuICAgIHJhZih0aGlzLnRyaWdnZXJQbGF5aW5nLmJpbmQodGhpcykpO1xuICB9LFxuICB1cGRhdGVWaXN1YWxQcm9ncmVzczogZnVuY3Rpb24gKHBvcykge1xuICAgIHRoaXMucHJvZ3Jlc3NXYXZlLnN0eWxlLndpZHRoID0gcG9zK1wicHhcIjtcbiAgICB0aGlzLmN1cnNvci5zdHlsZS5sZWZ0ID0gKDIxK3BvcykrXCJweFwiOyAvLyAyMSBpcyB0aGUgcGFkZGluZy1sZWZ0IGZyb20gYmVnaW5uaW5nIG9mIHRyYWNrIGVsZW1lbnRcbiAgfSxcbiAgdHJpZ2dlclBsYXlpbmc6IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5wbGF5aW5nKSByZXR1cm47XG5cbiAgICB2YXIgZHVyID0gdGhpcy5hdWRpb3NvdXJjZS5idWZmZXIuZHVyYXRpb247XG4gICAgdmFyIGN1cnJlbnRUaW1lID0gdGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lIC0gdGhpcy5sYXN0UGxheSArIHRoaXMuc3RhcnRPZmZzZXQ7XG4gICAgdmFyIHJlbWFpbmluZ1RpbWUgPSBkdXIgLSBjdXJyZW50VGltZTtcblxuICAgIC8vIHRoaXMgaXMgdGhlIHNhbWUgd2F5IHdlIGFyZSBjYWN1bGF0aW5nIHRoZSB3aWR0aCBvZiB0aGUgd2F2ZXNcbiAgICAvLyB0byBtYXRjaCB1cCB0byB0aGUgdGltZWxpbmVcbiAgICB0aGlzLnVwZGF0ZVZpc3VhbFByb2dyZXNzKCgoY3VycmVudFRpbWUpIC8gNSkgKiAxMDApO1xuXG4gICAgdGhpcy5jdXJyZW50VGltZUVsLnRleHRDb250ZW50ID0gZm9ybWF0VGltZShjdXJyZW50VGltZSwgdHJ1ZSk7XG4gICAgdGhpcy5yZW1haW5pbmdFbC50ZXh0Q29udGVudCA9IGZvcm1hdFRpbWUocmVtYWluaW5nVGltZSwgdHJ1ZSk7XG5cbiAgICBpZiAocmVtYWluaW5nVGltZSA8PSAwKSB7XG4gICAgICB0aGlzLnBsYXlpbmcgPSAhdGhpcy5wbGF5aW5nO1xuICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLmN1cnNvclZpZXdJbnRlcnZhbCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJhZih0aGlzLnRyaWdnZXJQbGF5aW5nLmJpbmQodGhpcykpO1xuICB9LFxuICBjdXJyZW50VGltZVRvUGVyY2VudDogZnVuY3Rpb24gKGN1cnJlbnRUaW1lKSB7XG4gICAgdmFyIGR1ciA9IHRoaXMuYXVkaW9zb3VyY2UuYnVmZmVyLmR1cmF0aW9uO1xuICAgIHZhciBjdXIgPSAoY3VycmVudFRpbWUgLSB0aGlzLmxhc3RQbGF5ICsgdGhpcy5zdGFydE9mZnNldCAlIDYwKSAqIDEwO1xuICAgIHJldHVybiAoKGN1ciAvIGR1cikgKiAxMCkudG9GaXhlZCgzKTtcbiAgfSxcbiAgcmVzZXRWaXN1YWw6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBjdHggPSB0aGlzLndhdmUuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMud2F2ZS53aWR0aCwgdGhpcy53YXZlLmhlaWdodCk7XG4gICAgY3R4ID0gdGhpcy5wcm9ncmVzc1dhdmUucXVlcnlTZWxlY3RvcignY2FudmFzJykuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMud2F2ZS53aWR0aCwgdGhpcy53YXZlLmhlaWdodCk7XG4gIH0sXG4gIGxvYWRXaXRoQXVkaW9CdWZmZXI6IGZ1bmN0aW9uKGF1ZGlvQnVmZmVyKSB7XG4gICAgdGhpcy5nYWluTm9kZSA9IHRoaXMuY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgdGhpcy5hdWRpb3NvdXJjZSA9IG5ldyBBdWRpb1NvdXJjZSh0aGlzLmNvbnRleHQsIHtcbiAgICAgIGdhaW5Ob2RlOiB0aGlzLmdhaW5Ob2RlXG4gICAgfSk7XG4gICAgdGhpcy5kcmF3V2F2ZXMoKTtcbiAgfSxcbiAgbG9hZFVSTDogZnVuY3Rpb24gKHVybCkge1xuICAgIHRoaXMuZmlsZUluZGljYXRvci50ZXh0Q29udGVudCA9ICdsb2FkaW5nIGZpbGUgZnJvbSB1cmwuLi4nO1xuXG4gICAgdmFyIHJlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgIHJlcS5vcGVuKCdHRVQnLCB1cmwsIHRydWUpO1xuICAgICAgICByZXEucmVzcG9uc2VUeXBlID0gJ2FycmF5YnVmZmVyJztcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmVxLm9ubG9hZGVuZCA9IGZ1bmN0aW9uKGV2KSB7XG4gICAgICBzZWxmLmZpbGVJbmRpY2F0b3IudGV4dENvbnRlbnQgPSAnZGVjb2RpbmcgYXVkaW8gZGF0YS4uLic7XG5cbiAgICAgIHNlbGYuY29udGV4dC5kZWNvZGVBdWRpb0RhdGEocmVxLnJlc3BvbnNlLCBmdW5jdGlvbihidWYpIHtcbiAgICAgICAgc2VsZi5maWxlSW5kaWNhdG9yLnRleHRDb250ZW50ID0gJ3JlbmRlcmluZyB3YXZlLi4uJztcblxuICAgICAgICBzZWxmLmdhaW5Ob2RlID0gc2VsZi5jb250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICAgICAgc2VsZi5hdWRpb3NvdXJjZSA9IG5ldyBBdWRpb1NvdXJjZShzZWxmLmNvbnRleHQsIHtcbiAgICAgICAgICBnYWluTm9kZTogc2VsZi5nYWluTm9kZVxuICAgICAgICB9KTtcblxuICAgICAgICBzZWxmLmR1cmF0aW9uRWwudGV4dENvbnRlbnQgPSBmb3JtYXRUaW1lKGJ1Zi5kdXJhdGlvbiwgdHJ1ZSk7XG4gICAgICAgIHNlbGYucmVtYWluaW5nRWwudGV4dENvbnRlbnQgPSBmb3JtYXRUaW1lKGJ1Zi5kdXJhdGlvbiwgdHJ1ZSk7XG5cbiAgICAgICAgc2VsZi5hdWRpb3NvdXJjZS5idWZmZXIgPSBidWY7XG5cbiAgICAgICAgc2VsZi5hZGp1c3RXYXZlKCk7XG4gICAgICAgIGRyYXdCdWZmZXIoc2VsZi53YXZlLCBidWYsICcjNTJGNkE0Jyk7XG4gICAgICAgIGRyYXdCdWZmZXIoc2VsZi5wcm9ncmVzc1dhdmUucXVlcnlTZWxlY3RvcignY2FudmFzJyksIGJ1ZiwgJyNGNDQ1RjAnKTtcbiAgICAgICAgc2VsZi5maWxlSW5kaWNhdG9yLnJlbW92ZSgpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJlcS5zZW5kKCk7XG4gIH0sXG4gIGxvYWRGaWxlOiBmdW5jdGlvbiAoZmlsZSkge1xuICAgIHRoaXMuZmlsZUluZGljYXRvci50ZXh0Q29udGVudCA9ICdsb2FkaW5nIGZpbGUuLi4nO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgIHJlYWRlci5vbmxvYWRlbmQgPSBmdW5jdGlvbihldikge1xuICAgICAgc2VsZi5maWxlSW5kaWNhdG9yLnRleHRDb250ZW50ID0gJ2RlY29kaW5nIGF1ZGlvIGRhdGEuLi4nO1xuXG4gICAgICBzZWxmLmNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKGV2LnRhcmdldC5yZXN1bHQsIGZ1bmN0aW9uKGJ1Zikge1xuICAgICAgICBzZWxmLmZpbGVJbmRpY2F0b3IudGV4dENvbnRlbnQgPSAncmVuZGVyaW5nIHdhdmUuLi4nO1xuXG4gICAgICAgIHNlbGYuZ2Fpbk5vZGUgPSBzZWxmLmNvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgICAgICBzZWxmLmF1ZGlvc291cmNlID0gbmV3IEF1ZGlvU291cmNlKHNlbGYuY29udGV4dCwge1xuICAgICAgICAgIGdhaW5Ob2RlOiBzZWxmLmdhaW5Ob2RlXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHNlbGYuZHVyYXRpb25FbC50ZXh0Q29udGVudCA9IGZvcm1hdFRpbWUoYnVmLmR1cmF0aW9uLCB0cnVlKTtcbiAgICAgICAgc2VsZi5yZW1haW5pbmdFbC50ZXh0Q29udGVudCA9IGZvcm1hdFRpbWUoYnVmLmR1cmF0aW9uLCB0cnVlKTtcblxuICAgICAgICBzZWxmLmF1ZGlvc291cmNlLmJ1ZmZlciA9IGJ1ZjtcblxuICAgICAgICBzZWxmLmFkanVzdFdhdmUoKTtcbiAgICAgICAgZHJhd0J1ZmZlcihzZWxmLndhdmUsIGJ1ZiwgJyM1MkY2QTQnKTtcbiAgICAgICAgZHJhd0J1ZmZlcihzZWxmLnByb2dyZXNzV2F2ZS5xdWVyeVNlbGVjdG9yKCdjYW52YXMnKSwgYnVmLCAnI0Y0NDVGMCcpO1xuICAgICAgICBzZWxmLmZpbGVJbmRpY2F0b3IucmVtb3ZlKCk7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGZpbGUpO1xuICB9LFxuICBhZGp1c3RXYXZlOiBmdW5jdGlvbigpIHtcbiAgICB0aW1lbGluZU1hbmFnZS51cGRhdGUodGhpcy5hdWRpb3NvdXJjZS5idWZmZXIuZHVyYXRpb24pO1xuICAgIC8vIGFkanVzdCB0aGUgY2FudmFzIGFuZCBjb250YWluZXJzIHRvIGZpdCB3aXRoIHRoZSBidWZmZXIgZHVyYXRpb25cbiAgICB2YXIgdyA9ICh0aGlzLmF1ZGlvc291cmNlLmJ1ZmZlci5kdXJhdGlvbiAvIDUpICogMTAwO1xuICAgIHRoaXMud2F2ZS53aWR0aCA9IHc7XG4gICAgdGhpcy5wcm9ncmVzc1dhdmUucXVlcnlTZWxlY3RvcignY2FudmFzJykud2lkdGggPSB3O1xuICB9LFxuICBkcmF3V2F2ZXM6IGZ1bmN0aW9uKCkge1xuICAgIHRpbWVsaW5lTWFuYWdlLnVwZGF0ZSh0aGlzLmF1ZGlvc291cmNlLmJ1ZmZlci5kdXJhdGlvbik7XG4gICAgdmFyIHByZXZMZWZ0ID0gMDtcbiAgICBpZiAodGhpcy5jdXJzb3Iuc3R5bGUubGVmdCkge1xuICAgICAgcHJldkxlZnQgPSBwYXJzZUZsb2F0KHRoaXMuY3Vyc29yLnN0eWxlLmxlZnQucmVwbGFjZSgncHgnLCAnJykpO1xuICAgIH1cbiAgICB0aGlzLnJlc2V0VmlzdWFsKCk7XG4gICAgZHJhd0J1ZmZlcih0aGlzLndhdmUsIHRoaXMuYXVkaW9zb3VyY2UuYnVmZmVyLCAnIzUyRjZBNCcpO1xuICAgIGRyYXdCdWZmZXIodGhpcy5wcm9ncmVzc1dhdmUucXVlcnlTZWxlY3RvcignY2FudmFzJyksIHRoaXMuYXVkaW9zb3VyY2UuYnVmZmVyLCAnI0Y0NDVGMCcpO1xuICAgIGNvbG9ycy5lbmQoKTtcbiAgICBjb25zb2xlLmxvZygnd2F2ZXMgdXBkYXRlZC4nKVxuICB9XG59IiwidmFyIGRyYWdEcm9wID0gcmVxdWlyZSgnZHJhZy1kcm9wJyk7XG52YXIgQXVkaW9Db250ZXh0ID0gcmVxdWlyZSgnYXVkaW9jb250ZXh0Jyk7XG52YXIgQXVkaW9Tb3VyY2UgPSByZXF1aXJlKCdhdWRpb3NvdXJjZScpO1xudmFyIEZGVCA9IHJlcXVpcmUoJ2F1ZGlvLWZmdCcpO1xuXG52YXIgZWRpdG9yID0gcmVxdWlyZSgnLi9saWIvZWRpdHMnKTtcbnZhciByZWNvcmRlciA9IHJlcXVpcmUoJy4vbGliL3JlY29yZCcpO1xudmFyIFRyYWNrID0gcmVxdWlyZSgnLi9saWIvdHJhY2snKTtcblxudmFyIHRyYWNrVG1wID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3RyYWNrLXRtcCcpO1xudmFyIGNvbnRyb2xUbXAgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvY29udHJvbC10bXAnKTtcblxudmFyIGF1ZGlvQ29udGV4dCA9IG5ldyBBdWRpb0NvbnRleHQoKTtcbnZhciB1bmlxSWQgPSBmdW5jdGlvbigpIHtyZXR1cm4gTWF0aC5yYW5kb20oKS50b1N0cmluZygxNikuc2xpY2UoMik7fTtcblxudmFyIGRyYXdlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5kcmF3ZXInKTtcbnZhciBmZnQgPSBuZXcgRkZUKGF1ZGlvQ29udGV4dCwge2NhbnZhczogZHJhd2VyLnF1ZXJ5U2VsZWN0b3IoJyNmZnQnKX0pO1xuXG52YXIgY29udHJvbFNwYWNlRWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuY29udHJvbC1zcGFjZScpO1xudmFyIHRyYWNrU3BhY2VFbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy50cmFjay1zcGFjZScpO1xuXG52YXIgbWVyZ2VCdWZmZXJzID0gcmVxdWlyZSgnbWVyZ2UtYXVkaW8tYnVmZmVycycpO1xudmFyIGVuY29kZXIgPSByZXF1aXJlKCdlbmNvZGUtd2F2Jyk7XG5cbnZhciBtZXJnZUJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5tZXJnZScpO1xuXG4vLyBjb250cm9sc1xudmFyIHdlbGNvbWUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcud2VsY29tZScpO1xudmFyIHdlbGNvbWVJbXBvcnRCdG4gPSB3ZWxjb21lLnF1ZXJ5U2VsZWN0b3IoJy5pbXBvcnQnKTtcbnZhciB3ZWxjb21lUmVjb3JkQnRuID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnJlY29yZCcpO1xudmFyIGltcG9ydEJ0biA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5pbXBvcnQnKTtcbnZhciBpbXBvcnRJbnB1dCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNpbXBvcnQnKTtcbnZhciBwbGF5QnRuID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3BsYXknKTtcbnZhciBwYXVzZUJ0biA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNwYXVzZScpO1xudmFyIHN0b3BCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc3RvcCcpO1xudmFyIGN1dEJ0biA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNjdXQnKTtcbnZhciBjb3B5QnRuID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2NvcHknKTtcbnZhciBwYXN0ZUJ0biA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNwYXN0ZScpO1xudmFyIHByZXBlbmRCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcHJlcGVuZCcpO1xudmFyIGFwcGVuZEJ0biA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNhcHBlbmQnKTtcbnZhciBkdXBsaWNhdGVCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZHVwbGljYXRlJyk7XG52YXIgcmV2ZXJzZUJ0biA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNyZXZlcnNlJyk7XG52YXIgcmVtb3ZlQnRuID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3JlbW92ZScpO1xudmFyIHJlY29yZEJ0biA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNyZWNvcmQnKTtcbnZhciB0cmFja3MgPSB7fTtcblxudmFyIHJlY29yZGluZyA9IGZhbHNlO1xuXG5tZXJnZUJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICB2YXIgZnVsbFRyYWNrcyA9IFtdO1xuXG4gIE9iamVjdC5rZXlzKHRyYWNrcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBmdWxsVHJhY2tzLnB1c2godHJhY2tzW2tleV0uYXVkaW9zb3VyY2UuYnVmZmVyKTtcbiAgfSk7XG5cbiAgdmFyIG1lcmdlZCA9IG1lcmdlQnVmZmVycyhmdWxsVHJhY2tzLCBhdWRpb0NvbnRleHQpO1xuICBuZXdUcmFja0Zyb21BdWRpb0J1ZmZlcihtZXJnZWQpO1xuICBlbmNvZGVyLmVuY29kZVdBVihbbWVyZ2VkLmdldENoYW5uZWxEYXRhKDApLCBtZXJnZWQuZ2V0Q2hhbm5lbERhdGEoMSldLFxuICAgICAgICAgICAgbWVyZ2VkLnNhbXBsZVJhdGUsXG4gICAgICAgICAgICBmdW5jdGlvbihibG9iKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCd3YXYgZW5jb2RpbmcgY29tcGxldGU6ICcsIGJsb2IgKTtcbiAgICAgICAgICAgICAgaWYgKGJsb2IpIHtcbiAgICAgICAgICAgICAgICB2YXIgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbiAgICAgICAgICAgICAgICB2YXIgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xuICAgICAgICAgICAgICAgIHZhciBhdSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2F1ZGlvJyk7XG4gICAgICAgICAgICAgICAgdmFyIGhmID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuXG4gICAgICAgICAgICAgICAgYXUuY29udHJvbHMgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGF1LnNyYyA9IHVybDtcbiAgICAgICAgICAgICAgICBoZi5ocmVmID0gdXJsO1xuICAgICAgICAgICAgICAgIGhmLmRvd25sb2FkID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpICsgJy53YXYnO1xuICAgICAgICAgICAgICAgIGhmLmlubmVySFRNTCA9IGhmLmRvd25sb2FkO1xuICAgICAgICAgICAgICAgIGxpLmFwcGVuZENoaWxkKGF1KTtcbiAgICAgICAgICAgICAgICBsaS5hcHBlbmRDaGlsZChoZik7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChsaSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG59KVxuXG5yZWNvcmRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgaWYgKCFyZWNvcmRpbmcpIHtcbiAgICByZWNvcmRlci5zdGFydChhdWRpb0NvbnRleHQsIGZmdCk7XG4gICAgcmVjb3JkQnRuLmlubmVyVGV4dCA9ICdzdG9wIHJlY29yZGluZyc7XG4gICAgZHJhd2VyLmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuICAgIHJlY29yZGluZyA9IHRydWU7XG4gIH0gZWxzZSB7XG4gICAgZHJhd2VyLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuICAgIHJlY29yZEJ0bi5pbm5lclRleHQgPSAncmVjb3JkJztcbiAgICByZWNvcmRlci5zdG9wKGZ1bmN0aW9uKGJsb2IpIHtcbiAgICAgICAgICAgICAgIG5ld1RyYWNrRnJvbVVSTChVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpKTtcbiAgICAgICAgICAgICB9KTtcbiAgICByZWNvcmRpbmcgPSBmYWxzZTtcbiAgfVxufSlcblxuZHJhZ0Ryb3AoJ2JvZHknLCBmdW5jdGlvbiAoZmlsZXMpIHtcbiAgd2VsY29tZS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICBuZXdUcmFja0Zyb21GaWxlKGZpbGVzWzBdKTtcbn0pO1xuXG53ZWxjb21lSW1wb3J0QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNpbXBvcnQnKS5jbGljaygpO1xufSlcblxud2VsY29tZVJlY29yZEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICB3ZWxjb21lUmVjb3JkQnRuLnF1ZXJ5U2VsZWN0b3IoJ2g0JykuaW5uZXJUZXh0ID0gJ3N0b3AgcmVjb3JkaW5nJztcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3JlY29yZCcpLmNsaWNrKCk7XG59KVxuXG5pbXBvcnRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2ltcG9ydCcpLmNsaWNrKCk7XG59KVxuXG5pbXBvcnRJbnB1dC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBmdW5jdGlvbihldikge1xuICBuZXdUcmFja0Zyb21GaWxlKGV2LnRhcmdldC5maWxlc1swXSk7XG59KTtcblxucGxheUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICBPYmplY3Qua2V5cyh0cmFja3MpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgdHJhY2tzW2tleV0uZW1pdHRlci5lbWl0KCd0cmFja3M6cGxheScsIHt9KTtcbiAgfSk7XG59KTtcblxucGF1c2VCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgT2JqZWN0LmtleXModHJhY2tzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIHRyYWNrc1trZXldLmVtaXR0ZXIuZW1pdCgndHJhY2tzOnBhdXNlJywge30pO1xuICB9KTtcbn0pO1xuXG5zdG9wQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gIE9iamVjdC5rZXlzKHRyYWNrcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICB0cmFja3Nba2V5XS5lbWl0dGVyLmVtaXQoJ3RyYWNrczpzdG9wJywge30pO1xuICB9KTtcbn0pO1xuXG5mdW5jdGlvbiBzaG93UGFzdGVDdXJzb3JzKCkge1xuICB2YXIgc2VsZWN0aW9ucyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5zZWxlY3Rpb24nKTtcbiAgZm9yICh2YXIgaT0wOyBpIDwgc2VsZWN0aW9uczsgaSsrKSB7XG4gICAgc2VsZWN0aW9uc1tpXS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICB9XG4gIHZhciBwYXN0ZUN1cnNvcnMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcucGFzdGUtY3Vyc29yJyk7XG4gIGZvciAodmFyIGk9MDsgaSA8IHBhc3RlQ3Vyc29yczsgaSsrKSB7XG4gICAgcGFzdGVDdXJzb3JzW2ldLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xuICB9XG59XG5cbmZ1bmN0aW9uIGhpZGVQYXN0ZUN1cnNvcnMoKSB7XG4gIHZhciBzZWxlY3Rpb25zID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnNlbGVjdGlvbicpO1xuICBmb3IgKHZhciBpPTA7IGkgPCBzZWxlY3Rpb25zOyBpKyspIHtcbiAgICBzZWxlY3Rpb25zW2ldLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xuICB9XG4gIHZhciBwYXN0ZUN1cnNvcnMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcucGFzdGUtY3Vyc29yJyk7XG4gIGZvciAodmFyIGk9MDsgaSA8IHBhc3RlQ3Vyc29yczsgaSsrKSB7XG4gICAgcGFzdGVDdXJzb3JzW2ldLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gIH1cbn1cblxuZnVuY3Rpb24gZW5hYmxlUGxheWJhY2tPcHRzKCkge1xuICBwbGF5QnRuLmRpc2FibGVkID0gZmFsc2U7XG4gIGNvcHlCdG4uZGlzYWJsZWQgPSBmYWxzZTtcbiAgY3V0QnRuLmRpc2FibGVkID0gZmFsc2U7XG4gIHN0b3BCdG4uZGlzYWJsZWQgPSBmYWxzZTtcbiAgcGF1c2VCdG4uZGlzYWJsZWQgPSBmYWxzZTtcbiAgcmV2ZXJzZUJ0bi5kaXNhYmxlZCA9IGZhbHNlO1xufVxuXG5mdW5jdGlvbiBlbmFibGVDbGlwYm9hcmRPcHRzKCkge1xuICBwcmVwZW5kQnRuLmRpc2FibGVkID0gZmFsc2U7XG4gIGFwcGVuZEJ0bi5kaXNhYmxlZCA9IGZhbHNlO1xuICBwYXN0ZUJ0bi5kaXNhYmxlZCA9IGZhbHNlO1xuICBkdXBsaWNhdGVCdG4uZGlzYWJsZWQgPSBmYWxzZTtcbn1cblxuY29weUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICB2YXIgYWN0aXZlVHJhY2sgPSBnZXRBY3RpdmVUcmFjaygpO1xuICBpZiAoIWFjdGl2ZVRyYWNrKSByZXR1cm47XG5cbiAgdmFyIG9uQ29tcGxldGUgPSBmdW5jdGlvbigpIHtcbiAgICBjb25zb2xlLmxvZygnY29weSBidWZmZXIgY29tcGxldGU6ICcsIGFjdGl2ZVRyYWNrLmNsaXBib2FyZC5idWZmZXIpO1xuICB9O1xuXG4gIHNob3dQYXN0ZUN1cnNvcnMoKTtcbiAgZW5hYmxlQ2xpcGJvYXJkT3B0cygpO1xuICBlZGl0b3IuY29weShhdWRpb0NvbnRleHQsIGFjdGl2ZVRyYWNrLmNsaXBib2FyZCwgYWN0aXZlVHJhY2suYXVkaW9zb3VyY2UuYnVmZmVyLCBvbkNvbXBsZXRlKTtcbn0pO1xuXG5jdXRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgdmFyIGFjdGl2ZVRyYWNrID0gZ2V0QWN0aXZlVHJhY2soKTtcbiAgaWYgKCFhY3RpdmVUcmFjaykgcmV0dXJuO1xuXG4gIHZhciBvbkNvbXBsZXRlID0gZnVuY3Rpb24oYnVmKSB7XG4gICAgYWN0aXZlVHJhY2suYXVkaW9zb3VyY2UuYnVmZmVyID0gYnVmO1xuICAgIGFjdGl2ZVRyYWNrLmRyYXdXYXZlcygpO1xuICB9O1xuXG4gIGFjdGl2ZVRyYWNrLmNsaXBib2FyZC5zdGFydCA9IGFjdGl2ZVRyYWNrLmNsaXBib2FyZC5zdGFydCArIGFjdGl2ZVRyYWNrLmxhc3RQbGF5O1xuICBhY3RpdmVUcmFjay5jbGlwYm9hcmQuZW5kID0gYWN0aXZlVHJhY2suY2xpcGJvYXJkLmVuZCArIGFjdGl2ZVRyYWNrLmxhc3RQbGF5O1xuXG4gIHNob3dQYXN0ZUN1cnNvcnMoKTtcbiAgZW5hYmxlQ2xpcGJvYXJkT3B0cygpO1xuICBlZGl0b3IuY3V0KGF1ZGlvQ29udGV4dCwgYWN0aXZlVHJhY2suY2xpcGJvYXJkLCBhY3RpdmVUcmFjay5hdWRpb3NvdXJjZS5idWZmZXIsIG9uQ29tcGxldGUpO1xufSk7XG5cbnBhc3RlQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gIHZhciBhY3RpdmVUcmFjayA9IGdldEFjdGl2ZVRyYWNrKCk7XG4gIGlmICghYWN0aXZlVHJhY2spIHJldHVybjtcbiAgdmFyIG9uQ29tcGxldGUgPSBmdW5jdGlvbihidWYpIHtcbiAgICBhY3RpdmVUcmFjay5hdWRpb3NvdXJjZS5idWZmZXIgPSBidWY7XG4gICAgY29uc29sZS5sb2coJ2NiIGNhbGxlZCBwYXN0ZScpO1xuICAgIGFjdGl2ZVRyYWNrLmRyYXdXYXZlcygpO1xuICB9O1xuXG4gIGVkaXRvci5wYXN0ZShhdWRpb0NvbnRleHQsIGFjdGl2ZVRyYWNrLmNsaXBib2FyZCwgYWN0aXZlVHJhY2suYXVkaW9zb3VyY2UuYnVmZmVyLCBhY3RpdmVUcmFjay5jbGlwYm9hcmQuYXQsIG9uQ29tcGxldGUpO1xuICBoaWRlUGFzdGVDdXJzb3JzKCk7XG59KTtcblxucHJlcGVuZEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICB2YXIgYWN0aXZlVHJhY2sgPSBnZXRBY3RpdmVUcmFjaygpO1xuICBpZiAoIWFjdGl2ZVRyYWNrKSByZXR1cm47XG4gIHZhciBvbkNvbXBsZXRlID0gZnVuY3Rpb24oYnVmKSB7XG4gICAgYWN0aXZlVHJhY2suYXVkaW9zb3VyY2UuYnVmZmVyID0gYnVmO1xuICAgIGFjdGl2ZVRyYWNrLmRyYXdXYXZlcygpO1xuICB9O1xuXG4gIGVkaXRvci5wYXN0ZShhdWRpb0NvbnRleHQsIGFjdGl2ZVRyYWNrLmNsaXBib2FyZCwgYWN0aXZlVHJhY2suYXVkaW9zb3VyY2UuYnVmZmVyLCAwLCBvbkNvbXBsZXRlKTtcbn0pO1xuXG5hcHBlbmRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgdmFyIGFjdGl2ZVRyYWNrID0gZ2V0QWN0aXZlVHJhY2soKTtcbiAgaWYgKCFhY3RpdmVUcmFjaykgcmV0dXJuO1xuICB2YXIgb25Db21wbGV0ZSA9IGZ1bmN0aW9uKGJ1Zikge1xuICAgIGFjdGl2ZVRyYWNrLmF1ZGlvc291cmNlLmJ1ZmZlciA9IGJ1ZjtcbiAgICBhY3RpdmVUcmFjay5kcmF3V2F2ZXMoKTtcbiAgfTtcblxuICBlZGl0b3IucGFzdGUoYXVkaW9Db250ZXh0LCBhY3RpdmVUcmFjay5jbGlwYm9hcmQsIGFjdGl2ZVRyYWNrLmF1ZGlvc291cmNlLmJ1ZmZlciwgYWN0aXZlVHJhY2suYXVkaW9zb3VyY2UuYnVmZmVyLmR1cmF0aW9uLCBvbkNvbXBsZXRlKTtcbn0pO1xuXG5yZXZlcnNlQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gIHZhciBhY3RpdmVUcmFjayA9IGdldEFjdGl2ZVRyYWNrKCk7XG4gIGlmICghYWN0aXZlVHJhY2spIHJldHVybjtcbiAgdmFyIG9uQ29tcGxldGUgPSBmdW5jdGlvbigpIHtcbiAgICBhY3RpdmVUcmFjay5kcmF3V2F2ZXMoKTtcbiAgfTtcblxuICBlZGl0b3IucmV2ZXJzZShhY3RpdmVUcmFjay5hdWRpb3NvdXJjZS5idWZmZXIsIG9uQ29tcGxldGUpO1xufSk7XG5cbmR1cGxpY2F0ZUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICB2YXIgYWN0aXZlVHJhY2sgPSBnZXRBY3RpdmVUcmFjaygpO1xuICBpZiAoIWFjdGl2ZVRyYWNrKSByZXR1cm47XG5cbiAgdmFyIG9uQ29tcGxldGUgPSBmdW5jdGlvbigpIHtcbiAgICBjb25zb2xlLmxvZygnZHVwbGljYXRpbmcgYnVmZmVyOiAnLCBhY3RpdmVUcmFjay5jbGlwYm9hcmQuYnVmZmVyKTtcbiAgICBuZXdUcmFja0Zyb21BdWRpb0J1ZmZlcihhY3RpdmVUcmFjay5jbGlwYm9hcmQuYnVmZmVyKTtcbiAgfTtcblxuICBpZiAoYWN0aXZlVHJhY2suY2xpcGJvYXJkLmJ1ZmZlcikge1xuICAgIG9uQ29tcGxldGUoKTtcbiAgfSBlbHNlIGlmIChhY3RpdmVUcmFjay5jbGlwYm9hcmQuc3RhcnQgPT09IDAgJiYgYWN0aXZlVHJhY2suY2xpcGJvYXJkLmVuZCA9PT0gMCkge1xuICAgIGFjdGl2ZVRyYWNrLmNsaXBib2FyZC5lbmQgPSBhY3RpdmVUcmFjay5hdWRpb3NvdXJjZS5idWZmZXIuZHVyYXRpb247XG4gICAgZWRpdG9yLmNvcHkoYXVkaW9Db250ZXh0LCBhY3RpdmVUcmFjay5jbGlwYm9hcmQsIGFjdGl2ZVRyYWNrLmF1ZGlvc291cmNlLmJ1ZmZlciwgb25Db21wbGV0ZSk7XG4gIH0gZWxzZSB7XG4gICAgZWRpdG9yLmNvcHkoYXVkaW9Db250ZXh0LCBhY3RpdmVUcmFjay5jbGlwYm9hcmQsIGFjdGl2ZVRyYWNrLmF1ZGlvc291cmNlLmJ1ZmZlciwgb25Db21wbGV0ZSk7XG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBnZXRBY3RpdmVUcmFjaygpIHtcbiAgdmFyIGFjdGl2ZVRyYWNrcyA9IFtdO1xuICBPYmplY3Qua2V5cyh0cmFja3MpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKHRyYWNrc1trZXldLmFjdGl2ZSkgYWN0aXZlVHJhY2tzLnB1c2godHJhY2tzW2tleV0pO1xuICB9KTtcblxuICBpZiAoYWN0aXZlVHJhY2tzLmxlbmd0aCA+IDEpIHtcbiAgICBhbGVydCgnWW91IGNhbm5vdCBoYXZlIG1vcmUgdGhhbiBvbmUgYWN0aXZhdGVkIHRyYWNrIGZvciB0aGlzIG9wdGlvbicpO1xuICB9IGVsc2UgaWYoIWFjdGl2ZVRyYWNrcy5sZW5ndGgpIHtcbiAgICBhbGVydCgnVGhlcmUgaXMgbm8gYWN0aXZlIHRyYWNrJyk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGFjdGl2ZVRyYWNrc1swXTtcbiAgfVxufVxuXG5mdW5jdGlvbiBuZXdUcmFja0Zyb21BdWRpb0J1ZmZlcihhdWRpb0J1ZmZlcikge1xuICB3ZWxjb21lLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gIHZhciB0cmFja0VsID0gdHJhY2tUbXAoKTtcbiAgdmFyIGNvbnRyb2xFbCA9IGNvbnRyb2xUbXAoe1xuICAgIHRpdGxlOiBcIlJlY29yZGluZyAxXCJcbiAgfSk7XG4gIHZhciBpZCA9IHVuaXFJZCgpO1xuXG4gIGNvbnRyb2xTcGFjZUVsLmFwcGVuZENoaWxkKGNvbnRyb2xFbCk7XG4gIHRyYWNrU3BhY2VFbC5hcHBlbmRDaGlsZCh0cmFja0VsKTtcblxuICB0cmFja3NbaWRdID0gbmV3IFRyYWNrKHtcbiAgICB0aXRsZTogXCJSZWNvcmRpbmcgMVwiLFxuICAgIGlkOiBpZCxcbiAgICB0cmFja0VsOiB0cmFja0VsLFxuICAgIGNvbnRyb2xFbDogY29udHJvbEVsLFxuICAgIGdhaW5Ob2RlOiBhdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpLFxuICAgIGNvbnRleHQ6IGF1ZGlvQ29udGV4dFxuICB9KTtcblxuICB0cmFja3NbaWRdLmF1ZGlvc291cmNlID0gbmV3IEF1ZGlvU291cmNlKGF1ZGlvQ29udGV4dCwge1xuICAgIGdhaW5Ob2RlOiB0cmFja3NbaWRdLmdhaW5Ob2RlXG4gIH0pO1xuXG4gIHRyYWNrc1tpZF0uYXVkaW9zb3VyY2UuYnVmZmVyID0gYXVkaW9CdWZmZXI7XG5cbiAgdHJhY2tzW2lkXS5hZGp1c3RXYXZlKCk7XG4gIHRyYWNrc1tpZF0uZHJhd1dhdmVzKCk7XG4gIHRyYWNrc1tpZF0uZmlsZUluZGljYXRvci5yZW1vdmUoKTtcblxuICB0cmFja3NbaWRdLmVtaXR0ZXIub24oJ3RyYWNrczpyZW1vdmUnLCBmdW5jdGlvbihldikge1xuICAgIHRyYWNrc1tldi5pZF0gPSBudWxsO1xuICAgIGRlbGV0ZSB0cmFja3NbZXYuaWRdO1xuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XG4gICAgc2hvd1dlbGNvbWUoKTtcbiAgfSk7XG5cbiAgZW5hYmxlUGxheWJhY2tPcHRzKCk7XG59XG5cbmZ1bmN0aW9uIG5ld1RyYWNrRnJvbUZpbGUoZmlsZSkge1xuICBpZiAoZmlsZSA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG4gIGlmICghfmZpbGUudHlwZS5pbmRleE9mKCdhdWRpbycpKSB7XG4gICAgYWxlcnQoJ2F1ZGlvIGZpbGVzIG9ubHkgcGxlYXNlLicpO1xuICAgIC8vIGFsZXJ0KGZpbGUudHlwZSArICcgZmlsZXMgYXJlIG5vdCBzdXBwb3J0ZWQuJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHdlbGNvbWUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgdmFyIHRyYWNrRWwgPSB0cmFja1RtcCgpO1xuICB2YXIgaWQgPSB1bmlxSWQoKTtcblxuICB2YXIgY29udHJvbEVsID0gY29udHJvbFRtcCh7XG4gICAgdGl0bGU6IGZpbGUubmFtZVxuICB9KTtcblxuICBjb250cm9sU3BhY2VFbC5hcHBlbmRDaGlsZChjb250cm9sRWwpO1xuICB0cmFja1NwYWNlRWwuYXBwZW5kQ2hpbGQodHJhY2tFbCk7XG4gIHRyYWNrc1tpZF0gPSBuZXcgVHJhY2soe1xuICAgIHRpdGxlOiBmaWxlLm5hbWUsXG4gICAgaWQ6IGlkLFxuICAgIHRyYWNrRWw6IHRyYWNrRWwsXG4gICAgY29udHJvbEVsOiBjb250cm9sRWwsXG4gICAgY29udGV4dDogYXVkaW9Db250ZXh0XG4gIH0pO1xuICB0cmFja3NbaWRdLmVtaXR0ZXIub24oJ3RyYWNrczpyZW1vdmUnLCBmdW5jdGlvbihldikge1xuICAgIHRyYWNrc1tldi5pZF0gPSBudWxsO1xuICAgIGRlbGV0ZSB0cmFja3NbZXYuaWRdO1xuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XG4gICAgc2hvd1dlbGNvbWUoKTtcbiAgfSk7XG4gIHRyYWNrc1tpZF0ubG9hZEZpbGUoZmlsZSk7XG4gIGVuYWJsZVBsYXliYWNrT3B0cygpO1xufVxuXG5mdW5jdGlvbiBuZXdUcmFja0Zyb21VUkwodXJsKSB7XG4gIHdlbGNvbWUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgdmFyIHRyYWNrRWwgPSB0cmFja1RtcCgpO1xuICB2YXIgY29udHJvbEVsID0gY29udHJvbFRtcCh7XG4gICAgdGl0bGU6IFwiUmVjb3JkaW5nIDFcIlxuICB9KTtcbiAgdmFyIGlkID0gdW5pcUlkKCk7XG5cbiAgY29udHJvbFNwYWNlRWwuYXBwZW5kQ2hpbGQoY29udHJvbEVsKTtcbiAgdHJhY2tTcGFjZUVsLmFwcGVuZENoaWxkKHRyYWNrRWwpO1xuICB0cmFja3NbaWRdID0gbmV3IFRyYWNrKHtcbiAgICB0aXRsZTogXCJSZWNvcmRpbmcgMVwiLFxuICAgIGlkOiBpZCxcbiAgICB0cmFja0VsOiB0cmFja0VsLFxuICAgIGNvbnRyb2xFbDogY29udHJvbEVsLFxuICAgIGNvbnRleHQ6IGF1ZGlvQ29udGV4dFxuICB9KTtcbiAgdHJhY2tzW2lkXS5lbWl0dGVyLm9uKCd0cmFja3M6cmVtb3ZlJywgZnVuY3Rpb24oZXYpIHtcbiAgICB0cmFja3NbZXYuaWRdID0gbnVsbDtcbiAgICBkZWxldGUgdHJhY2tzW2V2LmlkXTtcbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygpO1xuICAgIHNob3dXZWxjb21lKCk7XG4gIH0pO1xuICB0cmFja3NbaWRdLmxvYWRVUkwodXJsKTtcbiAgZW5hYmxlUGxheWJhY2tPcHRzKCk7XG59XG5cbmZ1bmN0aW9uIHNob3dXZWxjb21lKCkge1xuICBpZiAoIU9iamVjdC5rZXlzKHRyYWNrcykubGVuZ3RoKSB3ZWxjb21lLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xufVxuIiwidmFyIGggPSByZXF1aXJlKCdoeXBlcnNjcmlwdCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgcmV0dXJuIGgoJ2Rpdi5jb250cm9sJyxcbiAgICAgICAgICAgaCgnaGVhZGVyJywge1wiZGF0YS10aXAtY29udGVudFwiOiBkYXRhLnRpdGxlLCBcImRhdGEtaGFzLXRpcFwiOiBcInJpZ2h0XCJ9LFxuICAgICAgICAgICAgIGgoJ3AnLCBkYXRhLnRpdGxlKSksXG4gICAgICAgICAgIGgoJ3VsLmFjdGlvbnMnLFxuICAgICAgICAgICAgIGgoJ2xpLmFjdGl2YXRlLmFjdGl2ZScsIHtcImRhdGEtdGlwLWNvbnRlbnRcIjogXCJhY3RpdmF0ZVwiLCBcImRhdGEtaGFzLXRpcFwiOiBcImJvdHRvbVwifSksXG4gICAgICAgICAgICAgaCgnbGkuZWRpdC5hY3RpdmUnLCB7XCJkYXRhLXRpcC1jb250ZW50XCI6IFwiZWRpdFwiLCBcImRhdGEtaGFzLXRpcFwiOiBcImJvdHRvbVwifSksXG4gICAgICAgICAgICAgaCgnbGkubXV0ZScsIHtcImRhdGEtdGlwLWNvbnRlbnRcIjogXCJtdXRlXCIsIFwiZGF0YS1oYXMtdGlwXCI6IFwiYm90dG9tXCJ9KSxcbiAgICAgICAgICAgICBoKCdsaS5leHBvcnQnLCB7XCJkYXRhLXRpcC1jb250ZW50XCI6IFwiZXhwb3J0XCIsIFwiZGF0YS1oYXMtdGlwXCI6IFwiYm90dG9tXCJ9KSxcbiAgICAgICAgICAgICBoKCdsaS5jb2xsYXBzZScsIHtcImRhdGEtdGlwLWNvbnRlbnRcIjogXCJjb2xsYXBzZVwiLCBcImRhdGEtaGFzLXRpcFwiOiBcImJvdHRvbVwifSksXG4gICAgICAgICAgICAgaCgnbGkucmVtb3ZlJywge1wiZGF0YS10aXAtY29udGVudFwiOiBcInJlbW92ZVwiLCBcImRhdGEtaGFzLXRpcFwiOiBcImJvdHRvbVwifSkpLFxuXG4gICAgICAgICAgIGgoJ2FydGljbGUuaW5mbycsXG4gICAgICAgICAgICAgaCgnZGl2LnZvbHVtZScsXG4gICAgICAgICAgICAgICBoKCdzcGFuLnZvbHVtZS1iYXInKSksXG4gICAgICAgICAgICAgaCgncCcsIFwiQ3VycmVudCBUaW1lOiBcIixcbiAgICAgICAgICAgICAgIGgoJ2kuY3VyJywgXCIwMDowMDowMFwiKSksXG4gICAgICAgICAgICAgaCgncCcsIFwiRHVyYXRpb246IFwiLFxuICAgICAgICAgICAgICAgaCgnaS5kdXInLCBcIjAwOjAwOjAwXCIpKSxcbiAgICAgICAgICAgICBoKCdwJywgXCJSZW1haW5pbmc6IFwiLFxuICAgICAgICAgICAgICAgaCgnaS5yZW0nLCBcIjAwOjAwOjAwXCIpKSkpO1xufSIsInZhciBoID0gcmVxdWlyZSgnaHlwZXJzY3JpcHQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIGgoJ2Rpdi50cmFjay5hY3RpdmUnLFxuICAgICAgICAgICBoKCdwJyxcbiAgICAgICAgICAgICBcImRyYWcgZmlsZSAyIGVkaXRcIiksXG4gICAgICAgICAgIGgoJ2Rpdi5wbGF5LWN1cnNvcicpLFxuICAgICAgICAgICBoKCdkaXYuc2VsZWN0aW9uJyksXG4gICAgICAgICAgIGgoJ2Rpdi53YXZlLnNlbGVjdGFibGUnLFxuICAgICAgICAgICAgIGgoJ2NhbnZhcycsIHsnaGVpZ2h0JzogJzMwMCcsICdkcmFnZ2FibGUnOiAnZmFsc2UnfSkpLFxuICAgICAgICAgICBoKCdkaXYud2F2ZS1wcm9ncmVzcy5zZWxlY3RhYmxlJyxcbiAgICAgICAgICAgICBoKCdjYW52YXMnLCB7J2hlaWdodCc6ICczMDAnLCAnZHJhZ2dhYmxlJzogJ2ZhbHNlJ30pKSk7XG59XG4iXX0=
