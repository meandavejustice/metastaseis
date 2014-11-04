module.exports = loadFile;

function loadFile (context, file, emitter, activeBuffer) {
  emitter.emit('audio:status', {msg: 'loading file...'});
  emitter.emit('audio:file', {file: file});

  var reader = new FileReader();
  reader.onloadend = function(ev) {
    emitter.emit('audio:status', {msg: 'decoding audio data...'});

    context.decodeAudioData(ev.target.result, function(buf) {
      emitter.emit('audio:status', {msg: 'rendering wave...'});
      emitter.emit('audio:buffer', {buffer: buf});
    });
  };

  reader.readAsArrayBuffer(file);
}