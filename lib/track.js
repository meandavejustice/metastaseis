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