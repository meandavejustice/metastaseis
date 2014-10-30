var raf = require('raf');
var AudioSource = require('audiosource');
var formatTime = require('./format-time');
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

  // time indicators
  this.currentTimeEl = this.containEl.querySelector('.cur');
  this.remainingEl = this.containEl.querySelector('.rem');
  this.durationEl = this.containEl.querySelector('.dur');

  this.gainEl = this.containEl.querySelector('.volume input');
  this.wave = this.containEl.querySelector('.wave');
  this.progressWave = this.containEl.querySelector('.wave-progress');
  this.cursor = this.containEl.querySelector('.play-cursor');

  this.gainEl.addEventListener('change', function(ev) {
    this.gainNode.gain.value = parseFloat(ev.target.value);
  }.bind(this));

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
      this.lastGainValue = this.gainNode.gain.value;
      this.gainNode.gain.value = 0;
      this.gainEl.value = 0;
      el.textContent = 'unmute';
    } else {
      this.gainNode.gain.value = this.lastGainValue;
      this.gainEl.value = this.lastGainValue;
      el.textContent = 'mute';
    }
  }.bind(this));

  this.containEl.querySelector('.collapse').addEventListener('click', function(ev) {
    var el = ev.target;
    if (el.textContent === 'collapse') {
      el.textContent = 'expand';
      this.trackEl.classList.add('collapsed');
    } else {
      el.textContent = 'collapse';
      this.trackEl.classList.remove('collapsed');
    }
  }.bind(this));
  emitter.on('tracks:play', function(ev) {
    if (this.active) this.play();
  }.bind(this));

  emitter.on('tracks:pause', function(ev) {
    if (this.active) this.pause();
  }.bind(this));

  emitter.on('tracks:stop', function(ev) {
    if (this.active) this.stop();
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

    this.currentTimeEl.textContent = formatTime(this.context.currentTime - this.lastPlay);
    this.remainingEl.textContent = formatTime((this.audiosource.buffer.duration - this.lastPlay) - (this.context.currentTime - this.lastPlay - this.pausedSum));

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

        self.durationEl.textContent = formatTime(buf.duration);

        self.audiosource.buffer = buf;

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