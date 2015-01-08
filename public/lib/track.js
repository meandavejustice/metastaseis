var EE = require('events').EventEmitter;
var raf = require('raf');
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
    this.stop();
    this.lastPlay = this.context.currentTime;
    this.updateStartOffset();
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
    clearInterval(this.cursorViewInterval);
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
  updateVisualProgress: function (pos) {
    this.progressWave.style.width = pos+"px";
    this.cursor.style.left = pos+"px";
  },
  triggerPlaying: function() {
    if (!this.playing) {
      return;
    }

    var dur = this.audiosource.buffer.duration;
    var percent = this.currentTimeToPercent(this.context.currentTime);

    var currentTime = this.context.currentTime - this.lastPlay;

    // this is the same way we are caculating the width of the waves
    // to match up to the timeline
    this.updateVisualProgress((currentTime / 5) * 100);

    this.currentTimeEl.textContent = formatTime(this.context.currentTime - this.lastPlay);
    this.remainingEl.textContent = formatTime((this.audiosource.buffer.duration - this.lastPlay) - (this.context.currentTime - this.lastPlay));

    if (parseInt(percent) >= 100) {
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
    // adjust the canvas and containers to fit with the buffer duration
    var w = (this.audiosource.buffer.duration / 5) * 100;
    console.log(w);
    // var w = this.wave.parentNode.offsetWidth;
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