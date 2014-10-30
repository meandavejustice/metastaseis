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