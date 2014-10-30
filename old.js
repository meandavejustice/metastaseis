var Dragdealer = require('dragdealer').Dragdealer;
var AudioSource = require('audiosource');
var Ac = require('audiocontext');
var ac = new Ac();

var gainNode = ac.createGain();
var clipboard = undefined;
var colors = require('./colors');
var dragDrop = require('drag-drop')
var playing = false;

var fileIndicator = document.querySelector('#track p');
colors.start(fileIndicator, 300);

var as = window.as = new AudioSource(ac, {
  url: '/Sound.wav',
  gainNode: gainNode
});

var cursorMoving = false;
var cursorStart;
var cursorEnd;

as.loadSilent();
var playingInterval = null;
var currentTimeBox = document.querySelector('#time .cur');
var duration = document.querySelector('#time .dur')
var remaining = document.querySelector('#time .rem')

var track = document.querySelector('#track');
var playCursor = document.querySelector('#playCursor');
var selectionBox = document.querySelector('#selection');
var wave = document.querySelector('#wave');
var waveProgress = document.querySelector('#wave-progress');
var uploadBtn = document.querySelector('#upload');
var play = document.querySelector('#play');
var pause = document.querySelector('#pause');
var stop = document.querySelector('#stop');
var cut = document.querySelector('#cut');

cut.addEventListener('click', function() {
  var imgData = waveProgress.querySelector('canvas').toDataURL();
  var div = selectionBox;

  div.style.background = 'url('+ imgData +')'
  div.style.backgroundPosition = - cursorStart+'px 0px';

  div.style.width = cursorEnd - cursorStart+'px';
  div.style.height = wave.height+'px';

  new Dragdealer('track', {
    verticle: true,
    loose: true,
    callback: function(x, y) {
      console.log('drag ', x, y);
    }
  });
})

// Assume context is a web audio context, buffer is a pre-loaded audio buffer.
var startOffset = 0;
var lastPlay = 0;
var lastPause = 0;
var pausedSum = 0;
var actualCurrentTime = 0;
var initialPlay = true;
var initStartTime = 0;

play.addEventListener('click', function() {
  ac.currentTime = 0;
  lastPlay = ac.currentTime;

  if (initialPlay) {
    initStartTime = lastPlay;
    pausedSum = lastPlay;
    initialPlay = !initialPlay;
    waveProgress.style.width = 0;
    waveProgress.style.display = 'block';
  }

  if (lastPause > 0) updatePaused();

  playTrack(startOffset % as.buffer.duration);
});

function playTrack (offset) {
  if (playing) as.stop();
  console.log('playTrack at :', offset);
  console.log('playTrack at MOD :', offset % as.buffer.duration );
  as.play(0, offset);
  playing = true;
  webkitRequestAnimationFrame(triggerPlaying);
}

pause.addEventListener('click', function() {
  lastPause = ac.currentTime;

  console.log('pause time', lastPause);
  as.stop();

  startOffset += ac.currentTime - lastPlay;
  playing = !playing;
});

stop.addEventListener('click', function() {
  playing = !playing;
  lastPlay = 0;
  lastPause = 0;
  as.stop();
  waveProgress.style.width = "0%";
  playCursor.style.left = "0%";
});

function updatePaused(addmeh) {
  if (addmeh) {
    pausedSum = pausedSum + addmeh;
  } else {
    pausedSum = pausedSum + (lastPlay - lastPause);
  }
}

function currentTimeToPercent(currentTime){
  var dur = as.buffer.duration;
  var cur = (currentTime - pausedSum % 60) * 10;
  return ((cur / dur) * 10).toFixed(3);
}

function percentToCurrentTime(percent) {
  // this method should take a percentage (gotten from clicking)
  // and return the projected currentTime for that point.

  // some intermediary logic will take care of calculating the
  // offset and passing to the playmethod
  var dur = as.buffer.duration;
  var mod = dur % percent;
  var offsetFromStart = (mod/dur) * 1000;
  return offsetFromStart;
}

