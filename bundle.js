(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/home/meandave/Code/split-audio/lib/draw-buffer.js":[function(require,module,exports){
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
},{}],"/home/meandave/Code/split-audio/lib/track.js":[function(require,module,exports){
var raf = require('raf');
var AudioSource = require('audiosource');
var Dragdealer = require('dragdealer').Dragdealer;
var drawBuffer = require('./draw-buffer');

module.exports = Track;

function Track(opts, emitter) {
  this.containEl = opts.containEl;
  this.trackEl = this.containEl.querySelector('.track');
  this.active = true;
  this.context = opts.context;
  this.audiosource = opts.audiosource;

  this.currentTime = this.context.currentTime;
  this.playing = false;

  this.startOffset = 0;
  this.lastPlay = 0;
  this.lastPause = 0;
  this.pausedSum = 0;
  this.actualCurrentTime = 0;
  this.initialPlay = true;
  this.initStartTime = 0;

  this.wave = this.containEl.querySelector('.wave');
  this.progressWave = this.containEl.querySelector('.wave-progress');
  this.cursor = this.containEl.querySelector('.play-cursor');

  this.containEl.querySelector('.de').addEventListener('click', function(ev) {
    var el = ev.target;

    if (el.textContent === 'deactivate') {
      this.active = false;
      this.trackEl.classList.remove('active');
      el.textContent = 'activate';
    } else {
      this.active = true;
      this.trackEl.classList.add('active');
      el.textContent = 'deactivate';
    }
  }.bind(this));

  this.containEl.querySelector('.mute').addEventListener('click', function(ev) {
    var el = ev.target;

    if (el.textContent === 'mute') {
      // this.mute();
      el.textContent = 'unmute';
    } else {
      // this.mute();
      el.textContent = 'mute';
    }
  }.bind(this));

  emitter.on('tracks:play', function(ev) {
    this.play();
  }.bind(this));

  emitter.on('tracks:pause', function(ev) {
    this.pause();
  }.bind(this));

  emitter.on('tracks:stop', function(ev) {
    this.stop();
  }.bind(this));

  this.progressWave.addEventListener('click', function(ev) {
    // if (this.playing) return;
    // var percent = (ev.offsetX / 1200) * 100;
    // var futureCurrentTime = this.percentToCurrentTime(percent);
    // this.updateProgress(percent);
    console.log('clicking on progresswave doesn\'t do anything right now OKAY!');
  });
}

Track.prototype = {
  play: function() {
    this.lastPlay = this.context.currentTime;

    if (this.initialPlay) {
      this.initStartTime = this.lastPlay;
      this.pausedSum = this.lastPlay;
      this.initialPlay = !this.initialPlay;
      this.progressWave.style.width = 0;
      this.progressWave.style.display = 'block';
    }

    if (this.lastPause > 0) this.updatePaused();
    this.playTrack(this.startOffset % this.audiosource.buffer.duration);
  },
  updatePaused: function() {
    this.pausedSum = this.pausedSum + (this.lastPlay - this.lastPause);
  },
  stop: function() {
    debugger;
    this.playing = false;
    this.initialPlay = true;
    this.startOffset = 0;
    this.lastPlay = 0;
    this.lastPause = 0;
    this.pausedTime = 0;
    this.audiosource.stop();
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
  playTrack: function(offset) {
    if (this.playing) this.audiosource.stop();
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

    // currentTimeBox.textContent = formatTime(ac.currentTime - lastPlay);
    // remaining.textContent = formatTime((dur - lastPlay) - (ac.currentTime - lastPlay));

    if (parseInt(x) >= 100) {
      this.playing = !this.playing;
      return;
    }
    raf(this.triggerPlaying.bind(this));
  },
  currentTimeToPercent: function (currentTime) {
    var dur = this.audiosource.buffer.duration;
    var cur = (currentTime - this.pausedSum % 60) * 10;
    return ((cur / dur) * 10).toFixed(3);
  },
  resetVisual: function() {
    var ctx = this.wave.getContext('2d');
    ctx.clearRect(0, 0, this.wave.width, this.wave.length);
    ctx = this.waveProgress.querySelector('canvas').getContext('2d');
    ctx.clearRect(0, 0, this.wave.width, this.wave.length);
  },

  loadFile: function (file) {
    // emitter.emit('audio:status', {msg: 'loading file...'});
    // emitter.emit('audio:file', {file: file});

    var self = this;
    // set status and id3
    var reader = new FileReader();
    reader.onloadend = function(ev) {
      // emitter.emit('audio:status', {msg: 'decoding audio data...'});

      self.context.decodeAudioData(ev.target.result, function(buf) {
        // emitter.emit('audio:status', {msg: 'rendering wave...'});
        self.gainNode = self.context.createGain();
        self.audiosource = new AudioSource(self.context, {
          gainNode: self.gainNode
        });

        self.audiosource.buffer = buf;
        // self.audiosource.loadSilent();
        // draw buffers & hookup listeners
        drawBuffer(self.wave, buf, '#52F6A4');
        drawBuffer(self.progressWave.querySelector('canvas'), buf, '#F445F0');
      });
    };

    reader.readAsArrayBuffer(file);
  }
}


// function percentToCurrentTime(percent) {
//   // this method should take a percentage (gotten from clicking)
//   // and return the projected currentTime for that point.

//   // some intermediary logic will take care of calculating the
//   // offset and passing to the playmethod
//   var dur = as.buffer.duration;
//   var mod = dur % percent;
//   var offsetFromStart = (mod/dur) * 1000;
//   return offsetFromStart;
// }


// wave.addEventListener('click', function(ev) {
//   var percent = (ev.offsetX / 1200) * 100;
//   globalFutureTime = percentToCurrentTime(percent);
//   updateVisualProgress(percent);
//   console.log('le currentTime', ac.currentTime);
//   console.log('globfuttime', globalFutureTime);
//   playTrack(globalFutureTime)// - (ac.currentTime - initStartTime));
//   //
// });
},{"./draw-buffer":"/home/meandave/Code/split-audio/lib/draw-buffer.js","audiosource":"/home/meandave/Code/split-audio/node_modules/audiosource/index.js","dragdealer":"/home/meandave/Code/split-audio/node_modules/dragdealer/src/dragdealer.js","raf":"/home/meandave/Code/split-audio/node_modules/raf/index.js"}],"/home/meandave/Code/split-audio/main.js":[function(require,module,exports){
var EE = require('events').EventEmitter;
var dragDrop = require('drag-drop');
var AudioContext = require('audiocontext');
var AudioSource = require('audiosource');

var Track = require('./lib/track');
var trackTmp = require('./templates/track-tmp');

var emitter = new EE();
var audioContext = new AudioContext();
var masterGainNode = audioContext.createGain();

var workspaceEl = document.querySelector('#workspace');
var uploadBtn = document.querySelector('#upload');
var playBtn = document.querySelector('#play');
var pauseBtn = document.querySelector('#pause');
var stopBtn = document.querySelector('#stop');

var tracks = [];

dragDrop('body', function (files) {
  newTrack(files[0]);
});

uploadBtn.addEventListener('change', function(ev) {
  newTrack(ev.target.files[0]);
});

playBtn.addEventListener('click', function() {
  emitter.emit('tracks:play', {});
});

pauseBtn.addEventListener('click', function() {
  emitter.emit('tracks:pause', {});
});

stopBtn.addEventListener('click', function() {
  emitter.emit('tracks:stop', {});
});

function newTrack(file) {
  var containerEl = trackTmp();

  workspaceEl.appendChild(containerEl);
  tracks.push(new Track({
    containEl: containerEl,
    context: audioContext
  }, emitter));
  tracks[tracks.length - 1].loadFile(file);
}
},{"./lib/track":"/home/meandave/Code/split-audio/lib/track.js","./templates/track-tmp":"/home/meandave/Code/split-audio/templates/track-tmp.js","audiocontext":"/home/meandave/Code/split-audio/node_modules/audiocontext/src/audiocontext.js","audiosource":"/home/meandave/Code/split-audio/node_modules/audiosource/index.js","drag-drop":"/home/meandave/Code/split-audio/node_modules/drag-drop/index.js","events":"/usr/lib/node_modules/watchify/node_modules/browserify/node_modules/events/events.js"}],"/home/meandave/Code/split-audio/node_modules/audiocontext/src/audiocontext.js":[function(require,module,exports){
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

},{}],"/home/meandave/Code/split-audio/node_modules/audiosource/index.js":[function(require,module,exports){
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
      console.log('playtime', this.playTime);
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

},{}],"/home/meandave/Code/split-audio/node_modules/drag-drop/index.js":[function(require,module,exports){
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

},{"lodash.throttle":"/home/meandave/Code/split-audio/node_modules/drag-drop/node_modules/lodash.throttle/index.js"}],"/home/meandave/Code/split-audio/node_modules/drag-drop/node_modules/lodash.throttle/index.js":[function(require,module,exports){
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

},{"lodash.debounce":"/home/meandave/Code/split-audio/node_modules/drag-drop/node_modules/lodash.throttle/node_modules/lodash.debounce/index.js","lodash.isfunction":"/home/meandave/Code/split-audio/node_modules/drag-drop/node_modules/lodash.throttle/node_modules/lodash.isfunction/index.js","lodash.isobject":"/home/meandave/Code/split-audio/node_modules/drag-drop/node_modules/lodash.throttle/node_modules/lodash.isobject/index.js"}],"/home/meandave/Code/split-audio/node_modules/drag-drop/node_modules/lodash.throttle/node_modules/lodash.debounce/index.js":[function(require,module,exports){
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

},{"lodash.isfunction":"/home/meandave/Code/split-audio/node_modules/drag-drop/node_modules/lodash.throttle/node_modules/lodash.isfunction/index.js","lodash.isobject":"/home/meandave/Code/split-audio/node_modules/drag-drop/node_modules/lodash.throttle/node_modules/lodash.isobject/index.js","lodash.now":"/home/meandave/Code/split-audio/node_modules/drag-drop/node_modules/lodash.throttle/node_modules/lodash.debounce/node_modules/lodash.now/index.js"}],"/home/meandave/Code/split-audio/node_modules/drag-drop/node_modules/lodash.throttle/node_modules/lodash.debounce/node_modules/lodash.now/index.js":[function(require,module,exports){
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

},{"lodash._isnative":"/home/meandave/Code/split-audio/node_modules/drag-drop/node_modules/lodash.throttle/node_modules/lodash.debounce/node_modules/lodash.now/node_modules/lodash._isnative/index.js"}],"/home/meandave/Code/split-audio/node_modules/drag-drop/node_modules/lodash.throttle/node_modules/lodash.debounce/node_modules/lodash.now/node_modules/lodash._isnative/index.js":[function(require,module,exports){
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

},{}],"/home/meandave/Code/split-audio/node_modules/drag-drop/node_modules/lodash.throttle/node_modules/lodash.isfunction/index.js":[function(require,module,exports){
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

},{}],"/home/meandave/Code/split-audio/node_modules/drag-drop/node_modules/lodash.throttle/node_modules/lodash.isobject/index.js":[function(require,module,exports){
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

},{"lodash._objecttypes":"/home/meandave/Code/split-audio/node_modules/drag-drop/node_modules/lodash.throttle/node_modules/lodash.isobject/node_modules/lodash._objecttypes/index.js"}],"/home/meandave/Code/split-audio/node_modules/drag-drop/node_modules/lodash.throttle/node_modules/lodash.isobject/node_modules/lodash._objecttypes/index.js":[function(require,module,exports){
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

},{}],"/home/meandave/Code/split-audio/node_modules/dragdealer/src/dragdealer.js":[function(require,module,exports){
/**
 * Dragdealer.js 0.9.7
 * http://github.com/skidding/dragdealer
 *
 * (c) 2010+ Ovidiu Cherecheș
 * http://skidding.mit-license.org
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(factory);
  } else {
    // Browser globals
    root.Dragdealer = factory();
  }
}(this, function () {

var Dragdealer = function(wrapper, options) {
  /**
   * Drag-based component that works around two basic DOM elements.
   *
   *   - The wrapper: The top-level element with the .dragdealer class. We
   *                  create a Dragdealer instance with the wrapper as the
   *                  first constructor parameter (it can either receive the ID
   *                  of the wrapper, or the element itself.) The wrapper
   *                  establishes the dragging bounds.
   *
   *   - The handle: A child of the wrapper element, div with a required
   *                 .handle class (may be overridden in options). This will be
   *                 the dragged element, constrained by the wrapper's bounds.
   *
   *
   * The handle can be both smaller or bigger than the wrapper.
   *
   *   - When the handle is smaller, Dragdealer will act as a regular slider,
   *     enabling the handle to be dragged from one side of the wrapper to
   *     another.
   *
   *   - When the handle is bigger, Dragdealer will act a mask for a draggable
   *     surface, where the handle is the draggable surface contrained by the
   *     smaller bounds of the wrapper. The drag action in this case is used
   *     to reveal and "discover" partial content at a time.
   *
   *
   * Simple usage:
   *
   *   // JavaScript
   *   new Dragdealer('simple-slider');
   *
   *   <!-- HTML -->
   *   <div id="simple-slider" class="dragdealer">
   *     <div class="handle">drag me</div>
   *   </div>
   *
   *
   * The second parameter of the Dragdealer constructor is an object used for
   * specifying any of the supported options. All of them are optional.
   *
   *   - bool disabled=false: Init Dragdealer in a disabled state. The handle
   *                          will have a .disabled class.
   *
   *   - bool horizontal=true: Enable horizontal dragging.
   *
   *   - bool vertical=false: Enable vertical dragging.
   *
   *   - number x=0: Initial horizontal (left) position. Accepts a float number
   *                 value between 0 and 1. Read below about positioning in
   *                 Dragdealer.
   *
   *   - number y=0: Initial vertical (top) position. Accepts a float number
   *                 value between 0 and 1. Read below about positoning in
   *                 Dragdealer.
   *
   *   - number steps=0: Limit the positioning of the handle within the bounds
   *                     of the wrapper, by defining a virtual grid made out of
   *                     a number of equally-spaced steps. This restricts
   *                     placing the handle anywhere in-between these steps.
   *                     E.g. setting 3 steps to a regular slider will only
   *                     allow you to move it to the left, to the right or
   *                     exactly in the middle.
   *
   *   - bool snap=false: When a number of steps is set, snap the position of
   *                      the handle to its closest step instantly, even when
   *                      dragging.
   *
   *   - bool slide=true: Slide handle after releasing it, depending on the
   *                      movement speed before the mouse/touch release. The
   *                      formula for calculating how much will the handle
   *                      slide after releasing it is defined by simply
   *                      extending the movement of the handle in the current
   *                      direction, with the last movement unit times four (a
   *                      movement unit is considered the distance crossed
   *                      since the last animation loop, which is currently
   *                      25ms.) So if you were to drag the handle 50px in the
   *                      blink of an eye, it will slide another 200px in the
   *                      same direction. Steps interfere with this formula, as
   *                      the closest step is calculated before the sliding
   *                      distance.
   *
   *   - bool loose=false: Loosen-up wrapper boundaries when dragging. This
   *                       allows the handle to be *slightly* dragged outside
   *                       the bounds of the wrapper, but slides it back to the
   *                       margins of the wrapper upon release. The formula for
   *                       calculating how much the handle exceeds the wrapper
   *                       bounds is made out of the actual drag distance
   *                       divided by 4. E.g. Pulling a slider outside its
   *                       frame by 100px will only position it 25px outside
   *                       the frame.
   *
   *   - number top=0: Top padding between the wrapper and the handle.
   *
   *   - number bottom=0: Bottom padding between the wrapper and the handle.
   *
   *   - number left=0: Left padding between the wrapper and the handle.
   *
   *   - number right=0: Right padding between the wrapper and the handle.
   *
   *   - fn callback(x, y): Called when releasing handle, with the projected
   *                        x, y position of the handle. Projected value means
   *                        the value the slider will have after finishing a
   *                        sliding animation, caused by either a step
   *                        restriction or drag motion (see steps and slide
   *                        options.) This implies that the actual position of
   *                        the handle at the time this callback is called
   *                        might not yet reflect the x, y values received.
   *
   *   - fn animationCallback(x, y): Called every animation loop, as long as
   *                                 the handle is being dragged or in the
   *                                 process of a sliding animation. The x, y
   *                                 positional values received by this
   *                                 callback reflect the exact position of the
   *                                 handle DOM element, which includes
   *                                 exceeding values (even negative values)
   *                                 when the loose option is set true.
   *
   *   - string handleClass='handle': Custom class of handle element.
   *
   * Dragdealer also has a few methods to interact with, post-initialization.
   *
   *   - disable: Disable dragging of a Dragdealer instance. Just as with the
   *              disabled option, the handle will receive a .disabled class
   *
   *   - enable: Enable dragging of a Dragdealer instance. The .disabled class
   *             of the handle will be removed.
   *
   *   - reflow: Recalculate the wrapper bounds of a Dragdealer instance, used
   *             when the wrapper is responsive and its parent container
   *             changed its size, or after changing the size of the wrapper
   *             directly.
   *
   *   - getValue: Get the value of a Dragdealer instance programatically. The
   *               value is returned as an [x, y] tuple and is the equivalent
   *               of the (projected) value returned by the regular callback,
   *               not animationCallback.
   *
   *   - getStep: Same as getValue, but the value returned is in step
   *              increments (see steps option)
   *
   *   - setValue(x, y, snap=false): Set the value of a Dragdealer instance
   *                                 programatically. The 3rd parameter allows
   *                                 to snap the handle directly to the desired
   *                                 value, without any sliding transition.
   *
   *   - setStep(x, y, snap=false): Same as setValue, but the value is received
   *                                in step increments (see steps option)
   *
   *
   * Positioning in Dragdealer:
   *
   *   Besides the top, bottom, left and right paddings, which represent a
   *   number of pixels, Dragdealer uses a [0, 1]-based positioning. Both
   *   horizontal and vertical positions are represented by ratios between 0
   *   and 1. This allows the Dragdealer wrapper to have a responsive size and
   *   not revolve around a specific number of pixels. This is how the x, y
   *   options are set, what the callback args contain and what values the
   *   setValue method expects. Once picked up, the ratios can be scaled and
   *   mapped to match any real-life system of coordinates or dimensions.
   */
  this.bindMethods();
  this.options = this.applyDefaults(options || {});
  this.wrapper = this.getWrapperElement(wrapper);
  if (!this.wrapper) {
    return;
  }
  this.handle = this.getHandleElement(this.wrapper, this.options.handleClass);
  if (!this.handle) {
    return;
  }
  this.init();
  this.bindEventListeners();
};
Dragdealer.prototype = {
  defaults: {
    disabled: false,
    horizontal: true,
    vertical: false,
    slide: true,
    steps: 0,
    snap: false,
    loose: false,
    speed: 0.1,
    xPrecision: 0,
    yPrecision: 0,
    handleClass: 'handle'
  },
  init: function() {
    this.value = {
      prev: [-1, -1],
      current: [this.options.x || 0, this.options.y || 0],
      target: [this.options.x || 0, this.options.y || 0]
    };
    this.offset = {
      wrapper: [0, 0],
      mouse: [0, 0],
      prev: [-999999, -999999],
      current: [0, 0],
      target: [0, 0]
    };
    this.change = [0, 0];
    this.stepRatios = this.calculateStepRatios();

    this.activity = false;
    this.dragging = false;
    this.tapping = false;

    this.reflow();
    if (this.options.disabled) {
      this.disable();
    }
  },
  applyDefaults: function(options) {
    for (var k in this.defaults) {
      if (!options.hasOwnProperty(k)) {
        options[k] = this.defaults[k];
      }
    }
    return options;
  },
  getWrapperElement: function(wrapper) {
    if (typeof(wrapper) == 'string') {
      return document.getElementById(wrapper);
    } else {
      return wrapper;
    }
  },
  getHandleElement: function(wrapper, handleClass) {
    var childElements,
        handleClassMatcher,
        i;
    if (wrapper.getElementsByClassName) {
      childElements = wrapper.getElementsByClassName(handleClass);
      if (childElements.length > 0) {
        return childElements[0];
      }
    } else {
      handleClassMatcher = new RegExp('(^|\\s)' + handleClass + '(\\s|$)');
      childElements = wrapper.getElementsByTagName('*');
      for (i = 0; i < childElements.length; i++) {
        if (handleClassMatcher.test(childElements[i].className)) {
          return childElements[i];
        }
      }
    }
  },
  calculateStepRatios: function() {
    var stepRatios = [];
    if (this.options.steps > 1) {
      for (var i = 0; i <= this.options.steps - 1; i++) {
        stepRatios[i] = i / (this.options.steps - 1);
      }
    }
    return stepRatios;
  },
  setWrapperOffset: function() {
    this.offset.wrapper = Position.get(this.wrapper);
  },
  calculateBounds: function() {
    // Apply top/bottom/left and right padding options to wrapper extremities
    // when calculating its bounds
    var bounds = {
      top: this.options.top || 0,
      bottom: -(this.options.bottom || 0) + this.wrapper.offsetHeight,
      left: this.options.left || 0,
      right: -(this.options.right || 0) + this.wrapper.offsetWidth
    };
    // The available width and height represents the horizontal and vertical
    // space the handle has for moving. It is determined by the width and
    // height of the wrapper, minus the width and height of the handle
    bounds.availWidth = (bounds.right - bounds.left) - this.handle.offsetWidth;
    bounds.availHeight = (bounds.bottom - bounds.top) - this.handle.offsetHeight;
    return bounds;
  },
  calculateValuePrecision: function() {
    // The sliding transition works by dividing itself until it reaches a min
    // value step; because Dragdealer works with [0-1] values, we need this
    // "min value step" to represent a pixel when applied to the real handle
    // position within the DOM. The xPrecision/yPrecision options can be
    // specified to increase the granularity when we're controlling larger
    // objects from one of the callbacks
    var xPrecision = this.options.xPrecision || Math.abs(this.bounds.availWidth),
        yPrecision = this.options.yPrecision || Math.abs(this.bounds.availHeight);
    return [
      xPrecision ? 1 / xPrecision : 0,
      yPrecision ? 1 / yPrecision : 0
    ];
  },
  bindMethods: function() {
    this.onHandleMouseDown = bind(this.onHandleMouseDown, this);
    this.onHandleTouchStart = bind(this.onHandleTouchStart, this);
    this.onDocumentMouseMove = bind(this.onDocumentMouseMove, this);
    this.onWrapperTouchMove = bind(this.onWrapperTouchMove, this);
    this.onWrapperMouseDown = bind(this.onWrapperMouseDown, this);
    this.onWrapperTouchStart = bind(this.onWrapperTouchStart, this);
    this.onDocumentMouseUp = bind(this.onDocumentMouseUp, this);
    this.onDocumentTouchEnd = bind(this.onDocumentTouchEnd, this);
    this.onHandleClick = bind(this.onHandleClick, this);
    this.onWindowResize = bind(this.onWindowResize, this);
  },
  bindEventListeners: function() {
    // Start dragging
    addEventListener(this.handle, 'mousedown', this.onHandleMouseDown);
    addEventListener(this.handle, 'touchstart', this.onHandleTouchStart);
    // While dragging
    addEventListener(document, 'mousemove', this.onDocumentMouseMove);
    addEventListener(this.wrapper, 'touchmove', this.onWrapperTouchMove);
    // Start tapping
    addEventListener(this.wrapper, 'mousedown', this.onWrapperMouseDown);
    addEventListener(this.wrapper, 'touchstart', this.onWrapperTouchStart);
    // Stop dragging/tapping
    addEventListener(document, 'mouseup', this.onDocumentMouseUp);
    addEventListener(document, 'touchend', this.onDocumentTouchEnd);

    addEventListener(this.handle, 'click', this.onHandleClick);
    addEventListener(window, 'resize', this.onWindowResize);

    var _this = this;
    this.interval = setInterval(function() {
      _this.animate();
    }, 25);
    this.animate(false, true);
  },
  unbindEventListeners: function() {
    removeEventListener(this.handle, 'mousedown', this.onHandleMouseDown);
    removeEventListener(this.handle, 'touchstart', this.onHandleTouchStart);
    removeEventListener(document, 'mousemove', this.onDocumentMouseMove);
    removeEventListener(this.wrapper, 'touchmove', this.onWrapperTouchMove);
    removeEventListener(this.wrapper, 'mousedown', this.onWrapperMouseDown);
    removeEventListener(this.wrapper, 'touchstart', this.onWrapperTouchStart);
    removeEventListener(document, 'mouseup', this.onDocumentMouseUp);
    removeEventListener(document, 'touchend', this.onDocumentTouchEnd);
    removeEventListener(this.handle, 'click', this.onHandleClick);
    removeEventListener(window, 'resize', this.onWindowResize);

    clearInterval(this.interval);
  },
  onHandleMouseDown: function(e) {
    Cursor.refresh(e);
    preventEventDefaults(e);
    stopEventPropagation(e);
    this.activity = false;
    this.startDrag();
  },
  onHandleTouchStart: function(e) {
    Cursor.refresh(e);
    // Unlike in the `mousedown` event handler, we don't prevent defaults here,
    // because this would disable the dragging altogether. Instead, we prevent
    // it in the `touchmove` handler. Read more about touch events
    // https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Touch_events#Handling_clicks
    stopEventPropagation(e);
    this.activity = false;
    this.startDrag();
  },
  onDocumentMouseMove: function(e) {
    Cursor.refresh(e);
    if (this.dragging) {
      this.activity = true;
    }
  },
  onWrapperTouchMove: function(e) {
    Cursor.refresh(e);
    // Dragging on a disabled axis (horizontal or vertical) shouldn't prevent
    // defaults on touch devices. !this.activity denotes this is the first move
    // inside a drag action; you can drag in any direction after this point if
    // the dragging wasn't stopped
    if (!this.activity && this.draggingOnDisabledAxis()) {
      if (this.dragging) {
        this.stopDrag();
      }
      return;
    }
    // Read comment in `onHandleTouchStart` above, to understand why we're
    // preventing defaults here and not there
    preventEventDefaults(e);
    this.activity = true;
  },
  onWrapperMouseDown: function(e) {
    Cursor.refresh(e);
    preventEventDefaults(e);
    this.startTap();
  },
  onWrapperTouchStart: function(e) {
    Cursor.refresh(e);
    preventEventDefaults(e);
    this.startTap();
  },
  onDocumentMouseUp: function(e) {
    this.stopDrag();
    this.stopTap();
  },
  onDocumentTouchEnd: function(e) {
    this.stopDrag();
    this.stopTap();
  },
  onHandleClick: function(e) {
    // We keep track if any dragging activity has been made between the
    // mouse/touch down and up events; based on this we allow or cancel a click
    // event from inside the handle. i.e. Click events shouldn't be triggered
    // when dragging, but should be allowed when clicking still
    if (this.activity) {
      preventEventDefaults(e);
      stopEventPropagation(e);
    }
  },
  onWindowResize: function(e) {
    this.reflow();
  },
  enable: function() {
    this.disabled = false;
    this.handle.className = this.handle.className.replace(/\s?disabled/g, '');
  },
  disable: function() {
    this.disabled = true;
    this.handle.className += ' disabled';
  },
  reflow: function() {
    this.setWrapperOffset();
    this.bounds = this.calculateBounds();
    this.valuePrecision = this.calculateValuePrecision();
    this.updateOffsetFromValue();
  },
  getStep: function() {
    return [
      this.getStepNumber(this.value.target[0]),
      this.getStepNumber(this.value.target[1])
    ];
  },
  getValue: function() {
    return this.value.target;
  },
  setStep: function(x, y, snap) {
    this.setValue(
      this.options.steps && x > 1 ? (x - 1) / (this.options.steps - 1) : 0,
      this.options.steps && y > 1 ? (y - 1) / (this.options.steps - 1) : 0,
      snap
    );
  },
  setValue: function(x, y, snap) {
    this.setTargetValue([x, y || 0]);
    if (snap) {
      this.groupCopy(this.value.current, this.value.target);
      // Since the current value will be equal to the target one instantly, the
      // animate function won't get to run so we need to update the positions
      // and call the callbacks manually
      this.updateOffsetFromValue();
      this.callAnimationCallback();
    }
  },
  startTap: function() {
    if (this.disabled) {
      return;
    }
    this.tapping = true;
    this.setWrapperOffset();

    this.setTargetValueByOffset([
      Cursor.x - this.offset.wrapper[0] - (this.handle.offsetWidth / 2),
      Cursor.y - this.offset.wrapper[1] - (this.handle.offsetHeight / 2)
    ]);
  },
  stopTap: function() {
    if (this.disabled || !this.tapping) {
      return;
    }
    this.tapping = false;

    this.setTargetValue(this.value.current);
  },
  startDrag: function() {
    if (this.disabled) {
      return;
    }
    this.dragging = true;
    this.setWrapperOffset();

    this.offset.mouse = [
      Cursor.x - Position.get(this.handle)[0],
      Cursor.y - Position.get(this.handle)[1]
    ];
  },
  stopDrag: function() {
    if (this.disabled || !this.dragging) {
      return;
    }
    this.dragging = false;

    var target = this.groupClone(this.value.current);
    if (this.options.slide) {
      var ratioChange = this.change;
      target[0] += ratioChange[0] * 4;
      target[1] += ratioChange[1] * 4;
    }
    this.setTargetValue(target);
  },
  callAnimationCallback: function() {
    var value = this.value.current;
    if (this.options.snap && this.options.steps > 1) {
      value = this.getClosestSteps(value);
    }
    if (!this.groupCompare(value, this.value.prev)) {
      if (typeof(this.options.animationCallback) == 'function') {
        this.options.animationCallback.call(this, value[0], value[1]);
      }
      this.groupCopy(this.value.prev, value);
    }
  },
  callTargetCallback: function() {
    if (typeof(this.options.callback) == 'function') {
      this.options.callback.call(this, this.value.target[0], this.value.target[1]);
    }
  },
  animate: function(direct, first) {
    if (direct && !this.dragging) {
      return;
    }
    if (this.dragging) {
      var prevTarget = this.groupClone(this.value.target);

      var offset = [
        Cursor.x - this.offset.wrapper[0] - this.offset.mouse[0],
        Cursor.y - this.offset.wrapper[1] - this.offset.mouse[1]
      ];
      this.setTargetValueByOffset(offset, this.options.loose);

      this.change = [
        this.value.target[0] - prevTarget[0],
        this.value.target[1] - prevTarget[1]
      ];
    }
    if (this.dragging || first) {
      this.groupCopy(this.value.current, this.value.target);
    }
    if (this.dragging || this.glide() || first) {
      this.updateOffsetFromValue();
      this.callAnimationCallback();
    }
  },
  glide: function() {
    var diff = [
      this.value.target[0] - this.value.current[0],
      this.value.target[1] - this.value.current[1]
    ];
    if (!diff[0] && !diff[1]) {
      return false;
    }
    if (Math.abs(diff[0]) > this.valuePrecision[0] ||
        Math.abs(diff[1]) > this.valuePrecision[1]) {
      this.value.current[0] += diff[0] * this.options.speed;
      this.value.current[1] += diff[1] * this.options.speed;
    } else {
      this.groupCopy(this.value.current, this.value.target);
    }
    return true;
  },
  updateOffsetFromValue: function() {
    if (!this.options.snap) {
      this.offset.current = this.getOffsetsByRatios(this.value.current);
    } else {
      this.offset.current = this.getOffsetsByRatios(
        this.getClosestSteps(this.value.current)
      );
    }
    if (!this.groupCompare(this.offset.current, this.offset.prev)) {
      this.renderHandlePosition();
      this.groupCopy(this.offset.prev, this.offset.current);
    }
  },
  renderHandlePosition: function() {
    if (this.options.horizontal) {
      this.handle.style.left = String(this.offset.current[0]) + 'px';
    }
    if (this.options.vertical) {
      this.handle.style.top = String(this.offset.current[1]) + 'px';
    }
  },
  setTargetValue: function(value, loose) {
    var target = loose ? this.getLooseValue(value) : this.getProperValue(value);

    this.groupCopy(this.value.target, target);
    this.offset.target = this.getOffsetsByRatios(target);

    this.callTargetCallback();
  },
  setTargetValueByOffset: function(offset, loose) {
    var value = this.getRatiosByOffsets(offset);
    var target = loose ? this.getLooseValue(value) : this.getProperValue(value);

    this.groupCopy(this.value.target, target);
    this.offset.target = this.getOffsetsByRatios(target);
  },
  getLooseValue: function(value) {
    var proper = this.getProperValue(value);
    return [
      proper[0] + ((value[0] - proper[0]) / 4),
      proper[1] + ((value[1] - proper[1]) / 4)
    ];
  },
  getProperValue: function(value) {
    var proper = this.groupClone(value);

    proper[0] = Math.max(proper[0], 0);
    proper[1] = Math.max(proper[1], 0);
    proper[0] = Math.min(proper[0], 1);
    proper[1] = Math.min(proper[1], 1);

    if ((!this.dragging && !this.tapping) || this.options.snap) {
      if (this.options.steps > 1) {
        proper = this.getClosestSteps(proper);
      }
    }
    return proper;
  },
  getRatiosByOffsets: function(group) {
    return [
      this.getRatioByOffset(group[0], this.bounds.availWidth, this.bounds.left),
      this.getRatioByOffset(group[1], this.bounds.availHeight, this.bounds.top)
    ];
  },
  getRatioByOffset: function(offset, range, padding) {
    return range ? (offset - padding) / range : 0;
  },
  getOffsetsByRatios: function(group) {
    return [
      this.getOffsetByRatio(group[0], this.bounds.availWidth, this.bounds.left),
      this.getOffsetByRatio(group[1], this.bounds.availHeight, this.bounds.top)
    ];
  },
  getOffsetByRatio: function(ratio, range, padding) {
    return Math.round(ratio * range) + padding;
  },
  getStepNumber: function(value) {
    // Translate a [0-1] value into a number from 1 to N steps (set using the
    // "steps" option)
    return this.getClosestStep(value) * (this.options.steps - 1) + 1;
  },
  getClosestSteps: function(group) {
    return [
      this.getClosestStep(group[0]),
      this.getClosestStep(group[1])
    ];
  },
  getClosestStep: function(value) {
    var k = 0;
    var min = 1;
    for (var i = 0; i <= this.options.steps - 1; i++) {
      if (Math.abs(this.stepRatios[i] - value) < min) {
        min = Math.abs(this.stepRatios[i] - value);
        k = i;
      }
    }
    return this.stepRatios[k];
  },
  groupCompare: function(a, b) {
    return a[0] == b[0] && a[1] == b[1];
  },
  groupCopy: function(a, b) {
    a[0] = b[0];
    a[1] = b[1];
  },
  groupClone: function(a) {
    return [a[0], a[1]];
  },
  draggingOnDisabledAxis: function() {
    return (!this.options.horizontal && Cursor.xDiff > Cursor.yDiff) ||
           (!this.options.vertical && Cursor.yDiff > Cursor.xDiff);
  }
};


var bind = function(fn, context) {
  /**
   * CoffeeScript-like function to bind the scope of a method to an instance,
   * the context of that method, regardless from where it is called
   */
  return function() {
    return fn.apply(context, arguments);
  };
};

// Cross-browser vanilla JS event handling

var addEventListener = function(element, type, callback) {
  if (element.addEventListener) {
    element.addEventListener(type, callback, false);
  } else if (element.attachEvent) {
    element.attachEvent('on' + type, callback);
  }
};

var removeEventListener = function(element, type, callback) {
  if (element.removeEventListener) {
    element.removeEventListener(type, callback, false);
  } else if (element.detachEvent) {
    element.detachEvent('on' + type, callback);
  }
};

var preventEventDefaults = function(e) {
  if (!e) {
    e = window.event;
  }
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.returnValue = false;
};

var stopEventPropagation = function(e) {
  if (!e) {
    e = window.event;
  }
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  e.cancelBubble = true;
};


var Cursor = {
  /**
   * Abstraction for making the combined mouse or touch position available at
   * any time.
   *
   * It picks up the "move" events as an independent component and simply makes
   * the latest x and y mouse/touch position of the user available at any time,
   * which is requested with Cursor.x and Cursor.y respectively.
   *
   * It can receive both mouse and touch events consecutively, extracting the
   * relevant meta data from each type of event.
   *
   * Cursor.refresh(e) is called to update the global x and y values, with a
   * genuine MouseEvent or a TouchEvent from an event listener, e.g.
   * mousedown/up or touchstart/end
   */
  x: 0,
  y: 0,
  xDiff: 0,
  yDiff: 0,
  refresh: function(e) {
    if (!e) {
      e = window.event;
    }
    if (e.type == 'mousemove') {
      this.set(e);
    } else if (e.touches) {
      this.set(e.touches[0]);
    }
  },
  set: function(e) {
    var lastX = this.x,
        lastY = this.y;
    if (e.pageX || e.pageY) {
      this.x = e.pageX;
      this.y = e.pageY;
    } else if (e.clientX || e.clientY) {
      this.x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
      this.y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }
    this.xDiff = Math.abs(this.x - lastX);
    this.yDiff = Math.abs(this.y - lastY);
  }
};


var Position = {
  /**
   * Helper for extracting the absolute position of a DOM element, relative to
   * the root-level document body.
   *
   * The get(obj) method accepts a DOM element as the only parameter, and
   * returns the position under a (x, y) tuple, as an array with two elements.
   *
   * Inspired from http://www.quirksmode.org/js/findpos.html
   */
  get: function(obj) {
    var curleft = 0,
        curtop = 0;
    if (obj.offsetParent) {
      do {
        curleft += obj.offsetLeft;
        curtop += obj.offsetTop;
      }
      while ((obj = obj.offsetParent));
    }
    return [curleft, curtop];
  }
};

return Dragdealer;

}));

},{}],"/home/meandave/Code/split-audio/node_modules/hyperscript/index.js":[function(require,module,exports){
var split = require('browser-split')
var ClassList = require('class-list')
var DataSet = require('data-set')
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
            DataSet(e)[k.substr(5)] = l[k]
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

},{"browser-split":"/home/meandave/Code/split-audio/node_modules/hyperscript/node_modules/browser-split/index.js","class-list":"/home/meandave/Code/split-audio/node_modules/hyperscript/node_modules/class-list/index.js","data-set":"/home/meandave/Code/split-audio/node_modules/hyperscript/node_modules/data-set/index.js","html-element":"/usr/lib/node_modules/watchify/node_modules/browserify/node_modules/browser-resolve/empty.js"}],"/home/meandave/Code/split-audio/node_modules/hyperscript/node_modules/browser-split/index.js":[function(require,module,exports){
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

},{}],"/home/meandave/Code/split-audio/node_modules/hyperscript/node_modules/class-list/index.js":[function(require,module,exports){
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

},{"indexof":"/home/meandave/Code/split-audio/node_modules/hyperscript/node_modules/class-list/node_modules/indexof/index.js"}],"/home/meandave/Code/split-audio/node_modules/hyperscript/node_modules/class-list/node_modules/indexof/index.js":[function(require,module,exports){

var indexOf = [].indexOf;

module.exports = function(arr, obj){
  if (indexOf) return arr.indexOf(obj);
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === obj) return i;
  }
  return -1;
};
},{}],"/home/meandave/Code/split-audio/node_modules/hyperscript/node_modules/data-set/index.js":[function(require,module,exports){
var Weakmap = require("weakmap")
var Individual = require("individual")

var datasetMap = Individual("__DATA_SET_WEAKMAP", Weakmap())

module.exports = DataSet

function DataSet(elem) {
    if (elem.dataset) {
        return elem.dataset
    }

    var hash = datasetMap.get(elem)

    if (!hash) {
        hash = createHash(elem)
        datasetMap.set(elem, hash)
    }

    return hash
}

function createHash(elem) {
    var attributes = elem.attributes
    var hash = {}

    if (attributes === null || attributes === undefined) {
        return hash
    }

    for (var i = 0; i < attributes.length; i++) {
        var attr = attributes[i]

        if (attr.name.substr(0,5) !== "data-") {
            continue
        }

        hash[attr.name.substr(5)] = attr.value
    }

    return hash
}

},{"individual":"/home/meandave/Code/split-audio/node_modules/hyperscript/node_modules/data-set/node_modules/individual/index.js","weakmap":"/home/meandave/Code/split-audio/node_modules/hyperscript/node_modules/data-set/node_modules/weakmap/weakmap.js"}],"/home/meandave/Code/split-audio/node_modules/hyperscript/node_modules/data-set/node_modules/individual/index.js":[function(require,module,exports){
var root = require("global")

module.exports = Individual

function Individual(key, value) {
    if (root[key]) {
        return root[key]
    }

    Object.defineProperty(root, key, {
        value: value
        , configurable: true
    })

    return value
}

},{"global":"/home/meandave/Code/split-audio/node_modules/hyperscript/node_modules/data-set/node_modules/individual/node_modules/global/index.js"}],"/home/meandave/Code/split-audio/node_modules/hyperscript/node_modules/data-set/node_modules/individual/node_modules/global/index.js":[function(require,module,exports){
(function (global){
/*global window, global*/
if (typeof global !== "undefined") {
    module.exports = global
} else if (typeof window !== "undefined") {
    module.exports = window
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],"/home/meandave/Code/split-audio/node_modules/hyperscript/node_modules/data-set/node_modules/weakmap/weakmap.js":[function(require,module,exports){
/* (The MIT License)
 *
 * Copyright (c) 2012 Brandon Benvie <http://bbenvie.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the 'Software'), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included with all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
 * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY  CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// Original WeakMap implementation by Gozala @ https://gist.github.com/1269991
// Updated and bugfixed by Raynos @ https://gist.github.com/1638059
// Expanded by Benvie @ https://github.com/Benvie/harmony-collections

void function(global, undefined_, undefined){
  var getProps = Object.getOwnPropertyNames,
      defProp  = Object.defineProperty,
      toSource = Function.prototype.toString,
      create   = Object.create,
      hasOwn   = Object.prototype.hasOwnProperty,
      funcName = /^\n?function\s?(\w*)?_?\(/;


  function define(object, key, value){
    if (typeof key === 'function') {
      value = key;
      key = nameOf(value).replace(/_$/, '');
    }
    return defProp(object, key, { configurable: true, writable: true, value: value });
  }

  function nameOf(func){
    return typeof func !== 'function'
          ? '' : 'name' in func
          ? func.name : toSource.call(func).match(funcName)[1];
  }

  // ############
  // ### Data ###
  // ############

  var Data = (function(){
    var dataDesc = { value: { writable: true, value: undefined } },
        datalock = 'return function(k){if(k===s)return l}',
        uids     = create(null),

        createUID = function(){
          var key = Math.random().toString(36).slice(2);
          return key in uids ? createUID() : uids[key] = key;
        },

        globalID = createUID(),

        storage = function(obj){
          if (hasOwn.call(obj, globalID))
            return obj[globalID];

          if (!Object.isExtensible(obj))
            throw new TypeError("Object must be extensible");

          var store = create(null);
          defProp(obj, globalID, { value: store });
          return store;
        };

    // common per-object storage area made visible by patching getOwnPropertyNames'
    define(Object, function getOwnPropertyNames(obj){
      var props = getProps(obj);
      if (hasOwn.call(obj, globalID))
        props.splice(props.indexOf(globalID), 1);
      return props;
    });

    function Data(){
      var puid = createUID(),
          secret = {};

      this.unlock = function(obj){
        var store = storage(obj);
        if (hasOwn.call(store, puid))
          return store[puid](secret);

        var data = create(null, dataDesc);
        defProp(store, puid, {
          value: new Function('s', 'l', datalock)(secret, data)
        });
        return data;
      }
    }

    define(Data.prototype, function get(o){ return this.unlock(o).value });
    define(Data.prototype, function set(o, v){ this.unlock(o).value = v });

    return Data;
  }());


  var WM = (function(data){
    var validate = function(key){
      if (key == null || typeof key !== 'object' && typeof key !== 'function')
        throw new TypeError("Invalid WeakMap key");
    }

    var wrap = function(collection, value){
      var store = data.unlock(collection);
      if (store.value)
        throw new TypeError("Object is already a WeakMap");
      store.value = value;
    }

    var unwrap = function(collection){
      var storage = data.unlock(collection).value;
      if (!storage)
        throw new TypeError("WeakMap is not generic");
      return storage;
    }

    var initialize = function(weakmap, iterable){
      if (iterable !== null && typeof iterable === 'object' && typeof iterable.forEach === 'function') {
        iterable.forEach(function(item, i){
          if (item instanceof Array && item.length === 2)
            set.call(weakmap, iterable[i][0], iterable[i][1]);
        });
      }
    }


    function WeakMap(iterable){
      if (this === global || this == null || this === WeakMap.prototype)
        return new WeakMap(iterable);

      wrap(this, new Data);
      initialize(this, iterable);
    }

    function get(key){
      validate(key);
      var value = unwrap(this).get(key);
      return value === undefined_ ? undefined : value;
    }

    function set(key, value){
      validate(key);
      // store a token for explicit undefined so that "has" works correctly
      unwrap(this).set(key, value === undefined ? undefined_ : value);
    }

    function has(key){
      validate(key);
      return unwrap(this).get(key) !== undefined;
    }

    function delete_(key){
      validate(key);
      var data = unwrap(this),
          had = data.get(key) !== undefined;
      data.set(key, undefined);
      return had;
    }

    function toString(){
      unwrap(this);
      return '[object WeakMap]';
    }

    try {
      var src = ('return '+delete_).replace('e_', '\\u0065'),
          del = new Function('unwrap', 'validate', src)(unwrap, validate);
    } catch (e) {
      var del = delete_;
    }

    var src = (''+Object).split('Object');
    var stringifier = function toString(){
      return src[0] + nameOf(this) + src[1];
    };

    define(stringifier, stringifier);

    var prep = { __proto__: [] } instanceof Array
      ? function(f){ f.__proto__ = stringifier }
      : function(f){ define(f, stringifier) };

    prep(WeakMap);

    [toString, get, set, has, del].forEach(function(method){
      define(WeakMap.prototype, method);
      prep(method);
    });

    return WeakMap;
  }(new Data));

  var defaultCreator = Object.create
    ? function(){ return Object.create(null) }
    : function(){ return {} };

  function createStorage(creator){
    var weakmap = new WM;
    creator || (creator = defaultCreator);

    function storage(object, value){
      if (value || arguments.length === 2) {
        weakmap.set(object, value);
      } else {
        value = weakmap.get(object);
        if (value === undefined) {
          value = creator(object);
          weakmap.set(object, value);
        }
      }
      return value;
    }

    return storage;
  }


  if (typeof module !== 'undefined') {
    module.exports = WM;
  } else if (typeof exports !== 'undefined') {
    exports.WeakMap = WM;
  } else if (!('WeakMap' in global)) {
    global.WeakMap = WM;
  }

  WM.createStorage = createStorage;
  if (global.WeakMap)
    global.WeakMap.createStorage = createStorage;
}((0, eval)('this'));

},{}],"/home/meandave/Code/split-audio/node_modules/raf/index.js":[function(require,module,exports){
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

},{"performance-now":"/home/meandave/Code/split-audio/node_modules/raf/node_modules/performance-now/lib/performance-now.js"}],"/home/meandave/Code/split-audio/node_modules/raf/node_modules/performance-now/lib/performance-now.js":[function(require,module,exports){
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
},{"_process":"/usr/lib/node_modules/watchify/node_modules/browserify/node_modules/process/browser.js"}],"/home/meandave/Code/split-audio/templates/control-tmp.js":[function(require,module,exports){
var h = require('hyperscript');

module.exports = function() {
  return h('div.control',
           h('span.de', "deactivate"),
           h('div.volume',
             h('input', {"type": 'range', "min": '0', "max": '11', "step": "1", "value": "5"})),
           h('span.mute', "mute"),
           h('div.info',
             h('p', "Title: ",
               h('i.title', {'contentEditable': true}, "Track 1")),
             h('article.info',
               h('p', "Current Time: ",
                 h('i.cur', "00:00:00")),
               h('p', "Duration: ",
                 h('i.dur', "00:00:00")),
               h('p', "Remaining: ",
                 h('i.rem', "00:00:00")))),
           h('span.collapse', "collapse"));
}

},{"hyperscript":"/home/meandave/Code/split-audio/node_modules/hyperscript/index.js"}],"/home/meandave/Code/split-audio/templates/track-tmp.js":[function(require,module,exports){
var h = require('hyperscript');
var controlTmp = require('./control-tmp');

module.exports = function() {
  return h('div.track-space',
           controlTmp(),
           h('div.track',
             h('p',
               "drag file 2 edit"),
             h('div.play-cursor'),
             h('canvas.wave', { 'width': '1200', 'height': '300'}),
             h('div.wave-progress',
               h('canvas', {'width': '1200', 'height': '300'}))));
}
},{"./control-tmp":"/home/meandave/Code/split-audio/templates/control-tmp.js","hyperscript":"/home/meandave/Code/split-audio/node_modules/hyperscript/index.js"}],"/usr/lib/node_modules/watchify/node_modules/browserify/node_modules/browser-resolve/empty.js":[function(require,module,exports){

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

},{}]},{},["/home/meandave/Code/split-audio/main.js"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbGliL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL2hvbWUvbWVhbmRhdmUvQ29kZS9zcGxpdC1hdWRpby9saWIvZHJhdy1idWZmZXIuanMiLCIvaG9tZS9tZWFuZGF2ZS9Db2RlL3NwbGl0LWF1ZGlvL2xpYi90cmFjay5qcyIsIi9ob21lL21lYW5kYXZlL0NvZGUvc3BsaXQtYXVkaW8vbWFpbi5qcyIsIi9ob21lL21lYW5kYXZlL0NvZGUvc3BsaXQtYXVkaW8vbm9kZV9tb2R1bGVzL2F1ZGlvY29udGV4dC9zcmMvYXVkaW9jb250ZXh0LmpzIiwiL2hvbWUvbWVhbmRhdmUvQ29kZS9zcGxpdC1hdWRpby9ub2RlX21vZHVsZXMvYXVkaW9zb3VyY2UvaW5kZXguanMiLCIvaG9tZS9tZWFuZGF2ZS9Db2RlL3NwbGl0LWF1ZGlvL25vZGVfbW9kdWxlcy9kcmFnLWRyb3AvaW5kZXguanMiLCIvaG9tZS9tZWFuZGF2ZS9Db2RlL3NwbGl0LWF1ZGlvL25vZGVfbW9kdWxlcy9kcmFnLWRyb3Avbm9kZV9tb2R1bGVzL2xvZGFzaC50aHJvdHRsZS9pbmRleC5qcyIsIi9ob21lL21lYW5kYXZlL0NvZGUvc3BsaXQtYXVkaW8vbm9kZV9tb2R1bGVzL2RyYWctZHJvcC9ub2RlX21vZHVsZXMvbG9kYXNoLnRocm90dGxlL25vZGVfbW9kdWxlcy9sb2Rhc2guZGVib3VuY2UvaW5kZXguanMiLCIvaG9tZS9tZWFuZGF2ZS9Db2RlL3NwbGl0LWF1ZGlvL25vZGVfbW9kdWxlcy9kcmFnLWRyb3Avbm9kZV9tb2R1bGVzL2xvZGFzaC50aHJvdHRsZS9ub2RlX21vZHVsZXMvbG9kYXNoLmRlYm91bmNlL25vZGVfbW9kdWxlcy9sb2Rhc2gubm93L2luZGV4LmpzIiwiL2hvbWUvbWVhbmRhdmUvQ29kZS9zcGxpdC1hdWRpby9ub2RlX21vZHVsZXMvZHJhZy1kcm9wL25vZGVfbW9kdWxlcy9sb2Rhc2gudGhyb3R0bGUvbm9kZV9tb2R1bGVzL2xvZGFzaC5kZWJvdW5jZS9ub2RlX21vZHVsZXMvbG9kYXNoLm5vdy9ub2RlX21vZHVsZXMvbG9kYXNoLl9pc25hdGl2ZS9pbmRleC5qcyIsIi9ob21lL21lYW5kYXZlL0NvZGUvc3BsaXQtYXVkaW8vbm9kZV9tb2R1bGVzL2RyYWctZHJvcC9ub2RlX21vZHVsZXMvbG9kYXNoLnRocm90dGxlL25vZGVfbW9kdWxlcy9sb2Rhc2guaXNmdW5jdGlvbi9pbmRleC5qcyIsIi9ob21lL21lYW5kYXZlL0NvZGUvc3BsaXQtYXVkaW8vbm9kZV9tb2R1bGVzL2RyYWctZHJvcC9ub2RlX21vZHVsZXMvbG9kYXNoLnRocm90dGxlL25vZGVfbW9kdWxlcy9sb2Rhc2guaXNvYmplY3QvaW5kZXguanMiLCIvaG9tZS9tZWFuZGF2ZS9Db2RlL3NwbGl0LWF1ZGlvL25vZGVfbW9kdWxlcy9kcmFnLWRyb3Avbm9kZV9tb2R1bGVzL2xvZGFzaC50aHJvdHRsZS9ub2RlX21vZHVsZXMvbG9kYXNoLmlzb2JqZWN0L25vZGVfbW9kdWxlcy9sb2Rhc2guX29iamVjdHR5cGVzL2luZGV4LmpzIiwiL2hvbWUvbWVhbmRhdmUvQ29kZS9zcGxpdC1hdWRpby9ub2RlX21vZHVsZXMvZHJhZ2RlYWxlci9zcmMvZHJhZ2RlYWxlci5qcyIsIi9ob21lL21lYW5kYXZlL0NvZGUvc3BsaXQtYXVkaW8vbm9kZV9tb2R1bGVzL2h5cGVyc2NyaXB0L2luZGV4LmpzIiwiL2hvbWUvbWVhbmRhdmUvQ29kZS9zcGxpdC1hdWRpby9ub2RlX21vZHVsZXMvaHlwZXJzY3JpcHQvbm9kZV9tb2R1bGVzL2Jyb3dzZXItc3BsaXQvaW5kZXguanMiLCIvaG9tZS9tZWFuZGF2ZS9Db2RlL3NwbGl0LWF1ZGlvL25vZGVfbW9kdWxlcy9oeXBlcnNjcmlwdC9ub2RlX21vZHVsZXMvY2xhc3MtbGlzdC9pbmRleC5qcyIsIi9ob21lL21lYW5kYXZlL0NvZGUvc3BsaXQtYXVkaW8vbm9kZV9tb2R1bGVzL2h5cGVyc2NyaXB0L25vZGVfbW9kdWxlcy9jbGFzcy1saXN0L25vZGVfbW9kdWxlcy9pbmRleG9mL2luZGV4LmpzIiwiL2hvbWUvbWVhbmRhdmUvQ29kZS9zcGxpdC1hdWRpby9ub2RlX21vZHVsZXMvaHlwZXJzY3JpcHQvbm9kZV9tb2R1bGVzL2RhdGEtc2V0L2luZGV4LmpzIiwiL2hvbWUvbWVhbmRhdmUvQ29kZS9zcGxpdC1hdWRpby9ub2RlX21vZHVsZXMvaHlwZXJzY3JpcHQvbm9kZV9tb2R1bGVzL2RhdGEtc2V0L25vZGVfbW9kdWxlcy9pbmRpdmlkdWFsL2luZGV4LmpzIiwiL2hvbWUvbWVhbmRhdmUvQ29kZS9zcGxpdC1hdWRpby9ub2RlX21vZHVsZXMvaHlwZXJzY3JpcHQvbm9kZV9tb2R1bGVzL2RhdGEtc2V0L25vZGVfbW9kdWxlcy9pbmRpdmlkdWFsL25vZGVfbW9kdWxlcy9nbG9iYWwvaW5kZXguanMiLCIvaG9tZS9tZWFuZGF2ZS9Db2RlL3NwbGl0LWF1ZGlvL25vZGVfbW9kdWxlcy9oeXBlcnNjcmlwdC9ub2RlX21vZHVsZXMvZGF0YS1zZXQvbm9kZV9tb2R1bGVzL3dlYWttYXAvd2Vha21hcC5qcyIsIi9ob21lL21lYW5kYXZlL0NvZGUvc3BsaXQtYXVkaW8vbm9kZV9tb2R1bGVzL3JhZi9pbmRleC5qcyIsIi9ob21lL21lYW5kYXZlL0NvZGUvc3BsaXQtYXVkaW8vbm9kZV9tb2R1bGVzL3JhZi9ub2RlX21vZHVsZXMvcGVyZm9ybWFuY2Utbm93L2xpYi9wZXJmb3JtYW5jZS1ub3cuanMiLCIvaG9tZS9tZWFuZGF2ZS9Db2RlL3NwbGl0LWF1ZGlvL3RlbXBsYXRlcy9jb250cm9sLXRtcC5qcyIsIi9ob21lL21lYW5kYXZlL0NvZGUvc3BsaXQtYXVkaW8vdGVtcGxhdGVzL3RyYWNrLXRtcC5qcyIsIi91c3IvbGliL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwiL3Vzci9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIiwiL3Vzci9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzeUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0gZHJhd0J1ZmZlcjtcblxuZnVuY3Rpb24gZHJhd0J1ZmZlciAoY2FudmFzLCBidWZmZXIsIGNvbG9yKSB7XG4gIHZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgdmFyIHdpZHRoID0gY2FudmFzLndpZHRoO1xuICB2YXIgaGVpZ2h0ID0gY2FudmFzLmhlaWdodDtcbiAgaWYgKGNvbG9yKSB7XG4gICAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yO1xuICB9XG5cbiAgICB2YXIgZGF0YSA9IGJ1ZmZlci5nZXRDaGFubmVsRGF0YSggMCApO1xuICAgIHZhciBzdGVwID0gTWF0aC5jZWlsKCBkYXRhLmxlbmd0aCAvIHdpZHRoICk7XG4gICAgdmFyIGFtcCA9IGhlaWdodCAvIDI7XG4gICAgZm9yKHZhciBpPTA7IGkgPCB3aWR0aDsgaSsrKXtcbiAgICAgICAgdmFyIG1pbiA9IDEuMDtcbiAgICAgICAgdmFyIG1heCA9IC0xLjA7XG4gICAgICAgIGZvciAodmFyIGo9MDsgajxzdGVwOyBqKyspIHtcbiAgICAgICAgICAgIHZhciBkYXR1bSA9IGRhdGFbKGkqc3RlcCkral07XG4gICAgICAgICAgICBpZiAoZGF0dW0gPCBtaW4pXG4gICAgICAgICAgICAgICAgbWluID0gZGF0dW07XG4gICAgICAgICAgICBpZiAoZGF0dW0gPiBtYXgpXG4gICAgICAgICAgICAgICAgbWF4ID0gZGF0dW07XG4gICAgICAgIH1cbiAgICAgIGN0eC5maWxsUmVjdChpLCgxK21pbikqYW1wLDEsTWF0aC5tYXgoMSwobWF4LW1pbikqYW1wKSk7XG4gICAgfVxufSIsInZhciByYWYgPSByZXF1aXJlKCdyYWYnKTtcbnZhciBBdWRpb1NvdXJjZSA9IHJlcXVpcmUoJ2F1ZGlvc291cmNlJyk7XG52YXIgRHJhZ2RlYWxlciA9IHJlcXVpcmUoJ2RyYWdkZWFsZXInKS5EcmFnZGVhbGVyO1xudmFyIGRyYXdCdWZmZXIgPSByZXF1aXJlKCcuL2RyYXctYnVmZmVyJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gVHJhY2s7XG5cbmZ1bmN0aW9uIFRyYWNrKG9wdHMsIGVtaXR0ZXIpIHtcbiAgdGhpcy5jb250YWluRWwgPSBvcHRzLmNvbnRhaW5FbDtcbiAgdGhpcy50cmFja0VsID0gdGhpcy5jb250YWluRWwucXVlcnlTZWxlY3RvcignLnRyYWNrJyk7XG4gIHRoaXMuYWN0aXZlID0gdHJ1ZTtcbiAgdGhpcy5jb250ZXh0ID0gb3B0cy5jb250ZXh0O1xuICB0aGlzLmF1ZGlvc291cmNlID0gb3B0cy5hdWRpb3NvdXJjZTtcblxuICB0aGlzLmN1cnJlbnRUaW1lID0gdGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lO1xuICB0aGlzLnBsYXlpbmcgPSBmYWxzZTtcblxuICB0aGlzLnN0YXJ0T2Zmc2V0ID0gMDtcbiAgdGhpcy5sYXN0UGxheSA9IDA7XG4gIHRoaXMubGFzdFBhdXNlID0gMDtcbiAgdGhpcy5wYXVzZWRTdW0gPSAwO1xuICB0aGlzLmFjdHVhbEN1cnJlbnRUaW1lID0gMDtcbiAgdGhpcy5pbml0aWFsUGxheSA9IHRydWU7XG4gIHRoaXMuaW5pdFN0YXJ0VGltZSA9IDA7XG5cbiAgdGhpcy53YXZlID0gdGhpcy5jb250YWluRWwucXVlcnlTZWxlY3RvcignLndhdmUnKTtcbiAgdGhpcy5wcm9ncmVzc1dhdmUgPSB0aGlzLmNvbnRhaW5FbC5xdWVyeVNlbGVjdG9yKCcud2F2ZS1wcm9ncmVzcycpO1xuICB0aGlzLmN1cnNvciA9IHRoaXMuY29udGFpbkVsLnF1ZXJ5U2VsZWN0b3IoJy5wbGF5LWN1cnNvcicpO1xuXG4gIHRoaXMuY29udGFpbkVsLnF1ZXJ5U2VsZWN0b3IoJy5kZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZXYpIHtcbiAgICB2YXIgZWwgPSBldi50YXJnZXQ7XG5cbiAgICBpZiAoZWwudGV4dENvbnRlbnQgPT09ICdkZWFjdGl2YXRlJykge1xuICAgICAgdGhpcy5hY3RpdmUgPSBmYWxzZTtcbiAgICAgIHRoaXMudHJhY2tFbC5jbGFzc0xpc3QucmVtb3ZlKCdhY3RpdmUnKTtcbiAgICAgIGVsLnRleHRDb250ZW50ID0gJ2FjdGl2YXRlJztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5hY3RpdmUgPSB0cnVlO1xuICAgICAgdGhpcy50cmFja0VsLmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuICAgICAgZWwudGV4dENvbnRlbnQgPSAnZGVhY3RpdmF0ZSc7XG4gICAgfVxuICB9LmJpbmQodGhpcykpO1xuXG4gIHRoaXMuY29udGFpbkVsLnF1ZXJ5U2VsZWN0b3IoJy5tdXRlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihldikge1xuICAgIHZhciBlbCA9IGV2LnRhcmdldDtcblxuICAgIGlmIChlbC50ZXh0Q29udGVudCA9PT0gJ211dGUnKSB7XG4gICAgICAvLyB0aGlzLm11dGUoKTtcbiAgICAgIGVsLnRleHRDb250ZW50ID0gJ3VubXV0ZSc7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHRoaXMubXV0ZSgpO1xuICAgICAgZWwudGV4dENvbnRlbnQgPSAnbXV0ZSc7XG4gICAgfVxuICB9LmJpbmQodGhpcykpO1xuXG4gIGVtaXR0ZXIub24oJ3RyYWNrczpwbGF5JywgZnVuY3Rpb24oZXYpIHtcbiAgICB0aGlzLnBsYXkoKTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICBlbWl0dGVyLm9uKCd0cmFja3M6cGF1c2UnLCBmdW5jdGlvbihldikge1xuICAgIHRoaXMucGF1c2UoKTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICBlbWl0dGVyLm9uKCd0cmFja3M6c3RvcCcsIGZ1bmN0aW9uKGV2KSB7XG4gICAgdGhpcy5zdG9wKCk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgdGhpcy5wcm9ncmVzc1dhdmUuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihldikge1xuICAgIC8vIGlmICh0aGlzLnBsYXlpbmcpIHJldHVybjtcbiAgICAvLyB2YXIgcGVyY2VudCA9IChldi5vZmZzZXRYIC8gMTIwMCkgKiAxMDA7XG4gICAgLy8gdmFyIGZ1dHVyZUN1cnJlbnRUaW1lID0gdGhpcy5wZXJjZW50VG9DdXJyZW50VGltZShwZXJjZW50KTtcbiAgICAvLyB0aGlzLnVwZGF0ZVByb2dyZXNzKHBlcmNlbnQpO1xuICAgIGNvbnNvbGUubG9nKCdjbGlja2luZyBvbiBwcm9ncmVzc3dhdmUgZG9lc25cXCd0IGRvIGFueXRoaW5nIHJpZ2h0IG5vdyBPS0FZIScpO1xuICB9KTtcbn1cblxuVHJhY2sucHJvdG90eXBlID0ge1xuICBwbGF5OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmxhc3RQbGF5ID0gdGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lO1xuXG4gICAgaWYgKHRoaXMuaW5pdGlhbFBsYXkpIHtcbiAgICAgIHRoaXMuaW5pdFN0YXJ0VGltZSA9IHRoaXMubGFzdFBsYXk7XG4gICAgICB0aGlzLnBhdXNlZFN1bSA9IHRoaXMubGFzdFBsYXk7XG4gICAgICB0aGlzLmluaXRpYWxQbGF5ID0gIXRoaXMuaW5pdGlhbFBsYXk7XG4gICAgICB0aGlzLnByb2dyZXNzV2F2ZS5zdHlsZS53aWR0aCA9IDA7XG4gICAgICB0aGlzLnByb2dyZXNzV2F2ZS5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcbiAgICB9XG5cbiAgICBpZiAodGhpcy5sYXN0UGF1c2UgPiAwKSB0aGlzLnVwZGF0ZVBhdXNlZCgpO1xuICAgIHRoaXMucGxheVRyYWNrKHRoaXMuc3RhcnRPZmZzZXQgJSB0aGlzLmF1ZGlvc291cmNlLmJ1ZmZlci5kdXJhdGlvbik7XG4gIH0sXG4gIHVwZGF0ZVBhdXNlZDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5wYXVzZWRTdW0gPSB0aGlzLnBhdXNlZFN1bSArICh0aGlzLmxhc3RQbGF5IC0gdGhpcy5sYXN0UGF1c2UpO1xuICB9LFxuICBzdG9wOiBmdW5jdGlvbigpIHtcbiAgICBkZWJ1Z2dlcjtcbiAgICB0aGlzLnBsYXlpbmcgPSBmYWxzZTtcbiAgICB0aGlzLmluaXRpYWxQbGF5ID0gdHJ1ZTtcbiAgICB0aGlzLnN0YXJ0T2Zmc2V0ID0gMDtcbiAgICB0aGlzLmxhc3RQbGF5ID0gMDtcbiAgICB0aGlzLmxhc3RQYXVzZSA9IDA7XG4gICAgdGhpcy5wYXVzZWRUaW1lID0gMDtcbiAgICB0aGlzLmF1ZGlvc291cmNlLnN0b3AoKTtcbiAgICB0aGlzLnByb2dyZXNzV2F2ZS5zdHlsZS53aWR0aCA9IFwiMCVcIjtcbiAgICB0aGlzLmN1cnNvci5zdHlsZS5sZWZ0ID0gXCIwJVwiO1xuICB9LFxuICBwYXVzZTogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5sYXN0UGF1c2UgPSB0aGlzLmNvbnRleHQuY3VycmVudFRpbWU7XG4gICAgdGhpcy5hdWRpb3NvdXJjZS5zdG9wKCk7XG4gICAgdGhpcy5zdGFydE9mZnNldCArPSB0aGlzLmNvbnRleHQuY3VycmVudFRpbWUgLSB0aGlzLmxhc3RQbGF5O1xuICAgIHRoaXMucGxheWluZyA9IGZhbHNlO1xuICB9LFxuICBza2lwRm9yd2FyZDogZnVuY3Rpb24oKSB7fSxcbiAgc2tpcEJhY2t3YXJkOiBmdW5jdGlvbigpIHt9LFxuICB1cGRhdGVQcm9ncmVzczogZnVuY3Rpb24ocGVyY2VudCkge1xuICAgIHRoaXMucHJvZ3Jlc3NXYXZlLnN0eWxlLndpZHRoID0gcGVyY2VudCtcIiVcIjtcbiAgICB0aGlzLmN1cnNvci5zdHlsZS5sZWZ0ID0gcGVyY2VudCtcIiVcIjtcbiAgfSxcbiAgcGxheVRyYWNrOiBmdW5jdGlvbihvZmZzZXQpIHtcbiAgICBpZiAodGhpcy5wbGF5aW5nKSB0aGlzLmF1ZGlvc291cmNlLnN0b3AoKTtcbiAgICB0aGlzLmF1ZGlvc291cmNlLnBsYXkoMCwgb2Zmc2V0KTtcbiAgICB0aGlzLnBsYXlpbmcgPSB0cnVlO1xuICAgIHJhZih0aGlzLnRyaWdnZXJQbGF5aW5nLmJpbmQodGhpcykpO1xuICB9LFxuICB1cGRhdGVWaXN1YWxQcm9ncmVzczogZnVuY3Rpb24gKHBlcmNlbnQpIHtcbiAgICB0aGlzLnByb2dyZXNzV2F2ZS5zdHlsZS53aWR0aCA9IHBlcmNlbnQrXCIlXCI7XG4gICAgdGhpcy5jdXJzb3Iuc3R5bGUubGVmdCA9IHBlcmNlbnQrXCIlXCI7XG4gIH0sXG4gIHRyaWdnZXJQbGF5aW5nOiBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMucGxheWluZykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBkdXIgPSB0aGlzLmF1ZGlvc291cmNlLmJ1ZmZlci5kdXJhdGlvbjtcbiAgICB2YXIgeCA9IHRoaXMuY3VycmVudFRpbWVUb1BlcmNlbnQodGhpcy5jb250ZXh0LmN1cnJlbnRUaW1lKTtcblxuICAgIHRoaXMudXBkYXRlVmlzdWFsUHJvZ3Jlc3MoeCk7XG5cbiAgICAvLyBjdXJyZW50VGltZUJveC50ZXh0Q29udGVudCA9IGZvcm1hdFRpbWUoYWMuY3VycmVudFRpbWUgLSBsYXN0UGxheSk7XG4gICAgLy8gcmVtYWluaW5nLnRleHRDb250ZW50ID0gZm9ybWF0VGltZSgoZHVyIC0gbGFzdFBsYXkpIC0gKGFjLmN1cnJlbnRUaW1lIC0gbGFzdFBsYXkpKTtcblxuICAgIGlmIChwYXJzZUludCh4KSA+PSAxMDApIHtcbiAgICAgIHRoaXMucGxheWluZyA9ICF0aGlzLnBsYXlpbmc7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJhZih0aGlzLnRyaWdnZXJQbGF5aW5nLmJpbmQodGhpcykpO1xuICB9LFxuICBjdXJyZW50VGltZVRvUGVyY2VudDogZnVuY3Rpb24gKGN1cnJlbnRUaW1lKSB7XG4gICAgdmFyIGR1ciA9IHRoaXMuYXVkaW9zb3VyY2UuYnVmZmVyLmR1cmF0aW9uO1xuICAgIHZhciBjdXIgPSAoY3VycmVudFRpbWUgLSB0aGlzLnBhdXNlZFN1bSAlIDYwKSAqIDEwO1xuICAgIHJldHVybiAoKGN1ciAvIGR1cikgKiAxMCkudG9GaXhlZCgzKTtcbiAgfSxcbiAgcmVzZXRWaXN1YWw6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBjdHggPSB0aGlzLndhdmUuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMud2F2ZS53aWR0aCwgdGhpcy53YXZlLmxlbmd0aCk7XG4gICAgY3R4ID0gdGhpcy53YXZlUHJvZ3Jlc3MucXVlcnlTZWxlY3RvcignY2FudmFzJykuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMud2F2ZS53aWR0aCwgdGhpcy53YXZlLmxlbmd0aCk7XG4gIH0sXG5cbiAgbG9hZEZpbGU6IGZ1bmN0aW9uIChmaWxlKSB7XG4gICAgLy8gZW1pdHRlci5lbWl0KCdhdWRpbzpzdGF0dXMnLCB7bXNnOiAnbG9hZGluZyBmaWxlLi4uJ30pO1xuICAgIC8vIGVtaXR0ZXIuZW1pdCgnYXVkaW86ZmlsZScsIHtmaWxlOiBmaWxlfSk7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gc2V0IHN0YXR1cyBhbmQgaWQzXG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgcmVhZGVyLm9ubG9hZGVuZCA9IGZ1bmN0aW9uKGV2KSB7XG4gICAgICAvLyBlbWl0dGVyLmVtaXQoJ2F1ZGlvOnN0YXR1cycsIHttc2c6ICdkZWNvZGluZyBhdWRpbyBkYXRhLi4uJ30pO1xuXG4gICAgICBzZWxmLmNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKGV2LnRhcmdldC5yZXN1bHQsIGZ1bmN0aW9uKGJ1Zikge1xuICAgICAgICAvLyBlbWl0dGVyLmVtaXQoJ2F1ZGlvOnN0YXR1cycsIHttc2c6ICdyZW5kZXJpbmcgd2F2ZS4uLid9KTtcbiAgICAgICAgc2VsZi5nYWluTm9kZSA9IHNlbGYuY29udGV4dC5jcmVhdGVHYWluKCk7XG4gICAgICAgIHNlbGYuYXVkaW9zb3VyY2UgPSBuZXcgQXVkaW9Tb3VyY2Uoc2VsZi5jb250ZXh0LCB7XG4gICAgICAgICAgZ2Fpbk5vZGU6IHNlbGYuZ2Fpbk5vZGVcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2VsZi5hdWRpb3NvdXJjZS5idWZmZXIgPSBidWY7XG4gICAgICAgIC8vIHNlbGYuYXVkaW9zb3VyY2UubG9hZFNpbGVudCgpO1xuICAgICAgICAvLyBkcmF3IGJ1ZmZlcnMgJiBob29rdXAgbGlzdGVuZXJzXG4gICAgICAgIGRyYXdCdWZmZXIoc2VsZi53YXZlLCBidWYsICcjNTJGNkE0Jyk7XG4gICAgICAgIGRyYXdCdWZmZXIoc2VsZi5wcm9ncmVzc1dhdmUucXVlcnlTZWxlY3RvcignY2FudmFzJyksIGJ1ZiwgJyNGNDQ1RjAnKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoZmlsZSk7XG4gIH1cbn1cblxuXG4vLyBmdW5jdGlvbiBwZXJjZW50VG9DdXJyZW50VGltZShwZXJjZW50KSB7XG4vLyAgIC8vIHRoaXMgbWV0aG9kIHNob3VsZCB0YWtlIGEgcGVyY2VudGFnZSAoZ290dGVuIGZyb20gY2xpY2tpbmcpXG4vLyAgIC8vIGFuZCByZXR1cm4gdGhlIHByb2plY3RlZCBjdXJyZW50VGltZSBmb3IgdGhhdCBwb2ludC5cblxuLy8gICAvLyBzb21lIGludGVybWVkaWFyeSBsb2dpYyB3aWxsIHRha2UgY2FyZSBvZiBjYWxjdWxhdGluZyB0aGVcbi8vICAgLy8gb2Zmc2V0IGFuZCBwYXNzaW5nIHRvIHRoZSBwbGF5bWV0aG9kXG4vLyAgIHZhciBkdXIgPSBhcy5idWZmZXIuZHVyYXRpb247XG4vLyAgIHZhciBtb2QgPSBkdXIgJSBwZXJjZW50O1xuLy8gICB2YXIgb2Zmc2V0RnJvbVN0YXJ0ID0gKG1vZC9kdXIpICogMTAwMDtcbi8vICAgcmV0dXJuIG9mZnNldEZyb21TdGFydDtcbi8vIH1cblxuXG4vLyB3YXZlLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oZXYpIHtcbi8vICAgdmFyIHBlcmNlbnQgPSAoZXYub2Zmc2V0WCAvIDEyMDApICogMTAwO1xuLy8gICBnbG9iYWxGdXR1cmVUaW1lID0gcGVyY2VudFRvQ3VycmVudFRpbWUocGVyY2VudCk7XG4vLyAgIHVwZGF0ZVZpc3VhbFByb2dyZXNzKHBlcmNlbnQpO1xuLy8gICBjb25zb2xlLmxvZygnbGUgY3VycmVudFRpbWUnLCBhYy5jdXJyZW50VGltZSk7XG4vLyAgIGNvbnNvbGUubG9nKCdnbG9iZnV0dGltZScsIGdsb2JhbEZ1dHVyZVRpbWUpO1xuLy8gICBwbGF5VHJhY2soZ2xvYmFsRnV0dXJlVGltZSkvLyAtIChhYy5jdXJyZW50VGltZSAtIGluaXRTdGFydFRpbWUpKTtcbi8vICAgLy9cbi8vIH0pOyIsInZhciBFRSA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcbnZhciBkcmFnRHJvcCA9IHJlcXVpcmUoJ2RyYWctZHJvcCcpO1xudmFyIEF1ZGlvQ29udGV4dCA9IHJlcXVpcmUoJ2F1ZGlvY29udGV4dCcpO1xudmFyIEF1ZGlvU291cmNlID0gcmVxdWlyZSgnYXVkaW9zb3VyY2UnKTtcblxudmFyIFRyYWNrID0gcmVxdWlyZSgnLi9saWIvdHJhY2snKTtcbnZhciB0cmFja1RtcCA9IHJlcXVpcmUoJy4vdGVtcGxhdGVzL3RyYWNrLXRtcCcpO1xuXG52YXIgZW1pdHRlciA9IG5ldyBFRSgpO1xudmFyIGF1ZGlvQ29udGV4dCA9IG5ldyBBdWRpb0NvbnRleHQoKTtcbnZhciBtYXN0ZXJHYWluTm9kZSA9IGF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCk7XG5cbnZhciB3b3Jrc3BhY2VFbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyN3b3Jrc3BhY2UnKTtcbnZhciB1cGxvYWRCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjdXBsb2FkJyk7XG52YXIgcGxheUJ0biA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNwbGF5Jyk7XG52YXIgcGF1c2VCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcGF1c2UnKTtcbnZhciBzdG9wQnRuID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3N0b3AnKTtcblxudmFyIHRyYWNrcyA9IFtdO1xuXG5kcmFnRHJvcCgnYm9keScsIGZ1bmN0aW9uIChmaWxlcykge1xuICBuZXdUcmFjayhmaWxlc1swXSk7XG59KTtcblxudXBsb2FkQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGZ1bmN0aW9uKGV2KSB7XG4gIG5ld1RyYWNrKGV2LnRhcmdldC5maWxlc1swXSk7XG59KTtcblxucGxheUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICBlbWl0dGVyLmVtaXQoJ3RyYWNrczpwbGF5Jywge30pO1xufSk7XG5cbnBhdXNlQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gIGVtaXR0ZXIuZW1pdCgndHJhY2tzOnBhdXNlJywge30pO1xufSk7XG5cbnN0b3BCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgZW1pdHRlci5lbWl0KCd0cmFja3M6c3RvcCcsIHt9KTtcbn0pO1xuXG5mdW5jdGlvbiBuZXdUcmFjayhmaWxlKSB7XG4gIHZhciBjb250YWluZXJFbCA9IHRyYWNrVG1wKCk7XG5cbiAgd29ya3NwYWNlRWwuYXBwZW5kQ2hpbGQoY29udGFpbmVyRWwpO1xuICB0cmFja3MucHVzaChuZXcgVHJhY2soe1xuICAgIGNvbnRhaW5FbDogY29udGFpbmVyRWwsXG4gICAgY29udGV4dDogYXVkaW9Db250ZXh0XG4gIH0sIGVtaXR0ZXIpKTtcbiAgdHJhY2tzW3RyYWNrcy5sZW5ndGggLSAxXS5sb2FkRmlsZShmaWxlKTtcbn0iLCIvKlxuICogV2ViIEF1ZGlvIEFQSSBBdWRpb0NvbnRleHQgc2hpbVxuICovXG4oZnVuY3Rpb24gKGRlZmluaXRpb24pIHtcbiAgICBpZiAodHlwZW9mIGV4cG9ydHMgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBkZWZpbml0aW9uKCk7XG4gICAgfVxufSkoZnVuY3Rpb24gKCkge1xuICByZXR1cm4gd2luZG93LkF1ZGlvQ29udGV4dCB8fCB3aW5kb3cud2Via2l0QXVkaW9Db250ZXh0O1xufSk7XG4iLCIvKlxuICogQXVkaW9Tb3VyY2VcbiAqXG4gKiAqIE1VU1QgcGFzcyBhbiBhdWRpbyBjb250ZXh0XG4gKlxuICovXG5mdW5jdGlvbiBBdWRpb1NvdXJjZSAoY29udGV4dCwgb3B0cykge1xuICBpZiAoIWNvbnRleHQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBtdXN0IHBhc3MgYW4gYXVkaW8gY29udGV4dCB0byB1c2UgdGhpcyBtb2R1bGUnKTtcbiAgfVxuICBpZiAob3B0cyA9PT0gdW5kZWZpbmVkKSBvcHRzID0ge307XG5cbiAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcbiAgdGhpcy5idWZmZXIgPSB1bmRlZmluZWQ7XG4gIHRoaXMudXJsID0gb3B0cy51cmwgPyBvcHRzLnVybCA6IHVuZGVmaW5lZDtcbiAgdGhpcy5mZnRzID0gb3B0cy5mZnRzID8gb3B0cy5mZnRzIDogW107XG4gIHRoaXMuZ2Fpbk5vZGUgPSBvcHRzLmdhaW5Ob2RlID8gb3B0cy5nYWluTm9kZSA6IHVuZGVmaW5lZDtcbn1cblxuQXVkaW9Tb3VyY2UucHJvdG90eXBlID0ge1xuICBuZWVkQnVmZmVyOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5idWZmZXIgPT09IHVuZGVmaW5lZDtcbiAgfSxcbiAgbG9hZFNvdW5kOiBmdW5jdGlvbih1cmwsIGNiKSB7XG4gICAgdmFyIHJlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgIHJlcS5vcGVuKCdHRVQnLCB1cmwsIHRydWUpO1xuICAgIHJlcS5yZXNwb25zZVR5cGUgPSAnYXJyYXlidWZmZXInO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXEub25sb2FkZW5kID0gZnVuY3Rpb24oKSB7XG4gICAgICBzZWxmLmRlY29kZS5jYWxsKHNlbGYsIHJlcS5yZXNwb25zZSwgY2IpO1xuICAgIH07XG4gICAgcmVxLnNlbmQoKTtcbiAgfSxcbiAgZ2V0QnVmZmVyOiBmdW5jdGlvbihjYikge1xuICAgIGlmICghdGhpcy5uZWVkQnVmZmVyKCkpIHJldHVybjtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5sb2FkU291bmQodGhpcy51cmwsIGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIHNlbGYub25Mb2FkZWQuY2FsbChzZWxmLCBkYXRhLCB0cnVlKTtcbiAgICB9KTtcbiAgfSxcbiAgZ2V0U291cmNlOiBmdW5jdGlvbihjYikge1xuICAgIGlmICh0aGlzLnNvdXJjZSkge1xuICAgICAgY2IodGhpcy5zb3VyY2UpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB0aGlzLmRpc2Nvbm5lY3QoKTtcbiAgICAgIHRoaXMubG9hZFNvdW5kKHRoaXMudXJsLCBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIHRoaXMuc291cmNlID0gc2VsZi5jcmVhdGVTb3VyY2UuY2FsbChzZWxmLCBkYXRhLCB0cnVlKTtcbiAgICAgICAgY2IodGhpcy5zb3VyY2UpO1xuICAgICAgfSk7XG4gICAgfVxuICB9LFxuXG4gIG9uTG9hZGVkOiBmdW5jdGlvbihzb3VyY2UsIHNpbGVudCkge1xuICAgIHRoaXMuYnVmZmVyID0gc291cmNlO1xuICAgIHRoaXMuZGlzY29ubmVjdCgpO1xuICAgIHRoaXMuc291cmNlID0gdGhpcy5jb250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuICAgIHRoaXMuc291cmNlLmJ1ZmZlciA9IHRoaXMuYnVmZmVyO1xuICAgIHRoaXMuc291cmNlLmNvbm5lY3QodGhpcy5nYWluTm9kZSk7XG4gICAgdGhpcy5mZnRzLmZvckVhY2goZnVuY3Rpb24oZmZ0KSB7XG4gICAgICB0aGlzLmdhaW5Ob2RlLmNvbm5lY3QoZmZ0LmlucHV0KTtcbiAgICB9LCB0aGlzKTtcbiAgICB0aGlzLmdhaW5Ob2RlLmNvbm5lY3QodGhpcy5jb250ZXh0LmRlc3RpbmF0aW9uKTtcbiAgICB0aGlzLmZmdHMuZm9yRWFjaChmdW5jdGlvbihmZnQpIHtcbiAgICAgIGZmdC5jb25uZWN0KHRoaXMuY29udGV4dC5kZXN0aW5hdGlvbik7XG4gICAgfSwgdGhpcyk7XG4gICAgaWYgKCFzaWxlbnQpIHRoaXMucGxheVNvdW5kKCk7XG4gIH0sXG4gIGRpc2Nvbm5lY3Q6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLnNvdXJjZSkge1xuICAgICAgdGhpcy5zb3VyY2UuZGlzY29ubmVjdCh0aGlzLmNvbnRleHQuZGVzdGluYXRpb24pO1xuICAgIH1cbiAgfSxcbiAgcGxheVNvdW5kOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5wbGF5VGltZSkge1xuICAgICAgY29uc29sZS5sb2coJ3BsYXl0aW1lJywgdGhpcy5wbGF5VGltZSk7XG4gICAgICB0aGlzLnNvdXJjZS5zdGFydCgwLCB0aGlzLm9mZnNldCk7XG4gICAgfVxuXG4gICAgdGhpcy5wbGF5VGltZSA9IHRoaXMuY29udGV4dC5jdXJyZW50VGltZTtcbiAgfSxcbiAgbG9hZFNpbGVudDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLm5lZWRCdWZmZXIoKSkgcmV0dXJuO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmxvYWRTb3VuZCh0aGlzLnVybCwgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgc2VsZi5vbkxvYWRlZC5jYWxsKHNlbGYsIGRhdGEsIHRydWUpO1xuICAgIH0pO1xuICB9LFxuICBwbGF5OiBmdW5jdGlvbihzdGFydHRpbWUsIG9mZnNldCkge1xuICAgIHRoaXMucGxheVRpbWUgPSBzdGFydHRpbWUgPyBzdGFydHRpbWUgOiB0aGlzLmNvbnRleHQuY3VycmVudFRpbWU7XG4gICAgdGhpcy5vZmZzZXQgPSBvZmZzZXQgPyBvZmZzZXQgOiAwO1xuXG4gICAgaWYgKHRoaXMubmVlZEJ1ZmZlcigpKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICB0aGlzLmxvYWRTb3VuZCh0aGlzLnVybCwgZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICBzZWxmLm9uTG9hZGVkLmNhbGwoc2VsZiwgZGF0YSk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5vbkxvYWRlZCh0aGlzLmJ1ZmZlcik7XG4gICAgfVxuICB9LFxuICBzdG9wOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNvdXJjZS5zdG9wKHRoaXMuY29udGV4dC5jdXJyZW50VGltZSk7XG4gIH0sXG4gIGRlY29kZTogZnVuY3Rpb24oZGF0YSwgc3VjY2VzcywgZXJyb3IpIHtcbiAgICB0aGlzLmNvbnRleHQuZGVjb2RlQXVkaW9EYXRhKGRhdGEsIHN1Y2Nlc3MsIGVycm9yKTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBBdWRpb1NvdXJjZTtcbiIsIm1vZHVsZS5leHBvcnRzID0gRHJhZ0Ryb3BcblxudmFyIHRocm90dGxlID0gcmVxdWlyZSgnbG9kYXNoLnRocm90dGxlJylcblxuZnVuY3Rpb24gRHJhZ0Ryb3AgKGVsZW0sIGNiKSB7XG4gIGlmICh0eXBlb2YgZWxlbSA9PT0gJ3N0cmluZycpIGVsZW0gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGVsZW0pXG4gIGVsZW0uYWRkRXZlbnRMaXN0ZW5lcignZHJhZ2VudGVyJywga2lsbEV2ZW50LCBmYWxzZSlcbiAgZWxlbS5hZGRFdmVudExpc3RlbmVyKCdkcmFnb3ZlcicsIG1ha2VPbkRyYWdPdmVyKGVsZW0pLCBmYWxzZSlcbiAgZWxlbS5hZGRFdmVudExpc3RlbmVyKCdkcm9wJywgb25Ecm9wLmJpbmQodW5kZWZpbmVkLCBlbGVtLCBjYiksIGZhbHNlKVxufVxuXG5mdW5jdGlvbiBraWxsRXZlbnQgKGUpIHtcbiAgZS5zdG9wUHJvcGFnYXRpb24oKVxuICBlLnByZXZlbnREZWZhdWx0KClcbiAgcmV0dXJuIGZhbHNlXG59XG5cbmZ1bmN0aW9uIG1ha2VPbkRyYWdPdmVyIChlbGVtKSB7XG4gIHZhciBmbiA9IHRocm90dGxlKGZ1bmN0aW9uICgpIHtcbiAgICBlbGVtLmNsYXNzTGlzdC5hZGQoJ2RyYWcnKVxuXG4gICAgaWYgKGVsZW0udGltZW91dCkgY2xlYXJUaW1lb3V0KGVsZW0udGltZW91dClcbiAgICBlbGVtLnRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgIGVsZW0uY2xhc3NMaXN0LnJlbW92ZSgnZHJhZycpXG4gICAgfSwgMTUwKVxuICB9LCAxMDAsIHt0cmFpbGluZzogZmFsc2V9KVxuXG4gIHJldHVybiBmdW5jdGlvbiAoZSkge1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBlLmRhdGFUcmFuc2Zlci5kcm9wRWZmZWN0ID0gJ2NvcHknXG4gICAgZm4oKVxuICB9XG59XG5cbmZ1bmN0aW9uIG9uRHJvcCAoZWxlbSwgY2IsIGUpIHtcbiAgZS5zdG9wUHJvcGFnYXRpb24oKVxuICBlLnByZXZlbnREZWZhdWx0KClcbiAgZWxlbS5jbGFzc0xpc3QucmVtb3ZlKCdkcmFnJylcbiAgY2IoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoZS5kYXRhVHJhbnNmZXIuZmlsZXMpLCB7IHg6IGUuY2xpZW50WCwgeTogZS5jbGllbnRZIH0pXG4gIHJldHVybiBmYWxzZVxufVxuIiwiLyoqXG4gKiBMby1EYXNoIDIuNC4xIChDdXN0b20gQnVpbGQpIDxodHRwOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIG1vZGVybiBleHBvcnRzPVwibnBtXCIgLW8gLi9ucG0vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxMyBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS41LjIgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHA6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cbnZhciBkZWJvdW5jZSA9IHJlcXVpcmUoJ2xvZGFzaC5kZWJvdW5jZScpLFxuICAgIGlzRnVuY3Rpb24gPSByZXF1aXJlKCdsb2Rhc2guaXNmdW5jdGlvbicpLFxuICAgIGlzT2JqZWN0ID0gcmVxdWlyZSgnbG9kYXNoLmlzb2JqZWN0Jyk7XG5cbi8qKiBVc2VkIGFzIGFuIGludGVybmFsIGBfLmRlYm91bmNlYCBvcHRpb25zIG9iamVjdCAqL1xudmFyIGRlYm91bmNlT3B0aW9ucyA9IHtcbiAgJ2xlYWRpbmcnOiBmYWxzZSxcbiAgJ21heFdhaXQnOiAwLFxuICAndHJhaWxpbmcnOiBmYWxzZVxufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgZnVuY3Rpb24gdGhhdCwgd2hlbiBleGVjdXRlZCwgd2lsbCBvbmx5IGNhbGwgdGhlIGBmdW5jYCBmdW5jdGlvblxuICogYXQgbW9zdCBvbmNlIHBlciBldmVyeSBgd2FpdGAgbWlsbGlzZWNvbmRzLiBQcm92aWRlIGFuIG9wdGlvbnMgb2JqZWN0IHRvXG4gKiBpbmRpY2F0ZSB0aGF0IGBmdW5jYCBzaG91bGQgYmUgaW52b2tlZCBvbiB0aGUgbGVhZGluZyBhbmQvb3IgdHJhaWxpbmcgZWRnZVxuICogb2YgdGhlIGB3YWl0YCB0aW1lb3V0LiBTdWJzZXF1ZW50IGNhbGxzIHRvIHRoZSB0aHJvdHRsZWQgZnVuY3Rpb24gd2lsbFxuICogcmV0dXJuIHRoZSByZXN1bHQgb2YgdGhlIGxhc3QgYGZ1bmNgIGNhbGwuXG4gKlxuICogTm90ZTogSWYgYGxlYWRpbmdgIGFuZCBgdHJhaWxpbmdgIG9wdGlvbnMgYXJlIGB0cnVlYCBgZnVuY2Agd2lsbCBiZSBjYWxsZWRcbiAqIG9uIHRoZSB0cmFpbGluZyBlZGdlIG9mIHRoZSB0aW1lb3V0IG9ubHkgaWYgdGhlIHRoZSB0aHJvdHRsZWQgZnVuY3Rpb24gaXNcbiAqIGludm9rZWQgbW9yZSB0aGFuIG9uY2UgZHVyaW5nIHRoZSBgd2FpdGAgdGltZW91dC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IEZ1bmN0aW9uc1xuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gdGhyb3R0bGUuXG4gKiBAcGFyYW0ge251bWJlcn0gd2FpdCBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyB0byB0aHJvdHRsZSBleGVjdXRpb25zIHRvLlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBUaGUgb3B0aW9ucyBvYmplY3QuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmxlYWRpbmc9dHJ1ZV0gU3BlY2lmeSBleGVjdXRpb24gb24gdGhlIGxlYWRpbmcgZWRnZSBvZiB0aGUgdGltZW91dC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHJhaWxpbmc9dHJ1ZV0gU3BlY2lmeSBleGVjdXRpb24gb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyB0aHJvdHRsZWQgZnVuY3Rpb24uXG4gKiBAZXhhbXBsZVxuICpcbiAqIC8vIGF2b2lkIGV4Y2Vzc2l2ZWx5IHVwZGF0aW5nIHRoZSBwb3NpdGlvbiB3aGlsZSBzY3JvbGxpbmdcbiAqIHZhciB0aHJvdHRsZWQgPSBfLnRocm90dGxlKHVwZGF0ZVBvc2l0aW9uLCAxMDApO1xuICogalF1ZXJ5KHdpbmRvdykub24oJ3Njcm9sbCcsIHRocm90dGxlZCk7XG4gKlxuICogLy8gZXhlY3V0ZSBgcmVuZXdUb2tlbmAgd2hlbiB0aGUgY2xpY2sgZXZlbnQgaXMgZmlyZWQsIGJ1dCBub3QgbW9yZSB0aGFuIG9uY2UgZXZlcnkgNSBtaW51dGVzXG4gKiBqUXVlcnkoJy5pbnRlcmFjdGl2ZScpLm9uKCdjbGljaycsIF8udGhyb3R0bGUocmVuZXdUb2tlbiwgMzAwMDAwLCB7XG4gKiAgICd0cmFpbGluZyc6IGZhbHNlXG4gKiB9KSk7XG4gKi9cbmZ1bmN0aW9uIHRocm90dGxlKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcbiAgdmFyIGxlYWRpbmcgPSB0cnVlLFxuICAgICAgdHJhaWxpbmcgPSB0cnVlO1xuXG4gIGlmICghaXNGdW5jdGlvbihmdW5jKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3I7XG4gIH1cbiAgaWYgKG9wdGlvbnMgPT09IGZhbHNlKSB7XG4gICAgbGVhZGluZyA9IGZhbHNlO1xuICB9IGVsc2UgaWYgKGlzT2JqZWN0KG9wdGlvbnMpKSB7XG4gICAgbGVhZGluZyA9ICdsZWFkaW5nJyBpbiBvcHRpb25zID8gb3B0aW9ucy5sZWFkaW5nIDogbGVhZGluZztcbiAgICB0cmFpbGluZyA9ICd0cmFpbGluZycgaW4gb3B0aW9ucyA/IG9wdGlvbnMudHJhaWxpbmcgOiB0cmFpbGluZztcbiAgfVxuICBkZWJvdW5jZU9wdGlvbnMubGVhZGluZyA9IGxlYWRpbmc7XG4gIGRlYm91bmNlT3B0aW9ucy5tYXhXYWl0ID0gd2FpdDtcbiAgZGVib3VuY2VPcHRpb25zLnRyYWlsaW5nID0gdHJhaWxpbmc7XG5cbiAgcmV0dXJuIGRlYm91bmNlKGZ1bmMsIHdhaXQsIGRlYm91bmNlT3B0aW9ucyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdGhyb3R0bGU7XG4iLCIvKipcbiAqIExvLURhc2ggMi40LjEgKEN1c3RvbSBCdWlsZCkgPGh0dHA6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZHVsYXJpemUgbW9kZXJuIGV4cG9ydHM9XCJucG1cIiAtbyAuL25wbS9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDEzIFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjUuMiA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTMgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cDovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xudmFyIGlzRnVuY3Rpb24gPSByZXF1aXJlKCdsb2Rhc2guaXNmdW5jdGlvbicpLFxuICAgIGlzT2JqZWN0ID0gcmVxdWlyZSgnbG9kYXNoLmlzb2JqZWN0JyksXG4gICAgbm93ID0gcmVxdWlyZSgnbG9kYXNoLm5vdycpO1xuXG4vKiBOYXRpdmUgbWV0aG9kIHNob3J0Y3V0cyBmb3IgbWV0aG9kcyB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgb3RoZXIgYGxvZGFzaGAgbWV0aG9kcyAqL1xudmFyIG5hdGl2ZU1heCA9IE1hdGgubWF4O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgZGVsYXkgdGhlIGV4ZWN1dGlvbiBvZiBgZnVuY2AgdW50aWwgYWZ0ZXJcbiAqIGB3YWl0YCBtaWxsaXNlY29uZHMgaGF2ZSBlbGFwc2VkIHNpbmNlIHRoZSBsYXN0IHRpbWUgaXQgd2FzIGludm9rZWQuXG4gKiBQcm92aWRlIGFuIG9wdGlvbnMgb2JqZWN0IHRvIGluZGljYXRlIHRoYXQgYGZ1bmNgIHNob3VsZCBiZSBpbnZva2VkIG9uXG4gKiB0aGUgbGVhZGluZyBhbmQvb3IgdHJhaWxpbmcgZWRnZSBvZiB0aGUgYHdhaXRgIHRpbWVvdXQuIFN1YnNlcXVlbnQgY2FsbHNcbiAqIHRvIHRoZSBkZWJvdW5jZWQgZnVuY3Rpb24gd2lsbCByZXR1cm4gdGhlIHJlc3VsdCBvZiB0aGUgbGFzdCBgZnVuY2AgY2FsbC5cbiAqXG4gKiBOb3RlOiBJZiBgbGVhZGluZ2AgYW5kIGB0cmFpbGluZ2Agb3B0aW9ucyBhcmUgYHRydWVgIGBmdW5jYCB3aWxsIGJlIGNhbGxlZFxuICogb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQgb25seSBpZiB0aGUgdGhlIGRlYm91bmNlZCBmdW5jdGlvbiBpc1xuICogaW52b2tlZCBtb3JlIHRoYW4gb25jZSBkdXJpbmcgdGhlIGB3YWl0YCB0aW1lb3V0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgRnVuY3Rpb25zXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byBkZWJvdW5jZS5cbiAqIEBwYXJhbSB7bnVtYmVyfSB3YWl0IFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRvIGRlbGF5LlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXSBUaGUgb3B0aW9ucyBvYmplY3QuXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmxlYWRpbmc9ZmFsc2VdIFNwZWNpZnkgZXhlY3V0aW9uIG9uIHRoZSBsZWFkaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gKiBAcGFyYW0ge251bWJlcn0gW29wdGlvbnMubWF4V2FpdF0gVGhlIG1heGltdW0gdGltZSBgZnVuY2AgaXMgYWxsb3dlZCB0byBiZSBkZWxheWVkIGJlZm9yZSBpdCdzIGNhbGxlZC5cbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMudHJhaWxpbmc9dHJ1ZV0gU3BlY2lmeSBleGVjdXRpb24gb24gdGhlIHRyYWlsaW5nIGVkZ2Ugb2YgdGhlIHRpbWVvdXQuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgdGhlIG5ldyBkZWJvdW5jZWQgZnVuY3Rpb24uXG4gKiBAZXhhbXBsZVxuICpcbiAqIC8vIGF2b2lkIGNvc3RseSBjYWxjdWxhdGlvbnMgd2hpbGUgdGhlIHdpbmRvdyBzaXplIGlzIGluIGZsdXhcbiAqIHZhciBsYXp5TGF5b3V0ID0gXy5kZWJvdW5jZShjYWxjdWxhdGVMYXlvdXQsIDE1MCk7XG4gKiBqUXVlcnkod2luZG93KS5vbigncmVzaXplJywgbGF6eUxheW91dCk7XG4gKlxuICogLy8gZXhlY3V0ZSBgc2VuZE1haWxgIHdoZW4gdGhlIGNsaWNrIGV2ZW50IGlzIGZpcmVkLCBkZWJvdW5jaW5nIHN1YnNlcXVlbnQgY2FsbHNcbiAqIGpRdWVyeSgnI3Bvc3Rib3gnKS5vbignY2xpY2snLCBfLmRlYm91bmNlKHNlbmRNYWlsLCAzMDAsIHtcbiAqICAgJ2xlYWRpbmcnOiB0cnVlLFxuICogICAndHJhaWxpbmcnOiBmYWxzZVxuICogfSk7XG4gKlxuICogLy8gZW5zdXJlIGBiYXRjaExvZ2AgaXMgZXhlY3V0ZWQgb25jZSBhZnRlciAxIHNlY29uZCBvZiBkZWJvdW5jZWQgY2FsbHNcbiAqIHZhciBzb3VyY2UgPSBuZXcgRXZlbnRTb3VyY2UoJy9zdHJlYW0nKTtcbiAqIHNvdXJjZS5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgXy5kZWJvdW5jZShiYXRjaExvZywgMjUwLCB7XG4gKiAgICdtYXhXYWl0JzogMTAwMFxuICogfSwgZmFsc2UpO1xuICovXG5mdW5jdGlvbiBkZWJvdW5jZShmdW5jLCB3YWl0LCBvcHRpb25zKSB7XG4gIHZhciBhcmdzLFxuICAgICAgbWF4VGltZW91dElkLFxuICAgICAgcmVzdWx0LFxuICAgICAgc3RhbXAsXG4gICAgICB0aGlzQXJnLFxuICAgICAgdGltZW91dElkLFxuICAgICAgdHJhaWxpbmdDYWxsLFxuICAgICAgbGFzdENhbGxlZCA9IDAsXG4gICAgICBtYXhXYWl0ID0gZmFsc2UsXG4gICAgICB0cmFpbGluZyA9IHRydWU7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGZ1bmMpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcjtcbiAgfVxuICB3YWl0ID0gbmF0aXZlTWF4KDAsIHdhaXQpIHx8IDA7XG4gIGlmIChvcHRpb25zID09PSB0cnVlKSB7XG4gICAgdmFyIGxlYWRpbmcgPSB0cnVlO1xuICAgIHRyYWlsaW5nID0gZmFsc2U7XG4gIH0gZWxzZSBpZiAoaXNPYmplY3Qob3B0aW9ucykpIHtcbiAgICBsZWFkaW5nID0gb3B0aW9ucy5sZWFkaW5nO1xuICAgIG1heFdhaXQgPSAnbWF4V2FpdCcgaW4gb3B0aW9ucyAmJiAobmF0aXZlTWF4KHdhaXQsIG9wdGlvbnMubWF4V2FpdCkgfHwgMCk7XG4gICAgdHJhaWxpbmcgPSAndHJhaWxpbmcnIGluIG9wdGlvbnMgPyBvcHRpb25zLnRyYWlsaW5nIDogdHJhaWxpbmc7XG4gIH1cbiAgdmFyIGRlbGF5ZWQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcmVtYWluaW5nID0gd2FpdCAtIChub3coKSAtIHN0YW1wKTtcbiAgICBpZiAocmVtYWluaW5nIDw9IDApIHtcbiAgICAgIGlmIChtYXhUaW1lb3V0SWQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KG1heFRpbWVvdXRJZCk7XG4gICAgICB9XG4gICAgICB2YXIgaXNDYWxsZWQgPSB0cmFpbGluZ0NhbGw7XG4gICAgICBtYXhUaW1lb3V0SWQgPSB0aW1lb3V0SWQgPSB0cmFpbGluZ0NhbGwgPSB1bmRlZmluZWQ7XG4gICAgICBpZiAoaXNDYWxsZWQpIHtcbiAgICAgICAgbGFzdENhbGxlZCA9IG5vdygpO1xuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xuICAgICAgICBpZiAoIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XG4gICAgICAgICAgYXJncyA9IHRoaXNBcmcgPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZGVsYXllZCwgcmVtYWluaW5nKTtcbiAgICB9XG4gIH07XG5cbiAgdmFyIG1heERlbGF5ZWQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGltZW91dElkKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICB9XG4gICAgbWF4VGltZW91dElkID0gdGltZW91dElkID0gdHJhaWxpbmdDYWxsID0gdW5kZWZpbmVkO1xuICAgIGlmICh0cmFpbGluZyB8fCAobWF4V2FpdCAhPT0gd2FpdCkpIHtcbiAgICAgIGxhc3RDYWxsZWQgPSBub3coKTtcbiAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyk7XG4gICAgICBpZiAoIXRpbWVvdXRJZCAmJiAhbWF4VGltZW91dElkKSB7XG4gICAgICAgIGFyZ3MgPSB0aGlzQXJnID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgc3RhbXAgPSBub3coKTtcbiAgICB0aGlzQXJnID0gdGhpcztcbiAgICB0cmFpbGluZ0NhbGwgPSB0cmFpbGluZyAmJiAodGltZW91dElkIHx8ICFsZWFkaW5nKTtcblxuICAgIGlmIChtYXhXYWl0ID09PSBmYWxzZSkge1xuICAgICAgdmFyIGxlYWRpbmdDYWxsID0gbGVhZGluZyAmJiAhdGltZW91dElkO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIW1heFRpbWVvdXRJZCAmJiAhbGVhZGluZykge1xuICAgICAgICBsYXN0Q2FsbGVkID0gc3RhbXA7XG4gICAgICB9XG4gICAgICB2YXIgcmVtYWluaW5nID0gbWF4V2FpdCAtIChzdGFtcCAtIGxhc3RDYWxsZWQpLFxuICAgICAgICAgIGlzQ2FsbGVkID0gcmVtYWluaW5nIDw9IDA7XG5cbiAgICAgIGlmIChpc0NhbGxlZCkge1xuICAgICAgICBpZiAobWF4VGltZW91dElkKSB7XG4gICAgICAgICAgbWF4VGltZW91dElkID0gY2xlYXJUaW1lb3V0KG1heFRpbWVvdXRJZCk7XG4gICAgICAgIH1cbiAgICAgICAgbGFzdENhbGxlZCA9IHN0YW1wO1xuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KHRoaXNBcmcsIGFyZ3MpO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAoIW1heFRpbWVvdXRJZCkge1xuICAgICAgICBtYXhUaW1lb3V0SWQgPSBzZXRUaW1lb3V0KG1heERlbGF5ZWQsIHJlbWFpbmluZyk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpc0NhbGxlZCAmJiB0aW1lb3V0SWQpIHtcbiAgICAgIHRpbWVvdXRJZCA9IGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgIH1cbiAgICBlbHNlIGlmICghdGltZW91dElkICYmIHdhaXQgIT09IG1heFdhaXQpIHtcbiAgICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZGVsYXllZCwgd2FpdCk7XG4gICAgfVxuICAgIGlmIChsZWFkaW5nQ2FsbCkge1xuICAgICAgaXNDYWxsZWQgPSB0cnVlO1xuICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQXJnLCBhcmdzKTtcbiAgICB9XG4gICAgaWYgKGlzQ2FsbGVkICYmICF0aW1lb3V0SWQgJiYgIW1heFRpbWVvdXRJZCkge1xuICAgICAgYXJncyA9IHRoaXNBcmcgPSBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGRlYm91bmNlO1xuIiwiLyoqXG4gKiBMby1EYXNoIDIuNC4xIChDdXN0b20gQnVpbGQpIDxodHRwOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIG1vZGVybiBleHBvcnRzPVwibnBtXCIgLW8gLi9ucG0vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxMyBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS41LjIgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHA6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cbnZhciBpc05hdGl2ZSA9IHJlcXVpcmUoJ2xvZGFzaC5faXNuYXRpdmUnKTtcblxuLyoqXG4gKiBHZXRzIHRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIHRoYXQgaGF2ZSBlbGFwc2VkIHNpbmNlIHRoZSBVbml4IGVwb2NoXG4gKiAoMSBKYW51YXJ5IDE5NzAgMDA6MDA6MDAgVVRDKS5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IFV0aWxpdGllc1xuICogQGV4YW1wbGVcbiAqXG4gKiB2YXIgc3RhbXAgPSBfLm5vdygpO1xuICogXy5kZWZlcihmdW5jdGlvbigpIHsgY29uc29sZS5sb2coXy5ub3coKSAtIHN0YW1wKTsgfSk7XG4gKiAvLyA9PiBsb2dzIHRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIGl0IHRvb2sgZm9yIHRoZSBkZWZlcnJlZCBmdW5jdGlvbiB0byBiZSBjYWxsZWRcbiAqL1xudmFyIG5vdyA9IGlzTmF0aXZlKG5vdyA9IERhdGUubm93KSAmJiBub3cgfHwgZnVuY3Rpb24oKSB7XG4gIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbm93O1xuIiwiLyoqXG4gKiBMby1EYXNoIDIuNC4xIChDdXN0b20gQnVpbGQpIDxodHRwOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIG1vZGVybiBleHBvcnRzPVwibnBtXCIgLW8gLi9ucG0vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxMyBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS41LjIgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHA6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cblxuLyoqIFVzZWQgZm9yIG5hdGl2ZSBtZXRob2QgcmVmZXJlbmNlcyAqL1xudmFyIG9iamVjdFByb3RvID0gT2JqZWN0LnByb3RvdHlwZTtcblxuLyoqIFVzZWQgdG8gcmVzb2x2ZSB0aGUgaW50ZXJuYWwgW1tDbGFzc11dIG9mIHZhbHVlcyAqL1xudmFyIHRvU3RyaW5nID0gb2JqZWN0UHJvdG8udG9TdHJpbmc7XG5cbi8qKiBVc2VkIHRvIGRldGVjdCBpZiBhIG1ldGhvZCBpcyBuYXRpdmUgKi9cbnZhciByZU5hdGl2ZSA9IFJlZ0V4cCgnXicgK1xuICBTdHJpbmcodG9TdHJpbmcpXG4gICAgLnJlcGxhY2UoL1suKis/XiR7fSgpfFtcXF1cXFxcXS9nLCAnXFxcXCQmJylcbiAgICAucmVwbGFjZSgvdG9TdHJpbmd8IGZvciBbXlxcXV0rL2csICcuKj8nKSArICckJ1xuKTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBhIG5hdGl2ZSBmdW5jdGlvbi5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGB2YWx1ZWAgaXMgYSBuYXRpdmUgZnVuY3Rpb24sIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gaXNOYXRpdmUodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PSAnZnVuY3Rpb24nICYmIHJlTmF0aXZlLnRlc3QodmFsdWUpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlzTmF0aXZlO1xuIiwiLyoqXG4gKiBMby1EYXNoIDIuNC4xIChDdXN0b20gQnVpbGQpIDxodHRwOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIG1vZGVybiBleHBvcnRzPVwibnBtXCIgLW8gLi9ucG0vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxMyBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS41LjIgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHA6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBhIGZ1bmN0aW9uLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGB2YWx1ZWAgaXMgYSBmdW5jdGlvbiwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzRnVuY3Rpb24oXyk7XG4gKiAvLyA9PiB0cnVlXG4gKi9cbmZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PSAnZnVuY3Rpb24nO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlzRnVuY3Rpb247XG4iLCIvKipcbiAqIExvLURhc2ggMi40LjEgKEN1c3RvbSBCdWlsZCkgPGh0dHA6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZHVsYXJpemUgbW9kZXJuIGV4cG9ydHM9XCJucG1cIiAtbyAuL25wbS9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDEzIFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjUuMiA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTMgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cDovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xudmFyIG9iamVjdFR5cGVzID0gcmVxdWlyZSgnbG9kYXNoLl9vYmplY3R0eXBlcycpO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIHRoZSBsYW5ndWFnZSB0eXBlIG9mIE9iamVjdC5cbiAqIChlLmcuIGFycmF5cywgZnVuY3Rpb25zLCBvYmplY3RzLCByZWdleGVzLCBgbmV3IE51bWJlcigwKWAsIGFuZCBgbmV3IFN0cmluZygnJylgKVxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGB2YWx1ZWAgaXMgYW4gb2JqZWN0LCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNPYmplY3Qoe30pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3QoWzEsIDIsIDNdKTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0KDEpO1xuICogLy8gPT4gZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNPYmplY3QodmFsdWUpIHtcbiAgLy8gY2hlY2sgaWYgdGhlIHZhbHVlIGlzIHRoZSBFQ01BU2NyaXB0IGxhbmd1YWdlIHR5cGUgb2YgT2JqZWN0XG4gIC8vIGh0dHA6Ly9lczUuZ2l0aHViLmlvLyN4OFxuICAvLyBhbmQgYXZvaWQgYSBWOCBidWdcbiAgLy8gaHR0cDovL2NvZGUuZ29vZ2xlLmNvbS9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MjI5MVxuICByZXR1cm4gISEodmFsdWUgJiYgb2JqZWN0VHlwZXNbdHlwZW9mIHZhbHVlXSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaXNPYmplY3Q7XG4iLCIvKipcbiAqIExvLURhc2ggMi40LjEgKEN1c3RvbSBCdWlsZCkgPGh0dHA6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZHVsYXJpemUgbW9kZXJuIGV4cG9ydHM9XCJucG1cIiAtbyAuL25wbS9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDEzIFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjUuMiA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTMgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cDovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xuXG4vKiogVXNlZCB0byBkZXRlcm1pbmUgaWYgdmFsdWVzIGFyZSBvZiB0aGUgbGFuZ3VhZ2UgdHlwZSBPYmplY3QgKi9cbnZhciBvYmplY3RUeXBlcyA9IHtcbiAgJ2Jvb2xlYW4nOiBmYWxzZSxcbiAgJ2Z1bmN0aW9uJzogdHJ1ZSxcbiAgJ29iamVjdCc6IHRydWUsXG4gICdudW1iZXInOiBmYWxzZSxcbiAgJ3N0cmluZyc6IGZhbHNlLFxuICAndW5kZWZpbmVkJzogZmFsc2Vcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gb2JqZWN0VHlwZXM7XG4iLCIvKipcbiAqIERyYWdkZWFsZXIuanMgMC45LjdcbiAqIGh0dHA6Ly9naXRodWIuY29tL3NraWRkaW5nL2RyYWdkZWFsZXJcbiAqXG4gKiAoYykgMjAxMCsgT3ZpZGl1IENoZXJlY2hlyJlcbiAqIGh0dHA6Ly9za2lkZGluZy5taXQtbGljZW5zZS5vcmdcbiAqL1xuXG4oZnVuY3Rpb24gKHJvb3QsIGZhY3RvcnkpIHtcbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoZmFjdG9yeSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzXG4gICAgcm9vdC5EcmFnZGVhbGVyID0gZmFjdG9yeSgpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uICgpIHtcblxudmFyIERyYWdkZWFsZXIgPSBmdW5jdGlvbih3cmFwcGVyLCBvcHRpb25zKSB7XG4gIC8qKlxuICAgKiBEcmFnLWJhc2VkIGNvbXBvbmVudCB0aGF0IHdvcmtzIGFyb3VuZCB0d28gYmFzaWMgRE9NIGVsZW1lbnRzLlxuICAgKlxuICAgKiAgIC0gVGhlIHdyYXBwZXI6IFRoZSB0b3AtbGV2ZWwgZWxlbWVudCB3aXRoIHRoZSAuZHJhZ2RlYWxlciBjbGFzcy4gV2VcbiAgICogICAgICAgICAgICAgICAgICBjcmVhdGUgYSBEcmFnZGVhbGVyIGluc3RhbmNlIHdpdGggdGhlIHdyYXBwZXIgYXMgdGhlXG4gICAqICAgICAgICAgICAgICAgICAgZmlyc3QgY29uc3RydWN0b3IgcGFyYW1ldGVyIChpdCBjYW4gZWl0aGVyIHJlY2VpdmUgdGhlIElEXG4gICAqICAgICAgICAgICAgICAgICAgb2YgdGhlIHdyYXBwZXIsIG9yIHRoZSBlbGVtZW50IGl0c2VsZi4pIFRoZSB3cmFwcGVyXG4gICAqICAgICAgICAgICAgICAgICAgZXN0YWJsaXNoZXMgdGhlIGRyYWdnaW5nIGJvdW5kcy5cbiAgICpcbiAgICogICAtIFRoZSBoYW5kbGU6IEEgY2hpbGQgb2YgdGhlIHdyYXBwZXIgZWxlbWVudCwgZGl2IHdpdGggYSByZXF1aXJlZFxuICAgKiAgICAgICAgICAgICAgICAgLmhhbmRsZSBjbGFzcyAobWF5IGJlIG92ZXJyaWRkZW4gaW4gb3B0aW9ucykuIFRoaXMgd2lsbCBiZVxuICAgKiAgICAgICAgICAgICAgICAgdGhlIGRyYWdnZWQgZWxlbWVudCwgY29uc3RyYWluZWQgYnkgdGhlIHdyYXBwZXIncyBib3VuZHMuXG4gICAqXG4gICAqXG4gICAqIFRoZSBoYW5kbGUgY2FuIGJlIGJvdGggc21hbGxlciBvciBiaWdnZXIgdGhhbiB0aGUgd3JhcHBlci5cbiAgICpcbiAgICogICAtIFdoZW4gdGhlIGhhbmRsZSBpcyBzbWFsbGVyLCBEcmFnZGVhbGVyIHdpbGwgYWN0IGFzIGEgcmVndWxhciBzbGlkZXIsXG4gICAqICAgICBlbmFibGluZyB0aGUgaGFuZGxlIHRvIGJlIGRyYWdnZWQgZnJvbSBvbmUgc2lkZSBvZiB0aGUgd3JhcHBlciB0b1xuICAgKiAgICAgYW5vdGhlci5cbiAgICpcbiAgICogICAtIFdoZW4gdGhlIGhhbmRsZSBpcyBiaWdnZXIsIERyYWdkZWFsZXIgd2lsbCBhY3QgYSBtYXNrIGZvciBhIGRyYWdnYWJsZVxuICAgKiAgICAgc3VyZmFjZSwgd2hlcmUgdGhlIGhhbmRsZSBpcyB0aGUgZHJhZ2dhYmxlIHN1cmZhY2UgY29udHJhaW5lZCBieSB0aGVcbiAgICogICAgIHNtYWxsZXIgYm91bmRzIG9mIHRoZSB3cmFwcGVyLiBUaGUgZHJhZyBhY3Rpb24gaW4gdGhpcyBjYXNlIGlzIHVzZWRcbiAgICogICAgIHRvIHJldmVhbCBhbmQgXCJkaXNjb3ZlclwiIHBhcnRpYWwgY29udGVudCBhdCBhIHRpbWUuXG4gICAqXG4gICAqXG4gICAqIFNpbXBsZSB1c2FnZTpcbiAgICpcbiAgICogICAvLyBKYXZhU2NyaXB0XG4gICAqICAgbmV3IERyYWdkZWFsZXIoJ3NpbXBsZS1zbGlkZXInKTtcbiAgICpcbiAgICogICA8IS0tIEhUTUwgLS0+XG4gICAqICAgPGRpdiBpZD1cInNpbXBsZS1zbGlkZXJcIiBjbGFzcz1cImRyYWdkZWFsZXJcIj5cbiAgICogICAgIDxkaXYgY2xhc3M9XCJoYW5kbGVcIj5kcmFnIG1lPC9kaXY+XG4gICAqICAgPC9kaXY+XG4gICAqXG4gICAqXG4gICAqIFRoZSBzZWNvbmQgcGFyYW1ldGVyIG9mIHRoZSBEcmFnZGVhbGVyIGNvbnN0cnVjdG9yIGlzIGFuIG9iamVjdCB1c2VkIGZvclxuICAgKiBzcGVjaWZ5aW5nIGFueSBvZiB0aGUgc3VwcG9ydGVkIG9wdGlvbnMuIEFsbCBvZiB0aGVtIGFyZSBvcHRpb25hbC5cbiAgICpcbiAgICogICAtIGJvb2wgZGlzYWJsZWQ9ZmFsc2U6IEluaXQgRHJhZ2RlYWxlciBpbiBhIGRpc2FibGVkIHN0YXRlLiBUaGUgaGFuZGxlXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICB3aWxsIGhhdmUgYSAuZGlzYWJsZWQgY2xhc3MuXG4gICAqXG4gICAqICAgLSBib29sIGhvcml6b250YWw9dHJ1ZTogRW5hYmxlIGhvcml6b250YWwgZHJhZ2dpbmcuXG4gICAqXG4gICAqICAgLSBib29sIHZlcnRpY2FsPWZhbHNlOiBFbmFibGUgdmVydGljYWwgZHJhZ2dpbmcuXG4gICAqXG4gICAqICAgLSBudW1iZXIgeD0wOiBJbml0aWFsIGhvcml6b250YWwgKGxlZnQpIHBvc2l0aW9uLiBBY2NlcHRzIGEgZmxvYXQgbnVtYmVyXG4gICAqICAgICAgICAgICAgICAgICB2YWx1ZSBiZXR3ZWVuIDAgYW5kIDEuIFJlYWQgYmVsb3cgYWJvdXQgcG9zaXRpb25pbmcgaW5cbiAgICogICAgICAgICAgICAgICAgIERyYWdkZWFsZXIuXG4gICAqXG4gICAqICAgLSBudW1iZXIgeT0wOiBJbml0aWFsIHZlcnRpY2FsICh0b3ApIHBvc2l0aW9uLiBBY2NlcHRzIGEgZmxvYXQgbnVtYmVyXG4gICAqICAgICAgICAgICAgICAgICB2YWx1ZSBiZXR3ZWVuIDAgYW5kIDEuIFJlYWQgYmVsb3cgYWJvdXQgcG9zaXRvbmluZyBpblxuICAgKiAgICAgICAgICAgICAgICAgRHJhZ2RlYWxlci5cbiAgICpcbiAgICogICAtIG51bWJlciBzdGVwcz0wOiBMaW1pdCB0aGUgcG9zaXRpb25pbmcgb2YgdGhlIGhhbmRsZSB3aXRoaW4gdGhlIGJvdW5kc1xuICAgKiAgICAgICAgICAgICAgICAgICAgIG9mIHRoZSB3cmFwcGVyLCBieSBkZWZpbmluZyBhIHZpcnR1YWwgZ3JpZCBtYWRlIG91dCBvZlxuICAgKiAgICAgICAgICAgICAgICAgICAgIGEgbnVtYmVyIG9mIGVxdWFsbHktc3BhY2VkIHN0ZXBzLiBUaGlzIHJlc3RyaWN0c1xuICAgKiAgICAgICAgICAgICAgICAgICAgIHBsYWNpbmcgdGhlIGhhbmRsZSBhbnl3aGVyZSBpbi1iZXR3ZWVuIHRoZXNlIHN0ZXBzLlxuICAgKiAgICAgICAgICAgICAgICAgICAgIEUuZy4gc2V0dGluZyAzIHN0ZXBzIHRvIGEgcmVndWxhciBzbGlkZXIgd2lsbCBvbmx5XG4gICAqICAgICAgICAgICAgICAgICAgICAgYWxsb3cgeW91IHRvIG1vdmUgaXQgdG8gdGhlIGxlZnQsIHRvIHRoZSByaWdodCBvclxuICAgKiAgICAgICAgICAgICAgICAgICAgIGV4YWN0bHkgaW4gdGhlIG1pZGRsZS5cbiAgICpcbiAgICogICAtIGJvb2wgc25hcD1mYWxzZTogV2hlbiBhIG51bWJlciBvZiBzdGVwcyBpcyBzZXQsIHNuYXAgdGhlIHBvc2l0aW9uIG9mXG4gICAqICAgICAgICAgICAgICAgICAgICAgIHRoZSBoYW5kbGUgdG8gaXRzIGNsb3Nlc3Qgc3RlcCBpbnN0YW50bHksIGV2ZW4gd2hlblxuICAgKiAgICAgICAgICAgICAgICAgICAgICBkcmFnZ2luZy5cbiAgICpcbiAgICogICAtIGJvb2wgc2xpZGU9dHJ1ZTogU2xpZGUgaGFuZGxlIGFmdGVyIHJlbGVhc2luZyBpdCwgZGVwZW5kaW5nIG9uIHRoZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICBtb3ZlbWVudCBzcGVlZCBiZWZvcmUgdGhlIG1vdXNlL3RvdWNoIHJlbGVhc2UuIFRoZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICBmb3JtdWxhIGZvciBjYWxjdWxhdGluZyBob3cgbXVjaCB3aWxsIHRoZSBoYW5kbGVcbiAgICogICAgICAgICAgICAgICAgICAgICAgc2xpZGUgYWZ0ZXIgcmVsZWFzaW5nIGl0IGlzIGRlZmluZWQgYnkgc2ltcGx5XG4gICAqICAgICAgICAgICAgICAgICAgICAgIGV4dGVuZGluZyB0aGUgbW92ZW1lbnQgb2YgdGhlIGhhbmRsZSBpbiB0aGUgY3VycmVudFxuICAgKiAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb24sIHdpdGggdGhlIGxhc3QgbW92ZW1lbnQgdW5pdCB0aW1lcyBmb3VyIChhXG4gICAqICAgICAgICAgICAgICAgICAgICAgIG1vdmVtZW50IHVuaXQgaXMgY29uc2lkZXJlZCB0aGUgZGlzdGFuY2UgY3Jvc3NlZFxuICAgKiAgICAgICAgICAgICAgICAgICAgICBzaW5jZSB0aGUgbGFzdCBhbmltYXRpb24gbG9vcCwgd2hpY2ggaXMgY3VycmVudGx5XG4gICAqICAgICAgICAgICAgICAgICAgICAgIDI1bXMuKSBTbyBpZiB5b3Ugd2VyZSB0byBkcmFnIHRoZSBoYW5kbGUgNTBweCBpbiB0aGVcbiAgICogICAgICAgICAgICAgICAgICAgICAgYmxpbmsgb2YgYW4gZXllLCBpdCB3aWxsIHNsaWRlIGFub3RoZXIgMjAwcHggaW4gdGhlXG4gICAqICAgICAgICAgICAgICAgICAgICAgIHNhbWUgZGlyZWN0aW9uLiBTdGVwcyBpbnRlcmZlcmUgd2l0aCB0aGlzIGZvcm11bGEsIGFzXG4gICAqICAgICAgICAgICAgICAgICAgICAgIHRoZSBjbG9zZXN0IHN0ZXAgaXMgY2FsY3VsYXRlZCBiZWZvcmUgdGhlIHNsaWRpbmdcbiAgICogICAgICAgICAgICAgICAgICAgICAgZGlzdGFuY2UuXG4gICAqXG4gICAqICAgLSBib29sIGxvb3NlPWZhbHNlOiBMb29zZW4tdXAgd3JhcHBlciBib3VuZGFyaWVzIHdoZW4gZHJhZ2dpbmcuIFRoaXNcbiAgICogICAgICAgICAgICAgICAgICAgICAgIGFsbG93cyB0aGUgaGFuZGxlIHRvIGJlICpzbGlnaHRseSogZHJhZ2dlZCBvdXRzaWRlXG4gICAqICAgICAgICAgICAgICAgICAgICAgICB0aGUgYm91bmRzIG9mIHRoZSB3cmFwcGVyLCBidXQgc2xpZGVzIGl0IGJhY2sgdG8gdGhlXG4gICAqICAgICAgICAgICAgICAgICAgICAgICBtYXJnaW5zIG9mIHRoZSB3cmFwcGVyIHVwb24gcmVsZWFzZS4gVGhlIGZvcm11bGEgZm9yXG4gICAqICAgICAgICAgICAgICAgICAgICAgICBjYWxjdWxhdGluZyBob3cgbXVjaCB0aGUgaGFuZGxlIGV4Y2VlZHMgdGhlIHdyYXBwZXJcbiAgICogICAgICAgICAgICAgICAgICAgICAgIGJvdW5kcyBpcyBtYWRlIG91dCBvZiB0aGUgYWN0dWFsIGRyYWcgZGlzdGFuY2VcbiAgICogICAgICAgICAgICAgICAgICAgICAgIGRpdmlkZWQgYnkgNC4gRS5nLiBQdWxsaW5nIGEgc2xpZGVyIG91dHNpZGUgaXRzXG4gICAqICAgICAgICAgICAgICAgICAgICAgICBmcmFtZSBieSAxMDBweCB3aWxsIG9ubHkgcG9zaXRpb24gaXQgMjVweCBvdXRzaWRlXG4gICAqICAgICAgICAgICAgICAgICAgICAgICB0aGUgZnJhbWUuXG4gICAqXG4gICAqICAgLSBudW1iZXIgdG9wPTA6IFRvcCBwYWRkaW5nIGJldHdlZW4gdGhlIHdyYXBwZXIgYW5kIHRoZSBoYW5kbGUuXG4gICAqXG4gICAqICAgLSBudW1iZXIgYm90dG9tPTA6IEJvdHRvbSBwYWRkaW5nIGJldHdlZW4gdGhlIHdyYXBwZXIgYW5kIHRoZSBoYW5kbGUuXG4gICAqXG4gICAqICAgLSBudW1iZXIgbGVmdD0wOiBMZWZ0IHBhZGRpbmcgYmV0d2VlbiB0aGUgd3JhcHBlciBhbmQgdGhlIGhhbmRsZS5cbiAgICpcbiAgICogICAtIG51bWJlciByaWdodD0wOiBSaWdodCBwYWRkaW5nIGJldHdlZW4gdGhlIHdyYXBwZXIgYW5kIHRoZSBoYW5kbGUuXG4gICAqXG4gICAqICAgLSBmbiBjYWxsYmFjayh4LCB5KTogQ2FsbGVkIHdoZW4gcmVsZWFzaW5nIGhhbmRsZSwgd2l0aCB0aGUgcHJvamVjdGVkXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgeCwgeSBwb3NpdGlvbiBvZiB0aGUgaGFuZGxlLiBQcm9qZWN0ZWQgdmFsdWUgbWVhbnNcbiAgICogICAgICAgICAgICAgICAgICAgICAgICB0aGUgdmFsdWUgdGhlIHNsaWRlciB3aWxsIGhhdmUgYWZ0ZXIgZmluaXNoaW5nIGFcbiAgICogICAgICAgICAgICAgICAgICAgICAgICBzbGlkaW5nIGFuaW1hdGlvbiwgY2F1c2VkIGJ5IGVpdGhlciBhIHN0ZXBcbiAgICogICAgICAgICAgICAgICAgICAgICAgICByZXN0cmljdGlvbiBvciBkcmFnIG1vdGlvbiAoc2VlIHN0ZXBzIGFuZCBzbGlkZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuKSBUaGlzIGltcGxpZXMgdGhhdCB0aGUgYWN0dWFsIHBvc2l0aW9uIG9mXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgdGhlIGhhbmRsZSBhdCB0aGUgdGltZSB0aGlzIGNhbGxiYWNrIGlzIGNhbGxlZFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgIG1pZ2h0IG5vdCB5ZXQgcmVmbGVjdCB0aGUgeCwgeSB2YWx1ZXMgcmVjZWl2ZWQuXG4gICAqXG4gICAqICAgLSBmbiBhbmltYXRpb25DYWxsYmFjayh4LCB5KTogQ2FsbGVkIGV2ZXJ5IGFuaW1hdGlvbiBsb29wLCBhcyBsb25nIGFzXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlIGhhbmRsZSBpcyBiZWluZyBkcmFnZ2VkIG9yIGluIHRoZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3Mgb2YgYSBzbGlkaW5nIGFuaW1hdGlvbi4gVGhlIHgsIHlcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbmFsIHZhbHVlcyByZWNlaXZlZCBieSB0aGlzXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sgcmVmbGVjdCB0aGUgZXhhY3QgcG9zaXRpb24gb2YgdGhlXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFuZGxlIERPTSBlbGVtZW50LCB3aGljaCBpbmNsdWRlc1xuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4Y2VlZGluZyB2YWx1ZXMgKGV2ZW4gbmVnYXRpdmUgdmFsdWVzKVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoZW4gdGhlIGxvb3NlIG9wdGlvbiBpcyBzZXQgdHJ1ZS5cbiAgICpcbiAgICogICAtIHN0cmluZyBoYW5kbGVDbGFzcz0naGFuZGxlJzogQ3VzdG9tIGNsYXNzIG9mIGhhbmRsZSBlbGVtZW50LlxuICAgKlxuICAgKiBEcmFnZGVhbGVyIGFsc28gaGFzIGEgZmV3IG1ldGhvZHMgdG8gaW50ZXJhY3Qgd2l0aCwgcG9zdC1pbml0aWFsaXphdGlvbi5cbiAgICpcbiAgICogICAtIGRpc2FibGU6IERpc2FibGUgZHJhZ2dpbmcgb2YgYSBEcmFnZGVhbGVyIGluc3RhbmNlLiBKdXN0IGFzIHdpdGggdGhlXG4gICAqICAgICAgICAgICAgICBkaXNhYmxlZCBvcHRpb24sIHRoZSBoYW5kbGUgd2lsbCByZWNlaXZlIGEgLmRpc2FibGVkIGNsYXNzXG4gICAqXG4gICAqICAgLSBlbmFibGU6IEVuYWJsZSBkcmFnZ2luZyBvZiBhIERyYWdkZWFsZXIgaW5zdGFuY2UuIFRoZSAuZGlzYWJsZWQgY2xhc3NcbiAgICogICAgICAgICAgICAgb2YgdGhlIGhhbmRsZSB3aWxsIGJlIHJlbW92ZWQuXG4gICAqXG4gICAqICAgLSByZWZsb3c6IFJlY2FsY3VsYXRlIHRoZSB3cmFwcGVyIGJvdW5kcyBvZiBhIERyYWdkZWFsZXIgaW5zdGFuY2UsIHVzZWRcbiAgICogICAgICAgICAgICAgd2hlbiB0aGUgd3JhcHBlciBpcyByZXNwb25zaXZlIGFuZCBpdHMgcGFyZW50IGNvbnRhaW5lclxuICAgKiAgICAgICAgICAgICBjaGFuZ2VkIGl0cyBzaXplLCBvciBhZnRlciBjaGFuZ2luZyB0aGUgc2l6ZSBvZiB0aGUgd3JhcHBlclxuICAgKiAgICAgICAgICAgICBkaXJlY3RseS5cbiAgICpcbiAgICogICAtIGdldFZhbHVlOiBHZXQgdGhlIHZhbHVlIG9mIGEgRHJhZ2RlYWxlciBpbnN0YW5jZSBwcm9ncmFtYXRpY2FsbHkuIFRoZVxuICAgKiAgICAgICAgICAgICAgIHZhbHVlIGlzIHJldHVybmVkIGFzIGFuIFt4LCB5XSB0dXBsZSBhbmQgaXMgdGhlIGVxdWl2YWxlbnRcbiAgICogICAgICAgICAgICAgICBvZiB0aGUgKHByb2plY3RlZCkgdmFsdWUgcmV0dXJuZWQgYnkgdGhlIHJlZ3VsYXIgY2FsbGJhY2ssXG4gICAqICAgICAgICAgICAgICAgbm90IGFuaW1hdGlvbkNhbGxiYWNrLlxuICAgKlxuICAgKiAgIC0gZ2V0U3RlcDogU2FtZSBhcyBnZXRWYWx1ZSwgYnV0IHRoZSB2YWx1ZSByZXR1cm5lZCBpcyBpbiBzdGVwXG4gICAqICAgICAgICAgICAgICBpbmNyZW1lbnRzIChzZWUgc3RlcHMgb3B0aW9uKVxuICAgKlxuICAgKiAgIC0gc2V0VmFsdWUoeCwgeSwgc25hcD1mYWxzZSk6IFNldCB0aGUgdmFsdWUgb2YgYSBEcmFnZGVhbGVyIGluc3RhbmNlXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvZ3JhbWF0aWNhbGx5LiBUaGUgM3JkIHBhcmFtZXRlciBhbGxvd3NcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0byBzbmFwIHRoZSBoYW5kbGUgZGlyZWN0bHkgdG8gdGhlIGRlc2lyZWRcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSwgd2l0aG91dCBhbnkgc2xpZGluZyB0cmFuc2l0aW9uLlxuICAgKlxuICAgKiAgIC0gc2V0U3RlcCh4LCB5LCBzbmFwPWZhbHNlKTogU2FtZSBhcyBzZXRWYWx1ZSwgYnV0IHRoZSB2YWx1ZSBpcyByZWNlaXZlZFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW4gc3RlcCBpbmNyZW1lbnRzIChzZWUgc3RlcHMgb3B0aW9uKVxuICAgKlxuICAgKlxuICAgKiBQb3NpdGlvbmluZyBpbiBEcmFnZGVhbGVyOlxuICAgKlxuICAgKiAgIEJlc2lkZXMgdGhlIHRvcCwgYm90dG9tLCBsZWZ0IGFuZCByaWdodCBwYWRkaW5ncywgd2hpY2ggcmVwcmVzZW50IGFcbiAgICogICBudW1iZXIgb2YgcGl4ZWxzLCBEcmFnZGVhbGVyIHVzZXMgYSBbMCwgMV0tYmFzZWQgcG9zaXRpb25pbmcuIEJvdGhcbiAgICogICBob3Jpem9udGFsIGFuZCB2ZXJ0aWNhbCBwb3NpdGlvbnMgYXJlIHJlcHJlc2VudGVkIGJ5IHJhdGlvcyBiZXR3ZWVuIDBcbiAgICogICBhbmQgMS4gVGhpcyBhbGxvd3MgdGhlIERyYWdkZWFsZXIgd3JhcHBlciB0byBoYXZlIGEgcmVzcG9uc2l2ZSBzaXplIGFuZFxuICAgKiAgIG5vdCByZXZvbHZlIGFyb3VuZCBhIHNwZWNpZmljIG51bWJlciBvZiBwaXhlbHMuIFRoaXMgaXMgaG93IHRoZSB4LCB5XG4gICAqICAgb3B0aW9ucyBhcmUgc2V0LCB3aGF0IHRoZSBjYWxsYmFjayBhcmdzIGNvbnRhaW4gYW5kIHdoYXQgdmFsdWVzIHRoZVxuICAgKiAgIHNldFZhbHVlIG1ldGhvZCBleHBlY3RzLiBPbmNlIHBpY2tlZCB1cCwgdGhlIHJhdGlvcyBjYW4gYmUgc2NhbGVkIGFuZFxuICAgKiAgIG1hcHBlZCB0byBtYXRjaCBhbnkgcmVhbC1saWZlIHN5c3RlbSBvZiBjb29yZGluYXRlcyBvciBkaW1lbnNpb25zLlxuICAgKi9cbiAgdGhpcy5iaW5kTWV0aG9kcygpO1xuICB0aGlzLm9wdGlvbnMgPSB0aGlzLmFwcGx5RGVmYXVsdHMob3B0aW9ucyB8fCB7fSk7XG4gIHRoaXMud3JhcHBlciA9IHRoaXMuZ2V0V3JhcHBlckVsZW1lbnQod3JhcHBlcik7XG4gIGlmICghdGhpcy53cmFwcGVyKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRoaXMuaGFuZGxlID0gdGhpcy5nZXRIYW5kbGVFbGVtZW50KHRoaXMud3JhcHBlciwgdGhpcy5vcHRpb25zLmhhbmRsZUNsYXNzKTtcbiAgaWYgKCF0aGlzLmhhbmRsZSkge1xuICAgIHJldHVybjtcbiAgfVxuICB0aGlzLmluaXQoKTtcbiAgdGhpcy5iaW5kRXZlbnRMaXN0ZW5lcnMoKTtcbn07XG5EcmFnZGVhbGVyLnByb3RvdHlwZSA9IHtcbiAgZGVmYXVsdHM6IHtcbiAgICBkaXNhYmxlZDogZmFsc2UsXG4gICAgaG9yaXpvbnRhbDogdHJ1ZSxcbiAgICB2ZXJ0aWNhbDogZmFsc2UsXG4gICAgc2xpZGU6IHRydWUsXG4gICAgc3RlcHM6IDAsXG4gICAgc25hcDogZmFsc2UsXG4gICAgbG9vc2U6IGZhbHNlLFxuICAgIHNwZWVkOiAwLjEsXG4gICAgeFByZWNpc2lvbjogMCxcbiAgICB5UHJlY2lzaW9uOiAwLFxuICAgIGhhbmRsZUNsYXNzOiAnaGFuZGxlJ1xuICB9LFxuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnZhbHVlID0ge1xuICAgICAgcHJldjogWy0xLCAtMV0sXG4gICAgICBjdXJyZW50OiBbdGhpcy5vcHRpb25zLnggfHwgMCwgdGhpcy5vcHRpb25zLnkgfHwgMF0sXG4gICAgICB0YXJnZXQ6IFt0aGlzLm9wdGlvbnMueCB8fCAwLCB0aGlzLm9wdGlvbnMueSB8fCAwXVxuICAgIH07XG4gICAgdGhpcy5vZmZzZXQgPSB7XG4gICAgICB3cmFwcGVyOiBbMCwgMF0sXG4gICAgICBtb3VzZTogWzAsIDBdLFxuICAgICAgcHJldjogWy05OTk5OTksIC05OTk5OTldLFxuICAgICAgY3VycmVudDogWzAsIDBdLFxuICAgICAgdGFyZ2V0OiBbMCwgMF1cbiAgICB9O1xuICAgIHRoaXMuY2hhbmdlID0gWzAsIDBdO1xuICAgIHRoaXMuc3RlcFJhdGlvcyA9IHRoaXMuY2FsY3VsYXRlU3RlcFJhdGlvcygpO1xuXG4gICAgdGhpcy5hY3Rpdml0eSA9IGZhbHNlO1xuICAgIHRoaXMuZHJhZ2dpbmcgPSBmYWxzZTtcbiAgICB0aGlzLnRhcHBpbmcgPSBmYWxzZTtcblxuICAgIHRoaXMucmVmbG93KCk7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5kaXNhYmxlZCkge1xuICAgICAgdGhpcy5kaXNhYmxlKCk7XG4gICAgfVxuICB9LFxuICBhcHBseURlZmF1bHRzOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgZm9yICh2YXIgayBpbiB0aGlzLmRlZmF1bHRzKSB7XG4gICAgICBpZiAoIW9wdGlvbnMuaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgb3B0aW9uc1trXSA9IHRoaXMuZGVmYXVsdHNba107XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvcHRpb25zO1xuICB9LFxuICBnZXRXcmFwcGVyRWxlbWVudDogZnVuY3Rpb24od3JhcHBlcikge1xuICAgIGlmICh0eXBlb2Yod3JhcHBlcikgPT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh3cmFwcGVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHdyYXBwZXI7XG4gICAgfVxuICB9LFxuICBnZXRIYW5kbGVFbGVtZW50OiBmdW5jdGlvbih3cmFwcGVyLCBoYW5kbGVDbGFzcykge1xuICAgIHZhciBjaGlsZEVsZW1lbnRzLFxuICAgICAgICBoYW5kbGVDbGFzc01hdGNoZXIsXG4gICAgICAgIGk7XG4gICAgaWYgKHdyYXBwZXIuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSkge1xuICAgICAgY2hpbGRFbGVtZW50cyA9IHdyYXBwZXIuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShoYW5kbGVDbGFzcyk7XG4gICAgICBpZiAoY2hpbGRFbGVtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldHVybiBjaGlsZEVsZW1lbnRzWzBdO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBoYW5kbGVDbGFzc01hdGNoZXIgPSBuZXcgUmVnRXhwKCcoXnxcXFxccyknICsgaGFuZGxlQ2xhc3MgKyAnKFxcXFxzfCQpJyk7XG4gICAgICBjaGlsZEVsZW1lbnRzID0gd3JhcHBlci5nZXRFbGVtZW50c0J5VGFnTmFtZSgnKicpO1xuICAgICAgZm9yIChpID0gMDsgaSA8IGNoaWxkRWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGhhbmRsZUNsYXNzTWF0Y2hlci50ZXN0KGNoaWxkRWxlbWVudHNbaV0uY2xhc3NOYW1lKSkge1xuICAgICAgICAgIHJldHVybiBjaGlsZEVsZW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBjYWxjdWxhdGVTdGVwUmF0aW9zOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgc3RlcFJhdGlvcyA9IFtdO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuc3RlcHMgPiAxKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8PSB0aGlzLm9wdGlvbnMuc3RlcHMgLSAxOyBpKyspIHtcbiAgICAgICAgc3RlcFJhdGlvc1tpXSA9IGkgLyAodGhpcy5vcHRpb25zLnN0ZXBzIC0gMSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzdGVwUmF0aW9zO1xuICB9LFxuICBzZXRXcmFwcGVyT2Zmc2V0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLm9mZnNldC53cmFwcGVyID0gUG9zaXRpb24uZ2V0KHRoaXMud3JhcHBlcik7XG4gIH0sXG4gIGNhbGN1bGF0ZUJvdW5kczogZnVuY3Rpb24oKSB7XG4gICAgLy8gQXBwbHkgdG9wL2JvdHRvbS9sZWZ0IGFuZCByaWdodCBwYWRkaW5nIG9wdGlvbnMgdG8gd3JhcHBlciBleHRyZW1pdGllc1xuICAgIC8vIHdoZW4gY2FsY3VsYXRpbmcgaXRzIGJvdW5kc1xuICAgIHZhciBib3VuZHMgPSB7XG4gICAgICB0b3A6IHRoaXMub3B0aW9ucy50b3AgfHwgMCxcbiAgICAgIGJvdHRvbTogLSh0aGlzLm9wdGlvbnMuYm90dG9tIHx8IDApICsgdGhpcy53cmFwcGVyLm9mZnNldEhlaWdodCxcbiAgICAgIGxlZnQ6IHRoaXMub3B0aW9ucy5sZWZ0IHx8IDAsXG4gICAgICByaWdodDogLSh0aGlzLm9wdGlvbnMucmlnaHQgfHwgMCkgKyB0aGlzLndyYXBwZXIub2Zmc2V0V2lkdGhcbiAgICB9O1xuICAgIC8vIFRoZSBhdmFpbGFibGUgd2lkdGggYW5kIGhlaWdodCByZXByZXNlbnRzIHRoZSBob3Jpem9udGFsIGFuZCB2ZXJ0aWNhbFxuICAgIC8vIHNwYWNlIHRoZSBoYW5kbGUgaGFzIGZvciBtb3ZpbmcuIEl0IGlzIGRldGVybWluZWQgYnkgdGhlIHdpZHRoIGFuZFxuICAgIC8vIGhlaWdodCBvZiB0aGUgd3JhcHBlciwgbWludXMgdGhlIHdpZHRoIGFuZCBoZWlnaHQgb2YgdGhlIGhhbmRsZVxuICAgIGJvdW5kcy5hdmFpbFdpZHRoID0gKGJvdW5kcy5yaWdodCAtIGJvdW5kcy5sZWZ0KSAtIHRoaXMuaGFuZGxlLm9mZnNldFdpZHRoO1xuICAgIGJvdW5kcy5hdmFpbEhlaWdodCA9IChib3VuZHMuYm90dG9tIC0gYm91bmRzLnRvcCkgLSB0aGlzLmhhbmRsZS5vZmZzZXRIZWlnaHQ7XG4gICAgcmV0dXJuIGJvdW5kcztcbiAgfSxcbiAgY2FsY3VsYXRlVmFsdWVQcmVjaXNpb246IGZ1bmN0aW9uKCkge1xuICAgIC8vIFRoZSBzbGlkaW5nIHRyYW5zaXRpb24gd29ya3MgYnkgZGl2aWRpbmcgaXRzZWxmIHVudGlsIGl0IHJlYWNoZXMgYSBtaW5cbiAgICAvLyB2YWx1ZSBzdGVwOyBiZWNhdXNlIERyYWdkZWFsZXIgd29ya3Mgd2l0aCBbMC0xXSB2YWx1ZXMsIHdlIG5lZWQgdGhpc1xuICAgIC8vIFwibWluIHZhbHVlIHN0ZXBcIiB0byByZXByZXNlbnQgYSBwaXhlbCB3aGVuIGFwcGxpZWQgdG8gdGhlIHJlYWwgaGFuZGxlXG4gICAgLy8gcG9zaXRpb24gd2l0aGluIHRoZSBET00uIFRoZSB4UHJlY2lzaW9uL3lQcmVjaXNpb24gb3B0aW9ucyBjYW4gYmVcbiAgICAvLyBzcGVjaWZpZWQgdG8gaW5jcmVhc2UgdGhlIGdyYW51bGFyaXR5IHdoZW4gd2UncmUgY29udHJvbGxpbmcgbGFyZ2VyXG4gICAgLy8gb2JqZWN0cyBmcm9tIG9uZSBvZiB0aGUgY2FsbGJhY2tzXG4gICAgdmFyIHhQcmVjaXNpb24gPSB0aGlzLm9wdGlvbnMueFByZWNpc2lvbiB8fCBNYXRoLmFicyh0aGlzLmJvdW5kcy5hdmFpbFdpZHRoKSxcbiAgICAgICAgeVByZWNpc2lvbiA9IHRoaXMub3B0aW9ucy55UHJlY2lzaW9uIHx8IE1hdGguYWJzKHRoaXMuYm91bmRzLmF2YWlsSGVpZ2h0KTtcbiAgICByZXR1cm4gW1xuICAgICAgeFByZWNpc2lvbiA/IDEgLyB4UHJlY2lzaW9uIDogMCxcbiAgICAgIHlQcmVjaXNpb24gPyAxIC8geVByZWNpc2lvbiA6IDBcbiAgICBdO1xuICB9LFxuICBiaW5kTWV0aG9kczogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5vbkhhbmRsZU1vdXNlRG93biA9IGJpbmQodGhpcy5vbkhhbmRsZU1vdXNlRG93biwgdGhpcyk7XG4gICAgdGhpcy5vbkhhbmRsZVRvdWNoU3RhcnQgPSBiaW5kKHRoaXMub25IYW5kbGVUb3VjaFN0YXJ0LCB0aGlzKTtcbiAgICB0aGlzLm9uRG9jdW1lbnRNb3VzZU1vdmUgPSBiaW5kKHRoaXMub25Eb2N1bWVudE1vdXNlTW92ZSwgdGhpcyk7XG4gICAgdGhpcy5vbldyYXBwZXJUb3VjaE1vdmUgPSBiaW5kKHRoaXMub25XcmFwcGVyVG91Y2hNb3ZlLCB0aGlzKTtcbiAgICB0aGlzLm9uV3JhcHBlck1vdXNlRG93biA9IGJpbmQodGhpcy5vbldyYXBwZXJNb3VzZURvd24sIHRoaXMpO1xuICAgIHRoaXMub25XcmFwcGVyVG91Y2hTdGFydCA9IGJpbmQodGhpcy5vbldyYXBwZXJUb3VjaFN0YXJ0LCB0aGlzKTtcbiAgICB0aGlzLm9uRG9jdW1lbnRNb3VzZVVwID0gYmluZCh0aGlzLm9uRG9jdW1lbnRNb3VzZVVwLCB0aGlzKTtcbiAgICB0aGlzLm9uRG9jdW1lbnRUb3VjaEVuZCA9IGJpbmQodGhpcy5vbkRvY3VtZW50VG91Y2hFbmQsIHRoaXMpO1xuICAgIHRoaXMub25IYW5kbGVDbGljayA9IGJpbmQodGhpcy5vbkhhbmRsZUNsaWNrLCB0aGlzKTtcbiAgICB0aGlzLm9uV2luZG93UmVzaXplID0gYmluZCh0aGlzLm9uV2luZG93UmVzaXplLCB0aGlzKTtcbiAgfSxcbiAgYmluZEV2ZW50TGlzdGVuZXJzOiBmdW5jdGlvbigpIHtcbiAgICAvLyBTdGFydCBkcmFnZ2luZ1xuICAgIGFkZEV2ZW50TGlzdGVuZXIodGhpcy5oYW5kbGUsICdtb3VzZWRvd24nLCB0aGlzLm9uSGFuZGxlTW91c2VEb3duKTtcbiAgICBhZGRFdmVudExpc3RlbmVyKHRoaXMuaGFuZGxlLCAndG91Y2hzdGFydCcsIHRoaXMub25IYW5kbGVUb3VjaFN0YXJ0KTtcbiAgICAvLyBXaGlsZSBkcmFnZ2luZ1xuICAgIGFkZEV2ZW50TGlzdGVuZXIoZG9jdW1lbnQsICdtb3VzZW1vdmUnLCB0aGlzLm9uRG9jdW1lbnRNb3VzZU1vdmUpO1xuICAgIGFkZEV2ZW50TGlzdGVuZXIodGhpcy53cmFwcGVyLCAndG91Y2htb3ZlJywgdGhpcy5vbldyYXBwZXJUb3VjaE1vdmUpO1xuICAgIC8vIFN0YXJ0IHRhcHBpbmdcbiAgICBhZGRFdmVudExpc3RlbmVyKHRoaXMud3JhcHBlciwgJ21vdXNlZG93bicsIHRoaXMub25XcmFwcGVyTW91c2VEb3duKTtcbiAgICBhZGRFdmVudExpc3RlbmVyKHRoaXMud3JhcHBlciwgJ3RvdWNoc3RhcnQnLCB0aGlzLm9uV3JhcHBlclRvdWNoU3RhcnQpO1xuICAgIC8vIFN0b3AgZHJhZ2dpbmcvdGFwcGluZ1xuICAgIGFkZEV2ZW50TGlzdGVuZXIoZG9jdW1lbnQsICdtb3VzZXVwJywgdGhpcy5vbkRvY3VtZW50TW91c2VVcCk7XG4gICAgYWRkRXZlbnRMaXN0ZW5lcihkb2N1bWVudCwgJ3RvdWNoZW5kJywgdGhpcy5vbkRvY3VtZW50VG91Y2hFbmQpO1xuXG4gICAgYWRkRXZlbnRMaXN0ZW5lcih0aGlzLmhhbmRsZSwgJ2NsaWNrJywgdGhpcy5vbkhhbmRsZUNsaWNrKTtcbiAgICBhZGRFdmVudExpc3RlbmVyKHdpbmRvdywgJ3Jlc2l6ZScsIHRoaXMub25XaW5kb3dSZXNpemUpO1xuXG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLmludGVydmFsID0gc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gICAgICBfdGhpcy5hbmltYXRlKCk7XG4gICAgfSwgMjUpO1xuICAgIHRoaXMuYW5pbWF0ZShmYWxzZSwgdHJ1ZSk7XG4gIH0sXG4gIHVuYmluZEV2ZW50TGlzdGVuZXJzOiBmdW5jdGlvbigpIHtcbiAgICByZW1vdmVFdmVudExpc3RlbmVyKHRoaXMuaGFuZGxlLCAnbW91c2Vkb3duJywgdGhpcy5vbkhhbmRsZU1vdXNlRG93bik7XG4gICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcih0aGlzLmhhbmRsZSwgJ3RvdWNoc3RhcnQnLCB0aGlzLm9uSGFuZGxlVG91Y2hTdGFydCk7XG4gICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcihkb2N1bWVudCwgJ21vdXNlbW92ZScsIHRoaXMub25Eb2N1bWVudE1vdXNlTW92ZSk7XG4gICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcih0aGlzLndyYXBwZXIsICd0b3VjaG1vdmUnLCB0aGlzLm9uV3JhcHBlclRvdWNoTW92ZSk7XG4gICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcih0aGlzLndyYXBwZXIsICdtb3VzZWRvd24nLCB0aGlzLm9uV3JhcHBlck1vdXNlRG93bik7XG4gICAgcmVtb3ZlRXZlbnRMaXN0ZW5lcih0aGlzLndyYXBwZXIsICd0b3VjaHN0YXJ0JywgdGhpcy5vbldyYXBwZXJUb3VjaFN0YXJ0KTtcbiAgICByZW1vdmVFdmVudExpc3RlbmVyKGRvY3VtZW50LCAnbW91c2V1cCcsIHRoaXMub25Eb2N1bWVudE1vdXNlVXApO1xuICAgIHJlbW92ZUV2ZW50TGlzdGVuZXIoZG9jdW1lbnQsICd0b3VjaGVuZCcsIHRoaXMub25Eb2N1bWVudFRvdWNoRW5kKTtcbiAgICByZW1vdmVFdmVudExpc3RlbmVyKHRoaXMuaGFuZGxlLCAnY2xpY2snLCB0aGlzLm9uSGFuZGxlQ2xpY2spO1xuICAgIHJlbW92ZUV2ZW50TGlzdGVuZXIod2luZG93LCAncmVzaXplJywgdGhpcy5vbldpbmRvd1Jlc2l6ZSk7XG5cbiAgICBjbGVhckludGVydmFsKHRoaXMuaW50ZXJ2YWwpO1xuICB9LFxuICBvbkhhbmRsZU1vdXNlRG93bjogZnVuY3Rpb24oZSkge1xuICAgIEN1cnNvci5yZWZyZXNoKGUpO1xuICAgIHByZXZlbnRFdmVudERlZmF1bHRzKGUpO1xuICAgIHN0b3BFdmVudFByb3BhZ2F0aW9uKGUpO1xuICAgIHRoaXMuYWN0aXZpdHkgPSBmYWxzZTtcbiAgICB0aGlzLnN0YXJ0RHJhZygpO1xuICB9LFxuICBvbkhhbmRsZVRvdWNoU3RhcnQ6IGZ1bmN0aW9uKGUpIHtcbiAgICBDdXJzb3IucmVmcmVzaChlKTtcbiAgICAvLyBVbmxpa2UgaW4gdGhlIGBtb3VzZWRvd25gIGV2ZW50IGhhbmRsZXIsIHdlIGRvbid0IHByZXZlbnQgZGVmYXVsdHMgaGVyZSxcbiAgICAvLyBiZWNhdXNlIHRoaXMgd291bGQgZGlzYWJsZSB0aGUgZHJhZ2dpbmcgYWx0b2dldGhlci4gSW5zdGVhZCwgd2UgcHJldmVudFxuICAgIC8vIGl0IGluIHRoZSBgdG91Y2htb3ZlYCBoYW5kbGVyLiBSZWFkIG1vcmUgYWJvdXQgdG91Y2ggZXZlbnRzXG4gICAgLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvR3VpZGUvRXZlbnRzL1RvdWNoX2V2ZW50cyNIYW5kbGluZ19jbGlja3NcbiAgICBzdG9wRXZlbnRQcm9wYWdhdGlvbihlKTtcbiAgICB0aGlzLmFjdGl2aXR5ID0gZmFsc2U7XG4gICAgdGhpcy5zdGFydERyYWcoKTtcbiAgfSxcbiAgb25Eb2N1bWVudE1vdXNlTW92ZTogZnVuY3Rpb24oZSkge1xuICAgIEN1cnNvci5yZWZyZXNoKGUpO1xuICAgIGlmICh0aGlzLmRyYWdnaW5nKSB7XG4gICAgICB0aGlzLmFjdGl2aXR5ID0gdHJ1ZTtcbiAgICB9XG4gIH0sXG4gIG9uV3JhcHBlclRvdWNoTW92ZTogZnVuY3Rpb24oZSkge1xuICAgIEN1cnNvci5yZWZyZXNoKGUpO1xuICAgIC8vIERyYWdnaW5nIG9uIGEgZGlzYWJsZWQgYXhpcyAoaG9yaXpvbnRhbCBvciB2ZXJ0aWNhbCkgc2hvdWxkbid0IHByZXZlbnRcbiAgICAvLyBkZWZhdWx0cyBvbiB0b3VjaCBkZXZpY2VzLiAhdGhpcy5hY3Rpdml0eSBkZW5vdGVzIHRoaXMgaXMgdGhlIGZpcnN0IG1vdmVcbiAgICAvLyBpbnNpZGUgYSBkcmFnIGFjdGlvbjsgeW91IGNhbiBkcmFnIGluIGFueSBkaXJlY3Rpb24gYWZ0ZXIgdGhpcyBwb2ludCBpZlxuICAgIC8vIHRoZSBkcmFnZ2luZyB3YXNuJ3Qgc3RvcHBlZFxuICAgIGlmICghdGhpcy5hY3Rpdml0eSAmJiB0aGlzLmRyYWdnaW5nT25EaXNhYmxlZEF4aXMoKSkge1xuICAgICAgaWYgKHRoaXMuZHJhZ2dpbmcpIHtcbiAgICAgICAgdGhpcy5zdG9wRHJhZygpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBSZWFkIGNvbW1lbnQgaW4gYG9uSGFuZGxlVG91Y2hTdGFydGAgYWJvdmUsIHRvIHVuZGVyc3RhbmQgd2h5IHdlJ3JlXG4gICAgLy8gcHJldmVudGluZyBkZWZhdWx0cyBoZXJlIGFuZCBub3QgdGhlcmVcbiAgICBwcmV2ZW50RXZlbnREZWZhdWx0cyhlKTtcbiAgICB0aGlzLmFjdGl2aXR5ID0gdHJ1ZTtcbiAgfSxcbiAgb25XcmFwcGVyTW91c2VEb3duOiBmdW5jdGlvbihlKSB7XG4gICAgQ3Vyc29yLnJlZnJlc2goZSk7XG4gICAgcHJldmVudEV2ZW50RGVmYXVsdHMoZSk7XG4gICAgdGhpcy5zdGFydFRhcCgpO1xuICB9LFxuICBvbldyYXBwZXJUb3VjaFN0YXJ0OiBmdW5jdGlvbihlKSB7XG4gICAgQ3Vyc29yLnJlZnJlc2goZSk7XG4gICAgcHJldmVudEV2ZW50RGVmYXVsdHMoZSk7XG4gICAgdGhpcy5zdGFydFRhcCgpO1xuICB9LFxuICBvbkRvY3VtZW50TW91c2VVcDogZnVuY3Rpb24oZSkge1xuICAgIHRoaXMuc3RvcERyYWcoKTtcbiAgICB0aGlzLnN0b3BUYXAoKTtcbiAgfSxcbiAgb25Eb2N1bWVudFRvdWNoRW5kOiBmdW5jdGlvbihlKSB7XG4gICAgdGhpcy5zdG9wRHJhZygpO1xuICAgIHRoaXMuc3RvcFRhcCgpO1xuICB9LFxuICBvbkhhbmRsZUNsaWNrOiBmdW5jdGlvbihlKSB7XG4gICAgLy8gV2Uga2VlcCB0cmFjayBpZiBhbnkgZHJhZ2dpbmcgYWN0aXZpdHkgaGFzIGJlZW4gbWFkZSBiZXR3ZWVuIHRoZVxuICAgIC8vIG1vdXNlL3RvdWNoIGRvd24gYW5kIHVwIGV2ZW50czsgYmFzZWQgb24gdGhpcyB3ZSBhbGxvdyBvciBjYW5jZWwgYSBjbGlja1xuICAgIC8vIGV2ZW50IGZyb20gaW5zaWRlIHRoZSBoYW5kbGUuIGkuZS4gQ2xpY2sgZXZlbnRzIHNob3VsZG4ndCBiZSB0cmlnZ2VyZWRcbiAgICAvLyB3aGVuIGRyYWdnaW5nLCBidXQgc2hvdWxkIGJlIGFsbG93ZWQgd2hlbiBjbGlja2luZyBzdGlsbFxuICAgIGlmICh0aGlzLmFjdGl2aXR5KSB7XG4gICAgICBwcmV2ZW50RXZlbnREZWZhdWx0cyhlKTtcbiAgICAgIHN0b3BFdmVudFByb3BhZ2F0aW9uKGUpO1xuICAgIH1cbiAgfSxcbiAgb25XaW5kb3dSZXNpemU6IGZ1bmN0aW9uKGUpIHtcbiAgICB0aGlzLnJlZmxvdygpO1xuICB9LFxuICBlbmFibGU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZGlzYWJsZWQgPSBmYWxzZTtcbiAgICB0aGlzLmhhbmRsZS5jbGFzc05hbWUgPSB0aGlzLmhhbmRsZS5jbGFzc05hbWUucmVwbGFjZSgvXFxzP2Rpc2FibGVkL2csICcnKTtcbiAgfSxcbiAgZGlzYWJsZTogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5kaXNhYmxlZCA9IHRydWU7XG4gICAgdGhpcy5oYW5kbGUuY2xhc3NOYW1lICs9ICcgZGlzYWJsZWQnO1xuICB9LFxuICByZWZsb3c6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2V0V3JhcHBlck9mZnNldCgpO1xuICAgIHRoaXMuYm91bmRzID0gdGhpcy5jYWxjdWxhdGVCb3VuZHMoKTtcbiAgICB0aGlzLnZhbHVlUHJlY2lzaW9uID0gdGhpcy5jYWxjdWxhdGVWYWx1ZVByZWNpc2lvbigpO1xuICAgIHRoaXMudXBkYXRlT2Zmc2V0RnJvbVZhbHVlKCk7XG4gIH0sXG4gIGdldFN0ZXA6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBbXG4gICAgICB0aGlzLmdldFN0ZXBOdW1iZXIodGhpcy52YWx1ZS50YXJnZXRbMF0pLFxuICAgICAgdGhpcy5nZXRTdGVwTnVtYmVyKHRoaXMudmFsdWUudGFyZ2V0WzFdKVxuICAgIF07XG4gIH0sXG4gIGdldFZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy52YWx1ZS50YXJnZXQ7XG4gIH0sXG4gIHNldFN0ZXA6IGZ1bmN0aW9uKHgsIHksIHNuYXApIHtcbiAgICB0aGlzLnNldFZhbHVlKFxuICAgICAgdGhpcy5vcHRpb25zLnN0ZXBzICYmIHggPiAxID8gKHggLSAxKSAvICh0aGlzLm9wdGlvbnMuc3RlcHMgLSAxKSA6IDAsXG4gICAgICB0aGlzLm9wdGlvbnMuc3RlcHMgJiYgeSA+IDEgPyAoeSAtIDEpIC8gKHRoaXMub3B0aW9ucy5zdGVwcyAtIDEpIDogMCxcbiAgICAgIHNuYXBcbiAgICApO1xuICB9LFxuICBzZXRWYWx1ZTogZnVuY3Rpb24oeCwgeSwgc25hcCkge1xuICAgIHRoaXMuc2V0VGFyZ2V0VmFsdWUoW3gsIHkgfHwgMF0pO1xuICAgIGlmIChzbmFwKSB7XG4gICAgICB0aGlzLmdyb3VwQ29weSh0aGlzLnZhbHVlLmN1cnJlbnQsIHRoaXMudmFsdWUudGFyZ2V0KTtcbiAgICAgIC8vIFNpbmNlIHRoZSBjdXJyZW50IHZhbHVlIHdpbGwgYmUgZXF1YWwgdG8gdGhlIHRhcmdldCBvbmUgaW5zdGFudGx5LCB0aGVcbiAgICAgIC8vIGFuaW1hdGUgZnVuY3Rpb24gd29uJ3QgZ2V0IHRvIHJ1biBzbyB3ZSBuZWVkIHRvIHVwZGF0ZSB0aGUgcG9zaXRpb25zXG4gICAgICAvLyBhbmQgY2FsbCB0aGUgY2FsbGJhY2tzIG1hbnVhbGx5XG4gICAgICB0aGlzLnVwZGF0ZU9mZnNldEZyb21WYWx1ZSgpO1xuICAgICAgdGhpcy5jYWxsQW5pbWF0aW9uQ2FsbGJhY2soKTtcbiAgICB9XG4gIH0sXG4gIHN0YXJ0VGFwOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5kaXNhYmxlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnRhcHBpbmcgPSB0cnVlO1xuICAgIHRoaXMuc2V0V3JhcHBlck9mZnNldCgpO1xuXG4gICAgdGhpcy5zZXRUYXJnZXRWYWx1ZUJ5T2Zmc2V0KFtcbiAgICAgIEN1cnNvci54IC0gdGhpcy5vZmZzZXQud3JhcHBlclswXSAtICh0aGlzLmhhbmRsZS5vZmZzZXRXaWR0aCAvIDIpLFxuICAgICAgQ3Vyc29yLnkgLSB0aGlzLm9mZnNldC53cmFwcGVyWzFdIC0gKHRoaXMuaGFuZGxlLm9mZnNldEhlaWdodCAvIDIpXG4gICAgXSk7XG4gIH0sXG4gIHN0b3BUYXA6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmRpc2FibGVkIHx8ICF0aGlzLnRhcHBpbmcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy50YXBwaW5nID0gZmFsc2U7XG5cbiAgICB0aGlzLnNldFRhcmdldFZhbHVlKHRoaXMudmFsdWUuY3VycmVudCk7XG4gIH0sXG4gIHN0YXJ0RHJhZzogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuZGlzYWJsZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5kcmFnZ2luZyA9IHRydWU7XG4gICAgdGhpcy5zZXRXcmFwcGVyT2Zmc2V0KCk7XG5cbiAgICB0aGlzLm9mZnNldC5tb3VzZSA9IFtcbiAgICAgIEN1cnNvci54IC0gUG9zaXRpb24uZ2V0KHRoaXMuaGFuZGxlKVswXSxcbiAgICAgIEN1cnNvci55IC0gUG9zaXRpb24uZ2V0KHRoaXMuaGFuZGxlKVsxXVxuICAgIF07XG4gIH0sXG4gIHN0b3BEcmFnOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5kaXNhYmxlZCB8fCAhdGhpcy5kcmFnZ2luZykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmRyYWdnaW5nID0gZmFsc2U7XG5cbiAgICB2YXIgdGFyZ2V0ID0gdGhpcy5ncm91cENsb25lKHRoaXMudmFsdWUuY3VycmVudCk7XG4gICAgaWYgKHRoaXMub3B0aW9ucy5zbGlkZSkge1xuICAgICAgdmFyIHJhdGlvQ2hhbmdlID0gdGhpcy5jaGFuZ2U7XG4gICAgICB0YXJnZXRbMF0gKz0gcmF0aW9DaGFuZ2VbMF0gKiA0O1xuICAgICAgdGFyZ2V0WzFdICs9IHJhdGlvQ2hhbmdlWzFdICogNDtcbiAgICB9XG4gICAgdGhpcy5zZXRUYXJnZXRWYWx1ZSh0YXJnZXQpO1xuICB9LFxuICBjYWxsQW5pbWF0aW9uQ2FsbGJhY2s6IGZ1bmN0aW9uKCkge1xuICAgIHZhciB2YWx1ZSA9IHRoaXMudmFsdWUuY3VycmVudDtcbiAgICBpZiAodGhpcy5vcHRpb25zLnNuYXAgJiYgdGhpcy5vcHRpb25zLnN0ZXBzID4gMSkge1xuICAgICAgdmFsdWUgPSB0aGlzLmdldENsb3Nlc3RTdGVwcyh2YWx1ZSk7XG4gICAgfVxuICAgIGlmICghdGhpcy5ncm91cENvbXBhcmUodmFsdWUsIHRoaXMudmFsdWUucHJldikpIHtcbiAgICAgIGlmICh0eXBlb2YodGhpcy5vcHRpb25zLmFuaW1hdGlvbkNhbGxiYWNrKSA9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMub3B0aW9ucy5hbmltYXRpb25DYWxsYmFjay5jYWxsKHRoaXMsIHZhbHVlWzBdLCB2YWx1ZVsxXSk7XG4gICAgICB9XG4gICAgICB0aGlzLmdyb3VwQ29weSh0aGlzLnZhbHVlLnByZXYsIHZhbHVlKTtcbiAgICB9XG4gIH0sXG4gIGNhbGxUYXJnZXRDYWxsYmFjazogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHR5cGVvZih0aGlzLm9wdGlvbnMuY2FsbGJhY2spID09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMub3B0aW9ucy5jYWxsYmFjay5jYWxsKHRoaXMsIHRoaXMudmFsdWUudGFyZ2V0WzBdLCB0aGlzLnZhbHVlLnRhcmdldFsxXSk7XG4gICAgfVxuICB9LFxuICBhbmltYXRlOiBmdW5jdGlvbihkaXJlY3QsIGZpcnN0KSB7XG4gICAgaWYgKGRpcmVjdCAmJiAhdGhpcy5kcmFnZ2luZykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAodGhpcy5kcmFnZ2luZykge1xuICAgICAgdmFyIHByZXZUYXJnZXQgPSB0aGlzLmdyb3VwQ2xvbmUodGhpcy52YWx1ZS50YXJnZXQpO1xuXG4gICAgICB2YXIgb2Zmc2V0ID0gW1xuICAgICAgICBDdXJzb3IueCAtIHRoaXMub2Zmc2V0LndyYXBwZXJbMF0gLSB0aGlzLm9mZnNldC5tb3VzZVswXSxcbiAgICAgICAgQ3Vyc29yLnkgLSB0aGlzLm9mZnNldC53cmFwcGVyWzFdIC0gdGhpcy5vZmZzZXQubW91c2VbMV1cbiAgICAgIF07XG4gICAgICB0aGlzLnNldFRhcmdldFZhbHVlQnlPZmZzZXQob2Zmc2V0LCB0aGlzLm9wdGlvbnMubG9vc2UpO1xuXG4gICAgICB0aGlzLmNoYW5nZSA9IFtcbiAgICAgICAgdGhpcy52YWx1ZS50YXJnZXRbMF0gLSBwcmV2VGFyZ2V0WzBdLFxuICAgICAgICB0aGlzLnZhbHVlLnRhcmdldFsxXSAtIHByZXZUYXJnZXRbMV1cbiAgICAgIF07XG4gICAgfVxuICAgIGlmICh0aGlzLmRyYWdnaW5nIHx8IGZpcnN0KSB7XG4gICAgICB0aGlzLmdyb3VwQ29weSh0aGlzLnZhbHVlLmN1cnJlbnQsIHRoaXMudmFsdWUudGFyZ2V0KTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZHJhZ2dpbmcgfHwgdGhpcy5nbGlkZSgpIHx8IGZpcnN0KSB7XG4gICAgICB0aGlzLnVwZGF0ZU9mZnNldEZyb21WYWx1ZSgpO1xuICAgICAgdGhpcy5jYWxsQW5pbWF0aW9uQ2FsbGJhY2soKTtcbiAgICB9XG4gIH0sXG4gIGdsaWRlOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgZGlmZiA9IFtcbiAgICAgIHRoaXMudmFsdWUudGFyZ2V0WzBdIC0gdGhpcy52YWx1ZS5jdXJyZW50WzBdLFxuICAgICAgdGhpcy52YWx1ZS50YXJnZXRbMV0gLSB0aGlzLnZhbHVlLmN1cnJlbnRbMV1cbiAgICBdO1xuICAgIGlmICghZGlmZlswXSAmJiAhZGlmZlsxXSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoTWF0aC5hYnMoZGlmZlswXSkgPiB0aGlzLnZhbHVlUHJlY2lzaW9uWzBdIHx8XG4gICAgICAgIE1hdGguYWJzKGRpZmZbMV0pID4gdGhpcy52YWx1ZVByZWNpc2lvblsxXSkge1xuICAgICAgdGhpcy52YWx1ZS5jdXJyZW50WzBdICs9IGRpZmZbMF0gKiB0aGlzLm9wdGlvbnMuc3BlZWQ7XG4gICAgICB0aGlzLnZhbHVlLmN1cnJlbnRbMV0gKz0gZGlmZlsxXSAqIHRoaXMub3B0aW9ucy5zcGVlZDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5ncm91cENvcHkodGhpcy52YWx1ZS5jdXJyZW50LCB0aGlzLnZhbHVlLnRhcmdldCk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9LFxuICB1cGRhdGVPZmZzZXRGcm9tVmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5vcHRpb25zLnNuYXApIHtcbiAgICAgIHRoaXMub2Zmc2V0LmN1cnJlbnQgPSB0aGlzLmdldE9mZnNldHNCeVJhdGlvcyh0aGlzLnZhbHVlLmN1cnJlbnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLm9mZnNldC5jdXJyZW50ID0gdGhpcy5nZXRPZmZzZXRzQnlSYXRpb3MoXG4gICAgICAgIHRoaXMuZ2V0Q2xvc2VzdFN0ZXBzKHRoaXMudmFsdWUuY3VycmVudClcbiAgICAgICk7XG4gICAgfVxuICAgIGlmICghdGhpcy5ncm91cENvbXBhcmUodGhpcy5vZmZzZXQuY3VycmVudCwgdGhpcy5vZmZzZXQucHJldikpIHtcbiAgICAgIHRoaXMucmVuZGVySGFuZGxlUG9zaXRpb24oKTtcbiAgICAgIHRoaXMuZ3JvdXBDb3B5KHRoaXMub2Zmc2V0LnByZXYsIHRoaXMub2Zmc2V0LmN1cnJlbnQpO1xuICAgIH1cbiAgfSxcbiAgcmVuZGVySGFuZGxlUG9zaXRpb246IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMuaG9yaXpvbnRhbCkge1xuICAgICAgdGhpcy5oYW5kbGUuc3R5bGUubGVmdCA9IFN0cmluZyh0aGlzLm9mZnNldC5jdXJyZW50WzBdKSArICdweCc7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMudmVydGljYWwpIHtcbiAgICAgIHRoaXMuaGFuZGxlLnN0eWxlLnRvcCA9IFN0cmluZyh0aGlzLm9mZnNldC5jdXJyZW50WzFdKSArICdweCc7XG4gICAgfVxuICB9LFxuICBzZXRUYXJnZXRWYWx1ZTogZnVuY3Rpb24odmFsdWUsIGxvb3NlKSB7XG4gICAgdmFyIHRhcmdldCA9IGxvb3NlID8gdGhpcy5nZXRMb29zZVZhbHVlKHZhbHVlKSA6IHRoaXMuZ2V0UHJvcGVyVmFsdWUodmFsdWUpO1xuXG4gICAgdGhpcy5ncm91cENvcHkodGhpcy52YWx1ZS50YXJnZXQsIHRhcmdldCk7XG4gICAgdGhpcy5vZmZzZXQudGFyZ2V0ID0gdGhpcy5nZXRPZmZzZXRzQnlSYXRpb3ModGFyZ2V0KTtcblxuICAgIHRoaXMuY2FsbFRhcmdldENhbGxiYWNrKCk7XG4gIH0sXG4gIHNldFRhcmdldFZhbHVlQnlPZmZzZXQ6IGZ1bmN0aW9uKG9mZnNldCwgbG9vc2UpIHtcbiAgICB2YXIgdmFsdWUgPSB0aGlzLmdldFJhdGlvc0J5T2Zmc2V0cyhvZmZzZXQpO1xuICAgIHZhciB0YXJnZXQgPSBsb29zZSA/IHRoaXMuZ2V0TG9vc2VWYWx1ZSh2YWx1ZSkgOiB0aGlzLmdldFByb3BlclZhbHVlKHZhbHVlKTtcblxuICAgIHRoaXMuZ3JvdXBDb3B5KHRoaXMudmFsdWUudGFyZ2V0LCB0YXJnZXQpO1xuICAgIHRoaXMub2Zmc2V0LnRhcmdldCA9IHRoaXMuZ2V0T2Zmc2V0c0J5UmF0aW9zKHRhcmdldCk7XG4gIH0sXG4gIGdldExvb3NlVmFsdWU6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdmFyIHByb3BlciA9IHRoaXMuZ2V0UHJvcGVyVmFsdWUodmFsdWUpO1xuICAgIHJldHVybiBbXG4gICAgICBwcm9wZXJbMF0gKyAoKHZhbHVlWzBdIC0gcHJvcGVyWzBdKSAvIDQpLFxuICAgICAgcHJvcGVyWzFdICsgKCh2YWx1ZVsxXSAtIHByb3BlclsxXSkgLyA0KVxuICAgIF07XG4gIH0sXG4gIGdldFByb3BlclZhbHVlOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHZhciBwcm9wZXIgPSB0aGlzLmdyb3VwQ2xvbmUodmFsdWUpO1xuXG4gICAgcHJvcGVyWzBdID0gTWF0aC5tYXgocHJvcGVyWzBdLCAwKTtcbiAgICBwcm9wZXJbMV0gPSBNYXRoLm1heChwcm9wZXJbMV0sIDApO1xuICAgIHByb3BlclswXSA9IE1hdGgubWluKHByb3BlclswXSwgMSk7XG4gICAgcHJvcGVyWzFdID0gTWF0aC5taW4ocHJvcGVyWzFdLCAxKTtcblxuICAgIGlmICgoIXRoaXMuZHJhZ2dpbmcgJiYgIXRoaXMudGFwcGluZykgfHwgdGhpcy5vcHRpb25zLnNuYXApIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuc3RlcHMgPiAxKSB7XG4gICAgICAgIHByb3BlciA9IHRoaXMuZ2V0Q2xvc2VzdFN0ZXBzKHByb3Blcik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwcm9wZXI7XG4gIH0sXG4gIGdldFJhdGlvc0J5T2Zmc2V0czogZnVuY3Rpb24oZ3JvdXApIHtcbiAgICByZXR1cm4gW1xuICAgICAgdGhpcy5nZXRSYXRpb0J5T2Zmc2V0KGdyb3VwWzBdLCB0aGlzLmJvdW5kcy5hdmFpbFdpZHRoLCB0aGlzLmJvdW5kcy5sZWZ0KSxcbiAgICAgIHRoaXMuZ2V0UmF0aW9CeU9mZnNldChncm91cFsxXSwgdGhpcy5ib3VuZHMuYXZhaWxIZWlnaHQsIHRoaXMuYm91bmRzLnRvcClcbiAgICBdO1xuICB9LFxuICBnZXRSYXRpb0J5T2Zmc2V0OiBmdW5jdGlvbihvZmZzZXQsIHJhbmdlLCBwYWRkaW5nKSB7XG4gICAgcmV0dXJuIHJhbmdlID8gKG9mZnNldCAtIHBhZGRpbmcpIC8gcmFuZ2UgOiAwO1xuICB9LFxuICBnZXRPZmZzZXRzQnlSYXRpb3M6IGZ1bmN0aW9uKGdyb3VwKSB7XG4gICAgcmV0dXJuIFtcbiAgICAgIHRoaXMuZ2V0T2Zmc2V0QnlSYXRpbyhncm91cFswXSwgdGhpcy5ib3VuZHMuYXZhaWxXaWR0aCwgdGhpcy5ib3VuZHMubGVmdCksXG4gICAgICB0aGlzLmdldE9mZnNldEJ5UmF0aW8oZ3JvdXBbMV0sIHRoaXMuYm91bmRzLmF2YWlsSGVpZ2h0LCB0aGlzLmJvdW5kcy50b3ApXG4gICAgXTtcbiAgfSxcbiAgZ2V0T2Zmc2V0QnlSYXRpbzogZnVuY3Rpb24ocmF0aW8sIHJhbmdlLCBwYWRkaW5nKSB7XG4gICAgcmV0dXJuIE1hdGgucm91bmQocmF0aW8gKiByYW5nZSkgKyBwYWRkaW5nO1xuICB9LFxuICBnZXRTdGVwTnVtYmVyOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIC8vIFRyYW5zbGF0ZSBhIFswLTFdIHZhbHVlIGludG8gYSBudW1iZXIgZnJvbSAxIHRvIE4gc3RlcHMgKHNldCB1c2luZyB0aGVcbiAgICAvLyBcInN0ZXBzXCIgb3B0aW9uKVxuICAgIHJldHVybiB0aGlzLmdldENsb3Nlc3RTdGVwKHZhbHVlKSAqICh0aGlzLm9wdGlvbnMuc3RlcHMgLSAxKSArIDE7XG4gIH0sXG4gIGdldENsb3Nlc3RTdGVwczogZnVuY3Rpb24oZ3JvdXApIHtcbiAgICByZXR1cm4gW1xuICAgICAgdGhpcy5nZXRDbG9zZXN0U3RlcChncm91cFswXSksXG4gICAgICB0aGlzLmdldENsb3Nlc3RTdGVwKGdyb3VwWzFdKVxuICAgIF07XG4gIH0sXG4gIGdldENsb3Nlc3RTdGVwOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHZhciBrID0gMDtcbiAgICB2YXIgbWluID0gMTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8PSB0aGlzLm9wdGlvbnMuc3RlcHMgLSAxOyBpKyspIHtcbiAgICAgIGlmIChNYXRoLmFicyh0aGlzLnN0ZXBSYXRpb3NbaV0gLSB2YWx1ZSkgPCBtaW4pIHtcbiAgICAgICAgbWluID0gTWF0aC5hYnModGhpcy5zdGVwUmF0aW9zW2ldIC0gdmFsdWUpO1xuICAgICAgICBrID0gaTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuc3RlcFJhdGlvc1trXTtcbiAgfSxcbiAgZ3JvdXBDb21wYXJlOiBmdW5jdGlvbihhLCBiKSB7XG4gICAgcmV0dXJuIGFbMF0gPT0gYlswXSAmJiBhWzFdID09IGJbMV07XG4gIH0sXG4gIGdyb3VwQ29weTogZnVuY3Rpb24oYSwgYikge1xuICAgIGFbMF0gPSBiWzBdO1xuICAgIGFbMV0gPSBiWzFdO1xuICB9LFxuICBncm91cENsb25lOiBmdW5jdGlvbihhKSB7XG4gICAgcmV0dXJuIFthWzBdLCBhWzFdXTtcbiAgfSxcbiAgZHJhZ2dpbmdPbkRpc2FibGVkQXhpczogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICghdGhpcy5vcHRpb25zLmhvcml6b250YWwgJiYgQ3Vyc29yLnhEaWZmID4gQ3Vyc29yLnlEaWZmKSB8fFxuICAgICAgICAgICAoIXRoaXMub3B0aW9ucy52ZXJ0aWNhbCAmJiBDdXJzb3IueURpZmYgPiBDdXJzb3IueERpZmYpO1xuICB9XG59O1xuXG5cbnZhciBiaW5kID0gZnVuY3Rpb24oZm4sIGNvbnRleHQpIHtcbiAgLyoqXG4gICAqIENvZmZlZVNjcmlwdC1saWtlIGZ1bmN0aW9uIHRvIGJpbmQgdGhlIHNjb3BlIG9mIGEgbWV0aG9kIHRvIGFuIGluc3RhbmNlLFxuICAgKiB0aGUgY29udGV4dCBvZiB0aGF0IG1ldGhvZCwgcmVnYXJkbGVzcyBmcm9tIHdoZXJlIGl0IGlzIGNhbGxlZFxuICAgKi9cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBmbi5hcHBseShjb250ZXh0LCBhcmd1bWVudHMpO1xuICB9O1xufTtcblxuLy8gQ3Jvc3MtYnJvd3NlciB2YW5pbGxhIEpTIGV2ZW50IGhhbmRsaW5nXG5cbnZhciBhZGRFdmVudExpc3RlbmVyID0gZnVuY3Rpb24oZWxlbWVudCwgdHlwZSwgY2FsbGJhY2spIHtcbiAgaWYgKGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcikge1xuICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBjYWxsYmFjaywgZmFsc2UpO1xuICB9IGVsc2UgaWYgKGVsZW1lbnQuYXR0YWNoRXZlbnQpIHtcbiAgICBlbGVtZW50LmF0dGFjaEV2ZW50KCdvbicgKyB0eXBlLCBjYWxsYmFjayk7XG4gIH1cbn07XG5cbnZhciByZW1vdmVFdmVudExpc3RlbmVyID0gZnVuY3Rpb24oZWxlbWVudCwgdHlwZSwgY2FsbGJhY2spIHtcbiAgaWYgKGVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcikge1xuICAgIGVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBjYWxsYmFjaywgZmFsc2UpO1xuICB9IGVsc2UgaWYgKGVsZW1lbnQuZGV0YWNoRXZlbnQpIHtcbiAgICBlbGVtZW50LmRldGFjaEV2ZW50KCdvbicgKyB0eXBlLCBjYWxsYmFjayk7XG4gIH1cbn07XG5cbnZhciBwcmV2ZW50RXZlbnREZWZhdWx0cyA9IGZ1bmN0aW9uKGUpIHtcbiAgaWYgKCFlKSB7XG4gICAgZSA9IHdpbmRvdy5ldmVudDtcbiAgfVxuICBpZiAoZS5wcmV2ZW50RGVmYXVsdCkge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgfVxuICBlLnJldHVyblZhbHVlID0gZmFsc2U7XG59O1xuXG52YXIgc3RvcEV2ZW50UHJvcGFnYXRpb24gPSBmdW5jdGlvbihlKSB7XG4gIGlmICghZSkge1xuICAgIGUgPSB3aW5kb3cuZXZlbnQ7XG4gIH1cbiAgaWYgKGUuc3RvcFByb3BhZ2F0aW9uKSB7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgfVxuICBlLmNhbmNlbEJ1YmJsZSA9IHRydWU7XG59O1xuXG5cbnZhciBDdXJzb3IgPSB7XG4gIC8qKlxuICAgKiBBYnN0cmFjdGlvbiBmb3IgbWFraW5nIHRoZSBjb21iaW5lZCBtb3VzZSBvciB0b3VjaCBwb3NpdGlvbiBhdmFpbGFibGUgYXRcbiAgICogYW55IHRpbWUuXG4gICAqXG4gICAqIEl0IHBpY2tzIHVwIHRoZSBcIm1vdmVcIiBldmVudHMgYXMgYW4gaW5kZXBlbmRlbnQgY29tcG9uZW50IGFuZCBzaW1wbHkgbWFrZXNcbiAgICogdGhlIGxhdGVzdCB4IGFuZCB5IG1vdXNlL3RvdWNoIHBvc2l0aW9uIG9mIHRoZSB1c2VyIGF2YWlsYWJsZSBhdCBhbnkgdGltZSxcbiAgICogd2hpY2ggaXMgcmVxdWVzdGVkIHdpdGggQ3Vyc29yLnggYW5kIEN1cnNvci55IHJlc3BlY3RpdmVseS5cbiAgICpcbiAgICogSXQgY2FuIHJlY2VpdmUgYm90aCBtb3VzZSBhbmQgdG91Y2ggZXZlbnRzIGNvbnNlY3V0aXZlbHksIGV4dHJhY3RpbmcgdGhlXG4gICAqIHJlbGV2YW50IG1ldGEgZGF0YSBmcm9tIGVhY2ggdHlwZSBvZiBldmVudC5cbiAgICpcbiAgICogQ3Vyc29yLnJlZnJlc2goZSkgaXMgY2FsbGVkIHRvIHVwZGF0ZSB0aGUgZ2xvYmFsIHggYW5kIHkgdmFsdWVzLCB3aXRoIGFcbiAgICogZ2VudWluZSBNb3VzZUV2ZW50IG9yIGEgVG91Y2hFdmVudCBmcm9tIGFuIGV2ZW50IGxpc3RlbmVyLCBlLmcuXG4gICAqIG1vdXNlZG93bi91cCBvciB0b3VjaHN0YXJ0L2VuZFxuICAgKi9cbiAgeDogMCxcbiAgeTogMCxcbiAgeERpZmY6IDAsXG4gIHlEaWZmOiAwLFxuICByZWZyZXNoOiBmdW5jdGlvbihlKSB7XG4gICAgaWYgKCFlKSB7XG4gICAgICBlID0gd2luZG93LmV2ZW50O1xuICAgIH1cbiAgICBpZiAoZS50eXBlID09ICdtb3VzZW1vdmUnKSB7XG4gICAgICB0aGlzLnNldChlKTtcbiAgICB9IGVsc2UgaWYgKGUudG91Y2hlcykge1xuICAgICAgdGhpcy5zZXQoZS50b3VjaGVzWzBdKTtcbiAgICB9XG4gIH0sXG4gIHNldDogZnVuY3Rpb24oZSkge1xuICAgIHZhciBsYXN0WCA9IHRoaXMueCxcbiAgICAgICAgbGFzdFkgPSB0aGlzLnk7XG4gICAgaWYgKGUucGFnZVggfHwgZS5wYWdlWSkge1xuICAgICAgdGhpcy54ID0gZS5wYWdlWDtcbiAgICAgIHRoaXMueSA9IGUucGFnZVk7XG4gICAgfSBlbHNlIGlmIChlLmNsaWVudFggfHwgZS5jbGllbnRZKSB7XG4gICAgICB0aGlzLnggPSBlLmNsaWVudFggKyBkb2N1bWVudC5ib2R5LnNjcm9sbExlZnQgKyBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsTGVmdDtcbiAgICAgIHRoaXMueSA9IGUuY2xpZW50WSArIGRvY3VtZW50LmJvZHkuc2Nyb2xsVG9wICsgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcDtcbiAgICB9XG4gICAgdGhpcy54RGlmZiA9IE1hdGguYWJzKHRoaXMueCAtIGxhc3RYKTtcbiAgICB0aGlzLnlEaWZmID0gTWF0aC5hYnModGhpcy55IC0gbGFzdFkpO1xuICB9XG59O1xuXG5cbnZhciBQb3NpdGlvbiA9IHtcbiAgLyoqXG4gICAqIEhlbHBlciBmb3IgZXh0cmFjdGluZyB0aGUgYWJzb2x1dGUgcG9zaXRpb24gb2YgYSBET00gZWxlbWVudCwgcmVsYXRpdmUgdG9cbiAgICogdGhlIHJvb3QtbGV2ZWwgZG9jdW1lbnQgYm9keS5cbiAgICpcbiAgICogVGhlIGdldChvYmopIG1ldGhvZCBhY2NlcHRzIGEgRE9NIGVsZW1lbnQgYXMgdGhlIG9ubHkgcGFyYW1ldGVyLCBhbmRcbiAgICogcmV0dXJucyB0aGUgcG9zaXRpb24gdW5kZXIgYSAoeCwgeSkgdHVwbGUsIGFzIGFuIGFycmF5IHdpdGggdHdvIGVsZW1lbnRzLlxuICAgKlxuICAgKiBJbnNwaXJlZCBmcm9tIGh0dHA6Ly93d3cucXVpcmtzbW9kZS5vcmcvanMvZmluZHBvcy5odG1sXG4gICAqL1xuICBnZXQ6IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBjdXJsZWZ0ID0gMCxcbiAgICAgICAgY3VydG9wID0gMDtcbiAgICBpZiAob2JqLm9mZnNldFBhcmVudCkge1xuICAgICAgZG8ge1xuICAgICAgICBjdXJsZWZ0ICs9IG9iai5vZmZzZXRMZWZ0O1xuICAgICAgICBjdXJ0b3AgKz0gb2JqLm9mZnNldFRvcDtcbiAgICAgIH1cbiAgICAgIHdoaWxlICgob2JqID0gb2JqLm9mZnNldFBhcmVudCkpO1xuICAgIH1cbiAgICByZXR1cm4gW2N1cmxlZnQsIGN1cnRvcF07XG4gIH1cbn07XG5cbnJldHVybiBEcmFnZGVhbGVyO1xuXG59KSk7XG4iLCJ2YXIgc3BsaXQgPSByZXF1aXJlKCdicm93c2VyLXNwbGl0JylcbnZhciBDbGFzc0xpc3QgPSByZXF1aXJlKCdjbGFzcy1saXN0JylcbnZhciBEYXRhU2V0ID0gcmVxdWlyZSgnZGF0YS1zZXQnKVxucmVxdWlyZSgnaHRtbC1lbGVtZW50JylcblxuZnVuY3Rpb24gY29udGV4dCAoKSB7XG5cbiAgdmFyIGNsZWFudXBGdW5jcyA9IFtdXG5cbiAgZnVuY3Rpb24gaCgpIHtcbiAgICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKSwgZSA9IG51bGxcbiAgICBmdW5jdGlvbiBpdGVtIChsKSB7XG4gICAgICB2YXIgclxuICAgICAgZnVuY3Rpb24gcGFyc2VDbGFzcyAoc3RyaW5nKSB7XG4gICAgICAgIHZhciBtID0gc3BsaXQoc3RyaW5nLCAvKFtcXC4jXT9bYS16QS1aMC05XzotXSspLylcbiAgICAgICAgaWYoL15cXC58Iy8udGVzdChtWzFdKSlcbiAgICAgICAgICBlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcbiAgICAgICAgZm9yRWFjaChtLCBmdW5jdGlvbiAodikge1xuICAgICAgICAgIHZhciBzID0gdi5zdWJzdHJpbmcoMSx2Lmxlbmd0aClcbiAgICAgICAgICBpZighdikgcmV0dXJuXG4gICAgICAgICAgaWYoIWUpXG4gICAgICAgICAgICBlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh2KVxuICAgICAgICAgIGVsc2UgaWYgKHZbMF0gPT09ICcuJylcbiAgICAgICAgICAgIENsYXNzTGlzdChlKS5hZGQocylcbiAgICAgICAgICBlbHNlIGlmICh2WzBdID09PSAnIycpXG4gICAgICAgICAgICBlLnNldEF0dHJpYnV0ZSgnaWQnLCBzKVxuICAgICAgICB9KVxuICAgICAgfVxuXG4gICAgICBpZihsID09IG51bGwpXG4gICAgICAgIDtcbiAgICAgIGVsc2UgaWYoJ3N0cmluZycgPT09IHR5cGVvZiBsKSB7XG4gICAgICAgIGlmKCFlKVxuICAgICAgICAgIHBhcnNlQ2xhc3MobClcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGUuYXBwZW5kQ2hpbGQociA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGwpKVxuICAgICAgfVxuICAgICAgZWxzZSBpZignbnVtYmVyJyA9PT0gdHlwZW9mIGxcbiAgICAgICAgfHwgJ2Jvb2xlYW4nID09PSB0eXBlb2YgbFxuICAgICAgICB8fCBsIGluc3RhbmNlb2YgRGF0ZVxuICAgICAgICB8fCBsIGluc3RhbmNlb2YgUmVnRXhwICkge1xuICAgICAgICAgIGUuYXBwZW5kQ2hpbGQociA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGwudG9TdHJpbmcoKSkpXG4gICAgICB9XG4gICAgICAvL3RoZXJlIG1pZ2h0IGJlIGEgYmV0dGVyIHdheSB0byBoYW5kbGUgdGhpcy4uLlxuICAgICAgZWxzZSBpZiAoaXNBcnJheShsKSlcbiAgICAgICAgZm9yRWFjaChsLCBpdGVtKVxuICAgICAgZWxzZSBpZihpc05vZGUobCkpXG4gICAgICAgIGUuYXBwZW5kQ2hpbGQociA9IGwpXG4gICAgICBlbHNlIGlmKGwgaW5zdGFuY2VvZiBUZXh0KVxuICAgICAgICBlLmFwcGVuZENoaWxkKHIgPSBsKVxuICAgICAgZWxzZSBpZiAoJ29iamVjdCcgPT09IHR5cGVvZiBsKSB7XG4gICAgICAgIGZvciAodmFyIGsgaW4gbCkge1xuICAgICAgICAgIGlmKCdmdW5jdGlvbicgPT09IHR5cGVvZiBsW2tdKSB7XG4gICAgICAgICAgICBpZigvXm9uXFx3Ky8udGVzdChrKSkge1xuICAgICAgICAgICAgICBpZiAoZS5hZGRFdmVudExpc3RlbmVyKXtcbiAgICAgICAgICAgICAgICBlLmFkZEV2ZW50TGlzdGVuZXIoay5zdWJzdHJpbmcoMiksIGxba10sIGZhbHNlKVxuICAgICAgICAgICAgICAgIGNsZWFudXBGdW5jcy5wdXNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgICBlLnJlbW92ZUV2ZW50TGlzdGVuZXIoay5zdWJzdHJpbmcoMiksIGxba10sIGZhbHNlKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICAgIGUuYXR0YWNoRXZlbnQoaywgbFtrXSlcbiAgICAgICAgICAgICAgICBjbGVhbnVwRnVuY3MucHVzaChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgZS5kZXRhY2hFdmVudChrLCBsW2tdKVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIG9ic2VydmFibGVcbiAgICAgICAgICAgICAgZVtrXSA9IGxba10oKVxuICAgICAgICAgICAgICBjbGVhbnVwRnVuY3MucHVzaChsW2tdKGZ1bmN0aW9uICh2KSB7XG4gICAgICAgICAgICAgICAgZVtrXSA9IHZcbiAgICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgaWYoayA9PT0gJ3N0eWxlJykge1xuICAgICAgICAgICAgaWYoJ3N0cmluZycgPT09IHR5cGVvZiBsW2tdKSB7XG4gICAgICAgICAgICAgIGUuc3R5bGUuY3NzVGV4dCA9IGxba11cbiAgICAgICAgICAgIH1lbHNle1xuICAgICAgICAgICAgICBmb3IgKHZhciBzIGluIGxba10pIChmdW5jdGlvbihzLCB2KSB7XG4gICAgICAgICAgICAgICAgaWYoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHYpIHtcbiAgICAgICAgICAgICAgICAgIC8vIG9ic2VydmFibGVcbiAgICAgICAgICAgICAgICAgIGUuc3R5bGUuc2V0UHJvcGVydHkocywgdigpKVxuICAgICAgICAgICAgICAgICAgY2xlYW51cEZ1bmNzLnB1c2godihmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIGUuc3R5bGUuc2V0UHJvcGVydHkocywgdmFsKVxuICAgICAgICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICAgICAgICBlLnN0eWxlLnNldFByb3BlcnR5KHMsIGxba11bc10pXG4gICAgICAgICAgICAgIH0pKHMsIGxba11bc10pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmIChrLnN1YnN0cigwLCA1KSA9PT0gXCJkYXRhLVwiKSB7XG4gICAgICAgICAgICBEYXRhU2V0KGUpW2suc3Vic3RyKDUpXSA9IGxba11cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZVtrXSA9IGxba11cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGwpIHtcbiAgICAgICAgLy9hc3N1bWUgaXQncyBhbiBvYnNlcnZhYmxlIVxuICAgICAgICB2YXIgdiA9IGwoKVxuICAgICAgICBlLmFwcGVuZENoaWxkKHIgPSBpc05vZGUodikgPyB2IDogZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUodikpXG5cbiAgICAgICAgY2xlYW51cEZ1bmNzLnB1c2gobChmdW5jdGlvbiAodikge1xuICAgICAgICAgIGlmKGlzTm9kZSh2KSAmJiByLnBhcmVudEVsZW1lbnQpXG4gICAgICAgICAgICByLnBhcmVudEVsZW1lbnQucmVwbGFjZUNoaWxkKHYsIHIpLCByID0gdlxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHIudGV4dENvbnRlbnQgPSB2XG4gICAgICAgIH0pKVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gclxuICAgIH1cbiAgICB3aGlsZShhcmdzLmxlbmd0aClcbiAgICAgIGl0ZW0oYXJncy5zaGlmdCgpKVxuXG4gICAgcmV0dXJuIGVcbiAgfVxuXG4gIGguY2xlYW51cCA9IGZ1bmN0aW9uICgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNsZWFudXBGdW5jcy5sZW5ndGg7IGkrKyl7XG4gICAgICBjbGVhbnVwRnVuY3NbaV0oKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBoXG59XG5cbnZhciBoID0gbW9kdWxlLmV4cG9ydHMgPSBjb250ZXh0KClcbmguY29udGV4dCA9IGNvbnRleHRcblxuZnVuY3Rpb24gaXNOb2RlIChlbCkge1xuICByZXR1cm4gZWwgJiYgZWwubm9kZU5hbWUgJiYgZWwubm9kZVR5cGVcbn1cblxuZnVuY3Rpb24gaXNUZXh0IChlbCkge1xuICByZXR1cm4gZWwgJiYgZWwubm9kZU5hbWUgPT09ICcjdGV4dCcgJiYgZWwubm9kZVR5cGUgPT0gM1xufVxuXG5mdW5jdGlvbiBmb3JFYWNoIChhcnIsIGZuKSB7XG4gIGlmIChhcnIuZm9yRWFjaCkgcmV0dXJuIGFyci5mb3JFYWNoKGZuKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykgZm4oYXJyW2ldLCBpKVxufVxuXG5mdW5jdGlvbiBpc0FycmF5IChhcnIpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhcnIpID09ICdbb2JqZWN0IEFycmF5XSdcbn1cbiIsIi8qIVxuICogQ3Jvc3MtQnJvd3NlciBTcGxpdCAxLjEuMVxuICogQ29weXJpZ2h0IDIwMDctMjAxMiBTdGV2ZW4gTGV2aXRoYW4gPHN0ZXZlbmxldml0aGFuLmNvbT5cbiAqIEF2YWlsYWJsZSB1bmRlciB0aGUgTUlUIExpY2Vuc2VcbiAqIEVDTUFTY3JpcHQgY29tcGxpYW50LCB1bmlmb3JtIGNyb3NzLWJyb3dzZXIgc3BsaXQgbWV0aG9kXG4gKi9cblxuLyoqXG4gKiBTcGxpdHMgYSBzdHJpbmcgaW50byBhbiBhcnJheSBvZiBzdHJpbmdzIHVzaW5nIGEgcmVnZXggb3Igc3RyaW5nIHNlcGFyYXRvci4gTWF0Y2hlcyBvZiB0aGVcbiAqIHNlcGFyYXRvciBhcmUgbm90IGluY2x1ZGVkIGluIHRoZSByZXN1bHQgYXJyYXkuIEhvd2V2ZXIsIGlmIGBzZXBhcmF0b3JgIGlzIGEgcmVnZXggdGhhdCBjb250YWluc1xuICogY2FwdHVyaW5nIGdyb3VwcywgYmFja3JlZmVyZW5jZXMgYXJlIHNwbGljZWQgaW50byB0aGUgcmVzdWx0IGVhY2ggdGltZSBgc2VwYXJhdG9yYCBpcyBtYXRjaGVkLlxuICogRml4ZXMgYnJvd3NlciBidWdzIGNvbXBhcmVkIHRvIHRoZSBuYXRpdmUgYFN0cmluZy5wcm90b3R5cGUuc3BsaXRgIGFuZCBjYW4gYmUgdXNlZCByZWxpYWJseVxuICogY3Jvc3MtYnJvd3Nlci5cbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHIgU3RyaW5nIHRvIHNwbGl0LlxuICogQHBhcmFtIHtSZWdFeHB8U3RyaW5nfSBzZXBhcmF0b3IgUmVnZXggb3Igc3RyaW5nIHRvIHVzZSBmb3Igc2VwYXJhdGluZyB0aGUgc3RyaW5nLlxuICogQHBhcmFtIHtOdW1iZXJ9IFtsaW1pdF0gTWF4aW11bSBudW1iZXIgb2YgaXRlbXMgdG8gaW5jbHVkZSBpbiB0aGUgcmVzdWx0IGFycmF5LlxuICogQHJldHVybnMge0FycmF5fSBBcnJheSBvZiBzdWJzdHJpbmdzLlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBCYXNpYyB1c2VcbiAqIHNwbGl0KCdhIGIgYyBkJywgJyAnKTtcbiAqIC8vIC0+IFsnYScsICdiJywgJ2MnLCAnZCddXG4gKlxuICogLy8gV2l0aCBsaW1pdFxuICogc3BsaXQoJ2EgYiBjIGQnLCAnICcsIDIpO1xuICogLy8gLT4gWydhJywgJ2InXVxuICpcbiAqIC8vIEJhY2tyZWZlcmVuY2VzIGluIHJlc3VsdCBhcnJheVxuICogc3BsaXQoJy4ud29yZDEgd29yZDIuLicsIC8oW2Etel0rKShcXGQrKS9pKTtcbiAqIC8vIC0+IFsnLi4nLCAnd29yZCcsICcxJywgJyAnLCAnd29yZCcsICcyJywgJy4uJ11cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24gc3BsaXQodW5kZWYpIHtcblxuICB2YXIgbmF0aXZlU3BsaXQgPSBTdHJpbmcucHJvdG90eXBlLnNwbGl0LFxuICAgIGNvbXBsaWFudEV4ZWNOcGNnID0gLygpPz8vLmV4ZWMoXCJcIilbMV0gPT09IHVuZGVmLFxuICAgIC8vIE5QQ0c6IG5vbnBhcnRpY2lwYXRpbmcgY2FwdHVyaW5nIGdyb3VwXG4gICAgc2VsZjtcblxuICBzZWxmID0gZnVuY3Rpb24oc3RyLCBzZXBhcmF0b3IsIGxpbWl0KSB7XG4gICAgLy8gSWYgYHNlcGFyYXRvcmAgaXMgbm90IGEgcmVnZXgsIHVzZSBgbmF0aXZlU3BsaXRgXG4gICAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChzZXBhcmF0b3IpICE9PSBcIltvYmplY3QgUmVnRXhwXVwiKSB7XG4gICAgICByZXR1cm4gbmF0aXZlU3BsaXQuY2FsbChzdHIsIHNlcGFyYXRvciwgbGltaXQpO1xuICAgIH1cbiAgICB2YXIgb3V0cHV0ID0gW10sXG4gICAgICBmbGFncyA9IChzZXBhcmF0b3IuaWdub3JlQ2FzZSA/IFwiaVwiIDogXCJcIikgKyAoc2VwYXJhdG9yLm11bHRpbGluZSA/IFwibVwiIDogXCJcIikgKyAoc2VwYXJhdG9yLmV4dGVuZGVkID8gXCJ4XCIgOiBcIlwiKSArIC8vIFByb3Bvc2VkIGZvciBFUzZcbiAgICAgIChzZXBhcmF0b3Iuc3RpY2t5ID8gXCJ5XCIgOiBcIlwiKSxcbiAgICAgIC8vIEZpcmVmb3ggMytcbiAgICAgIGxhc3RMYXN0SW5kZXggPSAwLFxuICAgICAgLy8gTWFrZSBgZ2xvYmFsYCBhbmQgYXZvaWQgYGxhc3RJbmRleGAgaXNzdWVzIGJ5IHdvcmtpbmcgd2l0aCBhIGNvcHlcbiAgICAgIHNlcGFyYXRvciA9IG5ldyBSZWdFeHAoc2VwYXJhdG9yLnNvdXJjZSwgZmxhZ3MgKyBcImdcIiksXG4gICAgICBzZXBhcmF0b3IyLCBtYXRjaCwgbGFzdEluZGV4LCBsYXN0TGVuZ3RoO1xuICAgIHN0ciArPSBcIlwiOyAvLyBUeXBlLWNvbnZlcnRcbiAgICBpZiAoIWNvbXBsaWFudEV4ZWNOcGNnKSB7XG4gICAgICAvLyBEb2Vzbid0IG5lZWQgZmxhZ3MgZ3ksIGJ1dCB0aGV5IGRvbid0IGh1cnRcbiAgICAgIHNlcGFyYXRvcjIgPSBuZXcgUmVnRXhwKFwiXlwiICsgc2VwYXJhdG9yLnNvdXJjZSArIFwiJCg/IVxcXFxzKVwiLCBmbGFncyk7XG4gICAgfVxuICAgIC8qIFZhbHVlcyBmb3IgYGxpbWl0YCwgcGVyIHRoZSBzcGVjOlxuICAgICAqIElmIHVuZGVmaW5lZDogNDI5NDk2NzI5NSAvLyBNYXRoLnBvdygyLCAzMikgLSAxXG4gICAgICogSWYgMCwgSW5maW5pdHksIG9yIE5hTjogMFxuICAgICAqIElmIHBvc2l0aXZlIG51bWJlcjogbGltaXQgPSBNYXRoLmZsb29yKGxpbWl0KTsgaWYgKGxpbWl0ID4gNDI5NDk2NzI5NSkgbGltaXQgLT0gNDI5NDk2NzI5NjtcbiAgICAgKiBJZiBuZWdhdGl2ZSBudW1iZXI6IDQyOTQ5NjcyOTYgLSBNYXRoLmZsb29yKE1hdGguYWJzKGxpbWl0KSlcbiAgICAgKiBJZiBvdGhlcjogVHlwZS1jb252ZXJ0LCB0aGVuIHVzZSB0aGUgYWJvdmUgcnVsZXNcbiAgICAgKi9cbiAgICBsaW1pdCA9IGxpbWl0ID09PSB1bmRlZiA/IC0xID4+PiAwIDogLy8gTWF0aC5wb3coMiwgMzIpIC0gMVxuICAgIGxpbWl0ID4+PiAwOyAvLyBUb1VpbnQzMihsaW1pdClcbiAgICB3aGlsZSAobWF0Y2ggPSBzZXBhcmF0b3IuZXhlYyhzdHIpKSB7XG4gICAgICAvLyBgc2VwYXJhdG9yLmxhc3RJbmRleGAgaXMgbm90IHJlbGlhYmxlIGNyb3NzLWJyb3dzZXJcbiAgICAgIGxhc3RJbmRleCA9IG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoO1xuICAgICAgaWYgKGxhc3RJbmRleCA+IGxhc3RMYXN0SW5kZXgpIHtcbiAgICAgICAgb3V0cHV0LnB1c2goc3RyLnNsaWNlKGxhc3RMYXN0SW5kZXgsIG1hdGNoLmluZGV4KSk7XG4gICAgICAgIC8vIEZpeCBicm93c2VycyB3aG9zZSBgZXhlY2AgbWV0aG9kcyBkb24ndCBjb25zaXN0ZW50bHkgcmV0dXJuIGB1bmRlZmluZWRgIGZvclxuICAgICAgICAvLyBub25wYXJ0aWNpcGF0aW5nIGNhcHR1cmluZyBncm91cHNcbiAgICAgICAgaWYgKCFjb21wbGlhbnRFeGVjTnBjZyAmJiBtYXRjaC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgbWF0Y2hbMF0ucmVwbGFjZShzZXBhcmF0b3IyLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aCAtIDI7IGkrKykge1xuICAgICAgICAgICAgICBpZiAoYXJndW1lbnRzW2ldID09PSB1bmRlZikge1xuICAgICAgICAgICAgICAgIG1hdGNoW2ldID0gdW5kZWY7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobWF0Y2gubGVuZ3RoID4gMSAmJiBtYXRjaC5pbmRleCA8IHN0ci5sZW5ndGgpIHtcbiAgICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShvdXRwdXQsIG1hdGNoLnNsaWNlKDEpKTtcbiAgICAgICAgfVxuICAgICAgICBsYXN0TGVuZ3RoID0gbWF0Y2hbMF0ubGVuZ3RoO1xuICAgICAgICBsYXN0TGFzdEluZGV4ID0gbGFzdEluZGV4O1xuICAgICAgICBpZiAob3V0cHV0Lmxlbmd0aCA+PSBsaW1pdCkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoc2VwYXJhdG9yLmxhc3RJbmRleCA9PT0gbWF0Y2guaW5kZXgpIHtcbiAgICAgICAgc2VwYXJhdG9yLmxhc3RJbmRleCsrOyAvLyBBdm9pZCBhbiBpbmZpbml0ZSBsb29wXG4gICAgICB9XG4gICAgfVxuICAgIGlmIChsYXN0TGFzdEluZGV4ID09PSBzdHIubGVuZ3RoKSB7XG4gICAgICBpZiAobGFzdExlbmd0aCB8fCAhc2VwYXJhdG9yLnRlc3QoXCJcIikpIHtcbiAgICAgICAgb3V0cHV0LnB1c2goXCJcIik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dC5wdXNoKHN0ci5zbGljZShsYXN0TGFzdEluZGV4KSk7XG4gICAgfVxuICAgIHJldHVybiBvdXRwdXQubGVuZ3RoID4gbGltaXQgPyBvdXRwdXQuc2xpY2UoMCwgbGltaXQpIDogb3V0cHV0O1xuICB9O1xuXG4gIHJldHVybiBzZWxmO1xufSkoKTtcbiIsIi8vIGNvbnRhaW5zLCBhZGQsIHJlbW92ZSwgdG9nZ2xlXG52YXIgaW5kZXhvZiA9IHJlcXVpcmUoJ2luZGV4b2YnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IENsYXNzTGlzdFxuXG5mdW5jdGlvbiBDbGFzc0xpc3QoZWxlbSkge1xuICAgIHZhciBjbCA9IGVsZW0uY2xhc3NMaXN0XG5cbiAgICBpZiAoY2wpIHtcbiAgICAgICAgcmV0dXJuIGNsXG4gICAgfVxuXG4gICAgdmFyIGNsYXNzTGlzdCA9IHtcbiAgICAgICAgYWRkOiBhZGRcbiAgICAgICAgLCByZW1vdmU6IHJlbW92ZVxuICAgICAgICAsIGNvbnRhaW5zOiBjb250YWluc1xuICAgICAgICAsIHRvZ2dsZTogdG9nZ2xlXG4gICAgICAgICwgdG9TdHJpbmc6ICR0b1N0cmluZ1xuICAgICAgICAsIGxlbmd0aDogMFxuICAgICAgICAsIGl0ZW06IGl0ZW1cbiAgICB9XG5cbiAgICByZXR1cm4gY2xhc3NMaXN0XG5cbiAgICBmdW5jdGlvbiBhZGQodG9rZW4pIHtcbiAgICAgICAgdmFyIGxpc3QgPSBnZXRUb2tlbnMoKVxuICAgICAgICBpZiAoaW5kZXhvZihsaXN0LCB0b2tlbikgPiAtMSkge1xuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgICAgbGlzdC5wdXNoKHRva2VuKVxuICAgICAgICBzZXRUb2tlbnMobGlzdClcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZW1vdmUodG9rZW4pIHtcbiAgICAgICAgdmFyIGxpc3QgPSBnZXRUb2tlbnMoKVxuICAgICAgICAgICAgLCBpbmRleCA9IGluZGV4b2YobGlzdCwgdG9rZW4pXG5cbiAgICAgICAgaWYgKGluZGV4ID09PSAtMSkge1xuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cblxuICAgICAgICBsaXN0LnNwbGljZShpbmRleCwgMSlcbiAgICAgICAgc2V0VG9rZW5zKGxpc3QpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29udGFpbnModG9rZW4pIHtcbiAgICAgICAgcmV0dXJuIGluZGV4b2YoZ2V0VG9rZW5zKCksIHRva2VuKSA+IC0xXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdG9nZ2xlKHRva2VuKSB7XG4gICAgICAgIGlmIChjb250YWlucyh0b2tlbikpIHtcbiAgICAgICAgICAgIHJlbW92ZSh0b2tlbilcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWRkKHRva2VuKVxuICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uICR0b1N0cmluZygpIHtcbiAgICAgICAgcmV0dXJuIGVsZW0uY2xhc3NOYW1lXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXRlbShpbmRleCkge1xuICAgICAgICB2YXIgdG9rZW5zID0gZ2V0VG9rZW5zKClcbiAgICAgICAgcmV0dXJuIHRva2Vuc1tpbmRleF0gfHwgbnVsbFxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFRva2VucygpIHtcbiAgICAgICAgdmFyIGNsYXNzTmFtZSA9IGVsZW0uY2xhc3NOYW1lXG5cbiAgICAgICAgcmV0dXJuIGZpbHRlcihjbGFzc05hbWUuc3BsaXQoXCIgXCIpLCBpc1RydXRoeSlcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRUb2tlbnMobGlzdCkge1xuICAgICAgICB2YXIgbGVuZ3RoID0gbGlzdC5sZW5ndGhcblxuICAgICAgICBlbGVtLmNsYXNzTmFtZSA9IGxpc3Quam9pbihcIiBcIilcbiAgICAgICAgY2xhc3NMaXN0Lmxlbmd0aCA9IGxlbmd0aFxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgY2xhc3NMaXN0W2ldID0gbGlzdFtpXVxuICAgICAgICB9XG5cbiAgICAgICAgZGVsZXRlIGxpc3RbbGVuZ3RoXVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZmlsdGVyIChhcnIsIGZuKSB7XG4gICAgdmFyIHJldCA9IFtdXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGZuKGFycltpXSkpIHJldC5wdXNoKGFycltpXSlcbiAgICB9XG4gICAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBpc1RydXRoeSh2YWx1ZSkge1xuICAgIHJldHVybiAhIXZhbHVlXG59XG4iLCJcbnZhciBpbmRleE9mID0gW10uaW5kZXhPZjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhcnIsIG9iail7XG4gIGlmIChpbmRleE9mKSByZXR1cm4gYXJyLmluZGV4T2Yob2JqKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoYXJyW2ldID09PSBvYmopIHJldHVybiBpO1xuICB9XG4gIHJldHVybiAtMTtcbn07IiwidmFyIFdlYWttYXAgPSByZXF1aXJlKFwid2Vha21hcFwiKVxudmFyIEluZGl2aWR1YWwgPSByZXF1aXJlKFwiaW5kaXZpZHVhbFwiKVxuXG52YXIgZGF0YXNldE1hcCA9IEluZGl2aWR1YWwoXCJfX0RBVEFfU0VUX1dFQUtNQVBcIiwgV2Vha21hcCgpKVxuXG5tb2R1bGUuZXhwb3J0cyA9IERhdGFTZXRcblxuZnVuY3Rpb24gRGF0YVNldChlbGVtKSB7XG4gICAgaWYgKGVsZW0uZGF0YXNldCkge1xuICAgICAgICByZXR1cm4gZWxlbS5kYXRhc2V0XG4gICAgfVxuXG4gICAgdmFyIGhhc2ggPSBkYXRhc2V0TWFwLmdldChlbGVtKVxuXG4gICAgaWYgKCFoYXNoKSB7XG4gICAgICAgIGhhc2ggPSBjcmVhdGVIYXNoKGVsZW0pXG4gICAgICAgIGRhdGFzZXRNYXAuc2V0KGVsZW0sIGhhc2gpXG4gICAgfVxuXG4gICAgcmV0dXJuIGhhc2hcbn1cblxuZnVuY3Rpb24gY3JlYXRlSGFzaChlbGVtKSB7XG4gICAgdmFyIGF0dHJpYnV0ZXMgPSBlbGVtLmF0dHJpYnV0ZXNcbiAgICB2YXIgaGFzaCA9IHt9XG5cbiAgICBpZiAoYXR0cmlidXRlcyA9PT0gbnVsbCB8fCBhdHRyaWJ1dGVzID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIGhhc2hcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGF0dHJpYnV0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGF0dHIgPSBhdHRyaWJ1dGVzW2ldXG5cbiAgICAgICAgaWYgKGF0dHIubmFtZS5zdWJzdHIoMCw1KSAhPT0gXCJkYXRhLVwiKSB7XG4gICAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgaGFzaFthdHRyLm5hbWUuc3Vic3RyKDUpXSA9IGF0dHIudmFsdWVcbiAgICB9XG5cbiAgICByZXR1cm4gaGFzaFxufVxuIiwidmFyIHJvb3QgPSByZXF1aXJlKFwiZ2xvYmFsXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gSW5kaXZpZHVhbFxuXG5mdW5jdGlvbiBJbmRpdmlkdWFsKGtleSwgdmFsdWUpIHtcbiAgICBpZiAocm9vdFtrZXldKSB7XG4gICAgICAgIHJldHVybiByb290W2tleV1cbiAgICB9XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocm9vdCwga2V5LCB7XG4gICAgICAgIHZhbHVlOiB2YWx1ZVxuICAgICAgICAsIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pXG5cbiAgICByZXR1cm4gdmFsdWVcbn1cbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qZ2xvYmFsIHdpbmRvdywgZ2xvYmFsKi9cbmlmICh0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBnbG9iYWxcbn0gZWxzZSBpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIG1vZHVsZS5leHBvcnRzID0gd2luZG93XG59XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIi8qIChUaGUgTUlUIExpY2Vuc2UpXHJcbiAqXHJcbiAqIENvcHlyaWdodCAoYykgMjAxMiBCcmFuZG9uIEJlbnZpZSA8aHR0cDovL2JiZW52aWUuY29tPlxyXG4gKlxyXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kXHJcbiAqIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlICdTb2Z0d2FyZScpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLFxyXG4gKiBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLFxyXG4gKiBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcclxuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcclxuICpcclxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgd2l0aCBhbGwgY29waWVzIG9yXHJcbiAqIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cclxuICpcclxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEICdBUyBJUycsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1IgSU1QTElFRCwgSU5DTFVESU5HXHJcbiAqIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORFxyXG4gKiBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZICBDTEFJTSxcclxuICogREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxyXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cclxuICovXHJcblxyXG4vLyBPcmlnaW5hbCBXZWFrTWFwIGltcGxlbWVudGF0aW9uIGJ5IEdvemFsYSBAIGh0dHBzOi8vZ2lzdC5naXRodWIuY29tLzEyNjk5OTFcclxuLy8gVXBkYXRlZCBhbmQgYnVnZml4ZWQgYnkgUmF5bm9zIEAgaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20vMTYzODA1OVxyXG4vLyBFeHBhbmRlZCBieSBCZW52aWUgQCBodHRwczovL2dpdGh1Yi5jb20vQmVudmllL2hhcm1vbnktY29sbGVjdGlvbnNcclxuXHJcbnZvaWQgZnVuY3Rpb24oZ2xvYmFsLCB1bmRlZmluZWRfLCB1bmRlZmluZWQpe1xyXG4gIHZhciBnZXRQcm9wcyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzLFxyXG4gICAgICBkZWZQcm9wICA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSxcclxuICAgICAgdG9Tb3VyY2UgPSBGdW5jdGlvbi5wcm90b3R5cGUudG9TdHJpbmcsXHJcbiAgICAgIGNyZWF0ZSAgID0gT2JqZWN0LmNyZWF0ZSxcclxuICAgICAgaGFzT3duICAgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LFxyXG4gICAgICBmdW5jTmFtZSA9IC9eXFxuP2Z1bmN0aW9uXFxzPyhcXHcqKT9fP1xcKC87XHJcblxyXG5cclxuICBmdW5jdGlvbiBkZWZpbmUob2JqZWN0LCBrZXksIHZhbHVlKXtcclxuICAgIGlmICh0eXBlb2Yga2V5ID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgIHZhbHVlID0ga2V5O1xyXG4gICAgICBrZXkgPSBuYW1lT2YodmFsdWUpLnJlcGxhY2UoL18kLywgJycpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGRlZlByb3Aob2JqZWN0LCBrZXksIHsgY29uZmlndXJhYmxlOiB0cnVlLCB3cml0YWJsZTogdHJ1ZSwgdmFsdWU6IHZhbHVlIH0pO1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gbmFtZU9mKGZ1bmMpe1xyXG4gICAgcmV0dXJuIHR5cGVvZiBmdW5jICE9PSAnZnVuY3Rpb24nXHJcbiAgICAgICAgICA/ICcnIDogJ25hbWUnIGluIGZ1bmNcclxuICAgICAgICAgID8gZnVuYy5uYW1lIDogdG9Tb3VyY2UuY2FsbChmdW5jKS5tYXRjaChmdW5jTmFtZSlbMV07XHJcbiAgfVxyXG5cclxuICAvLyAjIyMjIyMjIyMjIyNcclxuICAvLyAjIyMgRGF0YSAjIyNcclxuICAvLyAjIyMjIyMjIyMjIyNcclxuXHJcbiAgdmFyIERhdGEgPSAoZnVuY3Rpb24oKXtcclxuICAgIHZhciBkYXRhRGVzYyA9IHsgdmFsdWU6IHsgd3JpdGFibGU6IHRydWUsIHZhbHVlOiB1bmRlZmluZWQgfSB9LFxyXG4gICAgICAgIGRhdGFsb2NrID0gJ3JldHVybiBmdW5jdGlvbihrKXtpZihrPT09cylyZXR1cm4gbH0nLFxyXG4gICAgICAgIHVpZHMgICAgID0gY3JlYXRlKG51bGwpLFxyXG5cclxuICAgICAgICBjcmVhdGVVSUQgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgdmFyIGtleSA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKDIpO1xyXG4gICAgICAgICAgcmV0dXJuIGtleSBpbiB1aWRzID8gY3JlYXRlVUlEKCkgOiB1aWRzW2tleV0gPSBrZXk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZ2xvYmFsSUQgPSBjcmVhdGVVSUQoKSxcclxuXHJcbiAgICAgICAgc3RvcmFnZSA9IGZ1bmN0aW9uKG9iail7XHJcbiAgICAgICAgICBpZiAoaGFzT3duLmNhbGwob2JqLCBnbG9iYWxJRCkpXHJcbiAgICAgICAgICAgIHJldHVybiBvYmpbZ2xvYmFsSURdO1xyXG5cclxuICAgICAgICAgIGlmICghT2JqZWN0LmlzRXh0ZW5zaWJsZShvYmopKVxyXG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IG11c3QgYmUgZXh0ZW5zaWJsZVwiKTtcclxuXHJcbiAgICAgICAgICB2YXIgc3RvcmUgPSBjcmVhdGUobnVsbCk7XHJcbiAgICAgICAgICBkZWZQcm9wKG9iaiwgZ2xvYmFsSUQsIHsgdmFsdWU6IHN0b3JlIH0pO1xyXG4gICAgICAgICAgcmV0dXJuIHN0b3JlO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgLy8gY29tbW9uIHBlci1vYmplY3Qgc3RvcmFnZSBhcmVhIG1hZGUgdmlzaWJsZSBieSBwYXRjaGluZyBnZXRPd25Qcm9wZXJ0eU5hbWVzJ1xyXG4gICAgZGVmaW5lKE9iamVjdCwgZnVuY3Rpb24gZ2V0T3duUHJvcGVydHlOYW1lcyhvYmope1xyXG4gICAgICB2YXIgcHJvcHMgPSBnZXRQcm9wcyhvYmopO1xyXG4gICAgICBpZiAoaGFzT3duLmNhbGwob2JqLCBnbG9iYWxJRCkpXHJcbiAgICAgICAgcHJvcHMuc3BsaWNlKHByb3BzLmluZGV4T2YoZ2xvYmFsSUQpLCAxKTtcclxuICAgICAgcmV0dXJuIHByb3BzO1xyXG4gICAgfSk7XHJcblxyXG4gICAgZnVuY3Rpb24gRGF0YSgpe1xyXG4gICAgICB2YXIgcHVpZCA9IGNyZWF0ZVVJRCgpLFxyXG4gICAgICAgICAgc2VjcmV0ID0ge307XHJcblxyXG4gICAgICB0aGlzLnVubG9jayA9IGZ1bmN0aW9uKG9iail7XHJcbiAgICAgICAgdmFyIHN0b3JlID0gc3RvcmFnZShvYmopO1xyXG4gICAgICAgIGlmIChoYXNPd24uY2FsbChzdG9yZSwgcHVpZCkpXHJcbiAgICAgICAgICByZXR1cm4gc3RvcmVbcHVpZF0oc2VjcmV0KTtcclxuXHJcbiAgICAgICAgdmFyIGRhdGEgPSBjcmVhdGUobnVsbCwgZGF0YURlc2MpO1xyXG4gICAgICAgIGRlZlByb3Aoc3RvcmUsIHB1aWQsIHtcclxuICAgICAgICAgIHZhbHVlOiBuZXcgRnVuY3Rpb24oJ3MnLCAnbCcsIGRhdGFsb2NrKShzZWNyZXQsIGRhdGEpXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIGRhdGE7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBkZWZpbmUoRGF0YS5wcm90b3R5cGUsIGZ1bmN0aW9uIGdldChvKXsgcmV0dXJuIHRoaXMudW5sb2NrKG8pLnZhbHVlIH0pO1xyXG4gICAgZGVmaW5lKERhdGEucHJvdG90eXBlLCBmdW5jdGlvbiBzZXQobywgdil7IHRoaXMudW5sb2NrKG8pLnZhbHVlID0gdiB9KTtcclxuXHJcbiAgICByZXR1cm4gRGF0YTtcclxuICB9KCkpO1xyXG5cclxuXHJcbiAgdmFyIFdNID0gKGZ1bmN0aW9uKGRhdGEpe1xyXG4gICAgdmFyIHZhbGlkYXRlID0gZnVuY3Rpb24oa2V5KXtcclxuICAgICAgaWYgKGtleSA9PSBudWxsIHx8IHR5cGVvZiBrZXkgIT09ICdvYmplY3QnICYmIHR5cGVvZiBrZXkgIT09ICdmdW5jdGlvbicpXHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkludmFsaWQgV2Vha01hcCBrZXlcIik7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHdyYXAgPSBmdW5jdGlvbihjb2xsZWN0aW9uLCB2YWx1ZSl7XHJcbiAgICAgIHZhciBzdG9yZSA9IGRhdGEudW5sb2NrKGNvbGxlY3Rpb24pO1xyXG4gICAgICBpZiAoc3RvcmUudmFsdWUpXHJcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBpcyBhbHJlYWR5IGEgV2Vha01hcFwiKTtcclxuICAgICAgc3RvcmUudmFsdWUgPSB2YWx1ZTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgdW53cmFwID0gZnVuY3Rpb24oY29sbGVjdGlvbil7XHJcbiAgICAgIHZhciBzdG9yYWdlID0gZGF0YS51bmxvY2soY29sbGVjdGlvbikudmFsdWU7XHJcbiAgICAgIGlmICghc3RvcmFnZSlcclxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiV2Vha01hcCBpcyBub3QgZ2VuZXJpY1wiKTtcclxuICAgICAgcmV0dXJuIHN0b3JhZ2U7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGluaXRpYWxpemUgPSBmdW5jdGlvbih3ZWFrbWFwLCBpdGVyYWJsZSl7XHJcbiAgICAgIGlmIChpdGVyYWJsZSAhPT0gbnVsbCAmJiB0eXBlb2YgaXRlcmFibGUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBpdGVyYWJsZS5mb3JFYWNoID09PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgaXRlcmFibGUuZm9yRWFjaChmdW5jdGlvbihpdGVtLCBpKXtcclxuICAgICAgICAgIGlmIChpdGVtIGluc3RhbmNlb2YgQXJyYXkgJiYgaXRlbS5sZW5ndGggPT09IDIpXHJcbiAgICAgICAgICAgIHNldC5jYWxsKHdlYWttYXAsIGl0ZXJhYmxlW2ldWzBdLCBpdGVyYWJsZVtpXVsxXSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgZnVuY3Rpb24gV2Vha01hcChpdGVyYWJsZSl7XHJcbiAgICAgIGlmICh0aGlzID09PSBnbG9iYWwgfHwgdGhpcyA9PSBudWxsIHx8IHRoaXMgPT09IFdlYWtNYXAucHJvdG90eXBlKVxyXG4gICAgICAgIHJldHVybiBuZXcgV2Vha01hcChpdGVyYWJsZSk7XHJcblxyXG4gICAgICB3cmFwKHRoaXMsIG5ldyBEYXRhKTtcclxuICAgICAgaW5pdGlhbGl6ZSh0aGlzLCBpdGVyYWJsZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZ2V0KGtleSl7XHJcbiAgICAgIHZhbGlkYXRlKGtleSk7XHJcbiAgICAgIHZhciB2YWx1ZSA9IHVud3JhcCh0aGlzKS5nZXQoa2V5KTtcclxuICAgICAgcmV0dXJuIHZhbHVlID09PSB1bmRlZmluZWRfID8gdW5kZWZpbmVkIDogdmFsdWU7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2V0KGtleSwgdmFsdWUpe1xyXG4gICAgICB2YWxpZGF0ZShrZXkpO1xyXG4gICAgICAvLyBzdG9yZSBhIHRva2VuIGZvciBleHBsaWNpdCB1bmRlZmluZWQgc28gdGhhdCBcImhhc1wiIHdvcmtzIGNvcnJlY3RseVxyXG4gICAgICB1bndyYXAodGhpcykuc2V0KGtleSwgdmFsdWUgPT09IHVuZGVmaW5lZCA/IHVuZGVmaW5lZF8gOiB2YWx1ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaGFzKGtleSl7XHJcbiAgICAgIHZhbGlkYXRlKGtleSk7XHJcbiAgICAgIHJldHVybiB1bndyYXAodGhpcykuZ2V0KGtleSkgIT09IHVuZGVmaW5lZDtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkZWxldGVfKGtleSl7XHJcbiAgICAgIHZhbGlkYXRlKGtleSk7XHJcbiAgICAgIHZhciBkYXRhID0gdW53cmFwKHRoaXMpLFxyXG4gICAgICAgICAgaGFkID0gZGF0YS5nZXQoa2V5KSAhPT0gdW5kZWZpbmVkO1xyXG4gICAgICBkYXRhLnNldChrZXksIHVuZGVmaW5lZCk7XHJcbiAgICAgIHJldHVybiBoYWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gdG9TdHJpbmcoKXtcclxuICAgICAgdW53cmFwKHRoaXMpO1xyXG4gICAgICByZXR1cm4gJ1tvYmplY3QgV2Vha01hcF0nO1xyXG4gICAgfVxyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIHZhciBzcmMgPSAoJ3JldHVybiAnK2RlbGV0ZV8pLnJlcGxhY2UoJ2VfJywgJ1xcXFx1MDA2NScpLFxyXG4gICAgICAgICAgZGVsID0gbmV3IEZ1bmN0aW9uKCd1bndyYXAnLCAndmFsaWRhdGUnLCBzcmMpKHVud3JhcCwgdmFsaWRhdGUpO1xyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICB2YXIgZGVsID0gZGVsZXRlXztcclxuICAgIH1cclxuXHJcbiAgICB2YXIgc3JjID0gKCcnK09iamVjdCkuc3BsaXQoJ09iamVjdCcpO1xyXG4gICAgdmFyIHN0cmluZ2lmaWVyID0gZnVuY3Rpb24gdG9TdHJpbmcoKXtcclxuICAgICAgcmV0dXJuIHNyY1swXSArIG5hbWVPZih0aGlzKSArIHNyY1sxXTtcclxuICAgIH07XHJcblxyXG4gICAgZGVmaW5lKHN0cmluZ2lmaWVyLCBzdHJpbmdpZmllcik7XHJcblxyXG4gICAgdmFyIHByZXAgPSB7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5XHJcbiAgICAgID8gZnVuY3Rpb24oZil7IGYuX19wcm90b19fID0gc3RyaW5naWZpZXIgfVxyXG4gICAgICA6IGZ1bmN0aW9uKGYpeyBkZWZpbmUoZiwgc3RyaW5naWZpZXIpIH07XHJcblxyXG4gICAgcHJlcChXZWFrTWFwKTtcclxuXHJcbiAgICBbdG9TdHJpbmcsIGdldCwgc2V0LCBoYXMsIGRlbF0uZm9yRWFjaChmdW5jdGlvbihtZXRob2Qpe1xyXG4gICAgICBkZWZpbmUoV2Vha01hcC5wcm90b3R5cGUsIG1ldGhvZCk7XHJcbiAgICAgIHByZXAobWV0aG9kKTtcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBXZWFrTWFwO1xyXG4gIH0obmV3IERhdGEpKTtcclxuXHJcbiAgdmFyIGRlZmF1bHRDcmVhdG9yID0gT2JqZWN0LmNyZWF0ZVxyXG4gICAgPyBmdW5jdGlvbigpeyByZXR1cm4gT2JqZWN0LmNyZWF0ZShudWxsKSB9XHJcbiAgICA6IGZ1bmN0aW9uKCl7IHJldHVybiB7fSB9O1xyXG5cclxuICBmdW5jdGlvbiBjcmVhdGVTdG9yYWdlKGNyZWF0b3Ipe1xyXG4gICAgdmFyIHdlYWttYXAgPSBuZXcgV007XHJcbiAgICBjcmVhdG9yIHx8IChjcmVhdG9yID0gZGVmYXVsdENyZWF0b3IpO1xyXG5cclxuICAgIGZ1bmN0aW9uIHN0b3JhZ2Uob2JqZWN0LCB2YWx1ZSl7XHJcbiAgICAgIGlmICh2YWx1ZSB8fCBhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XHJcbiAgICAgICAgd2Vha21hcC5zZXQob2JqZWN0LCB2YWx1ZSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdmFsdWUgPSB3ZWFrbWFwLmdldChvYmplY3QpO1xyXG4gICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICB2YWx1ZSA9IGNyZWF0b3Iob2JqZWN0KTtcclxuICAgICAgICAgIHdlYWttYXAuc2V0KG9iamVjdCwgdmFsdWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHN0b3JhZ2U7XHJcbiAgfVxyXG5cclxuXHJcbiAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFdNO1xyXG4gIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XHJcbiAgICBleHBvcnRzLldlYWtNYXAgPSBXTTtcclxuICB9IGVsc2UgaWYgKCEoJ1dlYWtNYXAnIGluIGdsb2JhbCkpIHtcclxuICAgIGdsb2JhbC5XZWFrTWFwID0gV007XHJcbiAgfVxyXG5cclxuICBXTS5jcmVhdGVTdG9yYWdlID0gY3JlYXRlU3RvcmFnZTtcclxuICBpZiAoZ2xvYmFsLldlYWtNYXApXHJcbiAgICBnbG9iYWwuV2Vha01hcC5jcmVhdGVTdG9yYWdlID0gY3JlYXRlU3RvcmFnZTtcclxufSgoMCwgZXZhbCkoJ3RoaXMnKSk7XHJcbiIsInZhciBub3cgPSByZXF1aXJlKCdwZXJmb3JtYW5jZS1ub3cnKVxuICAsIGdsb2JhbCA9IHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnID8ge30gOiB3aW5kb3dcbiAgLCB2ZW5kb3JzID0gWydtb3onLCAnd2Via2l0J11cbiAgLCBzdWZmaXggPSAnQW5pbWF0aW9uRnJhbWUnXG4gICwgcmFmID0gZ2xvYmFsWydyZXF1ZXN0JyArIHN1ZmZpeF1cbiAgLCBjYWYgPSBnbG9iYWxbJ2NhbmNlbCcgKyBzdWZmaXhdIHx8IGdsb2JhbFsnY2FuY2VsUmVxdWVzdCcgKyBzdWZmaXhdXG4gICwgaXNOYXRpdmUgPSB0cnVlXG5cbmZvcih2YXIgaSA9IDA7IGkgPCB2ZW5kb3JzLmxlbmd0aCAmJiAhcmFmOyBpKyspIHtcbiAgcmFmID0gZ2xvYmFsW3ZlbmRvcnNbaV0gKyAnUmVxdWVzdCcgKyBzdWZmaXhdXG4gIGNhZiA9IGdsb2JhbFt2ZW5kb3JzW2ldICsgJ0NhbmNlbCcgKyBzdWZmaXhdXG4gICAgICB8fCBnbG9iYWxbdmVuZG9yc1tpXSArICdDYW5jZWxSZXF1ZXN0JyArIHN1ZmZpeF1cbn1cblxuLy8gU29tZSB2ZXJzaW9ucyBvZiBGRiBoYXZlIHJBRiBidXQgbm90IGNBRlxuaWYoIXJhZiB8fCAhY2FmKSB7XG4gIGlzTmF0aXZlID0gZmFsc2VcblxuICB2YXIgbGFzdCA9IDBcbiAgICAsIGlkID0gMFxuICAgICwgcXVldWUgPSBbXVxuICAgICwgZnJhbWVEdXJhdGlvbiA9IDEwMDAgLyA2MFxuXG4gIHJhZiA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgaWYocXVldWUubGVuZ3RoID09PSAwKSB7XG4gICAgICB2YXIgX25vdyA9IG5vdygpXG4gICAgICAgICwgbmV4dCA9IE1hdGgubWF4KDAsIGZyYW1lRHVyYXRpb24gLSAoX25vdyAtIGxhc3QpKVxuICAgICAgbGFzdCA9IG5leHQgKyBfbm93XG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgY3AgPSBxdWV1ZS5zbGljZSgwKVxuICAgICAgICAvLyBDbGVhciBxdWV1ZSBoZXJlIHRvIHByZXZlbnRcbiAgICAgICAgLy8gY2FsbGJhY2tzIGZyb20gYXBwZW5kaW5nIGxpc3RlbmVyc1xuICAgICAgICAvLyB0byB0aGUgY3VycmVudCBmcmFtZSdzIHF1ZXVlXG4gICAgICAgIHF1ZXVlLmxlbmd0aCA9IDBcbiAgICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGNwLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYoIWNwW2ldLmNhbmNlbGxlZCkge1xuICAgICAgICAgICAgdHJ5e1xuICAgICAgICAgICAgICBjcFtpXS5jYWxsYmFjayhsYXN0KVxuICAgICAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7IHRocm93IGUgfSwgMClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0sIE1hdGgucm91bmQobmV4dCkpXG4gICAgfVxuICAgIHF1ZXVlLnB1c2goe1xuICAgICAgaGFuZGxlOiArK2lkLFxuICAgICAgY2FsbGJhY2s6IGNhbGxiYWNrLFxuICAgICAgY2FuY2VsbGVkOiBmYWxzZVxuICAgIH0pXG4gICAgcmV0dXJuIGlkXG4gIH1cblxuICBjYWYgPSBmdW5jdGlvbihoYW5kbGUpIHtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgcXVldWUubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmKHF1ZXVlW2ldLmhhbmRsZSA9PT0gaGFuZGxlKSB7XG4gICAgICAgIHF1ZXVlW2ldLmNhbmNlbGxlZCA9IHRydWVcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihmbikge1xuICAvLyBXcmFwIGluIGEgbmV3IGZ1bmN0aW9uIHRvIHByZXZlbnRcbiAgLy8gYGNhbmNlbGAgcG90ZW50aWFsbHkgYmVpbmcgYXNzaWduZWRcbiAgLy8gdG8gdGhlIG5hdGl2ZSByQUYgZnVuY3Rpb25cbiAgaWYoIWlzTmF0aXZlKSB7XG4gICAgcmV0dXJuIHJhZi5jYWxsKGdsb2JhbCwgZm4pXG4gIH1cbiAgcmV0dXJuIHJhZi5jYWxsKGdsb2JhbCwgZnVuY3Rpb24oKSB7XG4gICAgdHJ5e1xuICAgICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKVxuICAgIH0gY2F0Y2goZSkge1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgdGhyb3cgZSB9LCAwKVxuICAgIH1cbiAgfSlcbn1cbm1vZHVsZS5leHBvcnRzLmNhbmNlbCA9IGZ1bmN0aW9uKCkge1xuICBjYWYuYXBwbHkoZ2xvYmFsLCBhcmd1bWVudHMpXG59XG4iLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuLy8gR2VuZXJhdGVkIGJ5IENvZmZlZVNjcmlwdCAxLjYuM1xuKGZ1bmN0aW9uKCkge1xuICB2YXIgZ2V0TmFub1NlY29uZHMsIGhydGltZSwgbG9hZFRpbWU7XG5cbiAgaWYgKCh0eXBlb2YgcGVyZm9ybWFuY2UgIT09IFwidW5kZWZpbmVkXCIgJiYgcGVyZm9ybWFuY2UgIT09IG51bGwpICYmIHBlcmZvcm1hbmNlLm5vdykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgfTtcbiAgfSBlbHNlIGlmICgodHlwZW9mIHByb2Nlc3MgIT09IFwidW5kZWZpbmVkXCIgJiYgcHJvY2VzcyAhPT0gbnVsbCkgJiYgcHJvY2Vzcy5ocnRpbWUpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIChnZXROYW5vU2Vjb25kcygpIC0gbG9hZFRpbWUpIC8gMWU2O1xuICAgIH07XG4gICAgaHJ0aW1lID0gcHJvY2Vzcy5ocnRpbWU7XG4gICAgZ2V0TmFub1NlY29uZHMgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBocjtcbiAgICAgIGhyID0gaHJ0aW1lKCk7XG4gICAgICByZXR1cm4gaHJbMF0gKiAxZTkgKyBoclsxXTtcbiAgICB9O1xuICAgIGxvYWRUaW1lID0gZ2V0TmFub1NlY29uZHMoKTtcbiAgfSBlbHNlIGlmIChEYXRlLm5vdykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gRGF0ZS5ub3coKSAtIGxvYWRUaW1lO1xuICAgIH07XG4gICAgbG9hZFRpbWUgPSBEYXRlLm5vdygpO1xuICB9IGVsc2Uge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCkgLSBsb2FkVGltZTtcbiAgICB9O1xuICAgIGxvYWRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIH1cblxufSkuY2FsbCh0aGlzKTtcblxuLypcbi8vQCBzb3VyY2VNYXBwaW5nVVJMPXBlcmZvcm1hbmNlLW5vdy5tYXBcbiovXG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKCdfcHJvY2VzcycpKSIsInZhciBoID0gcmVxdWlyZSgnaHlwZXJzY3JpcHQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIGgoJ2Rpdi5jb250cm9sJyxcbiAgICAgICAgICAgaCgnc3Bhbi5kZScsIFwiZGVhY3RpdmF0ZVwiKSxcbiAgICAgICAgICAgaCgnZGl2LnZvbHVtZScsXG4gICAgICAgICAgICAgaCgnaW5wdXQnLCB7XCJ0eXBlXCI6ICdyYW5nZScsIFwibWluXCI6ICcwJywgXCJtYXhcIjogJzExJywgXCJzdGVwXCI6IFwiMVwiLCBcInZhbHVlXCI6IFwiNVwifSkpLFxuICAgICAgICAgICBoKCdzcGFuLm11dGUnLCBcIm11dGVcIiksXG4gICAgICAgICAgIGgoJ2Rpdi5pbmZvJyxcbiAgICAgICAgICAgICBoKCdwJywgXCJUaXRsZTogXCIsXG4gICAgICAgICAgICAgICBoKCdpLnRpdGxlJywgeydjb250ZW50RWRpdGFibGUnOiB0cnVlfSwgXCJUcmFjayAxXCIpKSxcbiAgICAgICAgICAgICBoKCdhcnRpY2xlLmluZm8nLFxuICAgICAgICAgICAgICAgaCgncCcsIFwiQ3VycmVudCBUaW1lOiBcIixcbiAgICAgICAgICAgICAgICAgaCgnaS5jdXInLCBcIjAwOjAwOjAwXCIpKSxcbiAgICAgICAgICAgICAgIGgoJ3AnLCBcIkR1cmF0aW9uOiBcIixcbiAgICAgICAgICAgICAgICAgaCgnaS5kdXInLCBcIjAwOjAwOjAwXCIpKSxcbiAgICAgICAgICAgICAgIGgoJ3AnLCBcIlJlbWFpbmluZzogXCIsXG4gICAgICAgICAgICAgICAgIGgoJ2kucmVtJywgXCIwMDowMDowMFwiKSkpKSxcbiAgICAgICAgICAgaCgnc3Bhbi5jb2xsYXBzZScsIFwiY29sbGFwc2VcIikpO1xufVxuIiwidmFyIGggPSByZXF1aXJlKCdoeXBlcnNjcmlwdCcpO1xudmFyIGNvbnRyb2xUbXAgPSByZXF1aXJlKCcuL2NvbnRyb2wtdG1wJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBoKCdkaXYudHJhY2stc3BhY2UnLFxuICAgICAgICAgICBjb250cm9sVG1wKCksXG4gICAgICAgICAgIGgoJ2Rpdi50cmFjaycsXG4gICAgICAgICAgICAgaCgncCcsXG4gICAgICAgICAgICAgICBcImRyYWcgZmlsZSAyIGVkaXRcIiksXG4gICAgICAgICAgICAgaCgnZGl2LnBsYXktY3Vyc29yJyksXG4gICAgICAgICAgICAgaCgnY2FudmFzLndhdmUnLCB7ICd3aWR0aCc6ICcxMjAwJywgJ2hlaWdodCc6ICczMDAnfSksXG4gICAgICAgICAgICAgaCgnZGl2LndhdmUtcHJvZ3Jlc3MnLFxuICAgICAgICAgICAgICAgaCgnY2FudmFzJywgeyd3aWR0aCc6ICcxMjAwJywgJ2hlaWdodCc6ICczMDAnfSkpKSk7XG59IixudWxsLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiJdfQ==
