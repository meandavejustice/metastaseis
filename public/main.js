var EE = require('events').EventEmitter;
var dragDrop = require('drag-drop');
var AudioContext = require('audiocontext');
var AudioSource = require('audiosource');

var colors = require('./lib/colors');
var editor = require('./lib/edits');
var Track = require('./lib/track');

var trackTmp = require('../templates/track-tmp');

var emitter = new EE();
var audioContext = new AudioContext();
var masterGainNode = audioContext.createGain();
var uniqId = function() {return Math.random().toString(16).slice(2)};

var workspaceEl = document.querySelector('#workspace');

// controls
var welcome = document.querySelector('.welcome');
var uploadBtn = document.querySelector('#upload');
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
var tracks = {};

var vips = welcome.querySelectorAll('span');

for(var i=0; i<vips.length; i++){
  colors.start(vips[i], 300);
}

dragDrop('body', function (files) {
  if (welcome) {
    welcome.remove();
  }
  newTrackFromFile(files[0]);
});

uploadBtn.addEventListener('change', function(ev) {
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

copyBtn.addEventListener('click', function() {
  var activeTrack = getActiveTrack();
  if (!activeTrack) return;

  var onComplete = function() {
    console.log('copy buffer complete: ', activeTrack.clipboard.buffer);
  };
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

  alert('select a place to paste');
  editor.paste(audioContext, activeTrack.clipboard, activeTrack.audiosource.buffer, 0.5, onComplete);
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

// removeBtn.addEventListener('click', function() {
//   if(!confirm('Remove '+ workspaceEl.querySelectorAll('.active').length + ' tracks?')) return;
//   tracks.forEach(function(track, idx) {
//     if (track.active) {
//       track.stop();
//       track.audiosource.disconnect();
//       delete track.gainNode;
//       delete track.audiosource;
//       track.containEl.remove();
//       tracks.splice(idx, 1);
//     }
//   });
// })

// duplicateBtn.addEventListener('click', function() {
//   var activeTrack = getActiveTrack();
//   if (!activeTrack) return;

//   var onComplete = function() {
//     console.log('copy buffer complete: ', activeTrack.clipboard.buffer);
//     newTrackFromAudioBuffer(activeTrack.clipboard.buffer);
//   };

//   if (activeTrack.clipboard.start === 0 && activeTrack.clipboard.end === 0) {
//     activeTrack.clipboard.end = activeTrack.audiosource.buffer.duration;
//   }

//   editor.copy(audioContext, activeTrack.clipboard, activeTrack.audiosource.buffer, onComplete);
// });

function getActiveTrack() {
  var activeTracks = tracks.filter(function(track) {
                       return track.active;
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
  var containerEl = trackTmp();
  var id = uniqId();
  workspaceEl.appendChild(containerEl);
  tracks[id] = new Track({
    id: id,
    containEl: containerEl,
    context: audioContext,
    gainNode: audioContext.createGain()
  });

  tracks[id].audiosource = new AudioSource(audioContext, {
    gainNode: tracks[tracks.length - 1].gainNode
  });

  tracks[id].audiosource.buffer = audioBuffer;
  tracks[id].drawWaves();
}

function newTrackFromFile(file) {
  if (welcome) welcome.remove();
  var containerEl = trackTmp();
  var id = uniqId();

  workspaceEl.appendChild(containerEl);
  tracks[id] = new Track({
    id: id,
    containEl: containerEl,
    context: audioContext
  });
  tracks[id].emitter.on('tracks:remove', function(ev) {
    tracks[ev.id] = null;
    delete tracks[ev.id];
    this.removeAllListeners();
  });
  tracks[id].loadFile(file);
}