function triggerPlaying() {
  if (!playing) {
    return;
  }

  var dur = as.buffer.duration;
  var x = currentTimeToPercent(ac.currentTime);

  updateVisualProgress(x);

  currentTimeBox.textContent = formatTime(ac.currentTime - lastPlay);
  remaining.textContent = formatTime((dur - lastPlay) - (ac.currentTime - lastPlay));

  if (parseInt(x) > 100) {
    playing = !playing;
    return;
  }
  webkitRequestAnimationFrame(triggerPlaying);
}

function updateVisualProgress(percent) {
  waveProgress.style.width = percent+"%";
  playCursor.style.left = percent+"%";
}

waveProgress.addEventListener('click', function(ev) {
  if (playing) return;
  var percent = (ev.offsetX / 1200) * 100;
  var futureCurrentTime = percentToCurrentTime(percent);
  updateVisualProgress(percent);
})

wave.addEventListener('click', function(ev) {
  var percent = (ev.offsetX / 1200) * 100;
  globalFutureTime = percentToCurrentTime(percent);
  updateVisualProgress(percent);
  console.log('le currentTime', ac.currentTime);
  console.log('globfuttime', globalFutureTime);
  playTrack(globalFutureTime)// - (ac.currentTime - initStartTime));
  //
});

// wave.addEventListener('mousedown', function(ev) {
//   if (playing) return;
//   var x = ev.clientX - wave.getBoundingClientRect().left;
//   cursorStart = x;
//   cursorMoving = true;
// })

// wave.addEventListener('mouseup', function(ev) {
//   if (playing) return;
//   cursorMoving = false;
//   var x = ev.clientX - wave.getBoundingClientRect().left;
//   cursorEnd = x;
// });

// wave.addEventListener('mousemove', function(ev) {
//   if (playing) return;
//   if (!cursorMoving) return;
//   console.log(cursorMoving);
//   var x = ev.clientX - wave.getBoundingClientRect().left;

//   if (cursorStart > x) {
//     var tempEnd = x;
//     cursorEnd = cursorStart;
//     cursorStart = tempEnd;
//   } else {
//     cursorEnd = x;
//   }

//   selectionBox.style.left = cursorStart+"px";
//   selectionBox.style.width = cursorEnd - cursorStart + "px";
// console.log('mousemove event', ev);
// })

function formatTime(totalSec) {
  var minutes = parseInt( totalSec / 60 ) % 60;
  var seconds = totalSec % 60;

return ((minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds  < 10 ? "0" + seconds.toFixed(2) : seconds.toFixed(2))).replace('.', ':');
}


function showTags (url) {
  var tags = ID3.getAllTags(url);
  document.querySelector('.title').textContent = tags.title || "Nope";
  document.querySelector('.artist').textContent = tags.artist || "Nope";
  document.querySelector('.album').textContent = tags.album || "Nope";
  var image = tags.picture;
  if (image) {
    var base64String = "";
    for (var i = 0; i < image.data.length; i++) {
      base64String += String.fromCharCode(image.data[i]);
    }
    var base64 = "data:" + image.format + ";base64," +
      window.btoa(base64String);
    document.querySelector('.picture').setAttribute('src', base64);
  } else {
    document.querySelector('.picture').style.display = "none";
  }

  document.getElementById('info').style.display = 'block';
}
dragDrop('.workspace', function (files) {
  loadFile(files[0]);
});

function resetVisual() {
  var ctx = wave.getContext('2d');
  ctx.clearRect(0,0,wave.width, wave.length);
  ctx = waveProgress.querySelector('canvas').getContext('2d');
  ctx.clearRect(0,0,wave.width, wave.length);
}

function loadFile (file) {
  resetVisual();

  var startOffset = 0;
  var lastPlay = 0;
  var lastPause = 0;

  fileIndicator.textContent = 'loading file...';
  getId3(file);

  var reader = new FileReader();
  reader.onloadend = function(ev) {
    fileIndicator.textContent = 'decoding audio data...';
    ac.decodeAudioData(ev.target.result, function(buf) {

      fileIndicator.textContent = 'rendering wave...';
      as.buffer = buf;

      duration.textContent = formatTime(as.buffer.duration);

      drawBuffer(wave, buf, '#52F6A4');
      drawBuffer(waveProgress.querySelector('canvas'), buf, '#F445F0');
      fileIndicator.style.display = 'none';
      colors.end();
    });
  };

  reader.readAsArrayBuffer(file);
}

function getId3 (file) {
  var url = file.urn || file.name;

  ID3.loadTags(url, function() {
    showTags(url);
  }, {
    tags: ["title","artist","album","picture"],
    dataReader: FileAPIReader(file)
  });

}

uploadBtn.addEventListener('change', function(ev) {
  var file = ev.target.files[0];
  loadFile(file);
});


// copy the buffer to our clipboard, without removing the original section from buffer.
copyBuffer = function(buf1) {
  var start = Math.round(1.5 * 44100);
  var end = Math.round(2.5 * 44100);
  clipboard = {
    start: start,
    end: end,
    buffer : ac.createBuffer(1, end - start, 44100)
  };
  clipboard.buffer.getChannelData(0).set(buf1.getChannelData(0).subarray(start, end));
}

// cut the buffer portion to our clipboard, sets empty space in place of the portion
// in the source buffer.
cutBuffer = function(buf1) {
  var start = Math.round(1.5 * 44100);
  var end = Math.round(2.5 * 44100);
  clipboard.buffer = ac.createBuffer(1, end - start, 44100);
  clipboard.buffer = getChannelData(0).set(buf1.getChannelData(0).subarray(start, end));

  nuOldBuffer = ac.createBuffer(2, buf1.length, buf1.sampleRate);
  emptyBuf = ac.createBuffer(2, end - start, buf1.sampleRate);
  nuOldBuffer.getChannelData(0).set(buf1.getChannelData(0).subarray(0, start))
  nuOldBuffer.getChannelData(0).set(emptyBuf.getChannelData(0), start);
  nuOldBuffer.getChannelData(0).set(buf1.getChannelData(0).subarray(end, buf1.length), end);
  buf1 = nuOldBuffer;
}

// insert our clipboard at a specific point in buffer.
pasteBuffer = function(buf1, at) {
  var start = clipboard.start;
  var end = clipboard.end;

  // create replacement buffer with enough space for cliboard part
  var nuPastedBuffer = ac.createBuffer(2, buf1.length + (end - start), buf1.sampleRate);
  // if our clip start point is not at '0' then we need to set the original
  // chunk, up to the clip start point
  if (at > 0) {
    nuPastedBuffer.getChannelData(0).set(buf1.getChannelData(0).subarray(0, at));
  }
  // add the clip data
  nuPastedBuffer.getChannelData(0).set(clipboard.getChannelData(0), at);

  // if our clip end point is not at the end of the original buffer then
  // we need to add remaining data from the original buffer;
  if (!end >= buf1.length) {
    nuPastedBuffer.getChannelData(0).set(buf1.getChannelData(0), (at + (end - start)));
  }

  buf1 = nuPastedBuffer;
}

function drawBuffer ( canvas, buffer, color ) {
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


// function callEachChannel(buf, func) {
//   var numChannels = buf.numberOfChannels();
//   for (var i=0; i < numChannels; i++) {
//     func(buf.getChannelData(i));
//   }
// }

// will need to send the correct data cut points to all of the clipboard/editing functions
// need to add tracking of playback onto waveform.
// visualize selection.
// set end and start points.
// insert at points.
// updating original waveform on update event.


// ability to create a new buffer/waveform from clipboard elements.
// also be able to copy an entire waveform into a new buffer.
// append, prepend, and delete functions.

// would like to be able to drag and drop portions of waveforms.
// - this should be done by creating a draggable image from the selection.(getImageData)

// Should there be more than one clipboard element at a time???

// maybe we could allow people to have a drop area with data buffer chunks. possibly save these samples
// into indexedDB???? (if we do this we need to allow a sort of state to load up projects, just like in the sequencer.)

// Really need to figure out code for zooming in and out on a waveform.
